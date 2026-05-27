<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 text-white">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <template v-if="isAppleBillingSafeMode">
        <header class="space-y-2">
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">{{ appleBillingEyebrow }}</p>
          <h1 class="text-3xl sm:text-4xl font-bold">{{ appleBillingTitle }}</h1>
          <p class="text-indigo-200">
            {{ appleBillingSubtitle }}
          </p>
        </header>

        <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-5 shadow-xl">
          <AppleSoloPremiumCard
            v-if="showSoloApplePurchase"
            eyebrow="Solo Premium"
            title="Buy or restore Solo Premium on iPhone"
            subtitle="Solo Premium is available via Apple In-App Purchase at $2.99/month. Team plans are managed by workspace owners on web."
          />

          <div class="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 space-y-3">
            <p class="text-xs uppercase tracking-[0.24em] text-indigo-200">{{ appleBillingGuideLabel }}</p>
            <p class="text-lg font-semibold text-white">{{ appleBillingGuideTitle }}</p>
            <p class="text-sm text-indigo-100/85">
              {{ appleBillingGuideCopy }}
            </p>
          </div>

          <div
            v-if="showHeaderFreePlanFlow"
            class="grid gap-3 sm:grid-cols-3"
          >
            <div
              v-for="step in headerFreePlanSteps"
              :key="step.step"
              class="rounded-xl border border-white/10 bg-slate-900/70 p-4"
            >
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">{{ step.step }}</p>
              <p class="mt-2 text-base font-semibold text-white">{{ step.title }}</p>
              <p class="mt-2 text-sm text-indigo-100/80">{{ step.copy }}</p>
            </div>
          </div>

          <div
            v-else-if="!isTeamBillingContext"
            class="grid gap-3 sm:grid-cols-2"
          >
            <div class="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Requested plan</p>
              <p class="mt-2 text-lg font-semibold text-white">{{ planLabel }}</p>
            </div>
            <div class="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Workspace</p>
              <p class="mt-2 text-sm font-medium text-white break-all">{{ workspaceId || 'Current workspace' }}</p>
            </div>
          </div>

          <div
            v-else
            class="rounded-xl border border-white/10 bg-slate-900/70 p-4"
          >
            <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Team billing</p>
            <p class="mt-2 text-base font-semibold text-white">Team plans are managed by workspace owners on web.</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <RouterLink
              v-if="!authStore.user?.uid"
              to="/login"
              class="px-5 py-3 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-100 transition"
            >
              Sign in
            </RouterLink>
            <button
              type="button"
              class="px-5 py-3 rounded-xl border border-white/15 bg-slate-900/70 text-white font-semibold hover:border-indigo-300/40 hover:bg-slate-900 transition"
              @click="refreshAccess"
            >
              Refresh access
            </button>
            <button
              type="button"
              class="px-5 py-3 rounded-xl border border-transparent bg-white/5 text-indigo-100 font-medium hover:bg-white/10 transition"
              @click="goBack"
            >
              Maybe later
            </button>
          </div>

          <p class="text-sm text-indigo-100/70">
            {{ appleBillingFootnote }}
          </p>
        </div>
      </template>

      <template v-else>
        <header class="space-y-2">
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">Billing</p>
          <h1 class="text-3xl sm:text-4xl font-bold">Upgrade Workspace</h1>
          <p class="text-indigo-200">
            Start a secure Stripe checkout for this workspace. Billing is workspace-level and seat-based.
          </p>
        </header>

        <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 pb-24 sm:pb-6 space-y-4 shadow-xl">
          <div class="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
            <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">What you unlock</p>
            <p class="mt-1 text-base font-semibold text-white">Shared accountability + reliable reminder flows for your team</p>
            <p class="mt-1 text-indigo-100/85">
              Upgrade once at workspace level so everyone gets the same follow-through system.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1">
              <span class="text-sm text-indigo-200/80">Workspace ID</span>
              <input
                v-model="workspaceId"
                type="text"
                class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                placeholder="workspace id"
              />
            </label>
            <label class="space-y-1">
              <span class="text-sm text-indigo-200/80">Plan</span>
              <select
                v-model="plan"
                class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                <option value="pro">Pro</option>
                <option value="starter">Starter</option>
              </select>
            </label>
            <label class="space-y-1">
              <span class="text-sm text-indigo-200/80">Seats</span>
              <input
                v-model.number="seats"
                type="number"
                min="3"
                class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              />
            </label>
          </div>

          <div class="rounded-xl bg-indigo-500/10 border border-indigo-400/30 p-4 text-indigo-100 text-sm">
            <p class="font-semibold text-white">How this works</p>
            <ul class="list-disc list-inside space-y-1 text-indigo-100/90">
              <li>Billing is workspace-level; seats = active teammates.</li>
              <li>Only workspace owners can upgrade or manage billing.</li>
              <li>We redirect you to Stripe Checkout; cancel anytime.</li>
            </ul>
          </div>

          <div class="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-2">
            <p class="text-xs uppercase tracking-[0.2em] text-indigo-200/80">Checkout preview</p>
            <p class="text-sm text-indigo-100">
              Plan: <span class="font-semibold text-white">{{ planLabel }}</span> · Seats:
              <span class="font-semibold text-white">{{ seats }}</span>
            </p>
            <p class="text-xs text-indigo-100/75">
              You will be redirected to Stripe Checkout and can cancel anytime.
            </p>
          </div>

          <button
            class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-900/40"
            :disabled="submitting || !workspaceId || !isOwner"
            @click="submit"
          >
            {{ submitting ? 'Redirecting…' : 'Start Checkout' }}
          </button>
          <p v-if="!isOwner" class="text-sm text-amber-200">Only workspace owners can upgrade billing. Ask the owner to open this page.</p>
          <p v-if="error" class="text-sm text-rose-200">{{ error }}</p>
        </div>

        <div
          v-if="showMobileStickyCheckout"
          class="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur sm:hidden"
        >
          <div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] uppercase tracking-[0.22em] text-indigo-200/80">{{ planLabel }}</p>
              <p class="truncate text-sm font-semibold text-white">{{ seats }} seats · Stripe checkout</p>
            </div>
            <button
              class="shrink-0 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              :disabled="submitting || !workspaceId || !isOwner"
              @click="submit"
            >
              {{ submitting ? 'Redirecting…' : 'Checkout' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import AppleSoloPremiumCard from '@/components/AppleSoloPremiumCard.vue'
import { trackEvent } from '@/services/analytics'

const route = useRoute()
const router = useRouter()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const plan = ref('pro')
const seats = ref(3)
const workspaceId = ref('')
const submitting = ref(false)
const error = ref('')
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingSource = computed(() => (
  typeof route.query.source === 'string'
    ? route.query.source.trim().toLowerCase()
    : ''
))
const showHeaderFreePlanFlow = computed(() => billingSource.value === 'header-free-plan')
const isTeamBillingContext = computed(() => (
  billingSource.value === 'pricing-team' ||
  billingSource.value === 'settings-team'
))
const showSoloApplePurchase = computed(() => isAppleBillingSafeMode.value && !isTeamBillingContext.value)
const selectedWorkspace = computed(() => {
  return (
    workspaceStore.workspaces.find((w) => w.id === workspaceId.value) ||
    workspaceStore.activeWorkspace ||
    null
  )
})
const planLabel = computed(() => {
  const current = String(plan.value || 'pro').trim().toLowerCase()
  if (current === 'starter') return 'Starter workspace'
  if (current === 'pro') return 'Pro workspace'
  return current ? `${current.charAt(0).toUpperCase()}${current.slice(1)}` : 'Workspace upgrade'
})
const isOwner = computed(() => {
  const uid = authStore?.user?.uid
  return !!uid && !!selectedWorkspace.value && selectedWorkspace.value.ownerId === uid
})
const showMobileStickyCheckout = computed(() =>
  !isAppleBillingSafeMode.value && !!workspaceId.value && isOwner.value,
)

function trackBillingUpgradeFunnel(step, extra = {}) {
  trackEvent(`subscription_funnel_${step}`, {
    surface: 'billing_upgrade',
    is_apple_billing_mode: !!isAppleBillingSafeMode.value,
    workspace_id: workspaceId.value || null,
    plan: plan.value || null,
    seats: Number(seats.value || 0),
    is_owner: !!isOwner.value,
    ...extra,
  })
}
const appleBillingEyebrow = computed(() => (
  showHeaderFreePlanFlow.value ? 'Solo Premium' : isTeamBillingContext.value ? 'Team billing' : 'Billing'
))
const appleBillingTitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'Upgrade to Solo Premium in the app'
    : isTeamBillingContext.value
      ? 'Team plans are managed on web'
      : 'Manage Solo Premium on iPhone'
))
const appleBillingSubtitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'Solo Premium is available via Apple In-App Purchase at $2.99/month. Paid workspace access still syncs automatically when the account already has it.'
    : isTeamBillingContext.value
      ? 'Team plans are managed by workspace owners on web. This iPhone app does not show team pricing or external checkout.'
      : 'Solo Premium is sold through Apple in this app. Team plans are managed by workspace owners on web.'
))
const appleBillingGuideLabel = computed(() => (
  showHeaderFreePlanFlow.value ? 'How access works' : isTeamBillingContext.value ? 'Team access' : 'What to do next'
))
const appleBillingGuideTitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'Sign in, then buy or restore Solo Premium.'
    : isTeamBillingContext.value
      ? 'Ask the workspace owner to manage the team plan on web.'
      : 'Solo Premium and synced workspace access both resolve through this account.'
))
const appleBillingGuideCopy = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'If you already subscribe through Apple, restore purchases. If your premium access exists elsewhere, sign in with that same account and refresh access.'
    : isTeamBillingContext.value
      ? 'When your account already belongs to a paid workspace, refresh here to sync access. New team purchases and plan changes are handled by workspace owners on web.'
      : 'Buy Solo Premium here with Apple, or refresh when this account already has premium or paid workspace access.'
))
const appleBillingFootnote = computed(() => (
  showSoloApplePurchase.value
    ? 'Solo Premium uses Apple In-App Purchase at $2.99/month. Team plans are managed by workspace owners on web.'
    : 'No team pricing or external payment flow is shown in the iPhone app.'
))
const headerFreePlanSteps = [
  {
    step: 'Step 1',
    title: 'Sign in to your account',
    copy: 'Use the same account you want to unlock with Solo Premium or restore to from Apple.',
  },
  {
    step: 'Step 2',
    title: 'Buy or restore',
    copy: 'Purchase Solo Premium with Apple here, or restore an existing Apple subscription.',
  },
  {
    step: 'Step 3',
    title: 'Refresh synced access',
    copy: 'If this account already has paid workspace access, refresh and it will sync automatically.',
  },
]

onMounted(async () => {
  trackBillingUpgradeFunnel('page_view')
  try {
    if (!workspaceStore.hydrated) await workspaceStore.init()
  } catch {
    /* noop */
  }
  const qsPlan = route.query.plan
  const qsWs = route.query.workspaceId
  if (typeof qsPlan === 'string') plan.value = qsPlan
  if (typeof qsWs === 'string') workspaceId.value = qsWs
  if (workspaceStore?.activeWorkspaceId && !workspaceId.value) {
    workspaceId.value = workspaceStore.activeWorkspaceId
  }
  if (selectedWorkspace.value?.seats) {
    seats.value = selectedWorkspace.value.seats
  } else if (selectedWorkspace.value?.seatsUsed) {
    seats.value = selectedWorkspace.value.seatsUsed
  }
})

watch(
  () => selectedWorkspace.value?.id,
  () => {
    if (selectedWorkspace.value?.seats) seats.value = selectedWorkspace.value.seats
    else if (selectedWorkspace.value?.seatsUsed) seats.value = selectedWorkspace.value.seatsUsed
  },
)

function goBack() {
  try {
    if (window.history.length > 1) {
      router.back()
      return
    }
  } catch {
    /* noop */
  }
  router.push('/dashboard')
}

async function refreshAccess() {
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
  goBack()
}

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    trackBillingUpgradeFunnel('cta_click', { cta: 'workspace_checkout' })
    const { data } = await api.post('/billing/checkout', {
      workspaceId: workspaceId.value,
      plan: plan.value,
      seatCount: seats.value,
    })
    const url = data?.url
    if (url) {
      trackBillingUpgradeFunnel('checkout_redirect', { cta: 'workspace_checkout' })
      window.location.href = url
      return
    }
    ElMessage.error('Checkout could not start (missing URL)')
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Failed to submit upgrade'
  } finally {
    submitting.value = false
  }
}
</script>
