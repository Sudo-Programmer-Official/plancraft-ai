import admin from 'firebase-admin'
import './firebaseAdmin.js'
import { db } from './firebaseAdmin.js'
import {
  buildAuthIdentityDocumentId,
  getVerifiedAuthIdentities,
  maskIdentityValue,
  normalizeAuthProvider,
} from '../utils/authIdentity.js'

const IDENTITY_COLLECTION = 'authIdentities'
const LEGACY_PHONE_FIELDS = [
  'phone',
  'authProviders.phone.phoneNumber',
  'preferences.notifications.phone_sms',
  'preferences.notifications.phone_voice',
  'integrations.sms.phone',
  'integrations.whatsapp.phone',
]

function identityConflictError(conflicts) {
  const isPhoneConflict = conflicts.some((conflict) => conflict?.provider === 'phone')
  const error = new Error(
    isPhoneConflict
      ? 'This phone number is associated with another PlanCraft account. Sign in to that account first. No accounts or data were merged.'
      : 'This sign-in method is already linked to another PlanCraft account. Sign in to that account first. No accounts or data were merged.',
  )
  error.code = 'auth/identity-conflict'
  error.status = 409
  error.conflicts = conflicts
  return error
}

async function findLegacyPhoneConflictIds(sourceUid, phoneNumber) {
  const normalizedPhone = String(phoneNumber || '').trim()
  if (!normalizedPhone) return []

  const results = await Promise.allSettled(
    LEGACY_PHONE_FIELDS.map((field) =>
      db.collection('users').where(field, '==', normalizedPhone).limit(25).get(),
    ),
  )
  const conflictIds = new Set()

  results.forEach((result) => {
    if (result.status !== 'fulfilled') return
    result.value.docs.forEach((snapshot) => {
      const data = snapshot.data() || {}
      const candidateId = String(data?.canonicalUserId || snapshot.id).trim()
      if (candidateId && candidateId !== sourceUid) conflictIds.add(candidateId)
    })
  })

  return [...conflictIds]
}

/**
 * Resolve only identities verified by Firebase Auth. Existing profile phone
 * fields can only block a possible historical collision; they never select or
 * merge the canonical account because they may be stale or user-entered.
 */
export async function resolveVerifiedAuthIdentity(claims = {}, providerHint = '') {
  const sourceUid = String(claims?.uid || claims?.user_id || claims?.sub || '').trim()
  if (!sourceUid) throw new Error('Firebase token did not contain a uid')

  const provider = normalizeAuthProvider(providerHint, claims)
  const identities = getVerifiedAuthIdentities(claims, provider)
  if (!identities.length) {
    return {
      sourceUid,
      canonicalUserId: sourceUid,
      provider,
      identities: [],
      linked: false,
    }
  }

  const identityRefs = identities.map(({ provider: identityProvider, providerUid }) => ({
    provider: identityProvider,
    providerUid,
    ref: db.collection(IDENTITY_COLLECTION).doc(
      buildAuthIdentityDocumentId(identityProvider, providerUid),
    ),
  }))
  const snapshots = await Promise.all(identityRefs.map(({ ref }) => ref.get()))
  const conflicts = []
  const existingCanonicalIds = new Set()

  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return
    const data = snapshot.data() || {}
    const canonicalUserId = String(data?.canonicalUserId || '').trim()
    if (canonicalUserId && canonicalUserId !== sourceUid) {
      existingCanonicalIds.add(canonicalUserId)
      conflicts.push({
        provider: identityRefs[index].provider,
        identity: maskIdentityValue(identityRefs[index].providerUid),
      })
    }
  })

  if (conflicts.length) throw identityConflictError(conflicts)

  // Historical phone accounts may predate authIdentities. Use old profile
  // fields only as a collision signal; never select, merge, or rewrite the
  // legacy account automatically.
  const hasExistingIdentityMapping = snapshots.some((snapshot) => snapshot.exists)
  if (provider === 'phone' && !hasExistingIdentityMapping) {
    const legacyConflictIds = await findLegacyPhoneConflictIds(sourceUid, identities[0]?.providerUid)
    if (legacyConflictIds.length) {
      throw identityConflictError([
        {
          provider: 'phone',
          identity: maskIdentityValue(identities[0].providerUid),
        },
      ])
    }
  }

  const canonicalUserId = existingCanonicalIds.values().next().value || sourceUid
  const now = new Date()
  const batch = db.batch()
  const userRef = db.collection('users').doc(canonicalUserId)
  const userSnapshot = await userRef.get()
  const existingAuthProviders = userSnapshot.exists && userSnapshot.data()?.authProviders && typeof userSnapshot.data()?.authProviders === 'object'
    ? userSnapshot.data().authProviders
    : {}

  identityRefs.forEach(({ provider: identityProvider, providerUid, ref }, index) => {
    const snapshot = snapshots[index]
    const identityPatch = {
      canonicalUserId,
      sourceUid,
      provider: identityProvider,
      providerUid,
      verified: true,
      lastSeenAt: now,
    }
    if (!snapshot?.exists || !snapshot.data()?.linkedAt) {
      identityPatch.linkedAt = admin.firestore.FieldValue.serverTimestamp()
    }
    batch.set(
      ref,
      identityPatch,
      { merge: true },
    )
  })

  const profilePatch = {
    canonicalUserId,
    authIdentityVersion: 1,
    lastLoginAt: now,
    authProviders: {
      ...existingAuthProviders,
      [provider]: {
        ...(existingAuthProviders?.[provider] || {}),
        verified: true,
        providerUid: identities[0].providerUid,
        firebaseUid: sourceUid,
        lastSeenAt: now,
      },
    },
  }
  if (claims?.email) profilePatch.email = String(claims.email).trim().toLowerCase()
  if (claims?.phone_number) profilePatch.phone = String(claims.phone_number).trim()

  batch.set(userRef, profilePatch, { merge: true })
  await batch.commit()

  return {
    sourceUid,
    canonicalUserId,
    provider,
    identities,
    linked: canonicalUserId !== sourceUid,
  }
}

export async function syncVerifiedAuthIdentity(claims = {}, providerHint = '') {
  return resolveVerifiedAuthIdentity(claims, providerHint)
}
