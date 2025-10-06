// src/stores/subscriptionStore.js
import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import { getSubscriptionStatus } from '@/services/stripeService'
import { useAuthStore } from '@/stores/authStore'

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscription = ref({ plan: 'free', status: 'free', cancelAt: null, remainingDays: 0 })
  const loading = ref(false)
  const error = ref(null)

  async function fetchStatus(userId) {
    if (!userId) return subscription.value
    loading.value = true
    error.value = null
    try {
      const data = await getSubscriptionStatus(userId)
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
      loading.value = false
    }
    return subscription.value
  }

  function reset() {
    subscription.value = { plan: 'free', status: 'free', cancelAt: null, remainingDays: 0 }
    loading.value = false
    error.value = null
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
