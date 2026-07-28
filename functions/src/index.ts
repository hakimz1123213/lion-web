import * as admin from "firebase-admin";

// تهيئة الصلاحيات مرة واحدة فقط هنا
if (!admin.apps.length) {
    admin.initializeApp();
}

// استيراد الدوال من الملفات الأخرى وتصديرها للسيرفر
export { submitWithdraw } from "./withdraw";
export { submitDeposit } from "./deposit";
export { processVideoTask } from"./processVideoTask";
export { checkPendingPassword } from "./checkPendingPassword";
export { 
  adminApproveTransaction, 
  adminRejectTransaction, 
  adminUpdateUserProfile 
} from "./admin";


// إذا كان لديك دالة updateBalance سابقة، يمكنك استيرادها هكذا مستقبلاً:
// export { updateBalance } from "./balance";