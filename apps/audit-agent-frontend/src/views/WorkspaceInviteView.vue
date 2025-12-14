<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-10 text-slate-50">
    <div class="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 space-y-5 shadow-2xl shadow-indigo-950/30">
      <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Workspace invite</p>
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-2xl">
          {{ workspace?.icon || '📦' }}
        </div>
        <div>
          <h1 class="text-2xl font-semibold">
            {{ workspace?.name ? `Join ${workspace.name}` : 'Checking invite…' }}
          </h1>
          <p class="text-sm text-slate-400">
            Access and permissions are scoped strictly to this workspace.
          </p>
        </div>
      </div>

      <div v-if="loading" class="text-sm text-slate-300">Verifying your invite…</div>
      <div v-else-if="error" class="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
        {{ error }}
      </div>
      <div v-else class="space-y-4">
        <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm text-slate-100">You’ve been invited to {{ workspace?.name || 'this workspace' }}</p>
            <span class="px-2 py-1 text-[11px] rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-100">
              {{ roleLabel(invite?.role) }}
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Sent to: {{ invite?.email || 'your email' }} · Expires {{ formatDate(invite?.expires_at) }}
          </p>
          <p v-if="inviter?.name || inviter?.email" class="text-xs text-slate-400">
            Invited by: {{ inviter?.name || inviter?.email }}
          </p>
        </div>

        <div v-if="accepted" class="text-emerald-200 text-sm bg-emerald-500/10 border border-emerald-400/40 rounded-xl p-3">
          You’re in! We switched you to {{ workspace?.name || 'this workspace' }}.
        </div>
        <div v-else class="space-y-3">
          <template v-if="emailMismatch">
            <div class="text-sm text-amber-100 bg-amber-500/10 border border-amber-400/40 rounded-xl p-3">
              You’re signed in as {{ userEmail || 'another account' }}, but this invite is for {{ invitedEmail || 'a different email' }}.
            </div>
            <button
              class="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
              @click="switchAccount"
            >
              Switch account to join
            </button>
          </template>
          <template v-else>
            <button
              class="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="acceptLoading || inviteInactive"
              @click="isAuthenticated ? handleAccept() : goToLogin()"
            >
              {{ isAuthenticated ? (acceptLoading ? 'Joining…' : 'Accept invite') : 'Sign in to join' }}
            </button>
            <button
              v-if="!isAuthenticated"
              class="w-full px-4 py-3 rounded-xl border border-slate-700 text-sm font-semibold hover:border-indigo-300/60"
              @click="goToSignup"
            >
              Create an account
            </button>
          </template>
          <p class="text-xs text-slate-400">
            We’ll switch your active workspace once you accept. Only admins can invite or remove members. If you sign in first, we’ll bring you back here automatically.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInviteDetails, acceptInvite } from '@/services/workspaceService'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const token = computed(() => route.params?.token)
const invite = ref(null)
const workspace = ref(null)
const inviter = ref(null)
const loading = ref(true)
const acceptLoading = ref(false)
const error = ref('')
const accepted = ref(false)

const isAuthenticated = computed(() => !!authStore?.user)
const userEmail = computed(() => authStore?.user?.email || '')
const invitedEmail = computed(() => (invite.value?.email || invite.value?.emailLower || '').toString().toLowerCase())
const emailMismatch = computed(() => isAuthenticated.value && invitedEmail.value && userEmail.value.toLowerCase() !== invitedEmail.value)
const inviteInactive = computed(() => {
  const status = String(invite.value?.status || '').toLowerCase()
  return ['expired', 'revoked', 'accepted'].includes(status)
})

onMounted(() => {
  loadInvite()
})

watch(
  () => ({
    authed: isAuthenticated.value,
    inviteLoaded: !loading.value && !!invite.value,
    inactive: inviteInactive.value,
    mismatch: emailMismatch.value,
  }),
  (state) => {
    if (state.authed && state.inviteLoaded && !state.inactive && !state.mismatch && !accepted.value && !acceptLoading.value) {
      handleAccept({ auto: true })
    }
  },
)

async function loadInvite() {
  if (!token.value) {
    error.value = 'Missing invite token'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await getInviteDetails(token.value)
    invite.value = data?.invite || null
    workspace.value = data?.workspace || null
    inviter.value = data?.inviter || null
    if (data?.invite?.email && !invitedEmail.value && typeof data.invite.email === 'string') {
      // normalize computed later
    }
    const status = String(invite.value?.status || '').toLowerCase()
    if (status === 'expired') error.value = 'This invite has expired.'
    else if (status === 'revoked') error.value = 'This invite was revoked.'
    else if (status === 'accepted') error.value = 'This invite was already accepted.'
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'Invite not found'
  } finally {
    loading.value = false
  }
}

async function handleAccept(options = {}) {
  const auto = options?.auto === true
  if (!isAuthenticated.value) {
    goToLogin()
    return
  }
  if (!token.value) return
  acceptLoading.value = true
  error.value = ''
  try {
    const result = await acceptInvite(token.value)
    accepted.value = true
    await workspaceStore.refresh()
    if (result?.workspace?.id) {
      await workspaceStore.setActive(result.workspace.id)
    }
    ElMessage.success(`You're now part of ${result?.workspace?.name || 'this workspace'}`)
    await router.push('/workspaces')
  } catch (err) {
    const status = err?.response?.status
    if (status === 403 && String(err?.response?.data?.error || '').toLowerCase().includes('different email')) {
      error.value = 'Invite is addressed to a different email'
    } else if (auto && (status === 410 || status === 404)) {
      error.value = err?.response?.data?.error || err?.message || 'Invite not available'
    } else if (status === 401) {
      error.value = 'Sign in to accept this invite.'
    } else {
      error.value = err?.response?.data?.error || err?.message || 'Failed to accept invite'
    }
  } finally {
    acceptLoading.value = false
  }
}

function goToLogin() {
  try {
    localStorage.setItem('postLoginRedirect', route.fullPath)
  } catch {}
  router.push({ path: '/login', query: { redirect: route.fullPath, email: invitedEmail.value || undefined } })
}

function goToSignup() {
  try {
    localStorage.setItem('postLoginRedirect', route.fullPath)
  } catch {}
  router.push({ path: '/signup', query: { redirect: route.fullPath, email: invitedEmail.value || undefined } })
}

async function switchAccount() {
  try {
    await authStore.signOut?.()
  } catch {}
  goToLogin()
}

function roleLabel(role) {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'admin') return 'Admin'
  if (normalized === 'editor') return 'Editor'
  return 'Viewer'
}

function formatDate(value) {
  try {
    if (!value) return 'soon'
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'soon'
  }
}
</script>
