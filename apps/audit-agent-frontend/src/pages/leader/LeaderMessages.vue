<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Schedule Messages</h1>
        <p class="text-slate-400 text-sm">Send wishes, outreach, or reminders via WhatsApp, SMS, or voice.</p>
      </div>
    </header>

    <div class="grid lg:grid-cols-3 gap-4">
      <section class="lg:col-span-2 space-y-4">
        <RecipientSelector
          @update:contacts="(v) => state.recipients = v"
          @update:groups="(v) => state.groups = v"
          @update:count="(v) => state.count = v"
        />

        <MessageTemplateSelector v-model="state.message" />

        <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-200">AI generate message</h3>
            <span class="text-xs text-slate-500">Powered by PlanCraft backend</span>
          </div>
          <textarea
            v-model="state.prompt"
            rows="2"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
            placeholder="Add a quick prompt, e.g. Congratulate the community group on the clean-up drive."
          />
          <div class="flex gap-2">
            <button
              class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
              :disabled="aiLoading"
              @click="generateAiMessage"
            >
              {{ aiLoading ? 'Generating…' : 'AI generate' }}
            </button>
            <button
              class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
              :disabled="templateSaving"
              @click="saveTemplate"
            >
              {{ templateSaving ? 'Saving…' : 'Save as template' }}
            </button>
          </div>
        </div>

        <VoiceMessagePanel v-model:audioUrl="state.audioUrl" />

        <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="space-y-1 text-sm text-slate-200">
              Channel
              <select v-model="state.channel" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="voice_call">Voice Call</option>
              </select>
            </label>
            <label class="space-y-1 text-sm text-slate-200">
              Mode
              <select v-model="state.mode" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm">
                <option value="text">Text only</option>
                <option value="voice">Voice only</option>
                <option value="text_and_voice">Text + Voice</option>
              </select>
            </label>
          </div>
          <ScheduleSelector v-model="state.scheduleAt" />
        </div>

        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-50"
            :disabled="saving"
            @click="submit"
          >
            {{ saving ? 'Scheduling…' : 'Schedule' }}
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
            @click="reset"
          >
            Reset
          </button>
        </div>
      </section>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <h3 class="text-lg font-semibold">Summary</h3>
        <p class="text-sm text-slate-300">Recipients: {{ state.count }}</p>
        <p class="text-sm text-slate-300">Channel: {{ state.channel }}</p>
        <p class="text-sm text-slate-300">Mode: {{ state.mode }}</p>
        <p class="text-sm text-slate-300 break-words">Message: {{ state.message || '—' }}</p>
        <p class="text-sm text-slate-300 break-words">Audio: {{ state.audioUrl ? 'Yes' : 'No' }}</p>
        <p class="text-sm text-slate-300">Schedule: {{ state.scheduleAt || '—' }}</p>
        <p v-if="status" class="text-xs text-emerald-300 break-words">{{ status }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import RecipientSelector from '@/components/leader/RecipientSelector.vue'
import VoiceMessagePanel from '@/components/leader/VoiceMessagePanel.vue'
import MessageTemplateSelector from '@/components/leader/MessageTemplateSelector.vue'
import ScheduleSelector from '@/components/leader/ScheduleSelector.vue'
import { ElMessage } from 'element-plus'
import { scheduleLeaderMessage, generateMessageDraft, createMessageTemplate } from '@/services/leader/messages'

const state = reactive({
  recipients: [],
  groups: [],
  count: 0,
  channel: 'whatsapp',
  mode: 'text',
  message: '',
  prompt: '',
  audioUrl: null,
  scheduleAt: '',
})
const saving = ref(false)
const aiLoading = ref(false)
const templateSaving = ref(false)
const status = ref('')

async function submit() {
  const contactIds = state.recipients.map((r) => r.contactId || r.id).filter(Boolean)
  const payload = {
    channel: state.channel,
    message: state.message || null,
    contactIds,
    scheduledAt: state.scheduleAt || new Date().toISOString(),
    context: {
      reason: 'custom',
      note: null,
      mode: state.mode,
      audioUrl: state.audioUrl || null,
      groups: state.groups.map((g) => g.groupId || g.id),
    },
  }
  saving.value = true
  status.value = ''
  try {
    await scheduleLeaderMessage(payload)
    status.value = 'Message scheduled successfully.'
    ElMessage.success('Scheduled')
  } catch (e) {
    console.error(e)
    ElMessage.error(e?.response?.data?.error || 'Failed to schedule')
  } finally {
    saving.value = false
  }
}

function reset() {
  state.recipients = []
  state.groups = []
  state.count = 0
  state.channel = 'whatsapp'
  state.mode = 'text'
  state.message = ''
  state.audioUrl = null
  state.scheduleAt = ''
  state.prompt = ''
  status.value = ''
}

async function generateAiMessage() {
  aiLoading.value = true
  try {
    const text = await generateMessageDraft(state.prompt || state.message || 'Friendly outreach for my contacts')
    state.message = text
    status.value = 'AI draft generated.'
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'AI generation failed')
  } finally {
    aiLoading.value = false
  }
}

async function saveTemplate() {
  if (!state.message) return ElMessage.warning('Write a message first')
  templateSaving.value = true
  try {
    await createMessageTemplate({
      title: state.prompt || 'Leader template',
      body: state.message,
    })
    ElMessage.success('Template saved')
  } catch (e) {
    ElMessage.error(e?.response?.data?.error || 'Failed to save template')
  } finally {
    templateSaving.value = false
  }
}
</script>
