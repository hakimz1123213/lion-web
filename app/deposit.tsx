import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { VIP_TIERS, ADMIN_USDT_ADDRESS } from '@/constants/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

const { width } = Dimensions.get('window');

// 🎨 الألوان المطابقة للصورة
const THEME = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  primary: '#7C3AED', // اللون البنفسجي
  textMain: '#111827',
  textSecondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#F3F4F6',
  inputBg: '#F9FAFB',
};

// 🌍 الترجمة (حسب لغة المستخدم)
const depositTranslations: Record<string, Record<string, string>> = {
  EN: {
    title: "Deposit USDT",
    addressTitle: "Deposit Address",
    network: "",
    copy: "Copy",
    copyQR: "Copy QR code",
    copied: "Copied!",
    warning: "Send BEP20 only. Other networks will result in loss of funds.",
    qrTitle: "QR Code",
    submit: "Submit Deposit Request",
    uploading: "Submitting...",
    success: "Success",
    successMsg: "Request submitted successfully.",
    depositLabel: "Deposit",
    currency: "USDT",
  },
  AR: {
    title: "إيداع USDT",
    addressTitle: "عنوان الإيداع",
    network: "",
    copy: "نسخ",
    copyQR: "نسخ الكود",
    copied: "تم النسخ!",
    warning: "أرسل عبر شبكة BEP20 فقط. الشبكات الأخرى ستؤدي لفقدان الأموال.",
    qrTitle: "رمز الاستجابة السريعة (QR)",
    submit: "إرسال طلب الإيداع",
    uploading: "جاري الإرسال...",
    success: "نجاح",
    successMsg: "تم إرسال الطلب بنجاح.",
    depositLabel: "إيداع",
    currency: "USDT",
  }
};

export default function DepositScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('4100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = depositTranslations[lang] || depositTranslations['EN'];
  const isAR = lang === 'AR';

  // تصفية الباقات المطلوبة فقط (150, 300, 800, 4100)
  const targetAmounts = [70, 150, 300, 500, 800, 1400, 2400, 4100];
  const filteredTiers = VIP_TIERS.filter(tier => targetAmounts.includes(tier.entryFee));
  const displayTiers = filteredTiers.length > 0 ? filteredTiers : [
    { level: 1, label: 'VIP 1', entryFee: 70 },
    { level: 2, label: 'VIP 2', entryFee: 150 },
    { level: 3, label: 'VIP 3', entryFee: 300 },
    { level: 4, label: 'VIP 4', entryFee: 500 },
    { level: 5, label: 'VIP 5', entryFee: 800 },
    { level: 6, label: 'VIP 6', entryFee: 1400 },
    { level: 7, label: 'VIP 7', entryFee: 2400 },
    { level: 8, label: 'VIP 8', entryFee: 4100 },
  ];

  // 🔢 التعامل مع لوحة الأرقام
  const handleKeyPress = (val: string) => {
    if (val === 'back') {
      setAmount(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
    } else if (val === '.') {
      if (!amount.includes('.')) setAmount(prev => prev + '.');
    } else {
      setAmount(prev => (prev === '0' ? val : prev + val));
    }
  };

  // 📋 نسخ العنوان
  const handleCopy = async () => {
    await Clipboard.setStringAsync(ADMIN_USDT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 🚀 الإرسال
  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return showAlert('Error', 'Invalid amount');

    try {
      setIsSubmitting(true);

      // استدعاء الـ Cloud Function مباشرة
      const functions = getFunctions();
      const submitDepositReq = httpsCallable(functions, 'submitDeposit');
      await submitDepositReq({
        userId: user.uid,
        amount: parsed,
        username: user.username
      });

      showAlert(t.success, t.successMsg, [{ text: 'OK', onPress: () => router.back() }]);

    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, isAR && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={isAR ? "chevron-right" : "chevron-left"} size={28} color={THEME.textMain} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ─── Amount Display ─── */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>${amount}</Text>
        </View>

        {/* ─── VIP Presets (Filtered: 150, 300, 800, 4100) ─── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsWrapper} contentContainerStyle={styles.presetsContainer}>
          {displayTiers.map((tier) => {
            const isActive = amount === tier.entryFee.toString();
            return (
              <Pressable
                key={tier.level}
                style={[styles.presetPill, isActive && styles.presetPillActive]}
                onPress={() => setAmount(tier.entryFee.toString())}
              >
                <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                  ${tier.entryFee} ({tier.label})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ─── Deposit Selection Row ─── */}
        <Pressable style={[styles.depositRowCard, isAR && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.depositRowLeft, isAR && { flexDirection: 'row-reverse' }]}>
            <Image 
              source={require('../assets/images/USDT-BEP20-1.png')} 
              style={styles.depositIcon} 
            />
            <View style={isAR ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }}>
              <Text style={styles.depositTitleText}>{t.depositLabel}</Text>
              <Text style={styles.depositSubtitleText}>{t.currency}</Text>
            </View>
          </View>
          <Feather name={isAR ? "chevron-left" : "chevron-right"} size={20} color="#9CA3AF" />
        </Pressable>

        {/* ─── Flat Numeric Keypad ─── */}
        <View style={styles.keypadCard}>
          {[
            ['1', '2', '3'], 
            ['4', '5', '6'], 
            ['7', '8', '9'], 
            ['.', '0', 'back']
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((item) => (
                <Pressable
                  key={item}
                  style={styles.keypadBtn}
                  onPress={() => handleKeyPress(item)}
                >
                  {item === 'back' ? (
                    <Feather name="arrow-left" size={24} color={THEME.textMain} />
                  ) : (
                    <Text style={styles.keypadText}>{item}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {/* ─── Unified Address, QR Card ─── */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, isAR && { textAlign: 'right' }]}>{t.addressTitle}</Text>
          
          <View style={[styles.networkRow, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={styles.dot} />
            <Text style={styles.networkText}>{t.network}</Text>
          </View>

          <View style={[styles.addressBox, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {ADMIN_USDT_ADDRESS}
            </Text>
          </View>

          {/* QR & Copy Row */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }, isAR && { textAlign: 'right' }]}>{t.qrTitle}</Text>
          <View style={[styles.qrRow, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={styles.qrBox}>
              <Image source={require('../assets/images/qr-code.png')} style={styles.qrImage} />
            </View>
            <Pressable style={styles.qrCopyBtn} onPress={handleCopy}>
              <Text style={styles.qrCopyBtnText}>{copied ? t.copied : t.copyQR}</Text>
            </Pressable>
          </View>

          <View style={[styles.warningRow, isAR && { flexDirection: 'row-reverse' }]}>
            <Feather name="alert-circle" size={16} color={THEME.warning} />
            <Text style={[styles.warningText, isAR && { textAlign: 'right' }]}>{t.warning}</Text>
          </View>
        </View>

        {/* ─── زر إرسال الطلب الأساسي ─── */}
        <Pressable 
          style={[styles.submitBtn, (isSubmitting || amount === '0') && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || amount === '0'}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{t.submit}</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: THEME.textMain },
  backBtn: { padding: 4 },

  // Amount
  amountContainer: { alignItems: 'center', marginVertical: 24 },
  amountText: { fontSize: 48, fontWeight: '900', color: THEME.textMain, letterSpacing: -1 },

  // VIP Presets
  presetsWrapper: { flexGrow: 0, marginBottom: 24 },
  presetsContainer: { gap: 10, paddingHorizontal: 4 },
  presetPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: THEME.surface },
  presetPillActive: { borderColor: THEME.primary, backgroundColor: THEME.primary + '10' },
  presetText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary },
  presetTextActive: { color: THEME.primary, fontWeight: '700' },

  // Deposit Selection Row Styles
 // Deposit Selection Row Styles
  depositRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // تم التصحيح هنا
    backgroundColor: THEME.inputBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  depositRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  depositIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  depositTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textMain,
  },
  depositSubtitleText: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },

  // Keypad
  keypadCard: { backgroundColor: THEME.surface, borderRadius: 24, paddingVertical: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  keypadBtn: { flex: 1, height: 65, justifyContent: 'center', alignItems: 'center' },
  keypadText: { fontSize: 24, fontWeight: '700', color: THEME.textMain },

  // Unified Card
  card: { backgroundColor: THEME.surface, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: THEME.textMain, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: THEME.textMain, marginBottom: 12 },
  
  networkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.success },
  networkText: { fontSize: 13, color: THEME.textSecondary, fontWeight: '500' },

  addressBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.inputBg, borderRadius: 12, padding: 12 },
  addressText: { flex: 1, fontSize: 13, color: THEME.textMain, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // QR Row
  qrRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qrBox: { padding: 12, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  qrImage: { width: 90, height: 90 },
  qrCopyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: THEME.surface },
  qrCopyBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  warningText: { flex: 1, fontSize: 12, color: THEME.warning, fontWeight: '500' },

  // Submit Button
  submitBtn: { backgroundColor: THEME.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});