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
      <span
        class="absolute -top-3 right-4 text-black text-xs px-2 py-1 rounded-full"
        :class="offerActive ? 'bg-yellow-400' : 'bg-indigo-200 text-indigo-900'"
      >
        {{ offerActive ? 'Limited Offer' : 'Most Popular' }}
      </span>
      <h3 class="text-xl font-bold mb-4">🚀 Premium</h3>
      <ul class="space-y-2 text-white mb-6">
        <li>✅ Unlimited AI Insights</li>
        <li>✅ Smart Reminders</li>
        <li>✅ Calendar & WhatsApp integration</li>
        <li>✅ Priority Support</li>
      </ul>
      <!-- Psychological pricing with optional countdown -->
      <div v-if="offerActive" class="mb-2 flex items-baseline gap-2">
        <s class="text-gray-200/90 text-lg">$4</s>
        <span class="text-3xl font-extrabold">$2</span>
        <span class="text-sm text-green-200">50% OFF</span>
      </div>
      <p v-if="offerActive" class="text-xs text-yellow-400 mb-4">
        ⚡ Limited-time offer! Ends in {{ countdown }}
      </p>
      <p v-else class="text-2xl font-bold mb-4">$2 / month</p>
      <div v-if="isPremium" class="space-y-2">
        <button
          :disabled="cancelLoading"
          @click="onCancel"
          class="w-full py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-500 text-white font-semibold hover:from-rose-700 hover:to-red-600 transition disabled:opacity-60 text-sm sm:text-base"
        >
          <span v-if="cancelLoading">Canceling…</span>
          <span v-else>Cancel Subscription</span>
        </button>
        <p class="text-sm text-white/80">You're currently on Premium.</p>
      </div>
      <button
        v-else
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
    <p v-if="$route.query.status === 'success'" class="text-green-400">✅ Payment complete. Premium is now active! 🎉</p>
    <p v-else-if="$route.query.status === 'cancel'" class="text-red-400">❌ Checkout canceled. You can try again anytime.</p>
  </div>
  <el-dialog
    v-model="dialogVisible"
    title="Cancel Subscription"
    width="420px"
    class="cancel-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="!cancelLoading"
    :show-close="!cancelLoading"
  >
    <div class="flex items-start gap-3 text-slate-200">
      <span class="text-amber-400 text-xl">⚠️</span>
      <p>Are you sure you want to cancel your subscription?</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <el-button @click="dialogVisible = false" :disabled="cancelLoading">No, keep it</el-button>
        <el-button type="danger" @click="confirmCancel" :loading="cancelLoading">Yes, cancel it</el-button>
      </div>
    </template>
  </el-dialog>
  <ErrorDialog
    v-model="errorVisible"
    title="Action Failed"
    message="❌ We couldn't complete that action. Please try again later."
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { createCheckoutSession, cancelSubscription } from '@/services/stripeService'
import { trackEvent } from '@/services/analytics'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useIsPremium } from '@/composables/useIsPremium'
import { trackLinkedInConversion } from '@/utils/ads'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'
const errorVisible = ref(false)
const cancelLoading = ref(false)
const countdown = ref('03:00:00')
const offerActive = ref(false)
let promoTimer = null

const subStore = useSubscriptionStore()
const sub = subStore.subscription
const { isPremium } = useIsPremium()

const dialogVisible = ref(false)

function stopPromoTimer() {
  if (promoTimer) {
    clearInterval(promoTimer)
    promoTimer = null
  }
  offerActive.value = false
}

function startPromoTimer() {
  if (promoTimer || isPremium.value) return
  try {
    const key = 'promoExpiresAt'
    let exp = parseInt(sessionStorage.getItem(key) || '0', 10)
    if (!exp || Number.isNaN(exp) || exp < Date.now()) {
      exp = Date.now() + 3 * 60 * 60 * 1000
      sessionStorage.setItem(key, String(exp))
    }
    const tick = () => {
      if (isPremium.value) {
        stopPromoTimer()
        return
      }
      const left = Math.max(0, exp - Date.now())
      if (left <= 0) {
        countdown.value = '00:00:00'
        stopPromoTimer()
        try { sessionStorage.removeItem(key) } catch {}
        return
      }
      const s = Math.floor(left / 1000)
      const h = String(Math.floor(s / 3600)).padStart(2, '0')
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
      const sec = String(s % 60).padStart(2, '0')
      countdown.value = `${h}:${m}:${sec}`
      offerActive.value = true
    }
    promoTimer = setInterval(tick, 1000)
    tick()
  } catch {
    stopPromoTimer()
  }
}

// async function onUpgrade() {
//   try {
//     // Ensure signed in with a non-guest account before starting checkout
//     const isGuest = authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'
//     if (!authStore.user?.uid || isGuest) {
//       try { localStorage.setItem('postLoginRedirect', '/subscription?upgrade=1') } catch {}
//       try { ElMessage.info('Please sign in to upgrade your plan.') } catch {}
//       return router.push('/login')
//     }
//     loading.value = true
//     trackEvent('upgrade_started')
//     const url = await createCheckoutSession('monthly', authStore.user?.uid)
//     window.location.href = url
//   } catch (e) {
//     loading.value = false
//     errorVisible.value = true
//   }
// }
async function onUpgrade() {
  try {
    // Check guest or missing auth
    const isGuest = authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'

    if (!authStore.user?.uid || isGuest) {
      try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
      // Store post-login redirect intent
      try {
        localStorage.setItem('postLoginRedirect', '/subscription?upgrade=1')
        localStorage.setItem('upgradeAfterLogin', '1')
      } catch {}

      // Themed info message (aligned with PlanCraftAI UI tone)
      ElNotification({
        title: '🚀 Upgrade to Premium',
        message: 'Please sign in first to continue your upgrade ✨',
        type: 'info',
        duration: 2800,
        offset: 80,
        position: 'top-right',
        customClass: 'glass-toast',
      })

      // Navigate to login page
      return router.push('/login')
    }

    // Proceed with checkout
    loading.value = true
    trackEvent('upgrade_started')
    try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
    const url = await createCheckoutSession('monthly', authStore.user?.uid)
    window.location.href = url

  } catch (e) {
    console.error('Upgrade error:', e)
    loading.value = false
    errorVisible.value = true
  }
}

onMounted(() => {
  if (isPremium.value) {
    stopPromoTimer()
    try { sessionStorage.removeItem('promoExpiresAt') } catch {}
  } else {
    startPromoTimer()
  }

  const qs = window?.location?.search || ''
  const isSuccess = qs.includes('status=success')
  const isCancel = qs.includes('status=cancel')
  const isReactivated = qs.includes('reactivated=1')
  const wantsUpgrade = (new URLSearchParams(qs).get('upgrade') === '1') || localStorage.getItem('upgradeAfterLogin') === '1'
  if (isSuccess) {
    trackEvent('upgrade_success')
    try { ElNotification({ title: '🎉 Payment successful', message: 'Premium is now active!', type: 'success', duration: 2600, offset: 80 }) } catch {}
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
  if (isReactivated) {
    try { ElNotification({ title: '🎉 Reactivated', message: 'Welcome back to Premium!', type: 'success', duration: 2400, offset: 80 }) } catch {}
  }
  if (isCancel) {
    try { ElNotification({ title: 'Checkout canceled', message: 'You can try again anytime.', type: 'info', duration: 2200, offset: 80 }) } catch {}
  }
  // Auto-continue to checkout after login if user intended to upgrade
  try {
    if (wantsUpgrade && authStore?.user?.uid && !isPremium.value) {
      localStorage.removeItem('upgradeAfterLogin')
      onUpgrade()
    }
  } catch {}
})
watch(isPremium, (val) => {
  if (val) {
    stopPromoTimer()
    try { sessionStorage.removeItem('promoExpiresAt') } catch {}
  } else {
    startPromoTimer()
  }
})

onUnmounted(() => { try { if (typeof timer !== 'undefined') clearInterval(timer) } catch {} })
onUnmounted(() => stopPromoTimer())

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
  if (!authStore.user) {
    router.push('/login')
    return
  }
  dialogVisible.value = true
}

async function confirmCancel() {
  if (!authStore.user?.uid) {
    dialogVisible.value = false
    router.push('/login')
    return
  }
  cancelLoading.value = true
  try {
    await cancelSubscription(authStore.user.uid)
    await Promise.all([
      authStore.refreshUser?.(),
      subStore.fetchStatus(authStore.user.uid),
    ])
    ElMessage.success("Subscription canceled. You’ll remain Premium until the period ends.")
    dialogVisible.value = false
  } catch (e) {
    console.error(e)
    errorVisible.value = true
  } finally {
    cancelLoading.value = false
  }
}
</script>

<style scoped>
.el-notification.glass-toast {
  background: rgba(30, 15, 60, 0.75);
  border: 1px solid rgba(138, 92, 246, 0.25);
  backdrop-filter: blur(12px);
  color: #e5d4ff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.cancel-dialog :deep(.el-dialog) {
  background: linear-gradient(145deg, #1f2937, #111827);
  color: #e2e8f0;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 38px rgba(0, 0, 0, 0.6);
}
.cancel-dialog :deep(.el-dialog__title) {
  color: #f9fafb;
}
.cancel-dialog :deep(.el-button.el-button--danger) {
  background: linear-gradient(90deg, #ef4444, #dc2626);
  border: none;
  color: #fff;
}
.cancel-dialog :deep(.el-button.el-button--danger:hover) {
  background: linear-gradient(90deg, #f87171, #ef4444);
}
</style>
