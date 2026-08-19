import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
import { ref, onValue } from "firebase/database"; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AuthContext } from './AuthContext';
import { WalletContext } from './WalletContext';
import { sendPushNotification } from '../services/pushNotificationService';
import { TASK_TOTAL } from '@/constants/config';
import { Alert } from 'react-native';

interface TaskContextType {
  dailyCounter: number;
  lastCompletionTime: number | null;
  tasksDoneToday: boolean;
  watchingIndex: number | null;
  isLoading: boolean;
  timeRemaining: string;     
  canReset: boolean;         
  isWindowOpen: boolean; // 👈 لمعرفة هل الخدمة مفتوحة حالياً أم مغلقة
  startWatchingVideo: (index: number) => void;
  completeVideo: () => void;
  cancelVideo: () => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

// 🕒 فحص هل النافذة الزمنية مفتوحة حالياً (من 12:00 ظهراً إلى 23:59)
const checkIsWindowOpen = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const hours = date.getUTCHours(); // استخدام UTC لمنع التلاعب بالتوقيت المحلي
  return hours >= 12 && hours < 24; // مفتوح من 12:00 ظهراً حتى منتصف الليل
};

// 🕒 الحصول على وقت بداية الدورة اليومية الحالية (12:00 ظهراً)
const getCycleStartTimeUTC = (timestamp: number): number => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  const today12PM = Date.UTC(year, month, day, 12, 0, 0, 0);
  if (timestamp >= today12PM) {
    return today12PM;
  } else {
    return today12PM - (24 * 60 * 60 * 1000); // 12 ظهراً لليوم السابق
  }
};

// 🕒 الحصول على موعد الفتح القادم (12:00 ظهراً القادمة)
const getNextOpenTimeUTC = (timestamp: number): number => {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  const today12PM = Date.UTC(year, month, day, 12, 0, 0, 0);
  if (timestamp < today12PM) {
    return today12PM;
  } else {
    return today12PM + (24 * 60 * 60 * 1000);
  }
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
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  
  const secureTimeRef = useRef<number>(Date.now());
  const lastLocalTimeRef = useRef<number>(Date.now());
  const offsetRef = useRef<number>(0);

  // 1️⃣ مزامنة وقت السيرفر
  useEffect(() => {
    const offsetRefDb = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRefDb, snap => {
      offsetRef.current = snap.val() || 0;
      syncTrueTime(); 
    });
    return () => unsub();
  }, []);

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

  // 2️⃣ الاستماع المباشر لقاعدة البيانات
  useEffect(() => {
    if (!auth?.user) {
      setDailyCounter(0);
      setLastCompletionTime(null);
      setIsLoading(false);
      return;
    }

    const taskRef = ref(db, `users/${auth.user.uid}/taskState`);
    const unsubscribeTasks = onValue(taskRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.val();
        setDailyCounter(state.dailyCounter || 0);
        setLastCompletionTime(state.lastCompletionTime || null);
      } else {
        resetTasks();
      }
      setIsLoading(false);
    });

    return () => unsubscribeTasks();
  }, [auth?.user?.uid]);

  // 3️⃣ مؤقت كشف التلاعب وحساب حالة الوقت والعداد التنازلي
  // 3️⃣ مؤقت كشف التلاعب وحساب حالة الوقت والعداد التنازلي
useEffect(() => {
  if (!auth?.user) return;

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
}, [dailyCounter, lastCompletionTime, auth?.user]); // 👈 أضفنا auth?.user هنا
  const updateCooldownStatus = () => {
    const now = secureTimeRef.current; 
    const windowOpen = checkIsWindowOpen(now);
    setIsWindowOpen(windowOpen);

    const currentCycleStart = getCycleStartTimeUTC(now);

    // تصفير محلي إذا كانت آخر مشاهدة قبل موعد الفتح الحالي (الساعة 12:00 ظهراً)
    if (lastCompletionTime && lastCompletionTime < currentCycleStart) {
      setDailyCounter(0);
      setLastCompletionTime(null);
    }

    if (!windowOpen) {
      // الخدمة مغلقة الآن (بين 12:00 ليلاً و 12:00 ظهراً)
      setCanReset(false);
      const nextOpen = getNextOpenTimeUTC(now);
      const remaining = nextOpen - now;
      formatTimeRemaining(remaining);
    } else {
      // الخدمة مفتوحة (بين 12:00 ظهراً و 12:00 ليلاً)
      if (dailyCounter >= TASK_TOTAL) {
        // اكتملت الـ 10 فيديوهات لهذا اليوم
        setCanReset(false);
        const nextOpen = getNextOpenTimeUTC(now);
        const remaining = nextOpen - now;
        formatTimeRemaining(remaining);
      } else {
        // متاح للمشاهدة الآن
        setTimeRemaining("00:00:00");
        setCanReset(false);
      }
    }
  };

  const formatTimeRemaining = (remainingMs: number) => {
    if (remainingMs <= 0) {
      setTimeRemaining("00:00:00");
      return;
    }
    const h = Math.floor(remainingMs / 3600000).toString().padStart(2, '0');
    const m = Math.floor((remainingMs % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, '0');
    setTimeRemaining(`${h}:${m}:${s}`);
  };

  const resetTasks = () => {
    setDailyCounter(0);
    setLastCompletionTime(null);
  };

  const tasksDoneToday = (dailyCounter >= TASK_TOTAL || !isWindowOpen);

  const startWatchingVideo = (index: number) => {
    const now = secureTimeRef.current;
    if (!checkIsWindowOpen(now)) {
      Alert.alert("مغلق الآن", "المشاهدة متاحة فقط من الساعة 12:00 ظهراً إلى 12:00 ليلاً.");
      return;
    }
    if (index !== dailyCounter || dailyCounter >= TASK_TOTAL) return;
    setWatchingIndex(index);
  };

  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    setWatchingIndex(null);

    try {
      const functions = getFunctions();
      const processVideoTaskCall = httpsCallable(functions, 'processVideoTask');
      
      const result: any = await processVideoTaskCall({ userId: auth.user.uid });

      if (result.data.isCompleted) {
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
      Alert.alert("تنبيه", error.message || "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.");
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
        isWindowOpen,
        startWatchingVideo,
        completeVideo,
        cancelVideo,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}