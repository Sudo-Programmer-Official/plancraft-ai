// src/stores/subscriptionStore.js
import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import { getSubscriptionStatus } from '@/services/stripeService'
import { useAuthStore } from '@/stores/authStore'

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscription = ref({ plan: 'free', status: 'free', cancelAt: null, remainingDays: 0 })
  const loading = ref(false)
  const error = ref(null)
  const lastFetchedAt = ref(0)
  const lastFetchedUserId = ref(null)
  let inflightPromise = null
  let inflightUserId = null

  async function fetchStatus(userId, options = {}) {
    if (!userId) return subscription.value
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
      return subscription.value
    }

    loading.value = true
    error.value = null
    inflightUserId = userId
    inflightPromise = (async () => {
      try {
        const data = await getSubscriptionStatus(userId, { force })
        subscription.value = {
          plan: data.plan || 'free',
          status: data.status || (data.plan === 'premium' ? 'active' : 'free'),
          cancelAt: data.cancelAt ? new Date(data.cancelAt) : null,
          remainingDays: Number(data.remainingDays || 0),
        }
      } catch (e) {
        console.warn('subscription status failed', e)
        error.value = e
        subscription.value = { plan: 'free', status: 'free', cancelAt: null, remainingDays: 0 }
      } finally {
        lastFetchedAt.value = Date.now()
        lastFetchedUserId.value = userId
        loading.value = false
        inflightPromise = null
        inflightUserId = null
      }
      return subscription.value
    })()

    return inflightPromise
  }

  function reset() {
    subscription.value = { plan: 'free', status: 'free', cancelAt: null, remainingDays: 0 }
    loading.value = false
    error.value = null
    lastFetchedAt.value = 0
    lastFetchedUserId.value = null
    inflightPromise = null
    inflightUserId = null
  }

  return { subscription, loading, error, fetchStatus, reset }
})

// Auto-refresh on payment success redirect
onMounted(() => {
  try {
    if (typeof window !== 'undefined' && window.location.search.includes('status=success')) {
      const auth = useAuthStore()
      if (auth?.user?.uid) {
        const store = useSubscriptionStore()
        store.fetchStatus(auth.user.uid)
      }
    }
  } catch {}
})
