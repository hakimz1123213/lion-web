import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🚀 تم تنظيف الملف من مكتبات الأيقونات الخارجية لمنع المربعات البيضاء نهائياً
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { VIP_TIERS, VIPTier, TASK_TOTAL } from '@/constants/config';
import { sendVIPUpgradeAlert } from '@/services/discord';

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة الـ VIP
const vipTranslations: Record<string, Record<string, string>> = {
  EN: {
    vipPlans: "VIP Plans",
    selectTier: "Select your investment tier",
    processing: "Processing Upgrade...",
    currentPlan: "Current",
    balanceLabel: "Balance",
    investmentTier: "Gold Investment Tier",
    reqBalance: "REQUIRED BALANCE",
    dailyReward: "DAILY REWARD",
    estMonthly: "EST. MONTHLY",
    activeStatus: "ACTIVE",
    currentPlanBtn: "Current Plan",
    accumulateMore: "Accumulate ${amount} more",
    unlockBtn: "Unlock VIP {level}",
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
    vipPlans: "ترقية رتب الـ VIP",
    selectTier: "اختر باقة الاستثمار المناسبة لأهدافك",
    processing: "جاري معالجة الترقية سحابياً...",
    currentPlan: "الرتبة الحالية",
    balanceLabel: "الرصيد",
    investmentTier: "طابق استثماري ذهبي",
    reqBalance: "الرصيد الإجمالي المطلوب",
    dailyReward: "العائد اليومي المقدر",
    estMonthly: "الأرباح الشهرية المقدرة",
    activeStatus: "نشطة حالياً",
    currentPlanBtn: "خطتك الحالية",
    accumulateMore: "احتاج شحن بقيمة ${amount} إضافية",
    unlockBtn: "تفعيل وفتح رتبة VIP {level}",
    planActiveTitle: "الخطة نشطة بالفعل",
    planActiveDesc: "حسابك مفعّل بالفعل على باقة {label} أو رتبة أعلى منها.",
    insufficientTitle: "رصيد غير كافٍ",
    insufficientDesc1: "أنت بحاجة إلى رصيد تراكمي إجمالي بقيمة $",
    insufficientDesc2: "لفتح باقة",
    deficit: "المبلغ المتبقي الشاحن",
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
    successDesc2: "أصبحت نشطة الآن. تم الحفاظ على إجمالي رصيدك كرأس مال محمي بنجاح توب!",
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

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = vipTranslations[lang] || vipTranslations['EN'];

  const handleActivate = async (tier: VIPTier) => {
    if (user.vip_level >= tier.level) {
      showAlert(t.planActiveTitle, t.planActiveDesc.replace('{label}', tier.label));
      return;
    }

    if (user.balance < tier.entryFee) {
      const deficit = (tier.entryFee - user.balance).toFixed(2);
      showAlert(
        t.insufficientTitle,
        `${t.insufficientDesc1}${tier.entryFee} ${t.insufficientDesc2} ${tier.label}.\n\n${t.deficit}: $${deficit}`,
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

              showAlert(
                t.successTitle,
                `${t.successDesc1} ${tier.label} ${t.successDesc2}`,
                [{ text: t.perfect, onPress: () => router.back() }]
              );
            } else {
              showAlert('Error', result.error);
            }
            setIsProcessing(false);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          {/* 🛠️ استبدال مربع زر الإغلاق المكسور بإيموجي صلب */}
          <Text style={{ fontSize: 14, color: '#fff' }}>❌</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>{t.vipPlans}</Text>
          <Text style={styles.subtitle}>{t.selectTier}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Processing Loader */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.processingText}>{t.processing}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        
        {/* ملخص الرصيد الحالي */}
        <View style={[styles.currentBanner, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          {/* 🛠️ استبدال المربع الأبيض داخل بانر الرصيد بإيموجي ماسة */}
          <Text style={{ fontSize: 16 }}>💎</Text>
          <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end' }]}>
            <Text style={styles.bannerMain}>{t.currentPlan}: <Text style={{ color: Colors.gold }}>VIP {user.vip_level}</Text></Text>
            <Text style={styles.bannerSub}>{t.balanceLabel}: <Text style={{ color: Colors.gold }}>${user.balance.toFixed(2)}</Text></Text>
          </View>
        </View>

        {/* كروت الخطط */}
        {VIP_TIERS.map((tier) => {
          const isActive = user.vip_level === tier.level;
          const isLocked = tier.level > user.vip_level && user.balance < tier.entryFee;
          const progress = Math.min(100, (user.balance / tier.entryFee) * 100);

          // تحديد أيقونة الحالة البديلة الثابتة للزر الأسفل
          let btnEmoji = '⚡';
          if (isActive) btnEmoji = '✅';
          else if (isLocked) btnEmoji = '🔒';

          return (
            <View key={tier.level} style={[styles.tierCard, isActive && { borderColor: tier.color, borderWidth: 1.5 }]}>
              
              <View style={[styles.tierHeader, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.tierIcon, { backgroundColor: tier.color + '15' }]}>
                  {/* 🛠️ استبدال المربع المكسور داخل أيقونة الباقة بإيموجي الماسة الذكي المقاوم */}
                  <Text style={{ fontSize: 18 }}>💎</Text>
                </View>
                <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
                  <Text style={styles.tierDesc}>{t.investmentTier}</Text>
                </View>
                {isActive && (
                   <View style={[styles.statusPill, { backgroundColor: tier.color + '22' }]}>
                      <Text style={{ color: tier.color, fontSize: 10, fontWeight: 'bold' }}>{t.activeStatus}</Text>
                   </View>
                )}
              </View>

              {/* شبكة الإحصائيات */}
              <View style={[styles.statsGrid, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t.reqBalance}</Text>
                  <Text style={[styles.statValue, { color: Colors.gold }]}>${tier.entryFee}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t.dailyReward}</Text>
                  <Text style={[styles.statValue, { color: '#2ecc71' }]}>${tier.dailyPayoutMin}–${tier.dailyPayoutMax}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t.estMonthly}</Text>
                  <Text style={styles.statValue}>~${tier.dailyPayoutMin * 30}</Text>
                </View>
              </View>

              {/* شريط التقدم التراكمي */}
              {!isActive && tier.level > user.vip_level && (
                <View style={styles.progressSection}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: isLocked ? '#333' : '#2ecc71' }, lang === 'AR' && { alignSelf: 'flex-end' }]} />
                  </View>
                  <Text style={[styles.progressText, lang === 'AR' && { textAlign: 'left' }]}>${user.balance.toFixed(2)} / ${tier.entryFee}</Text>
                </View>
              )}

              {/* زر التفعيل الذكي */}
              <Pressable
                style={({ pressed }) => [
                  styles.activateBtn,
                  { backgroundColor: isActive ? '#1a1a1a' : isLocked ? 'rgba(255, 77, 77, 0.1)' : tier.color },
                  pressed && { opacity: 0.8 },
                  lang === 'AR' && { flexDirection: 'row-reverse' }
                ]}
                onPress={() => handleActivate(tier)}
                disabled={isActive}
              >
                {/* 🛠️ حقن إيموجي الحالة الصلب بداخل كرت الزر السفلي السفينة المحدثة */}
                <Text style={{ fontSize: 13, marginRight: 2 }}>{btnEmoji}</Text>
                <Text style={[styles.activateBtnText, { color: isActive ? tier.color : isLocked ? "#ff4d4d" : "#000" }]}>
                  {isActive ? t.currentPlanBtn : isLocked ? (lang === 'AR' ? t.accumulateMore.replace('{amount}', (tier.entryFee - user.balance).toFixed(0)) : t.accumulateMore.replace('{amount}', (tier.entryFee - user.balance).toFixed(0))) : t.unlockBtn.replace('{level}', tier.level.toString())}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: 10 },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  processingText: { color: Colors.gold, marginTop: 15, fontWeight: 'bold' },
  currentBanner: { flexDirection: 'row', alignItems: 'center', gap: 15, margin: Spacing.lg, padding: 15, backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(212,175,55,0.1)' },
  bannerMain: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  bannerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  tierCard: { marginHorizontal: Spacing.lg, marginBottom: 20, backgroundColor: '#0a0a0a', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#151515' },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  tierIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tierLabel: { fontSize: 18, fontWeight: 'bold' },
  tierDesc: { color: '#333', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { color: '#333', fontSize: 8, fontWeight: 'bold', marginBottom: 5 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  statDivider: { width: 1, height: 20, backgroundColor: '#151515', alignSelf: 'center' },
  progressSection: { marginBottom: 15 },
  progressTrack: { height: 4, backgroundColor: '#151515', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { textAlign: 'right', color: '#333', fontSize: 9, fontWeight: 'bold', marginTop: 5 },
  activateBtn: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  activateBtnText: { fontWeight: 'bold', fontSize: 14 }
});