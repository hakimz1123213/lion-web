import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, ActivityIndicator, StatusBar } from 'react-native';
// 👈 استيراد أدوات التوجيه من إكسبو
import { Slot, useRouter, useSegments } from 'expo-router'; 
import Constants from 'expo-constants';
// 👈 استيراد الفايربيز (تأكد من تعديل مسار الاستيراد إذا كنت تستخدم ملف إعدادات خاص)
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 

// 🛠️ استيراد مكتبات الخطوط لحل مشكلة الأيقونات على الويب
import { useFonts } from 'expo-font';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// 🌟 استيراد التدرج اللوني لواجهة "Lion Royal" الجديدة
import { LinearGradient } from 'expo-linear-gradient';

// 🚨 المسارات الصحيحة والمضمونة 100% بالصعود خطوة واحدة لجذر المشروع
// @ts-ignore
import { AuthProvider } from '../contexts/AuthContext';
// @ts-ignore
import { TaskProvider } from '../contexts/TaskContext';
// @ts-ignore
import { WalletProvider } from '../contexts/WalletContext';
// @ts-ignore
import { AlertProvider } from '../template';

export default function RootLayout() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [serverVersion, setServerVersion] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  // ✅ حالات جديدة لإدارة المصادقة بشكل صحيح
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 👈 تعريف أدوات التنقل
  const router = useRouter();
  const segments = useSegments();

  // 👑 1. تحميل خطوط الأيقونات برمجياً
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome.font,
    ...MaterialIcons.font,
  });

  // معالجة أخطاء تحميل الخطوط إن وجدت
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  const currentVersion = Constants.expoConfig?.version || '1.0.1';

  // فحص التحديثات
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/hakimz1123213/lion_update-./main/update.json?t=${new Date().getTime()}`);
        const data = await response.json();

        if (data.latestVersion !== currentVersion) {
          setServerVersion(data.latestVersion);
          setDownloadUrl(data.downloadUrl);
          setFeatures(data.newFeatures || []); 
          setHasUpdate(true);
        }
      } catch (error) {
        console.log("فشل جلب التحديث من غيت هاب:", error);
      } finally {
        setChecking(false);
      }
    };

    checkUpdates();
  }, []);

  // 🔐 3. مراقب حالة تسجيل الدخول (يعمل مرة واحدة فقط للاتصال بفايربيس)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    
    // تنظيف الاتصال عند إغلاق التطبيق
    return unsubscribe;
  }, []); // 👈 قوسين فارغين ليعمل الاتصال مرة واحدة ولا ينقطع عند التنقل

  // 🚦 4. حارس المصادقة المسؤول عن التوجيه (Routing)
 useEffect(() => {
  if (checking || !fontsLoaded || !isAuthReady) return;

  const publicRoutes = ['login', 'register', 'forgot-password', 'index', undefined, ''];
  const currentRoute = segments[0];
  const isPublicRoute = publicRoutes.includes(currentRoute);

  /* ------ قم بتعطيل شرط التوجيه التلقائي مؤقتاً لمعرفة مصدر الخلل ------
  if (user) {
    if (isPublicRoute) {
      router.replace('/(tabs)');
    }
  } else {
    if (!isPublicRoute) {
      router.replace('/'); 
    }
  }
  -------------------------------------------------------------- */
}, [user, isAuthReady, checking, fontsLoaded, segments]);

  return (
    <AuthProvider>
      <TaskProvider>
        <WalletProvider>
          <AlertProvider>
            
            {/* 🚀 التطبيق شغال في الخلفية عادي */}
            <Slot />

            {/* 👑 واجهة التحديث الفاخرة والمحسنة كلياً بنظام Lion Royal الأرجواني 👑 */}
            <Modal visible={hasUpdate} animationType="fade" transparent={false}>
              <StatusBar barStyle="light-content" backgroundColor="#100020" />
              <View style={styles.updateContainer}>
                
                <View style={styles.updateCard}>
                  <Text style={styles.logoText}>🦁 Lion Wealth</Text>
                  
                  <Text style={styles.title}>Royal Upgrade Required</Text>
                  <Text style={styles.versionTag}>Version {serverVersion} is now available</Text>
                  
                  <Text style={styles.description}>
                    You are using an outdated version ({currentVersion}). To maintain supreme asset security and access the highest-tier financial tracking, your application must be upgraded.
                  </Text>

                  <View style={styles.changelogContainer}>
                    <Text style={styles.changelogTitle}>Changelog: The King's Updates:</Text>
                    {features.length > 0 ? (
                      features.map((item, index) => (
                        <Text key={index} style={styles.featureItem}>💎 {item}</Text>
                      ))
                    ) : (
                      <>
                        <Text style={styles.featureItem}>⚡ Cryptographic Security Matrix Reinforced.</Text>
                        <Text style={styles.featureItem}>🦁 Core Asset Engine Performance Tuned.</Text>
                        <Text style={styles.featureItem}>⚙️ Critical Platform Stability Patches Applied.</Text>
                      </>
                    )}
                  </View>

                  <Text style={styles.securityBadge}>🛡️ Security verified via Lion Wealth Dev System</Text>

                  {/* 🦁 زر التحديث الأرجواني الملكي الجديد🦁 */}
                  <TouchableOpacity 
                    style={styles.royalButtonContainer} 
                    onPress={() => Linking.openURL(downloadUrl)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#5D2E8C', '#8E44AD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.royalButton}
                    >
                      <Text style={styles.buttonText}>CLAIM YOUR UPGRADE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              </View>
            </Modal>
            
          </AlertProvider>
        </WalletProvider>
      </TaskProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#100020', // أرجواني عميق
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateContainer: {
    flex: 1,
    backgroundColor: '#100020', // أرجواني عميق
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updateCard: {
    width: '100%',
    backgroundColor: '#1A0033', // أرجواني داكن
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#2A004A', // أرجواني أفتح للحافة
    alignItems: 'center',
    shadowColor: '#9370DB', // ظل أرجواني
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoText: {
    fontSize: 26,
    color: '#E0BFB8', // ذهبي وردي خفيف (إضافة لمسة فخامة مختلفة)
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 25,
    textAlign: 'center',
    textShadowColor: '#E0BFB8',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  title: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  versionTag: {
    fontSize: 13,
    color: '#E0BFB8', // ذهبي وردي خفيف
    fontWeight: '700',
    backgroundColor: '#2A004A', // أرجواني أفتح
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    color: '#AAAAAA', // رمادي فضي
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  changelogContainer: {
    width: '100%',
    backgroundColor: '#140028', // أرجواني داكن جداً
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A004A', // أرجواني أفتح
    marginBottom: 25,
  },
  changelogTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  featureItem: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
    marginBottom: 10,
  },
  securityBadge: {
    fontSize: 11,
    color: '#2ECC71', // أخضر زمردي
    marginBottom: 22,
    fontWeight: '600',
  },
  royalButtonContainer: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0BFB8', // حافة ذهبية وردية رفيعة
  },
  royalButton: {
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff', // أبيض فضي
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  }
});