import crypto from 'crypto'
import { db } from '../../../server/firebaseAdmin.js'

const INVITE_COLLECTION = (orgId) => db.collection(`orgs/${orgId}/invites`)
const MEMBERS_COLLECTION = (orgId) => db.collection(`orgs/${orgId}/members`)

const RATE_LIMIT_MAX = Number(process.env.INVITE_RATE_LIMIT_MAX || 5)
const RATE_LIMIT_WINDOW = Number(process.env.INVITE_RATE_LIMIT_WINDOW_MS || 24 * 60 * 60 * 1000)
const INVITE_EXPIRY_MS = Number(process.env.INVITE_EXPIRY_MS || 7 * 24 * 60 * 60 * 1000)

const rateBuckets = new Map()
const domainAllowlist = (process.env.INVITE_DOMAIN_ALLOWLIST || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean)

function logEvent(name, payload = {}) {
  try {
    console.log(JSON.stringify({ level: 'info', event: name, ...payload }))
  } catch {}
}

export function validateEmailDomain(email) {
  if (!domainAllowlist.length) return true
  const domain = String(email || '').split('@')[1]?.toLowerCase()
  return domain && domainAllowlist.includes(domain)
}

function bucketKey(uid) {
  return uid || 'anonymous'
}

export function checkInviteRateLimit(uid) {
  if (!uid) return
  const key = bucketKey(uid)
  const now = Date.now()
  const entry = rateBuckets.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_LIMIT_WINDOW
  }
  entry.count += 1
  rateBuckets.set(key, entry)
  if (entry.count > RATE_LIMIT_MAX) {
    const retryIn = Math.max(0, entry.resetAt - now)
    const err = new Error('Invite rate limit exceeded')
    err.status = 429
    err.retryAfterMs = retryIn
    throw err
  }
}

export function generateInviteToken() {
  return crypto.randomBytes(24).toString('hex')
}

export async function createInvite({ orgId, email, role = 'member', invitedBy, expiresAt }) {
  const now = new Date()
  const token = generateInviteToken()
  const expiresDate = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + INVITE_EXPIRY_MS)

  const data = {
    orgId,
    email: String(email).trim().toLowerCase(),
    role,
    invitedBy: invitedBy || null,
    token,
    status: 'pending',
    expiresAt: expiresDate,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await INVITE_COLLECTION(orgId).add(data)
  logEvent('invite_created', { orgId, invitedBy, email: data.email, role: data.role })
  return { id: ref.id, token, ...data }
}

export async function getInviteByToken(token) {
  const snap = await db.collectionGroup('invites').where('token', '==', token).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  const orgId = doc.ref.parent.parent?.id
  return { id: doc.id, orgId, ref: doc.ref, ...doc.data() }
}

export async function acceptInvite({ token, uid, userProfile }) {
  const invite = await getInviteByToken(token)
  if (!invite) {
    const err = new Error('Invite not found')
    err.status = 404
    throw err
  }

  if (invite.status !== 'pending') {
    const err = new Error('Invite already used or cancelled')
    err.status = 400
    throw err
  }

  const expires = invite.expiresAt?.toDate?.() || invite.expiresAt
  if (expires && expires < new Date()) {
    const err = new Error('Invite has expired')
    err.status = 400
    throw err
  }

  const batch = db.batch()

  const memberRef = MEMBERS_COLLECTION(invite.orgId).doc(uid)
  batch.set(memberRef, {
    uid,
    role: invite.role,
    joinedAt: new Date(),
    name: userProfile?.name || userProfile?.displayName || null,
    email: userProfile?.email || null,
  }, { merge: true })

  batch.update(invite.ref, {
    status: 'accepted',
    acceptedAt: new Date(),
    acceptedBy: uid,
  })

  await batch.commit()

  logEvent('invite_accepted', { orgId: invite.orgId, inviteId: invite.id, uid })
  return invite
}

export async function cancelInvite({ orgId, inviteId }) {
  const ref = INVITE_COLLECTION(orgId).doc(inviteId)
  await ref.update({ status: 'cancelled', updatedAt: new Date() })
}

export async function listInvites(orgId) {
  const snap = await INVITE_COLLECTION(orgId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function markInviteUsed(invite) {
  await invite.ref.update({ status: 'accepted', updatedAt: new Date() })
}

function ensureDate(value, fallback) {
  if (!value) return fallback
  const date = value?.toDate?.() || value
  const casted = new Date(date)
  return Number.isNaN(casted.getTime()) ? fallback : casted
}

async function getInviteDoc(orgId, inviteId) {
  const ref = INVITE_COLLECTION(orgId).doc(inviteId)
  const snap = await ref.get()
  if (!snap.exists) {
    const err = new Error('Invite not found')
    err.status = 404
    throw err
  }
  return { ref, data: snap.data(), id: snap.id }
}

export async function resendInvite({ orgId, inviteId, requestedBy }) {
  const { ref, data, id } = await getInviteDoc(orgId, inviteId)
  if (data.status === 'accepted') {
    const err = new Error('Invite already accepted')
    err.status = 400
    throw err
  }

  const now = new Date()
  const expires = ensureDate(data.expiresAt, new Date(now.getTime() + INVITE_EXPIRY_MS))
  const updates = {
    token: generateInviteToken(),
    status: 'pending',
    updatedAt: now,
    lastSentAt: now,
    expiresAt: expires < now ? new Date(now.getTime() + INVITE_EXPIRY_MS) : expires,
    resendCount: Number(data.resendCount || 0) + 1,
    lastResentBy: requestedBy || null,
  }

  await ref.update(updates)
  logEvent('invite_resent', { orgId, inviteId: id, requestedBy, email: data.email })

  return { id, ...data, ...updates }
}

export async function revokeInvite({ orgId, inviteId, requestedBy }) {
  const { ref, data, id } = await getInviteDoc(orgId, inviteId)
  if (data.status === 'accepted') {
    const err = new Error('Cannot revoke an accepted invite')
    err.status = 400
    throw err
  }

  const now = new Date()
  const updates = {
    status: 'revoked',
    revokedAt: now,
    revokedBy: requestedBy || null,
    updatedAt: now,
  }

  await ref.update(updates)
  logEvent('invite_revoked', { orgId, inviteId: id, requestedBy, email: data.email })

  return { id, ...data, ...updates }
}
