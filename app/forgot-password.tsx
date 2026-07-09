import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

// 🌍 قاموس الترجمة الملوكي نتاع حكيم المخصص للاستعادة الحصينة
const forgotTranslations: Record<string, Record<string, string>> = {
  EN: {
    title: "Reset Password",
    subEmail: "Enter your email to receive a secure 6-digit OTP code.",
    subOTP: "Enter the 6-digit security code sent to your email inbox.",
    subNewPass: "Create a new strong password for your master account.",
    emailLabel: "PRIMARY EMAIL",
    otpLabel: "SECURITY CODE (OTP)",
    newPassLabel: "NEW PASSWORD",
    confirmPassLabel: "CONFIRM NEW PASSWORD",
    sendCodeBtn: "SEND VERIFICATION CODE",
    verifyBtn: "VERIFY CODE",
    updateBtn: "UPDATE MASTER PASSWORD",
    backToLogin: "Back to Sign In",
    emailPlaceholder: "your@email.com",
    otpPlaceholder: "000000",
    passPlaceholder: "••••••••",
    missingFields: "Please fill in the required block.",
    invalidOTP: "Code must be exactly 6 digits.",
    weakPass: "Password must be at least 6 characters.",
    mismatch: "Passwords do not match.",
    codeSentTitle: "Security Code Sent",
    codeSentDesc: "A secure 6-digit OTP has been deployed to your email. Check your spam node if not received.",
    successTitle: "Password Changed",
    successDesc: "Your master password has been upgraded successfully. You can now log in securely."
  },
  AR: {
    title: "استعادة كلمة السر",
    subEmail: "أدخل بريدك الإلكتروني لاستلام كود التحقق الرقمي المكون من 6 أرقام.",
    subOTP: "أدخل كود الأمان الرقمي المرسل الآن لعلبة بريدك الوارد.",
    subNewPass: "قم بإنشاء كلمة سر جديدة قوية ومؤمنة لحسابك الرئيسي.",
    emailLabel: "البريد الإلكتروني الأساسي",
    otpLabel: "كود التحقق الرقمي (OTP)",
    newPassLabel: "كلمة السر الجديدة",
    confirmPassLabel: "تأكيد كلمة السر الجديدة",
    sendCodeBtn: "إرسال كود التحقق الفوري",
    verifyBtn: "التحقق من الكود الرقمي",
    updateBtn: "تحديث وتغيير كلمة السر",
    backToLogin: "العودة لصفحة تسجيل الدخول",
    emailPlaceholder: "أدخل بريدك الإلكتروني هنا...",
    otpPlaceholder: "أدخل الـ 6 أرقام هنا...",
    passPlaceholder: "••••••••",
    missingFields: "يرجى ملء الخانات الإجبارية أولاً.",
    invalidOTP: "يجب أن يتكون الكود الرقمي من 6 أرقام بالظبط.",
    weakPass: "يجب أن تتكون كلمة السر من 6 رموز أو أحرف كحد أدنى.",
    mismatch: "كلمتا السر غير متطابقتين، يرجى التدقيق.",
    codeSentTitle: "تم إرسال كود الأمان",
    codeSentDesc: "تم إرسال كود OTP مأمن لبريدك الإلكتروني. تفقد الرسائل غير المرغوب فيها إن لم تجده.",
    successTitle: "تم تغيير كلمة السر",
    successDesc: "تم ترقية وتحديث كلمة السر الرئيسية لحسابك بنجاح. يمكنك الآن تسجيل الدخول ديريكت."
  }
};

export default function ForgotPasswordScreen() {
  const { generateAndSaveOTP, verifyOTPCode, updateForgottenPassword, user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const lang = (user as any)?.language || 'EN';
  const t = forgotTranslations[lang] || forgotTranslations['EN'];

  // ─── المرحلة 1: توليد الكود وإرساله فوراً بنقاء الـ REST API المباشر ──────────────────────
// ─── المرحلة 1: توليد الكود وإرساله عبر السيرفر المحصن (لا مفاتيح هنا!) ──────────────────
  const handleSendOTP = async () => {
    if (!email.trim()) {
      showAlert(t.missingFields, "");
      return;
    }
    setIsLoading(true);
    
    // 1. توليد وحفظ الكود في الداتابيز
    const result = await generateAndSaveOTP(email.trim());
    
    if (result.error === null && result.otpCode) {
      try {
        // 🚀 [الربط الآمن]: استدعاء الدالة السحابية المحصنة
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendSecureEmail = httpsCallable(functions, 'sendSecureEmail');

        // السيرفر هو اللي يملك المفاتيح، التطبيق يبعث البيانات فقط
        await sendSecureEmail({
          to_name: "User", 
          to_email: email.trim(),
          otp_code: result.otpCode,
          template_id: 'template_fr26ah9' // القالب الآمن
        });

        showAlert(t.codeSentTitle, t.codeSentDesc);
        setCurrentStep(2); // الانتقال للخطوة التالية

      } catch (err: any) {
        console.error("[Secure Node Refused]:", err);
        showAlert('Security Error', "Secure node handshake rejected. Please retry.");
      }
    } else {
      showAlert('Error', result.error || 'Failed to generate security token.');
    }
    setIsLoading(false);
  };
  const handleVerifyCode = async () => {
    if (!otp.trim()) {
      showAlert(t.missingFields, "");
      return;
    }
    if (otp.trim().length !== 6) {
      showAlert(t.invalidOTP, "");
      return;
    }
    setIsLoading(true);
    const result = await verifyOTPCode(email.trim(), otp.trim());
    if (result.isValid) {
      setCurrentStep(3); 
    } else {
      showAlert('Verification Failed', result.error || 'Invalid Code');
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      showAlert(t.missingFields, "");
      return;
    }
    if (newPassword.trim().length < 6) {
      showAlert(t.weakPass, "");
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      showAlert(t.mismatch, "");
      return;
    }

    setIsLoading(true);
    const resetResult = await updateForgottenPassword(email.trim(), newPassword.trim());
    
    if (resetResult.error === null) {
      showAlert(t.successTitle, t.successDesc, [
        { text: "SIGN IN NOW", onPress: () => router.replace('/login') }
      ]);
    } else {
      showAlert("Security Refused", resetResult.error);
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name={lang === 'AR' ? "arrow-forward-ios" : "arrow-back-ios"} size={18} color={Colors.gold} />
          </Pressable>
          <Text style={styles.title}>{t.title}</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          <Text style={[styles.subtitle, lang === 'AR' && { textAlign: 'right' }]}>NoirWealth Security Node</Text>
          
          <Text style={[styles.metaDesc, lang === 'AR' && { textAlign: 'right' }]}>
            {currentStep === 1 && t.subEmail}
            {currentStep === 2 && t.subOTP}
            {currentStep === 3 && t.subNewPass}
          </Text>

          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.emailLabel}</Text>
                <TextInput
                  style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor="#333"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <Pressable style={styles.actionBtn} onPress={handleSendOTP} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>{t.sendCodeBtn}</Text>}
              </Pressable>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.otpLabel}</Text>
                <TextInput
                  style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t.otpPlaceholder}
                  placeholderTextColor="#333"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <Pressable style={styles.actionBtn} onPress={handleVerifyCode} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>{t.verifyBtn}</Text>}
              </Pressable>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.newPassLabel}</Text>
                <TextInput
                  style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t.passPlaceholder}
                  placeholderTextColor="#333"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.confirmPassLabel}</Text>
                <TextInput
                  style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t.passPlaceholder}
                  placeholderTextColor="#333"
                  secureTextEntry
                />
              </View>

              <Pressable style={styles.actionBtn} onPress={handleUpdatePassword} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>{t.updateBtn}</Text>}
              </Pressable>
            </View>
          )}

          <Pressable style={styles.backToLoginBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.backToLoginText}>{t.backToLogin}</Text>
          </Pressable>

        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, paddingHorizontal: Spacing.lg },
  form: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  metaDesc: { color: '#666', fontSize: 13, lineHeight: 19, marginTop: 10, fontWeight: '500', marginBottom: 25, paddingHorizontal: 5 },
  stepContainer: { width: '100%', marginTop: 5 },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, letterSpacing: 1.2, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, color: '#fff', borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 50, fontSize: 15 },
  actionBtn: { backgroundColor: Colors.gold, padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: 15 },
  actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  backToLoginBtn: { alignItems: 'center', marginTop: Spacing.xl, paddingVertical: Spacing.sm },
  backToLoginText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500' }
});