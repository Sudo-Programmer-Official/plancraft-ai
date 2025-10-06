<template>
  <!-- Canceled banner: show remaining premium period -->
  <div
    v-if="planStatus === 'canceled' && cancelAtDate"
    class="max-w-5xl mx-auto px-4 sm:px-6 mt-6"
  >
    <div class="flex items-start gap-3 rounded-xl border border-yellow-400/30 bg-yellow-500/10 text-yellow-100 px-4 py-3 shadow-sm">
      <span>⚠️</span>
      <div class="text-sm">
        <div class="font-medium">
          Premium until {{ cancelAtDate.format('MMM D, YYYY') }}
          <span v-if="daysLeft">
            ({{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left)
          </span>
        </div>
        <div class="opacity-90">You can keep using Premium features until your period ends, or reactivate anytime.</div>
      </div>
    </div>
  </div>

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
      <p class="text-2xl font-bold mb-4">$2 / month</p>
      <template v-if="isPremium && planStatus === 'active'">
        <div class="space-y-2">
          <button
            :disabled="cancelLoading"
            @click="onCancel"
            class="w-full py-2 rounded-lg bg-black/20 text-white font-semibold hover:bg-black/30 transition disabled:opacity-60 text-sm sm:text-base"
          >
            <span v-if="cancelLoading">Canceling…</span>
            <span v-else>Cancel Subscription</span>
          </button>
          <p class="text-sm text-white/80">You're currently on Premium.</p>
        </div>
      </template>
      <template v-else-if="isPremium && planStatus === 'canceled'">
        <div class="space-y-2">
          <button
            :disabled="loading"
            @click="onReactivate"
            class="w-full py-2 rounded-lg bg-black/20 text-white font-semibold hover:bg-black/30 transition disabled:opacity-60 text-sm sm:text-base"
          >
            <span v-if="loading">Opening…</span>
            <span v-else>Upgrade Again</span>
          </button>
          <p class="text-sm text-white/90">
            Premium active until
            <strong>{{ cancelAtDate ? cancelAtDate.format('MMM D, YYYY') : '' }}</strong>
            <span v-if="daysLeft">({{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left)</span>
          </p>
        </div>
      </template>
      <template v-else>
        <button
          :disabled="loading"
          @click="onUpgrade"
          class="w-full py-2 rounded-lg bg-black/20 text-white font-semibold hover:bg-black/30 transition disabled:opacity-60 text-sm sm:text-base"
        >
          <span v-if="loading">Redirecting…</span>
          <span v-else>Upgrade Now</span>
        </button>
      </template>
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
  <ErrorDialog
    v-model="errorVisible"
    title="Action Failed"
    message="❌ We couldn't complete that action. Please try again later."
  />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { createCheckoutSession, cancelSubscription, reactivateSubscription } from '@/services/stripeService'
import { trackEvent } from '@/services/analytics'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'
const errorVisible = ref(false)
const cancelLoading = ref(false)

const subStore = useSubscriptionStore()
const sub = subStore.subscription
const isPremium = computed(() => {
  try {
    const planFromStore = sub?.plan ?? sub?.value?.plan
    const planFromUser = authStore?.user?.plan
    const roleFromUser = authStore?.user?.role
    return [planFromStore, planFromUser, roleFromUser]
      .map(v => String(v || '').toLowerCase())
      .includes('premium')
  } catch { return false }
})

const planStatus = computed(() => String(subStore.subscription?.status || (isPremium.value ? 'active' : 'free')).toLowerCase())
const cancelAtDate = computed(() => subStore.subscription?.cancelAt ? dayjs(subStore.subscription.cancelAt) : null)
const daysLeft = computed(() => cancelAtDate.value ? Math.max(0, cancelAtDate.value.diff(dayjs(), 'day')) : 0)

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
    errorVisible.value = true
  }
}

async function onReactivate() {
  try {
    if (!authStore.user) {
      try { localStorage.setItem('postLoginRedirect', '/subscription?upgrade=1') } catch {}
      return router.push('/login')
    }
    loading.value = true
    trackEvent('reactivate_started')
    const url = await reactivateSubscription(authStore.user?.uid)
    window.location.href = url
  } catch (e) {
    loading.value = false
    errorVisible.value = true
  }
}

onMounted(() => {
  const isSuccess = window?.location?.search?.includes('status=success')
  if (isSuccess) {
    trackEvent('upgrade_success')
    // Refresh plan + usage after redirect (webhook may take a moment)
    try { authStore.refreshUser?.() } catch {}
    try { authStore.refreshPlan?.() } catch {}
    // Poll subscription status briefly to reflect changes
    const uid = authStore?.user?.uid
    if (uid) {
      let attempts = 0
      const timer = setInterval(async () => {
        attempts++
        await subStore.fetchStatus(uid)
        if (subStore.subscription.plan === 'premium' || attempts >= 6) {
          clearInterval(timer)
        }
      }, 2000)
    }
  } else if (authStore?.user?.uid) {
    subStore.fetchStatus(authStore.user.uid)
  }
  if (window?.location?.search?.includes('reactivated=1')) {
    ElMessage.success('Subscription reactivated. Welcome back to Premium!')
  }
})

// async function onCancel() {
//   try {
//     if (!authStore.user) return router.push('/login')
//     // Confirm cancellation with the user
//     try {
//       await ElMessageBox.confirm(
//         'Are you sure you want to cancel your subscription?',
//         'Cancel Subscription',
//         {
//           confirmButtonText: 'Yes, cancel it',
//           cancelButtonText: 'No, keep it',
//           type: 'warning',
//         }
//       )
//     } catch {
//       return // user canceled dialog
//     }
//     cancelLoading.value = true
//     await cancelSubscription(authStore.user.uid)
//     await subStore.fetchStatus(authStore.user.uid)
//     ElMessage.success("Subscription canceled. You’ll remain Premium until the period ends.")
//   } catch (e) {
//     console.error(e)
//     errorVisible.value = true
//   } finally {
//     cancelLoading.value = false
//   }
// }
async function onCancel() {
  try {
    if (!authStore.user) return router.push('/login')

    await ElMessageBox.confirm(
      'Are you sure you want to cancel your subscription?',
      'Cancel Subscription',
      {
        confirmButtonText: 'Yes, cancel it',
        cancelButtonText: 'No, keep it',
        type: 'warning',
      }
    )

    cancelLoading.value = true

    // 🚀 Cancel on backend
    await cancelSubscription(authStore.user.uid)

    // ✅ Refresh both authStore and subStore
    await Promise.all([
      authStore.refreshUser?.(),
      subStore.fetchStatus(authStore.user.uid),
    ])

    ElMessage.success("Subscription canceled. You’ll remain Premium until the period ends.")
  } catch (e) {
    console.error(e)
    errorVisible.value = true
  } finally {
    cancelLoading.value = false
  }
}
</script>
