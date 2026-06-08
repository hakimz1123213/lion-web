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
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.surfaceBorder,
            // 🛠️ تعديل 1: إعطاء أبعاد صارمة ومريحة للويب على التيليفون باش يترفع الفوق وما يلصقش
            height: Platform.OS === 'web' 
              ? 80 
              : (Platform.OS === 'ios' ? 65 + insets.bottom : 68 + (insets.bottom > 0 ? insets.bottom : 6)),
            
            // 🛠️ تعديل 2: زيادة الـ padding السفلي للويب لمنع التداخل مع أزرار السيستم أو المتصفح
            paddingBottom: Platform.OS === 'web' 
              ? 22 
              : (Platform.OS === 'ios' ? insets.bottom : (insets.bottom > 0 ? insets.bottom + 4 : 12)),
            paddingTop: 10,
          },
          tabBarActiveTintColor: Colors.gold,
          // 🛠️ تعديل 3: تغيير اللون من غامق ميت إلى رمادي فاتح وواضح جداً فوق الأسود (#888888)
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