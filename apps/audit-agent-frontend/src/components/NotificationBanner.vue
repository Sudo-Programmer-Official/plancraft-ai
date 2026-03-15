<template>
  <el-dialog
    v-model="open"
    title="🔔 Enable Notifications"
    width="420px"
    align-center
    class="notif-dialog"
    :show-close="false"
  >
    <div class="content space-y-4 text-center">
      <p class="text-slate-300 leading-relaxed">
        Get reminders and updates directly on this device.  
        Allow notifications to never miss an alert again ✨
      </p>

      <div v-if="permission === 'denied'" class="text-red-400 text-sm">
        You’ve blocked notifications — enable them in your browser settings.
      </div>

      <div class="actions flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <el-button
          type="primary"
          class="btn-enable"
          :loading="loading"
          @click="enable"
        >
          {{ loading ? 'Enabling…' : 'Enable Notifications' }}
        </el-button>
        <el-button class="btn-dismiss" @click="dismiss">Maybe Later</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { isPushSupported, ensurePermission, hasSubscription, registerPushSubscription } from '@/services/pushService'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const props = defineProps({ userId: String })
const open = ref(false)
const loading = ref(false)
const permission = ref(
  typeof globalThis !== 'undefined' && typeof globalThis.Notification !== 'undefined'
    ? globalThis.Notification.permission
    : 'default'
)

function dismiss() {
  open.value = false
  localStorage.setItem('notifDismissed', '1')
}

async function enable() {
  if (isNativePackagedApp()) return
  if (!props.userId) return
  loading.value = true
  try {
    const granted = await ensurePermission()
    if (!granted) return
    await registerPushSubscription(props.userId)
    open.value = false
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (isNativePackagedApp()) return
  if (localStorage.getItem('notifDismissed')) return
  const supported = isPushSupported()
  const subscribed = await hasSubscription()
  permission.value =
    typeof globalThis !== 'undefined' && typeof globalThis.Notification !== 'undefined'
      ? globalThis.Notification.permission
      : 'default'
  if (supported && !subscribed && permission.value !== 'granted') {
    open.value = true
  }
})
</script>

<style scoped>
.notif-dialog :deep(.el-dialog) {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  border-radius: 1rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  color: #f1f5f9;
}
.notif-dialog :deep(.el-dialog__header) {
  color: #c7d2fe;
  font-weight: 600;
  text-align: center;
}
.btn-enable {
  background: linear-gradient(to right, #6366f1, #7c3aed);
  border: none;
  color: white;
  font-weight: 500;
}
.btn-enable:hover {
  background: linear-gradient(to right, #4f46e5, #6d28d9);
}
.btn-dismiss {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
