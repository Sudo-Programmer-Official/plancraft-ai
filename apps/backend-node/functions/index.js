// Firebase Cloud Functions (optional deployment)
// Schedules pruning of old usage entries older than 14 days.

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

try { admin.initializeApp() } catch {}
const db = admin.firestore()

export const pruneOldUsage = functions.pubsub.schedule('0 0 * * *').timeZone('UTC').onRun(async () => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const cutoffKey = cutoff.toISOString().slice(0, 10)

  const users = await db.collection('users').get()
  const batch = db.batch()
  let count = 0

  users.forEach((doc) => {
    const data = doc.data() || {}
    const usage = data.usage || {}
    const kept = Object.fromEntries(Object.entries(usage).filter(([k]) => k >= cutoffKey))
    if (JSON.stringify(kept) !== JSON.stringify(usage)) {
      batch.update(doc.ref, { usage: kept })
      count++
    }
  })

  if (count) await batch.commit()
  console.log(`Pruned usage for ${count} user(s)`)
  return null
})

