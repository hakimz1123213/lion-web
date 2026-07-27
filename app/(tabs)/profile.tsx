import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Animated,
  Easing
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks & Contexts
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useTask } from '@/hooks/useTask';
import { useAlert } from '@/template';
import { TASK_TOTAL, getVIPTier } from '@/constants/config';

// Firebase
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/services/firebaseConfig';
import { ref, update } from 'firebase/database';

export default function ProfileScreen() {
  const { user, logout, updateUserProfileData }: any = useAuth();
  const { transactions } = useWallet();
  const { dailyCounter } = useTask();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isGenderPickerVisible, setIsGenderPickerVisible] = useState(false);

  // Edit Profile States
  const [editUsername, setEditUsername] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -3, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();
  }, [scaleAnim, floatAnim]);

  if (!user) return null;

  const lang = user?.language || 'EN';
  const isAR = lang === 'AR';

  const userVip = user.vip_level || 0;
  const tier = getVIPTier ? getVIPTier(userVip) : { label: `VIP ${userVip}` };

  const vipProgress = 60; 
  const nextVip = userVip + 1;

  const copyReferralCode = async () => {
    if (user.referralCode) {
      await Clipboard.setStringAsync(user.referralCode);
      showAlert('Copied!', 'Your referral code has been copied to clipboard.');
    }
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Do you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const changeLanguageSelection = async (selectedLang: 'EN' | 'AR') => {
    try {
      await update(ref(db, `users/${user.uid}`), { language: selectedLang });
      setIsLangModalVisible(false);
    } catch (err: any) {
      console.error("Language saving error:", err);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      showAlert('Permission Denied', 'You need to allow gallery access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const openEditModal = () => {
    setEditUsername(user?.username || '');
    setEditGender(user?.gender || null);
    setEditEmail(user?.email || '');
    setSelectedImageUri(user.profileImage || null);
    setIsEditModalVisible(true);
  };

  const handleSaveProfileData = async () => {
    if (!editUsername.trim()) {
      showAlert('Error', 'Username cannot be empty.');
      return;
    }
    try {
      setIsSavingProfile(true);
      let finalAvatarUrl = selectedImageUri;

      if (selectedImageUri && !selectedImageUri.startsWith('http')) {
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        const storage = getStorage();
        const imageRef = storageRef(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
        await uploadBytes(imageRef, blob);
        finalAvatarUrl = await getDownloadURL(imageRef);
      }

      // تحديث اليوزرنيم والصورة عبر الدالة الأساسية
      const result = await updateUserProfileData(editUsername, finalAvatarUrl);
      
      // حفظ باقي البيانات (الجنس فقط، الإيميل لا يتغير)
      await update(ref(db, `users/${user.uid}`), {
        gender: editGender
      });
      
      if (result.error === null) {
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

  const MenuItem = ({
    icon,
    label,
    onPress,
    iconColor = "#8A2BE2",
    rightText,
    hideBorder = false
  }: {
    icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap,
    label: string,
    onPress: () => void,
    iconColor?: string,
    rightText?: string,
    hideBorder?: boolean
  }) => (
    <View>
      <Pressable style={[styles.menuItem, isAR && { flexDirection: 'row-reverse' }]} onPress={onPress}>
        <Ionicons name={icon as any} size={22} color={iconColor} style={[styles.menuIcon, isAR ? { marginLeft: 16, marginRight: 0 } : {}]} />
        <Text style={styles.menuText}>{label}</Text>
        <View style={{ flex: 1 }} />
        {rightText && (
          <View style={[styles.menuRightPill, isAR ? { marginLeft: 10, marginRight: 0 } : {}]}>
            <Text style={styles.menuRightText}>{rightText}</Text>
          </View>
        )}
        <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={18} color="#C7C7CC" />
      </Pressable>
      {!hideBorder && <View style={styles.menuDivider} />}
    </View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#F5EEFF', '#FAFAFC', '#FAFAFC']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }, isAR && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name={isAR ? "chevron-forward" : "chevron-back"} size={22} color="#1E1E1E" />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={22} color="#1E1E1E" />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Profile Details */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Pressable onPress={openEditModal}>
              <LinearGradient colors={['#9D50FF', '#7122D6']} style={styles.avatarBox}>
                {user.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={44} color="#FFFFFF" />
                )}
              </LinearGradient>
            </Pressable>
            
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>VIP {userVip}</Text>
            </View>
          </View>

          {/* سطر اليوزرنيم مع أيقونة الجنس (Male/Female) والقلم */}
          <View style={[styles.usernameRow, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.usernameText}>{user.username || 'User'}</Text>
            
            {/* أيقونة الجنس تظهر بناءً على اختيار المستخدم */}
            {user.gender === 'Male' && (
              <Ionicons name="male" size={18} color="#007AFF" style={isAR ? { marginRight: 6 } : { marginLeft: 6 }} />
            )}
            {user.gender === 'Female' && (
              <Ionicons name="female" size={18} color="#FF2D55" style={isAR ? { marginRight: 6 } : { marginLeft: 6 }} />
            )}

            <Pressable style={[styles.editPenButton, isAR ? { marginRight: 8 } : { marginLeft: 8 }]} onPress={openEditModal}>
              <Ionicons name="pencil" size={14} color="#8A2BE2" />
            </Pressable>
          </View>
          
          <View style={[styles.premiumRow, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.premiumText}>{isAR ? 'عضو مميز' : 'Premium Member'}</Text>
            <MaterialCommunityIcons name="crown" size={16} color="#A3A3A3" style={isAR ? { marginRight: 4 } : { marginLeft: 4 }} />
          </View>

          <Pressable style={[styles.idPill, isAR && { flexDirection: 'row-reverse' }]} onPress={copyReferralCode}>
            <Text style={styles.idText}>ID: {user.referralCode || 'GENERATING'}</Text>
            <Ionicons name="copy-outline" size={12} color="#8E8E93" style={isAR ? { marginRight: 6 } : { marginLeft: 6 }} />
          </Pressable>
        </View>

        {/* Referral Code Card */}
        <Pressable style={[styles.referralCard, isAR && { flexDirection: 'row-reverse' }]} onPress={copyReferralCode}>
          <View style={[styles.refLeft, isAR && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="link-outline" size={22} color="#8A2BE2" />
            <Text style={styles.refTitle}>{isAR ? 'رمز الإحالة' : 'Referral Code'}</Text>
          </View>
          <View style={[styles.refRight, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={[styles.refCodePill, isAR && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.refCodeText}>{user.referralCode || 'GENERATING'}</Text>
              <Ionicons name="copy-outline" size={14} color="#8A2BE2" style={isAR ? { marginRight: 6 } : { marginLeft: 6 }} />
            </View>
            <Ionicons name={isAR ? "chevron-back" : "chevron-forward"} size={18} color="#C7C7CC" style={isAR ? { marginRight: 8 } : { marginLeft: 8 }} />
          </View>
        </Pressable>

        {/* Menu Items Group */}
        <View style={styles.menuGroupCard}>
          {user.uid === 'jec4njRnjSO5ZQfqz1h4X2jAqla2' && (
            <MenuItem icon="shield-half-outline" label="Admin Control Panel" onPress={() => router.push('/admin')} />
          )}
          
          <MenuItem 
            icon="globe-outline" 
            label={isAR ? "لغة / LANGUAGE" : "LANGUAGE / لغة"} 
            onPress={() => setIsLangModalVisible(true)} 
            rightText={lang === 'AR' ? 'العربية' : 'English GB'}
          />
          
          <MenuItem 
            icon="diamond-outline" 
            label={isAR ? "ترقية VIP" : "VIP Upgrade"} 
            onPress={() => router.push('/vip-upgrade')} 
          />
          
          <MenuItem 
            icon="bar-chart-outline" 
            label={isAR ? "سجل المعاملات" : "Transaction History"} 
            onPress={() => router.push('/(tabs)/wallet')} 
          />
          
          <MenuItem 
            icon="lock-closed-outline" 
            label={isAR ? "الأمان وكلمة المرور" : "Security & Password"} 
            onPress={() => router.push('/security')} 
          />

          <MenuItem 
            icon="log-out-outline" 
            label={isAR ? "تسجيل الخروج" : "Sign Out"} 
            onPress={handleLogout} 
            iconColor="#FF3B30"
            hideBorder={true}
          />
        </View>

        {/* VIP Progress Card */}
        <Animated.View style={[styles.vipProgressCard, { transform: [{ translateY: floatAnim }] }]}>
          <LinearGradient
            colors={['#F5EEFF', '#EBE0FF']}
            style={styles.vipProgressGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={[styles.vipProgressHeader, isAR && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.vipMedalIcon, isAR ? { marginLeft: 16, marginRight: 0 } : {}]}>
                <MaterialCommunityIcons name="star-shooting-outline" size={28} color="#8A2BE2" />
              </View>
              
              <View style={[styles.vipProgressTextContainer, isAR && { alignItems: 'flex-end' }]}>
                <Text style={styles.currentLevelText}>{isAR ? 'المستوى الحالي' : 'Current Level'}</Text>
                <Text style={styles.vipLevelTitle}>VIP {userVip}</Text>
                <Text style={styles.vipSubText}></Text>
              </View>
              
              <Pressable style={styles.vipNextButton} onPress={() => router.push('/vip-upgrade')}>
                <Ionicons name={isAR ? "arrow-back" : "arrow-forward"} size={20} color="#FFF" />
              </Pressable>
            </View>

            <View style={[styles.progressBarRow, isAR && { flexDirection: 'row-reverse' }]}>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${vipProgress}%` }, isAR && { right: 0, left: undefined }]} />
              </View>
              <Text style={[styles.progressPercentage, isAR ? { marginRight: 12 } : { marginLeft: 12 }]}>{vipProgress}%</Text>
            </View>
          </LinearGradient>
        </Animated.View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Personal Identity</Text>
              <Text style={styles.modalSubtitle}>Update your account details</Text>

              <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 5 }}>
                <Pressable style={styles.interactiveAvatarFrame} onPress={pickImage}>
                  {selectedImageUri ? (
                    <Image source={{ uri: selectedImageUri }} style={styles.interactiveAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={40} color="#fff" />
                  )}
                  <View style={styles.cameraPillBadge}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Username</Text>
              <TextInput 
                style={[styles.textInput, isAR && { textAlign: 'right' }]} 
                value={editUsername} 
                onChangeText={setEditUsername} 
                placeholder="Username" 
                placeholderTextColor="#8E8E93"
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <Pressable style={[styles.textInput, styles.modalDropdown, isAR && { flexDirection: 'row-reverse' }]} onPress={() => setIsGenderPickerVisible(true)}>
                <Text style={{ color: editGender ? '#1E1E1E' : '#8E8E93', fontSize: 16 }}>
                  {editGender || 'Select Gender'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#C7C7CC" />
              </Pressable>

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput 
                style={[
                  styles.textInput, 
                  isAR && { textAlign: 'right' }, 
                  { backgroundColor: '#EFEFEF', color: '#A0A0A0' } // إعطاء لون باهت ليدل على أنه غير قابل للتعديل
                ]} 
                value={editEmail} 
                editable={false} // منع تعديل الإيميل
                placeholder="email@example.com" 
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
              />

              <View style={[styles.modalActions, isAR && { flexDirection: 'row-reverse' }]}>
                <Pressable style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}>
                  <Text style={{ color: '#1E1E1E', fontWeight: '600' }}>{isAR ? 'إلغاء' : 'Cancel'}</Text>
                </Pressable>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfileData} disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isAR ? 'حفظ التغييرات' : 'Save Changes'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

        {/* Gender Picker Inline Modal */}
        <Modal visible={isGenderPickerVisible} transparent animationType="fade">
          <Pressable style={styles.genderPickerOverlay} onPress={() => setIsGenderPickerVisible(false)}>
            <View style={styles.genderPickerContent}>
              <Text style={styles.genderPickerTitle}>Select Gender</Text>
              {(['Male', 'Female', 'Other'] as Array<'Male' | 'Female' | 'Other'>).map(option => (
                <TouchableOpacity key={option} style={styles.genderOption} onPress={() => { setEditGender(option); setIsGenderPickerVisible(false); }}>
                  <Text style={styles.genderOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.genderOption} onPress={() => setIsGenderPickerVisible(false)}>
                <Text style={[styles.genderOptionText, { color: '#FF3B30', fontWeight: 'bold' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </Modal>

      {/* Language Modal */}
      <Modal visible={isLangModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isAR ? 'اختر اللغة' : 'Select Language'}</Text>
            <View style={{ height: 20 }} />

            <View style={styles.langListContainer}>
              <Pressable 
                style={[styles.langOptionItem, lang === 'EN' && styles.langOptionItemSelected]}
                onPress={() => changeLanguageSelection('EN')}
              >
                <View style={[styles.langLeft, isAR && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.flagCircle, isAR ? { marginLeft: 12 } : { marginRight: 12 }]}>
                    <Text style={styles.flagEmoji}>🇬🇧</Text>
                  </View>
                  <Text style={styles.langText}>English</Text>
                </View>
                {lang === 'EN' && <Ionicons name="checkmark" size={22} color="#4CAF50" />}
              </Pressable>

              <Pressable 
                style={[styles.langOptionItem, lang === 'AR' && styles.langOptionItemSelected]}
                onPress={() => changeLanguageSelection('AR')}
              >
                <View style={[styles.langLeft, isAR && { flexDirection: 'row-reverse' }]}>
                  <View style={[styles.flagCircle, isAR ? { marginLeft: 12 } : { marginRight: 12 }]}>
                    <Text style={styles.flagEmoji}>🇩🇿</Text>
                  </View>
                  <Text style={styles.langText}>العربية</Text>
                </View>
                {lang === 'AR' && <Ionicons name="checkmark" size={22} color="#4CAF50" />}
              </Pressable>
            </View>

            <Pressable style={[styles.cancelBtn, { marginTop: 15, width: '100%' }]} onPress={() => setIsLangModalVisible(false)}>
              <Text style={{ color: '#1E1E1E', fontWeight: 'bold' }}>{isAR ? 'إلغاء' : 'Cancel'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFC' },
  
  header: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  notificationDot: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8A2BE2',
    borderWidth: 1.5, borderColor: '#FFF'
  },
  
  profileSection: { alignItems: 'center', marginTop: 10, marginBottom: 24, paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarBox: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#7122D6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  vipBadge: {
    position: 'absolute', bottom: -8, alignSelf: 'center',
    backgroundColor: '#8A2BE2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    borderWidth: 2, borderColor: '#FFFFFF'
  },
  vipBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  
  usernameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  usernameText: { color: '#1E1E1E', fontSize: 22, fontWeight: 'bold' },
  editPenButton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#F4F0FF',
    alignItems: 'center', justifyContent: 'center'
  },

  premiumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  premiumText: { color: '#8E8E93', fontSize: 14, fontWeight: '500' },
  
  idPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F5',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  idText: { color: '#757575', fontSize: 12, fontWeight: '600' },

  referralCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  refLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refTitle: { fontSize: 15, fontWeight: '600', color: '#1E1E1E' },
  refRight: { flexDirection: 'row', alignItems: 'center' },
  refCodePill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(138, 43, 226, 0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12
  },
  refCodeText: { fontSize: 13, fontWeight: '700', color: '#8A2BE2', letterSpacing: 0.5 },

  menuGroupCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuIcon: { marginRight: 16 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E1E1E' },
  menuRightPill: { backgroundColor: '#F4F0FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 10 },
  menuRightText: { fontSize: 12, color: '#8A2BE2', fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F5' },

  vipProgressCard: { marginHorizontal: 20, marginBottom: 30, borderRadius: 20, overflow: 'hidden' },
  vipProgressGradient: { padding: 20 },
  vipProgressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  vipMedalIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(138, 43, 226, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 16
  },
  vipProgressTextContainer: { flex: 1 },
  currentLevelText: { fontSize: 12, color: '#8E8E93', fontWeight: '500', marginBottom: 2 },
  vipLevelTitle: { fontSize: 20, fontWeight: 'bold', color: '#8A2BE2', marginBottom: 4 },
  vipSubText: { fontSize: 12, color: '#757575' },
  vipNextButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#8A2BE2',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  progressBarRow: { flexDirection: 'row', alignItems: 'center' },
  progressBarContainer: { flex: 1, height: 8, backgroundColor: '#FFFFFF', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#8A2BE2', position: 'absolute', top: 0, bottom: 0 },
  progressPercentage: { fontSize: 12, fontWeight: '700', color: '#8A2BE2' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%' },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#1E1E1E', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  modalSubtitle: { color: '#757575', fontSize: 14, textAlign: 'center', marginBottom: 25, marginTop: 4 },
  
  interactiveAvatarFrame: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#8A2BE2', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  interactiveAvatarImg: { width: '100%', height: '100%', borderRadius: 45 },
  cameraPillBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#1E1E1E', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  
  inputLabel: { fontSize: 13, color: '#757575', marginBottom: 6, fontWeight: '600', paddingHorizontal: 4 },
  textInput: { backgroundColor: '#F5F5F5', color: '#1E1E1E', padding: 16, borderRadius: 14, fontSize: 16, marginBottom: 16 },
  modalDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  saveBtn: { flex: 2, backgroundColor: '#8A2BE2', padding: 16, borderRadius: 14, alignItems: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#F5F5F5', padding: 16, borderRadius: 14, alignItems: 'center' },

  langListContainer: { backgroundColor: '#F5F5F5', borderRadius: 14, overflow: 'hidden' },
  langOptionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  langOptionItemSelected: { backgroundColor: '#FFFFFF' },
  langLeft: { flexDirection: 'row', alignItems: 'center' },
  flagCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#E0E0E0' },
  flagEmoji: { fontSize: 24, lineHeight: 28, textAlign: 'center' },
  langText: { fontSize: 16, color: '#1E1E1E', fontWeight: '500' },

  genderPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  genderPickerContent: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16 },
  genderPickerTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20, color: '#1E1E1E' },
  genderOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  genderOptionText: { fontSize: 16, color: '#1E1E1E', textAlign: 'center' },
});