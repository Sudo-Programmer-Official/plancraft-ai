<template>
  <PcReminderBanner
    v-if="reminder"
    v-model:open="open"
    :title="reminder.title"
    :detail="reminder.detail"
    :can-focus="!!reminder.taskId"
    :snoozing="snoozing"
    @focus="startFocus"
    @snooze="snooze"
  />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import PcReminderBanner from '@/design/components/PcReminderBanner.vue'
import { useTasks } from '@/composables/useTasks'
import { useAuthStore } from '@/stores/authStore'
import { useFocusStore } from '@/stores/focusStore'
import { snoozeReminder } from '@/services/reminderService'
import { trackEvent } from '@/services/analytics'

// Shows a fired reminder in-app when PlanCraft is open: native push arrives as
// `native-push-received`, web push via the service worker (public/sw-push.js).
const AUTO_HIDE_MS = 60 * 1000

const { allTasks, tasks } = useTasks()
const authStore = useAuthStore()
const focus = useFocusStore()

const reminder = ref(null)
const open = ref(false)
const snoozing = ref(false)
let hideTimer = null

function findTask(taskId) {
  if (!taskId) return null
  return [...(allTasks.value || []), ...(tasks.value || [])].find((t) => t.id === taskId) || null
}

// Backend body: "⏰ Reminder: <task> (<when>)[. extras]".
function parseBody(body = '') {
  const match = String(body).match(/Reminder:\s*(.+?)\s*\(([^)]+)\)/)
  return match ? { title: match[1], when: match[2] } : { title: String(body).replace(/^⏰\s*/, ''), when: '' }
}

function show({ title, body, data }) {
  const type = String(data?.type || '').toLowerCase().replace(/_/g, '-')
  if (type !== 'reminder-due' || !authStore.user?.uid) return
  // A focus session is the one thing on screen; don't interrupt it.
  if (focus.isOpen) return

  const task = findTask(data?.taskId)
  const parsed = parseBody(body)
  const when = task?.reminderTime ? formatHHMM(task.reminderTime) : parsed.when
  reminder.value = {
    taskId: data?.taskId || null,
    reminderId: data?.reminderId || null,
    title: task?.title || parsed.title || title || 'Reminder',
    detail: [when, task?.category].filter(Boolean).join(' · '),
  }
  open.value = true
  trackEvent('reminder_banner_shown', { has_task: !!reminder.value.taskId })
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (open.value = false), AUTO_HIDE_MS)
}

function formatHHMM(value) {
  const [h, m] = String(value).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return String(value)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function startFocus() {
  const r = reminder.value
  if (!r?.taskId) return
  const task = findTask(r.taskId) || { id: r.taskId, title: r.title }
  open.value = false
  focus.open(task, authStore.user?.uid)
  trackEvent('reminder_banner_action', { action: 'focus' })
}

async function snooze() {
  const r = reminder.value
  if (!r || snoozing.value) return
  snoozing.value = true
  try {
    const res = await snoozeReminder({
      userId: authStore.user?.uid,
      taskId: r.taskId,
      reminderId: r.reminderId,
      text: r.title,
      minutes: 10,
    })
    if (res?.ok === false) throw new Error(res.error || 'failed')
    open.value = false
    ElMessage.success('Snoozed for 10 minutes')
    trackEvent('reminder_banner_action', { action: 'snooze' })
  } catch {
    ElMessage.error('Could not snooze this reminder. Please try again.')
  } finally {
    snoozing.value = false
  }
}

function onNativePush(event) {
  const n = event?.detail || {}
  show({ title: n.title, body: n.body, data: n.data || {} })
}

function onServiceWorkerMessage(event) {
  if (event?.data?.type === 'pc-push-received') show(event.data)
}

watch(open, (value) => {
  if (!value) clearTimeout(hideTimer)
})

onMounted(() => {
  window.addEventListener('native-push-received', onNativePush)
  navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage)
})

onBeforeUnmount(() => {
  clearTimeout(hideTimer)
  window.removeEventListener('native-push-received', onNativePush)
  navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage)
})
</script>
