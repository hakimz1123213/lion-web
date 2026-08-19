import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  Animated,
  Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks & Config
import { useAuth } from '../../hooks/useAuth';
import { useTask } from '../../hooks/useTask';
import { TASK_TOTAL, getVIPTier } from '../../constants/config';

import VideoAdModal from '../components/VideoAdModal';

const { width } = Dimensions.get('window');

// 🎨 ثيم الـ FinTech الفاخر (Purple & Slate)
const THEME = {
  bg: '#F8FAFC', // خلفية فاتحة جداً مريحة (Slate-50)
  surface: '#FFFFFF', // أبيض نقي للكروت
  primary: '#7C3AED', // بنفسجي ملكي عصري
  primaryDark: '#5B21B6', // بنفسجي داكن للتدرجات
  primaryLight: '#EDE9FE', // بنفسجي فاتح جداً للوهج
  textMain: '#0F172A', // Slate-900 (احترافي أكثر من الأسود)
  textSecondary: '#64748B', // Slate-500
  iconBg: '#F1F5F9', // خلفية الأيقونات
  success: '#10B981', 
};

// 🌍 قاموس التعريب
const taskTranslations: Record<string, Record<string, string>> = {
  EN: {
    dailyTasks: "Daily Tasks",
    premiumZone: "PREMIUM ZONE",
    upgradeToUnlock: "Upgrade to VIP to unlock daily earning tasks.",
    upgradeBtn: "UPGRADE TO UNLOCK",
    nextRefresh: "Next Refresh In",
    ads: "ADS",
    todaysReward: "Today's Reward",
    watchAd: "Watch Ad",
    comeBackTomorrow: "Tasks Completed",
    howItWorks: "How It Works",
    rule1: "Watch 10 short ads (15s each)",
    rule2: "Earn $X credited to your balance",
    rule3: "Resets daily at 00:00 UTC",
    rule4: "Upgrade VIP to increase daily earnings",
    loading: "Loading tasks node..."
  },
  AR: {
    dailyTasks: "المهام اليومية",
    premiumZone: "المنطقة الممتازة 🔒",
    upgradeToUnlock: "قم بترقية حسابك إلى رتبة VIP لفتح المهام وبدء جني الأرباح.",
    upgradeBtn: "الترقية والفتح فوراً",
    nextRefresh: "تحديث المهام القادم خلال",
    ads: "إعلانات",
    todaysReward: "مكافأة اليوم",
    watchAd: "شاهد الإعلان",
    comeBackTomorrow: "تم إنجاز المهام",
    howItWorks: "آلية العمل",
    rule1: "شاهد 10 إعلانات قصيرة (15 ثانية لكل منها)",
    rule2: "اكسب $X تضاف مباشرة إلى رصيدك",
    rule3: "يعاد الضبط يومياً الساعة 00:00 UTC",
    rule4: "قم بترقية رتبة VIP لزيادة أرباحك اليومية",
    loading: "جاري الاتصال بالخادم..."
  }
};

const ADS_POOL = [
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/2026_Q1-2026-Paid-Media-Refresh_vid_domain_x_value_ar_row_1920x1080_15s%20-%20GoDaddy%20Arabia%20(1080p%2C%20h264).mp4?alt=media&token=9b8ce310-7308-4802-b77b-67ad71eab7c7",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Look%20at%20that%2C%20you%20found%20it!%20%20Booking.com%20-%20Booking.com%20(1080p%2C%20h264).mp4?alt=media&token=4932838f-84a4-4206-981e-3a02cd4b3f63",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/MLDPOINTS%20%E2%80%93%20GET%20YOUR%20SPOT%20AT%20MLDSPOT.COM%20%20GAMERS%20-%20MLDSPOT%20(1080p%2C%20h264).mp4?alt=media&token=e3133c1d-80d7-487a-8b24-41b6cd19bdb6",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Noodles%20%26%20Co.%20Noodles%E2%80%99%20Biggest%20Fan%20Buys%20an%20NFT%20-%20Ads%20of%20Brands%20(1080p%2C%20h264).mp4?alt=media&token=34c5ee95-6307-41d2-9bd6-ad4993c73ae8",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Oreo%20Commercial%20Product%20Video%20-%20Running%20Television%20(1080p%2C%20h264).mp4?alt=media&token=f9684dc4-9a61-4a36-bd51-6461feb1018c",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Shopify%20makes%20it%20incredibly%20easy%20to%20wake%20up%20and%20do%20what%20you%20love.%20-%20Shopify%20(1080p%2C%20h264).mp4?alt=media&token=a0dbec9d-f6e8-45b3-96e1-e660c983b341",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Stays%20for%20fashionistas%20and%20fisherman%20%20Booking.com%20-%20Booking.com%20(1080p%2C%20h264).mp4?alt=media&token=c826fd2e-9fe0-4c80-8632-172f21c16927",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/Take-off%20on%20the%20race%20track%20as%20the%20Global%20Partner%20of%20F1%20%20Qatar%20Airways%20-%20Qatar%20Airways%20(1080p%2C%20h264).mp4?alt=media&token=5cea7eb6-c950-4d05-a5e2-5ba18a13e125",
  "https://firebasestorage.googleapis.com/v0/b/lion-e7e25.firebasestorage.app/o/We're%20back!%20%20Emirates%20-%20Emirates%20(1080p%2C%20h264).mp4?alt=media&token=b214673c-2874-497a-803f-3a1dc6c53f7d",
  "https://console.firebase.google.com/project/lion-e7e25/database/lion-e7e25-default-rtdb/data?hl=ar&fb_utm_campaign=Cloud-SS-DR-Firebase-FY26-global-gsem-1713590&fb_utm_content=text-ad&fb_utm_medium=cpc&fb_utm_source=google&fb_utm_term=KW_firebase&fb_gclid=CjwKCAjw5NvPBhAoEiwA_2egfhwsZoOSOFmDNGTQkBxnJjCy4oKvQBD2PbyR64AQyx6y-Cl1TlQMvhoC70AQAvD_BwE",
];

export default function TasksScreen() {
  const { user }: any = useAuth();
  const { 
    dailyCounter, tasksDoneToday, watchingIndex, 
    timeRemaining, isLoading, startWatchingVideo, 
    completeVideo, cancelVideo 
  }: any = useTask();
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const lang = user?.language || 'EN';
  const t = taskTranslations[lang] || taskTranslations['EN'];

  const currentTier = getVIPTier ? getVIPTier(user?.vip_level || 0) : null;
  const rewardAmount = currentTier ? currentTier.dailyPayoutMin.toFixed(2) : "0.00";

  const promoPlayer = useVideoPlayer("https://files.x.moe/oskka8.mp4", (p) => {
    p.loop = true;
    if (user?.vip_level === 0) p.play();
  });

  // 🪄 الأنيميشن المتطور
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  
  // أنيميشن القائمة السفلية (Staggered)
  const listItemsAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // حركة الطفو الناعمة للأيقونة العلوية
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // نبض التوهج الخلفي للدائرة
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // دخول الشاشة الرئيسي
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUpAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true })
    ]).start(() => {
      // بعد دخول الشاشة، تظهر عناصر القائمة السفلية بشكل متسلسل
      Animated.stagger(150, 
        listItemsAnims.map(anim => 
          Animated.spring(anim, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true
          })
        )
      ).start();
    });
  }, []);

  if (!user || isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  // 🔒 قفل المنطقة المدفوعة (تصميم VIP)
  if (user.vip_level === 0) {
    return (
      <View style={styles.lockedScreen}>
        <VideoView player={promoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        <LinearGradient 
          colors={['rgba(15,23,42,0.6)', 'rgba(15,23,42,0.95)']} 
          style={StyleSheet.absoluteFillObject} 
        />
        <View style={styles.lockedOverlay}>
          <Animated.View style={[styles.lockIconBox, { transform: [{ translateY: floatAnim }] }]}>
            <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.lockIconGradient}>
              <Ionicons name="lock-closed" size={36} color="#FFF" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.lockedTitle}>{t.premiumZone}</Text>
          <View style={styles.purpleDivider} />
          <Text style={styles.lockedDesc}>{t.upgradeToUnlock}</Text>
          
          <Pressable onPress={() => router.push('/vip-upgrade')}>
            <LinearGradient colors={[THEME.primary, THEME.primaryDark]} style={styles.heroUpgradeBtn} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <Text style={styles.heroUpgradeText}>{t.upgradeBtn}</Text>
              <MaterialIcons name="auto-awesome" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const RuleItem = ({ icon, text, index }: { icon: keyof typeof MaterialIcons.glyphMap, text: string, index: number }) => (
    <Animated.View style={[
      styles.ruleRow, 
      lang === 'AR' && { flexDirection: 'row-reverse' },
      { 
        opacity: listItemsAnims[index], 
        transform: [{ translateY: listItemsAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
      }
    ]}>
      <View style={styles.ruleIconBox}>
        <MaterialIcons name={icon} size={22} color={THEME.primary} />
      </View>
      <View style={styles.ruleDetails}>
        <Text style={[styles.ruleText, lang === 'AR' && { textAlign: 'right' }]}>{text}</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      {/* هالة خلفية ناعمة جداً في الأعلى */}
      <View style={styles.topAmbientGlow} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{t.dailyTasks}</Text>
          </View>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <View style={styles.headerBadge}>
              <FontAwesome5 name="gem" size={18} color={THEME.primary} />
            </View>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          {/* الكارت العلوي */}
          <View style={styles.balanceCard}>
            
            {/* الدائرة المركزية مع توهج 3D */}
            <View style={styles.circleContainer}>
              <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [0.6, 0.2] }) }]} />
              
              <View style={styles.circleOuter}>
                <View style={styles.circleInner}>
                  <Text style={[styles.circleBigNum, tasksDoneToday && { color: THEME.success }]}>
                    {dailyCounter}
                  </Text>
                  <Text style={styles.circleSmallNum}>/ {TASK_TOTAL}</Text>
                  <Text style={styles.circleAdsText}>{t.ads}</Text>
                </View>
              </View>
            </View>

            {/* نقاط الزينة */}
            <View style={styles.paginationDots}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View key={i} style={[
                  styles.dot, 
                  i < dailyCounter && styles.dotActive,
                  tasksDoneToday && styles.dotSuccess
                ]} />
              ))}
            </View>

            {/* قسم المكافأة */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceSubtitle}>{t.todaysReward}</Text>
              <View style={{ flexDirection: lang === 'AR' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.balanceAmountBig}>{rewardAmount}</Text>
              </View>
            </View>
            
            {/* زر المشاهدة (3D Press Effect) */}
            <Pressable 
              style={({ pressed }) => [
                styles.watchBtnWrapper,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
              ]}
              onPress={() => !tasksDoneToday && startWatchingVideo(dailyCounter)}
              disabled={tasksDoneToday}
            >
              <LinearGradient
                colors={tasksDoneToday ? ['#F1F5F9', '#E2E8F0'] : [THEME.primary, THEME.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.watchBtn}
              >
                {tasksDoneToday && <Ionicons name="checkmark-done-circle" size={24} color={THEME.success} style={{ marginRight: 8 }} />}
                <Text style={[styles.watchBtnText, tasksDoneToday && { color: THEME.textSecondary }]}>
                  {tasksDoneToday 
                    ? t.comeBackTomorrow 
                    : `${t.watchAd} ${dailyCounter + 1} / ${TASK_TOTAL}`}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* مؤقت إعادة الضبط */}
            {tasksDoneToday && (
              <View style={styles.timerBadge}>
                <Ionicons name="time" size={16} color={THEME.primary} />
                <Text style={styles.timerText}>{t.nextRefresh}: {timeRemaining}</Text>
              </View>
            )}
          </View>

          {/* الكارت السفلي: القائمة */}
          <View style={styles.transactionsContainer}>
            <View style={[styles.sectionHeader, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.sectionTitle}>{t.howItWorks}</Text>
            </View>
            
            <View style={styles.transactionsCard}>
              <RuleItem index={0} icon="play-arrow" text={t.rule1} />
              <RuleItem index={1} icon="account-balance-wallet" text={t.rule2.replace('$X', rewardAmount)} />
              <RuleItem index={2} icon="update" text={t.rule3} />
              <RuleItem index={3} icon="arrow-upward" text={t.rule4} />
            </View>
          </View>

        </Animated.View>

      </ScrollView>

      {watchingIndex !== null && (
        <VideoAdModal 
          visible={watchingIndex !== null}
          videoUrl={ADS_POOL[watchingIndex % ADS_POOL.length]}
          onComplete={completeVideo}
          onClose={cancelVideo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // الأساسيات
  screen: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingBottom: 50 },
  topAmbientGlow: {
    position: 'absolute',
    top: -100, left: -50, right: -50,
    height: 400,
    backgroundColor: THEME.primaryLight,
    opacity: 0.4,
    borderRadius: 300,
    transform: [{ scaleX: 1.5 }],
  },
  
  // شاشة القفل VIP (Dark & Gold/Purple vibes)
  lockedScreen: { flex: 1, backgroundColor: THEME.textMain },
  lockedOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, zIndex: 10 },
  lockIconBox: { 
    width: 86, height: 86, 
    borderRadius: 43, 
    backgroundColor: '#FFF', 
    alignItems: 'center', justifyContent: 'center', 
    marginBottom: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
  },
  lockIconGradient: {
    width: '100%', height: '100%',
    borderRadius: 43,
    alignItems: 'center', justifyContent: 'center',
  },
  lockedTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 1.5 },
  purpleDivider: { width: 50, height: 5, borderRadius: 2.5, backgroundColor: THEME.primary, marginVertical: 20 },
  lockedDesc: { color: '#CBD5E1', fontSize: 16, textAlign: 'center', lineHeight: 26, marginBottom: 40, fontWeight: '500' },
  heroUpgradeBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 20, paddingHorizontal: 40, 
    borderRadius: 24,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  heroUpgradeText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },

  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 28, 
    marginTop: 20,
    marginBottom: 24 
  },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 30, fontWeight: '900', color: THEME.textMain },
  headerBadge: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: THEME.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(124, 58, 237, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.05)',
  },

  // Main Card
  balanceCard: {
    backgroundColor: THEME.surface,
    marginHorizontal: 20,
    borderRadius: 36,
    padding: 32,
    marginBottom: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 10,
  },
  
  // تصميم الدائرة الخيالي
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 180, height: 180,
    borderRadius: 90,
    backgroundColor: THEME.primary,
    filter: 'blur(15px)', // إذا كان مدعوماً، وإلا فالـ opacity تقوم بالواجب
  },
  circleOuter: {
    width: 156, height: 156,
    borderRadius: 78,
    borderWidth: 7,
    borderColor: THEME.primary,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: THEME.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  circleInner: { alignItems: 'center', justifyContent: 'center', marginTop: -5 },
  circleBigNum: { fontSize: 56, fontWeight: '900', color: THEME.primary, lineHeight: 60, letterSpacing: -2 },
  circleSmallNum: { fontSize: 16, fontWeight: '800', color: THEME.textSecondary, marginBottom: 4 },
  circleAdsText: { fontSize: 11, fontWeight: '800', color: THEME.textSecondary, letterSpacing: 2, textTransform: 'uppercase' },

  // نقاط الزينة
  paginationDots: { flexDirection: 'row', gap: 6, marginTop: 15, marginBottom: 35 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
  dotActive: { backgroundColor: THEME.primary, width: 20 },
  dotSuccess: { backgroundColor: THEME.success },

  // Reward Section
  balanceSection: { alignItems: 'center', marginBottom: 35 },
  balanceSubtitle: { fontSize: 13, color: THEME.textSecondary, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 },
  balanceAmountBig: { fontSize: 62, fontWeight: '900', color: THEME.textMain, letterSpacing: -2, lineHeight: 65 },
  currencySymbol: { fontSize: 32, fontWeight: '800', color: THEME.primary, marginTop: 5, marginRight: 4, marginLeft: 4 },
  
  // Timer Badge
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 20,
    backgroundColor: THEME.primaryLight,
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20,
  },
  timerText: { fontSize: 13, color: THEME.primaryDark, fontWeight: '800' },

  // Watch Button
  watchBtnWrapper: { width: '100%', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  watchBtn: {
    width: '100%',
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  watchBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

  // Rules Section
  transactionsContainer: { paddingHorizontal: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: THEME.textMain },
  
  transactionsCard: {
    backgroundColor: THEME.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: 'rgba(15, 23, 42, 0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ruleIconBox: {
    width: 48, height: 48,
    borderRadius: 16, // شكل مربع بحواف دائرية (Squircle) يبدو أحدث من الدائرة
    backgroundColor: THEME.iconBg,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16, marginLeft: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  ruleDetails: { flex: 1 },
  ruleText: { fontSize: 15, color: THEME.textMain, fontWeight: '700', lineHeight: 22 },
});