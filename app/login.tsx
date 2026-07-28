import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

// 🎨 ألوان الهوية (تم دمجها مع ستايل البطاقة المطلوب)
const NOIR_PURPLE = '#2A103C';
const NOIR_GOLD = '#D4AF37';
const LIGHT_BG = '#F0EDF5'; // خلفية فاتحة تبرز البطاقة
const CARD_BG = '#FFFFFF';
const INPUT_BG = '#F4F4F8';
const TEXT_DARK = '#1C1524';
const TEXT_MUTED = '#8E8899';

const loginTranslations: Record<string, Record<string, string>> = {
  EN: {
    welcome: "Welcome Back",
    subtitle: "Continue your investment journey",
    emailPlace: "Email address",
    passPlace: "Password",
    remember: "Remember me",
    forgot: "Forgot Password?",
    loginBtn: "Log In",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    missingFields: "Please enter email and password.",
  },
  AR: {
    welcome: "مرحباً بعودتك",
    subtitle: "أكمل رحلتك الاستثمارية الآن",
    emailPlace: "البريد الإلكتروني",
    passPlace: "كلمة المرور",
    remember: "تذكرني",
    forgot: "نسيت كلمة السر؟",
    loginBtn: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    signUp: "سجل الآن",
    missingFields: "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
  }
};

export default function LoginScreen() {
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');

  const t = loginTranslations[lang];
  const isAR = lang === 'AR';

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert("Notice", t.missingFields);
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.error === null) {
      router.replace('/(tabs)');
    } else {
      const cleanMsg = typeof result.error === 'string' ? result.error : "Login failed.";
      showAlert("Error", cleanMsg);
    }
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
        {/* 🔝 زر تغيير اللغة */}
        <View style={[styles.header, { top: insets.top + 10 }, isAR && { right: 20, left: 'auto' }]}>
          <Pressable 
            style={[styles.langBtn, isAR && { flexDirection: 'row-reverse' }]} 
            onPress={() => setLang(l => l === 'EN' ? 'AR' : 'EN')}
          >
            <Ionicons name="globe-outline" size={14} color={NOIR_GOLD} />
            <Text style={styles.langText}>{isAR ? "English" : "العربية"}</Text>
          </Pressable>
        </View>

        {/* 💳 بطاقة تسجيل الدخول (Card UI) */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.card}>
          
          {/* الشعار */}
          <View style={styles.logoContainer}>
            <Ionicons name="paw" size={32} color={NOIR_PURPLE} />
          </View>

          {/* العناوين */}
          <Text style={styles.title}>{t.welcome}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          {/* حقل البريد الإلكتروني */}
          <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }]}>
            <Feather name="mail" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isAR && { textAlign: 'right' }]}
              placeholder={t.emailPlace}
              placeholderTextColor={TEXT_MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* حقل كلمة السر */}
          <View style={[styles.inputContainer, isAR && { flexDirection: 'row-reverse' }, { marginTop: 16 }]}>
            <Feather name="lock" size={20} color={TEXT_MUTED} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isAR && { textAlign: 'right' }]}
              placeholder={t.passPlace}
              placeholderTextColor={TEXT_MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={TEXT_MUTED} />
            </Pressable>
          </View>

          {/* خيارات: تذكرني & نسيان كلمة السر */}
          <View style={[styles.optionsRow, isAR && { flexDirection: 'row-reverse' }]}>
            <Pressable 
              style={[styles.checkboxContainer, isAR && { flexDirection: 'row-reverse' }]} 
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Feather name="check" size={12} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>{t.remember}</Text>
            </Pressable>

            {/* ربط الزر بصفحة نسيت كلمة السر */}
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={styles.forgotText}>{t.forgot}</Text>
            </Pressable>
          </View>

          {/* زر تسجيل الدخول */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: (email && password) ? (pressed ? 0.85 : 1) : 0.5 }
            ]}
            disabled={!email || !password || loading}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t.loginBtn}</Text>
            )}
          </Pressable>

          {/* الانتقال لصفحة التسجيل */}
          <View style={[styles.footerRow, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.footerText}>{t.noAccount} </Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text style={styles.signUpText}>{t.signUp}</Text>
              </Pressable>
            </Link>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 30,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: TEXT_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: NOIR_PURPLE,
    borderColor: NOIR_PURPLE,
  },
  rememberText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 14,
    color: NOIR_PURPLE,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: NOIR_PURPLE,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NOIR_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: NOIR_GOLD,
  },
});