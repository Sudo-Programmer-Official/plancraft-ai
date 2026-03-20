import crypto from 'crypto'
import { db } from './firebaseAdmin.js'

const MOBILE_HANDOFF_COLLECTION = 'mobileAuthHandoffs'
const MOBILE_HANDOFF_TTL_MS = 5 * 60 * 1000

export function normalizeMobileAuthRedirectPath(target, fallback = '/dashboard') {
  if (typeof target !== 'string') return fallback
  const trimmed = target.trim()
  if (!trimmed) return fallback
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  if (trimmed.startsWith('//')) return fallback
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

export async function createMobileAuthHandoffForUser({
  uid,
  email = null,
  redirect = '/dashboard',
  provider = 'google',
  platform = 'android',
} = {}) {
  if (!uid) throw new Error('createMobileAuthHandoffForUser requires uid')

  const normalizedRedirect = normalizeMobileAuthRedirectPath(redirect)
  const code = crypto.randomBytes(24).toString('hex')
  const now = Date.now()
  const expiresAt = now + MOBILE_HANDOFF_TTL_MS

  await db.collection(MOBILE_HANDOFF_COLLECTION).doc(code).set({
    uid: String(uid),
    email: email || null,
    redirect: normalizedRedirect,
    provider: String(provider || 'google'),
    platform: String(platform || 'android'),
    createdAt: now,
    expiresAt,
  })

  return {
    code,
    redirect: normalizedRedirect,
    expiresAt,
    provider: String(provider || 'google'),
    platform: String(platform || 'android'),
  }
}

export async function consumeMobileAuthHandoffForCode(code) {
  const normalizedCode = String(code || '').trim()
  if (!normalizedCode) {
    const err = new Error('Missing handoff code')
    err.status = 400
    throw err
  }

  const ref = db.collection(MOBILE_HANDOFF_COLLECTION).doc(normalizedCode)
  const snap = await ref.get()
  if (!snap.exists) {
    const err = new Error('Mobile handoff not found')
    err.status = 404
    throw err
  }

  const data = snap.data() || {}
  const expiresAt = Number(data.expiresAt || 0)
  if (!expiresAt || expiresAt < Date.now()) {
    try { await ref.delete() } catch {}
    const err = new Error('Mobile handoff expired')
    err.status = 410
    throw err
  }

  const uid = String(data.uid || '')
  if (!uid) {
    try { await ref.delete() } catch {}
    const err = new Error('Mobile handoff is invalid')
    err.status = 400
    throw err
  }

  try { await ref.delete() } catch {}

  return {
    uid,
    email: data.email || null,
    redirect: normalizeMobileAuthRedirectPath(String(data.redirect || '/dashboard')),
    provider: String(data.provider || 'google'),
    platform: String(data.platform || 'android'),
  }
}

