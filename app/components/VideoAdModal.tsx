import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

interface VideoAdModalProps {
  visible: boolean;
  videoUrl: string;
  onComplete: () => void;
  onClose: () => void;
}

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

function AdPlayerContent({ videoUrl, onComplete, onClose, lang }: { videoUrl: string, onComplete: () => void, onClose: () => void, lang: string }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // استخدام مرجع Ref للتحكم في عنصر الفيديو مباشرة على الويب
  const videoRef = useRef<any>(null);
  const t = adTranslations[lang] || adTranslations['EN'];

  // دالة تشغيل الفيديو وكسر حظر الصوت العنيف في المتصفحات
  const handlePlayAdWithSound = () => {
    setIsPlaying(true);
    
    if (Platform.OS === 'web') {
      // 👑 الخدعة الذهبية الصارمة على الويب للوصول لجذر الـ HTML5 وعنصر الفيديو ديريكت
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.muted = false; // إلغاء كتم الصوت
        videoElement.volume = 1.0;  // رفع الصوت لأعلى درجة
        
        // تشغيل برمجياً مدعوماً بنقرة صريحة
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((error: any) => {
            console.log("Autoplay blocked, forcing play again:", error);
            videoElement.play();
          });
        }
      }
    }
  };

  // حارس الـ 15 ثانية اليومي المستقر
  useEffect(() => {
    let timer: any; 
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsFinished(true);
      if (Platform.OS === 'web' && videoRef.current) {
        videoRef.current.pause();
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeLeft]);

  return (
    <View style={styles.cardContainer}>
      
      {/* ⏳ شريط الحالة العلوي */}
      <View style={styles.timerContainer}>
        {!isPlaying ? (
          <Text style={styles.loadingText}>{t.secureAudio}</Text>
        ) : !isFinished ? (
          <Text style={styles.timerText}>{t.waitForReward.replace('{time}', timeLeft.toString())}</Text>
        ) : (
          <Text style={styles.successText}>{t.taskApproved}</Text>
        )}
      </View>

      {/* 📺 مربع العرض المركزي المقاوم تماماً لمشاكل الـ Pause */}
      {!isFinished ? (
        <View style={styles.videoBox}>
          <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
            
            {Platform.OS === 'web' ? (
              /* 👑 هندسة التطهير: حقن عنصر فيديو HTML5 أصلي ومباشر على الويب لحل مشكلة قنوات الصوت نهائياً */
              <video
                ref={videoRef}
                src={videoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
                controls={false} // إلغاء الأزرار لمنع الـ Pause
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: '#000' }} />
            )}

            {/* 🛡️ حارس الأمان الشفاف لمنع الـ Pause وتوجيه الصوت والتشغيل برمجياً */}
            {isPlaying && (
              <Pressable 
                style={StyleSheet.absoluteFill} 
                onPress={() => {
                  if (Platform.OS === 'web' && videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = 1.0;
                    videoRef.current.play(); // إعادة تأكيد البث ومنع التعليق
                  }
                }} 
              />
            )}
          </View>

          {/* 🏆 واجهة كسر الحظر الذهبية المبدئية */}
          {!isPlaying && (
            <Pressable style={styles.startAdOverlay} onPress={handlePlayAdWithSound}>
              <View style={styles.playIconCircle}>
                <Text style={{ fontSize: 26, color: '#000', textAlign: 'center' }}>🔊</Text>
              </View>
              <Text style={styles.startAdTitle}>{t.watchWithSound}</Text>
              <Text style={styles.startAdSub}>{t.bypassGesture}</Text>
            </Pressable>
          )}

        </View>
      ) : (
        /* كارت الأرباح الفاخر */
        <View style={styles.successBox}>
          <Text style={{ fontSize: 60, marginBottom: 10 }}>✅</Text>
          <Text style={styles.successTitle}>{t.rewardReady}</Text>
          <Text style={styles.successSub}>{t.clickConfirm}</Text>
        </View>
      )}

      {/* 🔘 أزرار التحكم السفلية */}
      <View style={styles.footer}>
        {isFinished ? (
          <TouchableOpacity style={styles.claimButton} onPress={onComplete}>
            <Text style={styles.claimButtonText}>{t.claimBtn}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.closeButton, lang === 'AR' && { flexDirection: 'row-reverse' }]} 
            onPress={() => { 
              if (Platform.OS === 'web' && videoRef.current) videoRef.current.pause();
              onClose(); 
            }}
          >
            <Text style={[{ fontSize: 13 }, lang === 'AR' ? { marginRight: 2 } : { marginLeft: 2 }]}>❌</Text>
            <Text style={[styles.closeText, lang === 'AR' && { marginRight: 6, marginLeft: 0 }]}>{t.cancelTask}</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

export default function VideoAdModal({ visible, videoUrl, onComplete, onClose }: VideoAdModalProps) {
  const { user } = useAuth();
  // @ts-ignore
  const lang = user?.language || 'EN';

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
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

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.97)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardContainer: { width: '100%', maxWidth: 850, alignItems: 'center', justifyContent: 'center' },
  timerContainer: { marginBottom: 20, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
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
    elevation: 6,
    marginBottom: 20 
  },
  videoStyle: { width: '100%', height: '100%' },
  startAdOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 40 },
  playIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  startAdTitle: { color: '#D4AF37', fontSize: 16, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  startAdSub: { color: '#444', fontSize: 12, marginTop: 5, fontWeight: 'bold', textAlign: 'center' },
  successBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#080808', borderRadius: 16, borderWidth: 1.5, borderColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', padding: 20, marginBottom: 20 },
  successTitle: { color: '#D4AF37', fontSize: 24, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },
  successSub: { color: '#666', fontSize: 14, marginTop: 5, textAlign: 'center' },
  footer: { marginTop: 15, width: '100%', alignItems: 'center', justifyContent: 'center' },
  claimButton: { backgroundColor: '#D4AF37', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12, width: '100%', alignItems: 'center' },
  claimButtonText: { color: '#000', fontWeight: '900', fontSize: 16 },
  closeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, backgroundColor: 'rgba(229, 62, 62, 0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(229, 62, 62, 0.15)', width: '100%' },
  closeText: { color: '#E53E3E', marginLeft: 6, fontWeight: 'bold', fontSize: 14 }
});