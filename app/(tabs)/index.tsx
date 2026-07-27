import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { useAuth } from '@/hooks/useAuth';
import { useTask } from '@/hooks/useTask';
import { useWallet } from '@/hooks/useWallet';
import { ref, onValue } from 'firebase/database';
import { TASK_TOTAL, getVIPTier } from '@/constants/config';
import { Transaction } from '@/contexts/WalletContext';
import { db } from '../../services/firebaseConfig';
import { registerForPushNotificationsAsync } from '@/services/pushNotificationService';

const dashboardTranslations: Record<string, Record<string, string>> = {
  EN: {
    greeting: "Hello,", noVip: "No VIP", totalBalance: "Credit • Available", deposit: "Deposit",
    withdraw: "Withdraw", dailyTask: "Daily Tasks", vipPlan: "VIP Plan",
    rewardClaimed: "Reward claimed!", upgradeToEarn: "Upgrade to earn more", remainingVideos: "videos remaining",
    recentActivity: "Recent transactions", viewAll: "View more", noTransactions: "No transactions yet",
    depositType: "Account Deposit", withdrawalType: "Withdrawal", rewardType: "Daily Reward",
    referralType: "Referral Bonus", pendingStatus: "Pending", completedStatus: "Completed",
    rejectedStatus: "Rejected", notifCenter: "Notifications", noNotifs: "No new notifications.", justNow: "Today, Just now"
  },
  AR: {
    greeting: "مرحباً،", noVip: "بدون VIP", totalBalance: "الرصيد • المتاح", deposit: "إيداع",
    withdraw: "سحب رصيد", dailyTask: "المهام", vipPlan: "خطة VIP",
    rewardClaimed: "استلمت المكافأة!", upgradeToEarn: "رقّي حسابك للربح", remainingVideos: "مهمة متبقية",
    recentActivity: "أحدث المعاملات", viewAll: "عرض المزيد", noTransactions: "لا توجد حركات بعد",
    depositType: "إيداع في الحساب", withdrawalType: "سحب رصيد", rewardType: "مكافأة يومية",
    referralType: "بونص إحالة", pendingStatus: "قيد الانتظار", completedStatus: "مكتملة",
    rejectedStatus: "مرفوضة", notifCenter: "الإشعارات", noNotifs: "لا توجد إشعارات.", justNow: "اليوم، الآن"
  }
};

function formatDate(dateStr: string | number, lang: string): string {
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString(lang === 'AR' ? 'ar-DZ' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  return lang === 'AR' ? `اليوم، ${time}` : `Today, ${time}`; 
}

function formatAmount(type: string, amount: number): string {
  const sign = type === 'Withdrawal' ? '-' : ''; 
  return `${sign}${amount.toFixed(2)}$`;
}

function TxRow({ tx, lang, rtlRow, rtlAlign, isLast }: { tx: Transaction; lang: string, rtlRow: any, rtlAlign: any, isLast: boolean }) {
  const t = dashboardTranslations[lang] || dashboardTranslations['EN'];
  const isReward = tx.type === 'Reward';
  const isDeposit = tx.type === 'Deposit';
  
  let displayType: string = tx.type;
  if (displayType === 'Deposit') displayType = t.depositType;
  else if (displayType === 'Withdrawal') displayType = t.withdrawalType;
  else if (displayType === 'Reward') displayType = t.rewardType;
  else if (displayType === 'Referral Bonus') displayType = t.referralType;

  const iconName = isReward ? 'gift' : isDeposit ? 'arrow-down-left' : 'credit-card';
  const iconColor = isReward ? '#F59E0B' : isDeposit ? '#10B981' : '#6B7280';
  const iconBg = isReward ? '#FEF3C7' : isDeposit ? '#D1FAE5' : '#F3F4F6';

  // 🔴 استخراج سبب الرفض وتنظيف النص
  const isRejected = String(tx.status).toLowerCase().includes('reject');
  const rawNote = tx.note || (tx as any).rejectReason || (tx as any).reason;
  const rejectReason = rawNote ? rawNote.replace(/^Rejected Reason:\s*/i, '') : null;

  return (
    <View style={[styles.txRow, rtlRow, isLast && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <View style={[styles.txIconBox, { borderColor: iconBg }]}>
         <View style={[styles.txIconInner, { backgroundColor: iconBg }]}>
            <Feather name={iconName} size={16} color={iconColor} />
         </View>
      </View>

      <View style={[styles.txDetails, rtlAlign]}>
        <Text style={styles.txTitle}>{displayType}</Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt, lang)}</Text>
        
        {/* 🔥 عرض سبب الرفض تحت المعاملة إذا كانت مرفوضة */}
        {isRejected && rejectReason && (
          <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3, fontWeight: '600' }}>
            {lang === 'AR' ? `سبب الرفض: ${rejectReason}` : `Reason: ${rejectReason}`}
          </Text>
        )}
      </View>

      <View style={{ alignItems: lang === 'AR' ? 'flex-start' : 'flex-end' }}>
        <Text style={styles.txAmount}>{formatAmount(tx.type, tx.amount)}</Text>
        <Text style={[styles.txStatusText, isRejected && { color: '#EF4444' }]}>
          {isRejected ? (lang === 'AR' ? 'مرفوضة' : 'Rejected') : 'Credit'}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth(); 
  const { dailyCounter, tasksDoneToday } = useTask();
  const { transactions } = useWallet();
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const lang = (user as any)?.language || 'EN';
  const isAR = lang === 'AR';
  const t = dashboardTranslations[lang] || dashboardTranslations['EN'];

  const rtlRow = isAR ? { flexDirection: 'row-reverse' as const } : {};
  const rtlAlign = isAR ? { alignItems: 'flex-end' as const, marginRight: 12, marginLeft: 0 } : { marginLeft: 12 };

  // --- إعدادات الأنيميشن (الميدالية الحية) ---
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

  useEffect(() => {
    if (user?.uid) {
      registerForPushNotificationsAsync(user.uid);
      const notifRef = ref(db, `users/${user.uid}/notifications`);
      const unsubNotif = onValue(notifRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const notifArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
          notifArray.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setNotifications(notifArray);
        } else {
          setNotifications([]);
        }
      });
      return () => unsubNotif();
    }
  }, [user?.uid]);

  if (!user) return null;

  const userVip = (user as any).vip_level || 0;
  const tier = getVIPTier(userVip);
  const recentTxs = transactions ? transactions.slice(0, 5) : [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 10 }} showsVerticalScrollIndicator={false}>
        
        {/* 1. Header Section */}
        <View style={[styles.header, rtlRow]}>
          <View style={[styles.userInfo, rtlRow]}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.greetingText}>
              {t.greeting} <Text style={styles.usernameText}>{user.username || 'User'}</Text>
            </Text>
          </View>
          <Pressable onPress={() => setShowNotifModal(true)} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
            {unreadCount > 0 && <View style={styles.notifDot} />}
          </Pressable>
        </View>

        {/* 2. Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceSubtitle}>{t.totalBalance}</Text>
          <Text style={styles.balanceAmountBig}>
            {((user as any).balance || 0).toFixed(2)}<Text style={styles.currencySymbol}>$</Text>
          </Text>
          
          <Animated.View style={[
            styles.medalContainer, 
            { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] }
          ]}>
            <LinearGradient
              colors={userVip > 0 ? ['#FCD34D', '#F59E0B', '#D97706'] : ['#E5E7EB', '#9CA3AF', '#6B7280']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medalGradient}
            >
              <MaterialCommunityIcons 
                name={userVip > 0 ? "crown" : "star-outline"} 
                size={16} 
                color="#FFF" 
                style={styles.medalIcon} 
              />
              <Text style={styles.medalText}>
                {/* تم تعديل هذا السطر لإزالة تكرار "VIP" */}
                {userVip > 0 ? `${tier.label}` : t.upgradeToEarn}
              </Text>
            </LinearGradient>
          </Animated.View>
          
          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
             <View style={[styles.dot, styles.dotActive]} />
             <View style={styles.dot} />
          </View>
        </View>

        {/* 3. Action Buttons Section */}
  {/* 3. Action Buttons Section */}
        <View style={[styles.actionRow, rtlRow]}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/withdraw')}>
            <View style={styles.actionCircle}>
              {/* أيقونة السحب الجديدة (سهم لأعلى يرمز لخروج المال) */}
              <Feather name="arrow-up-circle" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.actionText}>{t.withdraw}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => router.push('/deposit')}>
            <View style={styles.actionCircle}>
              {/* أيقونة الإيداع الجديدة (سهم لأسفل يرمز لدخول المال) */}
              <Feather name="arrow-down-circle" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.actionText}>{t.deposit}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => router.push('/tasks')}>
            <View style={styles.actionCircle}>
              <MaterialCommunityIcons name="target" size={24} color="#7C3AED" />
              {tasksDoneToday === false && <View style={styles.taskBadge} />}
            </View>
            <Text style={styles.actionText}>{t.dailyTask}</Text>
          </Pressable>
        </View>

        {/* 4. Transactions List Section */}
        <View style={styles.transactionsContainer}>
          <View style={[styles.sectionHeader, rtlRow]}>
            <Text style={styles.sectionTitle}>{t.recentActivity}</Text>
            <Pressable onPress={() => router.push('/wallet')}>
              <Text style={styles.viewAllText}>{t.viewAll}</Text>
            </Pressable>
          </View>

          <View style={styles.transactionsCard}>
            {recentTxs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{t.noTransactions}</Text>
              </View>
            ) : (
              recentTxs.map((tx, index) => (
                <TxRow 
                  key={tx.id} 
                  tx={tx} 
                  lang={lang} 
                  rtlRow={rtlRow} 
                  rtlAlign={rtlAlign}
                  isLast={index === recentTxs.length - 1} 
                />
              ))
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// 🎨 Styles
const THEME = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  primaryText: '#111827',
  secondaryText: '#6B7280',
  accentLight: '#EDE9F6',
  accentDark: '#7C3AED',
  greenDate: '#658141',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 10,
  },
  greetingText: { fontSize: 16, color: THEME.primaryText },
  usernameText: { fontWeight: '700' },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 2, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: THEME.bg },

  // Balance Section
  balanceSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  balanceSubtitle: {
    fontSize: 13,
    color: THEME.secondaryText,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceAmountBig: {
    fontSize: 48,
    fontWeight: '900',
    color: THEME.primaryText,
    letterSpacing: -1.5,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
  },
  
  // 🏅 Live Medal Styles
  medalContainer: {
    marginTop: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  medalIcon: {
    marginRight: 6,
  },
  medalText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  paginationDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: THEME.secondaryText },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  actionBtn: {
    alignItems: 'center',
    width: 90,
  },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    color: THEME.primaryText,
    fontWeight: '500',
    textAlign: 'center',
  },
  taskBadge: {
    position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: THEME.accentLight
  },

  // Transactions Section
  transactionsContainer: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primaryText,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primaryText,
    textDecorationLine: 'underline',
  },
  transactionsCard: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primaryText,
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: THEME.greenDate,
    fontWeight: '500',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.primaryText,
    marginBottom: 4,
  },
  txStatusText: {
    fontSize: 11,
    color: THEME.secondaryText,
    fontWeight: '500',
  },
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: THEME.secondaryText, fontSize: 13 },
});