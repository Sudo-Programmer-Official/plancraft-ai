// src/services/authService.js
import {
  getAuth,
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
import { db } from "@/firebase/init"; // Already initialized

const auth = getAuth();

export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  const user = result.user;
  await setDoc(doc(db, "users", user.uid), {
    createdAt: Date.now(),
    mode: "guest",
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
    // After the user completes the reset flow, send them back to login
    url: (typeof window !== 'undefined' ? window.location.origin : '') + '/login?reset=1',
    // Let Firebase host the reset UI (safer cross‑browser); we only provide a continue URL
    handleCodeInApp: false,
  }
  await sendPasswordResetEmail(auth, email, actionCodeSettings)
}

// 🔎 Fetch additional user profile fields (e.g., role) from Firestore
export async function fetchUserProfile(uid) {
  try {
    if (!uid) return { role: 'user' }
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data() || {}) : { role: 'user' }
  } catch (e) {
    console.warn('fetchUserProfile failed:', e)
    return { role: 'user' }
  }
}

// Passwordless: send magic link to email
export async function sendMagicLink(email) {
  const actionCodeSettings = {
    url: (typeof window !== 'undefined' ? window.location.origin : '') + '/login',
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, email, actionCodeSettings)
  try { localStorage.setItem('emailForSignIn', email) } catch {}
}

// Passwordless: complete sign-in from magic link
export async function completeMagicLinkSignIn(currentUrl) {
  const emailStored = (() => { try { return localStorage.getItem('emailForSignIn') } catch { return null } })()
  const email = emailStored || ''
  if (!isSignInWithEmailLink(auth, currentUrl)) return null
  const userCred = await signInWithEmailLink(auth, email || window.prompt('Confirm your email for sign-in'), currentUrl)
  try { localStorage.removeItem('emailForSignIn') } catch {}
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
