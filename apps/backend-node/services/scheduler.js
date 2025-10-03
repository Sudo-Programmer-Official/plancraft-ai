import { db } from "./firebaseAdmin.js"
import { queueReminder } from "./reminderService.js"

export async function initScheduler() {
  try {
    const now = new Date()
    let snap
    try {
      snap = await db
        .collection('reminders')
        .where('sentAt', '==', null)
        .where('scheduledTime', '>', now)
        .get()
    } catch (e) {
      console.warn('Composite index missing for reminders init; falling back to single-field query')
      snap = await db
        .collection('reminders')
        .where('scheduledTime', '>', now)
        .get()
    }

    let count = 0
    snap.forEach((doc) => {
      const data = doc.data()
      if (data?.sentAt) return
      const reminder = { id: doc.id, ...data }
      queueReminder(reminder)
      count++
    })
    console.log(`📅 Loaded ${count} reminders into scheduler`)
  } catch (e) {
    console.error('initScheduler error:', e)
  }
}
