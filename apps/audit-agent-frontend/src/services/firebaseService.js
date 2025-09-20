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
  getFirestore,
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
import { getAuth } from "firebase/auth";
import firebaseApp from "@/firebase/init";

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const tasksRef = collection(db, "tasks");
const journalRef = collection(db, "journalEntries");

/**
 * 🗓 Fetch only today’s tasks for logged-in user
 */
export async function fetchTasks() {
  return fetchTasksForToday();
}
export async function fetchTasksForToday() {
  const user = auth.currentUser;
  if (!user) return [];

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const q = query(
    tasksRef,
    where("userId", "==", user.uid),
    where("date", "==", today),
    orderBy("order", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * ➕ Add a new task
 */
/**
 * ✅ Add a new task to Firestore
 */
export async function addTaskToFirebase(task) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  // Prepare safe payload
  const payload = {
    title: task.title || "New Task",
    details: task.details || "",
    completed: task.completed ?? false,
    logs: task.logs ?? [],
    attachments: task.attachments ?? [],
    date: task.date || new Date().toISOString().split("T")[0], // YYYY-MM-DD
    order: task.order ?? 0,
    userId: user.uid,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(tasksRef, payload);

  // Return task with Firestore's doc ID
  return { id: docRef.id, ...payload };
}

/**
 * ✅ Update an existing task in Firestore
 */
export async function updateTaskInFirebase(task) {
  if (!task.id) throw new Error("Task missing Firestore ID");

  const { id, createdAt, ...updates } = task; 
  // strip `createdAt` because serverTimestamp() is managed by Firestore

  const docRef = doc(db, "tasks", id);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(), // track last update
  });
}

/**
 * 🗑 Delete a task
 */
export async function deleteTaskFromFirebase(taskId) {
  if (!taskId) throw new Error("Task ID required");
  const docRef = doc(db, "tasks", taskId);
  await deleteDoc(docRef);
}

/**
 * 💾 Save journal entry
 */
export async function saveEntryToFirebase(entry) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  await addDoc(journalRef, {
    ...entry,
    userId: user.uid,
    createdAt: serverTimestamp(),
  });
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

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}