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
    // Force showing account chooser every time
  provider.setCustomParameters({
    prompt: 'select_account'
  })
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    name: user.displayName,
    mode: "google",
    createdAt: Date.now(),
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
  }, { merge: true })
  return user
}

export async function sendResetEmail(email) {
  await sendPasswordResetEmail(auth, email)
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
