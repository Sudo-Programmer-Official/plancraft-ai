import admin from 'firebase-admin'

let app
const projectIdEnv =
  process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null
if (projectIdEnv && !process.env.GOOGLE_CLOUD_PROJECT) process.env.GOOGLE_CLOUD_PROJECT = projectIdEnv
if (projectIdEnv && !process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = projectIdEnv

function decodeBase64Maybe(value) {
  if (!value || typeof value !== 'string') return value
  const base64ish = /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0
  if (!base64ish) return value
  try {
    return Buffer.from(value, 'base64').toString('utf-8')
  } catch {
    return value
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return raw
  let privateKey = decodeBase64Maybe(raw) || raw
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  // Some environments store the key without PEM headers; add them if missing
  if (!/-----BEGIN PRIVATE KEY-----/.test(privateKey)) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }
  return privateKey
}

function fromServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    let json = raw
    // Try base64 decode if it looks encoded
    if (typeof raw === 'string') {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8')
        json = JSON.parse(decoded)
      } catch {
        json = JSON.parse(raw)
      }
    }
    const projectId = json.project_id
    const clientEmail = json.client_email
    const privateKey = normalizePrivateKey(json.private_key)
    if (projectId && clientEmail && privateKey) {
      return admin.credential.cert({ projectId, clientEmail, privateKey })
    }
  } catch (err) {
    console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT', err?.message || err)
  }
  return null
}

function getCredential() {
  const fromJson = fromServiceAccount()
  if (fromJson) return fromJson

  const projectId = projectIdEnv
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.credential.applicationDefault()
  }

  throw new Error(
    'Firebase credentials missing: set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS',
  )
}

export function ensureApp() {
  if (app) return app
  if (admin.apps.length) {
    app = admin.apps[0]
    return app
  }
  admin.initializeApp({
    credential: getCredential(),
  })
  app = admin.app()
  return app
}
