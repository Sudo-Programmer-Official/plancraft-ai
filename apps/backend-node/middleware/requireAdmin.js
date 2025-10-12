import { attachAuth, ensureUserMatches } from './auth.js'
import { db } from '../services/firebaseAdmin.js'

export default async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      await attachAuth(req, res, () => {})
    }
    if (!req.user?.uid) return res.status(401).json({ error: 'Unauthorized' })

    // Dev override: allow any if explicitly set
    if (process.env.ADMIN_ALLOW_ANY === '1') return next()

    // Optional trust header in staging
    if (process.env.ADMIN_TRUST_HEADER === '1') {
      const hdrRole = (req.headers['x-user-role'] || '').toString().toLowerCase()
      if (hdrRole === 'admin' || hdrRole === 'superadmin') return next()
    }

    // Fetch role from Firestore
    const snap = await db.collection('users').doc(String(req.user.uid)).get()
    const data = snap.exists ? (snap.data() || {}) : {}
    const role = (data.role || '').toString().toLowerCase()
    if (role === 'admin' || role === 'superadmin') return next()
    return res.status(403).json({ error: 'Forbidden' })
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// Factory that ensures admin and optionally enforces userId match semantics
// Options:
// - selfOnly: if true, require that any provided userId/uid matches the admin's uid
// - enforceWhenPresent: if true (default), enforce match only when userId/uid is present
export function requireAdminAndMatch(options = {}) {
  const { selfOnly = false, enforceWhenPresent = true } = options || {}
  return async (req, res, next) => {
    return requireAdmin(req, res, async () => {
      if (selfOnly) return ensureUserMatches(req, res, next)
      if (enforceWhenPresent) {
        const q = req.query || {}
        const b = req.body || {}
        const p = req.params || {}
        const provided = String(b.userId || q.userId || q.uid || p.userId || '')
        if (provided) return ensureUserMatches(req, res, next)
      }
      return next()
    })
  }
}
