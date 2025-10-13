import { db } from '../firebaseAdmin.js'

// Run nightly at 23:55 server time to flag unfinished tasks
let lastRunKey = null

function toYMD(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function initCarryoverJobs() {
  try {
    setInterval(async () => {
      const now = new Date()
      const hh = now.getHours()
      const mm = now.getMinutes()
      const todayKey = toYMD(now)
      const key = `${todayKey}-2355`
      if (hh === 23 && mm >= 55) {
        if (lastRunKey === key) return
        lastRunKey = key
        await flagUnfinishedForToday(todayKey)
      }
    }, 60 * 1000)
    console.log('⏰ Carryover job initialized (runs nightly ~23:55 server time)')
  } catch (e) {
    console.error('initCarryoverJobs failed:', e)
  }
}

async function flagUnfinishedForToday(ymd) {
  try {
    // Mark all tasks for today that are not completed as carryover
    let snap
    try {
      snap = await db
        .collection('tasks')
        .where('date', '==', ymd)
        .where('completed', '==', false)
        .get()
    } catch (e) {
      console.warn('Composite index missing for carryover flag; falling back to single-field query')
      snap = await db
        .collection('tasks')
        .where('date', '==', ymd)
        .get()
    }

    let count = 0
    const batch = db.batch()
    snap.forEach((doc) => {
      const data = doc.data()
      const notCompleted = data?.completed === false || data?.completed === undefined || data?.completed === null
      if (!notCompleted) return
      if (data?.is_carryover) return
      batch.update(doc.ref, { is_carryover: true, carryoverFlaggedAt: new Date() })
      count++
    })
    if (count) await batch.commit()
    console.log(`📦 Carryover flagged for ${count} tasks (date=${ymd})`)
  } catch (e) {
    console.error('flagUnfinishedForToday error:', e)
  }
}
