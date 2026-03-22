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

  const isBootstrapping = computed(() => authStore.bootstrapping === true)
  const isAuthenticating = computed(() => authStore.authenticating === true)
  const isLoggingOut = computed(() => authStore.logoutPending === true)
  const hasAuthenticatedSession = computed(
    () => isGuestSession.value || !!authStore.user?.uid,
  )

  const isAuthReady = computed(() => {
    if (isBootstrapping.value || isLoggingOut.value) return false
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
  const startupStage = computed(() => {
    if (isLoggingOut.value) return 'logging-out'
    if (isAuthenticating.value) return 'authenticating'
    if (isBootstrapping.value) return 'bootstrapping'
    if (hasAuthenticatedSession.value && !isShellReady.value) return 'preparing-workspace'
    return 'ready'
  })

  return {
    isReady,
    isShellReady,
    isAuthReady,
    isBootstrapping,
    isAuthenticating,
    isLoggingOut,
    isWorkspaceHydrated,
    isWorkspaceReady,
    hasResolvedWorkspace,
    hasAuthenticatedSession,
    isGuestSession,
    resolvedWorkspaceId,
    startupStage,
  }
}
