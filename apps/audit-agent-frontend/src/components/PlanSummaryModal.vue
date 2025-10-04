<template>
  <el-dialog v-model="internalOpen" title="Plan Summary" width="480px" @close="onClose">
    <div class="space-y-3">
      <p><strong>Current plan:</strong> {{ (authStore.user?.plan || 'free').toUpperCase() }}</p>
      <div>
        <p class="font-medium">Usage today</p>
        <ul class="text-sm text-slate-600">
          <li>AI generations: {{ usage.today.aiGenerations }} / {{ planKey==='PREMIUM' ? '∞' : limits.aiGenerations }}</li>
          <li>Reminders: {{ usage.today.reminders }} / {{ planKey==='PREMIUM' ? '∞' : limits.remindersPerDay }}</li>
        </ul>
      </div>
      <div class="pt-2">
        <router-link to="/subscription" class="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Upgrade to Pro</router-link>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { PLANS } from '@/services/planService'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
const internalOpen = ref(props.open)
watch(() => props.open, v => internalOpen.value = v)

const authStore = useAuthStore()
const usage = computed(() => authStore.user?.usage || { today: { aiGenerations: 0, reminders: 0 } })
const planKey = computed(() => (String(authStore.user?.plan || 'free').toLowerCase() === 'premium' ? 'PREMIUM' : 'FREE'))
const limits = computed(() => ({
  aiGenerations: PLANS[planKey.value].limits.aiGenerations,
  remindersPerDay: PLANS[planKey.value].limits.remindersPerDay,
}))

function onClose() { emit('close') }
</script>

<style scoped>
</style>

