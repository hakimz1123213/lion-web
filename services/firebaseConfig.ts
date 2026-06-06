import { initializeApp, getApps, getApp } from "firebase/app";
// 🚨 إضافة السطر السحري لمنع التايب سكريبت من الاحتجاج الوهمي
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCF0lF91EoI9_Ja8t4DzKsr2aKinGxZH08",
  authDomain: "noir-879ad.firebaseapp.com",
  databaseURL: "https://noir-879ad-default-rtdb.firebaseio.com", 
  storageBucket: "noir-879ad.firebasestorage.app",
  messagingSenderId: "1000104358881",
  appId: "1:1000104358881:android:3d5e506ad8a6fe07f258a0"
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