import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { ref, get } from 'firebase/database';
import { db } from '@/services/firebaseConfig';
import { sendPushNotification } from '@/services/pushNotificationService';
import { useAlert } from '@/template';
import { VIP_TIERS, VIPTier } from '@/constants/config';
import { sendVIPUpgradeAlert } from '@/services/discord';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 85; 

const vipTranslations: Record<string, Record<string, string>> = {
  EN: {
    vipPlans: "VIP Privileges",
    processing: "Processing...",
    locked: "LOCKED",
    active: "ACTIVE",
    currentPlanInfo: "You are currently on",
    earnMore: "Accumulate ${amount} more to unlock",
    reqBalance: "Req. Balance",
    dailyReward: "Daily Reward",
    estMonthly: "Est. Monthly",
    privilegesAvail: "Privileges available",
    currentPlanBtn: "Current Plan",
    levelUp: "Level Up",
    planActiveTitle: "Plan Active",
    planActiveDesc: "You already have {label} or higher activated.",
    insufficientTitle: "Insufficient Balance",
    insufficientDesc1: "You need an overall accumulated balance of $",
    insufficientDesc2: "to unlock",
    deficit: "Deficit",
    cancel: "Cancel",
    depositNow: "Deposit Now",
    unlockConfirmTitle: "Unlock {label}",
    unlockConfirmDesc1: "Your accumulated balance of $",
    unlockConfirmDesc2: "is ready! Unlocking VIP",
    unlockConfirmDesc3: "will secure $",
    unlockConfirmDesc4: "as your new locked capital.\n\nYour total funds stay in your account, and your free withdrawal profit resets to $0 to start earning new ad rewards!",
    confirm: "Confirm",
    successTitle: "VIP Upgraded!",
    successDesc1: "Congratulations!",
    successDesc2: "is now active. Your total balance is preserved as locked capital successfully!",
    perfect: "Perfect"
  },
  AR: {
    vipPlans: "امتيازات الـ VIP",
    processing: "جاري المعالجة...",
    locked: "مغلق",
    active: "نشط",
    currentPlanInfo: "أنت حالياً في رتبة",
    earnMore: "احتاج شحن بقيمة ${amount} لفتح",
    reqBalance: "الرصيد المطلوب",
    dailyReward: "العائد اليومي",
    estMonthly: "الربح الشهري",
    privilegesAvail: "الامتيازات المتاحة",
    currentPlanBtn: "الخطة الحالية",
    levelUp: "ترقية الحساب",
    planActiveTitle: "الخطة نشطة بالفعل",
    planActiveDesc: "حسابك مفعّل بالفعل على باقة {label} أو رتبة أعلى منها.",
    insufficientTitle: "رصيد غير كافٍ",
    insufficientDesc1: "أنت بحاجة إلى رصيد تراكمي إجمالي بقيمة $",
    insufficientDesc2: "لفتح باقة",
    deficit: "المبلغ المتبقي للشحن",
    cancel: "إلغاء",
    depositNow: "شحن الرصيد الآن",
    unlockConfirmTitle: "فتح وتفعيل {label}",
    unlockConfirmDesc1: "رصيدك التراكمي البالغ $",
    unlockConfirmDesc2: "جاهز تماماً! فتح رتبة VIP ",
    unlockConfirmDesc3: "سيقوم بتأمين وحجز مبلغ $",
    unlockConfirmDesc4: "كرأس مال محمي جديد داخل حسابك.\n\nأموالك كاملة ستبقى محفوظة في رصيدك، وسيتم تصفير الرصيد المتاح للسحب لتبدأ جني أرباح الإعلانات اليومية الجديدة من الصفر!",
    confirm: "تأكيد التفعيل",
    successTitle: "مبروك الترقية الملوكية!",
    successDesc1: "تهانينا الحارة!",
    successDesc2: "أصبحت نشطة الآن. تم الحفاظ على إجمالي رصيدك كرأس مال محمي بنجاح!",
    perfect: "ممتاز"
  }
};

export default function VIPUpgradeScreen() {
  const { user, upgradeVIP } = useAuth();
  const { addVIPUpgradeTx } = useWallet();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
        ])
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (user) {
      const nextLevel = user.vip_level < VIP_TIERS.length ? user.vip_level + 1 : user.vip_level;
      setSelectedLevel(nextLevel || 1);
      setTimeout(() => {
        const targetIndex = VIP_TIERS.findIndex(t => t.level === (nextLevel || 1));
        if (targetIndex >= 0 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: targetIndex, animated: true });
        }
      }, 500);
    }
  }, [user]);

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = vipTranslations[lang] || vipTranslations['EN'];
  const isRTL = lang === 'AR';

  const selectedTier = VIP_TIERS.find(t => t.level === selectedLevel) || VIP_TIERS[0];
  const isActive = user.vip_level >= selectedTier.level;
  const isLocked = !isActive && user.balance < selectedTier.entryFee;
  const deficit = selectedTier.entryFee - user.balance;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / ITEM_WIDTH);
    const safeIndex = Math.max(0, Math.min(index, VIP_TIERS.length - 1));
    const newLevel = VIP_TIERS[safeIndex].level;
    if (newLevel !== selectedLevel) setSelectedLevel(newLevel);
  };

  const handleActivate = async (tier: VIPTier) => {
    if (user.vip_level >= tier.level) {
      showAlert(t.planActiveTitle, t.planActiveDesc.replace('{label}', tier.label));
      return;
    }

    if (user.balance < tier.entryFee) {
      showAlert(
        t.insufficientTitle,
        `${t.insufficientDesc1}${tier.entryFee} ${t.insufficientDesc2} ${tier.label}.\n\n${t.deficit}: $${deficit.toFixed(2)}`,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.depositNow, onPress: () => router.push('/deposit') },
        ]
      );
      return;
    }

    showAlert(
      t.unlockConfirmTitle.replace('{label}', tier.label),
      `${t.unlockConfirmDesc1}${user.balance.toFixed(2)} ${t.unlockConfirmDesc2} ${tier.level} ${t.unlockConfirmDesc3}${tier.entryFee} ${t.unlockConfirmDesc4}`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: async () => {
            setIsProcessing(true);
            const previousLevel = user.vip_level;
            
            const result = await upgradeVIP(tier.level, 0);

            if (result.error === null) {
              await addVIPUpgradeTx(0, tier.level);
              await sendVIPUpgradeAlert({
                username: user.username,
                userId: user.uid,
                previousLevel,
                newLevel: tier.level,
                entryFee: tier.entryFee,
                dailyPayoutMin: tier.dailyPayoutMin,
                dailyPayoutMax: tier.dailyPayoutMax,
                newBalance: user.balance, 
                timestamp: Date.now(),
              });

              if (user.referredBy && user.referredBy.trim() !== '' && user.referredBy.toLowerCase() !== 'none') {
                const usersRef = ref(db, 'users');
                const usersSnap = await get(usersRef);
                if (usersSnap.exists()) {
                  const sponsorCode = String(user.referredBy).trim().toUpperCase();
                  let sponsorToken = null;
                  
                  usersSnap.forEach((childSnap) => {
                    const u = childSnap.val();
                    if (sponsorCode === (u.referralCode || '').toUpperCase() || sponsorCode === (u.username || '').toUpperCase()) {
                      if (u.expoPushToken) sponsorToken = u.expoPushToken;
                    }
                  });

                  if (sponsorToken) {
                    const bonusAmount = (tier.entryFee * 0.10).toFixed(2);
                    await sendPushNotification(
                      sponsorToken,
                      '💸 بونص إحالة فوري!',
                      `قام صديقك ${user.username} بترقية حسابه إلى VIP ${tier.level}. لقد حصلت للتو على عمولة قدرها $${bonusAmount}!`
                    );
                  }
                }
              }

              showAlert(t.successTitle, `${t.successDesc1} ${tier.label} ${t.successDesc2}`, [{ text: t.perfect, onPress: () => router.back() }]);
            } else {
              showAlert('Error', result.error);
            }
            setIsProcessing(false);
          },
        },
      ]
    );
  };

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12]
  });

  return (
    <View style={styles.container}>
      
      {/* تدرج لوني ناعم وخفيف متوافق مع الخلفية البيضاء */}
      <LinearGradient
        colors={[`${selectedTier.color}15`, 'transparent']} 
        style={styles.softTopGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" style={isRTL && { transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.vipPlans}</Text>
        <Pressable style={styles.iconBtn}>
          <Ionicons name="headset-outline" size={22} color="#4B5563" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        
        {/* الوسام الاحترافي المتحرك */}
        <View style={styles.emblemContainer}>
          <Animated.View style={[styles.medallionWrapper, { transform: [{ translateY }] }]}>
            <Animated.View style={[
              styles.medallionGlow, 
              { backgroundColor: selectedTier.color, transform: [{ scale: pulseAnim }] }
            ]} />
            <LinearGradient
              colors={[selectedTier.color, `${selectedTier.color}80`]}
              style={styles.medallionOuterRing}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.medallionInnerCore}>
                {selectedTier.level >= 6 ? (
                   <MaterialCommunityIcons name="crown" size={60} color={selectedTier.color} />
                ) : (
                   <MaterialCommunityIcons name="diamond-stone" size={55} color={selectedTier.color} />
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* حالة التفعيل */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusPill, isActive ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}>
            <Ionicons name={isActive ? "shield-checkmark" : "lock-closed"} size={14} color={isActive ? "#10B981" : "#6B7280"} />
            <Text style={[styles.statusText, { color: isActive ? "#10B981" : "#6B7280" }]}>
              {isActive ? t.active : t.locked}
            </Text>
          </View>
          <Text style={styles.requirementText}>
            {isActive ? `${t.currentPlanInfo} ${selectedTier.label}` : isLocked ? `${t.earnMore.replace('{amount}', deficit.toFixed(0))} ${selectedTier.label}` : `Ready to unlock ${selectedTier.label}`}
          </Text>
        </View>

        {/* شريط السحب للرتب */}
        <View style={styles.selectorWrapper}>
          <FlatList
            ref={flatListRef}
            data={VIP_TIERS}
            keyExtractor={(item) => item.level.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: (width - ITEM_WIDTH) / 2 }}
            renderItem={({ item, index }) => {
              const isSelected = item.level === selectedLevel;
              return (
                <Pressable 
                  style={{ width: ITEM_WIDTH, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => flatListRef.current?.scrollToIndex({ index, animated: true })}
                >
                  <Text style={[
                    styles.selectorText,
                    isSelected && { color: item.color, fontSize: 20, fontWeight: '900', textShadowColor: `${item.color}40`, textShadowRadius: 10 }
                  ]}>
                    VIP {item.level}
                  </Text>
                  {isSelected && (
                    <View style={[styles.activeDot, { backgroundColor: item.color }]} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>

        <View style={styles.dividerContainer}>
          <LinearGradient colors={['transparent', selectedTier.color]} style={styles.dividerLine} start={{x: 0, y: 0}} end={{x: 1, y: 0}} />
          <View style={[styles.dividerCenter, { borderColor: selectedTier.color }]}>
            <View style={[styles.dividerInnerDot, { backgroundColor: selectedTier.color }]} />
          </View>
          <LinearGradient colors={[selectedTier.color, 'transparent']} style={styles.dividerLine} start={{x: 0, y: 0}} end={{x: 1, y: 0}} />
        </View>

        {/* الكروت السفلية */}
        <View style={[styles.gridContainer, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.gridCard}>
            <View style={[styles.gridCardIconBg, { backgroundColor: `${selectedTier.color}15` }]}>
              <Ionicons name="wallet" size={22} color={selectedTier.color} />
            </View>
            <Text style={styles.gridCardTitle}>{t.reqBalance}</Text>
            <Text style={styles.gridCardValue}>${selectedTier.entryFee}</Text>
          </View>
          <View style={styles.gridCard}>
            <View style={[styles.gridCardIconBg, { backgroundColor: `${selectedTier.color}15` }]}>
              <Ionicons name="cash" size={22} color={selectedTier.color} />
            </View>
            <Text style={styles.gridCardTitle}>{t.dailyReward}</Text>
            <Text style={styles.gridCardValue}>${selectedTier.dailyPayoutMin}</Text>
          </View>
          <View style={styles.gridCard}>
            <View style={[styles.gridCardIconBg, { backgroundColor: `${selectedTier.color}15` }]}>
              <Ionicons name="analytics" size={22} color={selectedTier.color} />
            </View>
            <Text style={styles.gridCardTitle}>{t.estMonthly}</Text>
            <Text style={styles.gridCardValue}>~${(selectedTier.dailyPayoutMin * 30).toFixed(0)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* الشريط السفلي */}
      <View style={[styles.bottomBar, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.bottomStats, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={styles.bottomStatsLabel}>{t.privilegesAvail}</Text>
          <Text style={styles.bottomStatsValue}>{selectedTier.level} <Text style={{ color: '#9CA3AF', fontSize: 16 }}>/ {VIP_TIERS.length}</Text></Text>
        </View>
        
        <Pressable
          style={({ pressed }) => [
            styles.levelUpBtn,
            { backgroundColor: isActive ? '#F3F4F6' : selectedTier.color },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => handleActivate(selectedTier)}
          disabled={isActive}
        >
          <Text style={[styles.levelUpBtnText, { color: isActive ? '#9CA3AF' : '#FFFFFF' }]}>
            {isActive ? t.currentPlanBtn : t.levelUp}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // خلفية بيضاء نقية وفخمة
  },
  softTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emblemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    height: 180,
  },
  medallionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.2,
  },
  medallionOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  medallionInnerCore: {
    width: '100%',
    height: '100%',
    borderRadius: 68,
    backgroundColor: '#FFFFFF', // قلب أبيض ناصع يعكس الفخامة
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 25,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  requirementText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectorWrapper: {
    marginTop: 45,
    height: 60,
  },
  selectorText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    position: 'absolute',
    bottom: -10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: 15,
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  dividerInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#F9FAFB', // كروت رمادية فاتحة جداً وأنيقة على الخلفية البيضاء
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  gridCardTitle: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  gridCardValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 18,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomStats: {
    flex: 1,
  },
  bottomStatsLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  bottomStatsValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  levelUpBtn: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    marginLeft: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  levelUpBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});