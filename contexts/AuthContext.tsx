import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebaseConfig'; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";
import { ref, set, get, update, push, onValue, remove } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { generateReferralCode, isSuperAdmin, getVIPTier, SUPER_ADMIN_UID } from '@/constants/config';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  phone: string;
  balance: number;
  vip_level: number;
  referralCode: string;
  referredBy: string;
  createdAt: string;
  isAdmin?: boolean;
  emailVerified: boolean;
  isFullyVerified: boolean; 
  profileImage?: string;
  password?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (username: string, email: string, password: string, phone: string, referralCode?: string) => Promise<{ error: string | null }>;
  confirmRegisterOTP: (email: string, codeInput: string) => Promise<{ error: string | null }>;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  upgradeVIP: (newLevel: number, cost: number) => Promise<{ error: string | null }>;
  findUserByReferralCode: (code: string) => Promise<UserProfile | null>;
  getReferredUsers: (referrerId: string) => Promise<UserProfile[]>;
  getAllUsers: () => Promise<UserProfile[]>;
  adminUpdateUserBalance: (userId: string, newBalance: number) => Promise<void>;
  adminSetVIP: (userId: string, level: number) => Promise<void>;
  updateVerificationStatus: (type: 'email' | 'phone') => Promise<void>;
  verifyPhone: () => Promise<{ verificationId: null; error: string }>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  updateUserProfileData: (newUsername: string, newPhotoUri?: string | null) => Promise<{ error: string | null }>;
  adminDeleteUser: (userId: string, userGeneratedCode: string) => Promise<void>;
  sendPasswordResetOTP: (emailInput: string) => Promise<{ error: string | null }>;
  confirmPasswordResetAndChange: (emailInput: string, codeInput: string, newPasswordInput: string) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🛠️ دالة مساعدة لتوحيد تهيئة الإيميل في مسارات الداتابيز
const getSafeEmailNode = (email: string): string => email.trim().toLowerCase().replace(/\./g, '_');

// 🛠️ دالة توليد كود عشوائي للإحالة
// 🛠️ دالة توليد كود عشوائي للإحالة بطول 6 رموز (مطابق لنمط الصورة)
const generateRandomCode = (length = 6) => {
  // تم إضافة حرف 'O' ليتطابق مع النمط في الصورة
  const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789'; 
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    let unsubscribeUserListener: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUserListener) {
        unsubscribeUserListener();
        unsubscribeUserListener = null;
      }

      if (firebaseUser) {
        const userRef = ref(db, `users/${firebaseUser.uid}`); 
        
        unsubscribeUserListener = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setUser({ 
              uid: firebaseUser.uid,
              ...data, 
              balance: parseFloat(data.balance?.toString() || '0'),
              vip_level: parseInt(data.vip_level?.toString() || '0'),
              isAdmin: isSuperAdmin(firebaseUser.uid),
              emailVerified: data.emailVerified || false,
              isFullyVerified: data.isFullyVerified || false
            });
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Realtime database sync error:", error);
          setIsLoading(false);
        });

        if (isSuperAdmin(firebaseUser.uid)) {
          try {
            const usersSnap = await get(ref(db, 'users'));
            const emailToUidSnap = await get(ref(db, 'emailToUid'));
            
            if (usersSnap.exists()) {
              const allUsers = usersSnap.val();
              const currentEmailToUid = emailToUidSnap.exists() ? emailToUidSnap.val() : {};
              const updates: any = {};

              for (const userId in allUsers) {
                const u = allUsers[userId];
                if (u && u.email) {
                  const safeEmailNode = getSafeEmailNode(u.email);
                  
                  if (!currentEmailToUid[safeEmailNode]) {
                    updates[`emailToUid/${safeEmailNode}`] = {
                      uid: userId,
                      password: u.password || "123456" 
                    };
                  }
                }
              }

              if (Object.keys(updates).length > 0) {
                await update(ref(db), updates);
              }
            }
          } catch (syncErr) {
            console.error("Auto Data Migration Script Crash:", syncErr);
          }
        }

      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserListener) unsubscribeUserListener();
    };
  }, []);

  const updateVerificationStatus = async (type: 'email' | 'phone') => {
    if (!user) return;
    try {
      await update(ref(db, `users/${user.uid}`), { emailVerified: true, isFullyVerified: true }); 
    } catch (e) { console.error(e); }
  };

  const verifyPhone = async () => ({ verificationId: null, error: "SMS Disabled" }); 

  const register = async (username: string, email: string, password: string, phone: string, referralCodeInput?: string) => {
    try {
      setIsLoading(true);

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const safeEmailNode = getSafeEmailNode(email);

      const referredByValue = (referralCodeInput && referralCodeInput.trim() !== "") 
        ? referralCodeInput.trim().toUpperCase() 
        : "none_no_code_entered";

      await set(ref(db, `emailVerificationOTPs/${safeEmailNode}`), {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim(),
        referredBy: referredByValue, 
        code: verificationCode,
        expiresAt: expiresAt
      });

      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            service_id: 'service_c7pcv6l',
            template_id: 'template_2j1s8xm',
            user_id: 'CwFCgpSX66cm7YC9o',
            template_params: {
              to_name: username.trim(),
              to_email: email.trim().toLowerCase(),
              otp_code: verificationCode,
              location: "Secure Mobile Network Node"
            }
          })
        });
      } catch (emailErr) {
        console.log('[EmailJS API] Network transmission crash:', emailErr);
      }

      setIsLoading(false);
      return { error: null }; 
    } catch (error: any) {
      setIsLoading(false);
      return { error: "Handshake secure timeout. Please check your connection." };
    }
  };

  const confirmRegisterOTP = async (email: string, code: string) => {
    try {
      const safeEmailNode = getSafeEmailNode(email);
      const otpRef = ref(db, `emailVerificationOTPs/${safeEmailNode}`);
      const snapshot = await get(otpRef);

      if (!snapshot.exists()) {
        return { error: "Security token expired or not found. Please register again." };
      }

      const data = snapshot.val();

      if (String(data.code).trim() !== String(code).trim()) {
        return { error: "Invalid security token. Please check the digits." };
      }

      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      } catch (authErr: any) {
        return { error: authErr.message || "Failed to create authentication node." };
      }

      const firebaseUser = userCredential.user;
      const generatedRefCode = generateRandomCode(6);

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        username: data.username,
        email: data.email,
        phone: data.phone || "",
        referredBy: data.referredBy || "none_no_code_entered",
        referralCode: generatedRefCode,
        balance: 0,
        vip_level: 0, 
        createdAt: String(Date.now()),
        emailVerified: false,
        isFullyVerified: false,
        password: data.password
      };

      await set(ref(db, `users/${firebaseUser.uid}`), userProfile);
      await set(ref(db, `emailToUid/${safeEmailNode}`), { uid: firebaseUser.uid, password: data.password });
      await set(ref(db, `referralCodes/${generatedRefCode}`), firebaseUser.uid);
      await remove(otpRef);

      return { error: null };

    } catch (error: any) {
      console.error("[OTP Verification Critical Error]:", error);
      return { error: error.message || "Database permission denied. Check Firebase Rules." };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await signOut(auth);
    setUser(null);
    setIsLoading(false);
  };

  const findUserByReferralCode = async (code: string): Promise<UserProfile | null> => {
    if (!code) return null;
    try {
      const cleanCode = code.trim().toUpperCase();
      const refLinkSnap = await get(ref(db, `referralCodes/${cleanCode}`)); 
      if (refLinkSnap.exists()) {
        const rUid = refLinkSnap.val();
        const userSnap = await get(ref(db, `users/${rUid}`)); 
        if (userSnap.exists()) {
          return { uid: rUid, ...userSnap.val() } as UserProfile;
        }
      }
    } catch (e) {
      console.error("Error finding referral code:", e);
    }
    return null;
  };

  const upgradeVIP = async (newLevel: number, cost: number) => {
    if (!user) return { error: 'Session expired.' };
    try {
      const newBalance = user.balance - cost;
      
      await update(ref(db, `users/${user.uid}`), { balance: newBalance, vip_level: newLevel }); 

      const isFirstTimeUpgrade = !user.vip_level || user.vip_level === 0;
      const enteredCode = user.referredBy ? user.referredBy.trim().toUpperCase() : "";
      
      if (isFirstTimeUpgrade && enteredCode !== "" && !enteredCode.startsWith("NONE")) {
        const usersSnap = await get(ref(db, 'users'));
        if (usersSnap.exists()) {
          const allUsers = usersSnap.val();
          let parentUid = null;

          for (const key in allUsers) {
            const u = allUsers[key];
            const uName = u.username ? u.username.trim().toUpperCase() : "";
            const uUid = u.uid ? u.uid.trim().toUpperCase() : "";
            const uRefCode = u.referralCode ? u.referralCode.trim().toUpperCase() : ""; 

            let isMatch = false;
            if (enteredCode.startsWith("NOIR-")) {
              isMatch = (uRefCode !== "" && enteredCode === uRefCode);
            } else {
              isMatch = (enteredCode === uName || enteredCode === uUid);
            }

            if (isMatch) {
              parentUid = key;
              break;
            }
          }

          if (parentUid && parentUid !== user.uid) {
            const referrerRef = ref(db, `users/${parentUid}`); 
            const snap = await get(referrerRef);
            
            if (snap.exists()) {
              const referrerData = snap.val();
              const targetTier = getVIPTier(newLevel);
              const actualVIPPrice = cost > 0 ? cost : targetTier.entryFee;

              const commission = actualVIPPrice * 0.10; 
              const currentRefBal = parseFloat(referrerData.balance?.toString() || '0');
              const finalNewBalance = currentRefBal + commission;

              await update(referrerRef, { balance: finalNewBalance }); 

              if (parentUid === user.uid || isSuperAdmin(user.uid)) {
                setUser(prev => prev ? { ...prev, balance: finalNewBalance } : null);
              }

              const txRef = push(ref(db, 'transactions')); 
              await set(txRef, {
                id: txRef.key!,
                userId: parentUid,
                username: referrerData.username || "User",
                type: 'Referral Bonus',
                amount: commission, 
                status: 'Completed',
                note: `10% One-Time Bonus from ${user.username} (First VIP Upgrade)`, 
                createdAt: Date.now(),
              });
            }
          }
        }
      }
      return { error: null };
    } catch (e: any) { 
      console.error("VIP Upgrade Error: ", e);
      return { error: e.message }; 
    }
  };

  const sendPasswordResetOTP = async (emailInput: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = emailInput.trim().toLowerCase();
      const safeEmailNode = getSafeEmailNode(cleanEmail);

      const usersSnap = await get(ref(db, 'users'));
      let targetUid = null;
      let targetUsername = "User";
      let targetOldPassword = "123456";

      if (usersSnap.exists()) {
        const allUsers = usersSnap.val();
        for (const key in allUsers) {
          if (allUsers[key] && allUsers[key].email && allUsers[key].email.toLowerCase() === cleanEmail) {
            targetUid = key;
            targetUsername = allUsers[key].username || "User";
            targetOldPassword = allUsers[key].password || "123456";
            break;
          }
        }
      }

      if (!targetUid) {
        setIsLoading(false);
        return { error: "This email is not registered in our system." };
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;

      await set(ref(db, `passwordResetOTPs/${safeEmailNode}`), {
        userKey: targetUid,
        email: cleanEmail,
        code: resetCode,
        expiresAt: expiresAt,
        oldPassword: targetOldPassword,
        verified: false
      });

      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            service_id: 'service_c7pcv6l',
            template_id: 'template_2j1s8xm',
            user_id: 'CwFCgpSX66cm7YC9o',
            template_params: {
              to_name: targetUsername,
              to_email: cleanEmail,
              otp_code: resetCode,
              location: "Secure Mobile Network Node"
            }
          })
        });
      } catch (emailErr) {
        console.error('[Reset OTP Email Failed]:', emailErr);
      }

      setIsLoading(false);
      return { error: null };
    } catch (error: any) {
      setIsLoading(false);
      return { error: "Handshake secure timeout. Please check your connection." };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      
      try {
        const functionsInstance = getFunctions();
        const checkPendingPasswordFunc = httpsCallable(functionsInstance, 'checkPendingPassword');
        await checkPendingPasswordFunc({ email: cleanEmail, password: password.trim() });
      } catch (cfErr) {
        console.log("No pending password or CF skipped:", cfErr);
      }

      await signInWithEmailAndPassword(auth, cleanEmail, password.trim());
      
      setIsLoading(false);
      return { error: null };
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
      }
      return { error: error.message };
    }
  };

  const confirmPasswordResetAndChange = async (emailInput: string, codeInput: string, newPasswordInput: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = emailInput.trim().toLowerCase();
      const safeEmailNode = getSafeEmailNode(cleanEmail);
      const newPassword = newPasswordInput.trim();

      const resetRef = ref(db, `passwordResetOTPs/${safeEmailNode}`);
      const resetSnap = await get(resetRef);

      if (!resetSnap.exists()) {
        setIsLoading(false);
        return { error: "Reset session expired or not found. Please try again." };
      }

      const { userKey, code, expiresAt } = resetSnap.val();

      if (Date.now() > expiresAt) {
        await remove(resetRef);
        setIsLoading(false);
        return { error: "OTP Code expired. Please request a new code." };
      }

      if (String(codeInput).trim() !== String(code).trim()) {
        setIsLoading(false);
        return { error: "Invalid verification token. Please check your email inbox." };
      }

      await update(ref(db, `users/${userKey}`), { password: newPassword });
      await set(ref(db, `emailToUid/${safeEmailNode}`), { uid: userKey, password: newPassword });
      await remove(resetRef);

      setIsLoading(false);
      return { error: null };
    } catch (error: any) {
      setIsLoading(false);
      return { error: "Reset transmission node rejected." };
    }
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser) return { error: 'No active master session found.' };
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      await update(ref(db, `users/${auth.currentUser.uid}`), { password: newPassword.trim() });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const updateUserProfileData = async (newUsername: string, newPhotoUri?: string | null) => {
    if (!user?.uid) return { error: 'Session expired.' };
    try {
      const userRef = ref(db, `users/${user.uid}`);
      const updates: any = { username: newUsername.trim() };

      if (newPhotoUri) {
        updates.profileImage = newPhotoUri;
      }

      await update(userRef, updates);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const updateBalance = async (nb: number) => { 
    if (user) { await update(ref(db, `users/${user.uid}`), { balance: nb }); }  
  };

  const getReferredUsers = async (referrerId: string) => { 
    try {
      if (!user) return [];
      const snap = await get(ref(db, 'users'));  
      if (!snap.exists()) return [];

      const allUsers = snap.val();
      const list: UserProfile[] = [];

      const myUsername = user.username ? user.username.trim().toUpperCase() : "";
      const myUid = user.uid ? user.uid.trim().toUpperCase() : "";
      const myRefCode = user.referralCode ? user.referralCode.trim().toUpperCase() : ""; 

      for (const key in allUsers) {
        const u = allUsers[key];
        if (u && u.referredBy) {
          const checkVal = String(u.referredBy).trim().toUpperCase();

          let isMatch = false;
          if (checkVal.startsWith("NOIR-")) {
            isMatch = (myRefCode !== "" && checkVal === myRefCode);
          } else {
            isMatch = (checkVal === myUsername || checkVal === myUid);
          }

          if (isMatch && key !== user.uid) {
            list.push({ uid: key, ...u } as UserProfile);
          }
        }
      }
      return list;
    } catch (e) {
      console.error("Error fetching referred users:", e);
      return [];
    }
  };

  const getAllUsers = async () => { 
    if (!user?.isAdmin) return []; 
    const snap = await get(ref(db, 'users'));  
    return snap.exists() 
      ? Object.values(snap.val()).filter((u: any) => !isSuperAdmin(u.uid)) as UserProfile[] 
      : []; 
  };

  const adminUpdateUserBalance = async (uid: string, nb: number) => update(ref(db, `users/${uid}`), { balance: Math.max(0, nb) }); 
  const adminSetVIP = async (uid: string, lvl: number) => update(ref(db, `users/${uid}`), { vip_level: lvl }); 

  const adminDeleteUser = async (uid: string, userGeneratedCode: string) => {
    try {
      await remove(ref(db, `users/${uid}`));
      if (userGeneratedCode) {
        await remove(ref(db, `referralCodes/${userGeneratedCode.toUpperCase()}`));
      }
    } catch (e) {
      console.error("Error in admin user wiping execution:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, login, register, confirmRegisterOTP, logout, updateBalance,
      findUserByReferralCode, getReferredUsers, getAllUsers,      
      upgradeVIP, adminUpdateUserBalance, adminSetVIP,
      updateVerificationStatus, verifyPhone,
      changeUserPassword,
      updateUserProfileData, 
      adminDeleteUser,
      sendPasswordResetOTP,
      confirmPasswordResetAndChange
    }}>
      {children}
    </AuthContext.Provider>
  );
}