import admin from 'firebase-admin'

let app

function normalizePrivateKey(raw) {
  if (!raw) return raw
  let privateKey = raw
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  if (!/-----BEGIN PRIVATE KEY-----/.test(privateKey)) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }
  return privateKey
}

function fromServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    const json = typeof raw === 'string' ? JSON.parse(raw) : raw
    return admin.credential.cert(json)
  } catch (err) {
    console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT', err?.message || err)
  }
  return null
}

function getCredential() {
  const fromJson = fromServiceAccount()
  if (fromJson) return fromJson

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  console.warn('[growth-service] Falling back to applicationDefault credentials')
  return admin.credential.applicationDefault()
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
