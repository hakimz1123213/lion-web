import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Platform,
  Animated,
  Easing,
  Image,
  ActivityIndicator
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks & Contexts 
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebaseConfig'; 

export default function ReferralScreen() {
  const { user }: any = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State لجلب بيانات الأصدقاء
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

  // Pulse Animation for the Gift Icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  // جلب قائمة الأصدقاء الذين سجلوا بالكود فعلياً من قاعدة البيانات
  useEffect(() => {
    const fetchReferrals = async () => {
      // إذا لم يكن لدى المستخدم كود بعد، نوقف التحميل
      if (!user?.referralCode) {
        setLoadingReferrals(false);
        return;
      }
      
      try {
        const usersSnap = await get(ref(db, 'users'));
        
        if (usersSnap.exists()) {
          const allUsers = usersSnap.val();
          const myReferrals = [];
          
          const myCode = user.referralCode.trim().toUpperCase();

          // البحث في كل المستخدمين عن من استخدم كود هذا الشخص
          for (const key in allUsers) {
            const u = allUsers[key];
            const uRefCode = u.referredBy ? u.referredBy.trim().toUpperCase() : "";

            if (uRefCode !== "" && uRefCode === myCode) {
              myReferrals.push(u); // إضافة المستخدم إلى القائمة إذا تطابق الكود
            }
          }
          
          setReferredUsers(myReferrals);
        } else {
          setReferredUsers([]);
        }
      } catch (error) {
        console.error("Error fetching referrals: ", error);
        setReferredUsers([]);
      } finally {
        setLoadingReferrals(false); // إيقاف علامة التحميل في كل الحالات
      }
    };

    fetchReferrals();
  }, [user]);

  if (!user) return null;

  const lang = user?.language || 'EN';
  const isAR = lang === 'AR';
  const referralCode = user.referralCode || 'GENERATING';

  const copyReferralCode = async () => {
    if (user.referralCode) {
      await Clipboard.setStringAsync(user.referralCode);
      showAlert(
        isAR ? 'تم النسخ!' : 'Copied!',
        isAR ? 'تم نسخ رمز الإحالة بنجاح.' : 'Referral code copied to clipboard.'
      );
    }
  };

  const shareReferralCode = async () => {
    try {
      const message = isAR
        ? `انضم إلي في التطبيق واستخدم كود الإحالة الخاص بي: ${referralCode}`
        : `Join me on the app using my referral code: ${referralCode}`;
      
      await Share.share({
        message: message,
      });
    } catch (error: any) {
      console.error("Error sharing:", error.message);
    }
  };

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
          <Text style={styles.headerTitle}>{isAR ? 'دعوة الأصدقاء' : 'Invite Friends'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={['rgba(157, 80, 255, 0.2)', 'rgba(113, 34, 214, 0.1)']}
              style={styles.iconCircleGradient}
            >
              <MaterialCommunityIcons name="gift-outline" size={50} color="#8A2BE2" style={styles.giftIconGlow} />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.heroTitle}>
            {isAR ? 'شارك واربح المكافآت' : 'Share & Earn Rewards'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isAR 
              ? 'قم بدعوة أصدقائك لاستخدام التطبيق واحصل على مكافآت حصرية عند تسجيلهم باستخدام الكود الخاص بك.' 
              : 'Invite your friends to the app and get exclusive rewards when they sign up with your code.'}
          </Text>
        </View>

        {/* Code Display Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{isAR ? 'رمز الإحالة الخاص بك' : 'Your Referral Code'}</Text>
          
          <View style={[styles.codeBox, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <Pressable style={styles.copyButton} onPress={copyReferralCode}>
              <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Share Button */}
          <Pressable onPress={shareReferralCode} style={styles.sharePressable}>
            <LinearGradient
              colors={['#9D50FF', '#7122D6']}
              style={[styles.shareButton, isAR && { flexDirection: 'row-reverse' }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="share-social-outline" size={22} color="#FFFFFF" style={isAR ? { marginLeft: 8 } : { marginRight: 8 }} />
              <Text style={styles.shareButtonText}>{isAR ? 'مشاركة الكود' : 'Share Code'}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* My Referrals List Card */}
        <View style={styles.referralsCard}>
          <View style={[styles.referralsHeader, isAR && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.stepsCardTitle}>
              {isAR ? 'إحالاتي الناجحة' : 'My Referrals'}
            </Text>
            <View style={styles.referralCountBadge}>
              <Text style={styles.referralCountText}>{referredUsers.length}</Text>
            </View>
          </View>

          {loadingReferrals ? (
             <View style={{ paddingVertical: 20 }}>
               <ActivityIndicator size="large" color="#8A2BE2" />
             </View>
          ) : referredUsers.length === 0 ? (
             <View style={styles.emptyReferrals}>
               <MaterialCommunityIcons name="account-group-outline" size={40} color="#D1C4E9" />
               <Text style={styles.emptyReferralsText}>
                 {isAR ? 'لم يقم أحد بالتسجيل باستخدام الكود الخاص بك حتى الآن.' : 'No one has signed up with your code yet.'}
               </Text>
             </View>
          ) : (
             referredUsers.map((friend, index) => {
               // إنشاء صورة بحرف المستخدم إذا لم يمتلك صورة شخصية
               const avatarUrl = friend.profilePic 
                  ? friend.profilePic 
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username || 'U')}&background=F4F0FF&color=8A2BE2&bold=true`;

               const vipLevel = friend.vip_level || 0;
               
               // 💡 تحديد سعر كل باقة VIP
               const getVipPrice = (level: number) => {
                 const prices: { [key: number]: number } = {
                   1: 70,    // عدل سعر VIP 1
                   2: 150,   // عدل سعر VIP 2
                   3: 300,   
                   4: 500,   
                   5: 800,  
                   6: 1400,  
                   7: 2400,  
                   8: 4100,  // سعر باقة VIP 8  
                 };
                 return prices[level] || 0;
               };

               const vipPrice = getVipPrice(vipLevel);
               
               // 💰 حساب الأرباح: 10% من سعر باقة الـ VIP
               const earnedAmount = vipPrice > 0 ? vipPrice * 0.10 : 0;

               return (
                 <View 
                   key={index} 
                   style={[
                     styles.friendRow, 
                     isAR && { flexDirection: 'row-reverse' },
                     index === referredUsers.length - 1 && { borderBottomWidth: 0 } // إخفاء الخط للسطر الأخير
                   ]}
                 >
                   <Image source={{ uri: avatarUrl }} style={styles.friendAvatar} />
                   
                   <View style={[styles.friendInfo, isAR && { alignItems: 'flex-end', marginRight: 14, marginLeft: 0 }]}>
                     <Text style={styles.friendName}>{friend.username || 'Unknown User'}</Text>
                     
                     {/* VIP Badge */}
                     <View style={[
                         styles.vipBadge, 
                         vipLevel > 0 ? styles.vipBadgeActive : styles.vipBadgeInactive
                     ]}>
                       <MaterialCommunityIcons 
                         name="crown" 
                         size={14} 
                         color={vipLevel > 0 ? "#FFD700" : "#9E9E9E"} 
                       />
                       <Text style={[
                           styles.vipBadgeText, 
                           vipLevel > 0 ? { color: '#B8860B' } : { color: '#757575' }
                       ]}>
                         VIP {vipLevel}
                       </Text>
                     </View>
                   </View>

                   {/* 💰 قسم الأرباح */}
                   <View style={[styles.earningsContainer, isAR && { alignItems: 'flex-start' }]}>
                     <Text style={styles.earningsLabel}>{isAR ? 'أرباحك' : 'Earned'}</Text>
                     <Text style={[
                       styles.earningsAmount, 
                       earnedAmount > 0 ? styles.earningsPositive : styles.earningsZero
                     ]}>
                       {earnedAmount > 0 ? `+$${earnedAmount.toFixed(2)}` : '$0.00'}
                     </Text>
                   </View>

                 </View>
               );
             })
          )}
        </View>

        {/* How it works Section */}
        <View style={styles.stepsCard}>
          <Text style={[styles.stepsCardTitle, isAR && { textAlign: 'right' }]}>
            {isAR ? 'كيف تعمل الإحالة؟' : 'How it works?'}
          </Text>

          <View style={[styles.stepRow, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={[styles.stepTextContainer, isAR && { alignItems: 'flex-end' }]}>
              <Text style={styles.stepTitle}>{isAR ? 'شارك الكود' : 'Share your code'}</Text>
              <Text style={styles.stepDescription}>{isAR ? 'أرسل رمز الإحالة لأصدقائك' : 'Send your referral code to friends'}</Text>
            </View>
          </View>

          <View style={[styles.stepRow, isAR && { flexDirection: 'row-reverse' }]}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={[styles.stepTextContainer, isAR && { alignItems: 'flex-end' }]}>
              <Text style={styles.stepTitle}>{isAR ? 'تسجيل الصديق' : 'Friend signs up'}</Text>
              <Text style={styles.stepDescription}>{isAR ? 'يقوم صديقك بإنشاء حساب باستخدام الرمز' : 'Your friend creates an account using the code'}</Text>
            </View>
          </View>

          <View style={[styles.stepRow, isAR && { flexDirection: 'row-reverse'}, { borderBottomWidth: 0 }]}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={[styles.stepTextContainer, isAR && { alignItems: 'flex-end' }]}>
              <Text style={styles.stepTitle}>{isAR ? 'احصل على المكافأة' : 'Get Rewarded'}</Text>
              <Text style={styles.stepDescription}>{isAR ? 'كلاكما يحصل على مكافأة في الرصيد' : 'Both of you receive a bonus reward'}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFC' },
  
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  iconButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  headerTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#1E1E1E'
  },

  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 20,
    marginBottom: 30,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
    backgroundColor: '#FFFFFF',
  },
  iconCircleGradient: {
    width: '100%', height: '100%', borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  giftIconGlow: {
    textShadowColor: '#9D50FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15,
  },
  heroTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 10, textAlign: 'center'
  },
  heroSubtitle: {
    fontSize: 14, color: '#757575', textAlign: 'center', lineHeight: 22
  },

  codeCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  codeLabel: {
    fontSize: 14, color: '#757575', fontWeight: '600', marginBottom: 12, textAlign: 'center'
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(138, 43, 226, 0.3)',
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  codeText: {
    flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '900', color: '#8A2BE2', letterSpacing: 3,
    textShadowColor: 'rgba(138, 43, 226, 0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5,
  },
  copyButton: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#8A2BE2',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  sharePressable: {
    borderRadius: 14,
    shadowColor: '#7122D6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 8,
  },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14,
  },
  shareButtonText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5
  },

  stepsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 4,
  },
  stepsCardTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#1E1E1E', marginBottom: 20
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F5'
  },
  stepNumberCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F0FF',
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 12,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 2,
  },
  stepNumber: {
    color: '#8A2BE2', fontSize: 15, fontWeight: '900'
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15, fontWeight: '700', color: '#1E1E1E', marginBottom: 4
  },
  stepDescription: {
    fontSize: 13, color: '#757575', lineHeight: 18
  },

  referralsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#8A2BE2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 4,
  },
  referralsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  referralCountBadge: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  referralCountText: {
    color: '#8A2BE2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyReferrals: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyReferralsText: {
    textAlign: 'center', 
    color: '#9E9E9E', 
    fontSize: 14, 
    marginTop: 12,
    lineHeight: 20
  },
  friendRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5'
  },
  friendAvatar: {
    width: 50, 
    height: 50, 
    borderRadius: 25,
    backgroundColor: '#F4F0FF',
    borderWidth: 1,
    borderColor: '#EFE5FD'
  },
  friendInfo: {
    flex: 1, 
    marginLeft: 14, 
    justifyContent: 'center'
  },
  friendName: {
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1E1E1E', 
    marginBottom: 6
  },
  vipBadge: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  vipBadgeActive: {
    backgroundColor: '#FFF8E1', 
    borderWidth: 1,
    borderColor: '#FFECB3'
  },
  vipBadgeInactive: {
    backgroundColor: '#F5F5F5', 
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  vipBadgeText: {
    fontSize: 12, 
    fontWeight: 'bold', 
    marginLeft: 4
  },

  // تنسيقات قسم الأرباح
  earningsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  earningsLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginBottom: 4,
    fontWeight: '600'
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  earningsPositive: {
    color: '#00C853', // لون أخضر عند وجود أرباح
  },
  earningsZero: {
    color: '#BDBDBD', // رمادي إذا كانت الأرباح 0
  }
});