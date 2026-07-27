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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

// 🎨 ألوان الهوية المطابقة تماماً لتطبيق NoirWealth
const NOIR_PURPLE = '#2A103C';
const NOIR_GOLD = '#D4AF37';
const LIGHT_BG = '#F0EDF5'; // خلفية فاتحة تبرز البطاقة
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F4F4F8';
const TEXT_DARK = '#1C1524';
const TEXT_MUTED = '#8E8899';

// 🌍 قاموس الترجمة الملوكي
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');

  const t = forgotTranslations[lang];
  const isAR = lang === 'AR';

  const handleSendOTP = async () => {
    if (!email.trim()) {
      showAlert(t.missingFields, "");
      return;
    }
    setIsLoading(true);
    
    const result = await generateAndSaveOTP(email.trim());
    
    if (result.error === null && result.otpCode) {
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendSecureEmail = httpsCallable(functions, 'sendSecureEmail');

        await sendSecureEmail({
          to_name: "User", 
          to_email: email.trim(),
          otp_code: result.otpCode,
          template_id: 'template_fr26ah9'
        });

        showAlert(t.codeSentTitle, t.codeSentDesc);
        setCurrentStep(2);
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: LIGHT_BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 🔝 زر تغيير اللغة وزر الرجوع العلوي */}
        <View style={[styles.topBar, { top: insets.top + 10 }, isAR && { flexDirection: 'row-reverse' }]}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name={isAR ? "arrow-forward" : "arrow-back"} size={18} color={NOIR_PURPLE} />
          </Pressable>
          <Pressable 
            style={[styles.langBtn, isAR && { flexDirection: 'row-reverse' }]} 
            onPress={() => setLang(l => l === 'EN' ? 'AR' : 'EN')}
          >
            <Ionicons name="globe-outline" size={14} color={NOIR_GOLD} />
            <Text style={styles.langText}>{isAR ? "English" : "العربية"}</Text>
          </Pressable>
        </View>

        {/* 💳 بطاقة استعادة كلمة السر (Card UI المطابقة للوجين) */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.card}>
          
          {/* أيقونة الأمان داخل البطاقة */}
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark-outline" size={32} color={NOIR_PURPLE} />
          </View>

          {/* العناوين */}
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>Lion Security Node</Text>
          <Text style={[styles.metaDesc, isAR && { textAlign: 'right' }]}>
            {currentStep === 1 && t.subEmail}
            {currentStep === 2 && t.subOTP}
            {currentStep === 3 && t.subNewPass}
          </Text>

          {/* الخطوة 1: البريد الإلكتروني */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isAR && { textAlign: 'right' }]}>{t.emailLabel}</Text>
                <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }]}>
                  <Feather name="mail" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isAR && { textAlign: 'right' }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t.emailPlaceholder}
                    placeholderTextColor={TEXT_MUTED}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { opacity: email ? (pressed ? 0.85 : 1) : 0.5 }]}
                disabled={!email || isLoading}
                onPress={handleSendOTP}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t.sendCodeBtn}</Text>}
              </Pressable>
            </View>
          )}

          {/* الخطوة 2: إدخال الكود (OTP) */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isAR && { textAlign: 'right' }]}>{t.otpLabel}</Text>
                <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }]}>
                  <Feather name="key" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isAR && { textAlign: 'right' }, { letterSpacing: 4, fontWeight: 'bold' }]}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder={t.otpPlaceholder}
                    placeholderTextColor={TEXT_MUTED}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { opacity: otp.length === 6 ? (pressed ? 0.85 : 1) : 0.5 }]}
                disabled={otp.length !== 6 || isLoading}
                onPress={handleVerifyCode}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t.verifyBtn}</Text>}
              </Pressable>
            </View>
          )}

          {/* الخطوة 3: كلمة السر الجديدة */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isAR && { textAlign: 'right' }]}>{t.newPassLabel}</Text>
                <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }]}>
                  <Feather name="lock" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isAR && { textAlign: 'right' }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t.passPlaceholder}
                    placeholderTextColor={TEXT_MUTED}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={TEXT_MUTED} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.inputLabel, isAR && { textAlign: 'right' }]}>{t.confirmPassLabel}</Text>
                <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }]}>
                  <Feather name="lock" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, isAR && { textAlign: 'right' }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t.passPlaceholder}
                    placeholderTextColor={TEXT_MUTED}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={TEXT_MUTED} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { marginTop: 10, opacity: (newPassword && confirmPassword) ? (pressed ? 0.85 : 1) : 0.5 }
                ]}
                disabled={!newPassword || !confirmPassword || isLoading}
                onPress={handleUpdatePassword}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t.updateBtn}</Text>}
              </Pressable>
            </View>
          )}

          {/* زر العودة لتسجيل الدخول */}
          <Pressable style={styles.backToLoginBtn} onPress={() => router.replace('/login')}>
            <Text style={styles.backToLoginText}>{t.backToLogin}</Text>
          </Pressable>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2DAEC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2DAEC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  langText: {
    fontSize: 12,
    color: NOIR_PURPLE,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: NOIR_PURPLE,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  logoContainer: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_DARK,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: NOIR_GOLD,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  metaDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  stepContainer: {
    width: '100%',
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputIcon: {
    marginHorizontal: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    paddingHorizontal: 10,
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  primaryBtn: {
    backgroundColor: NOIR_PURPLE,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: NOIR_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backToLoginBtn: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  backToLoginText: {
    color: NOIR_PURPLE,
    fontSize: 14,
    fontWeight: '600',
  },
});