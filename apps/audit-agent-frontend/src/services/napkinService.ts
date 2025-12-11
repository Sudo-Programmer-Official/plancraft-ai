import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, db } from '@/firebase/init'
import { handleAuthError } from '@/services/firebaseService'
import { nlpClient } from '@/services/leader/http'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export type NapkinIntent = 'planner' | 'creator' | 'leader' | 'napkin'
export type NapkinKind = 'task' | 'idea' | 'reminder' | 'content' | 'note'
export type NapkinStatus = 'unsorted' | 'converted' | 'archived'

export type NapkinClassification = {
  type: NapkinKind
  category: string
  intent: NapkinIntent
  tags: string[]
  suggestion: string
  confidence: 'low' | 'medium' | 'high'
  source?: 'heuristic' | 'ai'
}

export type NapkinItem = {
  id: string
  text: string
  source: string
  transcript?: string
  audioUrl?: string | null
  createdAt: number
  status: NapkinStatus
  type: NapkinKind
  category: string
  intent: NapkinIntent
  tags: string[]
  suggestion?: string
  linkedTaskId?: string
  linkedEventId?: string
  metadata?: Record<string, any>
  workspaceId?: string | null
}

type CreateNapkinPayload = {
  text: string
  source?: string
  transcript?: string
  audioBlob?: Blob | null
  audioType?: string
  classification?: NapkinClassification
  status?: NapkinStatus
  category?: string
  intent?: NapkinIntent
  tags?: string[]
  metadata?: Record<string, any>
}

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  work: /(ship|launch|deck|client|proposal|brief|roadmap|okr|okr|meeting|sync|email|follow up|deck)/i,
  learning: /(learn|study|course|read|book|tutorial|notes|class|lecture)/i,
  health: /(workout|gym|run|sleep|meditat|yoga|walk|steps|water|meal|diet)/i,
  personal: /(family|friend|birthday|anniversary|travel|home|errand|grocery|rent|bill|movie|dinner)/i,
  content: /(post|tweet|thread|video|script|draft|hook|caption|newsletter|blog|creator|reel|tiktok|linkedin)/i,
  task: /(todo|task|finish|complete|build|fix|ship|submit|send)/i,
}

function userIdOrThrow() {
  const uid = auth?.currentUser?.uid
  if (!uid) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error('User not logged in')
  }
  return uid
}

function currentWorkspaceId() {
  try {
    const store = useWorkspaceStore()
    return store?.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
  } catch {
    try {
      return localStorage.getItem('activeWorkspaceId')
    } catch {
      return null
    }
  }
}

function napkinCollection(uid: string, workspaceId?: string | null) {
  const wsId = workspaceId !== undefined ? workspaceId : currentWorkspaceId()
  if (uid && wsId) return collection(db, 'users', uid, 'workspaces', wsId, 'napkin', 'items')
  return collection(db, 'napkin', uid, 'items')
}

function napkinDoc(uid: string, id: string, workspaceId?: string | null) {
  const wsId = workspaceId !== undefined ? workspaceId : currentWorkspaceId()
  if (uid && wsId) return doc(db, 'users', uid, 'workspaces', wsId, 'napkin', 'items', id)
  return doc(db, 'napkin', uid, 'items', id)
}

function dateFromDoc(data: DocumentData) {
  const ts = data?.createdAt
  if (ts?.toDate) return ts.toDate().getTime()
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000
  if (typeof data?.createdAtMs === 'number') return data.createdAtMs
  return Date.now()
}

function normalizeTags(tags?: string[]) {
  if (!Array.isArray(tags)) return []
  return Array.from(
    new Set(
      tags
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean)
        .slice(0, 8),
    ),
  )
}

function parseJson(text: string) {
  if (!text) return null
  try {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null
    const slice = text.slice(firstBrace, lastBrace + 1)
    return JSON.parse(slice)
  } catch {
    return null
  }
}

function heuristicClassification(text: string): NapkinClassification {
  const value = text.toLowerCase()
  let type: NapkinKind = 'note'
  let intent: NapkinIntent = 'napkin'
  let category = 'personal'
  const tags: string[] = []

  if (CATEGORY_KEYWORDS.content.test(value)) {
    type = 'content'
    intent = 'creator'
    category = 'content'
    tags.push('content', 'creator')
  } else if (/remind|follow up|ping|nudge|tomorrow|tonight|morning/.test(value)) {
    type = 'reminder'
    intent = 'planner'
    category = 'task'
    tags.push('reminder')
  } else if (/meeting|calendar|invite|event|call|schedule|book|zoom/.test(value)) {
    type = 'reminder'
    intent = 'leader'
    category = 'work'
    tags.push('event')
  } else if (/idea|brainstorm|concept|explore|maybe/.test(value)) {
    type = 'idea'
    intent = 'creator'
    category = CATEGORY_KEYWORDS.work.test(value) ? 'work' : 'personal'
    tags.push('idea')
  } else if (/task|todo|finish|complete|ship|fix|send|draft/.test(value)) {
    type = 'task'
    intent = 'planner'
    category = CATEGORY_KEYWORDS.work.test(value) ? 'work' : 'task'
    tags.push('task')
  }

  for (const [label, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(value) && !tags.includes(label)) tags.push(label)
  }

  const suggestion =
    intent === 'planner'
      ? 'Add to Planner'
      : intent === 'creator'
      ? 'Send to Creator Mode'
      : intent === 'leader'
      ? 'Add to Leader Events'
      : 'Keep in Napkin'

  return {
    type,
    category,
    intent,
    tags: normalizeTags(tags),
    suggestion,
    confidence: 'medium',
    source: 'heuristic',
  }
}

export async function classifyNapkinText(text: string): Promise<NapkinClassification> {
  const fallback = heuristicClassification(text)
  try {
    const prompt = [
      'Classify the following note into a concise JSON object.',
      'Fields: type (task|idea|reminder|content|note), category (work|learning|health|personal|content|task), intent (planner|creator|leader|napkin), tags (array of 1-4 short tags), suggestion (1 short action).',
      'Be brief and only return JSON.',
      `Note: ${text}`,
    ].join('\n')
    const { data } = await nlpClient.post('/generate/outreach-message', { input: prompt })
    const raw = data?.output || data?.text || data?.message || ''
    const parsed = parseJson(raw)
    if (parsed?.type) {
      return {
        type: (parsed.type || fallback.type) as NapkinKind,
        category: parsed.category || fallback.category,
        intent: (parsed.intent || fallback.intent) as NapkinIntent,
        tags: normalizeTags(parsed.tags) || fallback.tags,
        suggestion: parsed.suggestion || fallback.suggestion,
        confidence: 'high',
        source: 'ai',
      }
    }
  } catch (err) {
    console.warn('[napkin] AI classification failed, using heuristic', err?.message || err)
  }
  return fallback
}

async function uploadAudio(uid: string, itemId: string, blob: Blob, contentType?: string) {
  try {
    const storage = getStorage()
    const extension = contentType?.includes('mpeg') ? 'mp3' : 'webm'
    const ref = storageRef(storage, `napkin/${uid}/${itemId}.${extension}`)
    await uploadBytes(ref, blob, { contentType: contentType || 'audio/webm' })
    return await getDownloadURL(ref)
  } catch (err) {
    console.warn('[napkin] audio upload failed', err?.message || err)
    return null
  }
}

export async function createNapkinItem(payload: CreateNapkinPayload): Promise<NapkinItem> {
  const uid = userIdOrThrow()
  const aiClassification = await classifyNapkinText(payload.text)
  const classification = payload.classification
    ? { ...aiClassification, ...payload.classification }
    : aiClassification
  const createdAtMs = Date.now()
  const workspaceId = currentWorkspaceId()
  const baseDoc = {
    text: payload.text,
    source: payload.source || 'typed',
    transcript: payload.transcript || '',
    status: payload.status || 'unsorted',
    type: classification.type,
    category: payload.category || classification.category,
    intent: payload.intent || classification.intent,
    tags: normalizeTags(payload.tags || classification.tags),
    suggestion: classification.suggestion,
    createdAt: serverTimestamp(),
    createdAtMs,
    metadata: payload.metadata || {},
    workspaceId: workspaceId || null,
  }

  const docRef = await addDoc(napkinCollection(uid, workspaceId), baseDoc)
  let audioUrl: string | null = null
  if (payload.audioBlob) {
    audioUrl = await uploadAudio(uid, docRef.id, payload.audioBlob, payload.audioType)
    if (audioUrl) await updateDoc(docRef, { audioUrl })
  }

  return {
    id: docRef.id,
    text: payload.text,
    source: baseDoc.source,
    transcript: baseDoc.transcript,
    status: baseDoc.status,
    type: classification.type,
    category: baseDoc.category,
    intent: baseDoc.intent,
    tags: baseDoc.tags,
    suggestion: classification.suggestion,
    createdAt: createdAtMs,
    audioUrl,
    metadata: baseDoc.metadata,
    workspaceId,
  }
}

export async function updateNapkinItem(id: string, updates: Partial<NapkinItem>, workspaceId?: string | null) {
  const uid = userIdOrThrow()
  const ref = napkinDoc(uid, id, workspaceId)
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
}

export async function deleteNapkinItem(id: string, workspaceId?: string | null) {
  const uid = userIdOrThrow()
  const ref = napkinDoc(uid, id, workspaceId)
  await deleteDoc(ref)
}

export function subscribeToNapkinItems(onChange: (items: NapkinItem[]) => void) {
  const uid = userIdOrThrow()
  const wsId = currentWorkspaceId()
  let workspaceItems: NapkinItem[] = []
  let legacyItems: NapkinItem[] = []

  const emitCombined = () => {
    const merged = new Map<string, NapkinItem>()
    for (const item of [...workspaceItems, ...legacyItems]) {
      const key = `${item.workspaceId || 'legacy'}:${item.id}`
      if (!merged.has(key)) merged.set(key, item)
    }
    const sorted = Array.from(merged.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    onChange(sorted)
  }

  const unsubs: Array<() => void> = []

  // Active workspace feed
  if (wsId) {
    const q = query(napkinCollection(uid, wsId), orderBy('createdAt', 'desc'))
    const unsubWs = onSnapshot(
      q,
      (snapshot) => {
        workspaceItems = snapshot.docs.map(mapNapkinDoc)
        emitCombined()
      },
      (error: FirestoreError) => {
        handleAuthError(error)
        console.warn('[napkin] workspace subscription failed', error.message)
      },
    )
    unsubs.push(unsubWs)
  }

  // Legacy/global feed for backwards compatibility
  const legacyQuery = query(napkinCollection(uid, null), orderBy('createdAt', 'desc'))
  const unsubLegacy = onSnapshot(
    legacyQuery,
    (snapshot) => {
      legacyItems = snapshot.docs.map(mapNapkinDoc)
      emitCombined()
    },
    (error: FirestoreError) => {
      handleAuthError(error)
      console.warn('[napkin] legacy subscription failed', error.message)
    },
  )
  unsubs.push(unsubLegacy)

  return () => {
    unsubs.forEach((fn) => {
      try {
        fn()
      } catch {
        /* noop */
      }
    })
  }
}

function mapNapkinDoc(docSnap: QueryDocumentSnapshot<DocumentData>): NapkinItem {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    text: data.text || '',
    source: data.source || 'typed',
    transcript: data.transcript || '',
    audioUrl: data.audioUrl || null,
    createdAt: dateFromDoc(data),
    status: (data.status || 'unsorted') as NapkinStatus,
    type: (data.type || 'note') as NapkinKind,
    category: data.category || 'personal',
    intent: (data.intent || 'napkin') as NapkinIntent,
    tags: normalizeTags(data.tags || []),
    suggestion: data.suggestion,
    linkedTaskId: data.linkedTaskId,
    linkedEventId: data.linkedEventId,
    metadata: data.metadata || {},
    workspaceId: data.workspaceId || null,
  }
}
