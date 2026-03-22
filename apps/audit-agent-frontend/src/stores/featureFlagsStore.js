import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_META,
  LOCAL_FLAGS,
  getFeatureFlag,
  hasLocalFlagOverride,
  mergeFeatureFlags,
} from '@/config/featureFlags'
import {
  fetchAdminFeatureFlags,
  fetchFeatureFlags,
  updateAdminFeatureFlags,
} from '@/services/featureFlagsService'

export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const remoteFlags = ref({})
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const updatedAt = ref(null)
  const updatedBy = ref(null)
  let inFlight = null

  const effectiveFlags = computed(() => mergeFeatureFlags(remoteFlags.value))

  async function loadFlags({ force = false, admin = false } = {}) {
    if (loading.value && inFlight) return inFlight
    if (!force && loaded.value && !admin) {
      return {
        flags: effectiveFlags.value,
        updatedAt: updatedAt.value,
        updatedBy: updatedBy.value,
      }
    }

    loading.value = true
    error.value = ''
    inFlight = (admin ? fetchAdminFeatureFlags() : fetchFeatureFlags())
      .then((payload) => {
        remoteFlags.value = payload?.flags || {}
        updatedAt.value = payload?.updatedAt || null
        updatedBy.value = payload?.updatedBy || null
        loaded.value = true
        return payload
      })
      .catch((err) => {
        error.value = err?.response?.data?.error || err?.message || 'Failed to load feature flags'
        throw err
      })
      .finally(() => {
        loading.value = false
        inFlight = null
      })

    return inFlight
  }

  async function ensureLoaded(options = {}) {
    return loadFlags(options)
  }

  async function saveRemoteFlags(flags) {
    const payload = await updateAdminFeatureFlags(flags)
    remoteFlags.value = payload?.flags || {}
    updatedAt.value = payload?.updatedAt || null
    updatedBy.value = payload?.updatedBy || null
    loaded.value = true
    return payload
  }

  function isEnabled(key) {
    return getFeatureFlag(key, remoteFlags.value)
  }

  return {
    FEATURE_FLAG_KEYS,
    FEATURE_FLAG_META,
    LOCAL_FLAGS,
    remoteFlags,
    effectiveFlags,
    loading,
    loaded,
    error,
    updatedAt,
    updatedBy,
    loadFlags,
    ensureLoaded,
    saveRemoteFlags,
    isEnabled,
    hasLocalFlagOverride,
  }
})
