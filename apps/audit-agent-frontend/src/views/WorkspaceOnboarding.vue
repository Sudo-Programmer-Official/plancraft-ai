<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <header class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300">Teams onboarding</p>
          <h1 class="text-3xl sm:text-4xl font-bold mt-2">Create your team workspace</h1>
          <p class="text-indigo-200 mt-2">
            Invite teammates, set roles, and land in a ready-to-use workspace with smooth task loading.
          </p>
        </div>
        <RouterLink
          to="/workspaces"
          class="inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white underline decoration-indigo-400/70"
        >
          Back to workspaces
          <span aria-hidden="true">↗</span>
        </RouterLink>
      </header>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <ol class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <li
            v-for="(s, idx) in steps"
            :key="s.id"
            class="flex items-center gap-3 rounded-xl px-3 py-2 border"
            :class="currentStep === idx ? 'border-indigo-400/70 bg-indigo-500/10' : 'border-white/10 bg-white/5'"
          >
            <span
              class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              :class="currentStep === idx ? 'bg-indigo-500 text-white' : 'bg-white/10 text-indigo-100'"
            >
              {{ idx + 1 }}
            </span>
            <div class="text-sm">
              <p class="font-semibold">{{ s.title }}</p>
              <p class="text-indigo-200/80">{{ s.caption }}</p>
            </div>
          </li>
        </ol>

        <!-- Step 1 -->
        <section v-if="currentStep === 0" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <label class="md:col-span-2 space-y-2">
              <span class="text-sm text-indigo-200/80">Workspace name</span>
              <input
                v-model="workspaceName"
                type="text"
                placeholder="E.g. Startup Crew"
                class="w-full rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              />
            </label>
            <div class="space-y-2">
              <span class="text-sm text-indigo-200/80">Icon</span>
              <div class="flex items-center gap-2">
                <input
                  v-model="workspaceIcon"
                  type="text"
                  maxlength="2"
                  class="w-20 text-center rounded-xl bg-slate-900/70 border border-white/10 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-2xl"
                />
                <div class="flex gap-2">
                  <button
                    v-for="emoji in emojiOptions"
                    :key="emoji"
                    class="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xl"
                    @click="workspaceIcon = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button
              class="px-5 py-3 rounded-xl bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition shadow-lg"
              :disabled="creating"
              @click="createWorkspace"
            >
              {{ creating ? 'Creating…' : 'Create workspace' }}
            </button>
            <p class="text-sm text-indigo-200/90">
              You’ll be set as <strong>Owner</strong>. Workspaces are team-scoped and require sign-in.
            </p>
          </div>
        </section>

        <!-- Step 2 -->
        <section v-else-if="currentStep === 1" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold">Invite teammates</h2>
              <p class="text-sm text-indigo-200/80">Choose roles to keep access calm and controlled.</p>
            </div>
            <button
              type="button"
              class="text-sm text-indigo-200 hover:text-white underline decoration-indigo-300/70"
              @click="skipInvites"
            >
              Skip for now
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(invite, idx) in inviteRows"
              :key="idx"
              class="grid gap-3 md:grid-cols-7 items-center bg-slate-900/60 border border-white/10 rounded-xl p-3"
            >
              <input
                v-model="invite.email"
                type="email"
                placeholder="teammate@email.com"
                class="md:col-span-4 rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              />
              <select
                v-model="invite.role"
                class="md:col-span-2 rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="button"
                class="text-sm text-rose-200 hover:text-rose-100"
                :disabled="inviteRows.length === 1"
                @click="removeInvite(idx)"
              >
                Remove
              </button>
              <p v-if="invite.status" class="md:col-span-7 text-sm">
                <span
                  :class="invite.status === 'sent' ? 'text-emerald-300' : 'text-rose-200'"
                >
                  {{ invite.status === 'sent' ? 'Invite sent' : invite.error || 'Send failed' }}
                </span>
              </p>
            </div>
            <button
              type="button"
              class="text-sm text-indigo-200 hover:text-white underline decoration-indigo-300/70"
              @click="addInviteRow"
            >
              + Add another
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              class="px-5 py-3 rounded-xl bg-white text-indigo-800 font-semibold hover:bg-slate-100 transition shadow-lg"
              :disabled="sendingInvites || !createdWorkspaceId"
              @click="sendInvites"
            >
              {{ sendingInvites ? 'Sending…' : 'Send invites' }}
            </button>
            <p class="text-sm text-indigo-200/90">Skip anytime — you can invite from the workspace later.</p>
          </div>
          <p v-if="inviteResult" class="text-sm text-indigo-200/90">{{ inviteResult }}</p>
        </section>

        <!-- Step 3 -->
        <section v-else class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold">Jumpstart with a template</h2>
              <p class="text-sm text-indigo-200/80">Create starter tasks or start empty.</p>
            </div>
            <button
              class="text-sm text-indigo-200 hover:text-white underline decoration-indigo-300/70"
              @click="finishToApp"
            >
              Skip and go to workspace →
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <article
              v-for="tpl in templateOptions"
              :key="tpl.key"
              class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 hover:border-indigo-300/60 transition"
              :class="tpl.recommended ? 'ring-2 ring-indigo-400/50' : ''"
            >
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm uppercase tracking-[0.2em] text-indigo-300/80">Template</p>
                  <h3 class="text-xl font-semibold">{{ tpl.title }}</h3>
                </div>
                <span
                  v-if="tpl.recommended"
                  class="text-[11px] px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-300/50 text-indigo-100"
                  >Recommended</span
                >
              </div>
              <p class="text-indigo-200/90 text-sm">{{ tpl.description }}</p>
              <ul v-if="tpl.tasks?.length" class="space-y-1 text-sm text-indigo-100/90">
                <li v-for="task in tpl.tasks" :key="task.title">✅ {{ task.title }}</li>
              </ul>
              <button
                class="px-4 py-2 rounded-lg bg-white/90 text-indigo-800 font-semibold hover:bg-white"
                @click="applyTemplate(tpl)"
                :disabled="applyingTemplate === tpl.key"
              >
                {{ applyingTemplate === tpl.key ? 'Preparing…' : 'Use this template' }}
              </button>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { sendWorkspaceInvite } from '@/services/workspaceService'
import { useTasks } from '@/composables/useTasks'
import { EMPTY_TEMPLATE, TEAM_TEMPLATES } from '@/utils/teamTemplates'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const { addTask } = useTasks()

const steps = [
  { id: 'basics', title: 'Basics', caption: 'Name & icon' },
  { id: 'invites', title: 'Invite teammates', caption: 'Roles & access' },
  { id: 'templates', title: 'Templates', caption: 'Start strong' },
]
const currentStep = ref(0)
const workspaceName = ref('Team Workspace')
const workspaceIcon = ref('🧭')
const creating = ref(false)
const createdWorkspace = ref(null)

const inviteRows = ref([{ email: '', role: 'editor', status: null, error: '' }])
const sendingInvites = ref(false)
const inviteResult = ref('')

const applyingTemplate = ref('')
const emojiOptions = ['📦', '🚀', '✨', '🧠']
const templateOptions = computed(() => [...TEAM_TEMPLATES, EMPTY_TEMPLATE])

const createdWorkspaceId = computed(() => createdWorkspace.value?.id || workspaceStore.activeWorkspaceId)
const planIntent = computed(() => (typeof route.query.plan === 'string' ? route.query.plan : 'starter'))

onMounted(() => {
  const isGuest =
    authStore?.isGuest === true || authStore?.guest === true || authStore?.user?.mode === 'guest'
  if (isGuest) {
    router.replace({ path: '/login', query: { mode: 'team', next: route.fullPath } })
  }
})

function addInviteRow() {
  inviteRows.value.push({ email: '', role: 'editor', status: null, error: '' })
}

function removeInvite(index) {
  if (inviteRows.value.length === 1) return
  inviteRows.value.splice(index, 1)
}

async function createWorkspace() {
  if (creating.value) return
  if (!workspaceName.value || !workspaceName.value.trim()) {
    ElMessage.error('Workspace name is required')
    return
  }
  creating.value = true
  try {
    const payload = {
      name: workspaceName.value.trim(),
      icon: workspaceIcon.value || '📦',
      workspaceType: 'team',
      description: 'Team workspace',
      plan: planIntent.value,
    }
    const ws = await workspaceStore.createWorkspace(payload)
    createdWorkspace.value = ws
    currentStep.value = 1
    ElMessage.success('Workspace created. You are set as Owner.')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to create workspace')
  } finally {
    creating.value = false
  }
}

function skipInvites() {
  currentStep.value = 2
}

async function sendInvites() {
  if (!createdWorkspaceId.value) {
    ElMessage.error('Create a workspace first')
    return
  }
  const seen = new Set()
  const toSend = inviteRows.value
    .map((i) => ({
      ...i,
      email: i.email ? i.email.trim().toLowerCase() : '',
    }))
    .filter((i) => {
      if (!i.email) return false
      if (seen.has(i.email)) return false
      seen.add(i.email)
      return true
    })
  if (!toSend.length) {
    currentStep.value = 2
    return
  }
  sendingInvites.value = true
  inviteResult.value = ''
  const results = []
  for (const invite of toSend) {
    invite.status = null
    invite.error = ''
  }
  for (const invite of toSend) {
    try {
      await sendWorkspaceInvite(createdWorkspaceId.value, {
        email: invite.email.trim(),
        role: invite.role || 'editor',
      })
      invite.status = 'sent'
      results.push('sent')
    } catch (err) {
      invite.status = 'failed'
      invite.error = err?.response?.data?.error || err?.message || 'Failed'
      results.push('failed')
    }
  }
  inviteResult.value = results.includes('sent')
    ? 'Invites processed. You can add more later.'
    : 'No invites were sent. You can retry later.'
  sendingInvites.value = false
  currentStep.value = 2
}

async function applyTemplate(tpl) {
  if (!createdWorkspaceId.value) return ElMessage.error('Create a workspace first')
  applyingTemplate.value = tpl.key
  try {
    await workspaceStore.setActive(createdWorkspaceId.value)
    if (tpl.tasks?.length) {
      for (const [idx, task] of tpl.tasks.entries()) {
        await addTask({
          title: task.title,
          details: task.details,
          category: task.category,
          order: -1 * (idx + 1),
          source: 'team_template',
          metadata: { templateKey: tpl.key, starter: true },
        })
      }
    }
    finishToApp()
  } catch (err) {
    ElMessage.error(err?.message || 'Could not apply template')
  } finally {
    applyingTemplate.value = ''
  }
}

function finishToApp() {
  if (!createdWorkspaceId.value) return
  router.push({ path: '/app', query: { workspaceId: createdWorkspaceId.value } })
}
</script>
