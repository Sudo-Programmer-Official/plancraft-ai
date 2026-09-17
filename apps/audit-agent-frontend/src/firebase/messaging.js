// Firebase Cloud Messaging setup for web (Vue/Vite)
// - Requests browser permission and fetches an FCM token using VAPID
// - Saves the token to Firestore under users/{uid}.fcmToken if user is logged in
// - Exposes a helper to register foreground message listeners

import { getApp, getApps, initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

// Read config from Vite env. Falls back to empty strings to avoid undefined.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
}

function ensureApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

async function getMessagingSafe() {
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  const app = ensureApp()
  return getMessaging(app)
}

async function persistFcmToken(token) {
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user?.uid) return

    const db = getFirestore()
    await setDoc(
      doc(db, "users", user.uid),
      { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
      { merge: true },
    )
  } catch (error) {
    console.warn("Failed to persist FCM token:", error?.message || error)
  }
}

export async function getCurrentFcmToken({ persist = false } = {}) {
  try {
    const messaging = await getMessagingSafe()
    if (!messaging) {
      console.warn("Notifications not supported in this browser.")
      return null
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.warn("VITE_FIREBASE_VAPID_KEY is not set; cannot request FCM token.")
      return null
    }

    if (typeof globalThis !== 'undefined' && globalThis.Notification?.permission !== 'granted') {
      return null
    }

    const token = await getToken(messaging, { vapidKey })
    if (!token) {
      console.warn("No FCM token returned (permission denied or blocked)")
      return null
    }

    // Never log raw FCM tokens; they are bearer-like device credentials.
    if (persist) await persistFcmToken(token)

    return token
  } catch (err) {
    console.error("Failed to get FCM token:", err)
    return null
  }
}

export async function requestNotificationPermission() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.Notification?.permission !== 'granted') {
      if (typeof globalThis.Notification === 'undefined') return null
      const permission = await globalThis.Notification.requestPermission()
      if (permission !== 'granted') return null
    }
    return getCurrentFcmToken({ persist: true })
  } catch (error) {
    console.error("Failed to request notification permission:", error)
    return null
  }
}

// Helper to register foreground message handler
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingSafe()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
