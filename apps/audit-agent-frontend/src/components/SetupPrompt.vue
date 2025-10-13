<template>
  <el-dialog
    v-model="open"
    class="setup-prompt"
    width="520px"
    :close-on-click-modal="false"
    :show-close="true"
     :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
  >
    <!-- Header -->
    <template #header>
      <div class="text-center">
        <h2 class="text-2xl font-bold text-white mb-1">✨ Quick Setup</h2>
        <p class="text-indigo-200 text-sm leading-snug">
          Let’s sync your reminders and timezone for smoother, timely notifications.
          <br />
          <span class="text-slate-400">We only send notifications for your own work — never anything else.</span>
        </p>
      </div>
    </template>

    <!-- Steps -->
    <div class="space-y-5 mt-5">
      <!-- Browser Notifications -->
      <div
        class="rounded-xl p-5 bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-400/20 backdrop-blur-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-white flex items-center gap-2">
              🔔 <span>Browser Notifications</span>
            </div>
            <p class="text-xs text-slate-400 mt-1 leading-snug">
              Allow PlanCraftAI to send reminders directly on your device.
            </p>
          </div>
          <el-button
            size="small"
            type="primary"
            class="!rounded-lg font-semibold"
            @click="enablePush"
            :loading="loadingPush"
            :disabled="permGranted"
          >
            {{ permGranted ? 'Enabled ✓' : 'Enable' }}
          </el-button>
        </div>
        <p v-if="pushError" class="text-xs text-red-400 mt-2">{{ pushError }}</p>
      </div>

      <!-- Timezone -->
      <div
        class="rounded-xl p-5 bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-400/20 backdrop-blur-lg shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-white flex items-center gap-2">
              🌎 <span>Timezone</span>
            </div>
            <p class="text-xs text-slate-400 mt-1 leading-snug">
              Detected: <span class="text-indigo-300 font-medium">{{ tz }}</span>
            </p>
          </div>
          <el-button
            size="small"
            class="!rounded-lg font-semibold"
            @click="storeTz"
            type="default"
          >
            Confirm
          </el-button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full mt-4">
        <span class="text-xs text-slate-400 text-center sm:text-left">
          You can change this anytime later in
          <RouterLink
            to="/settings?tab=notifications"
            class="text-indigo-300 hover:text-indigo-200 underline"
            >Settings → Notifications</RouterLink
          >.
        </span>
        <div class="flex gap-2">
          <el-button @click="dismiss" class="!rounded-lg">Skip</el-button>
          <el-button type="primary" @click="finish" class="!rounded-lg font-semibold">
            Done
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { hasSubscription, registerPushSubscription } from '@/services/pushService'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({ open: { type: Boolean, default: true } })
const emit = defineEmits(['close', 'done'])

const open = ref(props.open)
const loadingPush = ref(false)
const permGranted = ref(false)
const pushError = ref('')
const tz = ref('UTC')

onMounted(async () => {
  // Skip if already done
  const done = localStorage.getItem('pcai_setup_done')
  if (done === '1') {
    open.value = false
    return
  }

  try {
    tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    tz.value = 'UTC'
  }
  try {
    permGranted.value = (typeof Notification !== 'undefined' && Notification.permission === 'granted')
  } catch {}
})

async function enablePush() {
  try {
    loadingPush.value = true
    pushError.value = ''
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission()
      permGranted.value = perm === 'granted'
    }
    const uid = useAuthStore()?.user?.uid || localStorage.getItem('uid')
    if (uid && !(await hasSubscription())) {
      await registerPushSubscription(String(uid))
    }
  } catch (e) {
    pushError.value = e?.message || 'Failed to enable push notifications.'
  } finally {
    loadingPush.value = false
  }
}

function storeTz() {
  try {
    localStorage.setItem('user_timezone', tz.value)
  } catch {}
}

function finish() {
  try {
    localStorage.setItem('pcai_setup_done', '1')
  } catch {}
  open.value = false
  emit('done')
}

function dismiss() {
  open.value = false
  emit('close')
}
</script>

<style scoped>
/* Smooth, dark glass theme matching PlanCraftAI dashboard */
.setup-prompt :deep(.el-dialog) {
  background: radial-gradient(circle at top left, #1e1b4b 0%, #312e81 45%, #4c1d95 100%);
  color: #e2e8f0;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(14px);
  animation: fadeIn 0.35s ease-out;
}

/* Remove default white backgrounds */
.setup-prompt :deep(.el-dialog__header),
.setup-prompt :deep(.el-dialog__footer) {
  background: transparent;
  border: none;
}

/* Smooth hover glow for consistency */
.el-button--primary:hover {
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.45);
  transition: all 0.25s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>