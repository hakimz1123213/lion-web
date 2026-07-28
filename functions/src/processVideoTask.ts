import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// 💰 جدول أرباح المهام اليومية الثابت سحابياً
const DAILY_VIP_REWARDS: Record<number, number> = {
  0: 0,     // VIP 0 لا يربح
  1: 2.2,   // VIP 1
  2: 4.2,   // VIP 2
  3: 8.5,  // VIP 3
  4: 12.4,  // VIP 4
  5: 23.3,  // VIP 5
  6: 33.33,  // VIP 6
  7: 56.5, // VIP 7
  8: 96.5  // VIP 8
};

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 ساعة

export const processVideoTask = onCall(async (request) => {
  const payload = request.data || {};
  const userId = request.auth ? request.auth.uid : (payload.userId || payload.uid);

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User ID is missing.');
  }

  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  try {
    const userSnap = await userRef.once('value');
    if (!userSnap.exists()) throw new HttpsError('not-found', 'User not found.');

    const userData = userSnap.val();
    const taskState = userData.taskState || { dailyCounter: 0, lastCompletionTime: null };
    let currentCounter = taskState.dailyCounter || 0;
    const lastTime = taskState.lastCompletionTime;
    const now = Date.now();

    // 🔄 فحص نظام التصفير (Reset) سحابياً
    if (lastTime && (now - lastTime >= COOLDOWN_MS)) {
        currentCounter = 0; // تصفير العداد إذا مرت 24 ساعة
    }

    if (currentCounter >= 10) {
        throw new HttpsError('failed-precondition', 'لقد أكملت جميع المهام اليوم.');
    }

    // زيادة العداد
    currentCounter += 1;
    const updates: Record<string, any> = {};

    // 🎯 إذا وصل للمهمة العاشرة
    if (currentCounter === 10) {
        const vipLevel = userData.vip_level || 0;
        const reward = DAILY_VIP_REWARDS[vipLevel] || 0;
        const currentBal = parseFloat(userData.balance?.toString() || '0');

        // تحديث الرصيد، إغلاق المهام، وتحديث وقت الانتهاء
        updates[`users/${userId}/balance`] = currentBal + reward;
        updates[`users/${userId}/taskState/dailyCounter`] = currentCounter;
        updates[`users/${userId}/taskState/lastCompletionTime`] = admin.database.ServerValue.TIMESTAMP;

        // تسجيل المعاملة
        const txRef = db.ref('transactions').push();
        updates[`transactions/${txRef.key}`] = {
            id: txRef.key,
            userId: userId,
            username: userData.username || 'Unknown',
            type: 'Reward',
            amount: reward,
            status: 'Completed',
            note: `Daily reward VIP ${vipLevel}`,
            createdAt: admin.database.ServerValue.TIMESTAMP,
        };

        // إرسال الضربة القاضية بقوة الـ Admin
        await db.ref().update(updates);

        return { success: true, isCompleted: true, newCounter: currentCounter, reward };
    } else {
        // 🔄 مجرد زيادة في العداد (1 إلى 9)
        updates[`users/${userId}/taskState/dailyCounter`] = currentCounter;
        if (currentCounter === 1) {
            updates[`users/${userId}/taskState/lastCompletionTime`] = null; // تنظيف وقت الأمس
        }
        await db.ref().update(updates);

        return { success: true, isCompleted: false, newCounter: currentCounter };
    }

  } catch (error: any) {
    console.error("Task Error:", error);
    throw new HttpsError('internal', error.message || 'Error processing task.');
  }
});