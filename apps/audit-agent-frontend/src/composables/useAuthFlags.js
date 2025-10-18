// src/composables/useAuthFlags.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useIsPremium } from '@/composables/useIsPremium'

export function useAuthFlags() {
  const authStore = useAuthStore()
  const { isPremium } = useIsPremium()

  const isGuest = computed(() => !authStore?.user?.uid || authStore.isGuest === true || authStore.guest === true || authStore?.user?.mode === 'guest')
  const isFreeUser = computed(() => !!authStore?.user?.uid && !isPremium.value)

  return { isGuest, isFreeUser, isPremium }
}

