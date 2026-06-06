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
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { Ionicons } from '@expo/vector-icons';

// 🌍 قاموس التعريب الفوري المدمج مضافاً إليه مفاتيح الـ Forgot Password
const loginTranslations: Record<string, Record<string, string>> = {
  EN: {
    welcomeBack: "Welcome Back",
    signInSub: "Sign in to your account",
    emailLabel: "EMAIL",
    emailPlaceholder: "your@email.com",
    passwordLabel: "PASSWORD",
    forgotPassword: "Forgot Password?",
    signInBtn: "SIGN IN",
    noAccount: "No account?",
    createOne: "Create one",
    missingFieldsTitle: "Missing Fields",
    missingFieldsDesc: "Please enter your email and password.",
    loginFailedTitle: "Login Failed"
  },
  AR: {
    welcomeBack: "مرحباً بك مجدداً",
    signInSub: "قم بتسجيل الدخول إلى حسابك الاستثماري",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني هنا...",
    passwordLabel: "كلمة السر الخاصة بالحساب",
    forgotPassword: "هل نسيت كلمة السر؟",
    signInBtn: "تسجيل دخول",
    noAccount: "ليس لديك حساب؟",
    createOne: "أنشئ حساباً جديداً الآن",
    missingFieldsTitle: "خانات مفقودة",
    missingFieldsDesc: "يرجى كتابة البريد الإلكتروني وكلمة السر أولاً.",
    loginFailedTitle: "فشل تسجيل الدخول"
  }
};

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 🌍 زر التبديل المحلي للغة
  const [currentLang, setCurrentLang] = useState<'EN' | 'AR'>('EN');
  const t = loginTranslations[currentLang];

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert(t.missingFieldsTitle, t.missingFieldsDesc);
      return;
    }
    const { error } = await login(email.trim(), password.trim());
    if (error) {
      showAlert(t.loginFailedTitle, error);
    } else {
      router.replace('/(tabs)');
    }
  };

  const toggleLanguage = () => {
    setCurrentLang((prev) => (prev === 'EN' ? 'AR' : 'EN'));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/images/login-hero.png')}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroOverlay} />
          
          {/* 🌍 زر تبديل اللغة الذهبي العائم الفوق لكسر الحماية */}
          <Pressable 
            style={[styles.langFloatingBtn, { top: insets.top + Spacing.sm }, currentLang === 'AR' ? { left: Spacing.lg } : { right: Spacing.lg }, currentLang === 'AR' && { flexDirection: 'row-reverse' }]} 
            onPress={toggleLanguage}
          >
            <Ionicons name="language" size={16} color={Colors.gold} />
            <Text style={styles.langFloatingText}>{currentLang === 'EN' ? "العربية 🇩🇿" : "English 🇬🇧"}</Text>
          </Pressable>

          <View style={[styles.heroBranding, currentLang === 'AR' && { left: undefined, right: Spacing.lg, alignItems: 'flex-end' }]}>
            <Text style={styles.brandName}>NOIR</Text>
            <Text style={styles.brandTagline}>WEALTH MANAGEMENT</Text>
          </View>
        </View>

        {/* Form */}
        <View style={[styles.formContainer, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Text style={[styles.formTitle, currentLang === 'AR' && { textAlign: 'right' }]}>{t.welcomeBack}</Text>
          <Text style={[styles.formSubtitle, currentLang === 'AR' && { textAlign: 'right' }]}>{t.signInSub}</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, currentLang === 'AR' && { textAlign: 'right' }]}>{t.emailLabel}</Text>
            <TextInput
              style={[styles.input, currentLang === 'AR' && { textAlign: 'right' }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={Colors.textMuted}
              placeholder={t.emailPlaceholder}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, currentLang === 'AR' && { textAlign: 'right' }]}>{t.passwordLabel}</Text>
            <TextInput
              style={[styles.input, currentLang === 'AR' && { textAlign: 'right' }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={Colors.textMuted}
              placeholder="••••••••"
            />
            
            {/* 🔥 [الحقن العسكري الحصين]: زر هل نسيت كلمة السر الملوكي متناسق مع الاتجاهين */}
            <Pressable 
              onPress={() => router.push('/forgot-password')}
              style={({ pressed }) => [
                styles.forgotPasswordBtn,
                { alignSelf: currentLang === 'AR' ? 'flex-start' : 'flex-end', opacity: pressed ? 0.7 : 1 }
              ]}
              hitSlop={12}
            >
              <Text style={styles.forgotPasswordText}>{t.forgotPassword}</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              GlobalStyles.primaryButton,
              { marginTop: Spacing.xs, opacity: pressed ? 0.85 : 1 }, // تعديل الـ margin ليتناسق مع وجود الزر الجديد
              currentLang === 'AR' && { flexDirection: 'row-reverse' }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textOnGold} />
            ) : (
              <Text style={GlobalStyles.primaryButtonText}>{t.signInBtn}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/register')} style={styles.registerLink}>
            <Text style={styles.registerLinkText}>
              {t.noAccount}{' '}
              <Text style={{ color: Colors.gold, fontWeight: FontWeight.semibold }}>
                {t.createOne}
              </Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,5,0.55)',
  },
  langFloatingBtn: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: Colors.goldDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    zIndex: 50,
  },
  langFloatingText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroBranding: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
  },
  brandName: {
    fontSize: 42,
    fontWeight: FontWeight.extrabold,
    color: Colors.gold,
    letterSpacing: 8,
  },
  brandTagline: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: FontSize.base,
  },
  // 🔥 ستايل رابط نسيت كلمة السر الملوكي الجديد
  forgotPasswordBtn: {
    marginTop: 8,
    paddingVertical: 2,
  },
  forgotPasswordText: {
    color: Colors.gold, // يستعمل نفس درجة الذهب الموحدة للمشروع لقفل الحماية البصرية
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  registerLinkText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});