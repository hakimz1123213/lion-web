import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
import { ref, onValue, runTransaction, serverTimestamp, push, set } from "firebase/database"; 
import { AuthContext } from './AuthContext';
import { WalletContext } from './WalletContext';
import { sendPushNotification } from '../services/pushNotificationService';
import { TASK_TOTAL } from '@/constants/config';

interface TaskContextType {
  dailyCounter: number;
  lastCompletionTime: number | null;
  tasksDoneToday: boolean;
  watchingIndex: number | null;
  isLoading: boolean;
  timeRemaining: string;     
  canReset: boolean;         
  isWindowOpen: boolean; 
  startWatchingVideo: (index: number) => void;
  completeVideo: () => void;
  cancelVideo: () => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

// 💰 إعدادات أرباح الـ VIP
const DAILY_VIP_REWARDS: Record<number, number> = {
  0: 0, 1: 2.2, 2: 4.2, 3: 8.5, 4: 12.4, 5: 23.3, 6: 33.33, 7: 56.5, 8: 96.5
};

// 🕒 فحص هل النافذة الزمنية مفتوحة حالياً (من 12:00 ظهراً إلى 23:59)
const checkIsWindowOpen = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const hours = date.getUTCHours(); 
  return hours >= 12 && hours < 24; 
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
    return today12PM - (24 * 60 * 60 * 1000); 
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
  }, [dailyCounter, lastCompletionTime]);

  const updateCooldownStatus = () => {
    const now = secureTimeRef.current; 
    const windowOpen = checkIsWindowOpen(now);
    setIsWindowOpen(windowOpen);

    const currentCycleStart = getCycleStartTimeUTC(now);

    // تصفير محلي
    if (lastCompletionTime && lastCompletionTime < currentCycleStart) {
      setDailyCounter(0);
      setLastCompletionTime(null);
    }

    if (!windowOpen) {
      setCanReset(false);
      const nextOpen = getNextOpenTimeUTC(now);
      const remaining = nextOpen - now;
      formatTimeRemaining(remaining);
    } else {
      if (dailyCounter >= TASK_TOTAL) {
        setCanReset(false);
        const nextOpen = getNextOpenTimeUTC(now);
        const remaining = nextOpen - now;
        formatTimeRemaining(remaining);
      } else {
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
      window.alert("مغلق الآن\nالمشاهدة متاحة فقط من الساعة 12:00 ظهراً إلى 12:00 ليلاً.");
      return;
    }
    if (index !== dailyCounter || dailyCounter >= TASK_TOTAL) return;
    setWatchingIndex(index);
  };

  // 🚀 دمج الـ Backend هنا باستخدام Firebase Client Transaction
  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    const currentUserId = auth.user.uid;
    setWatchingIndex(null);

    const now = secureTimeRef.current;
    if (!checkIsWindowOpen(now)) {
      window.alert("الخدمة مغلقة حالياً. المشاهدة متاحة فقط من الساعة 12:00 ظهراً إلى 12:00 ليلاً.");
      return;
    }

    try {
      const userRef = ref(db, `users/${currentUserId}`);
      let transactionResultVal: any = null;

      // استخدام Transaction لضمان عدم تكرار الضغطات والتلاعب بالرصيد
      const result = await runTransaction(userRef, (userData) => {
        if (!userData) return userData;

        let taskState = userData.taskState || { dailyCounter: 0, lastCompletionTime: null };
        let currentCounter = taskState.dailyCounter || 0;
        const lastTime = taskState.lastCompletionTime;

        // التحقق من التصفير
        const currentCycleStart = getCycleStartTimeUTC(secureTimeRef.current);
        if (lastTime && lastTime < currentCycleStart) {
          currentCounter = 0; 
        }

        if (currentCounter >= TASK_TOTAL) {
          return; // إجهاض الطلب إذا أكمل المهام
        }

        currentCounter += 1;
        taskState.dailyCounter = currentCounter;
        taskState.lastCompletionTime = serverTimestamp(); // وقت السيرفر الفعلي

        // 🎁 إذا أكمل 10 فيديوهات، أضف الرصيد
        if (currentCounter === TASK_TOTAL) {
          const vipLevel = userData.vip_level || 0;
          const reward = DAILY_VIP_REWARDS[vipLevel] || 0;
          const currentBal = parseFloat(userData.balance?.toString() || '0');

          userData.balance = currentBal + reward;
          
          transactionResultVal = { reward, vipLevel, username: userData.username };
        }

        userData.taskState = taskState;
        return userData; 
      });

      if (!result.committed) {
        throw new Error("إما أن الخدمة مغلقة، أو أكملت المهام اليومية، أو هناك طلب قيد المعالجة.");
      }

      const finalData = result.snapshot.val();
      const finalCounter = finalData.taskState.dailyCounter;

      // 🎯 تسجيل المعاملة في قاعدة البيانات إذا كانت المهمة العاشرة
      if (finalCounter === TASK_TOTAL && transactionResultVal) {
        const txRef = push(ref(db, 'transactions'));
        await set(txRef, {
          id: txRef.key,
          userId: currentUserId,
          username: transactionResultVal.username || 'Unknown',
          type: 'Reward',
          amount: transactionResultVal.reward,
          status: 'Completed',
          note: `Daily reward VIP ${transactionResultVal.vipLevel}`,
          createdAt: serverTimestamp(),
        });

        // إذا كنت تستخدم Push Notification للويب/التطبيق، يمكنك تركه:
        const pushToken = (auth.user as any)?.expoPushToken;
        if (pushToken) {
          await sendPushNotification(
            pushToken,
            '🎁 أرباح المهام جاهزة!',
            `عمل ممتاز! تم إضافة $${transactionResultVal.reward} إلى رصيدك بنجاح.`
          );
        }
        
        // تنبيه نجاح للمستخدم
        window.alert(`عمل ممتاز! تم إضافة $${transactionResultVal.reward} إلى رصيدك بنجاح.`);
      }

    } catch (error: any) {
      console.error("Task Error:", error);
      window.alert(error.message || "حدث خطأ في الاتصال، يرجى المحاولة لاحقاً.");
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