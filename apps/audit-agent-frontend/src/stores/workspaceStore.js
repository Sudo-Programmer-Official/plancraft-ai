import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { auth } from '@/firebase/init'
import {
  createWorkspaceDoc,
  ensureDefaultWorkspace,
  fetchWorkspaces,
  touchWorkspaceOpened,
  updateWorkspaceMeta,
  updateWorkspaceSettings,
} from '@/services/workspaceService'

function resolveSessionUid() {
  try {
    if (auth?.currentUser?.uid) return auth.currentUser.uid
  } catch {}

  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.uid) return String(parsed.uid)
    }
  } catch {}

  return null
}

export const useWorkspaceStore = defineStore('workspaceStore', () => {
  const workspaces = ref([])
  const activeWorkspaceId = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const hydrated = ref(false)

  function persistActive(id) {
    try {
      if (id) localStorage.setItem('activeWorkspaceId', id)
      else localStorage.removeItem('activeWorkspaceId')
    } catch {}
  }

  function setLocalActive(id) {
    activeWorkspaceId.value = id || null
    persistActive(id || null)
  }

  async function setActive(id) {
    setLocalActive(id)
    const uid = resolveSessionUid()
    if (uid && id) {
      try {
        const ws = workspaces.value.find((w) => w.id === id)
        if (ws?.role === 'admin' || ws?.role === 'owner') {
          // Best effort: do not block workspace hydration on this patch call.
          touchWorkspaceOpened(uid, id).catch(() => {})
        }
      } catch {}
    }
  }

  async function loadWorkspaces() {
    const uid = resolveSessionUid()
    if (!uid) return []
    const list = await fetchWorkspaces(uid)
    workspaces.value = list
    return list
  }

  function findPersonalWorkspace(list = []) {
    const byExactName = list.find(
      (ws) => String(ws?.name || '').trim().toLowerCase() === 'personal',
    )
    if (byExactName) return byExactName

    const personalType = list.filter(
      (ws) => String(ws?.workspaceType || '').trim().toLowerCase() === 'personal',
    )
    if (!personalType.length) return null

    const bySparkleIcon = personalType.find((ws) => String(ws?.icon || '').includes('✨'))
    if (bySparkleIcon) return bySparkleIcon

    return personalType[0] || null
  }

  async function init() {
    if (loading.value) return
    const uid = resolveSessionUid()
    let cachedWorkspaceId = null
    try {
      cachedWorkspaceId = localStorage.getItem('activeWorkspaceId')
    } catch {}
    if (!uid) {
      hydrated.value = true
      return
    }

    loading.value = true
    error.value = null
    try {
      let list = await loadWorkspaces()
      if (!list.length) {
        const seeded = await ensureDefaultWorkspace(uid)
        list = seeded ? [seeded] : []
        workspaces.value = list
      }
      const selectedId = activeWorkspaceId.value || cachedWorkspaceId
      const existing = list.find((w) => w.id === selectedId)
      const personal = findPersonalWorkspace(list)
      // Keep user's current selection when available; only fallback to Personal.
      const preferred = existing?.id || personal?.id || list[0]?.id || null
      await setActive(preferred)
    } catch (err) {
      error.value = err?.message || 'Failed to load workspaces'
    } finally {
      loading.value = false
      hydrated.value = true
    }
  }

  async function refresh() {
    try {
      return await init()
    } catch (err) {
      error.value = err?.message || 'Failed to refresh workspaces'
      throw err
    }
  }

  async function createWorkspace(payload) {
    const uid = resolveSessionUid()
    if (!uid) throw new Error('Not signed in')
    const workspace = await createWorkspaceDoc(uid, payload)
    workspaces.value = [...workspaces.value, workspace]
    await setActive(workspace.id)
    return workspace
  }

  async function updateWorkspace(id, patch) {
    const uid = resolveSessionUid()
    if (!uid || !id) return
    const updated = await updateWorkspaceMeta(uid, id, patch)
    if (updated) {
      workspaces.value = workspaces.value.map((ws) => (ws.id === id ? { ...ws, ...updated } : ws))
    } else {
      workspaces.value = workspaces.value.map((ws) => (ws.id === id ? { ...ws, ...patch } : ws))
    }
  }

  async function applyWorkspaceSettings(id, settings) {
    const uid = resolveSessionUid()
    if (!uid || !id) return null
    const updated = await updateWorkspaceSettings(id, settings)
    if (updated) {
      workspaces.value = workspaces.value.map((ws) => (ws.id === id ? { ...ws, ...updated } : ws))
    }
    return updated
  }

  function reset() {
    workspaces.value = []
    setLocalActive(null)
    loading.value = false
    error.value = null
    hydrated.value = false
  }

  const activeWorkspace = computed(() =>
    workspaces.value.find((ws) => ws.id === activeWorkspaceId.value) || null,
  )
  const activeWorkspaceRole = computed(() => activeWorkspace.value?.role || 'viewer')

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    activeWorkspaceRole,
    loading,
    error,
    hydrated,
    init,
    refresh,
    setActive,
    createWorkspace,
    updateWorkspace,
    applyWorkspaceSettings,
    reset,
  }
})
