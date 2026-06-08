import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig'; 

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 📡 مراقبة الجلسة لتأمين الحساب
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🚀 التوجيه التلقائي الذكي والآمن لصفحة الدخول
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      if (!user) {
        router.replace('/login');
      }
    }, 10);
    return () => clearTimeout(id);
  }, [user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Tabs
     screenOptions={{
          headerShown: false,
          tabBarStyle: Platform.OS === 'web' 
            ? {
                // 🌐 إعدادات الويب الإجبارية
                backgroundColor: Colors.surface,
                borderTopWidth: 1,
                borderTopColor: Colors.surfaceBorder,
                position: 'fixed' as any, // 👈 التعديل هنا: زدنا as any باش نسكتو الـ TypeScript
                bottom: 0,
                left: 0,
                right: 0,
                height: 75, // ارتفاع ثابت
                paddingBottom: 25, // رفعنا الكتيبه 25 بيكسل
                paddingTop: 8,
              }
            : {
                // 📱 إعدادات التطبيق (Android/iOS) العادية
                backgroundColor: Colors.surface,
                borderTopWidth: 1,
                borderTopColor: Colors.surfaceBorder,
                height: 65 + (insets.bottom || 0),
                paddingBottom: insets.bottom || 5,
                paddingTop: 5,
              },
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: '#888888',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color: color }}>📊</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color: color }}>▶️</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color: color }}>💰</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color: color }}>💎</Text>
            ),
          }}
        />
      </Tabs>

      {/* شاشة التحميل كـ غطاء (Overlay) فوق الـ Tabs لمنع كراش الـ Pre-render */}
      {loading && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
          <ActivityIndicator size="large" color={Colors.gold || '#D4AF37'} />
        </View>
      )}
    </View>
  );
}