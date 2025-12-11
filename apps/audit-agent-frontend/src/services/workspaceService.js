import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/init'

function workspaceRoot(userId) {
  if (!userId) throw new Error('Missing userId for workspace operation')
  return collection(db, 'users', userId, 'workspaces')
}

function normalizeWorkspace(docSnap) {
  const data = docSnap?.data?.() || {}
  return {
    id: docSnap?.id,
    name: data.name || 'Workspace',
    icon: data.icon || '📦',
    color: data.color || 'indigo',
    description: data.description || '',
    workspaceType: data.workspaceType || 'personal',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    lastOpenedAt: data.lastOpenedAt,
  }
}

export async function fetchWorkspaces(userId) {
  const snap = await getDocs(workspaceRoot(userId))
  return snap.docs.map(normalizeWorkspace)
}

export async function createWorkspaceDoc(userId, payload) {
  const defaults = {
    name: 'New workspace',
    icon: '📦',
    color: 'indigo',
    description: '',
    workspaceType: 'personal',
  }
  const data = { ...defaults, ...(payload || {}) }
  const now = Date.now()
  const ref = await addDoc(workspaceRoot(userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastOpenedAt: serverTimestamp(),
  })
  return { id: ref.id, ...data, createdAt: now, updatedAt: now, lastOpenedAt: now }
}

export async function ensureDefaultWorkspace(userId) {
  const existing = await fetchWorkspaces(userId)
  if (existing.length) return existing[0]
  return createWorkspaceDoc(userId, {
    name: 'Personal',
    icon: '✨',
    color: 'indigo',
    workspaceType: 'personal',
    description: 'Your personal space for tasks, notes, and drafts.',
  })
}

export async function updateWorkspaceMeta(userId, workspaceId, patch = {}) {
  if (!userId || !workspaceId) return
  const ref = doc(db, 'users', userId, 'workspaces', workspaceId)
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function touchWorkspaceOpened(userId, workspaceId) {
  if (!userId || !workspaceId) return
  const ref = doc(db, 'users', userId, 'workspaces', workspaceId)
  await updateDoc(ref, { lastOpenedAt: serverTimestamp() })
}
