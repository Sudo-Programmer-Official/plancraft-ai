// src/composables/useIsPremium.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { resolvePlanKey } from '@/services/planService'

export function useIsPremium() {
  const authStore = useAuthStore()
  const accessStore = useAccessStore()
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
    if (accessStore.isPremium === true || accessStore.isPremium?.value === true) return true
    const accessPlan = accessStore.access?.effectivePlan || accessStore.access?.value?.effectivePlan
    if (accessPlan) {
      return resolvePlanKey(accessPlan) !== 'FREE'
    }
    const storePremium = resolvePlanKey(planFromStore.value) !== 'FREE'
    const userPremium = resolvePlanKey(authStore?.user) !== 'FREE'
    return storePremium || userPremium
  })

  async function refresh(options = {}) {
    try {
      const uid = authStore.user?.uid
      if (!uid) return
      await accessStore.fetchAccess(uid, options)
      await subStore.fetchStatus(uid, options)
    } catch {}
  }

  return { isPremium, isAdmin, refresh }
}
