<template>
  <section class="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-slate-950/90 to-indigo-950/90 p-6 shadow-xl shadow-slate-950/40">
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-3">
        <p class="text-xs uppercase tracking-[0.28em] text-emerald-200">{{ eyebrow }}</p>
        <h2 class="text-2xl sm:text-3xl font-semibold text-white">{{ title }}</h2>
        <p class="max-w-2xl text-sm sm:text-base text-emerald-50/80">{{ subtitle }}</p>

        <div class="flex flex-wrap items-end gap-3">
          <span class="text-3xl font-bold text-white">{{ productPriceLabel }}</span>
          <span class="text-sm text-emerald-100/75">{{ priceCaption }}</span>
        </div>

        <p class="text-sm text-emerald-100/80">{{ statusCopy }}</p>
      </div>

      <div class="w-full max-w-md space-y-4">
        <div class="rounded-xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Subscription</p>
          <p class="mt-2 text-lg font-semibold text-white">{{ productTitle }}</p>
          <p class="mt-2 text-sm text-emerald-50/75">{{ productDescription }}</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="purchaseDisabled"
            @click="handlePurchase"
          >
            <span v-if="isPurchasing">Processing...</span>
            <span v-else-if="subscriptionSnapshot.plan === 'premium'">Premium active</span>
            <span v-else>{{ purchaseLabel }}</span>
          </button>
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="restoreDisabled"
            @click="handleRestore"
          >
            <span v-if="isRestoring">Restoring...</span>
            <span v-else>Restore Purchases</span>
          </button>
        </div>

        <RouterLink
          v-if="showSignInCta"
          to="/login"
          class="inline-flex items-center justify-center rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/15"
        >
          Sign in to continue
        </RouterLink>

        <p v-if="errorMessage" class="text-sm text-rose-200">{{ errorMessage }}</p>
        <p v-else-if="infoMessage" class="text-sm text-emerald-100/80">{{ infoMessage }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import {
  canUseApplePurchases,
  loadSoloPremiumProduct,
  purchaseSoloPremium,
  restoreSoloPremiumPurchases,
} from '@/services/applePurchaseService'

defineProps({
  eyebrow: {
    type: String,
    default: 'Solo Premium',
  },
  title: {
    type: String,
    default: 'Buy or restore Solo Premium on iPhone',
  },
  subtitle: {
    type: String,
    default: 'Apple handles Solo Premium billing in the iOS app. Team plans are managed by workspace owners on web.',
  },
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()

const product = ref(null)
const productLoading = ref(false)
const action = ref('')
const infoMessage = ref('')
const errorMessage = ref('')

const subscriptionSnapshot = computed(() => {
  const current = subStore.subscription
  return current?.value || current || {}
})
const isGuest = computed(() => (
  authStore.isGuest === true ||
  authStore.guest === true ||
  authStore.user?.mode === 'guest'
))
const isPurchasing = computed(() => action.value === 'purchase')
const isRestoring = computed(() => action.value === 'restore')
const hasApplePremium = computed(() => (
  subscriptionSnapshot.value?.plan === 'premium' &&
  subscriptionSnapshot.value?.source === 'apple'
))
const hasExternalPremium = computed(() => (
  subscriptionSnapshot.value?.plan === 'premium' &&
  !!subscriptionSnapshot.value?.source &&
  subscriptionSnapshot.value?.source !== 'apple'
))
const purchaseDisabled = computed(() => (
  productLoading.value ||
  isPurchasing.value ||
  isRestoring.value ||
  !product.value ||
  subscriptionSnapshot.value?.plan === 'premium'
))
const restoreDisabled = computed(() => (
  productLoading.value ||
  isPurchasing.value ||
  isRestoring.value ||
  !canUseApplePurchases()
))
const showSignInCta = computed(() => !authStore.user?.uid || isGuest.value)
const purchaseLabel = computed(() => (
  product.value?.displayPrice
    ? `Subscribe for ${product.value.displayPrice}`
    : 'Subscribe with Apple'
))
const productPriceLabel = computed(() => (
  product.value?.displayPrice ? `${product.value.displayPrice} / month` : '$2.99 / month'
))
const priceCaption = computed(() => (
  product.value?.displayPrice ? 'Apple In-App Purchase · auto-renewable monthly subscription' : 'Apple In-App Purchase'
))
const productTitle = computed(() => product.value?.title || 'Solo Premium')
const productDescription = computed(() => (
  product.value?.description ||
  'Unlimited AI insights, reminders, integrations, and priority support for your personal account.'
))
const statusCopy = computed(() => {
  const expiresAt = formatDate(subscriptionSnapshot.value?.expiresAt)
  if (hasApplePremium.value) {
    return expiresAt
      ? `Apple subscription active through ${expiresAt}.`
      : 'Apple subscription active on this account.'
  }
  if (hasExternalPremium.value) {
    return 'This account already has premium from another billing source. Refresh access to sync the current entitlement on iPhone.'
  }
  return 'Solo Premium unlocks unlimited AI, reminders, integrations, and priority support for this account.'
})

function formatDate(value) {
  if (!value) return ''
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}

async function refreshPremiumState(uid) {
  await Promise.all([
    accessStore.fetchAccess(uid, { force: true, minIntervalMs: 0 }),
    subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 }),
  ])
}

async function ensureSignedIn() {
  if (authStore.user?.uid && !isGuest.value) return authStore.user.uid

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const redirect = route.fullPath || '/billing/upgrade'
      window.localStorage.setItem('postLoginRedirect', redirect)
    }
  } catch {
    // noop
  }

  ElMessage.info('Sign in to continue with Solo Premium.')
  await router.push('/login')
  return null
}

async function fetchProduct() {
  if (!canUseApplePurchases()) {
    infoMessage.value = 'Apple in-app purchases are only available in the iOS app.'
    return
  }

  productLoading.value = true
  errorMessage.value = ''
  try {
    product.value = await loadSoloPremiumProduct()
    if (!product.value) {
      infoMessage.value = 'Solo Premium is not available to purchase on this device yet.'
    }
  } catch (error) {
    errorMessage.value = error?.message || 'Failed to load Solo Premium.'
  } finally {
    productLoading.value = false
  }
}

async function handlePurchase() {
  const uid = await ensureSignedIn()
  if (!uid) return

  action.value = 'purchase'
  errorMessage.value = ''
  infoMessage.value = ''
  try {
    const result = await purchaseSoloPremium({ userId: uid })
    await refreshPremiumState(uid)
    const expiresAt = formatDate(result?.ingestResult?.subscription?.expiresAt || result?.transaction?.expiresAt)
    infoMessage.value = expiresAt
      ? `Solo Premium is active through ${expiresAt}.`
      : 'Solo Premium is active on this account.'
    ElNotification({
      title: 'Solo Premium active',
      message: infoMessage.value,
      type: 'success',
      duration: 3200,
      offset: 80,
    })
  } catch (error) {
    if (error?.code === 'purchase_cancelled') {
      infoMessage.value = 'Purchase cancelled. You can try again anytime.'
      ElMessage.info(infoMessage.value)
    } else {
      errorMessage.value = error?.message || 'Solo Premium purchase failed.'
      ElMessage.error(errorMessage.value)
    }
  } finally {
    action.value = ''
  }
}

async function handleRestore() {
  const uid = await ensureSignedIn()
  if (!uid) return

  action.value = 'restore'
  errorMessage.value = ''
  infoMessage.value = ''
  try {
    const result = await restoreSoloPremiumPurchases({ userId: uid })
    if (!result?.restored) {
      infoMessage.value = 'No active Solo Premium purchase was found to restore.'
      ElMessage.info(infoMessage.value)
      return
    }

    await refreshPremiumState(uid)
    const expiresAt = formatDate(result?.ingestResult?.subscription?.expiresAt || result?.transaction?.expiresAt)
    infoMessage.value = expiresAt
      ? `Restored Solo Premium through ${expiresAt}.`
      : 'Restored Solo Premium on this account.'
    ElNotification({
      title: 'Purchases restored',
      message: infoMessage.value,
      type: 'success',
      duration: 3200,
      offset: 80,
    })
  } catch (error) {
    errorMessage.value = error?.message || 'Restore purchases failed.'
    ElMessage.error(errorMessage.value)
  } finally {
    action.value = ''
  }
}

onMounted(() => {
  fetchProduct()
})
</script>
