import { upsertEmbeddings, deleteEmbeddings, searchSimilar } from '../services/vectorStore.js'
import { embedText } from '../services/embeddings.js'
import { logAiEvent } from '../firestore/aiLogsRepository.js'

function normalizeText(str, maxLen = 500) {
  if (!str) return ''
  let s = String(str)
    .replace(/```[\s\S]*?```/g, '') // strip code blocks
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > maxLen) s = s.slice(0, maxLen - 1) + '…'
  return s
}

export function buildTextForItem(item = {}) {
  const { type, title, text, tags, category, platforms } = item
  const tagsPart = tags?.length ? `tags: #${tags.join(', #')}` : ''
  const catPart = category ? `category: ${category}.` : ''
  const platformsPart = platforms?.length ? `platforms: ${platforms.join(', ')}` : ''

  switch (type) {
    case 'napkin':
      return normalizeText(`[Napkin] ${tagsPart}\n${text}`)
    case 'draft':
      return normalizeText(`[Draft] ${title || ''}\n${catPart}\n${platformsPart}\n${text}`)
    case 'task':
      return normalizeText(`[Task] ${title || ''}\n${catPart}\n${text}`)
    case 'event':
      return normalizeText(`[Event] ${title || ''}\n${catPart}\n${text}`)
    case 'issue':
      return normalizeText(`[Issue] ${title || ''}\n${catPart}\n${text}`)
    default:
      return normalizeText(text || title || '')
  }
}

export async function upsertMemory(req, res, next) {
  try {
    const { userId, workspaceId, items } = req.body || {}
    if (!userId || !workspaceId || !Array.isArray(items)) {
      return res.status(400).json({ error: 'userId, workspaceId, items[] required' })
    }

    const prepared = []
    for (const raw of items) {
      const id = raw.id || `${raw.type}:${raw.sourceId || raw.title || raw.text || Date.now()}`
      const text = buildTextForItem(raw)
      if (!text || text.length < 20) continue

      const embedding = await embedText(text)
      if (!embedding.length) continue

      prepared.push({
        id,
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

    if (!prepared.length) return res.json({ upserted: 0 })

    await upsertEmbeddings(prepared)
    try {
      await logAiEvent({
        userId,
        workspaceId,
        route: 'memory.upsert',
        contextSummary: { count: prepared.length },
      })
    } catch {}

    res.json({ upserted: prepared.length })
  } catch (err) {
    next(err)
  }
}

export async function deleteMemory(req, res, next) {
  try {
    const { ids } = req.body || {}
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids[] required' })
    await deleteEmbeddings(ids)
    try {
      await logAiEvent({ route: 'memory.delete', contextSummary: { count: ids.length } })
    } catch {}
    res.json({ deleted: ids.length })
  } catch (err) {
    next(err)
  }
}

export async function searchWorkspaceMemory(req, res, next) {
  try {
    const { userId, workspaceId, query, topK, types } = req.body || {}
    if (!userId || !workspaceId || !query) {
      return res.status(400).json({ error: 'userId, workspaceId, query required' })
    }

    const embedding = await embedText(query)
    const matches = await searchSimilar(embedding, {
      userId,
      workspaceId,
      topK,
      types,
    })

    try {
      await logAiEvent({
        userId,
        workspaceId,
        route: 'workspace.search',
        contextSummary: { count: matches.length },
      })
    } catch {}

    res.json({ matches })
  } catch (err) {
    next(err)
  }
}
