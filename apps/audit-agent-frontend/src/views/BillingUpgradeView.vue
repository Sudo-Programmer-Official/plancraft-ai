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
            v-else
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

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="px-5 py-3 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-100 transition"
              @click="openBillingWebsite"
            >
              Upgrade to Premium
            </button>
            <button
              type="button"
              class="px-5 py-3 rounded-xl border border-white/15 bg-slate-900/70 text-white font-semibold hover:border-indigo-300/40 hover:bg-slate-900 transition"
              @click="refreshAccess"
            >
              I've upgraded · Refresh
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
            Opens secure web checkout in your browser. After you upgrade, come back here and refresh.
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

        <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4 shadow-xl">
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

          <button
            class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-900/40"
            :disabled="submitting || !workspaceId || !isOwner"
            @click="submit"
          >
            {{ submitting ? 'Redirecting…' : 'Start Checkout' }}
          </button>
          <p v-if="!isOwner" class="text-sm text-amber-200">Only workspace owners can upgrade billing.</p>
          <p v-if="error" class="text-sm text-rose-200">{{ error }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { copyText, openExternalUrl } from '@/utils/nativeUi'
import { BILLING_WEB_HOST, BILLING_WEB_URL, isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'

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
const billingWebHost = BILLING_WEB_HOST
const billingWebUrl = BILLING_WEB_URL
const isAppleBillingSafeMode = computed(() => detectAppleBillingSafeMode())
const billingSource = computed(() => (
  typeof route.query.source === 'string'
    ? route.query.source.trim().toLowerCase()
    : ''
))
const showHeaderFreePlanFlow = computed(() => billingSource.value === 'header-free-plan')
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
const appleBillingEyebrow = computed(() => (
  showHeaderFreePlanFlow.value ? 'Free plan' : 'Billing'
))
const appleBillingTitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'You are on the Free Plan'
    : 'Premium features available via your account'
))
const appleBillingSubtitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'When you are ready, upgrade on our website. Your app data stays safe and your access will sync back here.'
    : 'Upgrade your experience on our website. Your account stays in sync with the app.'
))
const appleBillingGuideLabel = computed(() => (
  showHeaderFreePlanFlow.value ? 'How web upgrade works' : 'What to do next'
))
const appleBillingGuideTitle = computed(() => (
  showHeaderFreePlanFlow.value
    ? `Open ${billingWebHost} in Safari when you want to upgrade.`
    : `Open ${billingWebHost} in Safari to upgrade or manage billing.`
))
const appleBillingGuideCopy = computed(() => (
  showHeaderFreePlanFlow.value
    ? 'Billing happens on the web, not inside the mobile app. Once you upgrade there, come back here and refresh to unlock premium access.'
    : 'Your data is safe and will sync automatically after you upgrade. Once you come back here, refresh and your premium access will be ready.'
))
const headerFreePlanSteps = [
  {
    step: 'Step 1',
    title: 'Open the website',
    copy: 'We will take you to the PlanCraftAI website in Safari when you are ready.',
  },
  {
    step: 'Step 2',
    title: 'Upgrade there',
    copy: 'Sign in with the same account and manage premium access securely on the web.',
  },
  {
    step: 'Step 3',
    title: 'Come back here',
    copy: 'Tap refresh in the app and your upgraded access will sync automatically.',
  },
]

onMounted(async () => {
  try {
    if (!workspaceStore.hydrated) await workspaceStore.init()
  } catch {}
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

async function openBillingWebsite() {
  const opened = openExternalUrl(billingWebUrl)
  if (opened) return
  const copied = await copyText(billingWebUrl)
  if (copied) {
    ElMessage.success(`${billingWebUrl} copied`)
    return
  }
  ElMessage.info(`Visit ${billingWebHost}`)
}

function goBack() {
  try {
    if (window.history.length > 1) {
      router.back()
      return
    }
  } catch {}
  router.push('/dashboard')
}

async function refreshAccess() {
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
  goBack()
}

async function submit() {
  submitting.value = true
  error.value = ''
  try {
    const { data } = await api.post('/billing/checkout', {
      workspaceId: workspaceId.value,
      plan: plan.value,
      seatCount: seats.value,
    })
    const url = data?.url
    if (url) {
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
