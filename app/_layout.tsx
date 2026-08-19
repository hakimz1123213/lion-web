import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
// 👈 استيراد أدوات التوجيه من إكسبو
import { Slot, useRouter, useSegments } from 'expo-router'; 
// 👈 استيراد الفايربيز (تأكد من تعديل مسار الاستيراد إذا كنت تستخدم ملف إعدادات خاص)
import { getAuth, onAuthStateChanged } from 'firebase/auth'; 

// 🛠️ استيراد مكتبات الخطوط لحل مشكلة الأيقونات على الويب
import { useFonts } from 'expo-font';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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

  // 🔐 2. مراقب حالة تسجيل الدخول (يعمل مرة واحدة فقط للاتصال بفايربيس)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    
    // تنظيف الاتصال عند إغلاق التطبيق
    return unsubscribe;
  }, []); // 👈 قوسين فارغين ليعمل الاتصال مرة واحدة ولا ينقطع عند التنقل

  // 🚦 3. حارس المصادقة المسؤول عن التوجيه الصحيح
  useEffect(() => {
    if (!fontsLoaded || !isAuthReady) return;

    // تحديد المسارات العامة التي لا تحتاج تسجيل دخول
    const publicRoutes = ['index', 'login', 'register', 'forgot-password'];
    const currentRoute = segments[0];
    const isPublicRoute = publicRoutes.includes(currentRoute) || !currentRoute;

    if (user) {
      // إذا كان المستخدم مسجلاً وموجوداً في شاشة عامة (مثل تسجيل الدخول)، انقله مباشرة للـ Tabs
      if (isPublicRoute) {
        router.replace('/(tabs)');
      }
    } else {
      // إذا لم يكن مسجلاً وحاول الدخول لصفحة محمية، أعده لشاشة البداية الرئيسية
      if (!isPublicRoute) {
        router.replace('/');
      }
    }
  }, [user, isAuthReady, fontsLoaded, segments]);

  return (
    <AuthProvider>
      <TaskProvider>
        <WalletProvider>
          <AlertProvider>
            {/* 🚀 التطبيق شغال في الخلفية عادي */}
            <Slot />
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
  }
});