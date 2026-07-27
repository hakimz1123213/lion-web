import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

interface VideoAdModalProps {
  visible: boolean;
  videoUrl: string;
  onComplete: () => void;
  onClose: () => void;
}

// 🌍 قاموس النصوص بهوية مستقبليّة جيدة
const adTranslations: Record<string, Record<string, string>> = {
  EN: {
    statusBadge: "CYBER STREAM LIVE",
    waitForReward: "REWARD UNLOCK: {time}S",
    taskApproved: "SYSTEM: TASK VERIFIED",
    watchWithSound: "ENABLE HIGH-QUALITY AUDIO",
    bypassGesture: "Tap to initiate sound matrix",
    rewardReady: "CLAIM READY",
    clickConfirm: "Your reward is ready to be credited.",
    claimBtn: "CLAIM REWARD NOW ⚡",
  },
  AR: {
    statusBadge: "بث النواة المباشر",
    waitForReward: "متبقي للمكافأة: {time} ثانية",
    taskApproved: "تم اعتماد القيمة بنجاح 🎉",
    watchWithSound: "تفعيل الصوت المباشر 🔊",
    bypassGesture: "اضغط للتجاوز وتشغيل نظام الصوت",
    rewardReady: "المكافأة جاهزة للجمع 💰",
    clickConfirm: "تأكيد إيداع الأرباح المباشرة في محفظتك.",
    claimBtn: "تأكيد واستلام الأرباح ⚡",
  }
};

// 🚀 المكون الداخلي: محرك التشغيل المستقل
function AdPlayerContent({ videoUrl, onComplete, onClose, lang }: { videoUrl: string, onComplete: () => void, onClose: () => void, lang: string }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const t = adTranslations[lang] || adTranslations['EN'];

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.volume = 1.0;
  });

  const handlePlayAdWithSound = () => {
    if (player) {
      player.muted = false;
      player.volume = 1.0;
      player.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsFinished(true);
      if (player) player.pause();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeLeft]);

  return (
    <View style={styles.cyberCard}>
      
      {/* 🛑 1. زر الإغلاق العائم في الأعلى (تغيير الموضع بالكامل) */}
      <TouchableOpacity 
        style={styles.floatingCloseBtn} 
        onPress={() => { if (player) player.pause(); onClose(); }}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 📡 2. شريط النظام العلوي (HUD Header) */}
      <View style={styles.hudHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.hudStatusText}>{t.statusBadge}</Text>
        </View>

        <View style={styles.timerBadge}>
          {!isPlaying ? (
            <Text style={styles.timerText}>00:15</Text>
          ) : !isFinished ? (
            <Text style={styles.timerText}>{t.waitForReward.replace('{time}', timeLeft.toString())}</Text>
          ) : (
            <Text style={styles.successBadgeText}>{t.taskApproved}</Text>
          )}
        </View>
      </View>

      {/* 📺 3. شاشة العرض الرقمية الإطار المضيء المستقبلي */}
      {!isFinished ? (
        <View style={styles.cyberVideoFrame}>
          {/* زوايا ديكورية لمظهر النيون المستقبلي */}
          <View style={[styles.cornerAccents, styles.topLeft]} />
          <View style={[styles.cornerAccents, styles.topRight]} />
          <View style={[styles.cornerAccents, styles.bottomLeft]} />
          <View style={[styles.cornerAccents, styles.bottomRight]} />

          <VideoView 
            player={player} 
            style={[styles.videoPlayer, !isPlaying && { opacity: 0 }]} 
            contentFit="cover"
            nativeControls={false} 
          />

          {/* overlay كسر الحظر وتفعيل الصوت */}
          {!isPlaying && (
            <Pressable style={styles.unmuteOverlay} onPress={handlePlayAdWithSound}>
              <View style={styles.glowPulseCircle}>
                <Ionicons name="volume-high" size={38} color="#FFFFFF" />
              </View>
              <Text style={styles.overlayTitle}>{t.watchWithSound}</Text>
              <Text style={styles.overlaySub}>{t.bypassGesture}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        /* 🏆 4. كارت النجاح الهولوجرام الفاخر */
        <View style={styles.successCyberBox}>
          <View style={styles.successIconOuter}>
            <Ionicons name="checkmark-sharp" size={50} color="#FFFFFF" />
          </View>
          <Text style={styles.successCyberTitle}>{t.rewardReady}</Text>
          <Text style={styles.successCyberSub}>{t.clickConfirm}</Text>
        </View>
      )}

      {/* 🔘 5. زر التأكيد الرئيسي باللون الأرجواني والأبيض (Pill Shape Button) */}
      <View style={styles.bottomActionArea}>
        {isFinished && (
          <TouchableOpacity 
            style={styles.primaryPillBtn} 
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryPillBtnText}>{t.claimBtn}</Text>
            <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

// 🚀 المكون الأساسي
export default function VideoAdModal({ visible, videoUrl, onComplete, onClose }: VideoAdModalProps) {
  const { user } = useAuth();
  // @ts-ignore
  const lang = user?.language || 'EN';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalBackdrop}>
        {visible && (
          <AdPlayerContent 
            videoUrl={videoUrl} 
            onComplete={onComplete} 
            onClose={onClose} 
            lang={lang} 
          />
        )}
      </View>
    </Modal>
  );
}

// 🎨 الستايل الأرجواني والأبيض المضيء المستقبلي (Ultra Cyber Style)
const styles = StyleSheet.create({
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(8, 4, 15, 0.96)', // خلفية ليلية بنفسجية فائقة العمق
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cyberCard: { 
    width: '92%', 
    backgroundColor: '#120A21', 
    borderRadius: 24, 
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: -16,
    right: -10,
    backgroundColor: '#8B5CF6',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#120A21',
    zIndex: 99,
    elevation: 8
  },
  hudHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 4
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)'
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
    marginRight: 6
  },
  hudStatusText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  timerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1
  },
  successBadgeText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12
  },
  
  /* الإطار المستقبلي للفيديو */
  cyberVideoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#07030D',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  videoPlayer: { width: '100%', height: '100%' },
  
  /* زوايا ديكورية مستوحاة من العرض المضيء */
  cornerAccents: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#FFFFFF',
    zIndex: 10
  },
  topLeft: { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2 },

  unmuteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 10, 33, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    zIndex: 30
  },
  glowPulseCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  overlaySub: {
    color: '#A78BFA',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center'
  },

  /* شاشة المكافأة */
  successCyberBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  successIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8
  },
  successCyberTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12
  },
  successCyberSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center'
  },

  bottomActionArea: {
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
    minHeight: 45,
    justifyContent: 'center'
  },
  primaryPillBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 30, // شكل البيضوي (Pill Shape)
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
    width: '100%'
  },
  primaryPillBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5
  }
});