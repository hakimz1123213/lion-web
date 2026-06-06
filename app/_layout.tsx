import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';

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
  const [hasUpdate, setHasUpdate] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [serverVersion, setServerVersion] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  // 👑 1. تحميل خطوط الأيقونات برمجياً
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome.font,
    ...MaterialIcons.font,
  });

  // معالجة أخطاء تحميل الخطوط إن وجدت
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // جلب رقم نسخة التطبيق الحالية أوتوماتيكياً (مثلاً 1.0.1)
  const currentVersion = Constants.expoConfig?.version || '1.0.1';

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        // 🔥 رادار الـ GitHub الخاص بك شغال هنا بنقاء
        const response = await fetch(`https://raw.githubusercontent.com/hakimz1123213/noirwealth-update/refs/heads/main/update.json?t=${new Date().getTime()}`);
        const data = await response.json();

        if (data.latestVersion !== currentVersion) {
          setServerVersion(data.latestVersion);
          setDownloadUrl(data.downloadUrl);
          setFeatures(data.newFeatures || []); // جلب النقاط من السيرفر أوتوماتيكياً
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

  // ⏳ 2. ننتظر حتى يكتمل فحص التحديثات وتحميل الأيقونات معاً
  if (checking || !fontsLoaded) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <TaskProvider>
        <WalletProvider>
          <AlertProvider>
            
            {/* 🚀 التطبيق شغال في الخلفية عادي */}
            <Slot />

            {/* 👑 واجهة التحديث الفاخرة والمحسنة كلياً بنظام Noir 👑 */}
            <Modal visible={hasUpdate} animationType="fade" transparent={false}>
              <StatusBar barStyle="light-content" backgroundColor="#000000" />
              <View style={styles.updateContainer}>
                
                {/* الحاوية الرئيسية الفخمة */}
                <View style={styles.updateCard}>
                  <Text style={styles.logoText}>👑 NoirWealth</Text>
                  
                  <Text style={styles.title}>Update Required</Text>
                  <Text style={styles.versionTag}>Version {serverVersion} is now available</Text>
                  
                  <Text style={styles.description}>
                    You are using an outdated version ({currentVersion}). Please update to ensure absolute account security and access financial tracking assets.
                  </Text>

                  {/* ⚡ خانة قائمة التغييرات الذكية (Changelog) */}
                  <View style={styles.changelogContainer}>
                    <Text style={styles.changelogTitle}>What's New:</Text>
                    {features.length > 0 ? (
                      features.map((item, index) => (
                        <Text key={index} style={styles.featureItem}>✨ {item}</Text>
                      ))
                    ) : (
                      <>
                        <Text style={styles.featureItem}>🔒 Enhanced cryptographic security for user assets.</Text>
                        <Text style={styles.featureItem}>⚡ Optimized real-time dashboard sync speeds.</Text>
                        <Text style={styles.featureItem}>⚙️ General core stability patches applied.</Text>
                      </>
                    )}
                  </View>

                  <Text style={styles.securityBadge}>🛡️ Security verified via NoireWealth Dev System</Text>

                  {/* الزر الفاخر الممسوح الحواف */}
                  <TouchableOpacity 
                    style={styles.goldButton} 
                    onPress={() => Linking.openURL(downloadUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>UPDATE NOW</Text>
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
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateContainer: {
    flex: 1,
    backgroundColor: '#000000', // أسود ملوكي خالص في الخلفية
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updateCard: {
    width: '100%',
    backgroundColor: '#0A0A0A', // بطاقة سوداء داكنة منفصلة كلياً
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1A1A1A', // حدود خفيفة جداً لإبراز الفخامة
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    color: '#D4AF37', // ذهبي ملكي
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 25,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  versionTag: {
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: '600',
    backgroundColor: '#161204', // هالة ذهبية خافتة جداً حول رقم النسخة
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  description: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  changelogContainer: {
    width: '100%',
    backgroundColor: '#020202', // عمق أكبر لخانة الـ Changelog
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#121212',
    marginBottom: 25,
  },
  changelogTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 13,
    color: '#aaaaaa',
    lineHeight: 20,
    marginBottom: 8,
  },
  securityBadge: {
    fontSize: 11,
    color: '#4CAF50', // لون أخضر بروفيسيونال للحماية
    marginBottom: 20,
    fontWeight: '500',
  },
  goldButton: {
    backgroundColor: '#D4AF37', // اللون الذهبي الصافي
    paddingVertical: 16,
    borderRadius: 8, // زوايا حادة وأكثر عصرية للبروداكشن
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  }
});