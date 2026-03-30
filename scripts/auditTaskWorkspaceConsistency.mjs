/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'

function parseArgs(argv = []) {
  const options = {
    applyResolvedMissing: false,
    reportPath: null,
    sample: 20,
    userId: null,
  }

  for (const arg of argv) {
    if (arg === '--apply-resolved-missing') {
      options.applyResolvedMissing = true
      continue
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length).trim() || null
      continue
    }
    if (arg.startsWith('--sample=')) {
      const next = Number.parseInt(arg.slice('--sample='.length), 10)
      if (Number.isFinite(next) && next > 0) options.sample = next
      continue
    }
    if (arg.startsWith('--user=')) {
      const next = arg.slice('--user='.length).trim()
      options.userId = next || null
    }
  }

  return options
}

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

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8')
      const parsed = JSON.parse(decoded)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      return parsed
    } catch {}

    try {
      const parsed = JSON.parse(raw)
      if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
      return parsed
    } catch {}
  }

  const candidatePaths = [
    process.env.FIREBASE_CREDENTIAL_PATH || '',
    'firebase-service-account.json',
    'apps/backend-node/firebase-service-account.json',
    'apps/audit-agent-frontend/scripts/firebase-service-account.json',
  ]
    .map((candidate) => candidate && path.resolve(process.cwd(), candidate))
    .filter(Boolean)

  for (const filePath of candidatePaths) {
    if (!fs.existsSync(filePath)) continue
    const parsed = safeReadJson(filePath)
    if (!parsed) continue
    if (parsed?.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key)
    return parsed
  }

  return null
}

function ensureFirebase() {
  if (admin.apps.length) return admin.app()
  const serviceAccount = loadServiceAccount()
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    serviceAccount?.project_id ||
    null

  if (!serviceAccount && !projectId) {
    throw new Error(
      'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_CREDENTIAL_PATH, or place a service account JSON in a known local path.',
    )
  }

  const credential = serviceAccount
    ? admin.credential.cert({
        projectId,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      })
    : admin.credential.applicationDefault()

  admin.initializeApp({ credential, projectId: projectId || serviceAccount?.project_id || undefined })
  return admin.app()
}

function normalizeWorkspaceId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function normalizeUid(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const trimmed = String(value).trim()
  return trimmed || null
}

function shouldAuditTask(data, options) {
  if (!options.userId) return true
  const userId = normalizeUid(data?.userId)
  const createdBy = normalizeUid(data?.createdBy)
  return userId === options.userId || createdBy === options.userId
}

async function listTaskDocs(db) {
  const docs = []
  const pageSize = 500
  let cursor = null

  while (true) {
    let ref = db.collection('tasks').orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize)
    if (cursor) ref = ref.startAfter(cursor)
    const snap = await ref.get()
    if (snap.empty) break
    docs.push(...snap.docs)
    cursor = snap.docs[snap.docs.length - 1].id
    if (snap.size < pageSize) break
  }

  return docs
}

function buildCaches() {
  return {
    activeWorkspaceIdsByUser: new Map(),
    workspaceExists: new Map(),
  }
}

async function getActiveWorkspaceIdsForUser(db, caches, uid) {
  if (!uid) return []
  if (caches.activeWorkspaceIdsByUser.has(uid)) {
    return caches.activeWorkspaceIdsByUser.get(uid)
  }
  const snap = await db
    .collection('workspace_members')
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .get()
  const ids = snap.docs
    .map((docSnap) => normalizeWorkspaceId(docSnap.get('workspaceId')))
    .filter(Boolean)
  caches.activeWorkspaceIdsByUser.set(uid, ids)
  return ids
}

async function workspaceExists(db, caches, workspaceId) {
  if (!workspaceId) return false
  if (caches.workspaceExists.has(workspaceId)) return caches.workspaceExists.get(workspaceId)
  const snap = await db.collection('workspaces').doc(workspaceId).get()
  const exists = !!snap.exists
  caches.workspaceExists.set(workspaceId, exists)
  return exists
}

function pushIssue(issues, code, details = {}) {
  issues.push({ code, details })
}

function buildAuditRow(taskDoc, data, issues, activeWorkspaceIds) {
  const workspaceId = normalizeWorkspaceId(data?.workspaceId)
  const userId = normalizeUid(data?.userId)
  const createdBy = normalizeUid(data?.createdBy)
  const ownerUid = createdBy || userId || null
  const singleActiveWorkspaceId = activeWorkspaceIds.length === 1 ? activeWorkspaceIds[0] : null

  return {
    id: taskDoc.id,
    title: String(data?.title || '').trim() || null,
    workspaceId,
    userId,
    createdBy,
    ownerUid,
    activeWorkspaceIds,
    singleActiveWorkspaceId,
    issues,
  }
}

function printSummary(summary, sampleSize) {
  console.log(`Scanned ${summary.totalScanned} tasks`)
  console.log(`Flagged ${summary.flaggedCount} inconsistent tasks`)
  console.log(`Auto-fixed ${summary.fixedCount} missing workspaceId tasks`)
  console.log('')
  console.log('Issue counts:')
  for (const [code, count] of Object.entries(summary.issueCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`- ${code}: ${count}`)
  }

  if (!summary.samples.length) return
  console.log('')
  console.log(`Sample flagged tasks (up to ${sampleSize}):`)
  for (const sample of summary.samples) {
    const issueCodes = sample.issues.map((issue) => issue.code).join(', ')
    console.log(`- ${sample.id} | workspaceId=${sample.workspaceId || 'null'} | owner=${sample.ownerUid || 'null'} | issues=${issueCodes}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  ensureFirebase()
  const db = admin.firestore()
  const caches = buildCaches()
  const taskDocs = await listTaskDocs(db)

  const summary = {
    totalScanned: 0,
    flaggedCount: 0,
    fixedCount: 0,
    issueCounts: {},
    samples: [],
    tasks: [],
  }

  for (const taskDoc of taskDocs) {
    const data = taskDoc.data() || {}
    if (!shouldAuditTask(data, options)) continue
    summary.totalScanned += 1

    const workspaceId = normalizeWorkspaceId(data.workspaceId)
    const userId = normalizeUid(data.userId)
    const createdBy = normalizeUid(data.createdBy)
    const ownerUid = createdBy || userId || null
    const activeWorkspaceIds = ownerUid ? await getActiveWorkspaceIdsForUser(db, caches, ownerUid) : []
    const issues = []

    if (!ownerUid) {
      pushIssue(issues, 'missingOwnerUid')
    }
    if (userId && createdBy && userId !== createdBy) {
      pushIssue(issues, 'userIdCreatedByMismatch', { userId, createdBy })
    }

    if (!workspaceId) {
      const issueCode = data.workspaceId === '' ? 'blankWorkspaceId' : 'missingWorkspaceId'
      pushIssue(issues, issueCode)

      if (ownerUid && activeWorkspaceIds.length === 0) {
        pushIssue(issues, 'ownerHasNoActiveWorkspace')
      }
      if (ownerUid && activeWorkspaceIds.length > 1) {
        pushIssue(issues, 'missingWorkspaceAmbiguousOwnerMembership', { activeWorkspaceIds })
      }
      if (ownerUid && activeWorkspaceIds.length === 1) {
        pushIssue(issues, 'missingWorkspaceResolvable', { suggestedWorkspaceId: activeWorkspaceIds[0] })
      }
    } else {
      const exists = await workspaceExists(db, caches, workspaceId)
      if (!exists) {
        pushIssue(issues, 'workspaceDocumentMissing', { workspaceId })
      }

      if (ownerUid && !activeWorkspaceIds.includes(workspaceId)) {
        pushIssue(issues, 'ownerNotActiveInTaskWorkspace', { workspaceId, activeWorkspaceIds })
        if (activeWorkspaceIds.length === 1) {
          pushIssue(issues, 'taskWorkspaceDiffersFromOwnersOnlyActiveWorkspace', {
            workspaceId,
            suggestedWorkspaceId: activeWorkspaceIds[0],
          })
        }
      }
    }

    if (!issues.length) continue

    const row = buildAuditRow(taskDoc, data, issues, activeWorkspaceIds)
    summary.flaggedCount += 1
    summary.tasks.push(row)
    if (summary.samples.length < options.sample) summary.samples.push(row)
    for (const issue of issues) {
      summary.issueCounts[issue.code] = (summary.issueCounts[issue.code] || 0) + 1
    }

    if (!options.applyResolvedMissing) continue
    const resolvable = issues.find((issue) => issue.code === 'missingWorkspaceResolvable')
    if (!resolvable?.details?.suggestedWorkspaceId) continue

    await db.collection('tasks').doc(taskDoc.id).set(
      {
        workspaceId: resolvable.details.suggestedWorkspaceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    summary.fixedCount += 1
  }

  printSummary(summary, options.sample)

  if (options.reportPath) {
    const reportPath = path.resolve(process.cwd(), options.reportPath)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2))
    console.log('')
    console.log(`Report written to ${reportPath}`)
  }
}

main().catch((error) => {
  console.error('Task workspace audit failed:', error?.message || error)
  process.exit(1)
})
