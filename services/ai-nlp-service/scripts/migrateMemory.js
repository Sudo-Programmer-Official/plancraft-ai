// node services/ai-nlp-service/scripts/migrateMemory.js <userId> <workspaceId>
import admin from 'firebase-admin'
import path from 'path'
import url from 'url'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { upsertEmbeddings } from '../services/vectorStore.js'
import { embedText } from '../services/embeddings.js'
import { buildTextForItem } from '../controllers/memoryController.js'

dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initFirebase() {
  if (admin.apps.length) return
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
}

async function fetchCollection(db, pathParts, limit = 100) {
  const ref = db.collection(path.join(...pathParts).replace(/\\/g, '/'))
  try {
    const snap = await ref.limit(limit).get()
    return snap
  } catch {
    return null
  }
}

async function main() {
  const [, , userId, workspaceId] = process.argv
  if (!userId || !workspaceId) {
    console.error('Usage: node scripts/migrateMemory.js <userId> <workspaceId>')
    process.exit(1)
  }

  await initFirebase()
  const db = admin.firestore()
  const basePath = ['users', userId, 'workspaces', workspaceId]

  const napkinSnap = await fetchCollection(db, [...basePath, 'napkin', 'items'], 120)
  const draftsSnap = await fetchCollection(db, [...basePath, 'drafts'], 80)
  const tasksSnap = await fetchCollection(db, [...basePath, 'tasks'], 120)
  const eventsSnap = await fetchCollection(db, ['leaders', userId, 'events'], 120)
  const issuesSnap = await fetchCollection(db, ['leaders', userId, 'issues'], 120)

  const items = []

  const pushItem = (payload) => {
    const text = payload.text || payload.title
    if (!text || String(text).length < 8) return
    items.push(payload)
  }

  if (napkinSnap?.size) {
    napkinSnap.forEach((doc) => {
      const d = doc.data()
      pushItem({
        id: `napkin:${doc.id}`,
        type: 'napkin',
        title: null,
        text: d.text || d.body || '',
        tags: d.tags || [],
        category: null,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        sourcePath: doc.ref.path,
      })
    })
  }

  if (draftsSnap?.size) {
    draftsSnap.forEach((doc) => {
      const d = doc.data()
      pushItem({
        id: `draft:${doc.id}`,
        type: 'draft',
        title: d.title || 'Draft',
        text: d.summary || d.body || '',
        tags: d.tags || [],
        category: d.category || null,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        sourcePath: doc.ref.path,
      })
    })
  }

  if (tasksSnap?.size) {
    tasksSnap.forEach((doc) => {
      const d = doc.data()
      pushItem({
        id: `task:${doc.id}`,
        type: 'task',
        title: d.title || d.name || 'Task',
        text: d.details || d.notes || '',
        tags: d.tags || [],
        category: d.category || null,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        sourcePath: doc.ref.path,
      })
    })
  }

  if (eventsSnap?.size) {
    eventsSnap.forEach((doc) => {
      const d = doc.data()
      pushItem({
        id: `event:${doc.id}`,
        type: 'event',
        title: d.title || d.name || 'Event',
        text: d.description || d.notes || '',
        tags: d.tags || [],
        category: d.category || null,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        sourcePath: doc.ref.path,
      })
    })
  }

  if (issuesSnap?.size) {
    issuesSnap.forEach((doc) => {
      const d = doc.data()
      pushItem({
        id: `issue:${doc.id}`,
        type: 'issue',
        title: d.title || d.summary || 'Issue',
        text: d.description || d.notes || '',
        tags: d.tags || [],
        category: d.category || null,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        sourcePath: doc.ref.path,
      })
    })
  }

  console.log(`Found ${items.length} items to embed`)
  const prepared = []
  for (const raw of items) {
    const text = buildTextForItem(raw)
    if (!text || text.length < 20) continue
    const embedding = await embedText(text)
    if (!embedding.length) continue
    prepared.push({
      id: raw.id,
      userId,
      workspaceId,
      type: raw.type,
      embedding,
      metadata: {
        text,
        title: raw.title,
        category: raw.category,
        tags: raw.tags,
        createdAt: raw.createdAt,
        sourcePath: raw.sourcePath,
      },
    })
  }

  if (!prepared.length) {
    console.log('Nothing to upsert')
    process.exit(0)
  }

  await upsertEmbeddings(prepared)
  console.log(`Upserted ${prepared.length} embeddings`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
