<template>
  <div class="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] px-6 py-8 text-slate-100 md:px-10">
    <div class="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.4),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.4),transparent_60%)]"></div>

    <header class="relative mb-8 flex items-center justify-between border-b border-white/10 pb-5">
      <h1 class="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-3xl text-transparent md:text-4xl">
        ⚙️ Admin • Settings
      </h1>
      <router-link
        to="/dashboard"
        class="rounded-lg border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20"
      >
        ← Back to App
      </router-link>
    </header>

    <div class="relative rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <el-tabs v-model="activeTab" class="text-white">
        <el-tab-pane label="General" name="general">
          <div class="grid gap-6 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-slate-300">Default AI Model</label>
              <el-select v-model="settings.aiModel" class="w-full" placeholder="Select model">
                <el-option label="GPT-4o-mini" value="gpt-4o-mini" />
                <el-option label="GPT-4o" value="gpt-4o" />
              </el-select>
            </div>
            <div>
              <label class="mb-1 block text-sm text-slate-300">Enable Blog Notifications</label>
              <div class="flex items-center gap-3">
                <el-switch v-model="settings.enableNotifications" />
                <span class="text-sm text-slate-300">Notify readers on publish</span>
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">Version</label>
              <el-input :model-value="settings.version || '—'" disabled />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Prompts" name="prompts">
          <div class="flex flex-col gap-4">
            <div>
              <label class="mb-1 block text-sm text-slate-300">Default Blog Prompt</label>
              <el-input v-model="settings.blogPrompt" type="textarea" :rows="4" placeholder="Default blog prompt template" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Notifications" name="notifications">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="md:col-span-2">
              <label class="mb-1 block text-sm text-slate-300">WhatsApp Template ID</label>
              <el-input v-model="settings.whatsappTemplate" placeholder="blog_update_v1" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Plans" name="plans">
          <div class="space-y-6">
            <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">Access engine</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">Base plans, overrides, and campaigns</h3>
                  <p class="mt-1 text-sm text-slate-300">
                    Limits and feature access are computed server-side from these values.
                  </p>
                </div>
                <div class="w-full md:w-56">
                  <label class="mb-1 block text-sm text-slate-300">Default grace period (days)</label>
                  <el-input v-model="settings.accessControl.gracePeriodDays" placeholder="0" />
                </div>
              </div>
            </section>

            <section class="grid gap-6 xl:grid-cols-3">
              <article
                v-for="plan in planCards"
                :key="plan.key"
                class="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div class="mb-4">
                  <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">{{ plan.eyebrow }}</p>
                  <h3 class="mt-2 text-xl font-semibold text-white">{{ settings.accessControl.plans[plan.key].name }}</h3>
                  <p class="mt-1 text-sm text-slate-300">{{ plan.description }}</p>
                </div>

                <div class="space-y-4">
                  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <div v-for="field in limitFields" :key="`${plan.key}-${field.key}`">
                      <label class="mb-1 block text-sm text-slate-300">{{ field.label }}</label>
                      <el-input
                        v-model="settings.accessControl.plans[plan.key].limits[field.key]"
                        :placeholder="field.placeholder"
                      />
                    </div>
                  </div>

                  <div class="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <p class="text-xs uppercase tracking-[0.24em] text-slate-300/70">Entitlements</p>
                    <div class="mt-4 grid gap-3">
                      <label
                        v-for="field in entitlementFields"
                        :key="`${plan.key}-${field.key}`"
                        class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p class="text-sm font-medium text-white">{{ field.label }}</p>
                          <p class="text-xs text-slate-300">{{ field.description }}</p>
                        </div>
                        <el-switch v-model="settings.accessControl.plans[plan.key].entitlements[field.key]" />
                      </label>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section class="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div class="mb-4">
                <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">Campaign layer</p>
                <h3 class="mt-2 text-xl font-semibold text-white">Experiments and promos</h3>
                <p class="mt-1 text-sm text-slate-300">
                  Optional JSON array. Each campaign can target user IDs, emails, roles, or plans and can
                  set a temporary plan, limits, entitlements, expiry, and grace.
                </p>
              </div>
              <el-input
                v-model="campaignJson"
                type="textarea"
                :rows="14"
                placeholder='[{"name":"Founding users","userIds":["uid_123"],"plan":"premium","expiresAt":"2026-06-30T23:59:59.000Z","gracePeriodDays":7}]'
              />
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Integrations" name="integrations">
          <p class="text-sm text-slate-300">More coming soon…</p>
        </el-tab-pane>
      </el-tabs>

      <div class="mt-6 flex justify-end border-t border-white/10 pt-4">
        <el-button type="primary" :loading="saving" @click="saveSettings">Save</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const PLAN_META = Object.freeze([
  {
    key: 'free',
    eyebrow: 'Free plan',
    description: 'Default product access for new and unpaid users.',
  },
  {
    key: 'premium',
    eyebrow: 'Premium plan',
    description: 'Paid solo access with higher limits and premium entitlements.',
  },
  {
    key: 'team',
    eyebrow: 'Team plan',
    description: 'Shared/team-oriented access with admin entitlements enabled.',
  },
])

const limitFields = Object.freeze([
  { key: 'playbooks', label: 'Playbooks', placeholder: '5' },
  { key: 'remindersPerDay', label: 'Reminders / day', placeholder: '10' },
  { key: 'tasksPerDay', label: 'Tasks / day', placeholder: '10' },
  { key: 'aiGenerations', label: 'AI generations / day', placeholder: '10' },
])

const entitlementFields = Object.freeze([
  { key: 'aiSplit', label: 'AI split', description: 'Allow AI task generation and splitting.' },
  { key: 'priorityScheduling', label: 'Priority scheduling', description: 'Enable priority and scheduling boosts.' },
  { key: 'voiceReminders', label: 'Voice reminders', description: 'Allow voice/call reminder features.' },
  { key: 'advancedPermissions', label: 'Advanced permissions', description: 'Allow advanced workspace/admin controls.' },
  { key: 'prioritySupport', label: 'Priority support', description: 'Show premium support routing and support access.' },
  { key: 'teamWorkspaces', label: 'Team workspaces', description: 'Allow shared team workspace capabilities.' },
])

function buildDefaultAccessControl() {
  return {
    gracePeriodDays: 0,
    plans: {
      free: {
        name: 'Free',
        limits: {
          remindersPerDay: 10,
          tasksPerDay: 10,
          aiGenerations: 10,
          playbooks: 5,
        },
        entitlements: {
          aiSplit: true,
          priorityScheduling: false,
          voiceReminders: false,
          advancedPermissions: false,
          prioritySupport: false,
          teamWorkspaces: false,
        },
      },
      premium: {
        name: 'Pro',
        limits: {
          remindersPerDay: '',
          tasksPerDay: '',
          aiGenerations: '',
          playbooks: '',
        },
        entitlements: {
          aiSplit: true,
          priorityScheduling: true,
          voiceReminders: true,
          advancedPermissions: false,
          prioritySupport: true,
          teamWorkspaces: false,
        },
      },
      team: {
        name: 'Team',
        limits: {
          remindersPerDay: '',
          tasksPerDay: '',
          aiGenerations: '',
          playbooks: '',
        },
        entitlements: {
          aiSplit: true,
          priorityScheduling: true,
          voiceReminders: true,
          advancedPermissions: true,
          prioritySupport: true,
          teamWorkspaces: true,
        },
      },
    },
    campaigns: [],
  }
}

function buildDefaultSettings() {
  const accessControl = buildDefaultAccessControl()
  return {
    blogPrompt:
      'Write keyword-first PlanCraftAI blog posts with practical examples, comparison sections, strong H2 structure, FAQ sections, and natural internal links to the homepage plus one SEO landing page. Include soft mid-article CTAs and a clear end CTA.',
    aiModel: 'gpt-4o-mini',
    enableNotifications: false,
    whatsappTemplate: 'blog_update_v1',
    version: '',
    accessControl,
    planLimits: {
      free: { ...accessControl.plans.free.limits },
      premium: { ...accessControl.plans.premium.limits },
      team: { ...accessControl.plans.team.limits },
    },
  }
}

function mergeAccessControl(raw = {}) {
  const defaults = buildDefaultAccessControl()
  const next = {
    gracePeriodDays: raw?.gracePeriodDays ?? defaults.gracePeriodDays,
    plans: {},
    campaigns: Array.isArray(raw?.campaigns) ? raw.campaigns : defaults.campaigns,
  }

  PLAN_META.forEach((plan) => {
    next.plans[plan.key] = {
      name: raw?.plans?.[plan.key]?.name || defaults.plans[plan.key].name,
      limits: {
        ...defaults.plans[plan.key].limits,
        ...(raw?.plans?.[plan.key]?.limits || {}),
      },
      entitlements: {
        ...defaults.plans[plan.key].entitlements,
        ...(raw?.plans?.[plan.key]?.entitlements || {}),
      },
    }
  })

  return next
}

const planCards = PLAN_META
const activeTab = ref('general')
const saving = ref(false)
const settings = ref(buildDefaultSettings())
const campaignJson = ref('[]')

function syncPlanLimitsFromAccessControl() {
  settings.value.planLimits = PLAN_META.reduce((acc, plan) => {
    acc[plan.key] = { ...(settings.value.accessControl?.plans?.[plan.key]?.limits || {}) }
    return acc
  }, {})
}

async function loadSettings() {
  try {
    const res = await api.get('/admin/settings')
    const incoming = res?.data?.settings || res?.data || {}
    const accessControl = mergeAccessControl(incoming?.accessControl || {})
    settings.value = {
      ...buildDefaultSettings(),
      ...incoming,
      accessControl,
    }
    syncPlanLimitsFromAccessControl()
    campaignJson.value = JSON.stringify(accessControl.campaigns || [], null, 2)
  } catch (error) {
    console.warn('Failed to fetch settings', error?.message || error)
  }
}

async function saveSettings() {
  let campaigns = []
  try {
    const parsed = JSON.parse(campaignJson.value || '[]')
    if (!Array.isArray(parsed)) {
      ElMessage.error('Campaigns JSON must be an array')
      return
    }
    campaigns = parsed
  } catch {
    ElMessage.error('Campaigns JSON is invalid')
    return
  }

  try {
    saving.value = true
    const accessControl = {
      ...settings.value.accessControl,
      campaigns,
    }
    const payload = {
      ...settings.value,
      accessControl,
      planLimits: PLAN_META.reduce((acc, plan) => {
        acc[plan.key] = { ...(accessControl.plans?.[plan.key]?.limits || {}) }
        return acc
      }, {}),
    }
    delete payload.version
    await api.post('/admin/settings', payload)
    settings.value.accessControl = mergeAccessControl(accessControl)
    syncPlanLimitsFromAccessControl()
    campaignJson.value = JSON.stringify(settings.value.accessControl.campaigns || [], null, 2)
    ElMessage.success('Settings saved')
  } catch (error) {
    ElMessage.error(error?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #ffffff !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #6366f1 !important;
}

:deep(.el-tabs__item) {
  color: rgba(255, 255, 255, 0.7) !important;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

:deep(.el-tabs__item:hover) {
  color: #a5b4fc !important;
}

:deep(.el-tabs__item.is-active) {
  color: #c7d2fe !important;
  border-color: #818cf8 !important;
}

:deep(.el-tabs__active-bar) {
  background-color: #818cf8 !important;
}
</style>
