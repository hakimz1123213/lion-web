import { ref, update, push, increment, serverTimestamp } from "firebase/database";
import { db } from './firebaseConfig'; 

export const recordFinancialTransaction = async (userId: string, username: string, depositAmount: number) => {
  try {
    const latchaProfit = depositAmount * 0.80; 
    const hakimProfit = depositAmount * 0.20; 

    const totalsRef = ref(db, 'platform_finances/totals');
    await update(totalsRef, {
      // latcha يربح من حقل hakim_total برمجياً
      hakim_total_earned: increment(latchaProfit),
      // hakim يربح من حقل manager_total برمجياً
      manager_total_earned: increment(hakimProfit),
      total_deposits_volume: increment(depositAmount),
      last_update: serverTimestamp()
    });

    const logsRef = ref(db, 'platform_finances/logs');
    const newLogRef = push(logsRef);
    await update(newLogRef, {
      id: newLogRef.key,
      userId,
      username,
      totalAmount: depositAmount,
      latchaProfit,
      hakimProfit,
      timestamp: serverTimestamp(),
      type: 'DEPOSIT_SPLIT'
    });
    return { success: true };
  } catch (error) {
    console.error("Financial Error:", error);
    return { success: false };
  }
};
