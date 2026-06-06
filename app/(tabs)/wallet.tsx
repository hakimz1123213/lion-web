import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🚀 تم تنظيف الملف من الاستدعاءات الخارجية التي تسبب المربعات البيضاء على الويب
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Transaction } from '@/contexts/WalletContext'; 
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة المحفظة
const walletTranslations: Record<string, Record<string, string>> = {
  EN: {
    myWallet: "My Wallet",
    withdraw: "Withdraw",
    availableBalance: "Available Balance",
    topUp: "Top Up Balance",
    txHistory: "Transaction History",
    noTransactions: "No transactions yet",
    depositType: "Deposit",
    withdrawalType: "Withdrawal",
    rewardType: "Daily Reward",
    referralType: "Referral Bonus",
    pendingStatus: "Pending",
    completedStatus: "Completed",
    rejectedStatus: "Rejected"
  },
  AR: {
    myWallet: "محفظتي", 
    withdraw: "سحب الأموال",
    availableBalance: "الرصيد المتاح للعب",
    topUp: "شحن رصيد المحفظة",
    txHistory: "سجل المعاملات المالية",
    noTransactions: "لا يوجد أي معاملات مسجلة بعد",
    depositType: "عملية إيداع",
    withdrawalType: "طلب سحب",
    rewardType: "مكافأة المهام",
    referralType: "بونص الإحالة",
    pendingStatus: "قيد الانتظار",
    completedStatus: "مكتملة بنجاح",
    rejectedStatus: "مرفوضة"
  }
};

// ─── مكون عنصر المعاملة (Transaction Item) المحصن ──────────────────────────────
function TransactionItem({ tx, lang }: { tx: Transaction; lang: string }) {
  let iconEmoji = '🔄';
  let iconColor = Colors.textSecondary;
  let amountPrefix = '';
  let amountColor = '#fff';
  
  const t = walletTranslations[lang] || walletTranslations['EN'];
  
  const txTypeString = tx.type as string;
  const txStatusString = tx.status as string;
  
  let displayType = txTypeString;

  // 🛠️ استبدال الأيقونات المكسورة بإيموجيات نصية مدمجة وثابتة بنسبة 100%
  switch (txTypeString) {
    case 'Deposit':
    case 'deposit':
      iconEmoji = '➕';
      iconColor = Colors.info;
      amountPrefix = '+';
      amountColor = Colors.info;
      displayType = t.depositType;
      break;
    case 'Withdrawal':
    case 'withdrawal':
      iconEmoji = '➖';
      iconColor = Colors.danger;
      amountPrefix = '-';
      amountColor = Colors.danger;
      displayType = t.withdrawalType;
      break;
    case 'Reward':
    case 'reward':
      iconEmoji = '⭐';
      iconColor = Colors.success;
      amountPrefix = '+';
      amountColor = Colors.success;
      displayType = t.rewardType;
      break;
    case 'Referral Bonus': 
    case 'referral bonus':
      iconEmoji = '🎁'; 
      iconColor = Colors.gold;     
      amountPrefix = '+';
      amountColor = Colors.gold;
      displayType = t.referralType;
      break;
    case 'VIP Upgrade':
    case 'vip upgrade':
      iconEmoji = '💎';
      iconColor = Colors.gold;
      amountPrefix = '';
      amountColor = Colors.gold;
      displayType = lang === 'AR' ? "ترقية الحساب" : "VIP Upgrade";
      break;
  }

  // ترجمة حالة المعاملة بنقاء باستعمال المتغير النصي المصفى
  let displayStatus = txStatusString;
  const lowerStatus = txStatusString.toLowerCase();

  if (lowerStatus === 'pending' || lowerStatus === 'waiting') {
    displayStatus = t.pendingStatus;
  } else if (lowerStatus === 'completed' || lowerStatus === 'approved' || lowerStatus === 'success') {
    displayStatus = t.completedStatus;
  } else if (lowerStatus === 'rejected' || lowerStatus === 'failed') {
    displayStatus = t.rejectedStatus;
  }

  return (
    <View style={[styles.txItem, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.txIconBox, { backgroundColor: iconColor + '15' }]}>
        {/* حقن الإيموجي المناسب للعملية داخل الصندوق الثابت */}
        <Text style={{ fontSize: 14 }}>{iconEmoji}</Text>
      </View>
      <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end', marginRight: 12 }]}>
        <Text style={styles.txType}>{displayType}</Text>
        <Text style={styles.txDate}>
          {lang === 'AR' 
            ? new Date(tx.createdAt).toLocaleDateString('ar-DZ') 
            : new Date(tx.createdAt).toLocaleDateString()
          }
        </Text>
        {tx.note && <Text style={[styles.txNote, lang === 'AR' && { textAlign: 'right' }]} numberOfLines={1}>{tx.note}</Text>}
      </View>
      <View style={{ alignItems: lang === 'AR' ? 'flex-start' : 'flex-end' }}>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {amountPrefix}${tx.amount.toFixed(2)}
        </Text>
        <Text style={[styles.txStatus, { color: lowerStatus === 'pending' || lowerStatus === 'waiting' ? Colors.warning : lowerStatus === 'rejected' || lowerStatus === 'failed' ? Colors.danger : Colors.textMuted }]}>
          {displayStatus}
        </Text>
      </View>
    </View>
  );
}

// ─── الشاشة الرئيسية للمحفظة ──────────────────────────────────────────────────
export default function WalletScreen() {
  const { user } = useAuth();
  const { transactions, refreshTransactions } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = walletTranslations[lang] || walletTranslations['EN'];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  if (!user) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.title}>{t.myWallet}</Text>
        <Pressable 
          onPress={() => router.push('/withdraw')} 
          style={[styles.actionBtn, lang === 'AR' && { flexDirection: 'row-reverse' }]}
        >
          {/* 🛠️ استبدال أيقونة السحب في الهيدر بإيموجي حقيبة الأموال الفخمة */}
          <Text style={{ fontSize: 13, marginRight: 2 }}>💰</Text>
          <Text style={styles.actionBtnText}>{t.withdraw}</Text>
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t.availableBalance}</Text>
          <Text style={styles.balanceValue}>${user.balance.toFixed(2)}</Text>
          <View style={styles.balanceFooter}>
            <Pressable 
              onPress={() => router.push('/deposit')} 
              style={[styles.depositBtn, lang === 'AR' && { flexDirection: 'row-reverse' }]}
            >
              {/* 🛠️ استبدال أيقونة الزائد داخل زر الشحن بإيموجي الشحن السريع */}
              <Text style={{ fontSize: 14, marginRight: 4 }}>⚡</Text>
              <Text style={styles.depositBtnText}>{t.topUp}</Text>
            </Pressable>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={[styles.historyHeader, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.historyTitle}>{t.txHistory}</Text>
          {/* 🛠️ استبدال أيقونة التاريخ بجانب العنوان بإيموجي الساعة الرملية */}
          <Text style={{ fontSize: 13 }}>⏳</Text>
        </View>

        <View style={styles.txList}>
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📄</Text>
              <Text style={styles.emptyText}>{t.noTransactions}</Text>
            </View>
          ) : (
            transactions
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((tx) => <TransactionItem key={tx.id} tx={tx} lang={lang} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#fff' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  actionBtnText: { color: Colors.gold, fontSize: FontSize.xs, fontWeight: 'bold' },
  
  balanceCard: { backgroundColor: Colors.surface, margin: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center' },
  balanceLabel: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: 8 },
  balanceValue: { color: Colors.gold, fontSize: 40, fontWeight: 'bold' },
  balanceFooter: { marginTop: 20, width: '100%' },
  depositBtn: { backgroundColor: Colors.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.md },
  depositBtnText: { color: Colors.textOnGold, fontWeight: 'bold', fontSize: FontSize.base },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: 15 },
  historyTitle: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  
  txList: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceBorder },
  txIconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txType: { color: '#fff', fontSize: FontSize.base, fontWeight: 'bold' },
  txDate: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  txNote: { color: Colors.goldDim, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  txAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  txStatus: { fontSize: 9, marginTop: 4, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: Colors.textMuted, marginTop: 10, fontSize: FontSize.sm },
});