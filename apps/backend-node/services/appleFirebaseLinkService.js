import admin from 'firebase-admin'
import { db } from './firebaseAdmin.js'
import { ensureUserProfile } from './userService.js'

function getFirebaseApiKey() {
  return (
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    ''
  ).trim()
}

function coerceAppleEmailVerified(value) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return false
}

function buildDisplayName({ appleUser = null, claims = {}, fallback = '' } = {}) {
  const firstName = String(appleUser?.name?.firstName || '').trim()
  const lastName = String(appleUser?.name?.lastName || '').trim()
  const fromAppleUser = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (fromAppleUser) return fromAppleUser
  const fromClaims = String(claims?.name || claims?.email || '').trim()
  return fromClaims || String(fallback || '').trim()
}

async function signInWithAppleInFirebase({ appleIdToken, requestUri }) {
  const apiKey = getFirebaseApiKey()
  if (!apiKey) throw new Error('FIREBASE_API_KEY missing for Apple mobile auth')

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri: requestUri || 'https://plancraftai.com/api/auth/apple/callback',
        returnSecureToken: true,
        returnIdpCredential: true,
        postBody: `id_token=${encodeURIComponent(appleIdToken)}&providerId=apple.com`,
      }),
    },
  )

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = String(data?.error?.message || data?.error || response.statusText || 'Firebase Apple sign-in failed')
    const error = new Error(message)
    error.status = response.status
    error.responseData = data
    throw error
  }

  return data
}

async function findUserByAppleSubject(appleSubject) {
  if (!appleSubject) return null
  const snap = await db
    .collection('users')
    .where('authProviders.apple.subject', '==', String(appleSubject))
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  return {
    uid: doc.id,
    profile: doc.data() || {},
  }
}

async function findOrCreateUserByEmail(email, displayName, emailVerified) {
  if (email) {
    try {
      const user = await admin.auth().getUserByEmail(String(email))
      return { user, source: 'email-match' }
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error
    }
  }

  const payload = {}
  if (email) payload.email = String(email)
  if (displayName) payload.displayName = String(displayName)
  if (email) payload.emailVerified = emailVerified === true

  const user = await admin.auth().createUser(payload)
  return { user, source: 'created' }
}

async function fallbackResolveAppleUser({
  claims,
  appleUser = null,
} = {}) {
  const appleSubject = String(claims?.sub || '').trim()
  const email = String(claims?.email || appleUser?.email || '').trim() || null
  const emailVerified = coerceAppleEmailVerified(claims?.email_verified)
  const displayName = buildDisplayName({ appleUser, claims, fallback: email || 'Apple User' })

  const existingBySubject = await findUserByAppleSubject(appleSubject)
  if (existingBySubject?.uid) {
    const user = await admin.auth().getUser(existingBySubject.uid)
    return {
      uid: user.uid,
      email: user.email || email,
      displayName: user.displayName || displayName,
      providerLinked: false,
      source: 'subject-match',
    }
  }

  const { user, source } = await findOrCreateUserByEmail(email, displayName, emailVerified)
  if (displayName && !user.displayName) {
    try {
      await admin.auth().updateUser(user.uid, { displayName })
    } catch {}
  }

  return {
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName || displayName,
    providerLinked: false,
    source,
  }
}

async function upsertAppleUserProfile(uid, {
  claims,
  appleUser = null,
  email = null,
  displayName = '',
  providerLinked = false,
  source = 'unknown',
} = {}) {
  const now = new Date()
  const subject = String(claims?.sub || '').trim()
  const effectiveName = String(displayName || buildDisplayName({ appleUser, claims, fallback: email || '' }) || '').trim()
  const effectiveEmail = String(email || claims?.email || appleUser?.email || '').trim() || null

  await ensureUserProfile(uid, {
    email: effectiveEmail || undefined,
    name: effectiveName || undefined,
    mode: 'apple',
    profileComplete: !!effectiveName,
  })

  await db.collection('users').doc(String(uid)).set(
    {
      email: effectiveEmail,
      ...(effectiveName ? { name: effectiveName } : {}),
      mode: 'apple',
      profileComplete: !!effectiveName,
      lastLoginAt: now,
      authProviders: {
        apple: {
          subject: subject || null,
          email: effectiveEmail,
          emailVerified: coerceAppleEmailVerified(claims?.email_verified),
          isPrivateEmail: claims?.is_private_email === true || claims?.is_private_email === 'true',
          providerLinked: providerLinked === true,
          source,
          lastLoginAt: now,
        },
      },
    },
    { merge: true },
  )
}

export async function resolveAppleFirebaseUser({
  claims,
  appleIdToken,
  appleUser = null,
  requestUri = '',
} = {}) {
  const email = String(claims?.email || appleUser?.email || '').trim() || null
  const displayName = buildDisplayName({ appleUser, claims, fallback: email || 'Apple User' })
  console.info('[AppleAuth][FirebaseLink] user mapping start', {
    subject: String(claims?.sub || '') || null,
    email,
    hasAppleUserPayload: !!appleUser,
  })

  try {
    const session = await signInWithAppleInFirebase({
      appleIdToken,
      requestUri,
    })
    const uid = String(session?.localId || '').trim()
    if (!uid) throw new Error('Firebase Apple sign-in did not return a user id')

    await upsertAppleUserProfile(uid, {
      claims,
      appleUser,
      email: session?.email || email,
      displayName: session?.displayName || displayName,
      providerLinked: true,
      source: 'firebase-idp',
    })
    console.info('[AppleAuth][FirebaseLink] user mapping success', {
      uid,
      email: session?.email || email,
      source: 'firebase-idp',
      providerLinked: true,
    })

    return {
      uid,
      email: session?.email || email,
      displayName: session?.displayName || displayName,
      providerLinked: true,
      source: 'firebase-idp',
    }
  } catch (error) {
    console.warn('[AppleAuth][FirebaseLink] Firebase IdP link failed; falling back to manual mapping', {
      message: error?.message || String(error),
      status: error?.status || null,
    })

    const fallback = await fallbackResolveAppleUser({ claims, appleUser })
    await upsertAppleUserProfile(fallback.uid, {
      claims,
      appleUser,
      email: fallback.email || email,
      displayName: fallback.displayName || displayName,
      providerLinked: false,
      source: `manual-${fallback.source}`,
    })
    console.info('[AppleAuth][FirebaseLink] user mapping success', {
      uid: fallback.uid,
      email: fallback.email || email,
      source: `manual-${fallback.source}`,
      providerLinked: false,
    })
    return fallback
  }
}
