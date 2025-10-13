import { db } from './firebaseAdmin.js'

// Returns an array of { id, email, name }
export async function getAllActiveUsers(limit = 1000) {
  const snap = await db.collection('users').limit(limit).get()
  const out = []
  snap.forEach((d) => {
    const u = d.data() || {}
    if (u?.email) out.push({ id: d.id, email: u.email, name: u.displayName || u.name || null })
  })
  return out
}

