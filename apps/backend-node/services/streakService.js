import { db } from './firebaseAdmin.js'

function toLocalDateKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDateKey(key) {
  if (!key || typeof key !== 'string') return new Date()
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y || 0, (m || 1) - 1, d || 1)
}

export async function updateStreakOnEntry(uid, entryDate = new Date()) {
  if (!uid) return { streakIncreased: false, newCount: 0 }
  const ref = db.collection('userStats').doc(String(uid))
  const snap = await ref.get()
  const todayKey =
    typeof entryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)
      ? entryDate
      : toLocalDateKey(entryDate)

  let last = null
  let count = 0
  if (snap.exists) {
    const data = snap.data() || {}
    last = data.lastEntryDate || null
    count = Number(data.streakCount || 0)
  }

  if (last === todayKey) {
    await ref.set({ lastEntryDate: todayKey, updatedAt: new Date() }, { merge: true })
    return { streakIncreased: false, newCount: count }
  }

  const lastDate = last ? parseLocalDateKey(last) : null
  const todayDate = parseLocalDateKey(todayKey)
  const diffDays =
    lastDate && !Number.isNaN(lastDate.getTime())
      ? Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))
      : null

  const newCount = diffDays === 1 ? count + 1 : 1
  await ref.set(
    {
      streakCount: newCount,
      lastEntryDate: todayKey,
      updatedAt: new Date(),
    },
    { merge: true },
  )
  return { streakIncreased: newCount > count, newCount }
}
