/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'

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
  if (!/-----BEGIN PRIVATE KEY-----/.test(privateKey)) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
  }
  return privateKey
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    // Try base64
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      return parsed
    } catch {}
    // Try raw JSON
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      return parsed
    } catch {}
  }
  const candidate = process.env.FIREBASE_CREDENTIAL_PATH
  if (candidate) {
    const abs = path.resolve(process.cwd(), candidate)
    if (fs.existsSync(abs)) {
      return JSON.parse(fs.readFileSync(abs, 'utf-8'))
    }
  }
  return null
}

function ensureFirebase() {
  if (admin.apps.length) return admin.app()
  const svc = loadServiceAccount()
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    svc?.project_id
  if (!svc && !projectId) throw new Error('Missing Firebase credentials')
  const credential = svc
    ? admin.credential.cert({
        projectId,
        clientEmail: svc.client_email,
        privateKey: svc.private_key,
      })
    : admin.credential.applicationDefault()
  admin.initializeApp({ credential, projectId })
  return admin.app()
}

async function ensureWorkspace(db, uid) {
  const wsSnap = await db.collection('users').doc(uid).collection('workspaces').limit(1).get()
  if (!wsSnap.empty) {
    const doc = wsSnap.docs[0]
    return { id: doc.id, ...(doc.data() || {}) }
  }
  const payload = {
    name: 'Personal',
    icon: '✨',
    color: 'indigo',
    workspaceType: 'personal',
    description: 'Auto-created during migration',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
  const ref = await db.collection('users').doc(uid).collection('workspaces').add(payload)
  return { id: ref.id, ...payload }
}

async function migrateUser(db, uid) {
  const tasksSnap = await db.collection('tasks').where('userId', '==', uid).get()
  if (tasksSnap.empty) {
    console.log(`User ${uid}: no root tasks`)
    return
  }
  const rootTasks = tasksSnap.docs.filter((d) => !d.get('workspaceId'))
  if (!rootTasks.length) {
    console.log(`User ${uid}: no unmigrated tasks`)
    return
  }
  const ws = await ensureWorkspace(db, uid)
  const wsTasksCol = db.collection('users').doc(uid).collection('workspaces').doc(ws.id).collection('tasks')
  let migrated = 0
  for (const doc of rootTasks) {
    const data = doc.data()
    const payload = {
      ...data,
      workspaceId: ws.id,
      migratedFromRoot: true,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    await wsTasksCol.doc(doc.id).set(payload, { merge: true })
    migrated += 1
  }
  await db.collection('users').doc(uid).set({ hasMigratedTasks: true }, { merge: true })
  console.log(`User ${uid}: migrated ${migrated} tasks to workspace ${ws.id}`)
}

async function main() {
  ensureFirebase()
  const db = admin.firestore()
  const usersSnap = await db.collection('users').get()
  const uids = usersSnap.docs.map((d) => d.id)
  console.log(`Found ${uids.length} users`)
  for (const uid of uids) {
    try {
      await migrateUser(db, uid)
    } catch (err) {
      console.error(`User ${uid} migration failed:`, err?.message || err)
    }
  }
  console.log('Migration complete')
  process.exit(0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
