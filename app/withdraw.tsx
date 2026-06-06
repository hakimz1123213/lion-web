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
import { useWallet } from '@/hooks/useWallet';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { WITHDRAWAL_MIN, VIP_TIERS } from '@/constants/config'; 
import { sendWithdrawalAlert } from '@/services/discord';

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة السحب لمنع أخطاء الـ TypeScript والمسارات
const withdrawTranslations: Record<string, Record<string, string>> = {
  EN: {
    withdrawFunds: "Withdraw Funds",
    availableWithdraw: "AVAILABLE FOR WITHDRAWAL",
    totalBalance: "Total Balance",
    lockedVip: "Locked VIP",
    usdtNetwork: "USDT BEP20 NETWORK",
    infoText: "Your VIP capital is preserved to keep your daily ad rewards running. You can instantly withdraw any earnings accumulated above this tier.",
    withdrawAmountLabel: "WITHDRAWAL AMOUNT",
    minThreshold: "Minimum threshold",
    walletAddressLabel: "USDT BEP20 WALLET ADDRESS",
    walletPlaceholder: "Starts with T...",
    warningText: "Ensure you target a valid USDT BEP20 address (Starts with T). Delivering funds to a wrong network will cause permanent loss of assets.",
    requestBtn: "REQUEST WITHDRAWAL",
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
    reqSentDesc2: "is pending approval. Funds will reach your wallet within 24 hours.",
    backBtnText: "Back to Wallet",
    unexpectedError: "An unexpected error occurred. Please try again."
  },
  AR: {
    withdrawFunds: "سحب أموال الأرباح",
    availableWithdraw: "الرصيد المتاح للسحب الفوري",
    totalBalance: "إجمالي الرصيد",
    lockedVip: "رأس المال المحجوز لـ VIP",
    usdtNetwork: "شبكة العملة USDT BEP20",
    infoText: "يتم حجز رأس مال رتبة الـ VIP الخاصة بك لضمان استمرار تشغيل الفيديوهات وتدفق الأرباح اليومية. يمكنك سحب أي مبالغ إضافية فوق هذا الطابق فوراً وبدون قيود.",
    withdrawAmountLabel: "حدد مبلغ السحب المراد (USDT)",
    minThreshold: "الحد الأدنى المسموح به للسحب",
    walletAddressLabel: "عنوان محفظتك الرقمية USDT BEP20",
    walletPlaceholder: "أدخل عنوان محفظتك (يبدأ بحرف T)...",
    warningText: "تنبيه أمني صارم: يرجى التأكد من إدخال عنوان محفظة USDT BEP20 صحيح (يبدأ بحرف T). إرسال الأموال لشبكة خاطئة سيتسبب في ضياع أصولك المالية للأبد وعالمياً.",
    requestBtn: "تأكيد وإرسال طلب السحب الآن",
    invalidAmountTitle: "قيمة غير صالحة",
    invalidAmountDesc: "يرجى كتابة مبلغ سحب صحيح وصالح.",
    minLimitTitle: "الحد الأدنى للسحب",
    minLimitDesc: "أقل مبلغ مسموح بسحبه من المنصة هو",
    lockedCapitalTitle: "رأس المال محمي",
    lockedCapitalDesc1: "رأس مال رتبة VIP",
    lockedCapitalDesc2: "الخاص بك محجوز بقيمة",
    lockedCapitalDesc3: "يمكنك فقط سحب صافي أرباح مشاهدة الإعلانات:",
    invalidAddressTitle: "العنوان غير صحيح",
    invalidAddressDesc: "يرجى توفير عنوان محفظة USDT BEP20 صحيح يبدأ بحرف T.",
    reqSentTitle: "تم إرسال الطلب",
    reqSentDesc1: "طلب سحب مبلغ",
    reqSentDesc2: "قيد المراجعة والتدقيق الآن من الإدارة. ستصل الأموال إلى محفظتك في غضون 24 ساعة كحد أقصى.",
    backBtnText: "العودة للمحفظة",
    unexpectedError: "حدث خطأ غير متوقع في الاتصال بالشبكة. يرجى المحاولة مجدداً."
  }
};

export default function WithdrawScreen() {
  const { user } = useAuth();
  const { requestWithdrawal } = useWallet();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  // 📡 التقاط رادار لغة العميل الحالية من مستند الـ user سحابياً
  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = withdrawTranslations[lang] || withdrawTranslations['EN'];

  // ─── 🛡️ حساب الرصيد المتاح للسحب (الأرباح فقط) ──────────────────
  const currentTier = VIP_TIERS.find(t => t.level === user.vip_level);
  const lockedCapital = currentTier ? currentTier.entryFee : 0; 
  const maxWithdrawable = Math.max(0, user.balance - lockedCapital);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    
    if (isNaN(parsed) || parsed <= 0) {
      showAlert(t.invalidAmountTitle, t.invalidAmountDesc);
      return;
    }
    if (parsed < WITHDRAWAL_MIN) {
      showAlert(t.minLimitTitle, `${t.minLimitDesc} $${WITHDRAWAL_MIN.toFixed(2)} USDT.`);
      return;
    }
    if (parsed > maxWithdrawable) {
      showAlert(
        t.lockedCapitalTitle, 
        `${t.lockedCapitalDesc1} ${user.vip_level} ${t.lockedCapitalDesc2} $${lockedCapital.toFixed(2)}.\n\n${t.lockedCapitalDesc3} $${maxWithdrawable.toFixed(2)}.`
      );
      return;
    }
    if (!walletAddress.trim() || walletAddress.trim().length < 30) {
      showAlert(t.invalidAddressTitle, t.invalidAddressDesc);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await requestWithdrawal(parsed, walletAddress.trim());
      
      if (error) {
        setIsSubmitting(false);
        showAlert('System Error', error);
        return;
      }

      await sendWithdrawalAlert({
        username: user.username,
        amount: parsed,
        address: walletAddress.trim(),
        userId: user.uid,          
        vipLevel: user.vip_level,      
        balance: user.balance - parsed,
        timestamp: Date.now(),
      });

      setIsSubmitting(false);
      showAlert(
        t.reqSentTitle,
        `${t.reqSentDesc1} $${parsed.toFixed(2)} ${t.reqSentDesc2}`,
        [{ text: t.backBtnText, onPress: () => router.back() }]
      );
    } catch (e) {
      setIsSubmitting(false);
      showAlert('Error', t.unexpectedError);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        
        {/* Header الفخم المعدل اتجاهياً */}
        <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name={lang === 'AR' ? "arrow-forward" : "arrow-back"} size={22} color={Colors.gold} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.withdrawFunds}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* كارت الرصيد الجديد المطور بستايل لوكشري زجاجي */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t.availableWithdraw}</Text>
            <Text style={styles.balanceAmount}>${maxWithdrawable.toFixed(2)}</Text>
            
            <View style={styles.dividerRow} />
            
            <View style={[styles.detailsRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t.totalBalance}</Text>
                <Text style={styles.detailValue}>${user.balance.toFixed(2)}</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t.lockedVip} {user.vip_level}</Text>
                <Text style={[styles.detailValue, { color: '#ff4d4d' }]}>${lockedCapital.toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.usdtBadge}>
              <Text style={styles.usdtText}>{t.usdtNetwork}</Text>
            </View>
          </View>

          {/* صندوق المعلومات السريع المتناسق اتجاهياً */}
          <View style={[styles.infoBox, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <MaterialIcons name="info-outline" size={18} color={Colors.gold} />
            <Text style={[styles.infoText, lang === 'AR' && { textAlign: 'right' }]}>
              {t.infoText}
            </Text>
          </View>

          {/* خانة إدخال المبلغ الفخمة */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.withdrawAmountLabel}</Text>
            <View style={[styles.amountInputRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.inputWrapper, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={[styles.amountInput, lang === 'AR' && { textAlign: 'right' }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#222"
                />
              </View>
              <Pressable 
                style={({ pressed }) => [styles.maxBtn, pressed && { opacity: 0.7 }]} 
                onPress={() => setAmount(maxWithdrawable.toString())}
              >
                <Text style={styles.maxBtnText}>MAX</Text>
              </Pressable>
            </View>
            <Text style={[styles.limitText, lang === 'AR' && { textAlign: 'right', marginRight: 2 }]}>
              {t.minThreshold}: ${WITHDRAWAL_MIN} USDT
            </Text>
          </View>

          {/* خانة عنوان المحفظة الفخمة */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.walletAddressLabel}</Text>
            <View style={[styles.addressBox, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color={Colors.gold} style={lang === 'AR' ? { marginRight: 5 } : { marginLeft: 5 }} />
              <TextInput
                style={[styles.addressInput, lang === 'AR' && { textAlign: 'right' }]}
                value={walletAddress}
                onChangeText={setWalletAddress}
                placeholder={t.walletPlaceholder}
                placeholderTextColor="#333"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* كارت التحذير الملكي لشبكة السحب منعا لضياع الأموال */}
          <View style={[styles.warningCard, lang === 'AR' && { flexDirection: 'row-reverse', borderLeftWidth: 0, borderRightWidth: 3, borderRightColor: Colors.gold }]}>
            <MaterialIcons name="report-problem" size={20} color="#e5c07b" />
            <Text style={[styles.warningText, lang === 'AR' && { textAlign: 'right' }]}>
              {t.warningText}
            </Text>
          </View>

          {/* زر السحب الأسطوري المطور بتصميم فخم ومستقر */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: (pressed || isSubmitting) ? 0.85 : 1 },
              lang === 'AR' && { flexDirection: 'row-reverse' }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons name="lock-open" size={18} color="#000" />
                <Text style={styles.submitBtnText}>{t.requestBtn}</Text>
              </>
            )}
          </Pressable>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#151515' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  
  balanceCard: { backgroundColor: '#060606', padding: 25, borderRadius: Radius.xl, alignItems: 'center', borderWidth: 1, borderColor: '#121212', marginBottom: 20 },
  balanceLabel: { color: '#333', fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.5, marginBottom: 8 },
  balanceAmount: { color: Colors.gold, fontSize: 40, fontWeight: FontWeight.bold },
  
  dividerRow: { width: '100%', height: 1, backgroundColor: '#101010', marginVertical: 18 },
  detailsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  detailItem: { alignItems: 'center' },
  detailLabel: { color: '#444', fontSize: 9, fontWeight: FontWeight.semibold, marginBottom: 4 },
  detailValue: { color: '#fff', fontSize: 14, fontWeight: FontWeight.bold },
  verticalDivider: { width: 1, height: 25, backgroundColor: '#101010' },

  usdtBadge: { marginTop: 18, backgroundColor: 'rgba(212, 175, 55, 0.05)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.1)' },
  usdtText: { color: Colors.gold, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.8 },

  infoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#040404', padding: 16, borderRadius: Radius.md, marginBottom: 25, borderWidth: 1, borderColor: '#0c0c0c', alignItems: 'center' },
  infoText: { color: '#555', fontSize: 11, flex: 1, lineHeight: 17 },

  inputContainer: { marginBottom: 22 },
  inputLabel: { color: '#444', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8, marginBottom: 10 },
  amountInputRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', borderRadius: Radius.md, borderWidth: 1, borderColor: '#121212', paddingHorizontal: 15 },
  currencyPrefix: { color: '#333', fontSize: 20, fontWeight: FontWeight.bold, marginRight: 5 },
  amountInput: { flex: 1, color: '#fff', fontSize: 22, paddingVertical: 12, fontWeight: FontWeight.bold },
  maxBtn: { backgroundColor: 'rgba(212, 175, 55, 0.08)', paddingHorizontal: 18, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.15)' },
  maxBtnText: { color: Colors.gold, fontWeight: FontWeight.bold, fontSize: 12 },
  limitText: { color: '#222', fontSize: 9, marginTop: 6, fontWeight: FontWeight.medium, marginLeft: 2 },

  addressBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#050505', borderRadius: Radius.md, borderWidth: 1, borderColor: '#121212', paddingHorizontal: 15, paddingVertical: 5 },
  addressInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },

  warningCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(229, 192, 123, 0.02)', padding: 15, borderRadius: Radius.md, borderLeftWidth: 3, borderLeftColor: Colors.gold },
  warningText: { color: '#666', fontSize: 11, flex: 1, lineHeight: 18 },

  submitBtn: { backgroundColor: Colors.gold, height: 54, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 25, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  submitBtnText: { color: '#000', fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 0.5 },
});