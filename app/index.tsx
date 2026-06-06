import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const { user, isLoading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    // ✅ ننتظر السحاب حتى ينتهي من التحقق من الجلسة
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (user) {
          // إذا وجدنا المستخدم، نوجهه للوحة التحكم الرئيسية
          router.replace('/(tabs)');
        } else {
          // إذا لم نجد مستخدماً، نرسله لصفحة تسجيل الدخول
          router.replace('/login');
        }
      }, 500); // تأخير بسيط بنصف ثانية لضمان استقرار الواجهة

      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  return (
    <View style={styles.screen}>
      {/* ضبط شريط الحالة ليتماشى مع الوضع الداكن */}
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      <View style={styles.content}>
        {/* يمكنك هنا وضع شعار NoirWealth إذا أردت */}
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Synchronizing with Cloud...</Text>
      </View>
    </View>
  );
}

// ─── الستايلات ──────────────────────────────────────────────────────────────
import { Text } from 'react-native'; // لإضافة نص التحميل

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background, // ضمان بقاء الخلفية سوداء فخمة
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});