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
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
            @click="submit"
          >
            Schedule
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
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import RecipientSelector from '@/components/leader/RecipientSelector.vue'
import VoiceMessagePanel from '@/components/leader/VoiceMessagePanel.vue'
import MessageTemplateSelector from '@/components/leader/MessageTemplateSelector.vue'
import ScheduleSelector from '@/components/leader/ScheduleSelector.vue'
import { scheduleMessage } from '@/services/leaderApi'

const state = reactive({
  recipients: [],
  groups: [],
  count: 0,
  channel: 'whatsapp',
  mode: 'text',
  message: '',
  audioUrl: null,
  scheduleAt: '',
})

async function submit() {
  const payload = {
    channel: state.channel,
    mode: state.mode,
    recipients: state.recipients.map((r) => ({ contactId: r.contactId })),
    groups: state.groups.map((g) => ({ groupId: g.groupId })),
    message: state.message || null,
    audioUrl: state.audioUrl || null,
    scheduleAt: state.scheduleAt || new Date().toISOString(),
    context: { reason: 'custom', note: null },
  }
  try {
    await scheduleMessage(payload)
    alert('Scheduled!')
  } catch (e) {
    console.error(e)
    alert('Failed to schedule')
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
}
</script>
