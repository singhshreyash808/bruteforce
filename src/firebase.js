import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration for CybEx Project (cybex-d29e2)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC7FP_QzjBxNFRG0tpMzpQpYmdQgBzk21I",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cybex-d29e2.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cybex-d29e2",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cybex-d29e2.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "602923486595",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:602923486595:web:ee1587cac490b3a95dfab6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NK9K8BW1YK"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export Firebase Authentication & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
