import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const DEPOSIT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1500083325803692122/lUGEHNf-Au1pPecgmQrKuox01chfxFxRctGwfDUs2wcMCmVz-XJCtVUZUVJy85cb3j36';
const NOTIFY_ROLE_ID = '1508886867351834655';

export const submitDeposit = functions.https.onCall(async (requestData: any, context: any) => {
    const payload = requestData.data || requestData;
    const authData = context?.auth || requestData.auth;

    const userId = payload.userId || payload.uid || payload.id || (authData ? authData.uid : null);
    
    if (!userId) {
         throw new functions.https.HttpsError('unauthenticated', 'User ID is missing.');
    }

    const { amount, username } = payload;

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

        // 1️⃣ حفظ المعاملة في قاعدة البيانات بالحالة الصحيحة (pending)
        await txsRef.set({
            id: txIdKey,
            userId: userId,
            username: username || 'Unknown',
            type: 'Deposit',
            amount: amount,
            status: 'pending', // تم تعديلها لأحرف صغيرة لتقرأها لوحة الأدمن مباشرة
            note: `User initiated a deposit query of $${amount} USDT`,
            createdAt: currentTime,
        });

        activeRequestsInLast24h.push(Date.now());
        await historyRef.set(activeRequestsInLast24h);

        // 2️⃣ إرسال الإشعار فوراً إلى ديسكورد مع المنشن المسموح
        try {
            await fetch(DEPOSIT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'LION Monitor',
                    avatar_url: 'https://i.imgur.com/G2hWYfv.jpeg',
                    content: `<@&${NOTIFY_ROLE_ID}>`,
                    allowed_mentions: { roles: [NOTIFY_ROLE_ID] },
                    embeds: [
                        {
                            title: '💰 New Deposit Request',
                            color: 0x4a9ee8,
                            fields: [
                                { name: 'User', value: `**${username || 'Unknown'}** (\`${userId}\`)`, inline: true },
                                { name: 'Amount', value: `**$${Number(amount).toFixed(2)} USDT**`, inline: true },
                                { name: 'Status', value: '🟡 Pending Approval', inline: true },
                                { name: 'Submitted At', value: new Date().toUTCString(), inline: false },
                            ],
                            footer: { text: 'LION Admin System' },
                            timestamp: new Date().toISOString(),
                        },
                    ],
                }),
            });
        } catch (discordErr) {
            console.error("Discord Webhook Error:", discordErr);
        }

        return { success: true, message: "تم تسجيل الإيداع بنجاح!", txId: txIdKey };

    } catch (error: any) {
        console.error("Deposit Error:", error);
        throw new functions.https.HttpsError('internal', error.message || 'حدث خطأ في السيرفر.');
    }
});