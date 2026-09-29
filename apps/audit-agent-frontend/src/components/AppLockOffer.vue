<template>
  <PcSheet :open="open" :title="`Use ${appLock.label} for faster access?`" @update:open="(value) => !value && dismiss()">
    <div class="lock-offer">
      <ShieldCheck :size="28" class="lock-offer__icon" aria-hidden="true" />
      <p class="lock-offer__text">
        Open PlanCraftAI with {{ appLock.label }} instead of signing in. Your face or fingerprint never leaves your phone.
      </p>
      <p v-if="errorMessage" class="lock-offer__error" role="alert">{{ errorMessage }}</p>
      <p class="lock-offer__note">You can change this anytime in Settings → Profile.</p>
    </div>
    <template #footer>
      <div class="lock-offer__actions">
        <PcButton variant="primary" size="lg" block :loading="busy" @click="enable">Turn on {{ appLock.label }}</PcButton>
        <PcButton variant="ghost" block :disabled="busy" @click="dismiss">Not now</PcButton>
      </div>
    </template>
  </PcSheet>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppLockStore } from '@/stores/appLockStore'
import { useAuthStore } from '@/stores/authStore'
import { markAppLockOffered, wasAppLockOffered } from '@/services/appLockService'
import { ShieldCheck } from 'lucide-vue-next'
import { PcButton, PcSheet } from '@/design'

const OFFER_DELAY_MS = 4000

const appLock = useAppLockStore()
const authStore = useAuthStore()
const route = useRoute()
const open = ref(false)
const busy = ref(false)
const errorMessage = ref('')
let timer = null

// Never stack on the profile dialog, Quick Setup, AI consent, or the tour.
function anotherOverlayOpen() {
  return [...document.querySelectorAll('.el-overlay, [aria-modal="true"]')].some((el) => {
    const style = getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0
  })
}

function eligibleUid() {
  const uid = authStore.user?.uid
  const isGuest = authStore.guest === true || authStore.user?.mode === 'guest'
  if (!uid || isGuest || authStore.bootstrapping) return null
  if (!appLock.supported || appLock.enabled || appLock.locked) return null
  if (wasAppLockOffered(uid)) return null
  return uid
}

function scheduleOffer() {
  if (timer) clearTimeout(timer)
  if (open.value || !eligibleUid()) return
  timer = setTimeout(() => {
    timer = null
    if (!eligibleUid() || anotherOverlayOpen()) return
    open.value = true
  }, OFFER_DELAY_MS)
}

watch(
  () => [authStore.user?.uid, route.fullPath, appLock.available],
  scheduleOffer,
  { immediate: true },
)

async function enable() {
  const uid = authStore.user?.uid
  busy.value = true
  errorMessage.value = ''
  try {
    await appLock.enable(uid)
    markAppLockOffered(uid)
    open.value = false
    ElMessage.success(`${appLock.label} is on`)
  } catch (err) {
    if (err?.kind !== 'cancelled') errorMessage.value = err?.message || 'Something went wrong. Try again.'
  } finally {
    busy.value = false
  }
}

function dismiss() {
  const uid = authStore.user?.uid
  if (uid) markAppLockOffered(uid)
  open.value = false
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.lock-offer {
  display: grid;
  gap: var(--pc-space-3);
}

.lock-offer__icon {
  color: var(--pc-accent-text);
}

.lock-offer__text {
  margin: 0;
  line-height: 1.5;
}

.lock-offer__error {
  margin: 0;
  color: var(--pc-danger);
  font-size: var(--pc-text-small);
}

.lock-offer__note {
  margin: 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.lock-offer__actions {
  display: grid;
  gap: var(--pc-space-2);
}
</style>
