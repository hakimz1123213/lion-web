import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
import { ref, get, update, set, push } from "firebase/database";
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

  // ─── جلب الحالة وتحديث العداد التنازلي ──────────────────────────────────────
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
      updateCooldownStatus();
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

    const now = Date.now();
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
        lastCompletionTime: null,
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
    const now = Date.now();

    setDailyCounter(newCounter);
    setWatchingIndex(null);

    // تحديث العداد في السحاب فوراً
    const updates: any = { dailyCounter: newCounter };
    if (newCounter >= TASK_TOTAL) {
      updates.lastCompletionTime = now;
      setLastCompletionTime(now);
    }

    await update(ref(db, `users/${auth.user.uid}/taskState`), updates);

    // ─── احتساب أرباح التأسك اليومية للمستخدم صاحب الحساب ───────────────────
    if (newCounter >= TASK_TOTAL) {
      // VIP 0 مستحيل يدي الفلوس، فقط VIP > 0
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
              createdAt: now,
            });

            const currentBal = auth.user.balance || 0;
            await update(ref(db, `users/${auth.user.uid}`), { balance: currentBal + payout });
          }

          // 🔒 [تـم تـطـهـيـر وحـذف كـتـل عـمـولات الـتـأسـك لـلـمـسـتـدعـي كـلـيـاً مـن هـنـا] 🔒
          // مستحيل السيستم درك يزيد يوزع سنت واحد للداعي نهار العميل يكمل فيديوهاته اليومية لضمان أرباحك الحصينة.

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