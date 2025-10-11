// Enhanced Firebase service with session-aware auth, error fallback, and data layer protection
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { signOut } from 'firebase/auth'
import { ElMessageBox } from 'element-plus'
import { toLocalDateKey } from "@/utils/dateHelper";
import { db, auth } from '@/firebase/init'

const tasksRef = collection(db, "tasks");
const journalRef = collection(db, "journalEntries");

export function handleAuthError(error, customCallback) {
  const code = error?.code
  const message = String(error?.message || '')

  const isAuthRelated = (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'auth/id-token-expired' ||
    code === 'auth/user-disabled' ||
    /token|auth|unauthori(s|z)ed|permission/i.test(message)
  )

  if (!isAuthRelated) return

  if (typeof customCallback === 'function') return customCallback()

  try {
    ElMessageBox.alert(
      'Your session has expired. Please log in again to continue.',
      'Session Expired',
      {
        confirmButtonText: 'Reload & Login',
        type: 'warning',
        callback: () => {
          try {
            signOut(auth).finally(() => window.location.reload())
          } catch {
            window.location.reload()
          }
        },
      },
    )
  } catch {
    try { signOut(auth) } catch {}
    window.location.reload()
  }
}

async function safeAction(promise) {
  try {
    return await promise
  } catch (err) {
    handleAuthError(err)
    throw err
  }
}

export async function fetchTasks() {
  return fetchTasksForToday();
}
export async function fetchTasksForToday() {
  const user = auth.currentUser;
  if (!user) return [];
  const today = toLocalDateKey(new Date());
  const q = query(tasksRef, where("userId", "==", user.uid), where("date", "==", today), orderBy("order", "asc"));
  const snapshot = await safeAction(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data(), date: toLocalDateKey(d.data().date) }));
}

export async function fetchTasksByDate(dateStr) {
  const user = auth.currentUser;
  if (!user) return [];
  const qy = query(tasksRef, where('userId', '==', user.uid), where('date', '==', dateStr), orderBy('order', 'asc'))
  const snap = await safeAction(getDocs(qy))
  return snap.docs.map(d => ({ id: d.id, ...d.data(), date: toLocalDateKey(d.data().date) }))
}

export async function fetchTasksBetween(startYMD, endYMD) {
  const user = auth.currentUser;
  if (!user) return [];
  const qy = query(tasksRef, where('userId', '==', user.uid), where('date', '>=', startYMD), where('date', '<=', endYMD), orderBy('date', 'asc'), orderBy('order', 'asc'))
  const snap = await safeAction(getDocs(qy))
  return snap.docs.map(d => ({ id: d.id, ...d.data(), date: toLocalDateKey(d.data().date) }))
}

export async function addTaskToFirebase(task) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }
  const payload = {
    title: task.title || "New Task",
    details: task.details || "",
    completed: task.completed ?? false,
    logs: task.logs ?? [],
    attachments: task.attachments ?? [],
    date: typeof task.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(task.date) ? task.date : toLocalDateKey(new Date()),
    order: task.order ?? 0,
    userId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await safeAction(addDoc(tasksRef, payload));
  return { id: docRef.id, ...payload };
}

export async function updateTaskInFirebase(task) {
  if (!task.id) throw new Error("Task missing Firestore ID")
  const { id, createdAt, ...updates } = task
  const docRef = doc(db, "tasks", id)
  await safeAction(updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() }))
}

export async function deleteTaskFromFirebase(taskId) {
  if (!taskId) throw new Error("Task ID required");
  const docRef = doc(db, "tasks", taskId);
  await safeAction(deleteDoc(docRef));
}

export async function saveEntryToFirebase(entry) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }
  await safeAction(addDoc(journalRef, { ...entry, userId: user.uid, createdAt: serverTimestamp() }));
}

export async function fetchEntries() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  const q = query(journalRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  const snapshot = await safeAction(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLink({ title, url, tags=[], pinned=false, color='indigo', icon='🔗' }) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  const payload = { userId: user.uid, title, url, tags, pinned, color, icon, order: Date.now(), createdAt: Date.now(), lastUsedAt: 0 }
  const ref = await safeAction(addDoc(collection(db, 'links'), payload))
  return { id: ref.id, ...payload }
}

export async function getLinks() {
  const user = auth.currentUser;
  if (!user) return []
  const q = query(collection(db, 'links'), where('userId', '==', user.uid))
  const snap = await safeAction(getDocs(q))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateLink(id, patch) {
  await safeAction(updateDoc(doc(db, 'links', id), patch))
}

export async function deleteLink(id) {
  await safeAction(deleteDoc(doc(db, 'links', id)))
}

export async function savePreferences(userId, prefs) {
  const ref = doc(db, "preferences", userId)
  await setDoc(ref, prefs, { merge: true })
}

export async function getPreferences(userId) {
  const ref = doc(db, "preferences", userId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

const notificationsRef = collection(db, 'notifications')

export async function createNotification({ title, message, date }) {
  const payload = {
    title: String(title || '').slice(0, 200),
    message: String(message || '').slice(0, 2000),
    date: date || serverTimestamp(),
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(notificationsRef, payload)
  return { id: ref.id, ...payload }
}

export async function fetchNotificationsPublic(max = 50) {
  const qy = query(notificationsRef, orderBy('date', 'desc'), limit(max))
  const snap = await getDocs(qy)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function watchNotificationsPublic(cb, max = 50) {
  const qy = query(notificationsRef, orderBy('date', 'desc'), limit(max))
  const unsub = onSnapshot(qy, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    cb(list)
  })
  return unsub
}