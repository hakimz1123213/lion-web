import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Transaction } from '@/contexts/WalletContext';
import { getVIPTier } from '@/constants/config'; // تأكد من مسار الاستيراد الصحيح

// 🎨 ثيم الألوان
const THEME = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  primary: '#7C3AED',
  primaryLight: '#F3F0FA',
  textMain: '#111827',
  textSecondary: '#6B7280',
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  border: '#E5E7EB',
};

// 🌍 قاموس التعريب
const walletTranslations: Record<string, Record<string, string>> = {
  EN: {
    myWallet: "My Wallet",
    spotBalance: "Spot Balance",
    favorites: "All",
    highestGrowth: "Deposits",
    newest: "Withdrawals",
    depositType: "Deposit",
    withdrawalType: "Withdrawal",
    rewardType: "Daily Reward",
    referralType: "Referral Bonus",
    pendingStatus: "Pending",
    completedStatus: "Completed",
    rejectedStatus: "Rejected",
    noTransactions: "No transactions yet",
    upgradeToEarn: "Upgrade to earn more",
  },
  AR: {
    myWallet: "محفظتي",
    spotBalance: "الرصيد المتاح",
    favorites: "الكل",
    highestGrowth: "الإيداعات",
    newest: "السحوبات",
    depositType: "إيداع",
    withdrawalType: "سحب",
    rewardType: "مكافأة",
    referralType: "بونص",
    pendingStatus: "قيد الانتظار",
    completedStatus: "مكتملة",
    rejectedStatus: "مرفوضة",
    noTransactions: "لا يوجد معاملات",
    upgradeToEarn: "رقّي حسابك للربح",
  }
};

// ─── مكون عنصر المعاملة ─────────────────────────
function TransactionItem({ tx, lang }: { tx: Transaction; lang: string }) {
  const t = walletTranslations[lang] || walletTranslations['EN'];
  const isAR = lang === 'AR';

  const txTypeString = String(tx.type).toLowerCase();
  const txStatusString = String(tx.status).toLowerCase();

  let displayType: string = String(tx.type);
  let displayStatus: string = String(tx.status);
  
  let iconName: any = 'activity';
  let iconColor = THEME.primary;
  let iconBg = THEME.primaryLight;
  let amountPrefix = '';
  let amountColor = THEME.textMain;
  let statusColor = THEME.textSecondary;

  // 1. تحديد النوع والشكل
  if (txTypeString.includes('deposit')) {
    displayType = t.depositType;
    iconName = 'arrow-down-left';
    iconColor = THEME.success;
    iconBg = THEME.successLight;
    amountPrefix = '+';
    amountColor = THEME.success;
  } else if (txTypeString.includes('withdraw')) {
    displayType = t.withdrawalType;
    iconName = 'arrow-up-right';
    iconColor = THEME.danger;
    iconBg = THEME.dangerLight;
    amountPrefix = '-';
  } else if (txTypeString.includes('reward')) {
    displayType = t.rewardType;
    iconName = 'gift';
    iconColor = THEME.warning;
    iconBg = '#FEF3C7';
    amountPrefix = '+';
    amountColor = THEME.success;
  } else if (txTypeString.includes('referral')) {
    displayType = t.referralType;
    iconName = 'users';
    iconColor = THEME.primary;
    iconBg = THEME.primaryLight;
    amountPrefix = '+';
    amountColor = THEME.success;
  }

  // 2. تحديد الحالة والألوان
  const isRejected = txStatusString.includes('reject') || txStatusString.includes('fail');

  if (txStatusString.includes('pending') || txStatusString.includes('wait')) {
    displayStatus = t.pendingStatus;
    statusColor = THEME.warning;
  } else if (txStatusString.includes('complete') || txStatusString.includes('success')) {
    displayStatus = t.completedStatus;
    statusColor = THEME.success;
  } else if (isRejected) {
    displayStatus = t.rejectedStatus;
    statusColor = THEME.danger;
  }

  // 🔴 جلب سبب الرفض الذي أرسله الأدمن
  const rawNote = tx.note || (tx as any).rejectReason || (tx as any).reason;
  const rejectReason = rawNote ? rawNote.replace(/^Rejected Reason:\s*/i, '') : null;

  return (
    <View style={[styles.txItem, isAR && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.txIconBox, { backgroundColor: iconBg }]}>
        <Feather name={iconName} size={20} color={iconColor} />
      </View>

      <View style={[styles.txDetails, isAR ? { alignItems: 'flex-end', marginRight: 12 } : { marginLeft: 12 }]}>
        <Text style={styles.txTitle}>{displayType}</Text>
        <Text style={styles.txSubtitle}>
          {new Date(tx.createdAt).toLocaleDateString(isAR ? 'ar-DZ' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* 🔥 إظهار سبب الرفض هنا بخط واضّح تحت التاريخ */}
        {isRejected && rejectReason && (
          <Text style={{ fontSize: 11, color: THEME.danger, marginTop: 4, fontWeight: '700' }}>
            {isAR ? `سبب الرفض: ${rejectReason}` : `Reason: ${rejectReason}`}
          </Text>
        )}
      </View>

      <View style={{ alignItems: isAR ? 'flex-start' : 'flex-end' }}>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {amountPrefix}${tx.amount.toFixed(2)}
        </Text>
        <Text style={[styles.txStatus, { color: statusColor }]}>{displayStatus}</Text>
      </View>
    </View>
  );
}

// ─── الشاشة الرئيسية للمحفظة ──────────────────────────────────────────────────
export default function WalletScreen() {
  const { user } = useAuth();
  const { transactions, refreshTransactions } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All'); 
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = walletTranslations[lang] || walletTranslations['EN'];
  const isAR = lang === 'AR';

  // --- إعدادات الأنيميشن للميدالية ---
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();
  }, [scaleAnim, floatAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshTransactions();
    setRefreshing(false);
  };

  if (!user) return null;

  const userVip = (user as any).vip_level || 0;
  const tier = getVIPTier(userVip);

  const filteredTxs = transactions.filter(tx => {
    const typeStr = String(tx.type).toLowerCase();
    if (activeFilter === 'Deposits') return typeStr.includes('deposit') || typeStr.includes('reward') || typeStr.includes('referral');
    if (activeFilter === 'Withdrawals') return typeStr.includes('withdraw');
    return true; 
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      
      {/* Header */}
      <View style={[styles.header, isAR && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name={isAR ? "chevron-right" : "chevron-left"} size={24} color={THEME.textMain} />
        </Pressable>
        <View style={[styles.titleContainer, isAR && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.headerTitle}>{t.myWallet}</Text>
          <MaterialIcons name="verified" size={16} color={THEME.primary} style={{ marginHorizontal: 4 }} />
        </View>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={[styles.balanceHeader, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.balanceLabel}>{t.spotBalance}</Text>
            <Pressable onPress={() => setShowBalance(!showBalance)}>
              <Feather name={showBalance ? "eye" : "eye-off"} size={18} color={THEME.textSecondary} />
            </Pressable>
          </View>
          
          <Text style={[styles.balanceAmount, isAR && { textAlign: 'right' }]}>
            {showBalance ? `${(user as any).balance.toFixed(2)} $` : '**** $'}
          </Text>

          <View style={[styles.balanceFooter, isAR && { flexDirection: 'row-reverse' }]}>
            {/* إضافة الميدالية الحية هنا داخل المحفظة */}
            <View style={{ flex: 1, alignItems: isAR ? 'flex-end' : 'flex-start' }}>
              <Animated.View style={[
                styles.medalContainer, 
                { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] }
              ]}>
                <LinearGradient
                  colors={userVip > 0 ? ['#FCD34D', '#F59E0B', '#D97706'] : ['#E5E7EB', '#9CA3AF', '#6B7280']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.medalGradient, isAR && { flexDirection: 'row-reverse' }]}
                >
                  <MaterialCommunityIcons 
                    name={userVip > 0 ? "crown" : "star-outline"} 
                    size={16} 
                    color="#FFF" 
                    style={[isAR ? { marginLeft: 6 } : { marginRight: 6 }]} 
                  />
                  <Text style={styles.medalText}>
                    {userVip > 0 ? `${tier.label}` : t.upgradeToEarn}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>

            <View style={[styles.actionButtonsRow, isAR && { flexDirection: 'row-reverse' }]}>
              <Pressable style={styles.circleBtn} onPress={() => router.push('/withdraw')}>
                <Feather name="arrow-up-right" size={20} color={THEME.danger} />
              </Pressable>
              
              <Pressable style={styles.circleBtn} onPress={() => router.push('/deposit')}>
                <Feather name="arrow-down-left" size={20} color={THEME.success} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterTabs, isAR && { flexDirection: 'row-reverse' }]}>
          {['All', 'Deposits', 'Withdrawals'].map((filterName) => {
            const isActive = activeFilter === filterName;
            const label = filterName === 'All' ? t.favorites : filterName === 'Deposits' ? t.highestGrowth : t.newest;
            return (
              <Pressable 
                key={filterName}
                onPress={() => setActiveFilter(filterName)}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Feather name="search" size={20} color={THEME.textSecondary} />
        </View>

        {/* Transactions List */}
        <View style={styles.txList}>
          {filteredTxs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={THEME.border} />
              <Text style={styles.emptyText}>{t.noTransactions}</Text>
            </View>
          ) : (
            filteredTxs
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
  screen: { flex: 1, backgroundColor: THEME.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: THEME.textMain },
  iconBtn: { padding: 8 },

  balanceCard: {
    backgroundColor: THEME.primaryLight,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  balanceLabel: { color: THEME.textSecondary, fontSize: 14, fontWeight: '500' },
  balanceAmount: { color: THEME.textMain, fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 20 },
  balanceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionButtonsRow: { flexDirection: 'row', gap: 12 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

  // 🏅 Live Medal Styles
  medalContainer: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 20,
  },
  medalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  medalText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  filterTabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  filterTabActive: { backgroundColor: THEME.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  filterText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: THEME.primary, fontWeight: '700' },

  txList: { paddingHorizontal: 20 },
  txItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.surface, padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  txIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txDetails: { flex: 1 },
  txTitle: { color: THEME.textMain, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txSubtitle: { color: THEME.textSecondary, fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  txStatus: { fontSize: 11, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: THEME.textSecondary, marginTop: 12, fontSize: 14 },
});