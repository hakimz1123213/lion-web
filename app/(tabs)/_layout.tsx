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
            // ارتفاع ثابت ومتناسق
            height: Platform.OS === 'web' ? 65 : 60 + (insets.bottom || 0),
            // نحينا الـ padding السفلي الكبير باش ما يخنقش الكتيبه
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 5,
            paddingTop: 5,
          },
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: '#888888',
          // 💡 السحر راهو هنا:
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
            // 👈 هادي اللّي ترفع الكتيبه الفوق وتبعدها على مقص المتصفح!
            marginBottom: Platform.OS === 'web' ? 8 : 0, 
            marginTop: 0,
          },
          tabBarIconStyle: {
            marginTop: 0,
          }
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