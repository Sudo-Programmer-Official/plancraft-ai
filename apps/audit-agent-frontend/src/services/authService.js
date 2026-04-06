// src/services/authService.js
import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/init"; // Already initialized
import api from '@/services/api'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const PUBLIC_SITE_URL = ((import.meta.env.VITE_SITE_URL && String(import.meta.env.VITE_SITE_URL)) || 'https://plancraftai.com')
  .replace(/\/+$/, '')

function buildSafeContinueUrl(path = '/login') {
  const rawPath = String(path || '/login')
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath.replace(/^\/+/, '')}`

  if (typeof window !== 'undefined') {
    try {
      const protocol = String(window.location.protocol || '').toLowerCase()
      const origin = String(window.location.origin || '').replace(/\/+$/, '')
      if ((protocol === 'http:' || protocol === 'https:') && origin) {
        return `${origin}${normalizedPath}`
      }
    } catch {
      /* noop */
    }
  }

  return `${PUBLIC_SITE_URL}${normalizedPath}`
}

export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  const user = result.user;
  await setDoc(doc(db, "users", user.uid), {
    createdAt: Date.now(),
    mode: "guest",
    isGuest: true,
    firstVisitInitialized: false,
    profileComplete: false,
  });
  return user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    name: user.displayName,
    mode: "google",
    createdAt: Date.now(),
    profileComplete: !!(user.displayName),
  }, { merge: true });
  return user;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const user = cred.user
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    name: user.displayName || '',
    mode: 'email',
    lastLoginAt: Date.now(),
    ...(user.displayName ? { profileComplete: true } : {}),
  }, { merge: true })
  return user
}

export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const user = cred.user
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    name: user.displayName || '',
    mode: 'email',
    createdAt: Date.now(),
    profileComplete: !!(user.displayName),
  }, { merge: true })
  return user
}

export async function sendResetEmail(email) {
  const actionCodeSettings = {
    // Firebase action links must redirect to http(s), not capacitor:// or ionic://.
    url: buildSafeContinueUrl('/login?reset=1'),
    // Let Firebase host the reset UI (safer cross‑browser); we only provide a continue URL
    handleCodeInApp: false,
  }
  await sendPasswordResetEmail(auth, email, actionCodeSettings)
}

// 🔎 Fetch additional user profile fields (e.g., role) from Firestore
export async function fetchUserProfile(uid) {
  try {
    if (!uid) return { role: 'user' }
    if (isNativePackagedApp()) {
      const res = await api.get('/settings/profile', { params: { userId: uid } })
      const profile = res?.data?.profile
      return profile && typeof profile === 'object' ? profile : { role: 'user' }
    }
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data() || {}) : { role: 'user' }
  } catch (e) {
    console.warn('fetchUserProfile failed:', e)
    try {
      if (!uid) return { role: 'user' }
      const res = await api.get('/settings/profile', { params: { userId: uid } })
      const profile = res?.data?.profile
      return profile && typeof profile === 'object' ? profile : { role: 'user' }
    } catch {
      return { role: 'user' }
    }
  }
}

// Passwordless: send magic link to email
export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: buildSafeContinueUrl('/login'),
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  try { localStorage.setItem('emailForSignIn', email) } catch { /* noop */ }
}

// Passwordless: complete sign-in from magic link
export async function completeMagicLinkSignIn(currentUrl) {
  const emailStored = (() => { try { return localStorage.getItem('emailForSignIn') } catch { return null } })()
  const email = emailStored || ''
  if (!isSignInWithEmailLink(auth, currentUrl)) return null
  const userCred = await signInWithEmailLink(auth, email || window.prompt('Confirm your email for sign-in'), currentUrl)
  try { localStorage.removeItem('emailForSignIn') } catch { /* noop */ }
  const user = userCred.user
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    name: user.displayName || '',
    mode: 'email_link',
    lastLoginAt: Date.now(),
    profileComplete: !!(user.displayName),
  }, { merge: true })
  return user
}
