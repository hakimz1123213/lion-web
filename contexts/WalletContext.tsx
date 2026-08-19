import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { db } from '../services/firebaseConfig'; 
// ✅ أضفنا query, orderByChild, equalTo لعمل تصفية ذكية من جهة السيرفر
import { ref, push, set, onValue, update, get, query, orderByChild, equalTo } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { AuthContext } from './AuthContext';

// ─── الأنواع (Types) ────────────────────────────────────────────────────────
export type TxType = 'Deposit' | 'Withdrawal' | 'Reward' | 'Referral Bonus' | 'VIP Upgrade';
export type TxStatus = 'Pending' | 'Completed' | 'Rejected';

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: TxType;
  amount: number;
  status: TxStatus;
  note: string;
  createdAt: number;
  proofImageUri?: string;
  walletAddress?: string;
}

interface WalletContextType {
  transactions: Transaction[];
  isLoading: boolean;
  addReward: (amount: number, note: string) => Promise<void>;
  addReferralBonus: (referrerId: string, referrerUsername: string, amount: number, referredUsername: string) => Promise<void>;
  addVIPUpgradeTx: (amount: number, vipLevel: number) => Promise<void>;
  requestDeposit: (amount: number, proofImageUri?: string) => Promise<void>;
  requestWithdrawal: (amount: number, walletAddress: string) => Promise<{ error: string | null }>;
  refreshTransactions: () => Promise<void>;
  getAllTransactions: () => Transaction[];
  getPendingTransactions: () => Transaction[];
  adminApprove: (txId: string) => Promise<void>;
  adminReject: (txId: string) => Promise<void>;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ADMIN_EMAIL = 'jec4njRnjSO5ZQfqz1h4X2jAqla2'; 

  // ─── جلب المعاملات (تحديث حي وذكي حسب الهوية) ───────────────────────────
  useEffect(() => {
    if (!auth?.user?.uid) {
      setAllTransactions([]);
      setIsLoading(false);
      return;
    }

    const transactionsRef = ref(db, 'transactions');
    
    // 🛡️ حارس السيرفر: إذا كان أدمن يقرا كلش، وإذا مستخدم عادي يقرا غير معاملاته برك
    const txQuery = auth.user.email === ADMIN_EMAIL
      ? transactionsRef
      : query(transactionsRef, orderByChild('userId'), equalTo(auth.user.uid));

    const unsubscribe = onValue(txQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data) as Transaction[];
        setAllTransactions(list.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setAllTransactions([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Wallet live sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth?.user?.uid, auth?.user?.email]);

  // دالة تحديث يدوية آمنة
  const refreshTransactions = async () => {
    if (!auth?.user?.uid) return;
    setIsLoading(true);
    
    const transactionsRef = ref(db, 'transactions');
    const txQuery = auth.user.email === ADMIN_EMAIL
      ? transactionsRef
      : query(transactionsRef, orderByChild('userId'), equalTo(auth.user.uid));

    const snapshot = await get(txQuery);
    if (snapshot.exists()) {
      const list = Object.values(snapshot.val()) as Transaction[];
      setAllTransactions(list.sort((a, b) => b.createdAt - a.createdAt));
    }
    setIsLoading(false);
  };

  // 1. إضافة مكافأة المهام اليومية (الإعلانات)
  const addReward = async (amount: number, note: string) => {
    if (!auth?.user) return;
    const newTxRef = push(ref(db, 'transactions'));
    const newTx: Transaction = {
      id: newTxRef.key!,
      userId: auth.user.uid,
      username: auth.user.username,
      type: 'Reward',
      amount,
      status: 'Completed',
      note,
      createdAt: Date.now(),
    };
    await auth.updateBalance(auth.user.balance + amount);
    await set(newTxRef, newTx);
  };

  // 2. إضافة عمولة الإحالة الذكية
  const addReferralBonus = async (referrerId: string, referrerUsername: string, amount: number, referredUsername: string) => {
    const newTxRef = push(ref(db, 'transactions'));
    const bonusTx: Transaction = {
      id: newTxRef.key!,
      userId: referrerId,
      username: referrerUsername,
      type: 'Referral Bonus',
      amount,
      status: 'Completed',
      note: `Bonus from ${referredUsername}'s VIP purchase`,
      createdAt: Date.now(),
    };

    const referrerRef = ref(db, `users/${referrerId}`);
    const snap = await get(referrerRef);
    if (snap.exists()) {
      const currentBal = snap.val().balance || 0;
      await update(referrerRef, { balance: currentBal + amount });
    }
    await set(newTxRef, bonusTx);
  };

  // 3. طلب إيداع
  const requestDeposit = async (amount: number, proofImageUri?: string) => {
    if (!auth?.user) return;

    try {
      const functions = getFunctions();
      // استدعاء دالة الإيداع من السيرفر
      const submitDepositFn = httpsCallable(functions, 'submitDeposit');
      
      await submitDepositFn({
        userId: auth.user.uid, // 👈 إرسال الـ ID بوضوح
        username: auth.user.username,
        amount: amount,
        proofImageUri: proofImageUri || ''
      });
      
    } catch (err: any) {
      console.error("Deposit Function Error:", err);
      throw err;
    }
  };

  // 4. طلب سحب
  // 4. طلب سحب
  const requestWithdrawal = async (amount: number, walletAddress: string) => {
    if (!auth?.user) return { error: 'Not authenticated.' };
    
    try {
      // سطر للتأكد من أن الـ ID موجود قبل الإرسال (سيظهر في شاشة الـ Terminal لديك)
      console.log("🚀 Payload Sender ID:", auth.user.uid); 

      const functions = getFunctions();
      const submitWithdrawFn = httpsCallable(functions, 'submitWithdraw');
      
      await submitWithdrawFn({
        userId: auth.user.uid,
        uid: auth.user.uid, // 👈 زيادة تأكيد أرسلناه بالاسمين
        username: auth.user.username,
        amount: amount,
        walletAddress: walletAddress
      });

      return { error: null };
    } catch (err: any) {
      console.error("Withdraw Function Error:", err);
      return { error: err.message || 'فشل الاتصال بالسيرفر.' };
    }
  };

  // 5. تسجيل ترقية VIP كمعاملة
  const addVIPUpgradeTx = async (amount: number, vipLevel: number) => {
    if (!auth?.user) return;
    const newTxRef = push(ref(db, 'transactions'));
    await set(newTxRef, {
      id: newTxRef.key!,
      userId: auth.user.uid,
      username: auth.user.username,
      type: 'VIP Upgrade',
      amount,
      status: 'Completed',
      note: `Upgraded to VIP ${vipLevel}`,
      createdAt: Date.now(),
    });
  };

  // ─── 🛡️ وظائف الأدمن المحصنة عسكرياً ضد التكرار والـ Double Spend ──────────────────
  const adminApprove = async (txId: string) => {
    const txRef = ref(db, `transactions/${txId}`);
    
    // [الدرع السحابي] تحقق فوري من السيرفر مباشرة قبل لمس أي دولار
    const checkSnap = await get(txRef);
    if (!checkSnap.exists()) return;
    
    const currentStatus = (checkSnap.val().status || '').toLowerCase();
    if (currentStatus === 'completed' || currentStatus === 'approved' || currentStatus === 'success' || currentStatus === 'rejected') {
      console.log("Transaction already processed inside Context Guard.");
      return; // طرد العملية لو مفرزة أصلاً
    }

    const txData = checkSnap.val() as Transaction;

    // تحديث الحالة فوراً في الفايربيز
    await update(txRef, { status: 'Completed' });

    // حقن رصيد العميل لو كان إيداع
    if (txData.type === 'Deposit' && txData.userId) {
      const userRef = ref(db, `users/${txData.userId}`);
      const snap = await get(userRef);
      if (snap.exists()) {
        const currentBal = parseFloat(snap.val().balance?.toString() || '0');
        await update(userRef, { balance: currentBal + parseFloat(txData.amount.toString()) });
      }
    }
  };

  const adminReject = async (txId: string) => {
    const txRef = ref(db, `transactions/${txId}`);
    
    // [الدرع السحابي] تحقق فوري لمنع الـ Double Refund في السحب
    const checkSnap = await get(txRef);
    if (!checkSnap.exists()) return;

    const currentStatus = (checkSnap.val().status || '').toLowerCase();
    if (currentStatus === 'completed' || currentStatus === 'approved' || currentStatus === 'success' || currentStatus === 'rejected') {
      console.log("Transaction already processed inside Context Guard.");
      return; 
    }

    const txData = checkSnap.val() as Transaction;

    // تحديث الحالة لـ Rejected
    await update(txRef, { status: 'Rejected' });

    // إرجاع الأموال المحجوزة للمستخدم لو كان طلب سحب تم رفضه
    if (txData.type === 'Withdrawal' && txData.userId) {
      const userRef = ref(db, `users/${txData.userId}`);
      const snap = await get(userRef);
      if (snap.exists()) {
        const currentBal = parseFloat(snap.val().balance?.toString() || '0');
        await update(userRef, { balance: currentBal + parseFloat(txData.amount.toString()) });
      }
    }
  };

  const getAllTransactions = () => allTransactions;
  const getPendingTransactions = () => allTransactions.filter(t => t.status === 'Pending');

  return (
    <WalletContext.Provider value={{
      // تأمين واجهة الحساب للأدمن لكي يرى معاملاته الشخصية فقط في شاشته الخاصة
      transactions: auth?.user?.email === ADMIN_EMAIL 
        ? allTransactions.filter(t => t.userId === auth.user?.uid) 
        : allTransactions,
      isLoading,
      requestDeposit,
      requestWithdrawal,
      refreshTransactions,
      getAllTransactions,
      getPendingTransactions,
      adminApprove,
      adminReject,
      addReward,
      addReferralBonus,
      addVIPUpgradeTx,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}