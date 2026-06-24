import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ref, update } from 'firebase/database';
import { db } from './firebaseConfig'; // تأكد من المسار إذا كان مختلف

// 1️⃣ دالة لإرسال الإشعار الفوري (تستدعيها من Admin)
export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log("Push notification sent successfully!");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

// 2️⃣ دالة لتوليد كود الـ Token وحفظه في حساب المستخدم
export async function registerForPushNotificationsAsync(userId: string) {
  if (Platform.OS === 'web') return;

  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  try {
    // استخراج الـ Token باستخدام الـ ID نتاع مشروعك
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: "333ec6e9-ad73-44d7-834f-7bed07960daa" 
    })).data;

    // حفظ الـ Token ديريكت في فايربيز تحت بيانات العميل
    if (token && userId) {
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, { expoPushToken: token });
      console.log("Push Token saved to Firebase:", token);
    }
  } catch (error) {
    console.error("Error getting Expo Push Token:", error);
  }

  return token;
}