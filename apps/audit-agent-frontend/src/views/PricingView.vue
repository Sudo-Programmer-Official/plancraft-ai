<template>
  <template v-if="isAppleBillingSafeMode">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 via-indigo-950/80 to-slate-900/85 p-8 sm:p-10 shadow-2xl space-y-8">
        <div class="space-y-3">
          <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Premium access</p>
          <h1 class="text-3xl sm:text-4xl font-semibold text-white">Premium features are available via your account</h1>
          <p class="max-w-3xl text-indigo-100/85 text-base sm:text-lg">
            Upgrade your experience on our website. Your account stays in sync, so premium access is ready when you come back.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <p class="text-xs uppercase tracking-[0.24em] text-indigo-200">Included with premium</p>
            <ul class="space-y-2 text-sm text-indigo-100/90">
              <li>Unlimited AI insights and reminders</li>
              <li>Calendar and WhatsApp integrations</li>
              <li>Priority support and early access</li>
            </ul>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <p class="text-xs uppercase tracking-[0.24em] text-indigo-200">For teams</p>
            <ul class="space-y-2 text-sm text-indigo-100/90">
              <li>Shared workspaces and teammate invites</li>
              <li>Role-based collaboration</li>
              <li>Voice AI reminders and follow-ups</li>
            </ul>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            @click="openBillingWebsite"
          >
            Open Website
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-indigo-300/40"
            @click="refreshPremiumAccess"
          >
            I've upgraded -> Refresh
          </button>
        </div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div class="mb-6 sm:mb-8">
        <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Solo</p>
        <h3 class="text-3xl font-semibold text-white">Solo plans</h3>
        <p class="text-indigo-200">Personal pricing for individual workspaces.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        <div class="bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-700">
          <h3 class="text-xl font-bold mb-4">🌱 Solo Free</h3>
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

        <div
          class="bg-gradient-to-br from-purple-700 to-pink-600 rounded-2xl shadow-xl p-8 border border-purple-400 relative"
        >
          <span class="premium-badge">
            {{ offerActive ? 'Limited Offer' : 'Most Popular' }}
          </span>
          <h3 class="text-xl font-bold mb-4">🚀 Solo Premium</h3>
          <ul class="space-y-2 text-white mb-6">
            <li>✅ Unlimited AI Insights</li>
            <li>✅ Smart Reminders</li>
            <li>✅ Calendar & WhatsApp integration</li>
            <li>✅ Priority Support</li>
          </ul>
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
    </div>
    <div id="teams" class="max-w-5xl mx-auto px-4 sm:px-6 mt-10 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Teams & Workspaces</p>
          <h3 class="text-3xl font-semibold text-white">Teams pricing</h3>
          <p class="text-indigo-200">
            Seat-based plans for shared Workspaces with roles and Voice AI reminders.
          </p>
        </div>
        <button
          class="px-4 py-2 rounded-lg bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition"
          @click="handleTeamCta('starter')"
        >
          Create Workspace
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="rounded-2xl border border-indigo-500/30 bg-slate-900/70 p-6 space-y-3 shadow-lg">
          <h4 class="text-2xl font-semibold text-white">Team Starter</h4>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">$6</span>
            <span class="text-sm text-indigo-200">/ seat / month</span>
          </div>
          <p class="text-sm text-indigo-200">Min 3 seats</p>
          <ul class="space-y-2 text-sm text-indigo-100/90">
            <li>✅ Shared workspace</li>
            <li>✅ Invite teammates</li>
            <li>✅ Role-based access</li>
            <li>✅ Voice AI reminders</li>
          </ul>
          <button
            class="w-full mt-4 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
            @click="handleTeamCta('starter')"
          >
            {{ starterCtaLabel }}
          </button>
        </div>
        <div class="rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950 p-6 space-y-3 shadow-lg ring-2 ring-indigo-400/40">
          <div class="flex items-center justify-between">
            <h4 class="text-2xl font-semibold text-white">Team Pro</h4>
            <span class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-300/50 text-indigo-100">
              Advanced admin controls — coming soon
            </span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">$10</span>
            <span class="text-sm text-indigo-200">/ seat / month</span>
          </div>
          <p class="text-sm text-indigo-200">Min 3 seats</p>
          <ul class="space-y-2 text-sm text-indigo-100/90">
            <li>✅ Everything in Starter</li>
            <li>✅ Advanced admin controls (Coming soon)</li>
            <li>✅ Priority support</li>
          </ul>
          <button
            class="w-full mt-4 px-4 py-3 rounded-xl bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition"
            @click="handleTeamCta('pro')"
          >
            {{ proCtaLabel }}
          </button>
        </div>
      </div>
      <p class="text-sm text-indigo-200">
        Seats = people you invite to collaborate in a workspace. You only pay for active teammates, not viewers or guests.
      </p>
      <p class="text-sm text-indigo-200">Change seats anytime. Billing adjusts automatically.</p>
      <p class="text-sm text-indigo-200">
        Trusted by founders, creators, and small teams who want less noise and more follow-through.
      </p>
      <div class="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 mt-4 shadow-lg w-full">
        <div class="flex items-start gap-3">
          <div class="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🛡️</div>
          <div>
            <p class="text-lg font-semibold text-white">Billing you can trust</p>
            <p class="text-sm text-indigo-100 mt-1">
              No hidden fees. Cancel anytime. Change seats anytime. Billing adjusts automatically. No long-term contracts.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="text-center text-sm mt-6">
      <p v-if="$route.query.status === 'success'" class="text-green-400">✅ Payment complete. Premium is now active! 🎉</p>
      <p v-else-if="$route.query.status === 'cancel'" class="text-red-400">❌ Checkout canceled. You can try again anytime.</p>
    </div>
  </template>
  <el-dialog
    v-model="dialogVisible"
    title="Cancel Subscription"
    width="420px"
    class="cancel-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="!cancelLoading"
    :show-close="!cancelLoading"
  >
    <div class="flex items-start gap-3 text-[#111]">
      <span class="text-amber-500 text-xl mt-[1px]">⚠️</span>
      <p class="leading-relaxed font-medium">Are you sure you want to cancel your subscription?</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2 mt-6">
        <el-button class="keep-plan-btn" @click="dialogVisible = false" :disabled="cancelLoading">No, keep it</el-button>
        <el-button class="cancel-plan-btn" @click="confirmCancel" :loading="cancelLoading">Yes, cancel it</el-button>
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
import { useAccessStore } from '@/stores/accessStore'
import { createCheckoutSession, cancelSubscription } from '@/services/stripeService'
import { trackEvent } from '@/services/analytics'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useIsPremium } from '@/composables/useIsPremium'
import { trackLinkedInConversion } from '@/utils/ads'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { copyText, openExternalUrl } from '@/utils/nativeUi'
import { BILLING_WEB_HOST, BILLING_WEB_URL, isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'

const authStore = useAuthStore()
const accessStore = useAccessStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const billingWebHost = BILLING_WEB_HOST
const billingWebUrl = BILLING_WEB_URL
const isAppleBillingSafeMode = detectAppleBillingSafeMode()
const billingSafeRoute = '/billing/upgrade'
useSeoMeta({
  title: isAppleBillingSafeMode ? 'Premium Access | PlanCraft AI' : 'Pricing | PlanCraft AI – Solo & Team Plans with Voice AI',
  description: isAppleBillingSafeMode
    ? 'Premium features for PlanCraft AI are available via your account on the web.'
    : 'Compare solo and team plans for PlanCraft AI. Get AI planning, calendar sync, and Voice AI reminders with pricing built for individuals and shared workspaces.',
  keywords: isAppleBillingSafeMode
    ? ['PlanCraft AI premium access', 'PlanCraft AI account upgrades']
    : [
        'PlanCraft AI pricing',
        'AI planner subscription',
        'voice AI reminders pricing',
        'team workspace pricing',
      ],
  canonicalPath: '/pricing',
  structuredData: isAppleBillingSafeMode
    ? []
    : [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'PlanCraft AI',
          description:
            'AI planning workspace with voice reminders, calendar sync, journaling, and shared workspaces for teams.',
          url: 'https://plancraftai.com/pricing',
          offers: [
            { '@type': 'Offer', name: 'Solo Free', price: '0.00', priceCurrency: 'USD' },
            { '@type': 'Offer', name: 'Solo Premium', price: '2.00', priceCurrency: 'USD' },
            { '@type': 'Offer', name: 'Team Starter', price: '6.00', priceCurrency: 'USD' },
          ],
          category: 'Productivity',
        },
      ],
})
const loading = ref(false)
const monthlyPriceId = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID || 'price_monthly_default'
const errorVisible = ref(false)
const cancelLoading = ref(false)
const countdown = ref('03:00:00')
const offerActive = ref(false)
let promoTimer = null
const TEAM_REDIRECT = '/workspaces/new'
const teamWorkspaces = computed(() =>
  (workspaceStore.workspaces || []).filter((w) => (w.workspaceType || w.type) === 'team'),
)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || teamWorkspaces.value[0] || null)
const starterCtaLabel = computed(() => {
  if (!activeWorkspace.value) return 'Create Workspace'
  const plan = (activeWorkspace.value.plan || 'free').toLowerCase()
  if (plan === 'free') return 'Upgrade Workspace'
  return 'Manage Workspace'
})
const proCtaLabel = computed(() => {
  if (!activeWorkspace.value) return 'Create Workspace'
  const plan = (activeWorkspace.value.plan || 'free').toLowerCase()
  return plan === 'pro' ? 'Manage Workspace' : 'Upgrade Workspace'
})

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
  if (isAppleBillingSafeMode) {
    return router.push(billingSafeRoute)
  }
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

function handleTeamCta(plan = 'starter') {
  if (isAppleBillingSafeMode) {
    return router.push({ path: billingSafeRoute, query: { source: 'pricing-team', plan, workspaceId: activeWorkspace.value?.id || '' } })
  }
  const isGuest = authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'
  const target = plan === 'pro' ? `${TEAM_REDIRECT}?plan=pro` : TEAM_REDIRECT
  const workspace = activeWorkspace.value

  if (!authStore.user?.uid || isGuest) {
    try { localStorage.setItem('postLoginRedirect', target) } catch {}
    return router.push({ path: '/signup', query: { mode: 'team', next: target } })
  }

  if (!workspace) {
    return router.push({ path: '/workspaces/new', query: { plan } })
  }

  const currentPlan = (workspace.plan || 'free').toLowerCase()
  const workspaceId = workspace.id
  const needsUpgrade =
    (plan === 'starter' && currentPlan === 'free') || (plan === 'pro' && currentPlan !== 'pro')

  if (needsUpgrade) {
    return router.push({ path: '/billing/upgrade', query: { plan, workspaceId } })
  }

  return router.push('/workspaces')
}

onMounted(() => {
  if (isAppleBillingSafeMode) {
    stopPromoTimer()
    return
  }
  if (isPremium.value) {
    stopPromoTimer()
    try { sessionStorage.removeItem('promoExpiresAt') } catch {}
  } else {
    startPromoTimer()
  }

  if (authStore?.user?.uid) {
    try { workspaceStore.init() } catch {}
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
  if (isAppleBillingSafeMode) return
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

async function copyBillingWebsite() {
  const copied = await copyText(billingWebHost)
  if (copied) {
    ElMessage.success(`${billingWebHost} copied`)
    return
  }
  ElMessage.info(`Visit ${billingWebHost}`)
}

async function openBillingWebsite() {
  const opened = openExternalUrl(billingWebUrl)
  if (opened) return
  await copyBillingWebsite()
}

async function refreshPremiumAccess() {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      await accessStore.fetchAccess(uid, { force: true, minIntervalMs: 0 })
      await subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 })
    }
  } catch {}

  try {
    await workspaceStore.init()
  } catch {}

  ElMessage.success('Account access refreshed')
  router.push('/dashboard')
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
.premium-badge {
  position: absolute;
  top: -0.75rem;
  right: 1rem;
  font-size: 0.7rem;
  font-variant: small-caps;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.3rem 0.55rem;
  color: #000;
  background: linear-gradient(90deg, #FFD400, #FFB700);
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
}

.cancel-dialog :deep(.el-dialog) {
  background: rgba(248, 249, 250, 0.9);
  color: #111;
  border-radius: 12px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.25);
  padding-bottom: 1rem;
}
.cancel-dialog :deep(.el-dialog__body) {
  color: #111;
}
.keep-plan-btn {
  border: 1px solid #555;
  color: #111;
  background: transparent;
}
.keep-plan-btn:hover,
.keep-plan-btn:focus {
  background: rgba(17, 17, 17, 0.05);
  color: #000;
}
.keep-plan-btn.is-disabled {
  border-color: rgba(85, 85, 85, 0.4);
  color: rgba(17, 17, 17, 0.45);
}
.cancel-plan-btn {
  background: #e34c4c;
  border: 1px solid #d63a3a;
  color: #fff;
}
.cancel-plan-btn:hover,
.cancel-plan-btn:focus {
  background: #f05151;
  border-color: #e13f3f;
}
.cancel-plan-btn.is-disabled {
  background: rgba(227, 76, 76, 0.6);
  border-color: rgba(214, 58, 58, 0.6);
  color: rgba(255, 255, 255, 0.75);
}
</style>
