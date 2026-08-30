import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration from Vite Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyDevKeyForDemo1234567890",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cybex-intelligence.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cybex-intelligence",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cybex-intelligence.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcdef123456"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firebase Authentication & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
