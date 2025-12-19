// src/composables/useIsPremium.js
import { computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { resolvePlanKey } from '@/services/planService'

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

  const isAdmin = computed(() => {
    const role = String(authStore?.user?.role || '').toLowerCase()
    return role === 'admin' || role === 'superadmin'
  })

  const isPremium = computed(() => {
    if (isAdmin.value) return true
    const storePremium = resolvePlanKey(planFromStore.value) === 'PREMIUM'
    const userPremium = resolvePlanKey(authStore?.user) === 'PREMIUM'
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

  return { isPremium, isAdmin, refresh }
}
