import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

// Hooks & Config
import { useAuth } from '../../hooks/useAuth';
import { useTask } from '../../hooks/useTask';
import { Colors } from '../../constants/theme';
import { TASK_TOTAL, getVIPTier } from '../../constants/config';

import VideoAdModal from '../components/VideoAdModal';

const { width } = Dimensions.get('window');

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ شاشة المهام
const taskTranslations: Record<string, Record<string, string>> = {
  EN: {
    dailyTasks: "Daily Tasks",
    premiumZone: "PREMIUM ZONE",
    upgradeToUnlock: "Upgrade to VIP to unlock daily earning tasks.",
    upgradeBtn: "UPGRADE TO UNLOCK",
    nextRefresh: "Next Refresh In",
    reachedLimit: "You have reached your daily limit. Come back tomorrow!",
    tasksLeft: "tasks left for reward",
    slotDone: "Done",
    loading: "Loading tasks node..."
  },
  AR: {
    dailyTasks: "المهام اليومية",
    premiumZone: "المنطقة الممتازة 🔒",
    upgradeToUnlock: "قم بترقية حسابك إلى رتبة VIP لفتح المهام اليومية وبدء جني الأرباح الحية.",
    upgradeBtn: "اضغط هنا للترقية والفتح فوراً",
    nextRefresh: "التحديث القادم للمهام خلال",
    reachedLimit: "لقد وصلت إلى الحد الأقصى للمهام اليومية! عد مجدداً غداً.",
    tasksLeft: "مهام متبقية للحصول على المكافأة الملوكية",
    slotDone: "مكتملة",
    loading: "جاري تحميل رادار المهام..."
  }
};

// 📺 حوض إعلانات الشركات الكبرى الدوارة
const ADS_POOL = [
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Coca-Cola-15-Second-Spec-Commercial-Sigh_Media_0qSEWvvA6gU_001_1080p.mp4?alt=media&token=a70fc5df-edff-48b2-b598-5a6696855b6d",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Donut-15-Second-Ad_Media_JDjhs9hF9f0_001_1080p.mp4?alt=media&token=b5fb7134-69e3-4067-be4c-88266edc9019",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Media_FY3vWQ4Q05M_001_1080p.mp4?alt=media&token=db42c019-ba12-4da0-966b-7166a2aa98d9",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Media_QfyZ71Qpbh4_001_1080p.mp4?alt=media&token=7f9d5566-ca3d-429f-85dd-e359897e41d7",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Media_j4B3woBHbF8_001_1080p.mp4?alt=media&token=bc2197c3-5168-4cb6-b3ed-0804e7945765",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_Self-Control-Who-I-McDonald-s_Media_79phlhutGLg_001_1080p.mp4?alt=media&token=b72171f9-4328-4ba5-a7a7-cb3c75d4de7b",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTube_spotify-motion-graphics-ad_Media_eH8t7ZQQaNg_001_1080p.mp4?alt=media&token=a48fe1fe-2445-4bfc-98d6-0cd000e4da1a",
  "https://firebasestorage.googleapis.com/v0/b/noir-879ad.firebasestorage.app/o/YTDown_YouTubvideo-ads_Media_1Wx9ftCUx0o_001_1080p.mp4?alt=media&token=77c1c668-f329-471c-bb7d-4ae0329cf85a"
];

export default function TasksScreen() {
  const { user }: any = useAuth();
  const { 
    dailyCounter, tasksDoneToday, watchingIndex, 
    timeRemaining, isLoading, startWatchingVideo, 
    completeVideo, cancelVideo 
  }: any = useTask();
  
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // @ts-ignore
  const lang = user?.language || 'EN';
  const t = taskTranslations[lang] || taskTranslations['EN'];

  const promoPlayer = useVideoPlayer("https://files.x.moe/oskka8.mp4", (p) => {
    p.loop = true;
    if (user?.vip_level === 0) p.play();
  });

  if (!user || isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (user.vip_level === 0) {
    return (
      <View style={styles.lockedScreen}>
        <VideoView player={promoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
        <View style={styles.lockedOverlay}>
          {/* 🛠️ استبدال القفل الداخلي المكسور بإيموجي قفل نصي صلب */}
          <View style={styles.lockIconBox}><Text style={{ fontSize: 32 }}>🔒</Text></View>
          <Text style={styles.lockedTitle}>{t.premiumZone}</Text>
          <View style={styles.goldDivider} />
          <Text style={styles.lockedDesc}>{t.upgradeToUnlock}</Text>
          <Pressable style={styles.heroUpgradeBtn} onPress={() => router.push('/vip-upgrade')}>
            <Text style={styles.heroUpgradeText}>{t.upgradeBtn}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={[styles.header, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
          <Text style={styles.title}>{t.dailyTasks}</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{dailyCounter}/{TASK_TOTAL}</Text>
          </View>
        </View>

        {/* Cooldown ليميت الـ 24 ساعة اليومي */}
        {tasksDoneToday ? (
          <View style={styles.cooldownCard}>
            {/* 🛠️ استبدال قفل التحديث بإيموجي ساعة رملية فاخرة */}
            <View style={styles.cooldownIconBox}><Text style={{ fontSize: 32 }}>⏳</Text></View>
            <Text style={styles.cooldownTitle}>{t.nextRefresh}</Text>
            <Text style={styles.timerDisplay}>{timeRemaining}</Text>
            <Text style={styles.cooldownDesc}>{t.reachedLimit}</Text>
          </View>
        ) : (
          <View>
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${(dailyCounter / TASK_TOTAL) * 100}%` }]} />
              </View>
              <Text style={[styles.progressLabel, lang === 'AR' && { textAlign: 'right' }]}>
                {TASK_TOTAL - dailyCounter} {t.tasksLeft}
              </Text>
            </View>

            {/* شبكة عرض المربعات الـ 10 الكبيرة والمنسقة بالكامل */}
            <View style={[styles.grid, lang === 'AR' && { flexDirection: 'row-reverse' }]}>
              {Array.from({ length: TASK_TOTAL }).map((_, i) => {
                const isDone = i < dailyCounter;
                const isNext = i === dailyCounter;

                let currentBoxStyle = styles.videoSlot;
                if (isDone) {
                  currentBoxStyle = { ...styles.videoSlot, ...styles.videoSlotDone };
                } else if (isNext) {
                  currentBoxStyle = { ...styles.videoSlot, ...styles.videoSlotNext };
                } else {
                  currentBoxStyle = { ...styles.videoSlot, ...styles.videoSlotLocked };
                }

                return (
                  <Pressable
                    key={i}
                    style={currentBoxStyle}
                    onPress={() => isNext ? startWatchingVideo(i) : null}
                    disabled={!isNext}
                  >
                    {/* 🛠️ استبدال مكونات الأيقونات الخارجية المكسورة بإيموجيات نصية مع الحفاظ على المقاسات والستايل النظيف للألوان التفاعلية */}
                    {isDone ? (
                      <Text style={{ fontSize: 18 }}>✅</Text>
                    ) : isNext ? (
                      <Text style={{ fontSize: 20 }}>▶️</Text>
                    ) : (
                      <Text style={{ fontSize: 16, opacity: 0.4 }}>🔒</Text>
                    )}
                    <Text style={[styles.slotNum, isNext && { color: '#000' }, !isNext && !isDone && { color: '#555' }]}>
                      #{i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {watchingIndex !== null && (
        <VideoAdModal 
          visible={watchingIndex !== null}
          videoUrl={ADS_POOL[watchingIndex % ADS_POOL.length]}
          onComplete={completeVideo}
          onClose={cancelVideo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  counterBadge: { backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: '#D4AF37', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  counterText: { color: '#D4AF37', fontWeight: 'bold' },
  lockedScreen: { flex: 1, backgroundColor: '#000' },
  lockedOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  lockIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D4AF37', marginBottom: 20 },
  lockedTitle: { color: '#D4AF37', fontSize: 32, fontWeight: 'bold', letterSpacing: 3 },
  goldDivider: { width: 50, height: 2, backgroundColor: '#D4AF37', marginVertical: 20 },
  lockedDesc: { color: '#ccc', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  heroUpgradeBtn: { backgroundColor: '#D4AF37', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15 },
  heroUpgradeText: { color: '#000', fontWeight: 'bold' },
  progressSection: { paddingHorizontal: 25, marginBottom: 25 },
  progressBg: { height: 6, backgroundColor: '#111', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#D4AF37' },
  progressLabel: { color: '#666', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, justifyContent: 'center' },
  
  videoSlot: { 
    width: '18%', 
    aspectRatio: 1, 
    borderRadius: 16, 
    backgroundColor: '#080808', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5, 
    borderColor: '#1e1e1e' 
  },
  videoSlotDone: { 
    borderColor: '#4CAF50', 
    backgroundColor: 'rgba(76,175,80,0.04)' 
  },
  videoSlotNext: { 
    backgroundColor: '#D4AF37', 
    borderColor: '#D4AF37' 
  },
  videoSlotLocked: { 
    backgroundColor: '#040404', 
    borderColor: '#141414' 
  },
  slotNum: { color: '#555', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  cooldownCard: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 50 },
  cooldownIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  cooldownTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  timerDisplay: { color: '#D4AF37', fontSize: 44, fontWeight: 'bold', marginVertical: 15 },
  cooldownDesc: { color: '#666', textAlign: 'center' },
});