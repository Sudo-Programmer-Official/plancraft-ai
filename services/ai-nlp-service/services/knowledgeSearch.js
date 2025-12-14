import admin from 'firebase-admin'
import crypto from 'crypto'
import { ensureApp } from '../utils/firebase.js'
import { embedTexts } from './embeddings.js'
import { searchSimilar } from './vectorStore.js'

const DOCS = 'workspace_docs'
const CHUNKS = 'workspace_doc_chunks'
const FALLBACK_DAYS = Number(process.env.KNOWLEDGE_FALLBACK_DAYS || 30)
const FALLBACK_CHUNK_LIMIT = Number(process.env.KNOWLEDGE_FALLBACK_CHUNKS || 50)

function getDb() {
  ensureApp()
  return admin.firestore()
}

function hash(str) {
  return crypto.createHash('sha256').update(String(str || '')).digest('hex')
}

export async function knowledgeSearch(workspaceId, query, topK = 6, docId = null) {
  if (!workspaceId) throw new Error('workspaceId is required')
  const q = String(query || '').trim()
  if (!q) return { items: [], source: 'fallback', cacheKey: null, moreAvailable: false }

  const cacheKey = hash(`${workspaceId}:${q}`).slice(0, 12)
  const vectorEnabled = !!process.env.PINECONE_API_KEY

  if (vectorEnabled) {
    try {
      const [embedding] = await embedTexts([q])
      let matches = await searchSimilar(embedding, {
        workspaceId,
        topK,
        namespace: workspaceId,
      })
      if (docId) {
        matches = matches.filter((m) => m.metadata?.docId === docId)
      }
      if (matches?.length) {
        const items = matches.slice(0, topK).map((m) => ({
          docId: m.metadata?.docId || m.metadata?.sourcePath || null,
          chunkId: m.metadata?.chunkId || m.id,
          text: m.metadata?.text || '',
          score: m.score,
          source: 'vector',
          metadata: {
            heading: m.metadata?.heading || null,
            chunkIndex: m.metadata?.chunkIndex ?? null,
          },
        }))
        return { items, source: 'vector', cacheKey, moreAvailable: matches.length > items.length }
      }
    } catch (err) {
      console.warn('[knowledgeSearch] vector path failed', err?.message || err)
    }
  }

  // Fallback keyword search
  const db = getDb()
  const since = new Date()
  since.setDate(since.getDate() - FALLBACK_DAYS)
  let readyDocIds = []
  if (docId) {
    const docSnap = await db.collection(DOCS).doc(docId).get()
    if (docSnap.exists && docSnap.data()?.status === 'ready') {
      readyDocIds = [docId]
    }
  } else {
    const readyDocsSnap = await db
      .collection(DOCS)
      .where('workspaceId', '==', workspaceId)
      .where('status', '==', 'ready')
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get()
    readyDocIds = readyDocsSnap.docs
      .filter((d) => {
        const createdAt = d.data()?.createdAt
        if (!createdAt) return true
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
        return created >= since
      })
      .map((d) => d.id)
  }

  const chunkCandidates = []
  for (let i = 0; i < readyDocIds.length; i += 10) {
    const batchIds = readyDocIds.slice(i, i + 10)
    if (!batchIds.length) break
    if (chunkCandidates.length >= FALLBACK_CHUNK_LIMIT) break
    const snap = await db
      .collection(CHUNKS)
      .where('workspaceId', '==', workspaceId)
      .where('docId', 'in', batchIds)
      .orderBy('createdAt', 'desc')
      .limit(FALLBACK_CHUNK_LIMIT)
      .get()
    snap.forEach((doc) => chunkCandidates.push({ id: doc.id, ...(doc.data() || {}) }))
  }

  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 12)
  const candidatePool = chunkCandidates.slice(0, FALLBACK_CHUNK_LIMIT)

  const scored = candidatePool.map((c) => {
    const text = String(c.text || '').toLowerCase()
    let score = 0
    tokens.forEach((tok) => {
      if (!tok) return
      const matches = text.split(tok).length - 1
      score += matches
    })
    const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || Date.now())
    const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const recencyBoost = Math.max(0, 1.5 - ageDays * 0.1)
    return { ...c, score: score + recencyBoost }
  })

  const top = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((c) => ({
      docId: c.docId,
      chunkId: c.id,
      text: c.text,
      score: c.score,
      source: 'fallback',
      metadata: c.metadata || {},
    }))

  return { items: top, source: 'fallback', cacheKey, moreAvailable: scored.length > top.length }
}
