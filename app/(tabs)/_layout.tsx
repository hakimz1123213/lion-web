import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // 🧹 تم حذف أكواد الفحص (loading & user) من هنا!
  // لماذا؟ لأن الملف الرئيسي _layout.tsx أصبح هو الحارس العام للتطبيق بأكمله
  // ولن يسمح لأي شخص بالوصول إلى هذه الصفحة إلا إذا كان مسجلاً للدخول فعلاً.

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20,
          left: 20,
          right: 20,
          backgroundColor: '#FFFFFF', // خلفية بيضاء ناصعة
          borderRadius: 40,
          height: 65,
          borderWidth: 1.5, // 👈 سمك الخط المحيط
          borderColor: '#7C3AED', // 👈 لون الخط الأرجواني الفاخر
          paddingBottom: 0,
          shadowColor: '#7C3AED', // ظل بلون أرجواني خفيف لزيادة الجمال
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarActiveTintColor: '#7C3AED', // اللون الأرجواني للأيقونة المفعلة
        tabBarInactiveTintColor: '#9CA3AF', // لون رمادي واضح للأيقونات غير المفعلة
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="play-circle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="credit-card" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => (
            <View>
              <Feather name="user" size={24} color={color} />
              <View style={styles.notificationDot} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  }
});