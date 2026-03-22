import { db } from './firebaseAdmin.js'

export const FEATURE_FLAGS_COLLECTION = 'feature_flags'
export const FEATURE_FLAGS_DOCUMENT = 'global'

export const DEFAULT_REMOTE_FEATURE_FLAGS = Object.freeze({
  APPLE_AUTH: false,
  AUTO_DEPLOY: false,
  PLAYBOOKS: true,
})

function coerceBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

export function normalizeFeatureFlags(raw = {}) {
  const next = {}
  for (const key of Object.keys(DEFAULT_REMOTE_FEATURE_FLAGS)) {
    if (Object.prototype.hasOwnProperty.call(raw || {}, key)) {
      next[key] = coerceBoolean(raw[key], DEFAULT_REMOTE_FEATURE_FLAGS[key])
    }
  }
  return next
}

export async function getRemoteFeatureFlags() {
  const snap = await db.collection(FEATURE_FLAGS_COLLECTION).doc(FEATURE_FLAGS_DOCUMENT).get()
  const data = snap.exists ? snap.data() || {} : {}
  const flags = {
    ...DEFAULT_REMOTE_FEATURE_FLAGS,
    ...normalizeFeatureFlags(data),
  }
  return {
    flags,
    updatedAt: data.updatedAt || null,
    updatedBy: data.updatedBy || null,
  }
}

export async function updateRemoteFeatureFlags(input = {}, actorUid = null) {
  const flags = normalizeFeatureFlags(input)
  await db.collection(FEATURE_FLAGS_COLLECTION).doc(FEATURE_FLAGS_DOCUMENT).set(
    {
      ...flags,
      updatedAt: new Date(),
      updatedBy: actorUid || null,
    },
    { merge: true },
  )
  return getRemoteFeatureFlags()
}
