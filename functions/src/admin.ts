import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.database();

// 🔒 قائمة المعرفات المسموح لها بإدارة النظام (SUPER ADMIN UIDs)
const SUPER_ADMIN_UIDS = [
  "jec4njRnjSO5ZQfqz1h4X2jAqla2", // الـ UID الخاص بك
];

/**
 * 🛠️ دالة مساعدة للتحقق من أن المنادي هو الأدمن
 */
async function verifySuperAdmin(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'يجب عليك تسجيل الدخول أولاً.'
    );
  }

  const uid = request.auth.uid;
  const isHardcodedAdmin = SUPER_ADMIN_UIDS.includes(uid);
  
  // فحص إضافي من قاعدة البيانات للـ Admin Status
  const userSnap = await db.ref(`users/${uid}`).once('value');
  const userData = userSnap.val();
  const isDbAdmin = userData && (userData.role === 'admin' || userData.isAdmin === true);

  if (!isHardcodedAdmin && !isDbAdmin) {
    throw new HttpsError(
      'permission-denied',
      '🚨 تنبيه أمني: لا تملك صلاحيات الأدمن لتنفيذ هذه العملية!'
    );
  }

  return uid;
}

/**
 * 📨 دالة مساعدة لإرسال الإشعارات عبر Expo Push API
 */
async function sendExpoPushNotification(pushToken: string, title: string, body: string) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  try {
    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: { type: 'FINANCIAL_UPDATE' },
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
  }
}

// ============================================================================
// 1️⃣ دالة قبول المعاملات المالية (Approve Transaction)
// ============================================================================
export const adminApproveTransaction = onCall(async (request) => {
  await verifySuperAdmin(request);

  const { txId } = request.data || {};
  if (!txId) {
    throw new HttpsError('invalid-argument', 'المعرف txId مطلوب.');
  }

  const txRef = db.ref(`transactions/${txId}`);
  const txSnap = await txRef.once('value');

  if (!txSnap.exists()) {
    throw new HttpsError('not-found', 'المعاملة غير موجودة.');
  }

  const tx = txSnap.val();
  const status = (tx.status || tx.state || '').toLowerCase();
  const type = (tx.type || '').toLowerCase();

  if (status === 'completed' || status === 'approved' || status === 'success') {
    throw new HttpsError('already-exists', 'تمت معالجة هذه المعاملة سابقاً!');
  }

  const updates: Record<string, any> = {};
  
  // تحديث حالة المعاملة
  updates[`transactions/${txId}/status`] = 'Completed';
  updates[`transactions/${txId}/note`] = 'Approved successfully by System Master.';
  updates[`transactions/${txId}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;

  // إذا كانت عملية إيداع -> زيادة رصيد المستخدم
  if (type === 'deposit' && tx.userId) {
    const userSnap = await db.ref(`users/${tx.userId}`).once('value');
    if (userSnap.exists()) {
      const currentBalance = parseFloat(userSnap.val().balance || '0');
      const amountToAdd = parseFloat(tx.amount || '0');
      updates[`users/${tx.userId}/balance`] = currentBalance + amountToAdd;
    }
  }

  // تنفيذ جميع التعديلات دفعة واحدة
  await db.ref().update(updates);

  // إرسال الإشعار
  if (tx.userId) {
    const uSnap = await db.ref(`users/${tx.userId}`).once('value');
    if (uSnap.exists() && uSnap.val().expoPushToken) {
      const isDeposit = type === 'deposit';
      const title = isDeposit ? '✅ تم تأكيد الإيداع!' : '💸 تمت الموافقة على السحب!';
      const body = isDeposit
        ? `تم شحن رصيدك بنجاح بمبلغ $${tx.amount}.`
        : `تمت الموافقة على سحب $${tx.amount}. تفقد محفظتك قريباً!`;
      await sendExpoPushNotification(uSnap.val().expoPushToken, title, body);
    }
  }

  return { success: true, message: 'Transaction approved successfully.' };
});

// ============================================================================
// 2️⃣ دالة رفض المعاملات المالية مع الاسترجاع (Reject Transaction)
// ============================================================================
export const adminRejectTransaction = onCall(async (request) => {
  await verifySuperAdmin(request);

  const { txId, reason } = request.data || {};
  if (!txId || !reason) {
    throw new HttpsError('invalid-argument', 'المعرف والسبب مطلوبان.');
  }

  const txRef = db.ref(`transactions/${txId}`);
  const txSnap = await txRef.once('value');

  if (!txSnap.exists()) {
    throw new HttpsError('not-found', 'المعاملة غير موجودة.');
  }

  const tx = txSnap.val();
  const status = (tx.status || tx.state || '').toLowerCase();
  const type = (tx.type || '').toLowerCase();

  if (status === 'completed' || status === 'approved') {
    throw new HttpsError('failed-precondition', 'لا يمكن رفض معاملة مكتملة بالفعل!');
  }

  const updates: Record<string, any> = {};

  // تحديث حالة المعاملة
  updates[`transactions/${txId}/status`] = 'Rejected';
  updates[`transactions/${txId}/note`] = `Rejected Reason: ${reason.trim()}`;
  updates[`transactions/${txId}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;

  // إذا كانت عملية سحب -> إرجاع الرصيد للحساب
  if ((type === 'withdrawal' || type === 'withdraw') && tx.userId) {
    const userSnap = await db.ref(`users/${tx.userId}`).once('value');
    if (userSnap.exists()) {
      const currentBalance = parseFloat(userSnap.val().balance || '0');
      const refundAmount = parseFloat(tx.amount || '0');
      updates[`users/${tx.userId}/balance`] = currentBalance + refundAmount;
    }
  }

  await db.ref().update(updates);

  // إرسال الإشعار
  if (tx.userId) {
    const uSnap = await db.ref(`users/${tx.userId}`).once('value');
    if (uSnap.exists() && uSnap.val().expoPushToken) {
      const opType = (type === 'deposit') ? 'الإيداع' : 'السحب';
      await sendExpoPushNotification(
        uSnap.val().expoPushToken,
        '❌ تم رفض المعاملة',
        `عذراً، تم رفض طلب ${opType} الخاص بك بمبلغ $${tx.amount}.\nالسبب: ${reason.trim()}`
      );
    }
  }

  return { success: true, message: 'Transaction rejected successfully.' };
});

// ============================================================================
// 3️⃣ دالة تعديل بيانات المستخدم أو حذفه (Update / Delete User Profile)
// ============================================================================
export const adminUpdateUserProfile = onCall(async (request) => {
  await verifySuperAdmin(request);

  const { targetUid, newBalance, newVip, isDelete } = request.data || {};

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'المعرف targetUid مطلوب.');
  }

  // 🔴 مسح المستخدم بالكامل
  if (isDelete) {
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (e) {
      console.warn('User auth might already be deleted:', e);
    }
    await db.ref(`users/${targetUid}`).remove();
    return { success: true, message: 'User deleted completely.' };
  }

  // 🟢 تعديل البيانات
  const updates: Record<string, any> = {};

  if (newBalance !== undefined && newBalance !== null && newBalance !== '') {
    const parsedBalance = parseFloat(newBalance);
    if (!isNaN(parsedBalance)) {
      updates[`users/${targetUid}/balance`] = parsedBalance;
    }
  }

  if (newVip !== undefined && newVip !== null && newVip !== '') {
    const parsedVip = parseInt(newVip, 10);
    if (!isNaN(parsedVip)) {
      updates[`users/${targetUid}/vip_level`] = parsedVip;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }

  return { success: true, message: 'User profile updated successfully.' };
});