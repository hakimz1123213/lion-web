import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';

const registerTranslations: Record<string, Record<string, string>> = {
  EN: {
    createAccount: "Create Account",
    joinNoir: "Join Noir Wealth",
    usernameLabel: "USERNAME",
    usernamePlaceholder: "Your display name",
    emailLabel: "EMAIL",
    passwordLabel: "PASSWORD",
    confirmPassLabel: "CONFIRM PASSWORD",
    referralLabel: "REFERRAL CODE",
    optional: "(OPTIONAL)",
    referralPlaceholder: "NOIR-XXX-00000",
    helperText: "Have a friend's referral code? Enter it to link your accounts.",
    createBtn: "CREATE ACCOUNT",
    alreadyHave: "Already have an account? ",
    signInLink: "Sign in",
    missingTitle: "Missing Fields",
    missingDesc: "Please fill in all required fields.",
    mismatchTitle: "Password Mismatch",
    mismatchDesc: "Passwords do not match.",
    weakTitle: "Weak Password",
    weakDesc: "Password must be at least 6 characters.",
    successTitle: "Verification Sent",
    successDesc: "Please check your email inbox for the elite access token.",
    continueBtn: "Continue",
    failedTitle: "Registration Failed",
    otpLabel: "ENTER SECURITY TOKEN (OTP)",
    otpPlaceholder: "Enter 6-digit code",
    verifyBtn: "VERIFY & ACTIVATE ACCOUNT",
    backToInfo: "Back to registration info",
    verifySuccessTitle: "Account Activated",
    verifySuccessDesc: "Welcome to Noir Wealth! Your elite account has been verified."
  },
  AR: {
    createAccount: "إنشاء حساب جديد",
    joinNoir: "انضم إلى شبكة Noir Wealth الاستثمارية",
    usernameLabel: "اسم المستخدم الحركي",
    usernamePlaceholder: "الاسم المستعار للعرض...",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة السر (الباسورد)",
    confirmPassLabel: "تأكيد كلمة السر",
    referralLabel: "كود المستدعي والـإحالة",
    optional: "(اختياري)",
    referralPlaceholder: "أدخل كود الداعي هنا...",
    helperText: "هل لديك كود دعوة من صديق؟ أدخله هنا لربط شبكتك المالية لايف والاستفادة من العمولات.",
    createBtn: "تأكيد وبناء الحساب فوراً",
    alreadyHave: "لديك حساب بالفعل؟ ",
    signInLink: "سجّل دخولك الآن",
    missingTitle: "خانات مفقودة",
    missingDesc: "يرجى ملء كاع حقول البيانات الإجبارية أولاً.",
    mismatchTitle: "تضارب كلمة السر",
    mismatchDesc: "كلمتا السر غير متطابقتين، يرجى التدقيق.",
    weakTitle: "كلمة سر ضعيفة",
    weakDesc: "يجب أن يتكون الباسورد من 6 رموز أو أحرف كحد أدنى.",
    successTitle: "تم إرسال كود التحقق",
    successDesc: "يرجى فحص علبة الوارد لإيميلك لجلب رمز الأمان الملوكي الحين.",
    continueBtn: "استمرار",
    failedTitle: "فشل إنشاء الحساب",
    otpLabel: "أدخل رمز الأمان الملوكي (OTP)",
    otpPlaceholder: "أدخل الكود المكون من 6 أرقام...",
    verifyBtn: "تأكيد وتفعيل الحساب لايف",
    backToInfo: "العودة لتعديل البيانات العضوية",
    verifySuccessTitle: "تم تفعيل الحساب بنجاح",
    verifySuccessDesc: "مرحباً بك في عالم Noir Wealth الفخم! تم التحقق وتأمين حسابك بالكامل الحين."
  }
};

export default function RegisterScreen() {
  const { register, confirmRegisterOTP } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // ✅ فتح الخانات دايماً بنقاوة
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');
  const t = registerTranslations[lang];

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirm) {
      showAlert(t.missingTitle, t.missingDesc);
      return;
    }
    if (password !== confirm) {
      showAlert(t.mismatchTitle, t.mismatchDesc);
      return;
    }
    if (password.length < 6) {
      showAlert(t.weakTitle, t.weakDesc);
      return;
    }

    setLoading(true);
    const result = await register(username.trim(), email.trim(), password, "", referralCode.trim());
    setLoading(false);

    if (result.error === null) {
      showAlert(
        t.successTitle,
        t.successDesc,
        [{ text: t.continueBtn, onPress: () => setCurrentStep(2) }]
      );
    } else {
      const cleanMsg = typeof result.error === 'string' ? result.error : "Transmission secure fallback.";
      showAlert(t.failedTitle, cleanMsg);
    }
  };

  const handleVerifyRegisterOTP = async () => {
    if (!otpInput.trim()) return;

    setLoading(true);
    const result = await confirmRegisterOTP(email.trim(), otpInput.trim());
    setLoading(false);

    if (result.error === null) {
      showAlert(
        t.verifySuccessTitle,
        t.verifySuccessDesc,
        [{ text: t.continueBtn, onPress: () => router.replace('/(tabs)') }]
      );
    } else {
      const cleanMsg = typeof result.error === 'string' ? result.error : "Token validation aborted.";
      showAlert("Verification Failed", cleanMsg);
    }
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'EN' ? 'AR' : 'EN'));
  };

  const fieldsConfig = [
    { label: t.usernameLabel, value: username, setter: setUsername, placeholder: t.usernamePlaceholder, secure: false, type: 'default' as const },
    { label: t.emailLabel, value: email, setter: setEmail, placeholder: 'your@email.com', secure: false, type: 'email-address' as const },
    { label: t.passwordLabel, value: password, setter: setPassword, placeholder: '••••••••', secure: true, type: 'default' as const },
    { label: t.confirmPassLabel, value: confirm, setter: setConfirm, placeholder: '••••••••', secure: true, type: 'default' as const },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => currentStep === 2 ? setCurrentStep(1) : router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name={lang === 'AR' ? "arrow-forward" : "arrow-back"} size={24} color={Colors.gold} />
          </Pressable>
          <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end' }]}>
            <Text style={styles.title}>{t.createAccount}</Text>
            <Text style={styles.subtitle}>{t.joinNoir}</Text>
          </View>
          
          <Pressable 
            style={[styles.langFloatingBtn, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
            onPress={toggleLanguage}
          >
            <Ionicons name="language" size={14} color={Colors.gold} />
            <Text style={styles.langFloatingText}>{lang === 'EN' ? "العربية 🇩🇿" : "English 🇬🇧"}</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {currentStep === 1 ? (
            <View>
              {fieldsConfig.map((field) => (
                <View key={field.label} style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, lang === 'AR' && { textAlign: 'right' }]}
                    value={field.value}
                    onChangeText={field.setter}
                    secureTextEntry={field.secure}
                    keyboardType={field.type}
                    autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                    autoCorrect={false}
                    placeholderTextColor={Colors.textMuted}
                    placeholder={field.placeholder}
                  />
                </View>
              ))}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>
                  {t.referralLabel} <Text style={styles.optional}>{t.optional}</Text>
                </Text>
                <View style={[styles.referralInputWrapper, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                  <MaterialIcons name="card-giftcard" size={20} color={Colors.textMuted} style={lang === 'AR' ? { marginLeft: 10 } : { marginRight: 10 }} />
                  <TextInput
                    style={[styles.referralInput, lang === 'AR' && { textAlign: 'right' }]}
                    value={referralCode}
                    onChangeText={setReferralCode}
                    placeholder={t.referralPlaceholder}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <Text style={[styles.helperText, lang === 'AR' && { textAlign: 'right' }]}>
                  {t.helperText}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  GlobalStyles.primaryButton, 
                  { marginTop: Spacing.lg, opacity: pressed ? 0.85 : 1 }, 
                  lang === 'AR' && { flexDirection: 'row-reverse' }
                ]}
                onPress={handleRegister} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textOnGold} /> 
                ) : (
                  <Text style={GlobalStyles.primaryButtonText}>{t.createBtn}</Text> 
                )}
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: Spacing.md }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.otpLabel}</Text>
                <View style={[styles.referralInputWrapper, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                  <MaterialIcons name="security" size={20} color={Colors.gold} style={lang === 'AR' ? { marginLeft: 10 } : { marginRight: 10 }} />
                  <TextInput
                    style={[styles.referralInput, { letterSpacing: 4, fontWeight: 'bold', fontSize: FontSize.lg }, lang === 'AR' && { textAlign: 'right' }]}
                    value={otpInput}
                    onChangeText={setOtpInput}
                    placeholder={t.otpPlaceholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  GlobalStyles.primaryButton, 
                  { marginTop: Spacing.md, opacity: pressed ? 0.85 : 1 }, 
                  lang === 'AR' && { flexDirection: 'row-reverse' }
                ]}
                onPress={handleVerifyRegisterOTP} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textOnGold} /> 
                ) : (
                  <Text style={GlobalStyles.primaryButtonText}>{t.verifyBtn}</Text> 
                )}
              </Pressable>

              <Pressable 
                onPress={() => setCurrentStep(1)} 
                style={{ marginTop: Spacing.lg, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, textDecorationLine: 'underline' }}>
                  {t.backToInfo}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.footer, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
             <Text style={styles.footerText}>{t.alreadyHave}</Text>
             <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>{t.signInLink}</Text>
             </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }, 
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder }, 
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary }, 
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary }, 
  form: { paddingHorizontal: Spacing.lg }, 
  inputGroup: { marginBottom: Spacing.md }, 
  inputLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, letterSpacing: 1.2, marginBottom: 6 }, 
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.base }, 
  langFloatingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  langFloatingText: { color: Colors.gold, fontSize: 10, fontWeight: 'bold' },
  optional: { color: Colors.textMuted, fontWeight: FontWeight.regular, fontSize: 10 },
  referralInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.md, paddingHorizontal: Spacing.md },
  referralInput: { flex: 1, paddingVertical: 14, color: Colors.textPrimary, fontSize: FontSize.base },
  helperText: { fontSize: 10, color: Colors.textMuted, marginTop: 6, fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});