import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

function resolveCredentialFromFile(candidatePath) {
  if (!candidatePath) return null
  try {
    const absolute = path.resolve(__dirname, candidatePath)
    if (!fs.existsSync(absolute)) return null
    return JSON.parse(fs.readFileSync(absolute, 'utf-8'))
  } catch (err) {
    console.error('[growth-service] Failed to read credential file', candidatePath, err?.message || err)
    return null
  }
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    // Try Base64 first (App Runner often stores secrets this way)
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID
      console.info('[growth-service] Using FIREBASE_SERVICE_ACCOUNT env (base64 decoded)')
      return parsed
    } catch (_) {
      // ignore and try raw JSON next
    }
    // Try raw JSON
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      if (!parsed?.project_id && process.env.FIREBASE_PROJECT_ID) parsed.project_id = process.env.FIREBASE_PROJECT_ID
      console.info('[growth-service] Using FIREBASE_SERVICE_ACCOUNT env (raw JSON)')
      return parsed
    } catch (err) {
      console.error('[growth-service] Invalid FIREBASE_SERVICE_ACCOUNT env', err?.message || err)
    }
  }

  const fallbackPath = process.env.FIREBASE_CREDENTIAL_PATH || '../../../backend-node/firebase-service-account.json'
  const fromFile = resolveCredentialFromFile(fallbackPath)
  if (fromFile) {
    if (fromFile.private_key) fromFile.private_key = normalizePrivateKey(fromFile.private_key)
    if (!fromFile.project_id && process.env.FIREBASE_PROJECT_ID) fromFile.project_id = process.env.FIREBASE_PROJECT_ID
    console.info('[growth-service] Using credential file', fallbackPath)
    return fromFile
  }

  return null
}

function getCredential() {
  const svc = loadServiceAccount()
  if (svc) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || svc.project_id,
      clientEmail: svc.client_email,
      privateKey: svc.private_key,
    })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
  if (projectId && clientEmail && privateKey) {
    console.info('[growth-service] Using FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars')
    return admin.credential.cert({ projectId, clientEmail, privateKey })
  }

  // Last resort: applicationDefault requires projectId
  if (projectId) {
    console.warn('[growth-service] Falling back to applicationDefault with projectId from env')
    return admin.credential.applicationDefault()
  }

  throw new Error(
    '[growth-service] Firebase credentials missing: set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY',
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
