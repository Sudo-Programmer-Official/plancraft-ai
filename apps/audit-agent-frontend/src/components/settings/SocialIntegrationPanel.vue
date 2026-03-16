<template>
  <section class="social-panel">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-lg sm:text-xl font-semibold">🔗 Social Accounts</h2>
        <p class="text-sm text-indigo-100 mt-1">Connect channels for publishing from PlanCraft.</p>
      </div>
      <div class="text-xs text-slate-300">
        <span v-if="loading">Loading status…</span>
        <span v-else>Updated {{ lastUpdatedLabel }}</span>
      </div>
    </div>

    <div class="social-grid mt-4">
      <div v-for="card in cards" :key="card.key" class="social-card rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-semibold flex items-center gap-2">
              <span class="text-xl">{{ card.icon }}</span> {{ card.label }}
            </div>
            <p class="text-xs text-slate-300 mt-1">{{ card.desc }}</p>
            <p v-if="card.metaText" class="text-[11px] text-slate-400 mt-1 break-words">{{ card.metaText }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="[
                'text-[11px] px-2 py-0.5 rounded-full border',
                card.connected ? 'border-emerald-400/50 text-emerald-200 bg-emerald-500/10' : 'border-slate-500/40 text-slate-200'
              ]"
            >
              {{ card.connected ? 'Connected' : 'Not connected' }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-if="card.action === 'connect'"
            class="px-3 py-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm disabled:opacity-60"
            :disabled="loading || card.busy"
            @click="card.onConnect?.()"
          >
            {{ card.busy ? 'Opening…' : card.connectLabel || 'Connect' }}
          </button>
          <button
            v-if="card.connected && card.onDisconnect"
            class="px-3 py-1.5 rounded border border-white/20 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-60"
            :disabled="loading || card.busy"
            @click="card.onDisconnect?.()"
          >
            {{ card.busy ? 'Working…' : 'Disconnect' }}
          </button>
          <button
            v-if="card.connected && card.onRefresh"
            class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm text-white disabled:opacity-60"
            :disabled="loading || card.busy"
            @click="card.onRefresh?.()"
          >
            Refresh
          </button>
          <span v-if="card.readonly" class="text-xs text-slate-300">No action required.</span>
        </div>
        <div
          v-if="card.workspaceToggle"
          class="flex items-center gap-2 text-xs text-slate-300"
        >
          <input
            type="checkbox"
            class="accent-indigo-500 h-4 w-4"
            :checked="card.workspaceEnabled"
            @change="card.onToggle?.(($event.target as HTMLInputElement).checked)"
          />
          <span>Enable for this workspace</span>
        </div>
        <p v-if="card.error" class="text-xs text-red-300">⚠️ {{ card.error }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import {
  getSocialStatus,
  getLinkedInAuthUrl,
  getInstagramAuthUrl,
  getTwitterAuthUrl,
  disconnectSocial,
  setSocialEnabled,
} from '@/services/social'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { openExternalUrl } from '@/utils/nativeUi'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const loading = ref(false)
const state = reactive({
  linkedin: { connected: false, meta: null as any, busy: false, error: '' },
  instagram: { connected: false, meta: null as any, busy: false, error: '' },
  twitter: { connected: false, meta: null as any, busy: false, error: '' },
  whatsapp: { connected: true, meta: null as any, busy: false, error: '' },
  updatedAt: null as string | null,
  enabled: {
    linkedin: false,
    instagram: false,
    twitter: false,
  } as Record<string, boolean>,
})

const lastUpdatedLabel = computed(() => {
  if (!state.updatedAt) return 'just now'
  return new Date(state.updatedAt).toLocaleString()
})

async function loadStatus() {
  loading.value = true
  try {
    const resp = await getSocialStatus(workspaceStore.activeWorkspaceId)
    const accounts = resp?.accounts || resp || {}
    const enabled = resp?.enabledSocials || {}
    state.linkedin.connected = !!accounts?.linkedin?.connected
    state.linkedin.meta = accounts?.linkedin?.meta || null
    state.instagram.connected = !!accounts?.instagram?.connected
    state.instagram.meta = accounts?.instagram?.meta || null
    state.twitter.connected = !!accounts?.twitter?.connected
    state.twitter.meta = accounts?.twitter?.meta || null
    state.enabled.linkedin = !!enabled.linkedin
    state.enabled.instagram = !!enabled.instagram
    state.enabled.twitter = !!enabled.twitter
    state.updatedAt = new Date().toISOString()
  } catch (e) {
    console.warn('Load social status failed', e)
  } finally {
    loading.value = false
  }
}

async function connectLinkedIn() {
  state.linkedin.busy = true
  state.linkedin.error = ''
  try {
    if (!authStore.user?.uid) throw new Error('Sign in to connect LinkedIn')
    const url = await getLinkedInAuthUrl()
    if (!url) throw new Error('No LinkedIn auth URL returned')
    if (!openExternalUrl(url)) {
      throw new Error('Unable to open LinkedIn auth')
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to connect LinkedIn'
    state.linkedin.error = msg
    ElMessage.error(msg)
  } finally {
    state.linkedin.busy = false
  }
}

async function connectInstagram() {
  state.instagram.busy = true
  state.instagram.error = ''
  try {
    if (!authStore.user?.uid) throw new Error('Sign in to connect Instagram')
    const url = await getInstagramAuthUrl()
    if (!url) throw new Error('No Instagram auth URL returned')
    if (!openExternalUrl(url)) {
      throw new Error('Unable to open Instagram auth')
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to connect Instagram'
    state.instagram.error = msg
    ElMessage.error(msg)
  } finally {
    state.instagram.busy = false
  }
}

async function connectTwitter() {
  state.twitter.busy = true
  state.twitter.error = ''
  try {
    if (!authStore.user?.uid) throw new Error('Sign in to connect Twitter')
    const url = await getTwitterAuthUrl()
    if (!url) throw new Error('No Twitter auth URL returned')
    if (!openExternalUrl(url)) {
      throw new Error('Unable to open Twitter auth')
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to connect Twitter'
    state.twitter.error = msg
    ElMessage.error(msg)
  } finally {
    state.twitter.busy = false
  }
}

async function doDisconnect(platform: 'linkedin' | 'instagram' | 'twitter') {
  state[platform].busy = true
  state[platform].error = ''
  try {
    await disconnectSocial(platform)
    await loadStatus()
    ElMessage.success(`${platform} disconnected`)
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to disconnect'
    state[platform].error = msg
    ElMessage.error(msg)
  } finally {
    state[platform].busy = false
  }
}

async function toggleWorkspace(provider: 'linkedin' | 'instagram' | 'twitter', enabled: boolean) {
  try {
    const wsId = workspaceStore.activeWorkspaceId
    if (!wsId) throw new Error('Select a workspace first')
    await setSocialEnabled(wsId, provider, enabled)
    state.enabled[provider] = enabled
    ElMessage.success(`${provider} ${enabled ? 'enabled' : 'disabled'} for this workspace`)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || e?.message || 'Failed to update workspace setting')
  }
}

const cards = computed(() => {
  return [
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: '💼',
      desc: 'Publish posts to LinkedIn.',
      connected: state.linkedin.connected,
      metaText: state.linkedin.meta?.username ? `@${state.linkedin.meta.username}` : '',
      action: state.linkedin.connected ? 'connected' : 'connect',
      busy: state.linkedin.busy,
      error: state.linkedin.error,
      connectLabel: 'Connect LinkedIn',
      onConnect: connectLinkedIn,
      onDisconnect: state.linkedin.connected ? () => doDisconnect('linkedin') : null,
      workspaceToggle: true,
      workspaceEnabled: state.enabled.linkedin,
      onToggle: (enabled: boolean) => toggleWorkspace('linkedin', enabled),
    },
    {
      key: 'instagram',
      label: 'Instagram (via Facebook)',
      icon: '📸',
      desc: 'Requires Facebook Page with IG business account.',
      connected: state.instagram.connected,
      metaText: state.instagram.meta?.username ? `@${state.instagram.meta.username}` : state.instagram.meta?.pageName,
      action: state.instagram.connected ? 'connected' : 'connect',
      busy: state.instagram.busy,
      error: state.instagram.error,
      connectLabel: 'Connect via Facebook',
      onConnect: connectInstagram,
      onDisconnect: state.instagram.connected ? () => doDisconnect('instagram') : null,
      workspaceToggle: true,
      workspaceEnabled: state.enabled.instagram,
      onToggle: (enabled: boolean) => toggleWorkspace('instagram', enabled),
    },
    {
      key: 'twitter',
      label: 'Twitter / X',
      icon: '🐦',
      desc: 'Tweet from PlanCraft.',
      connected: state.twitter.connected,
      metaText: state.twitter.meta?.username ? `@${state.twitter.meta.username}` : '',
      action: state.twitter.connected ? 'connected' : 'connect',
      busy: state.twitter.busy,
      error: state.twitter.error,
      connectLabel: 'Connect Twitter/X',
      onConnect: connectTwitter,
      onDisconnect: state.twitter.connected ? () => doDisconnect('twitter') : null,
      workspaceToggle: true,
      workspaceEnabled: state.enabled.twitter,
      onToggle: (enabled: boolean) => toggleWorkspace('twitter', enabled),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp Business',
      icon: '💬',
      desc: 'Business API connected at app level.',
      connected: true,
      metaText: '',
      action: 'readonly',
      busy: false,
      error: '',
      readonly: true,
    },
  ]
})

onMounted(() => {
  loadStatus()
})
</script>

<style scoped>
.social-panel {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: radial-gradient(120% 120% at 10% 10%, rgba(99, 102, 241, 0.07), rgba(15, 23, 42, 0.75)), rgba(15, 23, 42, 0.6);
  border-radius: 18px;
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  margin: 0 auto;
}

.social-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.social-card {
  height: 100%;
}

@media (min-width: 640px) {
  .social-panel {
    padding: 1.5rem;
  }
}

button { transition: all 0.15s ease; }
</style>
