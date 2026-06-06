import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth'; // 👈 استيراد الأوث لالتقاط الرادار السحابي للغة

interface VideoAdModalProps {
  visible: boolean;
  videoUrl: string;
  onComplete: () => void;
  onClose: () => void;
}

// 🌍 قاموس التعريب الفوري والمدمج محلياً لـ مودال الإعلانات لضمان عدم حدوث كراشات
const adTranslations: Record<string, Record<string, string>> = {
  EN: {
    secureAudio: "🔒 Secure Audio Connection Ready",
    waitForReward: "Wait for reward: {time}s",
    taskApproved: "🎉 Task Approved!",
    watchWithSound: "WATCH AD WITH SOUND",
    bypassGesture: "Direct user gesture to bypass browser block",
    rewardReady: "REWARD READY",
    clickConfirm: "Click confirm below to claim your rewards.",
    claimBtn: "CONFIRM & CLAIM 💰",
    cancelTask: "Cancel Task"
  },
  AR: {
    secureAudio: "🔒 رادار الصوت الآمن جاهز للاتصال",
    waitForReward: "انتظر لاحتساب المكافأة: {time} ثانية",
    taskApproved: "🎉 تم قبول واعتماد المهمة بنجاح!",
    watchWithSound: "تشغيل الإعلان مع الصوت 🔊",
    bypassGesture: "إيماءة مباشرة لتجاوز حظر الصوت في النظام",
    rewardReady: "المكافأة جاهزة درك 💰",
    clickConfirm: "اضغط على تأكيد بالأسفل لضخ الأرباح لداخل محفظتك.",
    claimBtn: "تأكيد واستلام الأرباح 💰",
    cancelTask: "إلغاء المهمة وتراجع"
  }
};

// 🚀 1. المكون الداخلي المنفصل: يضمن ولادة مشغل الفيديو في نفس ثانية فتح الشاشة فقط!
function AdPlayerContent({ videoUrl, onComplete, onClose, lang }: { videoUrl: string, onComplete: () => void, onClose: () => void, lang: string }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const t = adTranslations[lang] || adTranslations['EN'];

  // المشغل يبدأ هنا كلياً من الصفر، فيكون حياً ونظيفاً في ذاكرة المتصفح
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;  // 🔊 نطلب الصوت علناً وبقوة
    p.volume = 1.0;   // 100% مستوى الصوت
  });

  // دالة البث المتزامنة مع نقرة إصبعك الصريحة لكسر الحماية
  const handlePlayAdWithSound = () => {
    if (player) {
      player.muted = false;
      player.volume = 1.0;
      player.play();
      setIsPlaying(true);
    }
  };

  // عداد الـ 15 ثانية المستقر
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
    <View style={styles.cardContainer}>
      
      {/* ⏳ شريط الحالة العلوي المترجم */}
      <View style={styles.timerContainer}>
        {!isPlaying ? (
          <Text style={styles.loadingText}>{t.secureAudio}</Text>
        ) : !isFinished ? (
          <Text style={styles.timerText}>{t.waitForReward.replace('{time}', timeLeft.toString())}</Text>
        ) : (
          <Text style={styles.successText}>{t.taskApproved}</Text>
        )}
      </View>

      {/* 📺 مربع العرض المركزي الصامد */}
      {!isFinished ? (
        <View style={styles.videoBox}>
          
          <VideoView 
            player={player} 
            style={[styles.videoStyle, !isPlaying && { opacity: 0 }]} 
            contentFit="cover"
            nativeControls={false} 
          />

          {/* 🏆 واجهة كسر الحظر الذهبية الصريحة */}
          {!isPlaying && (
            <Pressable style={styles.startAdOverlay} onPress={handlePlayAdWithSound}>
              <View style={styles.playIconCircle}>
                <MaterialIcons name="volume-up" size={32} color="#000" />
              </View>
              <Text style={styles.startAdTitle}>{t.watchWithSound}</Text>
              <Text style={styles.startAdSub}>{t.bypassGesture}</Text>
            </Pressable>
          )}

        </View>
      ) : (
        /* كارت الأرباح الفاخر لـ NoirWealth مترجم */
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={75} color="#4CAF50" />
          <Text style={styles.successTitle}>{t.rewardReady}</Text>
          <Text style={styles.successSub}>{t.clickConfirm}</Text>
        </View>
      )}

      {/* 🔘 أزرار التحكم السفلية المترجمة والموجهة */}
      <View style={styles.footer}>
        {isFinished ? (
          <TouchableOpacity style={styles.claimButton} onPress={onComplete}>
            <Text style={styles.claimButtonText}>{t.claimBtn}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.closeButton, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
            onPress={() => { player.pause(); onClose(); }}
          >
            <MaterialIcons name="close" size={18} color="#E53E3E" />
            <Text style={[styles.closeText, lang === 'AR' && { marginRight: 6, marginLeft: 0 }]}>{t.cancelTask}</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

// 🚀 2. المكون الرئيسي: يتحكم في التدمير والبناء الشرطي الكامل لمنع الحظر في الخلفية
export default function VideoAdModal({ visible, videoUrl, onComplete, onClose }: VideoAdModalProps) {
  const { user } = useAuth();
  
  // التقاط لغة العميل الحالية سحابياً
  // @ts-ignore
  const lang = user?.language || 'EN';

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        {/* 🔥 السحر هنا: إذا المودال مغلق، المكون الداخلي يُحذف تماماً من الـ DOM ولا يكتشفه المتصفح */}
        {visible && (
          <AdPlayerContent 
            videoUrl={videoUrl} 
            onComplete={onComplete} 
            onClose={onClose} 
            lang={lang} // تمرير اللغة للمكون الداخلي لفرز الكلمات
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.97)', justifyContent: 'center', alignItems: 'center' },
  cardContainer: { width: '90%', alignItems: 'center' },
  timerContainer: { marginBottom: 25, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
  timerText: { color: '#D4AF37', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  loadingText: { color: '#666', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  successText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  videoBox: { 
    width: '100%', 
    aspectRatio: 16 / 9, 
    backgroundColor: '#050505', 
    borderRadius: 16, 
    overflow: 'hidden', 
    borderWidth: 1.5, 
    borderColor: '#1A1A1A',
    position: 'relative',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6
  },
  videoStyle: { width: '100%', height: '100%' },
  startAdOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 40
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  startAdTitle: { color: '#D4AF37', fontSize: 15, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  startAdSub: { color: '#444', fontSize: 11, marginTop: 5, fontWeight: 'bold', textAlign: 'center' },
  successBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#080808',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  successTitle: { color: '#D4AF37', fontSize: 22, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },
  successSub: { color: '#666', fontSize: 13, marginTop: 5, textAlign: 'center' },
  footer: { marginTop: 35, width: '100%', alignItems: 'center' },
  claimButton: { backgroundColor: '#D4AF37', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  claimButtonText: { color: '#000', fontWeight: '900', fontSize: 15 },
  closeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(229, 62, 62, 0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(229, 62, 62, 0.15)' },
  closeText: { color: '#E53E3E', marginLeft: 6, fontWeight: 'bold', fontSize: 13 }
});