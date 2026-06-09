import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
// 🛡️ التعديل الأول: استيراد serverTimestamp لتوثيق الوقت من خوادم جوجل حصراً
import { ref, get, update, set, push, onValue, serverTimestamp } from "firebase/database";
import { AuthContext } from './AuthContext';
import { WalletContext } from './WalletContext';
import { getVIPTier, randomPayout, TASK_TOTAL } from '@/constants/config';

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

// 24 ساعة بالملي ثانية
const COOLDOWN_MS = 24 * 60 * 60 * 1000; 

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

  // 🛡️ الحماية المطلقة: مراجع للوقت الآمن اللّي مستحيل يتأثر بتغيير ساعة الهاتف
  const secureTimeRef = useRef<number>(Date.now());
  const lastLocalTimeRef = useRef<number>(Date.now());
  const offsetRef = useRef<number>(0);

  // 1️⃣ جلب فارق الوقت من سيرفرات فايربيز كخطة بديلة
  useEffect(() => {
    const offsetRefDb = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRefDb, snap => {
      offsetRef.current = snap.val() || 0;
      syncTrueTime(); // مزامنة فورية عند الدخول
    });
    return () => unsub();
  }, []);

  // 2️⃣ رادار الوقت الفولاذي: يجيب الوقت الحقيقي من الإنترنت
  const syncTrueTime = async (isJumpDetected = false) => {
    try {
      const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
      if (res.ok) {
        const data = await res.json();
        secureTimeRef.current = new Date(data.utc_datetime).getTime();
      } else {
        if (!isJumpDetected) secureTimeRef.current = Date.now() + offsetRef.current;
      }
    } catch (e) {
      if (!isJumpDetected) secureTimeRef.current = Date.now() + offsetRef.current;
    }
    lastLocalTimeRef.current = Date.now();
  };

  // 3️⃣ المحرك الداخلي والعداد اللّي يقاوم غش المستخدمين
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

    const timer = setInterval(() => {
      const now = Date.now();
      const delta = now - lastLocalTimeRef.current;
      lastLocalTimeRef.current = now;

      // 🚨 نظام كشف الغش: إذا قدّم المستخدم ساعة الهاتف سيتم كشفه هنا!
      if (Math.abs(delta) > 15000) {
         console.warn("🛡️ Security Alert: Clock manipulation detected! Resyncing...");
         syncTrueTime(true).then(() => updateCooldownStatus());
      } else {
         secureTimeRef.current += delta; // تقديم طبيعي للوقت
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
      await resetTasks();
    }
    setIsLoading(false);
  };

  const updateCooldownStatus = () => {
    if (dailyCounter < TASK_TOTAL || !lastCompletionTime) {
      setTimeRemaining("00:00:00");
      setCanReset(false);
      return;
    }

    // 🛡️ استخدام الوقت المحمي بدل Date.now()
    const now = secureTimeRef.current;
    const elapsed = now - lastCompletionTime;
    const remaining = COOLDOWN_MS - elapsed;

    if (remaining <= 0) {
      setTimeRemaining("00:00:00");
      setCanReset(true);
      resetTasks(); 
    } else {
      setCanReset(false);
      const h = Math.floor(remaining / 3600000).toString().padStart(2, '0');
      const m = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
      setTimeRemaining(`${h}:${m}:${s}`);
    }
  };

  const resetTasks = async () => {
    setDailyCounter(0);
    setLastCompletionTime(null);
    if (auth?.user) {
      await set(ref(db, `users/${auth.user.uid}/taskState`), {
        dailyCounter: 0,
        lastCompletionTime: null, // سيتم تحديثه بوقت السيرفر لاحقاً
      });
    }
  };

  const tasksDoneToday = dailyCounter >= TASK_TOTAL && !canReset;

  const startWatchingVideo = (index: number) => {
    if (index !== dailyCounter || tasksDoneToday) return;
    setWatchingIndex(index);
  };

  const completeVideo = async () => {
    if (watchingIndex === null || !auth?.user) return;
    
    const newCounter = dailyCounter + 1;
    const now = secureTimeRef.current; // الوقت المحمي

    setDailyCounter(newCounter);
    setWatchingIndex(null);

    const updates: any = { dailyCounter: newCounter };
    if (newCounter >= TASK_TOTAL) {
      // 🛡️ توثيق الوقت الحقيقي مباشرة من سيرفرات جوجل لقفل الثغرة 100%
      updates.lastCompletionTime = serverTimestamp();
      setLastCompletionTime(now); // لتحديث الواجهة محلياً فقط
    }

    await update(ref(db, `users/${auth.user.uid}/taskState`), updates);

    // ─── احتساب أرباح التأسك اليومية ───────────────────
    if (newCounter >= TASK_TOTAL) {
      if ((auth.user.vip_level || 0) > 0) {
        try {
          const tier = getVIPTier(auth.user.vip_level || 0);
          const payout = randomPayout(tier);

          if (wallet && typeof wallet.addReward === 'function') {
            await wallet.addReward(payout, `Daily reward — ${tier.label} (10/10)`);
          } else {
            const txRef = push(ref(db, 'transactions'));
            await set(txRef, {
              id: txRef.key!,
              userId: auth.user.uid,
              username: auth.user.username,
              type: 'Reward',
              amount: payout,
              status: 'Completed',
              note: `Daily reward — ${tier.label} (10/10)`,
              createdAt: serverTimestamp(), // 🛡️ توثيق تاريخ المعاملة بسيرفر جوجل
            });

            const currentBal = auth.user.balance || 0;
            await update(ref(db, `users/${auth.user.uid}`), { balance: currentBal + payout });
          }

        } catch (payoutError) {
          console.error("Critical VIP Payout Error:", payoutError);
        }
      }
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