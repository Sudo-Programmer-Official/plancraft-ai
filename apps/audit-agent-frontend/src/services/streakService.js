import { db } from '@/firebase/init'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'

// Firestore: userStats/{uid}
// Fields: streakCount: number, lastEntryDate: 'YYYY-MM-DD', updatedAt: serverTimestamp

export async function getUserStreak(uid) {
  if (!uid) return 0
  const ref = doc(db, 'userStats', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return 0
  const data = snap.data() || {}
  return Number(data.streakCount || 0)
}

export async function ensureDailyStreakState(uid) {
  if (!uid) return { streakCount: 0 }
  const ref = doc(db, 'userStats', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { streakCount: 0 }

  const data = snap.data() || {}
  const last = data.lastEntryDate
  const today = toLocalDateKey(new Date())
  if (!last) return { streakCount: Number(data.streakCount || 0) }

  // If user has missed more than 1 day, reset to 0 (does not write if already 0)
  const lastDate = parseLocalDateKey(last)
  const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24))
  if (diffDays > 1 && Number(data.streakCount || 0) !== 0) {
    await setDoc(ref, { streakCount: 0, updatedAt: serverTimestamp() }, { merge: true })
    return { streakCount: 0 }
  }
  return { streakCount: Number(data.streakCount || 0) }
}

// Call this after saving a journal entry
export async function updateStreakOnEntry(uid, entryDate = new Date()) {
  if (!uid) return { streakIncreased: false, newCount: 0 }
  const ref = doc(db, 'userStats', uid)
  const snap = await getDoc(ref)
  const today = toLocalDateKey(entryDate instanceof Date ? entryDate : new Date(entryDate))

  let last = null
  let count = 0
  if (snap.exists()) {
    const data = snap.data() || {}
    last = data.lastEntryDate || null
    count = Number(data.streakCount || 0)
  }

  // If already logged today, do not change streak
  if (last === today) {
    await setDoc(ref, { lastEntryDate: today, updatedAt: serverTimestamp() }, { merge: true })
    return { streakIncreased: false, newCount: count }
  }

  // Determine if yesterday was previous entry to increment; otherwise reset to 1
  const yesterday = toLocalDateKey(new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000))
  const newCount = last === yesterday ? count + 1 : 1
  await setDoc(
    ref,
    { streakCount: newCount, lastEntryDate: today, updatedAt: serverTimestamp() },
    { merge: true }
  )
  return { streakIncreased: newCount > count, newCount }
}

