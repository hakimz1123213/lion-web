import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { sendTelegramAdminAlert } from '@/services/telegramService'; 
import { useAlert } from '@/template';
import { WITHDRAWAL_MIN, VIP_TIERS } from '@/constants/config'; 
import { sendWithdrawalAlert } from '@/services/discord';

// 🔥 استيراد مكتبات الدوال السحابية للاتصال المباشر بالفانكشن 🔥
import { getFunctions, httpsCallable } from 'firebase/functions';

// 🎨 ألوان الثيم 
const THEME = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  textMain: '#111827',
  textSecondary: '#6B7280',
  primary: '#111827',
  inputBg: '#F3F4F6',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
};

const withdrawTranslations: Record<string, Record<string, string>> = {
  EN: {
    withdrawFunds: "Withdraw Funds",
    availableWithdraw: "Available for withdrawal",
    totalBalance: "Total Balance",
    lockedVip: "LOCKED VIP",
    usdtNetwork: "USDT BEP20 NETWORK",
    infoText: "Your VIP capital is preserved to keep your daily ad rewards running. You can instantly withdraw any earnings accumulated above this tier.",
    withdrawAmountLabel: "WITHDRAWAL AMOUNT",
    minThreshold: "Minimum threshold",
    walletAddressLabel: "USDT BEP20 WALLET ADDRESS",
    walletPlaceholder: "Starts with T...",
    warningText: "Ensure you target a valid USDT BEP20 address. Delivering funds to a wrong network will cause permanent loss of assets.",
    requestBtn: "Request withdraw",
    invalidAmountTitle: "Invalid Amount",
    invalidAmountDesc: "Please enter a valid amount to withdraw.",
    minLimitTitle: "Minimum Limit",
    minLimitDesc: "The minimum withdrawal is",
    lockedCapitalTitle: "Locked Capital",
    lockedCapitalDesc1: "Your locked VIP",
    lockedCapitalDesc2: "capital is",
    lockedCapitalDesc3: "You can only withdraw your ad earnings",
    invalidAddressTitle: "Invalid Address",
    invalidAddressDesc: "Please provide a valid USDT BEP20 address (Starts with T).",
    reqSentTitle: "Request Sent",
    reqSentDesc1: "Your withdrawal of",
    reqSentDesc2: "is pending approval.",
    backBtnText: "Back",
    unexpectedError: "An unexpected error occurred. Please try again."
  },
  AR: {
    withdrawFunds: "سحب الأرباح",
    availableWithdraw: "الرصيد المتاح للسحب",
    totalBalance: "إجمالي الرصيد",
    lockedVip: "رأس المال المحجوز",
    usdtNetwork: "شبكة العملة",
    infoText: "يتم حجز رأس مال رتبة الـ VIP لضمان استمرار الأرباح. يمكنك سحب أي مبالغ إضافية فوق هذا الطابق فوراً.",
    withdrawAmountLabel: "مبلغ السحب (USDT)",
    minThreshold: "الحد الأدنى للسحب",
    walletAddressLabel: "عنوان محفظتك USDT BEP20",
    walletPlaceholder: "أدخل عنوان محفظتك (يبدأ بـ T)...",
    warningText: "تأكد من إدخال عنوان محفظة صحيح. إرسال الأموال لشبكة خاطئة سيتسبب في ضياع أصولك.",
    requestBtn: "تأكيد طلب السحب",
    invalidAmountTitle: "قيمة غير صالحة",
    invalidAmountDesc: "يرجى كتابة مبلغ سحب صحيح.",
    minLimitTitle: "الحد الأدنى",
    minLimitDesc: "أقل مبلغ مسموح بسحبه هو",
    lockedCapitalTitle: "رأس المال محمي",
    lockedCapitalDesc1: "رأس مال رتبة VIP",
    lockedCapitalDesc2: "محجوز بقيمة",
    lockedCapitalDesc3: "يمكنك فقط سحب صافي أرباحك:",
    invalidAddressTitle: "العنوان غير صحيح",
    invalidAddressDesc: "يرجى توفير عنوان محفظة صحيح يبدأ بحرف T.",
    reqSentTitle: "تم إرسال الطلب",
    reqSentDesc1: "طلب سحب",
    reqSentDesc2: "قيد المراجعة.",
    backBtnText: "رجوع",
    unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مجدداً."
  }
};

export default function WithdrawScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  if (!user) return null;

  const lang = (user as any)?.language || 'EN';
  const t = withdrawTranslations[lang] || withdrawTranslations['EN'];

  const currentTier = VIP_TIERS.find(tier => tier.level === user.vip_level);
  const lockedCapital = currentTier ? currentTier.entryFee : 0; 
  const maxWithdrawable = Math.max(0, user.balance - lockedCapital);

  const [mainMaxAmt, decimalMaxAmt] = maxWithdrawable.toFixed(2).split('.');

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    
    if (isNaN(parsed) || parsed <= 0) {
      showAlert(t.invalidAmountTitle, t.invalidAmountDesc); return;
    }
    if (parsed < WITHDRAWAL_MIN) {
      showAlert(t.minLimitTitle, `${t.minLimitDesc} $${WITHDRAWAL_MIN.toFixed(2)} USDT.`); return;
    }
    if (parsed > maxWithdrawable) {
      showAlert(t.lockedCapitalTitle, `${t.lockedCapitalDesc1} ${user.vip_level} ${t.lockedCapitalDesc2} $${lockedCapital.toFixed(2)}.\n\n${t.lockedCapitalDesc3} $${maxWithdrawable.toFixed(2)}.`); return;
    }
    if (!walletAddress.trim() || walletAddress.trim().length < 30) {
      showAlert(t.invalidAddressTitle, t.invalidAddressDesc); return;
    }

    setIsSubmitting(true);
    try {
      const functions = getFunctions();
      const submitWithdrawReq = httpsCallable(functions, 'submitWithdraw');

      await submitWithdrawReq({
        userId: user.uid, 
        amount: parsed,
        walletAddress: walletAddress.trim(),
        username: user.username,
      });

      await sendWithdrawalAlert({
        username: user.username, amount: parsed, address: walletAddress.trim(),
        userId: user.uid, vipLevel: user.vip_level, balance: user.balance - parsed, timestamp: Date.now(),
      });

      sendTelegramAdminAlert(user.username, 'Withdrawal', parsed, `Address: ${walletAddress.trim()}`);

      showAlert(t.reqSentTitle, `${t.reqSentDesc1} $${parsed.toFixed(2)} ${t.reqSentDesc2}`, [{ text: t.backBtnText, onPress: () => router.back() }]);
    } catch (e: any) {
      showAlert('Error', e.message || t.unexpectedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: THEME.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }, { paddingHorizontal: 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name={lang === 'AR' ? "arrow-forward-ios" : "arrow-back-ios"} size={20} color={THEME.textMain} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.withdrawFunds}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* كارت الرصيد */}
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>{t.availableWithdraw}</Text>
            
            <View style={styles.customAmountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <Text style={styles.amountText}>{mainMaxAmt}</Text>
              <Text style={styles.decimalText}>.{decimalMaxAmt}</Text>
            </View>

            <Text style={styles.totalEarnedHint}>
              <Text style={styles.greenText}>${user.balance.toFixed(2)} </Text>
              • {t.totalBalance}
            </Text>

            {/* 🔥 زر السحب داخل الكارت مطابق للصورة الثانية image_10679e.png 🔥 */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (pressed || isSubmitting) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>{t.requestBtn}</Text>
              )}
            </Pressable>

            {/* الصندوق الرمادي السفلي */}
            <View style={[styles.grayStatsBox, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={styles.statSide}>
                <Text style={styles.statLabel}>{t.lockedVip} {user.vip_level}</Text>
                <Text style={styles.statValue}>${lockedCapital.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statSide}>
                <Text style={styles.statLabel}>{t.usdtNetwork}</Text>
                <Text style={styles.statValue}>BEP20</Text>
              </View>
            </View>
          </View>

          {/* معلومات هامة */}
          <View style={[styles.depositRowCard, lang === 'AR' && { flexDirection: 'row-reverse' }, { marginBottom: 16 }]}>
            <MaterialIcons name="info" size={24} color={THEME.textSecondary} style={{ marginHorizontal: 8 }} />
            <Text style={[styles.depositSubtitleText, { flex: 1 }, lang === 'AR' && { textAlign: 'right' }]}>
              {t.infoText}
            </Text>
          </View>

          {/* حقل إدخال مبلغ السحب */}
          <Text style={[styles.sectionTitle, lang === 'AR' && { textAlign: 'right' }, { marginTop: 10 }]}>
            {t.withdrawAmountLabel}
          </Text>
          <View style={[styles.inputWrapper, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={[styles.inputText, lang === 'AR' && { textAlign: 'right' }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={THEME.textSecondary}
            />
            <Pressable 
              style={styles.maxBtn} 
              onPress={() => setAmount(maxWithdrawable.toString())}
            >
              <Text style={styles.maxBtnText}>MAX</Text>
            </Pressable>
          </View>
          <Text style={[styles.limitText, lang === 'AR' && { textAlign: 'right' }]}>
            {t.minThreshold}: ${WITHDRAWAL_MIN} USDT
          </Text>

          {/* حقل إدخال عنوان المحفظة */}
          <Text style={[styles.sectionTitle, lang === 'AR' && { textAlign: 'right' }, { marginTop: 24 }]}>
            {t.walletAddressLabel}
          </Text>
          <View style={[styles.addressBox, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <MaterialIcons name="account-balance-wallet" size={20} color={THEME.textSecondary} style={{ marginHorizontal: 6 }} />
            <TextInput
              style={[styles.inputText, lang === 'AR' && { textAlign: 'right' }, { fontSize: 13, flex: 1 }]}
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder={t.walletPlaceholder}
              placeholderTextColor={THEME.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* تنبيه أمني */}
          <View style={[styles.warningRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <MaterialIcons name="error-outline" size={16} color={THEME.warning} />
            <Text style={[styles.warningText, lang === 'AR' && { textAlign: 'right' }]}>
              {t.warningText}
            </Text>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 10 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.textMain },
  backBtn: { padding: 4 },

  customAmountRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 8 },
  currencySymbol: { fontSize: 22, fontWeight: '800', color: THEME.textMain, marginTop: 6, marginRight: 2 },
  amountText: { fontSize: 48, fontWeight: '900', color: THEME.textMain, letterSpacing: -1 },
  decimalText: { fontSize: 24, fontWeight: '800', color: THEME.textMain, marginTop: 22 },
  
  cardSubtitle: { color: THEME.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  totalEarnedHint: { fontSize: 13, color: THEME.textSecondary, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  greenText: { color: THEME.success, fontWeight: '700' },
  
  // 🔥 تعديلات زر السحب الجديد بناءً على الصورة الثانية 🔥
  submitBtn: { 
    backgroundColor: THEME.primary, 
    height: 52, // ارتفاع مناسب
    borderRadius: 26, // شكل بيضاوي (Pill-shape) كما في الصورة
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, // مسافة أسفل الزر قبل الصندوق الرمادي
    shadowColor: THEME.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 4 
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  grayStatsBox: { flexDirection: 'row', backgroundColor: THEME.inputBg, borderRadius: 16, width: '100%', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  statSide: { flex: 1, alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 9, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: THEME.textMain, fontSize: 15, fontWeight: '800' },
  statDivider: { width: 1, height: 35, backgroundColor: THEME.border },

  depositRowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.inputBg, borderRadius: 16, padding: 12 },
  depositSubtitleText: { fontSize: 13, color: THEME.textSecondary, marginTop: 2, lineHeight: 20 },

  card: { backgroundColor: THEME.surface, borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: THEME.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  addressBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.inputBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: THEME.border },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.inputBg, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 16 },
  inputPrefix: { color: THEME.textSecondary, fontSize: 20, fontWeight: '800', marginRight: 8 },
  inputText: { flex: 1, color: THEME.textMain, fontSize: 18, paddingVertical: 14, fontWeight: '700' },
  maxBtn: { backgroundColor: THEME.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: THEME.border, marginLeft: 10 },
  maxBtnText: { color: THEME.textMain, fontWeight: '700', fontSize: 11 },
  limitText: { color: THEME.textSecondary, fontSize: 11, marginTop: 8, fontWeight: '500', paddingHorizontal: 4 },

  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  warningText: { flex: 1, fontSize: 12, color: THEME.warning, fontWeight: '600', lineHeight: 18 },
});