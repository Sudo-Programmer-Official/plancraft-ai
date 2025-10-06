<template>
  <el-dialog v-model="internalOpen" title="Plan Summary" :width="dialogWidth" @close="onClose">
    <div class="space-y-4 text-slate-800">
      <p><strong>Current plan:</strong> {{ planKey }}</p>

      <div>
        <p class="font-medium">Usage today</p>
        <ul class="text-sm text-slate-600">
          <li>AI generations: {{ usage.today.aiGenerations }} / {{ planKey === 'PREMIUM' ? '∞' : limits.aiGenerations }}</li>
          <li>Reminders: {{ usage.today.reminders }} / {{ planKey === 'PREMIUM' ? '∞' : limits.remindersPerDay }}</li>
        </ul>
      </div>

      <div class="pt-2">
        <button
          v-if="planKey !== 'PREMIUM'"
          @click="upgradeFromModal"
          class="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition font-medium"
        >
          🚀 Upgrade to Pro
        </button>
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
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { redirectToUpgradeIntent } from '@/services/upgradeIntent'
import { PLANS } from '@/services/planService'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const internalOpen = ref(props.open)
watch(() => props.open, v => internalOpen.value = v)

const authStore = useAuthStore()
const usage = computed(() => authStore.user?.usage || { today: { aiGenerations: 0, reminders: 0 } })

const planKey = computed(() =>
  String(authStore.user?.plan || '').toLowerCase() === 'premium' ? 'PREMIUM' : 'FREE'
)
const dialogWidth = ref(window.innerWidth < 640 ? '90%' : '420px')


const limits = computed(() => ({
  aiGenerations: PLANS[planKey.value].limits.aiGenerations,
  remindersPerDay: PLANS[planKey.value].limits.remindersPerDay,
}))

function onClose() {
  emit('close')
}

const router = useRouter()
function upgradeFromModal() {
  try {
    const user = authStore?.user
    if (!user?.uid || authStore.isGuest) {
      redirectToUpgradeIntent('plan-summary')
      emit('close')
      return router.push('/login')
    }
    emit('close')
    router.push('/subscription?upgrade=1')
  } catch {
    emit('close')
    router.push('/subscription')
  }
}
</script>

<style scoped>

</style>
