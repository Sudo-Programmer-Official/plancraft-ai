import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clearQuickSetupSnooze, readQuickSetupState } from '@/utils/quickSetup'

export const useQuickSetupStore = defineStore('quickSetup', () => {
  const quickSetupOpen = ref(false)
  const quickSetupLaunchSource = ref('manual')
  const setupState = ref(readQuickSetupState())

  function refreshQuickSetupState(nextState = null) {
    setupState.value =
      nextState && typeof nextState === 'object' ? nextState : readQuickSetupState()
    return setupState.value
  }

  function openQuickSetup(options = {}) {
    if (options?.clearSnooze !== false) clearQuickSetupSnooze()
    quickSetupLaunchSource.value = options?.source === 'auto' ? 'auto' : 'manual'
    quickSetupOpen.value = true
  }

  function closeQuickSetup() {
    quickSetupOpen.value = false
    quickSetupLaunchSource.value = 'manual'
  }

  const setupIncomplete = computed(
    () => !!setupState.value && setupState.value.completed !== true
  )

  return {
    quickSetupOpen,
    quickSetupLaunchSource,
    setupState,
    setupIncomplete,
    refreshQuickSetupState,
    openQuickSetup,
    closeQuickSetup,
  }
})
