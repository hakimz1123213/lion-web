import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const checkPendingPassword = functions.https.onCall(async (request) => {
    // 🔥 التعديل هنا: جلب البيانات من request.data الخاصة بالإصدار الجديد
    const { email, password } = request.data; 
    
    if (!email || !password) return { success: false };

    const cleanEmail = email.trim().toLowerCase();
    const safeEmailNode = cleanEmail.replace(/[\.\@]/g, '_');

    const db = admin.database();
    const pendingRef = db.ref(`passwordResetOTPs/${safeEmailNode}`);

    try {
        const pendingSnap = await pendingRef.get(); 

        if (pendingSnap.exists()) {
            const val = pendingSnap.val();
            
            if (val.verified && val.pendingPassword === password && val.userKey) {
                await admin.auth().updateUser(val.userKey, { password: password });
                await db.ref(`users/${val.userKey}`).update({ password: password });
                await db.ref(`emailToUid/${safeEmailNode}`).update({ password: password });
                await pendingRef.remove();

                return { success: true, message: "Password synchronized perfectly!" };
            }
        }
        return { success: false, message: "No pending updates." };
    } catch (error) {
        console.error("Admin bypass error:", error);
        return { success: false, error: "Internal check failed." };
    }
});