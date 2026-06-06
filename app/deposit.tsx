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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard'; 
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { VIP_TIERS, ADMIN_USDT_ADDRESS } from '@/constants/config';
import { sendDepositAlert } from '@/services/discord';

// أدوات التوثيق والحظر الزمني من الفايربيز
import { db } from '@/services/firebaseConfig';
import { ref, update, get, set, push } from 'firebase/database';

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة الإيداع
const depositTranslations: Record<string, Record<string, string>> = {
  EN: {
    depositFunds: "Deposit Funds",
    step1: "Send USDT (BEP20) to the address below from your Binance app",
    step2: "Enter the exact USD amount you transferred below",
    step3: "Upload your payment screenshot as proof and submit",
    walletLabel: "USDT BEP20 WALLET ADDRESS",
    networkText: "BSC (BEP20) Network",
    qrHint: "Scan with Binance App",
    copyBtn: "Copy",
    copiedBtn: "Copied!",
    warningText: "Send BEP20 only. Other networks will result in loss of funds.",
    amountLabel: "AMOUNT SENT (USDT)",
    quickSelectLabel: "QUICK SELECT — VIP ENTRY FEE",
    proofLabel: "PROOF OF PAYMENT (REQUIRED SCREENSHOT)",
    removeBtn: "Remove",
    proofReady: "Screenshot ready",
    uploadTitle: "Upload Transfer Screenshot",
    uploadSubtitle: "Must show transaction amount and correct platform wallet deployment address",
    gallery: "Gallery",
    camera: "Camera",
    submitBtn: "SUBMIT DEPOSIT QUERY",
    footerNote: "Your request will be checked and cleared manually within 24 hours. Rate limited to a maximum of 3 transaction submissions per day node.",
    invalidAmountTitle: "Invalid Amount",
    invalidAmountDesc: "Please enter the exact USDT amount you sent.",
    proofRequiredTitle: "Proof Required",
    proofRequiredDesc: "Please upload a screenshot of your Binance transfer before submitting.",
    antiSpamTitle: "Anti-Spam Shield",
    antiSpamDesc1: "Security lock active. You have reached your maximum limit of 3 deposit requests per day. Please clear your pending queue or retry in",
    antiSpamDesc2: "hours.",
    successTitle: "Deposit Submitted",
    successDesc: "Your deposit query has been secured. Admin operators will inspect your transfer screenshot to approve liquid funds shortly.",
    permissionRequired: "Permission Required",
    galleryPermissionDesc: "Please allow access to your photo library to upload proof of payment.",
    cameraPermissionDesc: "Please allow camera access to capture proof of payment."
  },
  AR: {
    depositFunds: "شحن رصيد الحساب",
    step1: "قم بإرسال عملة USDT (شبكة BEP20) إلى العنوان أدناه من تطبيق بايننس الخاص بك",
    step2: "أدخل قيمة مبلغ الـ USDT الدقيق اللّي قمت بتحويله لأسفل الشاشة",
    step3: "قم برفع لقطة شاشة (Screenshot) لعملية التحويل كإثبات واضغط إرسال",
    walletLabel: "عنوان محفظة شحن المنصة (USDT BEP20)",
    networkText: "شبكة BSC (BEP20) الذكية",
    qrHint: "امسح الكود عبر تطبيق بايننس ديريكت",
    copyBtn: "نسخ الكود",
    copiedBtn: "تم النسخ!",
    warningText: "تنبيه: أرسل عملاتك عبر شبكة BEP20 فقط. استخدام شبكات أخرى سيؤدي لضياع أموالك للأبد.",
    amountLabel: "مبلغ الـ USDT المحوّل",
    quickSelectLabel: "ملء تلقائي سريع — رسوم رتب الـ VIP",
    proofLabel: "إثبات الدفع والتحويل (لقطة شاشة إجبارية)",
    removeBtn: "حذف الصورة",
    proofReady: "الصورة جاهزة للإرسال",
    uploadTitle: "ارفع لقطة شاشة وصل التحويل",
    uploadSubtitle: "يجب أن يظهر في الوصل قيمة المبلغ المرسل وعنوان محفظة المستلم بوضوح",
    gallery: "المعرض",
    camera: "الكاميرا",
    submitBtn: "تأكيد وإرسال طلب الشحن للإدارة",
    footerNote: "سيتم فحص طلبك ومراجعته يدوياً من الإدارة والموافقة عليه في غضون 24 ساعة. نظام مكافحة السبام يسمح بـ 3 طلبات كحد أقصى يومياً لكل حساب.",
    invalidAmountTitle: "قيمة غير صالحة",
    invalidAmountDesc: "يرجى إدخال مبلغ USDT دقيق وصحيح.",
    proofRequiredTitle: "الإثبات مطلوب",
    proofRequiredDesc: "يرجى رفع صورة وصل التحويل من تطبيق بايننس قبل الضغط على تأكيد.",
    antiSpamTitle: "حارس مكافحة السبام",
    antiSpamDesc1: "قفل أمني نشط: لقد وصلت للحد الأقصى المسموح به وهو 3 طلبات إيداع في اليوم. يرجى انتظار معالجة طلباتك السابقة أو المحاولة مجدداً بعد",
    antiSpamDesc2: "ساعة.",
    successTitle: "تم إرسال الطلب بنجاح",
    successDesc: "تم تسجيل وتأمين طلب الشحن الخاص بك بنجاح. سيقوم مديرو المنصة بمراجعة الوصل وضخ الرصيد في محفظتك لايف.",
    permissionRequired: "الإذن مطلوب",
    galleryPermissionDesc: "يرجى السماح بالوصول إلى مكتبة الصور لرفع إثبات الدفع.",
    cameraPermissionDesc: "يرجى السماح بالوصول إلى الكاميرا لالتقاط صورة إثبات الدفع."
  }
};

export default function DepositScreen() {
  const { user } = useAuth();
  const { requestDeposit } = useWallet();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = depositTranslations[lang] || depositTranslations['EN'];

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t.permissionRequired, t.galleryPermissionDesc);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleCameraCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t.permissionRequired, t.cameraPermissionDesc);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      showAlert(t.invalidAmountTitle, t.invalidAmountDesc);
      return;
    }
    
    if (!proofUri) {
      showAlert(t.proofRequiredTitle, t.proofRequiredDesc);
      return;
    }

    try {
      setIsSubmitting(true);
      const currentTime = Date.now();

      const depositHistoryRef = ref(db, `users/${user.uid}/depositRequestsHistory`);
      const historySnap = await get(depositHistoryRef);
      
      let timestampsList: number[] = [];
      if (historySnap.exists()) {
        const rawData = historySnap.val();
        timestampsList = Array.isArray(rawData) ? rawData : Object.values(rawData);
      }

      const activeRequestsInLast24h = timestampsList.filter(
        (ts) => (currentTime - ts) / (1000 * 60 * 60) < 24
      );

      if (activeRequestsInLast24h.length >= 3) {
        const oldestRequestTime = Math.min(...activeRequestsInLast24h);
        const hoursPassedSinceOldest = (currentTime - oldestRequestTime) / (1000 * 60 * 60);
        const remainingHours = Math.ceil(24 - hoursPassedSinceOldest);

        showAlert(
          t.antiSpamTitle, 
          `${t.antiSpamDesc1} ${remainingHours} ${t.antiSpamDesc2}`
        );
        setIsSubmitting(false);
        return;
      }

      const txsRef = push(ref(db, 'transactions')); 
      const txIdKey = txsRef.key || currentTime.toString();

      await set(txsRef, {
        id: txIdKey,
        userId: user.uid,
        username: user.username,
        type: 'Deposit',
        amount: parsed,
        txid: 'Verification via Screenshot URI', 
        proofImageUri: proofUri,
        status: 'Pending',
        note: `User initiated a deposit query of $${parsed} USDT`,
        createdAt: currentTime,
      });

      await sendDepositAlert({
        username: user.username,
        userId: user.uid,
        amount: parsed,
        txid: 'Screenshot Provided 📸',
        proofImageUri: proofUri,
        timestamp: currentTime,
      });

      activeRequestsInLast24h.push(currentTime);
      await set(ref(db, `users/${user.uid}/depositRequestsHistory`), activeRequestsInLast24h);

      showAlert(
        t.successTitle,
        t.successDesc,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      showAlert('Network Refused', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        
        {/* Header */}
        <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            {/* 🛠️ استبدال سهم الرجوع المكسور بإيموجي نصي سهمي ثابت ومتناسق */}
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
              {lang === 'AR' ? '◀' : '▶'}
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t.depositFunds}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl, paddingHorizontal: Spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <View style={styles.instructionCard}>
            <View style={[styles.instructionStep, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              {/* 🛠️ استبدال أرقام الخطوات بدوائر نصية نظيفة */}
              <View style={[styles.stepNum, { backgroundColor: Colors.info + '22', borderColor: Colors.info }]}>
                <Text style={[styles.stepNumText, { color: Colors.info }]}>1</Text>
              </View>
              <Text style={[styles.stepText, lang === 'AR' && { textAlign: 'right' }]}>{t.step1}</Text>
            </View>
            <View style={[GlobalStyles.divider, { marginVertical: Spacing.sm }]} />
            <View style={[styles.instructionStep, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.stepNum, { backgroundColor: Colors.gold + '22', borderColor: Colors.gold }]}>
                <Text style={[styles.stepNumText, { color: Colors.gold }]}>2</Text>
              </View>
              <Text style={[styles.stepText, lang === 'AR' && { textAlign: 'right' }]}>{t.step2}</Text>
            </View>
            <View style={[GlobalStyles.divider, { marginVertical: Spacing.sm }]} />
            <View style={[styles.instructionStep, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.stepNum, { backgroundColor: Colors.success + '22', borderColor: Colors.success }]}>
                <Text style={[styles.stepNumText, { color: Colors.success }]}>3</Text>
              </View>
              <Text style={[styles.stepText, lang === 'AR' && { textAlign: 'right' }]}>{t.step3}</Text>
            </View>
          </View>

          {/* Wallet Address */}
          <Text style={[styles.sectionLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.walletLabel}</Text>
          <View style={styles.addressCard}>
            <View style={[styles.networkBadge, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <View style={styles.networkDot} />
              <Text style={styles.networkText}>{t.networkText}</Text>
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <Image 
                  source={require('../assets/images/qr-code.png')} 
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.qrHint}>{t.qrHint}</Text>
            </View>

            <View style={[styles.addressBox, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.addressText} selectable numberOfLines={1}>
                {ADMIN_USDT_ADDRESS}
              </Text>
              
              <Pressable
                style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.7 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
                onPress={async () => {
                  try {
                    await Clipboard.setStringAsync(ADMIN_USDT_ADDRESS);
                    setAddressCopied(true);
                    showAlert(lang === 'AR' ? 'تم النسخ!' : 'Copied!', lang === 'AR' ? 'تم نسخ عنوان المحفظة بنجاح.' : 'USDT BEP20 Address copied to clipboard.');
                    setTimeout(() => setAddressCopied(false), 2000);
                  } catch (err) {
                    console.error("Failed to copy text: ", err);
                  }
                }}
              >
                {/* 🛠️ استبدال مربع أيقونة النسخ بإيموجي ورقتي النسخ و علامة صح نصية */}
                <Text style={{ fontSize: 13, marginRight: 2 }}>{addressCopied ? '✅' : '📋'}</Text>
                <Text style={[styles.copyText, { color: addressCopied ? Colors.success : Colors.gold }]}>
                  {addressCopied ? t.copiedBtn : t.copyBtn}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.warningRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              {/* 🛠️ استبدال أيقونة التحذير المكسورة بإيموجي تنبيه نصي صلب */}
              <Text style={{ fontSize: 12 }}>⚠️</Text>
              <Text style={[styles.warningText, lang === 'AR' && { textAlign: 'right' }]}>{t.warningText}</Text>
            </View>
          </View>

          {/* Amount Input */}
          <Text style={[styles.sectionLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.amountLabel}</Text>
          <TextInput
            style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textMuted}
            placeholder="0.00"
          />

          {/* VIP Quick Fill */}
          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }, lang === 'AR' && { textAlign: 'right' }]}>{t.quickSelectLabel}</Text>
          <View style={[styles.quickGrid, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            {VIP_TIERS.map((tier) => (
              <Pressable
                key={tier.level}
                style={({ pressed }) => [
                  styles.quickBtn,
                  { borderColor: tier.color, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => setAmount(tier.entryFee.toString())}
              >
                <Text style={[styles.quickBtnLabel, { color: tier.color }]}>{tier.label}</Text>
                <Text style={styles.quickBtnAmount}>${tier.entryFee}</Text>
              </Pressable>
            ))}
          </View>

          {/* Proof Upload */}
          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }, lang === 'AR' && { textAlign: 'right' }]}>{t.proofLabel}</Text>
          {proofUri ? (
            <View style={styles.proofContainer}>
              <Image
                source={{ uri: proofUri }}
                style={styles.proofImage}
                contentFit="cover"
                transition={200}
              />
              <View style={[styles.proofOverlay, lang === 'AR' && { left: Spacing.sm, right: undefined }]}>
                <Pressable
                  style={({ pressed }) => [styles.removeProofBtn, { opacity: pressed ? 0.7 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
                  onPress={() => setProofUri(null)}
                >
                  <Text style={{ fontSize: 12, color: '#fff' }}>❌</Text>
                  <Text style={styles.removeProofText}>{t.removeBtn}</Text>
                </Pressable>
              </View>
              <View style={[styles.proofSuccessBadge, lang === 'AR' && { right: Spacing.sm, left: undefined, flexDirection: 'row-reverse' }]}>
                <Text style={{ fontSize: 12 }}>✅</Text>
                <Text style={styles.proofSuccessText}>{t.proofReady}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadBox}>
              {/* 🛠️ استبدال حزم أيقونات الوصل، المعرض، والكاميرا المكسورة بإيموجيات نصية مستقرة */}
              <Text style={{ fontSize: 32, marginBottom: 4 }}>📸</Text>
              <Text style={styles.uploadTitle}>{t.uploadTitle}</Text>
              <Text style={styles.uploadSubtitle}>{t.uploadSubtitle}</Text>
              <View style={[styles.uploadActions, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
                  onPress={handlePickImage}
                >
                  <Text style={{ fontSize: 14, marginRight: 2 }}>🖼️</Text>
                  <Text style={styles.uploadBtnText}>{t.gallery}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}
                  onPress={handleCameraCapture}
                >
                  <Text style={{ fontSize: 14, marginRight: 2 }}>📷</Text>
                  <Text style={styles.uploadBtnText}>{t.camera}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              GlobalStyles.primaryButton,
              { marginTop: Spacing.xl, opacity: isSubmitting || !proofUri ? 0.6 : pressed ? 0.85 : 1 },
              lang === 'AR' && { flexDirection: 'row-reverse' }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !proofUri}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.textOnGold} />
            ) : (
              <>
                {/* 🛠️ استبدال مربع أيقونة الإرسال الطائرة بإيموجي صاعقة شحن ملوكية */}
                <Text style={[{ fontSize: 14 }, lang === 'AR' ? { marginLeft: 8 } : { marginRight: 8 }]}>⚡</Text>
                <Text style={GlobalStyles.primaryButtonText}>{t.submitBtn}</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerNote}>{t.footerNote}</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  instructionCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, marginBottom: Spacing.lg },
  instructionStep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, letterSpacing: 1.2, marginBottom: Spacing.sm },
  addressCard: { backgroundColor: Colors.goldSurface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.goldDim, padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center' },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
  networkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  networkText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold, letterSpacing: 0.5 },
  qrContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  qrFrame: { width: 180, height: 180, backgroundColor: '#FFFFFF', borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.goldDim, marginBottom: 8, overflow: 'hidden' },
  qrHint: { fontSize: FontSize.xs, color: Colors.goldDim, fontWeight: FontWeight.medium },
  addressBox: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.goldDim, padding: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  addressText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 18 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.goldSurface, borderWidth: 1, borderColor: Colors.goldDim },
  copyText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warningText: { fontSize: FontSize.xs, color: Colors.warning, flex: 1, lineHeight: 18 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickBtn: { width: '30%', borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.surface },
  quickBtnLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  quickBtnAmount: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.semibold, marginTop: 2 },
  uploadBox: { borderWidth: 1.5, borderColor: Colors.surfaceBorder, borderStyle: 'dashed', borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface },
  uploadTitle: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.semibold, textAlign: 'center' },
  uploadSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  uploadActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.goldDim, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, backgroundColor: Colors.goldSurface },
  uploadBtnText: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: FontWeight.semibold },
  proofContainer: { borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.success + '55', height: 200 },
  proofImage: { width: '100%', height: '100%' },
  proofOverlay: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  removeProofBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background + 'DD', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.surfaceBorder },
  removeProofText: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  proofSuccessBadge: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successSurface + 'EE', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.success },
  proofSuccessText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  footerNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});