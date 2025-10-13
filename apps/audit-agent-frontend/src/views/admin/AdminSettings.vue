<template>
  <div class="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-slate-100 px-6 md:px-10 py-8 font-inter relative overflow-hidden">
    <div class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.4),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.4),transparent_60%)] pointer-events-none"></div>

    <!-- Header -->
    <header class="relative flex items-center justify-between mb-8 border-b border-white/10 pb-5">
      <h1 class="text-3xl md:text-4xl bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">⚙️ Admin • Settings</h1>
      <router-link
        to="/dashboard"
        class="px-5 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition"
      >
        ← Back to App
      </router-link>
    </header>

    <!-- Settings Card -->
    <div class="relative bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl hover:border-indigo-400/40 hover:bg-white/10">
      <el-tabs v-model="activeTab" class="text-white">
        <el-tab-pane label="General" name="general">
          <div class="grid md:grid-cols-2 gap-6">
            <div>
              <label class="text-sm text-slate-300 mb-1 block">Default AI Model</label>
              <el-select v-model="settings.aiModel" placeholder="Select model" class="w-full">
                <el-option label="GPT-4o-mini" value="gpt-4o-mini" />
                <el-option label="GPT-4o" value="gpt-4o" />
              </el-select>
            </div>
            <div>
              <label class="text-sm text-slate-300 mb-1 block">Enable Blog Notifications</label>
              <div class="flex items-center gap-3">
                <el-switch v-model="settings.enableNotifications" />
                <span class="text-slate-300 text-sm">Notify readers on publish</span>
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="text-sm text-slate-300 mb-1 block">Version</label>
              <el-input :model-value="settings.version || '—'" disabled />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Prompts" name="prompts">
          <div class="flex flex-col gap-4">
            <div>
              <label class="text-sm text-slate-300 mb-1 block">Default Blog Prompt</label>
              <el-input v-model="settings.blogPrompt" type="textarea" :rows="4" placeholder="Default blog prompt template" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Notifications" name="notifications">
          <div class="grid md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="text-sm text-slate-300 mb-1 block">WhatsApp Template ID</label>
              <el-input v-model="settings.whatsappTemplate" placeholder="blog_update_v1" />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Integrations" name="integrations">
          <p class="text-slate-300 text-sm">More coming soon…</p>
        </el-tab-pane>
      </el-tabs>

      <div class="flex justify-end mt-6 border-t border-white/10 pt-4">
        <el-button type="primary" :loading="saving" @click="saveSettings">Save</el-button>
      </div>
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const activeTab = ref('general')
const saving = ref(false)
const settings = ref({
  blogPrompt: 'Generate engaging AI productivity content for PlanCraftAI.',
  aiModel: 'gpt-4o-mini',
  enableNotifications: false,
  whatsappTemplate: 'blog_update_v1',
  version: ''
})

async function loadSettings() {
  try {
    const res = await api.get('/admin/settings')
    const s = res?.data?.settings || res?.data || {}
    settings.value = { ...settings.value, ...s }
  } catch (e) {
    console.warn('Failed to fetch settings', e?.message || e)
  }
}

async function saveSettings() {
  try {
    saving.value = true
    const payload = { ...settings.value }
    delete payload.version
    await api.post('/admin/settings', payload)
    ElMessage.success('Settings saved')
  } catch (e) {
    ElMessage.error(e?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
/* Element Plus inputs in glass card */
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
/* Make tab labels clearly visible on dark backgrounds */
:deep(.el-tabs__item) {
  color: rgba(255, 255, 255, 0.7) !important;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

:deep(.el-tabs__item:hover) {
  color: #a5b4fc !important; /* indigo-300 hover tone */
}

:deep(.el-tabs__item.is-active) {
  color: #c7d2fe !important; /* brighter indigo-200 active */
  border-color: #818cf8 !important;
}

/* Tab bar underline color fix */
:deep(.el-tabs__active-bar) {
  background-color: #818cf8 !important;
}
</style>
