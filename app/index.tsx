import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ImageBackground, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// 🎨 الألوان الاحترافية (أرجواني ملكي وأبيض)
const PRIMARY_PURPLE = '#3B0764'; // أرجواني داكن فخم جداً
const ACCENT_PURPLE = '#9333EA'; // أرجواني ساطع للمسات
const WHITE = '#FFFFFF';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAR, setIsAR] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 🖼️ صورة الخلفية */}
      <ImageBackground 
        source={require('../assets/images/nature-background.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* 💜 غلاف أرجواني شفاف يعطي الصورة طابعاً احترافياً ويوحد ألوان التطبيق */}
        <View style={styles.overlay}>

          {/* 🔝 زر تغيير اللغة (تصميم زجاجي فاخر) */}
          <Animated.View 
            entering={FadeInDown.delay(200).springify().damping(15)} 
            style={[styles.header, { top: insets.top + 10 }]}
          >
            <Pressable 
              style={[styles.langBtn, isAR && { flexDirection: 'row-reverse' }]} 
              onPress={() => setIsAR(!isAR)}
            >
              <Ionicons name="globe-outline" size={16} color={WHITE} />
              <Text style={styles.langText}>{isAR ? "English" : "العربية"}</Text>
            </Pressable>
          </Animated.View>

          {/* ✨ المحتوى في المنتصف */}
          <View style={styles.contentContainer}>
            {/* الشعار داخل دائرة بيضاء بارزة */}
            <Animated.View entering={FadeInDown.delay(400).springify().damping(14)} style={styles.logoWrapper}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="leaf" size={36} color={PRIMARY_PURPLE} />
              </View>
            </Animated.View>

            {/* العنوان الرئيسي بخط عريض وواضح */}
            <Animated.Text entering={FadeInDown.delay(500).springify().damping(14)} style={styles.title}>
              {isAR ? "ادخر واستثمر\nمع Lion" : "Save and invest\nwith Lion"}
            </Animated.Text>
            
            {/* نص فرعي لإضافة لمسة احترافية */}
            <Animated.Text entering={FadeInDown.delay(600).springify().damping(14)} style={styles.subtitle}>
              {isAR 
                ? "ابدأ رحلتك نحو الاستقلال المالي بخطوات بسيطة وآمنة." 
                : "Start your journey to financial freedom with simple, secure steps."}
            </Animated.Text>
          </View>

          {/* 🔘 الأزرار في الأسفل (تصميم عصري) */}
          <Animated.View 
            entering={FadeInUp.delay(800).springify().damping(15)} 
            style={[styles.bottomContainer, { paddingBottom: insets.bottom + 30 }]}
          >
            {/* زر البدء (أبيض بالكامل ليبرز فوق الأرجواني) */}
            <Pressable 
              style={({ pressed }) => [
                styles.getStartedBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }
              ]}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.getStartedText}>
                {isAR ? "ابدأ الآن" : "Get started"}
              </Text>
              <Ionicons 
                name={isAR ? "arrow-back" : "arrow-forward"} 
                size={20} 
                color={PRIMARY_PURPLE} 
              />
            </Pressable>

            {/* زر تسجيل الدخول (نظيف وأنيق) */}
            <View style={[styles.loginRow, isAR && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.loginHint}>
                {isAR ? "هل لديك حساب بالفعل؟ " : "Already have an account? "}
              </Text>
              
              <Pressable 
                onPress={() => router.push('/login')}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.loginText}>
                  {isAR ? "تسجيل الدخول" : "Log in"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_PURPLE, 
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    // فلتر أرجواني داكن فوق الصورة يقلب التصميم لاحترافي فوراً
    backgroundColor: 'rgba(42, 16, 60, 0.65)', 
  },
  header: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // تأثير زجاجي
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  langText: {
    fontSize: 13,
    color: WHITE,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10%', 
  },
  logoWrapper: {
    marginBottom: 24,
    shadowColor: ACCENT_PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  logoCircle: {
    width: 72,
    height: 72,
    backgroundColor: WHITE,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: WHITE,
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedBtn: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    width: '100%',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    color: PRIMARY_PURPLE,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginHint: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)', 
    fontWeight: '500',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '800',
    color: WHITE,
    textDecorationLine: 'underline',
  },
});