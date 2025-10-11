<template>
  <div class="quick-voice-reminder p-4 rounded-xl bg-slate-800/70 border border-slate-700">
    <div class="flex items-center justify-between gap-3 mb-3">
      <h4 class="font-semibold text-slate-100">{{ label }}</h4>
      <div class="flex items-center gap-2 w-48 sm:w-56">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="Date"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          class="w-full"
        />
        <el-time-picker
          v-model="reminderTime"
          placeholder="HH:mm"
          format="HH:mm"
          value-format="HH:mm"
          class="w-28"
        />
      </div>
    </div>

    <el-input
      v-model="input"
      type="textarea"
      :rows="2"
      placeholder="Speak or type your reminder..."
      resize="none"
      class="mb-3"
    />

    <div class="flex items-center gap-3">
      <VoiceRecorder @transcribed="onTranscribed" />
      <el-button
        type="success"
        :loading="loading"
        :disabled="!input.trim()"
        @click="generateAndSave"
      >
        {{ loading ? 'Generating…' : 'Generate & Save' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { scheduleReminder } from '@/services/reminderService'
import { useAuthStore } from '@/stores/authStore'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { useReminderInput } from '@/composables/useReminderInput'

const props = defineProps({
  label: { type: String, default: 'Quick Reminder' },
  date: { type: String, default: () => toLocalDateKey(new Date()) },
  defaultTime: { type: String, default: '' }, // e.g., '08:00' for Morning, '18:00' for Evening
})
const emit = defineEmits(['saved'])

const input = ref('')
const selectedDate = ref(props.date)
const reminderTime = ref(props.defaultTime)
const loading = ref(false)

watch(() => props.date, (d) => { if (d) selectedDate.value = d })

const { tz, prefillFromAi, toUtcForSchedule } = useReminderInput()
const authStore = useAuthStore()

function onTranscribed(text) {
  input.value = text
}

async function generateAndSave() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    const { tasks: items, reminderTime: aiIso } = await generateTasksFromText(input.value)

    if (aiIso) prefillFromAi(aiIso, selectedDate, reminderTime)
    // apply sensible default time if still empty
    if (!reminderTime.value && props.defaultTime) reminderTime.value = props.defaultTime

    const utcIso = toUtcForSchedule(
      toLocalDateKey(parseLocalDateKey(selectedDate.value)),
      reminderTime.value,
      aiIso
    )

    let savedCount = 0
    for (const title of items) {
      const newTask = {
        title,
        details: '',
        link: '',
        completed: false,
        date: toLocalDateKey(parseLocalDateKey(selectedDate.value)),
        order: 0,
        logs: [],
        reminderTime: reminderTime.value || null,
      }
      const saved = await addTaskToFirebase(newTask)

      const uid = authStore?.user?.uid
      if (uid && saved?.id && utcIso) {
        await scheduleReminder(uid, saved.id, title, utcIso, { timezone: tz })
      }
      savedCount++
    }

    ElNotification({ title: 'Saved', message: `${savedCount} reminder(s) scheduled`, type: 'success', duration: 2000 })
    emit('saved')
    input.value = ''
    // do not clear reminderTime so user can batch quickly
  } catch (e) {
    ElNotification({ title: 'Error', message: 'Could not schedule reminder', type: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!reminderTime.value && props.defaultTime) reminderTime.value = props.defaultTime
})
</script>

<style scoped>
.quick-voice-reminder :deep(.el-input__wrapper) {
  background-color: rgba(255,255,255,0.06);
}
</style>

