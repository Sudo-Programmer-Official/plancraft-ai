<template>
  <el-dialog
    :model-value="open"
    width="min(560px, calc(100vw - 2rem))"
    class="feature-limit-dialog"
    @close="$emit('close')"
  >
    <div class="space-y-5 text-slate-100">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-[0.32em] text-indigo-300/80">{{ planLabel }}</p>
        <h2 class="text-2xl font-semibold text-white">
          {{ isAppleBillingSafeMode ? 'Upgrade to Solo Premium' : 'Upgrade to continue' }}
        </h2>
        <p v-if="isAppleBillingSafeMode" class="text-sm text-indigo-100/85">
          You’ve reached your free limit ({{ limitText }} {{ featureLabel }}). Solo Premium is
          available in the iPhone app with Apple In-App Purchase. Team plans are managed by workspace
          owners on web, and existing paid workspace access can be refreshed here.
        </p>
        <template v-else>
          <p class="text-sm text-indigo-100/85">
            You’ve reached your free limit ({{ limitText }} {{ featureLabel }}).
            Upgrade your account on {{ billingWebHost }} to continue.
          </p>
          <p class="text-sm text-indigo-100/75">
            Your data is safe and will sync after you upgrade.
          </p>
        </template>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.22em] text-indigo-200/80">Usage</p>
        <p class="mt-2 text-lg font-semibold text-white">{{ used }} / {{ limitText }} used</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          @click="handlePrimaryAction"
        >
          {{ primaryActionLabel }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          :disabled="refreshing"
          @click="handleRefresh"
        >
          {{ refreshing ? 'Refreshing…' : "I've upgraded · Refresh" }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-transparent px-4 py-2.5 text-sm text-indigo-100/80 transition hover:bg-white/5 hover:text-white"
          @click="$emit('close')"
        >
          Maybe later
        </button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { BILLING_WEB_HOST, isAppleBillingSafeMode as detectAppleBillingSafeMode } from '@/utils/billingAccess'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { EVENTS, trackEvent } from '@/services/analytics'

const props = defineProps({
  open: { type: Boolean, default: false },
  featureLabel: { type: String, default: 'items' },
  used: { type: Number, default: 0 },
  limit: { type: Number, default: 0 },
  planLabel: { type: String, default: 'Free plan' },
})

const emit = defineEmits(['close', 'refreshed'])

const router = useRouter()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const subStore = useSubscriptionStore()
const refreshing = ref(false)
const isAppleBillingSafeMode = detectAppleBillingSafeMode()
const billingWebHost = BILLING_WEB_HOST
const limitText = computed(() => (props.limit > 0 ? String(props.limit) : '0'))
const primaryActionLabel = computed(() => (
  isAppleBillingSafeMode ? 'Upgrade to Solo Premium' : 'Learn about Premium'
))

watch(
  () => props.open,
  (open) => {
    if (open) {
      trackEvent(EVENTS.PAYWALL_VIEWED, {
        surface: 'feature_limit',
        feature: props.featureLabel,
        used: props.used,
        limit: props.limit,
      })
    }
  },
  { immediate: true },
)

async function handlePrimaryAction() {
  trackEvent(EVENTS.UPGRADE_CLICKED, { surface: 'feature_limit', feature: props.featureLabel })
  emit('close')
  await router.push(isAppleBillingSafeMode ? '/billing/upgrade' : '/subscription')
}

async function handleRefresh() {
  refreshing.value = true
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      await accessStore.fetchAccess(uid, { force: true, minIntervalMs: 0 })
      await subStore.fetchStatus(uid, { force: true, minIntervalMs: 0 })
    }
    emit('refreshed')
    ElMessage.success('Account access refreshed')
  } catch (err) {
    ElMessage.error(err?.message || 'Unable to refresh access')
  } finally {
    refreshing.value = false
  }
}
</script>

<style scoped>
.feature-limit-dialog :deep(.el-dialog) {
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(160deg, rgba(30, 27, 75, 0.96), rgba(49, 46, 129, 0.92), rgba(30, 41, 59, 0.96));
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(18px);
}

.feature-limit-dialog :deep(.el-dialog__header) {
  display: none;
}

.feature-limit-dialog :deep(.el-dialog__body) {
  padding: 1.5rem;
}
</style>
