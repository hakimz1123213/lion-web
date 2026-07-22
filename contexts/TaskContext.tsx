import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
// 🛡️ إزالة تحديثات قاعدة البيانات وترك القراءة فقط
import { ref, get, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from 'firebase/functions'; // 🚀 استيراد الدوال السحابية
import { AuthContext } from './AuthContext';
import { WalletContext } from './WalletContext';
import { sendPushNotification } from '../services/pushNotificationService';
import { TASK_TOTAL } from '@/constants/config';
import { Alert } from 'react-native'; // للإنذارات في حال الخطأ

interface TaskContextType {
  dailyCounter: number;
  lastCompletionTime: number | null;
  tasksDoneToday: boolean;
  watchingIndex: number | null;
  isLoading: boolean;
  timeRemaining: string;     
  canReset: boolean;         
  startWatchingVideo: (index: number) => void;
  completeVideo: () => void;
  cancelVideo: () => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

// 🕒 دوال مساعدة لحساب أوقات التجديد (12:00 منتصف النهار) بناءً على التوقيت الآمن
const getNextResetTime = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setHours(12, 0, 0, 0); // 12:00 PM
  
  if (currentTimestamp >= date.getTime()) {
    date.setDate(date.getDate() + 1); // إذا تجاوزنا 12 ظهراً، التجديد القادم غداً
  }
  return date.getTime();
};

const getLastResetTime = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setHours(12, 0, 0, 0);
  
  if (currentTimestamp < date.getTime()) {
    date.setDate(date.getDate() - 1); // إذا كنا قبل 12 ظهراً، التجديد الأخير كان البارحة
  }
  return date.getTime();
};

export function TaskProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const wallet = useContext(WalletContext);

  const [dailyCounter, setDailyCounter] = useState(0);
  const [lastCompletionTime, setLastCompletionTime] = useState<number | null>(null);
  const [watchingIndex, setWatchingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState("00:00:00");
  const [canReset, setCanReset] = useState(false);
  
  const lastUserId = useRef<string | null>(null);
  const secureTimeRef = useRef<number>(Date.now());
  const lastLocalTimeRef = useRef<number>(Date.now());
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    const offsetRefDb = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRefDb, snap => {
      offsetRef.current = snap.val() || 0;
      syncTrueTime(); 
    });
    return () => unsub();
  }, []);

  // 🛡️ نظام الحماية السحابية للتوقيت (ممنوع التلاعب)
  const syncTrueTime = async (isJumpDetected = false) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); 

      const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId); 

      if (res.ok) {
        const data = await res.json();
        secureTimeRef.current = new Date(data.utc_datetime).getTime();
      } else {
        throw new Error("API is down"); 
      }
    } catch (e) {
      if (!isJumpDetected) {
        const safeOffset = typeof offsetRef.current === 'number' && !isNaN(offsetRef.current) 
                           ? offsetRef.current 
                           : 0;
        secureTimeRef.current = Date.now() + safeOffset;
      }
    } finally {
      lastLocalTimeRef.current = Date.now();
    }
  };

  useEffect(() => {
    if (!auth?.user) {
      setDailyCounter(0);
      setLastCompletionTime(null);
      setIsLoading(false);
      lastUserId.current = null;
      return;
    }

    if (lastUserId.current !== auth.user.uid) {
      lastUserId.current = auth.user.uid;
      loadCloudTaskState();
    }

    // 🛡️ رادار كشف التلاعب بالساعة كل ثانية
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastLocalTimeRef.current;
      lastLocalTimeRef.current = now;

      if (Math.abs(delta) > 15000) {
         console.warn("🛡️ Security Alert: Clock manipulation detected! Resyncing...");
         syncTrueTime(true).then(() => updateCooldownStatus());
      } else {
         secureTimeRef.current += delta; 
         updateCooldownStatus();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auth?.user?.uid, lastCompletionTime, dailyCounter]);

  const loadCloudTaskState = async () => {
    if (!auth?.user) return;
    const taskRef = ref(db, `users/${auth.user.uid}/taskState`);
    const snapshot = await get(taskRef);
    
    if (snapshot.exists()) {
      const state = snapshot.val();
      setDailyCounter(state.dailyCounter || 0);
      setLastCompletionTime(state.lastCompletionTime || null);
    } else {
      resetTasks();
    }
    setIsLoading(false);
  };

  // 🔄 التعديل الجديد: التحديث بناءً على الساعة 12:00 منتصف النهار باستخدام الوقت الآمن
  const updateCooldownStatus = () => {
    if (dailyCounter < TASK_TOTAL || !lastCompletionTime) {
      setTimeRemaining("00:00:00");
      setCanReset(false);
      return;
    }

    const now = secureTimeRef.current; // التوقيت المحمي من السيرفر
    const lastReset = getLastResetTime(now);

    if (lastCompletionTime < lastReset) {
      // إذا كانت آخر مهمة منجزة قبل موعد التجديد الأخير، نصفر المهام
      setTimeRemaining("00:00:00");
      setCanReset(true);
      resetTasks(); 
    } else {
      // المهام منجزة في الدورة الحالية، نحسب الوقت حتى موعد التجديد القادم
      setCanReset(false);
      const nextReset = getNextResetTime(now);
      const remaining = nextReset - now;

      if (remaining <= 0) {
        setTimeRemaining("00:00:00");
        setCanReset(true);
        resetTasks();
      } else {
        const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
        const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
        setTimeRemaining(`${h}:${m}:${s}`);
      }
    }
  };

  // 🛡️ التعديل الأول: تصفير محلي فقط، الباكيند هو من سيصفر البيانات الحقيقية
  const resetTasks = () => {
    setDailyCounter(0);
    setLastCompletionTime(null);
  };

  const tasksDoneToday = dailyCounter >= TASK_TOTAL && !canReset;

  const startWatchingVideo = (index: number) => {
    if (index !== dailyCounter || tasksDoneToday) return;
    setWatchingIndex(index);
  };

  // 🚀 التعديل الأهم: إرسال الطلب للسيرفر فقط!
  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    const previousCounter = dailyCounter;
    const newCounter = dailyCounter + 1;
    
    // 1️⃣ التحديث الفوري للواجهة (Optimistic Update)
    setDailyCounter(newCounter);
    setWatchingIndex(null);

    try {
      const functions = getFunctions();
      const processVideoTaskCall = httpsCallable(functions, 'processVideoTask');
      
      // 2️⃣ استدعاء الدالة السحابية بالخفاء
      const result: any = await processVideoTaskCall({ userId: auth.user.uid });

      // 3️⃣ إذا أرجع السيرفر أن المهمة 10 اكتملت، نعرض الإشعار ونقفل العداد
      if (result.data.isCompleted) {
        setLastCompletionTime(secureTimeRef.current); // تسجيل وقت الانتهاء من التوقيت المحمي
        
        // 🚀 لقط التوكين بمرونة لتفادي خطأ TypeScript
        const pushToken = (auth.user as any)?.expoPushToken;

        if (pushToken) {
          await sendPushNotification(
            pushToken,
            '🎁 أرباح المهام جاهزة!',
            `عمل ممتاز! تم إضافة $${result.data.reward} إلى رصيدك بنجاح.`
          );
        }
      }
    } catch (error: any) {
      console.error("Task Error:", error);
      // 🛡️ خطة الطوارئ: تراجع عن التحديث لو انقطع الإنترنت أو السيرفر رفض الطلب
      setDailyCounter(previousCounter);
      Alert.alert("Error", error.message || "Network unstable. Please check your internet and try again.");
    }
  };

  const cancelVideo = () => setWatchingIndex(null);

  return (
    <TaskContext.Provider
      value={{
        dailyCounter,
        lastCompletionTime,
        tasksDoneToday,
        watchingIndex,
        isLoading,
        timeRemaining,
        canReset,
        startWatchingVideo,
        completeVideo,
        cancelVideo,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}