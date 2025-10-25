<template>
  <transition name="teams-modal-fade">
    <div v-if="visible" class="teams-backdrop" @click.self="close">
      <div class="teams-panel" role="dialog" aria-modal="true">
        <header class="teams-header">
          <div>
            <h2>Create or Join your Team</h2>
            <p>Spin up a workspace in seconds and invite collaborators when youre ready.</p>
          </div>
          <button type="button" class="close-btn" aria-label="Close" @click="close">✕</button>
        </header>

        <nav class="tab-strip">
          <button
            type="button"
            class="tab"
            :class="{ active: activeTab === 'create' }"
            @click="activeTab = 'create'"
          >
            Create Team
          </button>
          <button
            type="button"
            class="tab"
            :class="{ disabled: joinDisabled, active: activeTab === 'join' }"
            :disabled="joinDisabled"
            @click="switchToJoin"
            title="Invites are coming soon"
          >
            Join Team
          </button>
        </nav>

        <section class="tab-body">
          <form v-if="activeTab === 'create'" class="form" @submit.prevent="submitCreate">
            <label class="field">
              <span>Team name</span>
              <input
                v-model="formCreate.name"
                type="text"
                placeholder="Sudo Programmers"
                :disabled="loading"
                required
              />
            </label>

            <label class="field">
              <span>Primary timezone <small>(optional)</small></span>
              <input
                v-model="formCreate.timezone"
                type="text"
                :placeholder="defaultTimezoneLabel"
                :disabled="loading"
              />
              <small class="hint">Well use browser timezone if left blank.</small>
            </label>

            <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

            <footer class="actions">
              <button type="submit" class="primary" :disabled="loading">
                <span v-if="loading">Creating…</span>
                <span v-else>Create team</span>
              </button>
              <button type="button" class="ghost" @click="close" :disabled="loading">Cancel</button>
            </footer>
          </form>

          <div v-else class="join-placeholder">
            <h3>Join an existing team</h3>
            <p>Invite links are rolling out next. Sit tight or ask your teammate to send an email invite.</p>
            <button type="button" class="ghost" @click="switchToCreate">Back to create</button>
          </div>
        </section>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useToastStore } from '@/stores/toastStore'
import { trackEvent } from '@/services/analytics'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'created', payload: any): void
}>()

const orgStore = useOrgStore()
const toastStore = useToastStore()
const router = useRouter()

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const activeTab = ref<'create' | 'join'>('create')
const formCreate = reactive({ name: '', timezone: '' })
const loading = ref(false)
const errorMessage = ref('')
const joinDisabled = computed(() => import.meta.env.VITE_INVITES_ENABLED !== 'true')
const defaultTimezoneLabel = computed(() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
})

watch(visible, (open) => {
  if (open) {
    activeTab.value = 'create'
    formCreate.name = ''
    formCreate.timezone = defaultTimezoneLabel.value
    errorMessage.value = ''
  } else {
    resetForm()
  }
})

function resetForm() {
  formCreate.name = ''
  formCreate.timezone = ''
  errorMessage.value = ''
  loading.value = false
}

function close() {
  visible.value = false
}

function switchToJoin() {
  if (joinDisabled.value) {
    toastStore.push('Invites are coming soon. Hang tight!', { type: 'info', duration: 3200 })
    return
  }
  activeTab.value = 'join'
}

function switchToCreate() {
  activeTab.value = 'create'
}

async function submitCreate() {
  if (!formCreate.name.trim()) {
    errorMessage.value = 'Team name is required.'
    return
  }
  loading.value = true
  errorMessage.value = ''

  try {
    const payload = { name: formCreate.name.trim(), timezone: formCreate.timezone?.trim() || null }
    const org = await orgStore.createOrg(payload)
    if (!org?.id) throw new Error('Failed to create team')

    await orgStore.seedSampleProject(org.id).catch(() => {})
    toastStore.push('Team created! 🎉', { type: 'success', duration: 3200 })
    trackEvent('team_created', {
      timezone: payload.timezone || 'browser',
    })

    await router.push({ name: 'team-projects', params: { orgId: org.id } })
    try {
      window.dispatchEvent(new CustomEvent('teams:first-run', { detail: { orgId: org.id } }))
    } catch {}
    visible.value = false
    emit('created', org)
  } catch (err: any) {
    const message = err?.response?.data?.error || err?.message || 'Failed to create team.'
    errorMessage.value = message
    toastStore.push(message, { type: 'error', duration: 3600 })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.teams-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 11, 19, 0.7);
  backdrop-filter: blur(14px);
  z-index: 2300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.teams-panel {
  width: min(440px, 100%);
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 32px 64px rgba(8, 11, 19, 0.55);
  color: #eef2ff;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 26px;
}

.teams-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.teams-header h2 {
  margin: 0 0 6px;
  font-size: 1.5rem;
}

.teams-header p {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(203, 213, 225, 0.85);
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.tab-strip {
  display: inline-flex;
  gap: 12px;
  background: rgba(79, 70, 229, 0.08);
  border-radius: 999px;
  padding: 6px;
  align-self: flex-start;
}

.tab {
  border: none;
  border-radius: 999px;
  padding: 6px 16px;
  font-weight: 600;
  cursor: pointer;
  color: rgba(224, 231, 255, 0.8);
  background: transparent;
  transition: all 0.18s ease;
}

.tab.active {
  background: linear-gradient(135deg, #5f3ef8, #8b5cf6);
  color: #fff;
  box-shadow: 0 12px 24px rgba(91, 53, 234, 0.45);
}

.tab.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tab-body {
  background: rgba(11, 19, 33, 0.55);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 20px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.92rem;
}

.field span {
  font-weight: 600;
  color: rgba(224, 231, 255, 0.95);
}

.field input {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 12px;
  font-size: 0.95rem;
  background: rgba(15, 23, 42, 0.7);
  color: #f8fafc;
}

.field input:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.45);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25);
}

.hint {
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.8rem;
}

.error {
  color: #fca5a5;
  font-size: 0.85rem;
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  background: linear-gradient(135deg, #5f3ef8, #8b5cf6);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 18px 32px rgba(91, 53, 234, 0.45);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 24px 42px rgba(91, 53, 234, 0.55);
}

.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.ghost {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(224, 231, 255, 0.85);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
}

.ghost:hover {
  background: rgba(255, 255, 255, 0.16);
}

.join-placeholder {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
  color: rgba(224, 231, 255, 0.9);
}

.teams-modal-fade-enter-active,
.teams-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.teams-modal-fade-enter-from,
.teams-modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .teams-panel {
    padding: 22px;
  }
}
</style>
