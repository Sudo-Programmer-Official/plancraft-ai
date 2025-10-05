// src/composables/useIsPremium.js
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

export function useIsPremium() {
  const authStore = useAuthStore()
  const subStore = useSubscriptionStore()

  const planFromStore = computed(() => {
    try {
      const s = subStore.subscription
      // Handle Pinia ref or reactive access
      return (s?.value?.plan ?? s?.plan) || 'free'
    } catch {
      return 'free'
    }
  })

  const isPremium = computed(() => {
    const storePremium = String(planFromStore.value || '').toLowerCase() === 'premium'
    const userPremium = String(authStore?.user?.plan || '').toLowerCase() === 'premium'
    return storePremium || userPremium
  })

  async function refresh() {
    try { authStore.refreshPlan?.() } catch {}
    try {
      const uid = authStore?.user?.uid
      if (uid) await subStore.fetchStatus(uid)
    } catch {}
  }

  onMounted(() => { refresh() })
  watch(() => authStore.user?.uid, (uid) => { if (uid) refresh() })

  return { isPremium, refresh }
}

