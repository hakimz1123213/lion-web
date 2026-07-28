import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const submitWithdraw = onCall(async (request) => {
    const payload = request.data || {};
    const auth = request.auth;

    const userId = auth ? auth.uid : (payload.userId || payload.uid);
    
    if (!userId) {
        throw new HttpsError('unauthenticated', 'User ID is missing.');
    }

    const { amount, walletAddress, username } = payload;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10 || !walletAddress) { 
        throw new HttpsError('invalid-argument', 'المبلغ غير كافٍ أو العنوان مفقود.');
    }

    try {
        const userRef = admin.database().ref(`users/${userId}`);
        const userSnap = await userRef.once('value');

        if (!userSnap.exists()) {
            throw new HttpsError('not-found', 'حساب المستخدم غير موجود.');
        }

        const userData = userSnap.val();
        const currentBalance = userData.balance || 0;
        const vipLevel = userData.vip_level || 0;

        const VIP_FEES: Record<number, number> = { 0:0, 1:70, 2:150, 3:300, 4:500, 5:800, 6:1400, 7:2400, 8:4100 };
        const lockedCapital = VIP_FEES[vipLevel] || 0;
        const maxWithdrawable = Math.max(0, currentBalance - lockedCapital);

        if (parsedAmount > maxWithdrawable) {
            throw new HttpsError('failed-precondition', 'المبلغ يتجاوز الأرباح المسموح بسحبها.');
        }

        const cleanAddress = walletAddress.trim();

        // تسجيل المعاملة بالنوع الموحد 'Withdrawal' وحفظ المحفظة بجميع المسميات
      await userRef.update({
             balance: currentBalance - parsedAmount 
        });

        // 2️⃣ تسجيل المعاملة بالنوع الموحد 'Withdrawal' وحفظ المحفظة بجميع المسميات
        const txsRef = admin.database().ref('transactions').push();
        await txsRef.set({
            id: txsRef.key,
            userId: userId,
            username: username || 'Unknown',
            type: 'Withdrawal',
            amount: parsedAmount,
            walletAddress: cleanAddress,
            address: cleanAddress,
            status: 'Pending',
            createdAt: admin.database.ServerValue.TIMESTAMP,
        });

        return { success: true, message: "تم إرسال طلب السحب بنجاح!" };

    } catch (error: any) {
        console.error("Critical Withdraw Error:", error);
        
        if (error.code) {
            throw error;
        }
        
        throw new HttpsError('internal', error.message || 'حدث خطأ أثناء معالجة السحب.');
    }
});