import { Pinecone } from '@pinecone-database/pinecone'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || ''
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'plancraft-memory'
const DEFAULT_TOP_K = Number(process.env.VECTOR_TOP_K || 10)

let pineconeClient = null
let index = null

async function getIndex() {
  if (!PINECONE_API_KEY) throw new Error('PINECONE_API_KEY not set')
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY })
    index = pineconeClient.index(PINECONE_INDEX_NAME)
  }
  return index
}

export async function upsertEmbeddings(items = [], opts = {}) {
  if (!items.length) return
  const idx = await getIndex()
  const target = opts.namespace ? idx.namespace(opts.namespace) : idx
  const records = items.map((it) => ({
    id: it.id,
    values: it.embedding,
    metadata: {
      userId: it.userId,
      workspaceId: it.workspaceId,
      type: it.type,
      text: it.metadata?.text || '',
      title: it.metadata?.title || '',
      category: it.metadata?.category || '',
      tags: it.metadata?.tags || [],
      createdAt: it.metadata?.createdAt || null,
      sourcePath: it.metadata?.sourcePath || '',
      docId: it.metadata?.docId || null,
      chunkId: it.metadata?.chunkId || it.id || null,
      chunkIndex: it.metadata?.chunkIndex ?? null,
      heading: it.metadata?.heading || null,
    },
  }))
  await target.upsert(records)
}

export async function deleteEmbeddings(ids = [], opts = {}) {
  if (!ids.length) return
  const idx = await getIndex()
  const target = opts.namespace ? idx.namespace(opts.namespace) : idx
  await target.deleteMany(ids)
}

export async function searchSimilar(queryEmbedding, opts = {}) {
  const idx = await getIndex()
  const topK = opts.topK || DEFAULT_TOP_K
  const filter = {
    userId: opts.userId,
    workspaceId: opts.workspaceId,
  }
  if (opts.types && Array.isArray(opts.types) && opts.types.length) {
    filter.type = { $in: opts.types }
  }

  const target = opts.namespace ? idx.namespace(opts.namespace) : idx
  const res = await target.query({
    topK,
    vector: queryEmbedding,
    filter,
    includeMetadata: true,
  })

  const matches = res?.matches || []
  return matches.map((m) => ({
    id: m.id,
    score: m.score,
    type: m.metadata?.type,
    userId: m.metadata?.userId,
    workspaceId: m.metadata?.workspaceId,
    metadata: {
      text: m.metadata?.text,
      title: m.metadata?.title,
      category: m.metadata?.category,
      tags: m.metadata?.tags,
      createdAt: m.metadata?.createdAt,
      sourcePath: m.metadata?.sourcePath,
      docId: m.metadata?.docId,
      chunkId: m.metadata?.chunkId || m.id,
      chunkIndex: m.metadata?.chunkIndex,
      heading: m.metadata?.heading,
    },
  }))
}
