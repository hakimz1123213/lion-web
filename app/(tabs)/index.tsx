import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🚀 لا نحتاج لأي مكتبة أيقونات بعد الآن! 

import { useAuth } from '@/hooks/useAuth';
import { useTask } from '@/hooks/useTask';
import { useWallet } from '@/hooks/useWallet';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { VIP_TIERS, TASK_TOTAL, getVIPTier } from '@/constants/config';
import { Transaction } from '@/contexts/WalletContext';

const dashboardTranslations: Record<string, Record<string, string>> = {
  EN: {
    goodDay: "Good day,",
    noVip: "No VIP",
    totalBalance: "MY MONEY",
    deposit: "Deposit",
    withdraw: "Withdraw",
    dailyTask: "Daily Task",
    start: "Start →",
    completed: "Completed ✓",
    rewardClaimed: "Reward claimed!",
    upgradeToEarn: "Upgrade VIP to earn",
    remainingVideos: "videos remaining",
    potentialReward: "Today's Potential Reward",
    payoutNote: "Credited after completing all 10 tasks",
    activateVip: "Activate Your VIP Plan",
    earnDaily: "Earn daily rewards from $1.20 to $24.00",
    recentActivity: "Recent Activity",
    viewAll: "View all →",
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
    goodDay: "أهلاً بك، يوماً سعيداً",
    noVip: "بدون اشتراك VIP",
    totalBalance: "إجمالي الرصيد الحالي",
    deposit: "إيداع شحن",
    withdraw: "سحب أرباح",
    dailyTask: "المهام والـفيديوهات اليومية",
    start: "ابدأ الآن ←",
    completed: "مكتملة بالكامل ✓",
    rewardClaimed: "تم استلام المكافأة الملوكية بنجاح!",
    upgradeToEarn: "قم بترقية الـ VIP لبدء جني الأرباح",
    remainingVideos: "فيديوهات متبقية للحصول على الجائزة",
    potentialReward: "العائد المالي المحتمل اليوم",
    payoutNote: "يتم احتساب الرصيد تلقائياً بعد إتمام كاع الـ 10 فيديوهات",
    activateVip: "قم بتفعيل خطة الـ VIP الخاصة بك",
    earnDaily: "اربح عوائد مالية يومية مضمونة من $1.20 إلى $24.00",
    recentActivity: "أحدث النشاطات المالية المؤخرة",
    viewAll: "عرض السجل كامل ←",
    noTransactions: "لا يوجد أي عمليات مسجلة بعد",
    depositType: "عملية إيداع",
    withdrawalType: "طلب سحب",
    rewardType: "مكافأة المهام",
    referralType: "بونص الإحالة",
    pendingStatus: "قيد الانتظار",
    completedStatus: "مكتملة",
    rejectedStatus: "مرفوضة"
  }
};

function formatDate(dateStr: string | number, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === 'AR' ? 'ar-DZ' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(type: string, amount: number): string {
  const sign = type === 'Withdrawal' ? '-' : '+';
  return `${sign}$${amount.toFixed(2)}`;
}

function TxRow({ tx, lang }: { tx: Transaction; lang: string }) {
  const isReward = tx.type === 'Reward';
  const isDeposit = tx.type === 'Deposit';
  const color = tx.type === 'Withdrawal' ? Colors.danger : Colors.success;
  
  const t = dashboardTranslations[lang] || dashboardTranslations['EN'];
  const txTypeString = tx.type as string;
  const txStatusString = tx.status as string;

  let displayType = txTypeString;
  if (txTypeString === 'Deposit') displayType = t.depositType;
  else if (txTypeString === 'Withdrawal') displayType = t.withdrawalType;
  else if (txTypeString === 'Reward') displayType = t.rewardType;
  else if (txTypeString === 'Referral Bonus') displayType = t.referralType;

  let displayStatus = txStatusString;
  const lowerStatus = txStatusString.toLowerCase();
  if (lowerStatus === 'pending' || lowerStatus === 'waiting') displayStatus = t.pendingStatus;
  else if (lowerStatus === 'completed' || lowerStatus === 'approved' || lowerStatus === 'success') displayStatus = t.completedStatus;
  else if (lowerStatus === 'rejected' || lowerStatus === 'failed') displayStatus = t.rejectedStatus;

  return (
    <View style={[styles.txRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.txIcon, { backgroundColor: isReward ? Colors.goldSurface : isDeposit ? Colors.infoSurface : Colors.dangerSurface }]}>
        {/* 👑 إيموجي نصي أصلي يستحيل أن يختفي */}
        <Text style={{ fontSize: 14 }}>
          {isReward ? '⭐' : isDeposit ? '⬇️' : '⬆️'}
        </Text>
      </View>
      <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end', marginRight: 12 }]}>
        <Text style={styles.txType}>{displayType}</Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt, lang)}</Text>
      </View>
      <View style={{ alignItems: lang === 'AR' ? 'flex-start' : 'flex-end' }}>
        <Text style={[styles.txAmount, { color }]}>{formatAmount(tx.type, tx.amount)}</Text>
        <View style={[styles.txStatusBadge, { backgroundColor: lowerStatus === 'completed' || lowerStatus === 'approved' || lowerStatus === 'success' ? Colors.successSurface : lowerStatus === 'rejected' || lowerStatus === 'failed' ? Colors.dangerSurface : Colors.warningSurface }]}>
          <Text style={[styles.txStatusText, { color: lowerStatus === 'completed' || lowerStatus === 'approved' || lowerStatus === 'success' ? Colors.success : lowerStatus === 'rejected' || lowerStatus === 'failed' ? Colors.danger : Colors.warning }]}>
            {displayStatus}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, isLoading } = useAuth(); 
  const { dailyCounter, tasksDoneToday } = useTask();
  const { transactions } = useWallet();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // @ts-ignore
const lang = user?.language || 'EN';
  const t = dashboardTranslations[lang] || dashboardTranslations['EN'];

  const secretTapCount = React.useRef(0);
  const secretTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTap = () => {
    if (!user || !user.isAdmin) return; 
    secretTapCount.current += 1;
    if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
    if (secretTapCount.current >= 5) {
      secretTapCount.current = 0;
      router.push('/admin');
      return;
    }
    secretTapTimer.current = setTimeout(() => { secretTapCount.current = 0; }, 3000);
  };

  if (!user) return null;

  const userVip = user.vip_level || 0;
  const tier = getVIPTier(userVip);
  const progress = dailyCounter / TASK_TOTAL;
  const recentTxs = transactions ? transactions.slice(0, 4) : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={handleSecretTap} style={lang === 'AR' && { alignItems: 'flex-end' }}>
          <Text style={styles.greeting}>{t.goodDay}</Text>
          <Text style={styles.username}>{user.username}</Text>
        </Pressable>
        <Pressable
          style={[styles.vipBadge, lang === 'AR' && { flexDirection: 'row-reverse' }]}
          onPress={() => router.push('/vip-upgrade')}
        >
          <Text style={{ fontSize: 12, opacity: userVip > 0 ? 1 : 0.5 }}>💎</Text>
          <Text style={[styles.vipBadgeText, { color: userVip > 0 ? tier.color : Colors.textMuted }]}>
            {userVip > 0 ? tier.label : t.noVip}
          </Text>
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceGlow} />
        <Text style={[styles.balanceLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.totalBalance}</Text>
        <Text style={[styles.balanceAmount, lang === 'AR' && { textAlign: 'right' }]}>${user.balance.toFixed(2)}</Text>
        <View style={[styles.balanceActions, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Pressable
            style={({ pressed }) => [styles.balanceBtn, { opacity: pressed ? 0.8 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
            onPress={() => router.push('/deposit')}
          >
            <Text style={{ fontSize: 14 }}>⬇️</Text>
            <Text style={styles.balanceBtnText}>{t.deposit}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.balanceBtnOutline, { opacity: pressed ? 0.8 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
            onPress={() => router.push('/withdraw')}
          >
            <Text style={{ fontSize: 14 }}>⬆️</Text>
            <Text style={styles.balanceBtnOutlineText}>{t.withdraw}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[GlobalStyles.card, styles.section]}>
        <View style={[GlobalStyles.spaceBetween, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={GlobalStyles.sectionTitle}>{t.dailyTask}</Text>
          <Pressable onPress={() => router.push('/tasks')}>
            <Text style={{ color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.semibold }}>
              {tasksDoneToday ? t.completed : t.start}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.taskProgressRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.taskCountText, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Text style={{ color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.bold }}>{dailyCounter}</Text>
            <Text style={styles.taskCountOf}>/{TASK_TOTAL}</Text>
          </Text>
          <Text style={styles.taskStatusText}>
            {tasksDoneToday
              ? t.rewardClaimed
              : userVip === 0
              ? t.upgradeToEarn
              : `${TASK_TOTAL - dailyCounter} ${t.remainingVideos}`}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }, lang === 'AR' && { alignSelf: 'flex-end' }]} />
        </View>
      </View>

      {userVip > 0 && (
        <View style={[GlobalStyles.cardGold, styles.section]}>
          <View style={[GlobalStyles.spaceBetween, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Text style={GlobalStyles.sectionTitle}>{t.potentialReward}</Text>
            <Text style={{ fontSize: 16 }}>⭐</Text>
          </View>
          <Text style={[styles.payoutRange, lang === 'AR' && { textAlign: 'right' }]}>
            ${tier.dailyPayoutMin.toFixed(2)} – ${tier.dailyPayoutMax.toFixed(2)}
          </Text>
          <Text style={[styles.payoutNote, lang === 'AR' && { textAlign: 'right' }]}>{t.payoutNote}</Text>
        </View>
      )}

      {userVip === 0 && (
        <Pressable
          style={({ pressed }) => [styles.upgradePrompt, { opacity: pressed ? 0.85 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
          onPress={() => router.push('/vip-upgrade')}
        >
          <Text style={{ fontSize: 20 }}>💎</Text>
          <View style={[{ flex: 1, marginLeft: Spacing.sm }, lang === 'AR' && { alignItems: 'flex-end', marginRight: Spacing.sm, marginLeft: 0 }]}>
            <Text style={styles.upgradeTitle}>{t.activateVip}</Text>
            <Text style={styles.upgradeSubtitle}>{t.earnDaily}</Text>
          </View>
          <Text style={{ fontSize: 16, color: Colors.goldDim }}>
            {lang === 'AR' ? '◀' : '▶'}
          </Text>
        </Pressable>
      )}

      <View style={[GlobalStyles.card, styles.section]}>
        <View style={[GlobalStyles.spaceBetween, { marginBottom: Spacing.md }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={GlobalStyles.sectionTitle}>{t.recentActivity}</Text>
          <Pressable onPress={() => router.push('/wallet')}>
            <Text style={{ color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.semibold }}>
              {t.viewAll}
            </Text>
          </Pressable>
        </View>
        {recentTxs.length === 0 ? (
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.lg }}>
            {t.noTransactions}
          </Text>
        ) : (
          recentTxs.map((tx, i) => {
            const lowerStatus = (tx.status as string).toLowerCase();
            return (
              <View key={tx.id}>
                <TxRow tx={tx} lang={lang} />
                {i < recentTxs.length - 1 && <View style={GlobalStyles.divider} />}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  greeting: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  username: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  vipBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  balanceCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.goldSurface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.goldDim, padding: Spacing.lg, overflow: 'hidden' },
  balanceGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.gold, opacity: 0.06 },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.goldDim, fontWeight: FontWeight.semibold, letterSpacing: 1.5, marginBottom: Spacing.sm },
  balanceAmount: { fontSize: 44, fontWeight: FontWeight.extrabold, color: Colors.gold, marginBottom: Spacing.lg, letterSpacing: -1 },
  balanceActions: { flexDirection: 'row', gap: Spacing.sm },
  balanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.gold, borderRadius: Radius.md, paddingVertical: 12 },
  balanceBtnText: { color: Colors.textOnGold, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  balanceBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: Colors.goldDim, borderRadius: Radius.md, paddingVertical: 12 },
  balanceBtnOutlineText: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  taskProgressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.sm },
  taskCountText: { flexDirection: 'row', alignItems: 'baseline' },
  taskCountOf: { fontSize: FontSize.lg, color: Colors.textMuted, fontWeight: FontWeight.medium },
  taskStatusText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressBarFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: Radius.full },
  taskDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  taskDot: { width: 20, height: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceBorder },
  taskDotDone: { backgroundColor: Colors.gold },
  payoutRange: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  payoutNote: { fontSize: FontSize.sm, color: Colors.goldDim },
  upgradePrompt: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.goldSurface, borderWidth: 1, borderColor: Colors.goldDim, borderRadius: Radius.lg, padding: Spacing.md },
  upgradeTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  upgradeSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txType: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  txDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  txStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});