import { db } from "./firebaseAdmin.js"
import { queueReminder } from "./reminderService.js"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

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
      if (data?.status && String(data.status).toLowerCase() !== 'scheduled') return
      const reminder = { id: doc.id, ...data }
      queueReminder(reminder)
      const ts = (data?.scheduledTime?.toDate ? data.scheduledTime.toDate() : data.scheduledTime)
      const utcIso = ts?.toISOString?.() || String(ts)
      const tz = data?.timezone || 'UTC'
      const localFmt = dayjs.utc(utcIso).tz(tz).format('YYYY-MM-DD HH:mm')
      console.log(`[Scheduler] Queued reminder on boot id=${doc.id} taskId=${data?.taskId || 'n/a'} UTC=${utcIso} Local(${tz})=${localFmt}`)
      count++
    })
    console.log(`📅 Loaded ${count} reminders into scheduler`)
  } catch (e) {
    console.error('initScheduler error:', e)
  }
}
