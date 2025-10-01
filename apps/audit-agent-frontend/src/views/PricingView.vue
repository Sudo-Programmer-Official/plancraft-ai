<template>
  <div class="max-w-5xl mx-auto py-12 sm:py-16 px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
    <!-- Free Plan -->
    <div class="bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-700">
      <h3 class="text-xl font-bold mb-4">🌱 Free</h3>
      <ul class="space-y-2 text-gray-300 mb-6">
        <li>✅ Unlimited journaling</li>
        <li>✅ Basic AI (10 insights/mo)</li>
        <li>❌ No reminders</li>
        <li>❌ No integrations</li>
      </ul>
      <p class="text-2xl font-bold mb-4">$0</p>
      <button
        disabled
        class="w-full py-2 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed"
      >
        Current Plan
      </button>
    </div>

    <!-- Premium Plan -->
    <div
      class="bg-gradient-to-br from-purple-700 to-pink-600 rounded-2xl shadow-xl p-8 border border-purple-400 relative"
    >
      <span class="absolute -top-3 right-4 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full">
        Most Popular
      </span>
      <h3 class="text-xl font-bold mb-4">🚀 Premium</h3>
      <ul class="space-y-2 text-white mb-6">
        <li>✅ Unlimited AI Insights</li>
        <li>✅ Smart Reminders</li>
        <li>✅ Calendar & WhatsApp integration</li>
        <li>✅ Priority Support</li>
      </ul>
      <p class="text-2xl font-bold mb-4">$5 / month</p>
      <button
        :disabled="loading"
        @click="onUpgrade"
        class="w-full py-2 rounded-lg bg-black/20 text-white font-semibold hover:bg-black/30 transition disabled:opacity-60 text-sm sm:text-base"
      >
        <span v-if="loading">Redirecting…</span>
        <span v-else>Upgrade Now</span>
      </button>
    </div>
  </div>
  <div class="text-center text-sm mt-6">
    <p v-if="$route.query.status === 'success'" class="text-green-400">
      ✅ Payment complete. Premium is now active! 🎉
    </p>
    <p v-else-if="$route.query.status === 'cancel'" class="text-red-400">
      ❌ Checkout canceled. You can try again anytime.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { createCheckoutSession } from '@/services/stripeService'
import { trackEvent } from '@/services/analytics'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'

async function onUpgrade() {
  try {
    // Ensure signed in before starting checkout
    if (!authStore.user) {
      try { localStorage.setItem('postLoginRedirect', '/subscription?upgrade=1') } catch {}
      return router.push('/login')
    }
    loading.value = true
    trackEvent('upgrade_started')
    const url = await createCheckoutSession('monthly', authStore.user?.uid)
    window.location.href = url
  } catch (e) {
    loading.value = false
    alert('❌ Payment service unavailable. Please try again later.')
  }
}

onMounted(() => {
  if (window?.location?.search?.includes('status=success')) {
    trackEvent('upgrade_success')
  }
})
</script>
