import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const WITHDRAW_WEBHOOK_URL = 'https://discord.com/api/webhooks/1511670423006478421/SgjnUz4ricoL8cFVXxrC2zsoJPAdNDOCLR-X020Z7_CSm1eu6KBOKpf2Q0fBtPkPJB7i';
const NOTIFY_ROLE_ID = '1508886867351834655';

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

        // 1️⃣ خصم الرصيد من الحساب
        await userRef.update({
             balance: currentBalance - parsedAmount 
        });

        // 2️⃣ تسجيل المعاملة بالحالة الموحدة 'pending'
        const txsRef = admin.database().ref('transactions').push();
        const txIdKey = txsRef.key;

        await txsRef.set({
            id: txIdKey,
            userId: userId,
            username: username || 'Unknown',
            type: 'Withdrawal',
            amount: parsedAmount,
            walletAddress: cleanAddress,
            address: cleanAddress,
            status: 'pending',
            createdAt: admin.database.ServerValue.TIMESTAMP,
        });

        // 3️⃣ إرسال إشعار السحب المباشر إلى ديسكورد مع إصدار الصوت والتاغ
        try {
            await fetch(WITHDRAW_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'LION Monitor',
                    avatar_url: 'https://i.imgur.com/G2hWYfv.jpeg',
                    content: `<@&${NOTIFY_ROLE_ID}>`,
                    allowed_mentions: { roles: [NOTIFY_ROLE_ID] },
                    embeds: [
                        {
                            title: '🏦 New Withdrawal Request',
                            color: 0xe05252,
                            fields: [
                                { name: 'User', value: `**${username || 'Unknown'}** (\`${userId}\`)`, inline: true },
                                { name: 'Amount', value: `**$${parsedAmount.toFixed(2)} USDT**`, inline: true },
                                { name: 'Status', value: '🔴 Pending Admin Review', inline: true },
                                { name: 'Wallet Address (BEP20)', value: `\`${cleanAddress}\``, inline: false },
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

        return { success: true, message: "تم إرسال طلب السحب بنجاح!" };

    } catch (error: any) {
        console.error("Critical Withdraw Error:", error);
        
        if (error.code) {
            throw error;
        }
        
        throw new HttpsError('internal', error.message || 'حدث خطأ أثناء معالجة السحب.');
    }
});