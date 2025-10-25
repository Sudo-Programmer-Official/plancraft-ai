<template>
  <section class="join-wrapper">
    <div class="join-card">
      <div v-if="loading" class="state">
        <span class="spinner" aria-hidden="true"></span>
        <p>Loading invite…</p>
      </div>

      <template v-else>
        <div v-if="error" class="state error">
          <h1>Invite unavailable</h1>
          <p>{{ error }}</p>
          <RouterLink class="link" to="/teams">Back to workspace picker</RouterLink>
        </div>

        <div v-else class="content">
          <header>
            <p class="eyebrow">Workspace invite</p>
            <h1>Join {{ invite?.orgName || 'this workspace' }}</h1>
            <p class="lead">
              You have been invited to collaborate as
              <strong>{{ roleLabel }}</strong>.
            </p>
          </header>

          <section class="details">
            <div class="detail">
              <span class="label">Workspace</span>
              <span>{{ invite?.orgName || 'Unknown workspace' }}</span>
            </div>
            <div class="detail">
              <span class="label">Role</span>
              <span>{{ roleLabel }}</span>
            </div>
            <div class="detail">
              <span class="label">Status</span>
              <span class="status-chip" :class="statusTone">{{ statusLabel }}</span>
            </div>
            <div class="detail" v-if="invite?.expiresAt">
              <span class="label">Expires</span>
              <span>{{ expiryDisplay }}</span>
            </div>
          </section>

          <p v-if="statusMessage" class="status-message" :class="statusTone">
            {{ statusMessage }}
          </p>

          <p v-if="acceptError" class="status-message error">
            {{ acceptError }}
          </p>

          <div class="actions">
            <button
              class="primary"
              :disabled="!canAccept"
              @click="handleAccept"
            >
              <span v-if="accepting" class="spinner small" aria-hidden="true"></span>
              {{ accepting ? 'Joining…' : 'Join workspace' }}
            </button>
            <RouterLink class="secondary" to="/dashboard">
              Return to dashboard
            </RouterLink>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchInvitePreview } from '@/services/inviteService'
import { useOrgStore } from '@/stores/orgStore'
import { trackEvent } from '@/services/analytics'

interface InvitePreview {
  orgId: string | null
  orgName: string
  role: string
  status: string
  expiresAt: Date | null
}

const route = useRoute()
const router = useRouter()
const orgStore = useOrgStore()

const invite = ref<InvitePreview | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const accepting = ref(false)
const acceptError = ref<string | null>(null)
const lastTrackedToken = ref<string | null>(null)

const token = computed(() => {
  const raw = route.query.token
  if (Array.isArray(raw)) return raw[0]?.trim() || ''
  return typeof raw === 'string' ? raw.trim() : ''
})

const expired = computed(() => {
  if (!invite.value?.expiresAt) return false
  return invite.value.expiresAt.getTime() < Date.now()
})

const statusLabel = computed(() => {
  const status = invite.value?.status || 'pending'
  if (status === 'pending') return expired.value ? 'Expired' : 'Pending'
  return status.charAt(0).toUpperCase() + status.slice(1)
})

const roleLabel = computed(() => {
  const role = invite.value?.role || 'member'
  return role.charAt(0).toUpperCase() + role.slice(1)
})

const statusMessage = computed(() => {
  if (!invite.value) return null
  if (expired.value) return 'This invite has expired. Ask an admin to resend it.'
  if (invite.value.status === 'revoked' || invite.value.status === 'cancelled') {
    return 'This invite has been revoked.'
  }
  if (invite.value.status === 'accepted') {
    return 'This invite has already been used.'
  }
  return null
})

const statusTone = computed(() => {
  if (!invite.value) return 'warning'
  if (invite.value.status === 'accepted') return 'info'
  if (invite.value.status === 'revoked' || invite.value.status === 'cancelled') return 'error'
  if (expired.value) return 'warning'
  return 'success'
})

const expiryDisplay = computed(() => {
  if (!invite.value?.expiresAt) return ''
  return invite.value.expiresAt.toLocaleString()
})

const canAccept = computed(() => {
  if (!invite.value) return false
  if (accepting.value) return false
  if (invite.value.status !== 'pending') return false
  if (expired.value) return false
  return true
})

async function handleAccept() {
  if (!token.value) {
    acceptError.value = 'Missing invite token.'
    return
  }
  if (!canAccept.value) return

  accepting.value = true
  acceptError.value = null

  try {
    const result = await orgStore.acceptInvite(token.value, { source: 'public' })
    if (result?.orgId) {
      await router.replace(`/team/${result.orgId}`)
      return
    }
    await router.replace('/teams')
  } catch (err: any) {
    const message = extractErrorMessage(err) || 'Unable to join this workspace right now.'
    acceptError.value = message
    await reloadInvite()
  } finally {
    accepting.value = false
  }
}

async function reloadInvite() {
  if (!token.value) return
  loading.value = true
  try {
    const data = await fetchInvitePreview(token.value)
    invite.value = normalizeInvite(data)
  } catch {
    // Keep existing invite/error state when refresh fails after join attempt.
  } finally {
    loading.value = false
  }
}

async function loadInvite() {
  loading.value = true
  error.value = null
  acceptError.value = null
  invite.value = null

  const value = token.value
  if (!value) {
    error.value = 'Missing invite token.'
    loading.value = false
    return
  }

  try {
    const data = await fetchInvitePreview(value)
    invite.value = normalizeInvite(data)
    if (lastTrackedToken.value !== value) {
      trackEvent('invite_viewed', {
        orgId: invite.value?.orgId || null,
        status: invite.value?.status || 'unknown',
        source: 'public',
      })
      lastTrackedToken.value = value
    }
  } catch (err: any) {
    error.value = friendlyLoadError(err)
  } finally {
    loading.value = false
  }
}

function normalizeInvite(data: any): InvitePreview {
  return {
    orgId: data?.orgId || null,
    orgName: data?.orgName || 'Unknown workspace',
    role: (data?.role || 'member').toString().toLowerCase(),
    status: (data?.status || 'pending').toString().toLowerCase(),
    expiresAt: parseDate(data?.expiresAt),
  }
}

function parseDate(raw: any): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return raw
  if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const seconds = raw?._seconds ?? raw?.seconds
  const milliseconds = raw?._nanoseconds ?? raw?.nanoseconds
  if (typeof seconds === 'number') {
    const ms = seconds * 1000 + (typeof milliseconds === 'number' ? Math.floor(milliseconds / 1_000_000) : 0)
    const parsed = new Date(ms)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof raw?.toDate === 'function') {
    try {
      const converted = raw.toDate()
      return converted instanceof Date ? converted : null
    } catch {
      return null
    }
  }
  return null
}

function extractErrorMessage(err: any): string | null {
  if (!err) return null
  if (typeof err?.response?.data?.error === 'string') return err.response.data.error
  if (typeof err?.message === 'string') return err.message
  return null
}

function friendlyLoadError(err: any): string {
  const message = extractErrorMessage(err) || ''
  if (message.includes('404')) return 'This invite could not be found or has already been used.'
  if (message.includes('401')) return 'You need to sign in before accepting this invite.'
  return 'We were unable to load this invite. Refresh the page or request a new link.'
}

onMounted(loadInvite)

watch(
  () => token.value,
  (next, prev) => {
    if (next && next !== prev) loadInvite()
  },
)
</script>

<style scoped>
.join-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.join-card {
  width: min(520px, 100%);
  border-radius: 28px;
  padding: 48px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 60px rgba(8, 15, 35, 0.45);
  backdrop-filter: blur(18px);
  color: #e2e8f0;
}

.state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
  color: #cbd5f5;
  font-size: 1.05rem;
}

.state.error h1 {
  font-size: 1.5rem;
  margin: 0;
  color: #fca5a5;
}

.state.error p {
  margin: 0;
}

.link {
  margin-top: 8px;
  color: #a5b4fc;
  text-decoration: underline;
}

.spinner {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 4px solid rgba(148, 163, 184, 0.25);
  border-top-color: rgba(148, 163, 184, 0.9);
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 18px;
  height: 18px;
  border-width: 3px;
  margin-right: 6px;
}

.content header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}

.content h1 {
  margin: 0;
  font-size: 2rem;
  color: #f8fafc;
}

.content .lead {
  margin: 0;
  color: rgba(226, 232, 240, 0.85);
  font-size: 1.05rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
}

.details {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.detail {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 0.95rem;
}

.label {
  color: rgba(148, 163, 184, 0.8);
}

.status-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  text-transform: capitalize;
}

.status-message {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  border: 1px solid transparent;
}

.status-message.success {
  background: rgba(74, 222, 128, 0.08);
  border-color: rgba(74, 222, 128, 0.35);
  color: #bbf7d0;
}

.status-message.info {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.35);
  color: #bfdbfe;
}

.status-message.warning {
  background: rgba(250, 204, 21, 0.13);
  border-color: rgba(250, 204, 21, 0.35);
  color: #facc15;
}

.status-message.error {
  background: rgba(248, 113, 113, 0.13);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fecaca;
}

.status-chip.success {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
}

.status-chip.info {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
}

.status-chip.warning {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
}

.status-chip.error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(120deg, #6366f1, #8b5cf6);
  color: #f8fafc;
  border: none;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(99, 102, 241, 0.35);
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.secondary {
  display: inline-flex;
  justify-content: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: rgba(226, 232, 240, 0.85);
  text-decoration: none;
  transition: border-color 160ms ease, color 160ms ease;
}

.secondary:hover {
  border-color: rgba(226, 232, 240, 0.45);
  color: #f8fafc;
}

@media (max-width: 640px) {
  .join-card {
    padding: 28px 22px;
    border-radius: 24px;
  }

  .content h1 {
    font-size: 1.65rem;
  }

  .detail {
    flex-direction: column;
    align-items: flex-start;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
