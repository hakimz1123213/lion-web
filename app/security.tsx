import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// افتراض وجود هذه الـ Hooks في مساراتك الحالية
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

// 🎨 ثيم الألوان الأبيض والأرجواني الجديد
const THEME = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  primaryText: '#111827',
  secondaryText: '#6B7280',
  accentLight: '#F3F0FF', // أرجواني فاتح جداً للخلفيات
  accentDark: '#7C3AED',  // أرجواني داكن وعميق للأساسيات
  border: '#F3F4F6',
  gold: '#F59E0B',
  dangerBg: '#FEF2F2',
  dangerText: '#EF4444',
};

// 🌍 قاموس التعريب الفوري
const securityTranslations: Record<string, Record<string, string>> = {
  EN: {
    securityTitle: "Security & Password",
    heroTitle: "Protect Your Assets",
    heroDesc: "Manage your password and security settings to keep your account safe.",
    accountOverview: "ACCOUNT OVERVIEW",
    primaryEmail: "Primary Email",
    securityStatus: "Security Status",
    vipProtected: "VIP Tier {level} Protected",
    passwordSecurity: "PASSWORD & SECURITY",
    currentPassLabel: "Current Password",
    currentPassDesc: "View or verify your current password",
    newPassLabel: "New Secure Password",
    newPassDesc: "Create a new strong password",
    retypePassLabel: "Retype New Password",
    retypePassDesc: "Confirm your new password",
    forgotPassLabel: "Forgot Current Password?",
    forgotPassDesc: "Reset your password and regain access",
    saveParamsLabel: "Save Security Parameters",
    saveParamsDesc: "Apply and save all your security changes",
    dangerZone: "Danger Zone",
    dangerZoneDesc: "Irreversible account actions",
    requiredFieldsTitle: "Required fields",
    requiredFieldsDesc: "Please fill in all security parameter blocks.",
    weakPassTitle: "Weak Password",
    weakPassDesc: "Security code must be at least 6 characters long.",
    mismatchTitle: "Mismatch Detected",
    mismatchDesc: "The new confirmation password block does not match.",
    successTitle: "Security Updated",
    successDesc: "Your master account password has been changed successfully.",
    perfectBtn: "Perfect",
    securityDeniedTitle: "Security Denied",
    accountLockoutTitle: "Account Lockout",
    accountLockoutDesc: "Please contact backend operator support via Discord to process complete node data removal.",
    otpSentTitle: "Security Code Sent",
    otpSentDesc: "A secure 6-digit OTP has been deployed to your email to recover your password."
  },
  AR: {
    securityTitle: "الأمان وكلمة السر",
    heroTitle: "قم بحماية أصولك",
    heroDesc: "أدر إعدادات الأمان وكلمات السر للحفاظ على أمان حسابك كلياً.",
    accountOverview: "نظرة عامة على الحساب",
    primaryEmail: "البريد الإلكتروني",
    securityStatus: "حالة الأمان",
    vipProtected: "محمي بنظام VIP رتبة {level}",
    passwordSecurity: "كلمة السر والأمان",
    currentPassLabel: "كلمة السر الحالية",
    currentPassDesc: "عرض أو التحقق من كلمة سرك الحالية",
    newPassLabel: "كلمة سر جديدة",
    newPassDesc: "قم بإنشاء كلمة سر قوية وجديدة",
    retypePassLabel: "تأكيد كلمة السر",
    retypePassDesc: "قم بتأكيد كلمة السر الجديدة",
    forgotPassLabel: "هل نسيت كلمة السر؟",
    forgotPassDesc: "استعد كلمة السر واسترجع صلاحيات الوصول",
    saveParamsLabel: "حفظ إعدادات الأمان",
    saveParamsDesc: "تطبيق وحفظ جميع تغييرات الأمان الجديدة",
    dangerZone: "منطقة الخطر",
    dangerZoneDesc: "إجراءات حسابية غير قابلة للرجوع",
    requiredFieldsTitle: "حقول إجبارية",
    requiredFieldsDesc: "يرجى ملء كافة خانات معايير الأمان المتاحة.",
    weakPassTitle: "كلمة سر ضعيفة",
    weakPassDesc: "يجب أن تتكون كلمة السر الجديدة من 6 رموز كحد أدنى.",
    mismatchTitle: "تضارب في التأكيد",
    mismatchDesc: "كلمة السر التأكيدية الجديدة غير متطابقة.",
    successTitle: "تم تأمين الحساب",
    successDesc: "تم تحديث كلمة السر الرئيسية لحسابك بنجاح.",
    perfectBtn: "ممتاز",
    securityDeniedTitle: "مرفوض أمنياً",
    accountLockoutTitle: "تجميد وحذف الحساب",
    accountLockoutDesc: "يرجى التواصل ديريكت مع مطور الدعم الفني عبر ديسكورد لمعالجة الحذف.",
    otpSentTitle: "تم إرسال كود الأمان",
    otpSentDesc: "تم إرسال كود OTP مأمن لبريدك الإلكتروني لاستعادة حسابك."
  }
};

export default function SecurityScreen() {
  // @ts-ignore
  const { user, changeUserPassword, generateAndSaveOTP } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // إعدادات عرض الإخفاء
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  // 🌀 الأنيميشن (Floating & Pulsing)
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // حركة الطفو للدرع (Hero Shield)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // حركة النبض لنص الـ VIP Badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = securityTranslations[lang] || securityTranslations['EN'];
  const isAR = lang === 'AR';

  const handleForgotCurrentPassword = async () => {
    try {
      setIsUpdating(true);
      const result = await generateAndSaveOTP(user.email);
      setIsUpdating(false);

      if (result.error === null) {
        showAlert(t.otpSentTitle, t.otpSentDesc, [{ text: t.perfectBtn, onPress: () => router.push('/forgot-password') }]);
      } else {
        showAlert('Error', result.error);
      }
    } catch (err: any) {
      setIsUpdating(false);
      showAlert('Error', err.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert(t.requiredFieldsTitle, t.requiredFieldsDesc);
      return;
    }
    if (newPassword.length < 6) {
      showAlert(t.weakPassTitle, t.weakPassDesc);
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert(t.mismatchTitle, t.mismatchDesc);
      return;
    }
    try {
      setIsUpdating(true);
      const result = await changeUserPassword(currentPassword, newPassword);
      if (result.error === null) {
        showAlert(t.successTitle, t.successDesc, [{ text: t.perfectBtn, onPress: () => router.back() }]);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        showAlert(t.securityDeniedTitle, result.error);
      }
    } catch (e: any) {
      showAlert('Crash Alert', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // دالة مساعدة لرسم مدخلات البيانات على شكل قائمة
  const renderInputRow = (
    icon: any, iconColor: string, bgColor: string, 
    label: string, placeholder: string, 
    value: string, setValue: any, 
    secure: boolean, setSecure: any,
    isLast: boolean = false
  ) => (
    <View style={[styles.menuRow, isLast && { borderBottomWidth: 0 }, isAR && { flexDirection: 'row-reverse' }]}>
      <View style={[styles.menuIconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={[styles.menuTextContainer, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
        <Text style={styles.menuLabel}>{label}</Text>
        <TextInput
          style={[styles.menuInput, isAR && { textAlign: 'right' }]}
          placeholder={placeholder}
          placeholderTextColor={THEME.secondaryText}
          secureTextEntry={secure}
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
        />
      </View>
      <Pressable onPress={() => setSecure(!secure)} style={styles.menuRightAction}>
        <Ionicons name={secure ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      {/* 👑 Header */}
      <View style={[styles.header, isAR && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name={isAR ? "arrow-forward" : "arrow-back"} size={20} color={THEME.primaryText} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.securityTitle}</Text>
        <Pressable style={styles.navBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={THEME.primaryText} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 🛡️ Hero Section (White/Purple Gradient Variant) */}
          <LinearGradient
            colors={['#F5F3FF', THEME.surface]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={[styles.heroContent, isAR && { flexDirection: 'row-reverse' }]}>
              <Animated.View style={[styles.heroIconWrapper, { transform: [{ translateY: floatAnim }] }]}>
                <View style={styles.shieldGlow} />
                <MaterialCommunityIcons name="shield-lock" size={48} color={THEME.accentDark} />
              </Animated.View>
              <View style={[styles.heroTextWrapper, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
                <Text style={styles.heroTitle}>{t.heroTitle}</Text>
                <Text style={[styles.heroDesc, isAR && { textAlign: 'right' }]}>{t.heroDesc}</Text>
              </View>
            </View>
            <View style={styles.paginationDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </LinearGradient>

          {/* 📊 ACCOUNT OVERVIEW */}
          <Text style={[styles.sectionTitle, isAR && { textAlign: 'right' }]}>{t.accountOverview}</Text>
          <View style={styles.sectionCard}>
            <View style={[styles.menuRow, isAR && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: THEME.accentLight }]}>
                <Feather name="mail" size={18} color={THEME.accentDark} />
              </View>
              <View style={[styles.menuTextContainer, { justifyContent: 'center' }, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
                <Text style={styles.menuLabel}>{t.primaryEmail}</Text>
              </View>
              <View style={styles.menuRightActionTextRow}>
                <Text style={styles.menuValueText}>{user.email}</Text>
                <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={16} color="#9CA3AF" />
              </View>
            </View>

            <View style={[styles.menuRow, { borderBottomWidth: 0 }, isAR && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Feather name="star" size={18} color={THEME.gold} />
              </View>
              <View style={[styles.menuTextContainer, { justifyContent: 'center' }, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
                <Text style={styles.menuLabel}>{t.securityStatus}</Text>
              </View>
              <View style={styles.menuRightActionTextRow}>
                <Animated.Text style={[styles.vipText, { transform: [{ scale: pulseAnim }] }]}>
                  {t.vipProtected.replace('{level}', (user.vip_level || 2).toString())}
                </Animated.Text>
                <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={16} color="#9CA3AF" />
              </View>
            </View>
          </View>

          {/* 🔒 PASSWORD & SECURITY */}
          <Text style={[styles.sectionTitle, isAR && { textAlign: 'right' }]}>{t.passwordSecurity}</Text>
          <View style={styles.sectionCard}>
            {/* 1. Current Password */}
            {renderInputRow(
              "key", THEME.accentDark, THEME.accentLight, 
              t.currentPassLabel, t.currentPassDesc, 
              currentPassword, setCurrentPassword, 
              secureCurrent, setSecureCurrent
            )}
            {/* 2. New Password */}
            {renderInputRow(
              "lock-closed", "#4A90E2", "rgba(74, 144, 226, 0.1)", 
              t.newPassLabel, t.newPassDesc, 
              newPassword, setNewPassword, 
              secureNew, setSecureNew
            )}
            {/* 3. Retype Password */}
            {renderInputRow(
              "sync", "#2ECC71", "rgba(46, 204, 113, 0.1)", 
              t.retypePassLabel, t.retypePassDesc, 
              confirmPassword, setConfirmPassword, 
              secureConfirm, setSecureConfirm, 
              true
            )}
          </View>

          {/* 🔄 Forgot Password Box */}
          <Pressable onPress={handleForgotCurrentPassword} style={[styles.sectionCard, styles.forgotCard, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(230, 126, 34, 0.1)' }]}>
              <Feather name="life-buoy" size={18} color="#E67E22" />
            </View>
            <View style={[styles.menuTextContainer, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
              <Text style={styles.menuLabel}>{t.forgotPassLabel}</Text>
              <Text style={styles.menuDescText}>{t.forgotPassDesc}</Text>
            </View>
            <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={20} color="#9CA3AF" />
          </Pressable>

          {/* 💠 Save Parameters Button */}
          <Pressable onPress={handleUpdatePassword} disabled={isUpdating}>
            <LinearGradient
              colors={[THEME.accentDark, '#6D28D9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.saveButtonCard, isAR && { flexDirection: 'row-reverse' }]}
            >
              <View style={styles.saveIconContainer}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#FFF" />
              </View>
              <View style={[styles.menuTextContainer, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
                <Text style={styles.saveButtonTitle}>{t.saveParamsLabel}</Text>
                <Text style={styles.saveButtonDesc}>{t.saveParamsDesc}</Text>
              </View>
              <View style={styles.saveActionCircle}>
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={20} color="#FFF" />
                )}
              </View>
            </LinearGradient>
          </Pressable>

          {/* 🚨 Danger Zone */}
          <Pressable style={[styles.dangerCard, isAR && { flexDirection: 'row-reverse' }]} onPress={() => showAlert(t.accountLockoutTitle, t.accountLockoutDesc)}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning-outline" size={20} color={THEME.dangerText} />
            </View>
            <View style={[styles.menuTextContainer, isAR && { alignItems: 'flex-end', paddingRight: 15 }]}>
              <Text style={styles.dangerTitle}>{t.dangerZone}</Text>
              <Text style={styles.dangerDesc}>{t.dangerZoneDesc}</Text>
            </View>
            <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={20} color={THEME.dangerText} />
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 15 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  headerTitle: { color: THEME.primaryText, fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 50, paddingTop: 10 },
  
  // Hero Styles
  heroCard: { 
    borderRadius: 24, padding: 20, marginBottom: 30, 
    borderWidth: 1, borderColor: '#EDE9F6',
    shadowColor: THEME.accentDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  heroContent: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrapper: { position: 'relative', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  shieldGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: THEME.accentDark, opacity: 0.1, transform: [{ scale: 1.2 }] },
  heroTextWrapper: { flex: 1, paddingLeft: 15 },
  heroTitle: { color: THEME.primaryText, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heroDesc: { color: THEME.secondaryText, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: THEME.accentDark, width: 18 },

  // Sections Common
  sectionTitle: { color: THEME.secondaryText, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12, marginLeft: 8 },
  sectionCard: { 
    backgroundColor: THEME.surface, borderRadius: 24, marginBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F9FAFB'
  },
  
  // List Menu Item
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border },
  menuIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuTextContainer: { flex: 1, paddingLeft: 15, justifyContent: 'center' },
  menuLabel: { color: THEME.primaryText, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  menuDescText: { color: THEME.secondaryText, fontSize: 11, fontWeight: '500' },
  menuRightAction: { padding: 5 },
  menuRightActionTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuValueText: { color: THEME.secondaryText, fontSize: 13, fontWeight: '500' },
  vipText: { color: THEME.gold, fontSize: 12, fontWeight: '700' },
  
  // Input specific
  menuInput: { color: THEME.primaryText, fontSize: 13, padding: 0, margin: 0, height: 20, fontWeight: '500' },
  
  // Forgot Password Card
  forgotCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 30 },

  // Save Button Gradient Card
  saveButtonCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, marginBottom: 25,
    shadowColor: THEME.accentDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5
  },
  saveIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  saveButtonTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  saveButtonDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  saveActionCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Danger Zone
  dangerCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, 
    backgroundColor: THEME.dangerBg, borderWidth: 1, borderColor: '#FCA5A5' 
  },
  dangerTitle: { color: THEME.dangerText, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  dangerDesc: { color: '#B91C1C', fontSize: 11, fontWeight: '500' },
});