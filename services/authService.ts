import { auth, db } from './firebaseConfig';
// ✅ أضفنا sendEmailVerification هنا
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"; 
import { ref, set } from "firebase/database";

export const handleRegister = async (email: string, password: string, username: string) => {
  try {
    // 1. إنشاء الحساب في Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. 📧 إرسال إيميل التحقق فوراً
    // هذا السطر هو الذي كان ينقصك لكي يصل الإيميل للمستخدم
    await sendEmailVerification(user);
    console.log("Verification email sent to:", email);

    // 3. تخزين البيانات في قاعدة بيانات مشروع noir-879ad
    await set(ref(db, 'users/' + user.uid), {
      uid: user.uid,
      username: username,
      email: email,
      balance: 0,
      vip_level: 0,
      tasks_completed: 0,
      createdAt: new Date().toISOString()
    });

    return { success: true, user };
  } catch (error: any) {
    console.error("Registration Error:", error.message);
    return { success: false, error: error.message };
  }
};