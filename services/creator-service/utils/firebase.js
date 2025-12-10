import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let app
const projectIdEnv =
  process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null
// Ensure project id is available to Google libraries that rely on the env var
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
  // Handle base64-encoded key blobs
  let privateKey = decodeBase64Maybe(raw) || raw
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n')
  if (!/-----BEGIN PRIVATE KEY-----/.test(privateKey)) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }
  return privateKey
}

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
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    // Try base64 first
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID
      console.info('[creator-service] Using FIREBASE_SERVICE_ACCOUNT env (base64)')
      return parsed
    } catch (_) {}
    // Try raw JSON
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID
      console.info('[creator-service] Using FIREBASE_SERVICE_ACCOUNT env (raw)')
      return parsed
    } catch (err) {
      console.error('[creator-service] Invalid FIREBASE_SERVICE_ACCOUNT JSON', err?.message || err)
    }
  }
  const fromExplicitPath = resolveCredentialFromFile(process.env.FIREBASE_CREDENTIAL_PATH)
  if (fromExplicitPath) return fromExplicitPath
  return null
}

function getCredential() {
  const svc = loadServiceAccount()
  if (svc) return admin.credential.cert({
    projectId: projectIdEnv || svc.project_id,
    clientEmail: svc.client_email,
    privateKey: svc.private_key,
  })

  const projectId = projectIdEnv
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  if (projectId) {
    console.warn('[creator-service] Falling back to applicationDefault credentials with projectId')
    return admin.credential.applicationDefault()
  }

  throw new Error('[creator-service] Firebase credentials missing: set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY')
}

export function ensureApp() {
  if (app) return app
  if (admin.apps.length) {
    app = admin.apps[0]
    return app
  }
  admin.initializeApp({
    credential: getCredential(),
    projectId: projectIdEnv || undefined,
  })
  app = admin.app()
  return app
}
