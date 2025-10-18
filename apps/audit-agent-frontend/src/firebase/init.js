// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// Build Firebase config from environment with safe fallbacks
// This lets us swap projects (e.g., PlanCraftAI) without code changes.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "audit-agent-66451.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "audit-agent-66451",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "audit-agent-66451.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488930745261",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:488930745261:web:5fe03c2568c323ec091f24",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-681FBRFSNY",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
setPersistence(auth, browserLocalPersistence);

// Analytics is only available in browser environments.
let analytics = null;
try {
  if (typeof window !== 'undefined') {
    // Guard for environments/browsers where Analytics isn't supported
    analyticsIsSupported().then((ok) => {
      if (ok) {
        analytics = getAnalytics(firebaseApp);
      }
    }).catch(() => {});
  }
} catch {}
export { analytics };

export default firebaseApp;
