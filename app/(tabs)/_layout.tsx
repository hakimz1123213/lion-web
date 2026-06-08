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
            // 🔒 استعملنا طريقة ذكية لتجنب كراش التيبيسكربت بدون استعمال fixed الخربانة في النيتيف
            position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: Platform.OS === 'web' ? 75 : 65 + (insets.bottom || 0),
            paddingBottom: Platform.OS === 'web' ? 18 : (insets.bottom || 5),
            paddingTop: 8,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: 'bold',
            marginTop: 4,
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