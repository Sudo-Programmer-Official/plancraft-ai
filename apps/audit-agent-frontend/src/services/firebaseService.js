// TODO(CODEX): Firebase sync — firebaseService.js
// Add saveEntryToFirebase(entry) and fetchEntries() using Firestore

// import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
// import firebaseApp  from '../firebase/init.js' // adjust path if needed

// const db = getFirestore(firebaseApp)



// import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import firebaseApp from "@/firebase/init"; // your firebase init

// const db = getFirestore(firebaseApp);
// const auth = getAuth(firebaseApp);

// const tasksRef = collection(db, "tasks");
// const journalRef = collection(db, 'journalEntries')


// export async function fetchTasks() {
//   const user = auth.currentUser;
//   if (!user) return [];
//   const q = query(tasksRef, where("userId", "==", user.uid), orderBy("date", "desc"));
//   const snapshot = await getDocs(q);
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// }

// export async function addTaskToFirebase(task) {
//   const user = auth.currentUser;
//   if (!user) throw new Error("User not logged in");
//   const docRef = await addDoc(tasksRef, { ...task, userId: user.uid });
//   return { id: docRef.id, ...task };
// }

// export async function updateTaskInFirebase(task) {
//   if (!task.id) throw new Error("Task missing ID");
//   const docRef = doc(db, "tasks", task.id);
//   await updateDoc(docRef, task);
// }

// export async function saveEntryToFirebase(entry) {
//   try {
//     await addDoc(journalRef, {
//       ...entry,
//       timestamp: Date.now()
//     })
//   } catch (e) {
//     console.error('Error saving entry:', e)
//   }
// }

// export async function fetchEntries() {
//   const snapshot = await getDocs(query(journalRef, orderBy('timestamp', 'desc')))
//   return snapshot.docs.map(doc => doc.data())
// }

// import {
//   getFirestore,
//   collection,
//   addDoc,
//   getDocs,
//   updateDoc,
//   doc,
//   query,
//   where,
//   orderBy,
//   serverTimestamp,
// } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import firebaseApp from "@/firebase/init";

// const db = getFirestore(firebaseApp);
// const auth = getAuth(firebaseApp);

// const tasksRef = collection(db, "tasks");
// const journalRef = collection(db, "journalEntries");

// // Fetch tasks for logged-in user
// export async function fetchTasks() {
//   const user = auth.currentUser;
//   if (!user) return [];
//   const q = query(tasksRef, where("userId", "==", user.uid), orderBy("date", "desc"));
//   const snapshot = await getDocs(q);
//   return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
// }

// // Add a task
// export async function addTaskToFirebase(task) {
//   const user = auth.currentUser;
//   if (!user) throw new Error("User not logged in");
//   const docRef = await addDoc(tasksRef, {
//     ...task,
//     userId: user.uid,
//     createdAt: serverTimestamp(),
//   });
//   return { id: docRef.id, ...task };
// }

// // Update a task
// export async function updateTaskInFirebase(task) {
//   if (!task.id) throw new Error("Task missing ID");
//   const { id, ...updates } = task;
//   const docRef = doc(db, "tasks", id);
//   await updateDoc(docRef, updates);
// }

// // Save journal entry
// // export async function saveEntryToFirebase(entry) {
// //   try {
// //     await addDoc(journalRef, {
// //       ...entry,
// //       timestamp: serverTimestamp(),
// //     });
// //   } catch (e) {
// //     console.error("Error saving entry:", e);
// //   }
// // }
// export async function saveEntryToFirebase(entry) {
//   const user = auth.currentUser;
//   if (!user) throw new Error("User not logged in");

//   await addDoc(journalRef, {
//     ...entry,
//     userId: user.uid,
//     createdAt: serverTimestamp(),
//   });
// }

// // Fetch journal entries
// // export async function fetchEntries() {
// //   const snapshot = await getDocs(query(journalRef, orderBy("timestamp", "desc")));
// //   return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
// // }
// export async function fetchEntries() {
//   const user = auth.currentUser;
//   if (!user) throw new Error("User not logged in");

//   const q = query(
//     journalRef,
//     where("userId", "==", user.uid),
//     orderBy("createdAt", "desc")
//   );
//   const snapshot = await getDocs(q);
//   return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
// }

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
} from "firebase/firestore";
import { signOut } from 'firebase/auth'
import { ElMessageBox } from 'element-plus'
import { toLocalDateKey } from "@/utils/dateHelper";
import { db, auth } from '@/firebase/init'

const tasksRef = collection(db, "tasks");
const journalRef = collection(db, "journalEntries");

/**
 * Global auth-expiry handler for Firestore/auth errors.
 * Shows a blocking alert prompting user to reload and sign in again.
 */
export function handleAuthError(error) {
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

  try {
    ElMessageBox.alert(
      'Your session has expired. Please log in again to continue.',
      'Session Expired',
      {
        confirmButtonText: 'Reload & Login',
        type: 'warning',
        callback: () => {
          try {
            signOut(auth).finally(() => {
              window.location.reload()
            })
          } catch {
            window.location.reload()
          }
        },
      },
    )
  } catch {
    // If UI libs not ready, fallback to hard reload
    try { signOut(auth) } catch {
      // ignore
    }
    window.location.reload()
  }
}

/**
 * Wrap a Firestore action and surface auth errors globally.
 */
async function safeAction(promise) {
  try {
    return await promise
  } catch (err) {
    handleAuthError(err)
    throw err
  }
}

/**
 * 🗓 Fetch only today’s tasks for logged-in user
 */
export async function fetchTasks() {
  return fetchTasksForToday();
}
export async function fetchTasksForToday() {
  const user = auth.currentUser;
  if (!user) return [];

  const today = toLocalDateKey(new Date()); // YYYY-MM-DD local

  const q = query(
    tasksRef,
    where("userId", "==", user.uid),
    where("date", "==", today),
    orderBy("order", "asc")
  );

  const snapshot = await safeAction(getDocs(q));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      date: typeof data.date === 'string' ? data.date : toLocalDateKey(data.date),
    };
  });
}

/**
 * 🗓 Fetch tasks for a specific date (YYYY-MM-DD)
 */
export async function fetchTasksByDate(dateStr) {
  const user = auth.currentUser;
  if (!user) return [];
  const qy = query(
    tasksRef,
    where('userId', '==', user.uid),
    where('date', '==', dateStr),
    orderBy('order', 'asc'),
  )
  const snap = await safeAction(getDocs(qy))
  return snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, ...data, date: typeof data.date === 'string' ? data.date : toLocalDateKey(data.date) }
  })
}

/**
 * 📅 Fetch tasks between two dates inclusive (YYYY-MM-DD)
 */
export async function fetchTasksBetween(startYMD, endYMD) {
  const user = auth.currentUser;
  if (!user) return [];
  const qy = query(
    tasksRef,
    where('userId', '==', user.uid),
    where('date', '>=', startYMD),
    where('date', '<=', endYMD),
    orderBy('date', 'asc'),
    orderBy('order', 'asc'),
  )
  const snap = await safeAction(getDocs(qy))
  return snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, ...data, date: typeof data.date === 'string' ? data.date : toLocalDateKey(data.date) }
  })
}

/**
 * ➕ Add a new task
 */
/**
 * ✅ Add a new task to Firestore
 */
  export async function addTaskToFirebase(task) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }

  // Prepare safe payload
    const payload = {
      title: task.title || "New Task",
      details: task.details || "",
      completed: task.completed ?? false,
      logs: task.logs ?? [],
      attachments: task.attachments ?? [],
      date: typeof task.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(task.date)
        ? task.date
        : toLocalDateKey(new Date()), // YYYY-MM-DD
      order: task.order ?? 0,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

  const docRef = await safeAction(addDoc(tasksRef, payload));

  // Return task with Firestore's doc ID
  return { id: docRef.id, ...payload };
}

/**
 * ✅ Update an existing task in Firestore
 */
// export async function updateTaskInFirebase(task) {
//   if (!task.id) throw new Error("Task missing Firestore ID");

//   const { id, createdAt, ...updates } = task; 
//   // strip `createdAt` because serverTimestamp() is managed by Firestore

//   const docRef = doc(db, "tasks", id);

//   await updateDoc(docRef, {
//     ...updates,
//     updatedAt: serverTimestamp(), // track last update
//   });
// }
export async function updateTaskInFirebase(task) {
  console.log("updateTaskInFirebase called with task:", task);
  if (!task.id) throw new Error("Task missing Firestore ID")
  const { id, createdAt, ...updates } = task
  const docRef = doc(db, "tasks", id)
  await safeAction(updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  }))
}

/**
 * 🗑 Delete a task
 */
export async function deleteTaskFromFirebase(taskId) {
  if (!taskId) throw new Error("Task ID required");
  const docRef = doc(db, "tasks", taskId);
  await safeAction(deleteDoc(docRef));
}

/**
 * 💾 Save journal entry
 */
export async function saveEntryToFirebase(entry) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }

  await safeAction(addDoc(journalRef, {
    ...entry,
    userId: user.uid,
    createdAt: serverTimestamp(),
  }));
}

/**
 * 📖 Fetch journal entries
 */
export async function fetchEntries() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const q = query(
    journalRef,
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await safeAction(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 🔗 Link Management
 */

export async function addLink({ title, url, tags=[], pinned=false, color='indigo', icon='🔗' }) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  const payload = {
    userId: user.uid, title, url, tags, pinned, color, icon,
    order: Date.now(), createdAt: Date.now(), lastUsedAt: 0
  }
  const ref = await safeAction(addDoc(collection(db, 'links'), payload))
  return { id: ref.id, ...payload }
}

export async function getLinks() {
  const user = auth.currentUser; if (!user) return []
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
