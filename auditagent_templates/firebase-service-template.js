import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { app } from './firebase'; // Assume firebase.js exports initialized app

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function addLog(userId, data) {
  const logsRef = collection(db, "users", userId, "logs");
  return await addDoc(logsRef, data);
}

export async function getLogs(userId) {
  const logsRef = collection(db, "users", userId, "logs");
  const snapshot = await getDocs(logsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
