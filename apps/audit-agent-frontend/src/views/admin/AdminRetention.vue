<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-50 px-6 md:px-10 py-8 relative overflow-hidden">
    <div class="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_40%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_60%_80%,rgba(236,72,153,0.18),transparent_35%)] pointer-events-none"></div>

    <header class="relative flex items-center justify-between mb-8">
      <div>
        <p class="text-sm uppercase tracking-[0.3em] text-indigo-300/80">Product-driven retention</p>
        <h1 class="text-3xl md:text-4xl font-semibold mt-2">Signals → Triggers → Actions</h1>
        <p class="text-slate-300 mt-2">No campaigns. Just timely nudges powered by product activity.</p>
      </div>
      <button
        class="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/30"
        :disabled="sweepLoading"
        @click="runSweep"
      >
        {{ sweepLoading ? 'Running…' : 'Run quick sweep' }}
      </button>
    </header>

    <section class="relative grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="card" v-for="card in statCards" :key="card.label">
        <div class="text-sm text-slate-300/90">{{ card.label }}</div>
        <div class="text-3xl font-semibold mt-2">{{ card.value }}</div>
        <div class="text-xs text-slate-400 mt-1">{{ card.hint }}</div>
      </div>
      <div v-if="sweepResult" class="card col-span-1 md:col-span-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-slate-300/90">Last manual sweep</div>
            <div class="text-2xl font-semibold mt-1">{{ sweepResult.fired || 0 }} events fired</div>
            <div class="text-xs text-slate-400 mt-1">Checked {{ sweepResult.scanned || 0 }} users</div>
          </div>
          <button class="text-xs px-3 py-1 rounded bg-white/5 border border-white/10" @click="sweepResult=null">Clear</button>
        </div>
      </div>
    </section>

    <section class="relative grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">Triggers</h2>
          <span class="text-xs text-slate-300/80">Max 1 email/day · skip if recent login</span>
        </div>
        <div v-for="trigger in triggers" :key="trigger.key" class="card border border-white/10 hover:border-indigo-400/30 transition">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-lg font-semibold">{{ trigger.label }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 uppercase tracking-wide">{{ trigger.type }}</span>
              </div>
              <p class="text-sm text-slate-300/90 mt-1">{{ trigger.description }}</p>
              <p class="text-xs text-slate-400 mt-2">Intent: {{ trigger.intent }}</p>
            </div>
            <el-switch v-model="trigger.enabled" size="large" @change="saveTrigger(trigger)" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label class="label">Delay (hours)</label>
              <el-input-number v-model="trigger.delayHours" :min="1" :max="240" size="small" @change="saveTrigger(trigger)" />
            </div>
            <div>
              <label class="label">Cooldown (hours)</label>
              <el-input-number v-model="trigger.cooldownHours" :min="6" :max="240" size="small" @change="saveTrigger(trigger)" />
            </div>
            <div>
              <label class="label">Template</label>
              <el-select v-model="trigger.templateKey" placeholder="Template" size="small" @change="saveTrigger(trigger)">
                <el-option v-for="tpl in templates" :key="tpl.key" :label="tpl.key" :value="tpl.key" />
              </el-select>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold">Email templates</h3>
            <el-select v-model="selectedTemplate" placeholder="Template" size="small" style="width: 180px">
              <el-option v-for="tpl in templates" :key="tpl.key" :label="tpl.key" :value="tpl.key" />
            </el-select>
          </div>
          <div class="space-y-3">
            <div>
              <label class="label">Subject</label>
              <el-input v-model="templateForm.subject" placeholder="Subject" />
            </div>
            <div>
              <label class="label flex items-center justify-between">
                <span>Body</span>
                <span class="text-[10px] text-slate-400">Supports {{ '{' }}{{ '{key}' }}{{ '}' }} placeholders</span>
              </label>
              <el-input type="textarea" :rows="6" v-model="templateForm.body" placeholder="Body" />
            </div>
            <div>
              <label class="label">CTA URL</label>
              <el-input v-model="templateForm.cta_url" placeholder="https://plancraftai.com/..." />
            </div>
            <div class="flex justify-end">
              <el-button type="primary" :loading="savingTemplate" @click="saveTemplateForm">Save template</el-button>
            </div>
          </div>
        </div>

        <div class="card border border-green-400/20 bg-green-950/20">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-green-300">Suppression rules</span>
          </div>
          <ul class="text-sm text-slate-200 space-y-1">
            <li>• Respect unsubscribe (email prefs off)</li>
            <li>• Max 1 email per user per 24h</li>
            <li>• Skip if user logged in within last 6h</li>
            <li>• Cooldown per-trigger before refire</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchRetentionStats,
  fetchRetentionTemplates,
  fetchRetentionTriggers,
  runRetentionSweep,
  saveRetentionTemplate,
  updateRetentionTrigger,
} from '@/services/retentionService'

const loading = ref(false)
const triggers = ref([])
const templates = ref([])
const stats = ref({})
const selectedTemplate = ref('')
const templateForm = ref({ subject: '', body: '', cta_url: '' })
const savingTemplate = ref(false)
const sweepResult = ref(null)
const sweepLoading = ref(false)

const statCards = computed(() => [
  { label: 'Events (7d)', value: stats.value?.events ?? '—', hint: 'Trigger evaluations recorded' },
  { label: 'Sent (7d)', value: stats.value?.sent7d ?? '—', hint: 'Emails fired' },
  { label: 'Suppressed', value: stats.value?.suppressed7d ?? '—', hint: 'Skipped due to guardrails' },
  { label: 'Pending', value: stats.value?.pending ?? '—', hint: 'Queued / awaiting send' },
])

function syncTemplateForm() {
  const tpl = templates.value.find((t) => t.key === selectedTemplate.value) || {}
  templateForm.value = {
    subject: tpl.subject || '',
    body: tpl.body || '',
    cta_url: tpl.cta_url || tpl.ctaUrl || '',
  }
}

watch(selectedTemplate, syncTemplateForm)

async function loadData() {
  loading.value = true
  try {
    const [triggerList, templateList, statData] = await Promise.all([
      fetchRetentionTriggers(),
      fetchRetentionTemplates(),
      fetchRetentionStats(),
    ])
    triggers.value = triggerList
    templates.value = templateList
    stats.value = statData
    if (!selectedTemplate.value && templateList?.length) selectedTemplate.value = templateList[0].key
    syncTemplateForm()
  } catch (err) {
    console.error(err)
    ElMessage.error('Failed to load retention config')
  } finally {
    loading.value = false
  }
}

async function saveTrigger(trigger) {
  if (!trigger?.key) return
  try {
    await updateRetentionTrigger(trigger.key, {
      enabled: trigger.enabled,
      delayHours: trigger.delayHours,
      cooldownHours: trigger.cooldownHours,
      templateKey: trigger.templateKey,
    })
    ElMessage.success('Trigger saved')
  } catch (err) {
    console.error(err)
    ElMessage.error('Failed to save trigger')
  }
}

async function saveTemplateForm() {
  if (!selectedTemplate.value) return
  try {
    savingTemplate.value = true
    await saveRetentionTemplate(selectedTemplate.value, { ...templateForm.value })
    ElMessage.success('Template saved')
    await loadData()
  } catch (err) {
    console.error(err)
    ElMessage.error('Failed to save template')
  } finally {
    savingTemplate.value = false
  }
}

async function runSweep() {
  sweepLoading.value = true
  try {
    const result = await runRetentionSweep(10)
    sweepResult.value = result
    ElMessage.success(`Sweep complete — fired ${result?.fired || 0}`)
    stats.value = await fetchRetentionStats()
  } catch (err) {
    console.error(err)
    ElMessage.error('Sweep failed')
  } finally {
    sweepLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.card {
  @apply relative bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-lg shadow-xl;
}
.label {
  @apply text-xs uppercase tracking-wide text-slate-300/80 mb-1;
}
</style>
