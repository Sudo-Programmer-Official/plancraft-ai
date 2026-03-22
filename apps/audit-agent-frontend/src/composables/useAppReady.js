import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function useAppReady() {
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()

  const isGuestSession = computed(
    () =>
      authStore?.guest === true ||
      authStore?.isGuest === true ||
      authStore?.user?.mode === 'guest',
  )

  const resolvedWorkspaceId = computed(() => {
    try {
      return workspaceStore.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
    } catch {
      return workspaceStore.activeWorkspaceId || null
    }
  })

  const isAuthReady = computed(() => {
    if (authStore.loading) return false
    if (isGuestSession.value) return true
    return !!authStore.user?.uid && !!authStore.token
  })

  const isWorkspaceReady = computed(() => {
    if (isGuestSession.value) return true
    return !!workspaceStore.hydrated && !!resolvedWorkspaceId.value
  })

  const isWorkspaceHydrated = computed(() => {
    if (isGuestSession.value) return true
    return !!workspaceStore.hydrated
  })

  const hasResolvedWorkspace = computed(() => {
    if (isGuestSession.value) return true
    return !!resolvedWorkspaceId.value
  })

  const isShellReady = computed(() => isAuthReady.value && isWorkspaceHydrated.value)
  const isReady = computed(() => isAuthReady.value && isWorkspaceReady.value)

  return {
    isReady,
    isShellReady,
    isAuthReady,
    isWorkspaceHydrated,
    isWorkspaceReady,
    hasResolvedWorkspace,
    isGuestSession,
    resolvedWorkspaceId,
  }
}
