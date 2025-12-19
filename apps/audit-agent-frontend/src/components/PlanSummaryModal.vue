<template>
  <el-dialog
    v-model="internalOpen"
    title="Plan Summary"
    :width="dialogWidth"
    class="plan-summary-dialog"
    :style="dialogStyle"
    @close="onClose"
  >
    <div class="space-y-4 text-slate-100">
      <p class="text-sm sm:text-base">
        <strong class="text-indigo-100">Current plan:</strong>
        <span class="ml-1 text-slate-50">{{ planLabel }}</span>
      </p>

      <div>
        <p class="font-medium text-slate-50">Usage today</p>
        <ul class="text-sm text-slate-200 space-y-1">
          <li>AI generations: {{ usage.today.aiGenerations }} / {{ planKey === 'PREMIUM' ? '∞' : limits.aiGenerations }}</li>
          <li>Reminders: {{ usage.today.reminders }} / {{ planKey === 'PREMIUM' ? '∞' : limits.remindersPerDay }}</li>
        </ul>
      </div>

      <div class="pt-2">
        <router-link
          v-if="planKey !== 'PREMIUM'"
          to="/subscription"
          @click="track"
          class="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition font-medium"
        >
          🚀 Upgrade to Pro
        </router-link>
        <span
          v-else
          class="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-sm shadow-sm"
        >
          🧠 You're on Pro
        </span>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { trackLinkedInConversion } from '@/utils/ads'
import { useAuthStore } from '@/stores/authStore'
import { PLANS, resolvePlanKey } from '@/services/planService'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const dialogStyle = Object.freeze({
  background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
  color: '#e2e8f0',
  borderRadius: '0.5rem',
  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
})

const internalOpen = ref(props.open)
watch(() => props.open, v => internalOpen.value = v)

const authStore = useAuthStore()
const usage = computed(() => authStore.user?.usage || { today: { aiGenerations: 0, reminders: 0 } })

const planKey = computed(() => resolvePlanKey(authStore.user))
const planLabel = computed(() => {
  const raw = authStore.user?.plan || planKey.value
  const cleaned = String(raw || '').replace(/[_-]+/g, ' ').trim()
  if (!cleaned) return planKey.value
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})
const dialogWidth = ref(window.innerWidth < 640 ? '90%' : '420px')


const limits = computed(() => ({
  aiGenerations: PLANS[planKey.value].limits.aiGenerations,
  remindersPerDay: PLANS[planKey.value].limits.remindersPerDay,
}))

function onClose() {
  emit('close')
}

function track() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
}
</script>

<style scoped>
.plan-summary-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.plan-summary-dialog :deep(.el-dialog__title) {
  color: #e2e8f0;
  letter-spacing: 0.03em;
  font-weight: 700;
}

.plan-summary-dialog :deep(.el-dialog__body) {
  background: transparent;
}
</style>
