import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
// 🟢 الاعتماد الكامل على Realtime Database بدلاً من Functions
import { ref, get, onValue, update, push, serverTimestamp } from "firebase/database";
import { db } from '../services/firebaseConfig'; 
import { AuthContext } from './AuthContext';
import { WalletContext } from './WalletContext';
import { sendPushNotification } from '../services/pushNotificationService';
import { TASK_TOTAL } from '@/constants/config';
import { Alert } from 'react-native';

// 💰 جدول أرباح المهام اليومية (تم نقله للعميل)
const DAILY_VIP_REWARDS: Record<number, number> = {
  0: 0,     // VIP 0
  1: 2.2,   // VIP 1
  2: 4.2,   // VIP 2
  3: 8.5,   // VIP 3
  4: 12.4,  // VIP 4
  5: 23.3,  // VIP 5
  6: 33.33, // VIP 6
  7: 56.5,  // VIP 7
  8: 96.5   // VIP 8
};

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

// 🕒 دوال مساعدة لحساب أوقات التجديد (12:00 منتصف النهار)
const getNextResetTime = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setHours(12, 0, 0, 0); 
  
  if (currentTimestamp >= date.getTime()) {
    date.setDate(date.getDate() + 1); 
  }
  return date.getTime();
};

const getLastResetTime = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setHours(12, 0, 0, 0);
  
  if (currentTimestamp < date.getTime()) {
    date.setDate(date.getDate() - 1); 
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

  // 🛡️ نظام الحماية السحابية للتوقيت
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

    // 🛡️ رادار كشف التلاعب بالساعة
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

  const updateCooldownStatus = () => {
    if (dailyCounter < TASK_TOTAL || !lastCompletionTime) {
      setTimeRemaining("00:00:00");
      setCanReset(false);
      return;
    }

    const now = secureTimeRef.current;
    const lastReset = getLastResetTime(now);

    if (lastCompletionTime < lastReset) {
      setTimeRemaining("00:00:00");
      setCanReset(true);
      resetTasks(); 
    } else {
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

  const resetTasks = () => {
    setDailyCounter(0);
    setLastCompletionTime(null);
  };

  const tasksDoneToday = dailyCounter >= TASK_TOTAL && !canReset;

  const startWatchingVideo = (index: number) => {
    if (index !== dailyCounter || tasksDoneToday) return;
    setWatchingIndex(index);
  };

  // 🚀 إتمام الفيديو والتحديث المباشر في قاعدة البيانات (بدون Functions)
  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    const previousCounter = dailyCounter;
    const newCounter = dailyCounter + 1;
    const userId = auth.user.uid;
    
    // 1️⃣ التحديث الفوري للواجهة
    setDailyCounter(newCounter);
    setWatchingIndex(null);

    try {
      // 2️⃣ جلب بيانات المستخدم لضمان دقة الرصيد ومستوى الـ VIP
      const userRef = ref(db, `users/${userId}`);
      const userSnap = await get(userRef);
      
      if (!userSnap.exists()) throw new Error("User not found.");
      
      const userData = userSnap.val();
      const updates: Record<string, any> = {};
      let isCompleted = false;
      let reward = 0;

      if (newCounter >= TASK_TOTAL) {
        // 🎯 وصول للمهمة الأخيرة (10)
        const vipLevel = userData.vip_level || 0;
        reward = DAILY_VIP_REWARDS[vipLevel] || 0;
        const currentBal = parseFloat(userData.balance?.toString() || '0');

        // تحديث الرصيد والعداد
        updates[`users/${userId}/balance`] = currentBal + reward;
        updates[`users/${userId}/taskState/dailyCounter`] = TASK_TOTAL;
        updates[`users/${userId}/taskState/lastCompletionTime`] = serverTimestamp();

        // تسجيل المعاملة
        const txRef = push(ref(db, 'transactions'));
        updates[`transactions/${txRef.key}`] = {
          id: txRef.key,
          userId: userId,
          username: userData.username || 'Unknown',
          type: 'Reward',
          amount: reward,
          status: 'Completed',
          note: `Daily reward VIP ${vipLevel}`,
          createdAt: serverTimestamp(),
        };
        
        isCompleted = true;
      } else {
        // 🔄 مجرد زيادة عادية للعداد
        updates[`users/${userId}/taskState/dailyCounter`] = newCounter;
        if (newCounter === 1) {
          updates[`users/${userId}/taskState/lastCompletionTime`] = null; // تنظيف وقت الأمس
        }
      }

      // 3️⃣ إرسال الضربة المجمعة لقاعدة البيانات
      await update(ref(db), updates);

      // 4️⃣ الإشعارات وإنهاء العملية
      if (isCompleted) {
        setLastCompletionTime(secureTimeRef.current);
        const pushToken = (auth.user as any)?.expoPushToken;

        if (pushToken) {
          await sendPushNotification(
            pushToken,
            '🎁 أرباح المهام جاهزة!',
            `عمل ممتاز! تم إضافة $${reward} إلى رصيدك بنجاح.`
          );
        }
      }
    } catch (error: any) {
      console.error("Task Error:", error);
      // التراجع عن التحديث في حالة الخطأ
      setDailyCounter(previousCounter);
      Alert.alert("خطأ", error.message || "حدث خطأ في الشبكة. يرجى المحاولة مرة أخرى.");
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