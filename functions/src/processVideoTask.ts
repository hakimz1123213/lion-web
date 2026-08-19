import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const DAILY_VIP_REWARDS: Record<number, number> = {
  0: 0, 1: 2.2, 2: 4.2, 3: 8.5, 4: 12.4, 5: 23.3, 6: 33.33, 7: 56.5, 8: 96.5
};

// 🕒 فحص هل الوقت الحالي يقع في النافذة المسموحة (من 12:00 ظهراً إلى 23:59)
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

export const processVideoTask = onCall(async (request) => {
  const payload = request.data || {};
  const userId = request.auth ? request.auth.uid : (payload.userId || payload.uid);

  if (!userId) throw new HttpsError('unauthenticated', 'User ID is missing.');

  const now = Date.now();

  // 🛑 1. حظر العمليات خارج الوقت المسموح بها (مثلاً الساعة 1:00 AM أو 5:00 AM)
  if (!checkIsWindowOpen(now)) {
    throw new HttpsError(
      'failed-precondition',
      'الخدمة مغلقة حالياً. المشاهدة متاحة فقط من الساعة 12:00 ظهراً إلى 12:00 ليلاً.'
    );
  }

  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  try {
    let transactionResultVal: any;

    // 🚀 استخدام Transaction لمنع التلاعب وتوازي الطلبات
    const result = await userRef.transaction((userData) => {
      if (!userData) return userData;

      let taskState = userData.taskState || { dailyCounter: 0, lastCompletionTime: null };
      let currentCounter = taskState.dailyCounter || 0;
      const lastTime = taskState.lastCompletionTime;

      // 🔄 2. تجديد العداد إذا كانت آخر مشاهدة مكتملة قبل بداية الدورة الحالية (12:00 ظهراً)
      const currentCycleStart = getCycleStartTimeUTC(now);
      if (lastTime && lastTime < currentCycleStart) {
        currentCounter = 0; 
      }

      if (currentCounter >= 10) {
        return undefined; // إجهاض الطلب إذا تم مشاهدة 10 فيديوهات
      }

      currentCounter += 1;
      taskState.dailyCounter = currentCounter;
      taskState.lastCompletionTime = admin.database.ServerValue.TIMESTAMP;

      // 🎁 إضافة المكافأة عند إكمال الفيديو العاشر
      if (currentCounter === 10) {
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
      throw new HttpsError('failed-precondition', 'إما أن الخدمة مغلقة، أو أكملت المهام اليومية، أو هناك طلب قيد المعالجة.');
    }

    const finalData = result.snapshot.val();
    const finalCounter = finalData.taskState.dailyCounter;

    // 🎯 تسجيل المعاملة في قاعدة البيانات
    if (finalCounter === 10 && transactionResultVal) {
      const txRef = db.ref('transactions').push();
      await txRef.set({
        id: txRef.key,
        userId: userId,
        username: transactionResultVal.username || 'Unknown',
        type: 'Reward',
        amount: transactionResultVal.reward,
        status: 'Completed',
        note: `Daily reward VIP ${transactionResultVal.vipLevel}`,
        createdAt: admin.database.ServerValue.TIMESTAMP,
      });
      return { success: true, isCompleted: true, newCounter: 10, reward: transactionResultVal.reward };
    }

    return { success: true, isCompleted: false, newCounter: finalCounter };

  } catch (error: any) {
    console.error("Task Error:", error);
    throw new HttpsError('internal', error.message || 'Error processing task.');
  }
});