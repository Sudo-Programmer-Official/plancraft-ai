// src/services/authService.js
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
  }, { merge: true });
  return user;
}

export async function signOutUser() {
  await signOut(auth);
}