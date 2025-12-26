// src/services/dashboardPreferencesService.ts
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/init'
import { handleAuthError } from './firebaseService'

export type DashboardPreferences = {
  visibleCards: string[]
  knownCards?: string[]
  updatedAt?: unknown
}

function prefDoc(userId: string, workspaceId: string) {
  return doc(db, 'users', userId, 'workspaces', workspaceId, 'preferences', 'dashboard')
}

function sanitize(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  const uniq = new Set<string>()
  list.forEach((item) => {
    if (typeof item === 'string' && item.trim()) uniq.add(item.trim())
  })
  return Array.from(uniq)
}

export async function fetchDashboardPreferences(
  userId?: string | null,
  workspaceId?: string | null,
): Promise<DashboardPreferences | null> {
  const uid = userId || auth?.currentUser?.uid
  if (!uid || !workspaceId) return null

  try {
    const snap = await getDoc(prefDoc(uid, workspaceId))
    if (!snap.exists()) return null
    const data = snap.data() || {}
    return {
      visibleCards: sanitize(data.visibleCards),
      knownCards: sanitize(data.knownCards || data.allCards),
      updatedAt: data.updatedAt || null,
    }
  } catch (error: any) {
    handleAuthError(error)
    console.warn('[dashboardPrefs] fetch failed', error?.message || error)
    return null
  }
}

export async function saveDashboardPreferences(
  userId: string | null | undefined,
  workspaceId: string | null | undefined,
  prefs: DashboardPreferences,
): Promise<DashboardPreferences | null> {
  const uid = userId || auth?.currentUser?.uid
  if (!uid || !workspaceId) return null
  const visibleCards = sanitize(prefs?.visibleCards)
  const knownCards = sanitize(prefs?.knownCards)

  const payload: DashboardPreferences = {
    visibleCards,
    knownCards,
    updatedAt: serverTimestamp(),
  }

  try {
    await setDoc(prefDoc(uid, workspaceId), payload, { merge: true })
    return payload
  } catch (error: any) {
    handleAuthError(error)
    console.warn('[dashboardPrefs] save failed', error?.message || error)
    throw error
  }
}
