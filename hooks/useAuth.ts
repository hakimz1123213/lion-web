import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { db } from '@/services/firebaseConfig';
import { ref, get, set, remove, update } from 'firebase/database';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');

  // 1️⃣ دالة توليد وحفظ كود الـ OTP المؤمنة والمطهرة ديريكت للـ APK
  // 1️⃣ دالة توليد وحفظ كود الـ OTP المؤمنة والمطهرة ديريكت للـ APK
  const generateAndSaveOTP = async (email: string) => {
    try {
      const safeEmailNode = email.trim().replace(/\./g, '_');
      const mapSnap = await get(ref(db, `emailToUid/${safeEmailNode}`));

      if (!mapSnap.exists()) {
        return { error: "This email is not registered in our system.", otpCode: null };
      }

      const { uid, password: oldPassword } = mapSnap.val();
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;

      await set(ref(db, `passwordResetOTPs/${safeEmailNode}`), {
        code: otpCode,
        expiresAt: expiresAt,
        userKey: uid,
        oldPassword: oldPassword,
        verified: false,
        location: "Secure Mobile Network Node" 
      });

      return { error: null, otpCode };
    } catch (err: any) {
      return { error: "Handshake secure timeout. Please check your connectivity.", otpCode: null };
    }
  };

  // 2️⃣ دالة فحص مطابقة كود الـ OTP مصلحة ومطهرة من فخ الـ ref(ref(db))
  const verifyOTPCode = async (email: string, userInputCode: string) => {
    try {
      const safeEmailNode = email.trim().replace(/\./g, '_');
      const otpSnap = await get(ref(db, `passwordResetOTPs/${safeEmailNode}`));

      if (!otpSnap.exists()) {
        return { isValid: false, error: "Code expired or not found. Please restart the process." };
      }

      const { code, expiresAt } = otpSnap.val();

      if (Date.now() > expiresAt) {
        // ✅ تم الفرز: استخدام ref(db) واحدة نقية وبدون أي تكرار قاتل
        await remove(ref(db, `passwordResetOTPs/${safeEmailNode}`));
        return { isValid: false, error: "This security code has expired." };
      }

      if (String(code).trim() !== String(userInputCode).trim()) {
        return { isValid: false, error: "Incorrect verification code." };
      }

      return { isValid: true, error: null };
    } catch (err: any) {
      return { isValid: false, error: "Verification synchronization failed." };
    }
  };

  // 3️⃣ دالة تحديث الباسورد المنسي
  const updateForgottenPassword = async (email: string, newPassword: string) => {
    try {
      const safeEmailNode = email.trim().replace(/\./g, '_');
      const otpRef = ref(db, `passwordResetOTPs/${safeEmailNode}`);
      const otpSnap = await get(otpRef);

      if (!otpSnap.exists()) {
        return { error: "Security session expired. Please restart the OTP process." };
      }

      await update(otpRef, { 
        verified: true,
        pendingPassword: newPassword.trim()
      });

      return { error: null };
    } catch (err: any) {
      return { error: "Data node structure failure." };
    }
  };

  return {
    ...context,
    generateAndSaveOTP,       
    verifyOTPCode,           
    updateForgottenPassword, 
  };
}