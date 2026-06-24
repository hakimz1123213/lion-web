import React, { useState, useEffect } from 'react';
import {
  View, 
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal, 
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// 🚀 تم الاستغناء الكلي عن الاستيرادات المعطوبة لمنع ظهور المربعات البيضاء على المتصفح

import { useAuth } from '@/hooks/useAuth'; 
import { UserProfile } from '@/contexts/AuthContext'; 
import { useWallet } from '@/hooks/useWallet';
import { useTask } from '@/hooks/useTask';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GlobalStyles } from '@/constants/styles';
import { VIP_TIERS, getVIPTier, TASK_TOTAL } from '@/constants/config';

// 🔥 استيراد مكتبات التخزين السحابي للصور (لحل مشكلة الصورة السوداء في الأدمن) 🔥
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/services/firebaseConfig';
import { ref, get, update } from 'firebase/database';

const translations: Record<string, Record<string, string>> = {
  EN: {
    account: "Account", balance: "Balance", earned: "Earned", tasks: "Tasks",
    referralSystem: "REFERRAL SYSTEM", members: "Members",
    promoText: "Earn 10% Instant Cash every time your friends upgrade their VIP tier!",
    referredMembers: "REFERRED MEMBERS", noReferrals: "No referrals yet. Start growing your network!",
    invitedBy: "Invited by", resources: "RESOURCES", adminPanel: "Admin Control Panel",
    vipUpgrade: "VIP Upgrade", txHistory: "Transaction History", securityPass: "Security & Password",
    supportCenter: "Support Center", aboutUs: "About Us", languageBtn: "LANGUAGE / لغة",
    selectLanguage: "Select Language / اختر اللغة", identityTitle: "Personal Identity Info",
    identitySubtitle: "Update your account username and upload a fresh profile image avatar",
    accountUsername: "ACCOUNT USERNAME", cancel: "Cancel", secureChanges: "Secure Changes"
  },
  AR: {
    account: "الحساب الشخصي", balance: "الرصيد الحالي", earned: "إجمالي الأرباح", tasks: "المهام اليومية",
    referralSystem: "نظام الإحالة والشبكة", members: "أعضاء",
    promoText: "احصل على عمولة فورية بنسبة 10% في كل مرة يقوم فيها أصدقاؤك بترقية حساباتهم!",
    referredMembers: "الأعضاء المسجلين بواسطتك", noReferrals: "لا يوجد إحالات بعد. ابدأ في بناء شبكتك الآن!",
    invitedBy: "تمت دعوتك بواسطة", resources: "غرفة التحكم والموارد", adminPanel: "لوحة تحكم الإدارة العليا",
    vipUpgrade: "ترقية رتبة VIP", txHistory: "سجل المعاملات المالي", securityPass: "الأمان وكلمات السر",
    supportCenter: "مركز الدعم الفني 24/7", aboutUs: "حول المنصة", languageBtn: "اللغة / LANGUAGE",
    selectLanguage: "اختر لغتك المفضلة", identityTitle: "بيانات الهوية الشخصية",
    identitySubtitle: "قم بتحديث اسم المستخدم الخاص بك وتغيير صورة البروفايل الحية",
    accountUsername: "اسم المستخدم الخاص بالحساب", cancel: "إلغاء", secureChanges: "حفظ وتأمين التعديلات"
  }
};

export default function ProfileScreen() {
  // @ts-ignore
  const { user, logout, getReferredUsers, getAllUsers, updateUserProfileData } = useAuth();
  const { transactions } = useWallet();
  const { dailyCounter } = useTask();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [referredUsersList, setReferredUsersList] = useState<UserProfile[]>([]);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLangModalVisible, setIsLangModalVisible] = useState(false); 

  const [editUsername, setEditUsername] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = translations[lang] || translations['EN'];

  const ADMIN_EMAIL = "hakimbmx06@gmail.com"; 

  useEffect(() => {
    if (!user?.uid) return;

    const fetchMyNetwork = async () => {
      try {
        setIsSyncing(true);
        const res = await getReferredUsers(user.uid);
        setReferredUsersList(res || []);
      } catch (err) {
        console.error("Profile screen referrals fetching failed:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchMyNetwork();

    if (user.referredBy && user.referredBy.trim() !== "" && !user.referredBy.startsWith("none")) {
      const referrerNameRef = ref(db, `users/${user.referredBy}/username`);
      get(referrerNameRef).then((snapshot) => {
        if (snapshot.exists()) {
          setReferrerName(snapshot.val());
        }
      }).catch(err => console.error("Error getting referrer name:", err));
    } else {
      setReferrerName(null);
    }
  }, [user?.uid, user?.referredBy]);

  if (!user) return null;

  const currentTier = getVIPTier(user.vip_level || 0);

  const totalTaskRewards = transactions
    .filter((t) => t.type === 'Reward' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReferralRewards = transactions
    .filter((t) => t.type === 'Referral Bonus' && t.status === 'Completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const copyReferralCode = async () => {
    if (user.referralCode) {
      await Clipboard.setStringAsync(user.referralCode);
      showAlert(lang === 'AR' ? 'تم النسخ!' : 'Copied!', lang === 'AR' ? 'كود الإحالة الخاص بك جاهز للمشاركة.' : 'Your referral code is ready to share.');
    }
  };

  const handleLogout = () => {
    showAlert(lang === 'AR' ? 'تسجيل الخروج' : 'Sign Out', lang === 'AR' ? 'هل تريد تسجيل الخروج من تطبيق NoirWealth؟' : 'Do you want to log out of NoirWealth?', [
      { text: lang === 'AR' ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: lang === 'AR' ? 'خروج' : 'Log Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert('Permission Denied', 'You need to allow gallery access to update your workspace avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.5, // 👈 تقليل الجودة لرفع صاروخي
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri); // 👈 احتفاظ بمسار الهاتف فقط
    }
  };

  // 🚀 الدالة السحرية المعدلة لرفع الصورة السحابي 🚀
  const handleSaveProfileData = async () => {
    if (!editUsername.trim()) {
      showAlert('Error', 'Username field cannot be empty.');
      return;
    }
    
    try {
      setIsSavingProfile(true);
      let finalAvatarUrl = selectedImageUri;

      // 🔥 إذا كانت الصورة جديدة من الهاتف ومو رابط انترنت، نرفعها لـ Storage 🔥
      if (selectedImageUri && !selectedImageUri.startsWith('http')) {
        try {
          const response = await fetch(selectedImageUri);
          const blob = await response.blob();
          const storage = getStorage();
          const imageRef = storageRef(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
          
          await uploadBytes(imageRef, blob);
          finalAvatarUrl = await getDownloadURL(imageRef); // 👈 الرابط القصير العالمي
        } catch (uploadError) {
          console.error("Avatar Upload Error:", uploadError);
          showAlert("Upload Failed", "حدث خطأ أثناء رفع صورتك الشخصية. يرجى المحاولة لاحقاً.");
          setIsSavingProfile(false);
          return;
        }
      }

      // تمرير الرابط القصير لدالة التحديث في AuthContext
      const result = await updateUserProfileData(editUsername, finalAvatarUrl);
      
      if (result.error === null) {
        showAlert(lang === 'AR' ? 'تم تحديث الهوية' : 'Identity Updated', lang === 'AR' ? 'تم حفظ وتأمين بيانات ملفك الشخصي بنجاح.' : 'Your profile details have been secured successfully.');
        setIsEditModalVisible(false);
      } else {
        showAlert('Error', result.error);
      }
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changeLanguageSelection = async (selectedLang: 'EN' | 'AR') => {
    try {
      await update(ref(db, `users/${user.uid}`), { language: selectedLang });
      setIsLangModalVisible(false);
    } catch (err: any) {
      console.error("Language saving error:", err);
    }
  };

  const SUPPORT_LINKS = {
    liveChat: 'https://tawk.to/your-live-chat-link', 
    telegram: 'https://t.me/noirwealthapp',
    email: 'noirewealthauth@gmail.com', 
  };

  const handleOpenSupportURL = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Error opening support link:", err));
    setIsSupportModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.title}>{t.account}</Text>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={{ fontSize: 16 }}>🛑</Text>
          </Pressable>
        </View>

        {/* User Info Card */}
        <View style={[styles.profileCard, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.avatarBox, { borderColor: currentTier.color }]}>
            {/* @ts-ignore */}
            {user.profileImage ? (
              // @ts-ignore
              <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: currentTier.color }]}>
                {user.username ? user.username[0].toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end', marginRight: 15 }]}>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.usernameText}>{user.username}</Text>
              <Pressable onPress={() => { 
                setEditUsername(user.username); 
                setSelectedImageUri((user as any).profileImage || null); 
                setIsEditModalVisible(true); 
              }}>
                <Text style={{ fontSize: 14 }}>✏️</Text>
              </Pressable>
            </View>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
          {user.vip_level > 0 && (
            <View style={[styles.vipBadge, { backgroundColor: currentTier.color + '22', borderColor: currentTier.color }]}>
              <Text style={[styles.vipBadgeText, { color: currentTier.color }]}>{currentTier.label}</Text>
            </View>
          )}
        </View>

        {/* Stats Dashboard */}
        <View style={[styles.statsRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.gold }]}>${user.balance ? user.balance.toFixed(2) : '0.00'}</Text>
            <Text style={styles.statLabel}>{t.balance}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.success }]}>${totalTaskRewards.toFixed(2)}</Text>
            <Text style={styles.statLabel}>{t.earned}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.info }]}>{dailyCounter || 0}/{TASK_TOTAL}</Text>
            <Text style={styles.statLabel}>{t.tasks}</Text>
          </View>
        </View>

        {/* Referral System Section */}
        <View style={[GlobalStyles.cardGold, styles.section]}>
          <View style={[GlobalStyles.spaceBetween, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.sectionHeading}>{t.referralSystem}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{referredUsersList.length} {t.members}</Text>
            </View>
          </View>

          <Pressable style={styles.codeContainer} onPress={copyReferralCode}>
            <Text style={styles.codeDisplay}>{user.referralCode || 'GENERATING...'}</Text>
            <Text style={{ fontSize: 14 }}>📋</Text>
          </Pressable>

          {referrerName ? (
            <View style={[{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: 12, borderRadius: Radius.md, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={{ color: Colors.gold, fontSize: 13, fontWeight: 'bold' }}>
                🤝 {t.invitedBy}: {referrerName}
              </Text>
            </View>
          ) : (
            <Text style={[styles.promoText, lang === 'AR' && { textAlign: 'right' }]}>{t.promoText}</Text>
          )}

          <View style={[styles.earningsBanner, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Text style={{ fontSize: 14 }}>⭐</Text>
            <Text style={styles.earningsInfo}>
              {lang === 'AR' ? 'إجمالي أرباح الإحالة:' : 'Total Referral Profits:'} <Text style={{ color: Colors.gold, fontWeight: 'bold' }}>${totalReferralRewards.toFixed(2)}</Text>
            </Text>
          </View>

          <View style={styles.membersBox}>
            <Text style={[styles.membersHeader, lang === 'AR' && { textAlign: 'right' }]}>{t.referredMembers}</Text>
            {isSyncing ? (
              <ActivityIndicator color={Colors.gold} style={{ margin: 20 }} />
            ) : referredUsersList.length > 0 ? (
              referredUsersList.map((m, idx) => {
                const mTier = getVIPTier(m.vip_level || 0);
                return (
                  <View key={m.uid}>
                    <View style={[styles.memberRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                      <View style={[styles.miniAvatar, { backgroundColor: m.vip_level > 0 ? mTier.color + '22' : '#111' }]}>
                        <Text style={{ color: m.vip_level > 0 ? mTier.color : '#444', fontWeight: 'bold' }}>{m.username ? m.username[0].toUpperCase() : 'U'}</Text>
                      </View>
                      <View style={[{ flex: 1 }, lang === 'AR' && { alignItems: 'flex-end', marginRight: 12 }]}>
                        <Text style={styles.memberName}>{m.username}</Text>
                        <Text style={styles.memberMeta}>VIP {m.vip_level || 0} • ${m.balance ? m.balance.toFixed(2) : '0.00'}</Text>
                      </View>
                      {m.vip_level > 0 && (
                        <View style={[styles.mBadge, { borderColor: mTier.color }]}>
                          <Text style={{ color: mTier.color, fontSize: 10 }}>{mTier.label}</Text>
                        </View>
                      )}
                    </View>
                    {idx < referredUsersList.length - 1 && <View style={ViewStyles.listDivider} />}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>{t.noReferrals}</Text>
            )}
          </View>
        </View>

        {/* App Actions / Resources */}
        <View style={[GlobalStyles.card, styles.section]}>
          <Text style={[styles.sectionHeading, lang === 'AR' && { textAlign: 'right' }]}>{t.resources}</Text>
          
          {user.email === ADMIN_EMAIL && (
            <Pressable 
              style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: '#111', marginBottom: 5 }, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
              onPress={() => router.push('/admin')}
            >
              <View style={[styles.actionLeft, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <Text style={{ fontSize: 14 }}>🔑</Text>
                <Text style={[styles.actionLabel, { color: Colors.gold, fontWeight: 'bold' }]}>{t.adminPanel}</Text>
              </View>
              <Text style={{ color: '#333', fontSize: 14 }}>{lang === 'AR' ? '◀' : '▶'}</Text>
            </Pressable>
          )}

          <Pressable 
            style={[styles.actionRow, { backgroundColor: 'rgba(212, 175, 55, 0.03)', borderRadius: 12, paddingHorizontal: 10, marginVertical: 4 }, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
            onPress={() => setIsLangModalVisible(true)}
          >
            <View style={[styles.actionLeft, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={{ fontSize: 14 }}>🌐</Text>
              <Text style={[styles.actionLabel, { color: Colors.gold, fontWeight: 'bold' }]}>{t.languageBtn}</Text>
            </View>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Text style={{ color: '#444', fontSize: 12, fontWeight: 'bold' }}>{lang === 'AR' ? 'العربية 🇩🇿' : 'English 🇬🇧'}</Text>
              <Text style={{ color: '#151515', fontSize: 14 }}>{lang === 'AR' ? '◀' : '▶'}</Text>
            </View>
          </Pressable>

          {[
            { icon: '💎', label: t.vipUpgrade, route: '/vip-upgrade' },
            { icon: '📊', label: t.txHistory, route: '/(tabs)/wallet' },
            { icon: '🛡️', label: t.securityPass, route: '/security' },
            { icon: '💬', label: t.supportCenter, onPressCustom: () => setIsSupportModalVisible(true) },
            { icon: 'ℹ️', label: t.aboutUs, url: 'https://noir-879ad.web.app/' },
          ].map((item) => (
            <Pressable 
              key={item.label} 
              style={[styles.actionRow, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
              onPress={() => {
                if (item.onPressCustom) {
                  item.onPressCustom(); 
                } else if (item.route) {
                  router.push(item.route as any);
                } else if (item.url) {
                  Linking.openURL(item.url).catch(err => console.error("Error opening link:", err));
                }
              }}
            >
              <View style={[styles.actionLeft, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
                <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                <Text style={[styles.actionLabel, item.label === t.vipUpgrade && { color: Colors.gold, fontWeight: 'bold' }]}>
                  {item.label}
                </Text>
              </View>
              <Text style={{ color: '#151515', fontSize: 14 }}>{lang === 'AR' ? '◀' : '▶'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ─── 📝 مودال تعديل البيانات الشخصية ──────────────── */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t.identityTitle}</Text>
            <Text style={styles.modalSubtitle}>{t.identitySubtitle}</Text>

            <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 5 }}>
              <Pressable style={styles.interactiveAvatarFrame} onPress={pickImage}>
                {selectedImageUri ? (
                  <Image source={{ uri: selectedImageUri }} style={styles.interactiveAvatarImg} />
                ) : (
                  <View style={styles.interactiveAvatarPlaceholder}>
                    <Text style={{ fontSize: 24 }}>📷</Text>
                  </View>
                )}
                <View style={styles.cameraPillBadge}>
                  <Text style={{ fontSize: 10, color: '#000' }}>🔼</Text>
                </View>
              </Pressable>
              <Text style={{ color: '#555', fontSize: 10, fontWeight: 'bold', marginTop: 8 }}>CLICK CIRCLE TO UPLOAD IMAGE</Text>
            </View>

            <Text style={[styles.inputLabel, lang === 'AR' && { textAlign: 'right' }]}>{t.accountUsername}</Text>
            <TextInput 
              style={[styles.textInput, lang === 'AR' && { textAlign: 'right' }]} 
              value={editUsername} 
              onChangeText={setEditUsername} 
              placeholder="Username" 
              placeholderTextColor="#333"
            />

            <View style={[styles.modalActions, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Pressable style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{t.cancel}</Text>
              </Pressable>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfileData} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>{t.secureChanges}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── 🌍 مودال اختيار اللغة ──────────────── */}
      <Modal visible={isLangModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            <View style={{ height: 20 }} />

            <Pressable 
              style={[styles.langOptionCard, lang === 'EN' && { borderColor: Colors.gold, backgroundColor: '#111' }]}
              onPress={() => changeLanguageSelection('EN')}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>English 🇬🇧</Text>
              {lang === 'EN' && <Text style={{ fontSize: 14 }}>✅</Text>}
            </Pressable>

            <Pressable 
              style={[styles.langOptionCard, lang === 'AR' && { borderColor: Colors.gold, backgroundColor: '#111' }, { flexDirection: 'row-reverse' }]}
              onPress={() => changeLanguageSelection('AR')}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>العربية 🇩🇿</Text>
              {lang === 'AR' && <Text style={{ fontSize: 14 }}>✅</Text>}
            </Pressable>

            <Pressable style={[styles.cancelBtn, { marginTop: 15, width: '100%' }]} onPress={() => setIsLangModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── 📞 شاشة الدعم الفني ──────────────── */}
      <Modal
        visible={isSupportModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsSupportModalVisible(false)}
      >
        <View style={[styles.supportModalContainer, { paddingTop: insets.top }]}>
          <View style={[styles.supportHeader, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
            <Pressable onPress={() => setIsSupportModalVisible(false)} style={styles.supportBackBtn}>
              <Text style={{ color: Colors.gold, fontSize: 16 }}>{lang === 'AR' ? '▶' : '◀'}</Text>
            </Pressable>
            <Text style={styles.supportHeaderTitle}>{t.supportCenter}</Text>
            <View style={{ width: 44 }} /> 
          </View>

          <ScrollView contentContainerStyle={styles.supportScrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.supportWelcomeBox, lang === 'AR' && { alignItems: 'flex-end' }]}>
              <Text style={styles.supportMainTitle}>{lang === 'AR' ? 'كيف يمكننا مساعدتك؟' : 'How can we help you?'}</Text>
              <Text style={[styles.supportSubtitle, lang === 'AR' && { textAlign: 'right' }]}>{t.supportSubtitle}</Text>
            </View>

            <Pressable 
              style={({ pressed }) => [styles.supportHeroCard, pressed && styles.supportCardPressed, lang === 'AR' && { flexDirection: 'row-reverse' }]}
              onPress={() => handleOpenSupportURL(SUPPORT_LINKS.liveChat)}
            >
              <View style={styles.heroIconCircle}>
                <Text style={{ fontSize: 18 }}>💬</Text>
              </View>
              <View style={[{ flex: 1, gap: 4 }, lang === 'AR' && { alignItems: 'flex-end', marginRight: 16 }]}>
                <Text style={styles.heroCardTitle}>Live Chat Support</Text>
                <Text style={styles.heroCardDesc}>Instant response with our support agents right now</Text>
              </View>
              <Text style={{ color: '#333', fontSize: 16 }}>{lang === 'AR' ? '◀' : '▶'}</Text>
            </Pressable>

            <View style={[styles.supportGridRow, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              <Pressable 
                style={({ pressed }) => [styles.supportGridCard, pressed && styles.supportCardPressed]}
                onPress={() => handleOpenSupportURL(SUPPORT_LINKS.telegram)}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(0, 136, 204, 0.05)', borderColor: '#0088cc44' }]}>
                  <Text style={{ fontSize: 20 }}>✈️</Text>
                </View>
                <Text style={styles.supportGridCardTitle}>Telegram</Text>
                <Text style={styles.gridCardDesc}>Join our official secure community</Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [styles.supportGridCard, pressed && styles.supportCardPressed]}
                onPress={() => handleOpenSupportURL(SUPPORT_LINKS.email)}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: 'rgba(212, 175, 55, 0.05)', borderColor: 'rgba(212, 175, 55, 0.2)' }]}>
                  <Text style={{ fontSize: 20 }}>✉️</Text>
                </View>
                <Text style={styles.supportGridCardTitle}>Email Ticket</Text>
                <Text style={styles.gridCardDesc}>Send an official financial claim</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const ViewStyles = StyleSheet.create({
  listDivider: { height: 1, backgroundColor: '#0a0a0a' }
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 15, margin: Spacing.lg, padding: 20, backgroundColor: '#0a0a0a', borderRadius: Radius.xl, borderWidth: 1, borderColor: '#111' },
  avatarBox: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 30 },
  avatarInitial: { fontSize: 24, fontWeight: 'bold' },
  usernameText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emailText: { color: '#444', fontSize: 13, marginTop: 2 },
  vipBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  vipBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#0a0a0a', padding: 15, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1, borderColor: '#111' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#333', fontSize: 10, marginTop: 5, fontWeight: 'bold' },

  section: { marginBottom: 20 },
  sectionHeading: { color: '#333', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 15 },
  
  countPill: { backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  countText: { color: Colors.gold, fontSize: 10, fontWeight: 'bold' },
  
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', padding: 15, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.goldDim, marginBottom: 10 },
  codeDisplay: { color: Colors.gold, fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  promoText: { color: '#666', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  
  earningsBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(212, 175, 55, 0.05)', padding: 15, borderRadius: Radius.md, marginBottom: 20 },
  earningsInfo: { color: '#fff', fontSize: 14 },

  membersBox: { backgroundColor: '#000', borderRadius: Radius.md, borderWidth: 1, borderColor: '#111', overflow: 'hidden' },
  membersHeader: { color: '#222', fontSize: 9, fontWeight: 'bold', padding: 10, backgroundColor: '#050505' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  memberName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  memberMeta: { color: '#444', fontSize: 11, marginTop: 2 },
  mBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emptyText: { color: '#222', fontSize: 11, textAlign: 'center', padding: 20 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionLabel: { color: '#fff', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#080808', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#151515' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#222', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 25, lineHeight: 18 },
  inputLabel: { color: '#333', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  textInput: { backgroundColor: '#000', color: Colors.gold, padding: 16, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#121212', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  saveBtn: { flex: 2, backgroundColor: Colors.gold, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#111', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  interactiveAvatarFrame: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: Colors.gold, position: 'relative', overflow: 'visible', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  interactiveAvatarImg: { width: '100%', height: '100%', borderRadius: 45 },
  interactiveAvatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505', borderRadius: 45 },
  cameraPillBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.gold, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#080808' },

  supportModalContainer: { flex: 1, backgroundColor: '#000000' },
  supportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#0c0c0c' },
  supportBackBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  supportHeaderTitle: { color: Colors.gold, fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  supportScrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  supportWelcomeBox: { marginTop: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.sm },
  supportMainTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', letterSpacing: 0.5 },
  supportSubtitle: { color: '#555555', fontSize: 13, lineHeight: 20 },
  supportHeroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050505', borderRadius: 16, padding: 20, gap: 16, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.15)', marginBottom: Spacing.lg },
  heroIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212, 175, 55, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' },
  heroCardTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  heroCardDesc: { color: '#444444', fontSize: 11, lineHeight: 16 },
  supportGridRow: { flexDirection: 'row', gap: 12, width: '100%' },
  supportGridCard: { flex: 1, backgroundColor: '#050505', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#0c0c0c', minHeight: 160 },
  supportGridCardTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  gridIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  gridCardDesc: { color: '#333333', fontSize: 10, textAlign: 'center', lineHeight: 14, paddingHorizontal: 4 },
  supportCardPressed: { backgroundColor: '#0a0a0a', borderColor: Colors.goldDim },
  langOptionCard: { width: '100%', backgroundColor: '#050505', borderWidth: 1, borderColor: '#151515', padding: 18, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
});