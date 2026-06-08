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

  // 🚀 التوجيه التلقائي
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
            // 🔒 تثبيت الشريط للويب بطريقة صارمة ومحمية
            position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            // 🚀 الارتفاع المثالي للويب (65 بيكسل) بدون زيادة
            height: Platform.OS === 'web' ? 65 : 65 + (insets.bottom || 0),
            // 🔥 الحل: مسحنا الـ Padding تماماً في الويب (0) باش يختفي هاداك السطر الصغير الخربان
            paddingBottom: Platform.OS === 'web' ? 0 : (insets.bottom || 5),
            paddingTop: 8,
          },
          // 🎯 إجبار العناصر على السنطرة العمودية والأفقية في النص بالضبط
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%', 
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: 'bold',
            marginTop: 2, 
            marginBottom: Platform.OS === 'web' ? 5 : 0, // رفع طفيف للكتابة لتتنفس
          },
          tabBarActiveTintColor: Colors.gold,
          tabBarInactiveTintColor: '#888888',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            // 2️⃣ السر العظيم هنا: حددنا lineHeight: 22 باش الإيموجي ما يبلعش المساحة!
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color: color, lineHeight: 22, textAlign: 'center' }}>📊</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color: color, lineHeight: 22, textAlign: 'center' }}>▶️</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color: color, lineHeight: 22, textAlign: 'center' }}>💰</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20, color: color, lineHeight: 22, textAlign: 'center' }}>💎</Text>
            ),
          }}
        />
      </Tabs>

      {loading && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
          <ActivityIndicator size="large" color={Colors.gold || '#D4AF37'} />
        </View>
      )}
    </View>
  );
}