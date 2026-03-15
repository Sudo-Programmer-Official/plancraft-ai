// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { Capacitor } from '@capacitor/core';

// Build Firebase config from environment with safe fallbacks
// This lets us swap projects (e.g., PlanCraftAI) without code changes.
// For native (Capacitor) builds, prefer a dedicated mobile auth domain if provided.
const isNative = !!Capacitor?.isNativePlatform?.()
const nativePlatform = Capacitor?.getPlatform?.() || 'web'
const baseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "audit-agent-66451.firebaseapp.com"
const mobileAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_MOBILE || baseAuthDomain
// iOS uses email/password only right now; keep it aligned with the app's public host.
// Android retains the dedicated mobile override for the Google redirect handoff bridge.
const safeAuthDomain = isNative
  ? (nativePlatform === 'ios' ? baseAuthDomain : mobileAuthDomain)
  : baseAuthDomain

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDI0qFImSxQFYkT5CRu2K1yEZuPX1W2xEY",
  authDomain: safeAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "audit-agent-66451",
  // Storage bucket should be the appspot.com domain
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "audit-agent-66451.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488930745261",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:488930745261:web:5fe03c2568c323ec091f24",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-681FBRFSNY",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

function buildAuthPersistenceOrder() {
  if (isNative && Capacitor?.getPlatform?.() === 'ios') {
    // WKWebView + custom/native origins can hang on IndexedDB-backed auth writes.
    // Keep iOS on localStorage/memory so email and redirect auth can settle reliably.
    return [browserLocalPersistence, inMemoryPersistence]
  }
  return [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence]
}

function describePersistenceOrder(order) {
  return order.map((entry) => entry?.type || entry?._delegate?._type || 'unknown')
}

let auth
try {
  const persistenceOrder = buildAuthPersistenceOrder()
  const authOptions = {
    persistence: persistenceOrder,
    popupRedirectResolver: browserPopupRedirectResolver,
  }
  auth = initializeAuth(firebaseApp, authOptions)
  console.info('[Auth] Firebase Auth initialized with persistence fallbacks', {
    native: isNative,
    platform: nativePlatform,
    origin: typeof window !== 'undefined' ? window.location.origin : 'server',
    authDomain: firebaseConfig.authDomain,
    baseAuthDomain,
    mobileAuthDomain,
    persistence: describePersistenceOrder(persistenceOrder),
    popupRedirectResolver: true,
  })
} catch (error) {
  auth = getAuth(firebaseApp)
  console.warn('[Auth] initializeAuth fallback to getAuth()', error)
}
export { auth }

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

// Initialize App Check (required if enforcement is enabled for Auth/Firestore/Storage)
// let appCheck = null
// try {
//   if (typeof window !== 'undefined') {
//     // Enable debug token locally if requested
//     // eslint-disable-next-line no-undef
//     if (import.meta.env.VITE_APPCHECK_DEBUG === '1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
//     const siteKey = import.meta.env.VITE_APP_CHECK_SITE_KEY || import.meta.env.VITE_APPCHECK_SITE_KEY
//     if (siteKey) {
//       appCheck = initializeAppCheck(firebaseApp, {
//         provider: new ReCaptchaV3Provider(siteKey),
//         isTokenAutoRefreshEnabled: true,
//       })
//     }
//   }
// } catch {}
// export { appCheck }

export default firebaseApp;
