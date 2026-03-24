import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchEffectiveAccess, normalizeEffectiveAccess } from '@/services/accessService'

const EMPTY_ACCESS = Object.freeze(normalizeEffectiveAccess({}))

export const useAccessStore = defineStore('access', () => {
  const access = ref({ ...EMPTY_ACCESS })
  const loading = ref(false)
  const error = ref(null)
  const lastFetchedAt = ref(0)
  const lastFetchedUserId = ref(null)
  let inflightPromise = null
  let inflightUserId = null

  async function fetchAccess(userId, options = {}) {
    if (!userId) return access.value
    const force = options?.force === true
    const minIntervalMs = Number(options?.minIntervalMs ?? 15000)
    const now = Date.now()

    if (!force && inflightPromise && inflightUserId === userId) {
      return inflightPromise
    }

    if (
      !force &&
      lastFetchedUserId.value === userId &&
      lastFetchedAt.value > 0 &&
      now - lastFetchedAt.value < minIntervalMs
    ) {
      return access.value
    }

    loading.value = true
    error.value = null
    inflightUserId = userId
    inflightPromise = (async () => {
      let refreshed = false
      try {
        access.value = await fetchEffectiveAccess(userId, { force })
        refreshed = true
      } catch (err) {
        error.value = err
      } finally {
        if (refreshed) {
          lastFetchedAt.value = Date.now()
          lastFetchedUserId.value = userId
        }
        loading.value = false
        inflightPromise = null
        inflightUserId = null
      }

      return access.value
    })()

    return inflightPromise
  }

  function applyAccess(nextAccess) {
    access.value = normalizeEffectiveAccess(nextAccess || {})
  }

  function reset() {
    access.value = { ...EMPTY_ACCESS }
    loading.value = false
    error.value = null
    lastFetchedAt.value = 0
    lastFetchedUserId.value = null
    inflightPromise = null
    inflightUserId = null
  }

  const isPremium = computed(() => access.value?.isPremium === true)

  return {
    access,
    loading,
    error,
    isPremium,
    fetchAccess,
    applyAccess,
    reset,
  }
})
