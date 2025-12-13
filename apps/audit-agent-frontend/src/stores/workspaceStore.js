import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { auth } from '@/firebase/init'
import {
  createWorkspaceDoc,
  ensureDefaultWorkspace,
  fetchWorkspaces,
  touchWorkspaceOpened,
  updateWorkspaceMeta,
} from '@/services/workspaceService'

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
    const uid = auth?.currentUser?.uid
    if (uid && id) {
      try {
        await touchWorkspaceOpened(uid, id)
      } catch {}
    }
  }

  async function loadWorkspaces() {
    const uid = auth?.currentUser?.uid
    if (!uid) return []
    const list = await fetchWorkspaces(uid)
    workspaces.value = list
    return list
  }

  async function init() {
    if (loading.value) return
    const uid = auth?.currentUser?.uid
    try {
      const cached = localStorage.getItem('activeWorkspaceId')
      if (cached) setLocalActive(cached)
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
      const existing = list.find((w) => w.id === activeWorkspaceId.value)
      const fallback = list[0]?.id || null
      if (!existing) {
        await setActive(activeWorkspaceId.value || fallback)
      } else {
        await setActive(existing.id)
      }
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
    const uid = auth?.currentUser?.uid
    if (!uid) throw new Error('Not signed in')
    const workspace = await createWorkspaceDoc(uid, payload)
    workspaces.value = [...workspaces.value, workspace]
    await setActive(workspace.id)
    return workspace
  }

  async function updateWorkspace(id, patch) {
    const uid = auth?.currentUser?.uid
    if (!uid || !id) return
    const updated = await updateWorkspaceMeta(uid, id, patch)
    if (updated) {
      workspaces.value = workspaces.value.map((ws) => (ws.id === id ? { ...ws, ...updated } : ws))
    } else {
      workspaces.value = workspaces.value.map((ws) => (ws.id === id ? { ...ws, ...patch } : ws))
    }
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
    reset,
  }
})
