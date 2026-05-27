<template>
  <div class="pricing-page-root">
    <template v-if="isAppleBillingSafeMode">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-3 sm:py-16">
        <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 via-indigo-950/80 to-slate-900/85 p-8 sm:p-10 shadow-2xl space-y-8">
          <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div class="space-y-6">
              <div class="space-y-3">
                <p class="text-sm uppercase tracking-[0.35em] text-indigo-300">Solo Premium</p>
                <h1 class="text-3xl sm:text-4xl font-semibold text-white">Upgrade to Solo Premium on iPhone</h1>
                <p class="max-w-3xl text-indigo-100/85 text-base sm:text-lg">
                  Solo Premium is available via Apple In-App Purchase at $2.99/month. Team plans are
                  managed by workspace owners on web.
                </p>
              </div>

              <AppleSoloPremiumCard />
            </div>
            <div class="space-y-4">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                <p class="text-xs uppercase tracking-[0.24em] text-indigo-200">Already subscribed?</p>
                <ul class="space-y-2 text-sm text-indigo-100/90">
                  <li>Sign in with the same account you use for Solo Premium or your team workspace.</li>
                  <li>Use restore purchases for Apple subscriptions, or refresh access for existing synced billing.</li>
                  <li>Your premium features unlock automatically when the account entitlement is active.</li>
                </ul>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                <p class="text-xs uppercase tracking-[0.24em] text-indigo-200">For team workspaces</p>
                <ul class="space-y-2 text-sm text-indigo-100/90">
                  <li>Team plans are managed by workspace owners on web.</li>
                  <li>Paid workspace memberships sync to your account after the next refresh.</li>
                  <li>No team pricing or external checkout is shown in the iPhone app.</li>
                </ul>
              </div>

              <div class="flex flex-wrap gap-3">
                <RouterLink
                  v-if="!authStore.user?.uid"
                  to="/login"
                  class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Sign in
                </RouterLink>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-indigo-300/40"
                  @click="refreshPremiumAccess"
                >
                  Refresh access
                </button>
              </div>

              <p class="text-sm text-indigo-100/70">
                Existing Solo Premium access and paid workspace access sync automatically after sign-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <section class="rounded-3xl border border-indigo-300/25 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 p-6 sm:p-8">
          <p class="text-xs uppercase tracking-[0.28em] text-indigo-200/90">Solo Premium</p>
          <h1 class="mt-2 text-3xl font-semibold text-white sm:text-4xl">Finish your first reminder loop faster</h1>
          <p class="mt-3 max-w-2xl text-sm text-indigo-100/90 sm:text-base">
            Capture tasks, get nudges, and follow through with less friction.
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-3">
            <button
              v-if="!isPremium"
              :disabled="loading"
              @click="onUpgrade"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-900 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <span v-if="loading">Redirecting…</span>
              <span v-else>Start Premium — $2/mo</span>
            </button>
            <button
              v-else-if="!isAppleManagedPremium"
              :disabled="cancelLoading"
              @click="onCancel"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
            >
              <span v-if="cancelLoading">Canceling…</span>
              <span v-else>Cancel Subscription</span>
            </button>
            <div
              v-else
              class="inline-flex min-h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/90"
            >
              Managed through Apple on iPhone
            </div>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:border-indigo-300/50"
              @click="refreshPremiumAccess"
            >
              Refresh Access
            </button>
          </div>
          <p v-if="offerActive && !isPremium" class="mt-3 text-xs text-indigo-100/85">
            Limited offer active: $2/month. Ends in {{ countdown }}.
          </p>
        </section>

        <section class="mt-5 rounded-2xl border border-white/10 bg-slate-900/65 p-4 sm:p-5">
          <details>
            <summary class="cursor-pointer list-none text-sm font-semibold text-white">Compare plans and features</summary>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-white/10 bg-slate-900/85 p-4">
                <h3 class="text-base font-semibold text-white">Solo Free</h3>
                <p class="mt-1 text-2xl font-bold text-white">$0</p>
                <ul class="mt-3 space-y-1 text-sm text-indigo-100/90">
                  <li>Unlimited journaling</li>
                  <li>Basic AI (10 insights/mo)</li>
                  <li>No reminders</li>
                  <li>No integrations</li>
                </ul>
              </div>
              <div class="relative rounded-xl border border-indigo-300/40 bg-indigo-900/35 p-4">
                <span class="premium-badge">{{ offerActive ? 'Limited Offer' : 'Most Popular' }}</span>
                <h3 class="text-base font-semibold text-white">Solo Premium</h3>
                <p class="mt-1 text-2xl font-bold text-white">$2 / month</p>
                <ul class="mt-3 space-y-1 text-sm text-indigo-100/90">
                  <li>Unlimited AI insights</li>
                  <li>Smart reminders</li>
                  <li>Calendar and WhatsApp integration</li>
                  <li>Priority support</li>
                </ul>
              </div>
            </div>
          </details>
        </section>

        <section id="teams" class="mt-5 rounded-2xl border border-white/10 bg-slate-900/65 p-4 sm:p-5">
          <details>
            <summary class="cursor-pointer list-none text-sm font-semibold text-white">Team plans and workspace billing</summary>
            <div class="mt-4 space-y-4">
              <p class="text-sm text-indigo-100/85">Seat-based plans for shared workspaces with roles and voice reminders.</p>
              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-xl border border-indigo-400/35 bg-slate-900/85 p-4">
                  <h4 class="text-lg font-semibold text-white">Team Starter</h4>
                  <p class="mt-1 text-xl font-bold text-white">$6 <span class="text-sm font-normal text-indigo-200">/ seat / month</span></p>
                  <p class="mt-1 text-sm text-indigo-200">Minimum 3 seats</p>
                  <ul class="mt-3 space-y-1 text-sm text-indigo-100/90">
                    <li>Shared workspace</li>
                    <li>Invite teammates</li>
                    <li>Role-based access</li>
                    <li>Voice AI reminders</li>
                  </ul>
                  <button
                    class="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    @click="handleTeamCta('starter')"
                  >
                    {{ starterCtaLabel }}
                  </button>
                </div>
                <div class="rounded-xl border border-indigo-300/45 bg-indigo-950/45 p-4">
                  <h4 class="text-lg font-semibold text-white">Team Pro</h4>
                  <p class="mt-1 text-xl font-bold text-white">$10 <span class="text-sm font-normal text-indigo-200">/ seat / month</span></p>
                  <p class="mt-1 text-sm text-indigo-200">Minimum 3 seats</p>
                  <ul class="mt-3 space-y-1 text-sm text-indigo-100/90">
                    <li>Everything in Starter</li>
                    <li>Advanced admin controls (coming soon)</li>
                    <li>Priority support</li>
                  </ul>
                  <button
                    class="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-indigo-900 transition hover:bg-slate-100"
                    @click="handleTeamCta('pro')"
                  >
                    {{ proCtaLabel }}
                  </button>
                </div>
              </div>
              <p class="text-xs text-indigo-200/90">Seats are active teammates in your workspace. Billing adjusts automatically when seats change.</p>
            </div>
          </details>
        </section>
      </div>
      <div class="text-center text-sm mt-6">
        <p v-if="$route.query.status === 'success'" class="text-green-400">✅ Payment complete. Premium is now active! 🎉</p>
        <p v-else-if="$route.query.status === 'cancel'" class="text-red-400">❌ Checkout canceled. You can try again anytime.</p>
      </div>
      <div
        v-if="showMobileStickyUpgrade"
        class="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur sm:hidden"
      >
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[11px] uppercase tracking-[0.22em] text-indigo-200/80">Solo Premium</p>
            <p class="truncate text-sm font-semibold text-white">
              {{ offerActive ? '$2/mo limited offer' : '$2/mo' }}
            </p>
          </div>
          <button
            :disabled="loading"
            @click="onUpgrade"
            class="shrink-0 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {{ loading ? 'Redirecting…' : 'Upgrade' }}
          </button>
        </div>
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
  </div>
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
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import AppleSoloPremiumCard from '@/components/AppleSoloPremiumCard.vue'

const authStore = useAuthStore()
const accessStore = useAccessStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const isAppleBillingSafeMode = detectAppleBillingSafeMode()
const billingSafeRoute = '/billing/upgrade'
useSeoMeta({
  title: isAppleBillingSafeMode ? 'Premium Access | PlanCraft AI' : 'Pricing | PlanCraft AI – Solo & Team Plans with Voice AI',
  description: isAppleBillingSafeMode
    ? 'Buy Solo Premium through Apple in the iOS app, or refresh synced premium and paid workspace access on your account.'
    : 'Compare solo and team plans for PlanCraft AI. Get AI planning, calendar sync, and Voice AI reminders with pricing built for individuals and shared workspaces.',
  keywords: isAppleBillingSafeMode
    ? ['PlanCraft AI Solo Premium', 'PlanCraft AI Apple subscription', 'PlanCraft AI account access']
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
const errorVisible = ref(false)
const cancelLoading = ref(false)
const countdown = ref('03:00:00')
const offerActive = ref(false)
let promoTimer = null
let statusPollTimer = null
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
const { isPremium } = useIsPremium()
const isAppleManagedPremium = computed(() => {
  const source = String(subStore.subscription?.source || '').trim().toLowerCase()
  return source === 'apple'
})

const dialogVisible = ref(false)
const showMobileStickyUpgrade = computed(() => !isAppleBillingSafeMode && !isPremium.value)

function trackSubscriptionFunnel(step, extra = {}) {
  trackEvent(`subscription_funnel_${step}`, {
    surface: 'subscription_page',
    is_apple_billing_mode: !!isAppleBillingSafeMode,
    is_premium: !!isPremium.value,
    ...extra,
  })
}

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
        try {
          sessionStorage.removeItem(key)
        } catch {
          /* noop */
        }
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
    trackSubscriptionFunnel('cta_click', { cta: 'solo_upgrade', target: 'billing_upgrade' })
    return router.push(billingSafeRoute)
  }
  try {
    // Check guest or missing auth
    const isGuest = authStore.isGuest === true || authStore.guest === true || authStore.user?.mode === 'guest'

    if (!authStore.user?.uid || isGuest) {
      trackSubscriptionFunnel('cta_click', { cta: 'solo_upgrade', auth_state: 'logged_out_or_guest' })
      try {
        trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK)
      } catch {
        /* noop */
      }
      // Store post-login redirect intent
      try {
        localStorage.setItem('postLoginRedirect', '/subscription?upgrade=1')
        localStorage.setItem('upgradeAfterLogin', '1')
      } catch {
        /* noop */
      }

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
    trackSubscriptionFunnel('cta_click', { cta: 'solo_upgrade', auth_state: 'signed_in' })
    trackEvent('upgrade_started')
    try {
      trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK)
    } catch {
      /* noop */
    }
    trackSubscriptionFunnel('checkout_redirect', { cta: 'solo_upgrade' })
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
    try {
      localStorage.setItem('postLoginRedirect', target)
    } catch {
      /* noop */
    }
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
  trackSubscriptionFunnel('page_view')
  if (isAppleBillingSafeMode) {
    stopPromoTimer()
    return
  }
  if (isPremium.value) {
    stopPromoTimer()
    try {
      sessionStorage.removeItem('promoExpiresAt')
    } catch {
      /* noop */
    }
  } else {
    startPromoTimer()
  }

  if (authStore?.user?.uid) {
    try {
      workspaceStore.init()
    } catch {
      /* noop */
    }
  }

  const qs = window?.location?.search || ''
  const isSuccess = qs.includes('status=success')
  const isCancel = qs.includes('status=cancel')
  const isReactivated = qs.includes('reactivated=1')
  const wantsUpgrade = (new URLSearchParams(qs).get('upgrade') === '1') || localStorage.getItem('upgradeAfterLogin') === '1'
  if (isSuccess) {
    trackSubscriptionFunnel('success', { source: 'query_status_success' })
    trackEvent('upgrade_success')
    try {
      ElNotification({ title: '🎉 Payment successful', message: 'Premium is now active!', type: 'success', duration: 2600, offset: 80 })
    } catch {
      /* noop */
    }
    // Refresh plan + usage after redirect (webhook may take a moment)
    try {
      authStore.refreshUser?.()
    } catch {
      /* noop */
    }
    try {
      authStore.refreshPlan?.()
    } catch {
      /* noop */
    }
    // Poll subscription status briefly to reflect changes
    const uid = authStore?.user?.uid
    if (uid) {
      let attempts = 0
      if (statusPollTimer) {
        clearInterval(statusPollTimer)
      }
      statusPollTimer = setInterval(async () => {
        attempts++
        await subStore.fetchStatus(uid)
        if (subStore.subscription.plan === 'premium' || attempts >= 6) {
          clearInterval(statusPollTimer)
          statusPollTimer = null
        }
      }, 2000)
    }
  } else if (authStore?.user?.uid) {
    subStore.fetchStatus(authStore.user.uid)
  }
  if (isReactivated) {
    try {
      ElNotification({ title: '🎉 Reactivated', message: 'Welcome back to Premium!', type: 'success', duration: 2400, offset: 80 })
    } catch {
      /* noop */
    }
  }
  if (isCancel) {
    try {
      ElNotification({ title: 'Checkout canceled', message: 'You can try again anytime.', type: 'info', duration: 2200, offset: 80 })
    } catch {
      /* noop */
    }
  }
  // Auto-continue to checkout after login if user intended to upgrade
  try {
    if (wantsUpgrade && authStore?.user?.uid && !isPremium.value) {
      localStorage.removeItem('upgradeAfterLogin')
      onUpgrade()
    }
  } catch {
    /* noop */
  }
})
watch(isPremium, (val) => {
  if (isAppleBillingSafeMode) return
  if (val) {
    stopPromoTimer()
    try {
      sessionStorage.removeItem('promoExpiresAt')
    } catch {
      /* noop */
    }
  } else {
    startPromoTimer()
  }
})

onUnmounted(() => {
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
    statusPollTimer = null
  }
})
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
  if (isAppleManagedPremium.value) {
    ElMessage.info('This subscription is managed through Apple on your iPhone.')
    return
  }
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

async function refreshPremiumAccess() {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      await accessStore.fetchAccess(uid, { force: true, minIntervalMs: 0 })
      await subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 })
    }
  } catch {
    /* noop */
  }

  try {
    await workspaceStore.init()
  } catch {
    /* noop */
  }

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
