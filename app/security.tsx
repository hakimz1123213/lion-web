import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🚀 تم تنظيف استيراد الأيقونات المكسورة المسببة للمربعات البيضاء نهائياً من جذر الملف
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors } from '@/constants/theme';

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة الأمان لمنع أخطاء الـ TypeScript والمسارات
const securityTranslations: Record<string, Record<string, string>> = {
  EN: {
    securityTitle: "Security & Password",
    loginControl: "Login & Security Control",
    securityDesc: "Manage your password and security settings to safeguard your NoirWealth cryptographical assets.",
    accountMetrics: "ACCOUNT METRICS",
    primaryEmail: "Primary Email:",
    securityBadge: "Security Badge:",
    vipProtected: "VIP Tier {level} Protected",
    updatePasswordLabel: "UPDATE PASSWORD",
    currentPassPlaceholder: "Current Account Password",
    newPassPlaceholder: "New Secure Password",
    retypePassPlaceholder: "Retype New Password",
    forgotCurrentPass: "Forgot Current Password?",
    saveParamsBtn: "SAVE SECURITY PARAMETERS",
    dangerZone: "Danger Zone",
    deleteIdentityBtn: "Delete NoirWealth Account Identity",
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
    securityTitle: "الأمان وكلمات السر",
    loginControl: "غرفة التحكم وحماية الحساب",
    securityDesc: "قم بإدارة كلمات السر وإعدادات الأمان الصارمة لحماية وتأمين أصولك المالية داخل منصة NoirWealth كلياً.",
    accountMetrics: "مؤشرات حماية الحساب الحالي",
    primaryEmail: "البريد الإلكتروني الأساسي:",
    securityBadge: "رادار الحماية النشط:",
    vipProtected: "محمي بنظام VIP رتبة {level}",
    updatePasswordLabel: "تحديث وتغيير كلمة السر",
    currentPassPlaceholder: "كلمة السر الحالية للحساب",
    newPassPlaceholder: "كلمة السر الجديدة المقترحة",
    retypePassPlaceholder: "إعادة كتابة كلمة السر الجديدة",
    forgotCurrentPass: "هل نسيت كلمة السر الحالية؟",
    saveParamsBtn: "حفظ وتأمين معايير الأمان الجديدة",
    dangerZone: "منطقة الخطر الإدارية",
    deleteIdentityBtn: "حذف وتدمير هوية الحساب من المنصة",
    requiredFieldsTitle: "حقول إجبارية",
    requiredFieldsDesc: "يرجى ملء كاع خانات معايير الأمان المتاحة.",
    weakPassTitle: "كلمة سر ضعيفة",
    weakPassDesc: "يجب أن تتكون كلمة السر الجديدة من 6 رموز أو أحرف كحد أدنى.",
    mismatchTitle: "تضارب في التأكيد",
    mismatchDesc: "كلمة السر التأكيدية الجديدة غير متطابقة مع كلمة السر المكتوبة فوق.",
    successTitle: "تم تأمين الحساب",
    successDesc: "تم تحديث وتغيير كلمة السر الرئيسية لحسابك بنجاح وسرعة مطلقة.",
    perfectBtn: "ممتاز",
    securityDeniedTitle: "مرفوض أمنياً",
    accountLockoutTitle: "تجميد وحذف الحساب",
    accountLockoutDesc: "يرجى التواصل ديريكت مع مطور الدعم الفني لـ حكيم عبر ديسكورد لمعالجة وحذف بيانات حسابك كلياً من جذر السيرفر.",
    otpSentTitle: "تم إرسال كود الأمان",
    otpSentDesc: "تم إرسال كود OTP مأمن لبريدك الإلكتروني لاستعادة وتغيير كلمة السر داخل التطبيق."
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

  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = securityTranslations[lang] || securityTranslations['EN'];

  const handleForgotCurrentPassword = async () => {
    try {
      setIsUpdating(true);
      const result = await generateAndSaveOTP(user.email);
      setIsUpdating(false);

      if (result.error === null) {
        console.log("Security Reset OTP Deployed:", result.otpCode);

        showAlert(
          t.otpSentTitle,
          t.otpSentDesc,
          [{ text: t.perfectBtn, onPress: () => router.push('/forgot-password') }]
        );
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
        showAlert(t.successTitle, t.successDesc, [
          { text: t.perfectBtn, onPress: () => router.back() }
        ]);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showAlert(t.securityDeniedTitle, result.error);
      }
    } catch (e: any) {
      showAlert('Crash Alert', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          {/* 🛠️ تعديل 1: استبدال سهم الرجوع المكسور بـ إيموجي نصي سهمي ثابت ومتناسق هندسياً */}
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
            {lang === 'AR' ? '◀' : '▶'}
          </Text>
        </Pressable>
        <Text style={styles.title}>{t.securityTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* لوحة التعريف */}
          <View style={styles.metaBanner}>
            {/* 🛠️ تعديل 2: استبدال مربع درع الحماية المكسور بمنتصف الشاشة بإيموجي درع ذهبي حقيقي صلب */}
            <Text style={{ fontSize: 32, marginBottom: 4 }}>🛡️</Text>
            <Text style={styles.metaTitle}>{t.loginControl}</Text>
            <Text style={styles.metaDesc}>{t.securityDesc}</Text>
          </View>

          {/* بلوك استعراض البيانات المحمية */}
          <Text style={[styles.sectionLabel, lang === 'AR' && { textAlign: 'right', marginRight: 5 }]}>{t.accountMetrics}</Text>
          <View style={styles.intelBox}>
            <View style={[styles.intelRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.intelLabel}>{t.primaryEmail}</Text>
              <Text style={styles.intelVal}>{user.email}</Text>
            </View>
            <View style={[styles.intelRow, { borderBottomWidth: 0 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.intelLabel}>{t.securityBadge}</Text>
              <Text style={[styles.intelVal, { color: Colors.gold || '#D4AF37', fontWeight: 'bold' }]}>
                {t.vipProtected.replace('{level}', (user.vip_level || 0).toString())}
              </Text>
            </View>
          </View>

          {/* فورم تعديل الباسورد */}
          <Text style={[styles.sectionLabel, lang === 'AR' && { textAlign: 'right', marginRight: 5 }]}>{t.updatePasswordLabel}</Text>
          
          {/* 1. الباسورد الحالي */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, lang === 'AR' && { textAlign: 'right', paddingRight: 16, paddingLeft: 50 }]}
              placeholder={t.currentPassPlaceholder}
              placeholderTextColor="#444"
              secureTextEntry={secureCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Pressable onPress={() => setSecureCurrent(!secureCurrent)} style={[styles.eyeIcon, lang === 'AR' && { left: 15, right: undefined }]}>
              {/* 🛠️ تعديل 3: استبدال مربع العين الفارغ المكسور بـ إيموجيات نصية حية وحركية مدمجة كلياً */}
              <Text style={{ fontSize: 14 }}>{secureCurrent ? '👁️‍🗨️' : '👁️'}</Text>
            </Pressable>
          </View>

          {/* 2. الباسورد الجديد */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, lang === 'AR' && { textAlign: 'right', paddingRight: 16, paddingLeft: 50 }]}
              placeholder={t.newPassPlaceholder}
              placeholderTextColor="#444"
              secureTextEntry={secureNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Pressable onPress={() => setSecureNew(!secureNew)} style={[styles.eyeIcon, lang === 'AR' && { left: 15, right: undefined }]}>
              {/* 🛠️ تعديل 4: استبدال المربع الثاني */}
              <Text style={{ fontSize: 14 }}>{secureNew ? '👁️‍🗨️' : '👁️'}</Text>
            </Pressable>
          </View>

          {/* 3. تأكيد الباسورد الجديد */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, lang === 'AR' && { textAlign: 'right', paddingRight: 16, paddingLeft: 50 }]}
              placeholder={t.retypePassPlaceholder}
              placeholderTextColor="#444"
              secureTextEntry={secureConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Pressable onPress={() => setSecureConfirm(!secureConfirm)} style={[styles.eyeIcon, lang === 'AR' && { left: 15, right: undefined }]}>
              {/* 🛠️ تعديل 5: استبدال المربع الثالث */}
              <Text style={{ fontSize: 14 }}>{secureConfirm ? '👁️‍🗨️' : '👁️'}</Text>
            </Pressable>
          </View>

          {/* زر استعادة الباسورد */}
          <Pressable 
            onPress={handleForgotCurrentPassword} 
            style={[{ marginTop: 4, paddingVertical: 6, marginBottom: 15 }, lang === 'AR' ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}
          >
            <Text style={{ color: Colors.gold || '#D4AF37', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
              {t.forgotCurrentPass}
            </Text>
          </Pressable>

          {/* زر التحديث الفاخر */}
          <TouchableOpacity 
            style={[styles.goldButton, isUpdating && { opacity: 0.6 }]} 
            onPress={handleUpdatePassword}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.buttonText}>{t.saveParamsBtn}</Text>
            )}
          </TouchableOpacity>

          {/* Danger Zone */}
          <View style={[styles.dangerZone, lang === 'AR' && { alignItems: 'flex-end' }]}>
            <Text style={styles.dangerTitle}>{t.dangerZone}</Text>
            <Pressable 
              style={[styles.dangerBtn, { width: '100%' }]} 
              onPress={() => showAlert(t.accountLockoutTitle, t.accountLockoutDesc)}
            >
              <Text style={styles.dangerBtnText}>{t.deleteIdentityBtn}</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#111' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  metaBanner: { alignItems: 'center', backgroundColor: '#050505', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#111', marginBottom: 25 },
  metaTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  metaDesc: { color: '#666', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  sectionLabel: { color: '#333', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
  intelBox: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: '#111', marginBottom: 25 },
  intelRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#050505' },
  intelLabel: { color: '#555', fontSize: 13, fontWeight: '600' },
  intelVal: { color: '#aaa', fontSize: 13, fontWeight: '700' },
  inputWrapper: { width: '100%', position: 'relative', marginBottom: 15 },
  input: { backgroundColor: '#0A0A0A', color: '#fff', padding: 16, paddingRight: 50, borderRadius: 12, fontSize: 14, borderWidth: 1, borderColor: '#151515', fontWeight: '500' },
  eyeIcon: { position: 'absolute', right: 15, top: 16, padding: 2, justifyContent: 'center', alignItems: 'center' },
  goldButton: { backgroundColor: Colors.gold || '#D4AF37', paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 15, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 3 },
  buttonText: { color: '#000000', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  dangerZone: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 25, width: '100%' },
  dangerTitle: { color: '#ff4d4d', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 },
  dangerBtn: { backgroundColor: 'rgba(255, 77, 77, 0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 77, 77, 0.1)', alignItems: 'center' },
  dangerBtnText: { color: '#ff4d4d', fontSize: 13, fontWeight: 'bold' }
});