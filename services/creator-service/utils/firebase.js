import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let app

function resolveCredentialFromFile(candidatePath) {
  if (!candidatePath) return null
  try {
    const absolute = path.resolve(__dirname, candidatePath)
    if (!fs.existsSync(absolute)) return null
    return JSON.parse(fs.readFileSync(absolute, 'utf-8'))
  } catch (err) {
    console.error('[creator-service] Failed to read credential file', candidatePath, err?.message || err)
    return null
  }
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    } catch (err) {
      console.error('[creator-service] Invalid FIREBASE_SERVICE_ACCOUNT JSON', err?.message || err)
    }
  }
  const fromExplicitPath = resolveCredentialFromFile(process.env.FIREBASE_CREDENTIAL_PATH)
  if (fromExplicitPath) return fromExplicitPath
  return null
}

function normalizePrivateKey(raw) {
  if (!raw) return raw
  let privateKey = raw
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  if (!/-----BEGIN PRIVATE KEY-----/.test(privateKey)) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }
  return privateKey
}

function getCredential() {
  const svc = loadServiceAccount()
  if (svc) return admin.credential.cert(svc)

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  console.warn('[creator-service] Falling back to applicationDefault credentials')
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
