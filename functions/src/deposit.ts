import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const submitDeposit = functions.https.onCall(async (requestData: any, context: any) => {
    // 🔥 الحيلة الذكية: استخراج البيانات أياً كان جيل السيرفر (v1 أو v2) 🔥
    const payload = requestData.data || requestData;
    const authData = context?.auth || requestData.auth;

    // التقاط الـ ID بقوة
    const userId = payload.userId || payload.uid || payload.id || (authData ? authData.uid : null);
    
    if (!userId) {
         throw new functions.https.HttpsError('unauthenticated', 'User ID is missing.');
    }

    // ✅ إزالة txid من هنا واستقبال المبلغ واسم المستخدم فقط
    const { amount, username } = payload;

    // ✅ التأكد من وجود المبلغ فقط
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'الرجاء التأكد من إدخال مبلغ صحيح.');
    }

    try {
        const currentTime = admin.database.ServerValue.TIMESTAMP;
        const historyRef = admin.database().ref(`users/${userId}/depositRequestsHistory`);
        const historySnap = await historyRef.once('value');
        let timestampsList: number[] = [];

        if (historySnap.exists()) {
            const rawData = historySnap.val();
            timestampsList = Array.isArray(rawData) ? rawData : Object.values(rawData);
        }

        const activeRequestsInLast24h = timestampsList.filter(
            (ts) => (Date.now() - ts) / (1000 * 60 * 60) < 24
        );

        if (activeRequestsInLast24h.length >= 3) {
            throw new functions.https.HttpsError('resource-exhausted', 'AntiSpam: لقد وصلت للحد الأقصى للطلبات (3) اليوم.');
        }

        const txsRef = admin.database().ref('transactions').push();
        const txIdKey = txsRef.key;

        await txsRef.set({
            id: txIdKey,
            userId: userId,
            username: username || 'Unknown',
            type: 'Deposit',
            amount: amount,
            // ❌ تم إزالة سطر txid من هنا
            status: 'Pending',
            note: `User initiated a deposit query of $${amount} USDT`, // ❌ تم إزالة ذكر txid من الملاحظة
            createdAt: currentTime,
        });

        activeRequestsInLast24h.push(Date.now());
        await historyRef.set(activeRequestsInLast24h);

        return { success: true, message: "تم تسجيل الإيداع بنجاح!", txId: txIdKey };

    } catch (error: any) {
        console.error("Deposit Error:", error);
        throw new functions.https.HttpsError('internal', error.message || 'حدث خطأ في السيرفر.');
    }
});