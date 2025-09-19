// TODO(CODEX): Firebase sync — firebaseService.js
// Add saveEntryToFirebase(entry) and fetchEntries() using Firestore

import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore'
import firebaseApp  from '../firebase/init.js' // adjust path if needed

const db = getFirestore(firebaseApp)
const journalRef = collection(db, 'journalEntries')

export async function saveEntryToFirebase(entry) {
  try {
    await addDoc(journalRef, {
      ...entry,
      timestamp: Date.now()
    })
  } catch (e) {
    console.error('Error saving entry:', e)
  }
}

export async function fetchEntries() {
  const snapshot = await getDocs(query(journalRef, orderBy('timestamp', 'desc')))
  return snapshot.docs.map(doc => doc.data())
}