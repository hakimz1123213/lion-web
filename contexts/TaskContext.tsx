import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
import { ref, onValue, runTransaction, push, serverTimestamp } from "firebase/database";
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
  startWatchingVideo: (index: number) => void;
  completeVideo: () => void;
  cancelVideo: () => void;
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined);

// جدول المكافآت بحسب مستوى الـ VIP
const DAILY_VIP_REWARDS: Record<number, number> = {
  0: 0, 
  1: 2.2, 
  2: 4.2, 
  3: 8.5, 
  4: 12.4, 
  5: 23.3, 
  6: 33.33, 
  7: 56.5, 
  8: 96.5
};

// 🕒 حساب توقيت إعادة التصفير اليومي (12:00 PM UTC)
const getNextResetTimeUTC = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setUTCHours(12, 0, 0, 0);
  
  if (currentTimestamp >= date.getTime()) {
    date.setUTCDate(date.getUTCDate() + 1); 
  }
  return date.getTime();
};

const getLastResetTimeUTC = (currentTimestamp: number) => {
  const date = new Date(currentTimestamp);
  date.setUTCHours(12, 0, 0, 0);
  
  if (currentTimestamp < date.getTime()) {
    date.setUTCDate(date.getUTCDate() - 1); 
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

  // 2️⃣ الاستماع المباشر لحالة المهام من قاعدة البيانات
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

  // 3️⃣ مؤقت كشف التلاعب وتحديث العداد التنازلي
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
    if (dailyCounter < TASK_TOTAL || !lastCompletionTime) {
      setTimeRemaining("00:00:00");
      setCanReset(false);
      return;
    }

    const now = secureTimeRef.current; 
    const lastReset = getLastResetTimeUTC(now);

    if (lastCompletionTime < lastReset) {
      setTimeRemaining("00:00:00");
      setCanReset(true);
      resetTasks(); 
    } else {
      setCanReset(false);
      const nextReset = getNextResetTimeUTC(now);
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

  // 4️⃣ إكمال المشاهدة والمعالجة المباشرة في قاعدة البيانات (Client-Side Transaction)
  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    const userId = auth.user.uid;
    setWatchingIndex(null);

    const userRef = ref(db, `users/${userId}`);

    try {
      let rewardEarned = 0;
      let vipLevelEarned = 0;
      let isTaskCompleted = false;
      let username = 'Unknown';

      // 🚀 استخدام Transaction من جانب العميل لمنع التعارضات والتكرار
      const transactionResult = await runTransaction(userRef, (userData) => {
        if (!userData) return userData;

        let taskState = userData.taskState || { dailyCounter: 0, lastCompletionTime: null };
        let currentCounter = taskState.dailyCounter || 0;
        const lastTime = taskState.lastCompletionTime;
        const now = Date.now();

        // تصفير آلي عند دخول يوم جديد
        if (lastTime) {
          const nextReset = getNextResetTimeUTC(lastTime);
          if (now >= nextReset) {
            currentCounter = 0;
          }
        }

        // إلغاء العملية إذا اكتملت جميع المهام
        if (currentCounter >= TASK_TOTAL) {
          return; 
        }

        currentCounter += 1;
        taskState.dailyCounter = currentCounter;

        // عند الوصول للحد الأقصى للمهام (المهمة الأخيرة)
        if (currentCounter >= TASK_TOTAL) {
          const vipLevel = userData.vip_level || 0;
          const reward = DAILY_VIP_REWARDS[vipLevel] || 0;
          const currentBal = parseFloat(userData.balance?.toString() || '0');

          userData.balance = currentBal + reward;
          taskState.lastCompletionTime = now;
          
          rewardEarned = reward;
          vipLevelEarned = vipLevel;
          username = userData.username || 'Unknown';
          isTaskCompleted = true;
        } else if (currentCounter === 1) {
          taskState.lastCompletionTime = null;
        }

        userData.taskState = taskState;
        return userData; 
      });

      if (!transactionResult.committed) {
        Alert.alert("تنبيه", "إما أنك أكملت المهام اليومية بالفعل أو أن هناك طلب قيد المعالجة.");
        return;
      }

      // تسجيل المعاملة في جدول المعاملات وتلقي إشعار عند إكمال المهمة الأخيرة
      if (isTaskCompleted) {
        const txListRef = ref(db, 'transactions');
        const newTxRef = push(txListRef);

        await push(txListRef, {
          id: newTxRef.key,
          userId: userId,
          username: username,
          type: 'Reward',
          amount: rewardEarned,
          status: 'Completed',
          note: `Daily reward VIP ${vipLevelEarned}`,
          createdAt: serverTimestamp(),
        });

        const pushToken = (auth.user as any)?.expoPushToken;
        if (pushToken) {
          await sendPushNotification(
            pushToken,
            '🎁 أرباح المهام جاهزة!',
            `عمل ممتاز! تم إضافة $${rewardEarned} إلى رصيدك بنجاح.`
          );
        }
      }

    } catch (error: any) {
      console.error("Task Error:", error);
      Alert.alert("خطأ", error.message || "حدث خطأ أثناء معالجة المهمة، يرجى المحاولة لاحقاً.");
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