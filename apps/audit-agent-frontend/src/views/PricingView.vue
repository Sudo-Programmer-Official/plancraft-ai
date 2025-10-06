<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 text-white flex flex-col items-center justify-center px-4 sm:px-8">
    <div class="max-w-5xl w-full py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
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
        <button disabled class="w-full py-2 rounded-lg bg-gray-700 text-gray-400 cursor-not-allowed">
          Current Plan
        </button>
      </div>

      <!-- Premium Plan -->
      <div class="bg-gradient-to-br from-purple-700 to-pink-600 rounded-2xl shadow-xl p-8 border border-purple-400 relative">
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

        <div v-if="isPremium" class="space-y-2">
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

    <div class="text-center text-sm mt-8">
      <p v-if="$route.query.status === 'success'" class="text-green-400">
        ✅ Payment complete. Premium is now active! 🎉
      </p>
      <p v-else-if="$route.query.status === 'cancel'" class="text-red-400">
        ❌ Checkout canceled. You can try again anytime.
      </p>
    </div>

    <!-- Login Prompt Dialog -->
    <el-dialog
      v-model="showLoginPrompt"
      width="460px"
      align-center
      class="login-prompt rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a132f] via-[#221a46] to-[#2e165c] text-white shadow-2xl border border-purple-500/20"
    >
      <template #header>
        <div class="flex items-center justify-between px-3 py-1">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🚀</span>
            <h2 class="text-lg font-semibold text-purple-200">Sign in to Unlock Pro2</h2>
          </div>
        </div>
      </template>

      <div class="px-3 pb-4 text-[15px] leading-relaxed text-purple-100">
        <p class="mb-4 text-purple-200/100">
          Your free session is temporary. To upgrade your plan and save your subscription securely,
          please sign in to your account.
        </p>
        <div class="bg-purple-900/30 border border-purple-700/40 rounded-lg p-3 text-sm text-purple-100">
          ✨ <strong>Pro Members</strong> enjoy unlimited AI insights, smart reminders, and
          WhatsApp/PWA notifications — all synced safely across devices.
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 px-3 pb-3">
          <el-button
            @click="showLoginPrompt = false"
            class="!bg-transparent !border-purple-400/40 !text-purple-200 hover:!bg-purple-700/20 hover:!text-white"
          >
            Maybe Later
          </el-button>
          <RouterLink
            to="/login"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <span>Sign In & Continue</span> <span>→</span>
          </RouterLink>
        </div>
      </template>
    </el-dialog>

    <ErrorDialog
      v-model="errorVisible"
      title="Action Failed"
      message="❌ We couldn't complete that action. Please try again later."
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { createCheckoutSession, cancelSubscription } from '@/services/stripeService'
import { redirectToUpgradeIntent } from '@/services/upgradeIntent'
import { trackEvent } from '@/services/analytics'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'
const errorVisible = ref(false)
const cancelLoading = ref(false)
const showLoginPrompt = ref(false)

const subStore = useSubscriptionStore()
const sub = subStore.subscription
const isPremium = computed(() => {
  try {
    const planFromStore = sub?.plan ?? sub?.value?.plan
    const planFromUser = authStore?.user?.plan
    const roleFromUser = authStore?.user?.role
    return [planFromStore, planFromUser, roleFromUser]
      .map((v) => String(v || '').toLowerCase())
      .includes('premium')
  } catch {
    return false
  }
})

// async function onUpgrade() {
//   try {
//     // Ensure signed in before starting checkout
//     if (!authStore.user?.uid || authStore.isGuest) {
//       redirectToUpgradeIntent('pricing')
//       showLoginPrompt.value = true
//       return
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
// async function onUpgrade() {
//   try {
//     // Strong guard against guest or null user
//     await authStore.ensureLoaded?.()
//     const user = authStore.user

//     if (!user?.uid || authStore.isGuest || user.mode === 'guest') {
//       console.warn('Blocked guest from upgrade flow')
//       redirectToUpgradeIntent('pricing')
//       showLoginPrompt.value = true
//       return
//     }

//     loading.value = true
//     trackEvent('upgrade_started')
//     const url = await createCheckoutSession('monthly', user.uid)
//     window.location.href = url
//   } catch (e) {
//     console.error(e)
//     loading.value = false
//     errorVisible.value = true
//   }
// }
async function onUpgrade() {
  if (loading.value) return
  try {
    await authStore.ensureLoaded?.()
    const user = authStore.user

    if (!user?.uid || authStore.isGuest || user.mode === 'guest') {
      console.warn('Blocked guest from upgrade flow')
      redirectToUpgradeIntent('pricing')
      return
    }

    loading.value = true
    trackEvent('upgrade_started')
    const url = await createCheckoutSession('monthly', user.uid)
    window.location.href = url
  } catch (e) {
    console.error(e)
    errorVisible.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // If redirected with an upgrade intent and user is not authenticated, show login prompt
  try {
    const params = new URLSearchParams(window?.location?.search || '')
    const wantsUpgrade = params.get('upgrade') === '1'
    if (wantsUpgrade && (!authStore?.user?.uid || authStore.isGuest)) {
      window.dispatchEvent(new CustomEvent('login-required', { detail: { feature: 'pricing' } }))
    }
  } catch {}

  const isSuccess = window?.location?.search?.includes('status=success')
  if (isSuccess) {
    trackEvent('upgrade_success')
    // Refresh plan + usage after redirect (webhook may take a moment)
    try {
      authStore.refreshUser?.()
    } catch {}
    try {
      authStore.refreshPlan?.()
    } catch {}
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
      },
    )

    cancelLoading.value = true

    // 🚀 Cancel on backend
    await cancelSubscription(authStore.user.uid)

    // ✅ Refresh both authStore and subStore
    await Promise.all([authStore.refreshUser?.(), subStore.fetchStatus(authStore.user.uid)])

    ElMessage.success('Subscription canceled. You’ll remain Premium until the period ends.')
  } catch (e) {
    console.error(e)
    errorVisible.value = true
  } finally {
    cancelLoading.value = false
  }
}
</script>

<style scoped>
/* Optional: Add any additional styles if needed */
@keyframes dialogGlow {
  0%,
  100% {
    box-shadow:
      0 0 10px rgba(147, 51, 234, 0.4),
      0 0 20px rgba(236, 72, 153, 0.3);
  }
  50% {
    box-shadow:
      0 0 20px rgba(147, 51, 234, 0.6),
      0 0 30px rgba(236, 72, 153, 0.4);
  }
}
.el-dialog {
  animation: dialogGlow 5s ease-in-out infinite alternate;
}

.login-prompt .el-dialog__header {
  background: rgba(58, 0, 100, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
