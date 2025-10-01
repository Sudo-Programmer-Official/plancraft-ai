export default function requireAdmin(req, res, next) {
  // Dev-friendly check: trust x-user-role header set by frontend axios
  // For production: replace with Firebase Admin token verification and Firestore role lookup
  const role = (req.headers['x-user-role'] || '').toString().toLowerCase()
  const allowAny = process.env.ADMIN_ALLOW_ANY === '1'
  if (allowAny || role === 'admin') return next()
  return res.status(403).json({ error: 'Forbidden' })
}

