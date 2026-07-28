import { initializeApp, getApps, getApp } from "firebase/app";
// 🚨 إضافة السطر السحري لمنع التايب سكريبت من الاحتجاج الوهمي
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAqdqCX2pkv1sQ1dZlpl-09v651mcd_KX4",
  authDomain: "lion-e7e25-default-rtdb.firebaseapp.com",
  databaseURL: "https://lion-e7e25-default-rtdb.firebaseio.com", 
  storageBucket: "lion-e7e25.firebasestorage.app",
  messagingSenderId: "411435734882",
  appId: "1:411435734882:android:04022aa8474b764e17be3b"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firebaseAuth;
try {
  firebaseAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  firebaseAuth = getAuth(app);
}

export const auth = firebaseAuth;
export const db = getDatabase(app);

export default app;