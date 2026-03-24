<template>
  <div class="app-page-shell w-full max-w-full min-w-0 overflow-x-hidden box-border">
    <div class="app-page-frame w-full max-w-full min-w-0">
      <header class="app-page-hero flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full max-w-full min-w-0">
        <div class="space-y-2 min-w-0">
          <p class="app-page-eyebrow">Workspaces</p>
          <h1 class="app-page-title !text-[clamp(2rem,3vw,2.9rem)]">Your universes inside PlanCraft</h1>
          <p class="app-page-description max-w-3xl text-sm sm:text-base">
            Switch contexts without losing focus. Every workspace keeps its own tasks, drafts, events, and AI memory.
          </p>
        </div>
        <div class="app-page-toolbar min-w-0 w-full sm:w-auto">
          <button
            class="px-4 py-2 rounded-xl border border-white/10 bg-slate-950/35 hover:border-indigo-300/60 text-sm font-semibold w-full sm:w-auto transition"
            @click="refresh"
          >
            Refresh
          </button>
          <button
            v-if="canManageMembers && activeWorkspaceId"
            class="px-4 py-2 rounded-xl border border-indigo-300/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-sm font-semibold text-indigo-100 w-full sm:w-auto"
            :disabled="!canInvite"
            @click="openInviteModal()"
          >
            Share workspace
          </button>
          <button
            class="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-sm font-semibold shadow-lg shadow-indigo-950/35 w-full sm:w-auto transition"
            @click="openCreate"
          >
            + Create workspace
          </button>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3 w-full max-w-full min-w-0">
        <div class="lg:col-span-2 space-y-4 w-full max-w-full min-w-0">
          <div
            v-if="!workspaces.length && workspaceStore.loading"
            class="app-page-section text-slate-300"
          >
            Loading your workspaces…
          </div>

          <div
            v-else-if="!workspaces.length"
            class="app-page-empty space-y-3 text-slate-200"
          >
            <h3 class="text-lg font-semibold text-slate-100">No workspaces yet</h3>
            <p class="text-sm text-slate-400">
              Create your first workspace to keep tasks, drafts, and reminders grouped by a theme.
            </p>
            <button
              class="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-sm font-semibold text-white"
              @click="openCreate"
            >
              Start with “Personal”
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
            <article
              v-for="ws in workspaces"
              :key="ws.id"
              class="w-full max-w-full min-w-0 rounded-3xl border bg-slate-950/30 p-4 space-y-3 transition hover:-translate-y-0.5 overflow-hidden box-border shadow-lg shadow-slate-950/10"
              :class="workspaceCardClass(ws)"
            >
              <div class="flex items-start justify-between gap-2 min-w-0">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="text-2xl">{{ ws.icon || '📦' }}</span>
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold">{{ ws.name }}</h3>
                    <div class="flex items-center gap-2 text-[11px] text-indigo-200/90">
                      <span class="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40">
                        {{ typeLabel(ws.workspaceType) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 line-clamp-2">
                      {{ ws.description || 'Separate tasks, drafts, and AI memory for this focus area.' }}
                    </p>
                  </div>
                </div>
                <span
                  v-if="activeWorkspaceId === ws.id"
                  class="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                >
                  Active
                </span>
              </div>

              <div class="flex min-w-0 flex-wrap items-center gap-3 text-[12px] text-slate-400">
                <span>Last opened: {{ formatDate(ws.lastOpenedAt || ws.updatedAt || ws.createdAt) }}</span>
                <span>•</span>
                <span>Theme: {{ ws.color }}</span>
              </div>

              <div class="flex min-w-0 flex-wrap items-center gap-2 w-full">
                <button
                  class="flex-1 min-w-[160px] sm:min-w-0 px-3 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 w-full sm:w-auto"
                  :disabled="activeWorkspaceId === ws.id"
                  @click="switchWorkspace(ws.id)"
                >
                  {{ activeWorkspaceId === ws.id ? 'Current workspace' : 'Switch here' }}
                </button>
                <button
                  v-if="['admin', 'owner'].includes(ws.role)"
                  class="px-3 py-2 rounded-lg border border-indigo-300/60 text-sm text-indigo-100 hover:bg-indigo-600/10 w-full sm:w-auto"
                  @click="openInviteModal(ws)"
                >
                  Members
                </button>
                <button
                  class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-indigo-400 w-full sm:w-auto"
                  @click="editWorkspace(ws)"
                >
                  Edit
                </button>
              </div>
            </article>
          </div>
        </div>

        <aside class="app-page-section app-page-section--compact space-y-4 h-fit w-full max-w-full min-w-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl">
              {{ activeWorkspace?.icon || '📦' }}
            </div>
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Active</p>
              <p class="text-lg font-semibold">{{ activeWorkspace?.name || 'Personal' }}</p>
              <p class="text-xs text-slate-400">Data is scoped to this workspace.</p>
            </div>
          </div>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex items-start gap-2">
              <span>✅</span>
              <span class="break-words">Planner tasks save to <code class="text-indigo-200 break-all">/workspaces/{{ activeWorkspaceId || '...' }}/tasks</code></span>
            </li>
            <li class="flex items-start gap-2">
              <span>📝</span>
              <span>Napkin notes and drafts stay inside this workspace.</span>
            </li>
            <li class="flex items-start gap-2">
              <span>📅</span>
              <span>Leader/Creator boards respect the active workspace context.</span>
            </li>
          </ul>
          <div class="border border-white/10 rounded-2xl p-3 bg-slate-950/25 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Creator mode</p>
                <p class="text-[12px] text-slate-400">Content & repurposing tools for this workspace.</p>
              </div>
              <el-switch
                v-model="modeForm.creator"
                :disabled="!canEditModes || modesSaving"
                @change="modesDirty = true"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Leader mode</p>
                <p class="text-[12px] text-slate-400">Team dashboards, delegation, and summaries.</p>
              </div>
              <el-switch
                v-model="modeForm.leader"
                :disabled="!canEditModes || modesSaving"
                @change="modesDirty = true"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-slate-400">
                Admins control modes. Integrations can request enablement, but admins override.
              </p>
              <el-button
                size="small"
                type="primary"
                :disabled="!modesDirty || modesSaving || !canEditModes"
                :loading="modesSaving"
                @click="saveModes"
              >
                Save modes
              </el-button>
            </div>
          </div>
          <button
            class="w-full px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm hover:border-indigo-300/50 transition"
            @click="openCreate"
          >
            + New workspace
          </button>
        </aside>
      </section>

      <section id="workspace-members" class="pb-8 w-full max-w-full min-w-0">
        <div class="app-page-section space-y-4 w-full max-w-full min-w-0">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Members</p>
              <h2 class="text-xl font-semibold text-slate-100">
                Access for {{ activeWorkspace?.name || 'your workspace' }}
              </h2>
              <p class="text-sm text-slate-400">
                Only admins can invite or remove members. Roles stay scoped to this workspace.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="px-3 py-2 rounded-xl border border-white/10 text-sm hover:border-indigo-300/60 disabled:opacity-50 transition"
                :disabled="membersLoading || !activeWorkspaceId"
                @click="loadMembers()"
              >
                Refresh members
              </button>
              <button
                v-if="canManageMembers"
                class="px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-sm font-semibold hover:from-fuchsia-400 hover:to-indigo-400 text-white disabled:opacity-60"
                :disabled="!activeWorkspaceId || !canInvite"
                @click="openInviteModal()"
              >
                Invite
              </button>
            </div>
          </div>

          <div v-if="!activeWorkspaceId" class="app-page-empty text-sm">
            Select a workspace to manage its members.
          </div>
          <div v-else>
            <div v-if="membersError" class="text-rose-200 text-sm bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
              {{ membersError }}
            </div>
            <div v-else-if="membersLoading" class="text-slate-200 text-sm border border-white/10 rounded-2xl p-3 bg-slate-950/25">
              Loading members…
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="member in members"
                :key="member.userId"
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/10 rounded-2xl p-3 bg-slate-950/25 min-w-0"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold uppercase text-indigo-100">
                    {{ (member.name || member.email || 'M').slice(0, 2) }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-slate-100">
                      {{ member.name || member.email || 'Member' }}
                      <span v-if="member.userId === currentUserId" class="text-xs text-emerald-300 ml-1">(You)</span>
                    </p>
                    <p class="text-xs text-slate-400">
                      <span class="break-words">{{ member.email || 'No email on file' }}</span>
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 rounded-full text-[11px] bg-indigo-500/15 border border-indigo-400/40 text-indigo-100">
                    {{ roleLabel(member.role) }}
                  </span>
                  <template v-if="canManageMembers && member.userId !== currentUserId">
                    <select
                      class="bg-slate-900 border border-slate-700 text-sm rounded-lg px-2 py-1 text-slate-100"
                      :disabled="memberBusy[member.userId]"
                      :value="member.role"
                      @change="changeRole(member, $event.target.value)"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      class="text-sm px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-rose-400 hover:text-rose-200 disabled:opacity-60"
                      :disabled="memberBusy[member.userId]"
                      @click="removeWorkspaceMember(member)"
                    >
                      Remove
                    </button>
                  </template>
                </div>
              </div>
              <div v-if="!members.length" class="text-slate-400 text-sm border border-dashed border-slate-700 rounded-xl p-3">
                No members yet. Invite teammates to collaborate.
              </div>
            </div>

            <div v-if="!membersError && !membersLoading && canManageMembers" class="mt-6 space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-sm text-slate-300 font-medium">Pending invites</p>
                <span class="text-xs text-slate-400">{{ invites.length }} waiting</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="invite in invites"
                  :key="invite.id"
                  class="border border-slate-800 rounded-lg px-3 py-2 bg-slate-900/60 flex items-center justify-between min-w-0"
                >
                  <div class="min-w-0">
                    <p class="text-sm text-slate-100 break-words">{{ invite.email }}</p>
                    <p class="text-xs text-slate-400">
                      Role: {{ roleLabel(invite.role) }} · Expires
                      {{ formatDate(invite.expires_at || invite.expiresAt) }}
                    </p>
                  </div>
                  <span class="text-[11px] px-2 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-100">
                    {{ invite.status || 'pending' }}
                  </span>
                </div>
                <div v-if="!invites.length" class="text-slate-500 text-sm border border-dashed border-slate-700 rounded-lg px-3 py-2">
                  No pending invites.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="createOpen"
      width="480px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
      :style="dialogChrome"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-400">
            {{ editingId ? 'Edit workspace' : 'Create workspace' }}
          </p>
          <h3 class="text-lg font-semibold text-slate-100">
            {{ editingId ? 'Update the details for this space' : 'Give it a name, icon, and vibe' }}
          </h3>
        </div>
      </template>

      <div class="space-y-4">
        <label class="block">
          <span class="text-sm text-slate-200">Name</span>
          <input
            v-model="form.name"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="Personal, Startup, Thesis…"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm text-slate-200">Icon</span>
            <input
              v-model="form.icon"
              class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="🌿"
              maxlength="4"
            />
          </label>
          <div>
            <span class="text-sm text-slate-200">Theme</span>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="preset in colorPresets"
                :key="preset.value"
                type="button"
                class="w-9 h-9 rounded-lg border transition"
                :class="[
                  preset.class,
                  form.color === preset.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-indigo-300' : 'border-slate-700'
                ]"
                @click="form.color = preset.value"
                :aria-label="`Use ${preset.label} theme`"
              ></button>
            </div>
          </div>
        </div>

        <div>
          <span class="text-sm text-slate-200">Workspace type</span>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="type in workspaceTypes"
              :key="type.value"
              type="button"
              class="px-3 py-1.5 rounded-full border text-xs font-semibold transition"
              :class="form.workspaceType === type.value ? 'bg-indigo-600 text-white border-indigo-400' : 'border-slate-700 text-slate-300 hover:border-indigo-300/60'"
              @click="form.workspaceType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <label class="block">
          <span class="text-sm text-slate-200">Description (optional)</span>
          <textarea
            v-model="form.description"
            rows="2"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
            placeholder="What lives in this workspace?"
          ></textarea>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-slate-500"
            @click="closeCreate"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            :disabled="!canSave || saving"
            @click="saveWorkspace"
          >
            {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Create workspace' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="inviteOpen"
      width="420px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
      :style="dialogChrome"
    >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-400">Invite to {{ activeWorkspace?.name || 'workspace' }}</p>
          <h3 class="text-lg font-semibold text-slate-100">Add a teammate by email</h3>
        </div>
      </template>

      <div class="space-y-4">
        <label class="block">
          <span class="text-sm text-slate-200">Email</span>
          <input
            v-model="inviteForm.email"
            type="email"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder="teammate@example.com"
          />
        </label>
        <label class="block">
          <span class="text-sm text-slate-200">Role</span>
          <select
            v-model="inviteForm.role"
            class="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="editor">Editor (create & update)</option>
            <option value="admin">Admin (manage members)</option>
          </select>
        </label>

        <div
          v-if="inviteEmailStatus === 'failed'"
          class="text-xs text-amber-100 bg-amber-500/10 border border-amber-400/40 rounded-lg px-3 py-2"
        >
          Email failed — copy the invite link below and share directly.
          <span v-if="inviteEmailError">({{ inviteEmailError }})</span>
        </div>

        <div v-if="inviteLink" class="text-xs text-slate-200 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span class="truncate">{{ inviteLink }}</span>
          <button
            class="px-2 py-1 rounded-md border border-indigo-400/60 text-indigo-100 text-xs hover:bg-indigo-600/10"
            @click="copyInviteLink()"
          >
            Copy
          </button>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-slate-500"
            @click="inviteOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
            :disabled="inviteSending || !inviteForm.email"
            @click="sendInvite"
          >
            {{ inviteSending ? 'Sending…' : 'Send invite' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchWorkspaceMembers,
  removeMember,
  sendWorkspaceInvite,
  updateMemberRole,
} from '@/services/workspaceService'
import { canUseFeature } from '@/utils/entitlements'
import { copyText } from '@/utils/nativeUi'

const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const createOpen = ref(false)
const saving = ref(false)
const editingId = ref(null)
const dialogChrome = Object.freeze({
  background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
  color: '#e2e8f0',
  borderRadius: '0.5rem',
  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
})
const form = reactive({
  name: '',
  icon: '📦',
  color: 'indigo',
  description: '',
  workspaceType: 'personal',
})
const members = ref([])
const invites = ref([])
const membersLoading = ref(false)
const membersError = ref('')
const inviteOpen = ref(false)
const inviteSending = ref(false)
const inviteForm = reactive({ email: '', role: 'editor' })
const inviteLink = ref(null)
const inviteEmailStatus = ref(null)
const inviteEmailError = ref('')
const memberBusy = reactive({})

const colorPresets = [
  { value: 'indigo', class: 'bg-indigo-500/30 border-indigo-300/60', label: 'Indigo' },
  { value: 'emerald', class: 'bg-emerald-500/30 border-emerald-300/60', label: 'Emerald' },
  { value: 'amber', class: 'bg-amber-400/30 border-amber-200/60', label: 'Amber' },
  { value: 'pink', class: 'bg-pink-500/30 border-pink-300/60', label: 'Pink' },
  { value: 'cyan', class: 'bg-cyan-500/30 border-cyan-300/60', label: 'Cyan' },
  { value: 'slate', class: 'bg-slate-500/20 border-slate-300/40', label: 'Slate' },
]
const workspaceTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'project', label: 'Project' },
  { value: 'creator', label: 'Creator' },
  { value: 'student', label: 'Student' },
  { value: 'team', label: 'Team' },
]

const workspaces = computed(() => workspaceStore.workspaces || [])
const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || {})
const canSave = computed(() => !!form.name && form.name.trim().length > 1)
const activeRole = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const canManageMembers = computed(() => ['admin', 'owner'].includes(activeRole.value))
const canInvite = computed(() => canUseFeature(activeWorkspace.value, activeRole.value, 'invites'))
const currentUserId = computed(() => authStore?.user?.uid || null)
const canEditModes = computed(() => ['admin', 'owner'].includes(activeRole.value))
const modeForm = reactive({ creator: false, leader: false })
const modesDirty = ref(false)
const modesSaving = ref(false)

function typeLabel(value) {
  const found = workspaceTypes.find((t) => t.value === value)
  return found ? found.label : 'Personal'
}

function normalizeInvites(list = []) {
  const map = new Map()
  for (const inv of Array.isArray(list) ? list : []) {
    if (!inv || inv.status !== 'pending') continue
    const key = (inv.emailLower || inv.email || inv.id || '').trim().toLowerCase()
    const existing = map.get(key)
    if (!existing) {
      map.set(key || inv.id, inv)
      continue
    }
    const existingTs = new Date(existing.expires_at || existing.expiresAt || 0).getTime()
    const nextTs = new Date(inv.expires_at || inv.expiresAt || 0).getTime()
    if (nextTs > existingTs) map.set(key, inv)
  }
  return Array.from(map.values())
}

onMounted(() => {
  workspaceStore.init()
})

watch(
  () => workspaceStore.activeWorkspaceId,
  (id) => {
    if (!id) {
      members.value = []
      invites.value = []
      modeForm.creator = false
      modeForm.leader = false
      modesDirty.value = false
      return
    }
    loadMembers(id)
    const settings = activeWorkspace.value?.settings || {}
    modeForm.creator = !!settings.creatorModeEnabled
    modeForm.leader = !!settings.leaderModeEnabled
    modesDirty.value = false
  },
  { immediate: true },
)

watch(
  () => activeRole.value,
  (role) => {
    if (!workspaces.value.length) return
    if (['admin', 'owner'].includes(role) && activeWorkspaceId.value) {
      loadMembers(activeWorkspaceId.value)
    } else if (!['admin', 'owner'].includes(role)) {
      members.value = []
      invites.value = []
      membersError.value = role ? 'Only admins/owners can view members for this workspace.' : ''
    }
  },
)

function openCreate() {
  editingId.value = null
  createOpen.value = true
}

function closeCreate() {
  createOpen.value = false
  editingId.value = null
  form.name = ''
  form.description = ''
  form.icon = '📦'
  form.color = 'indigo'
  form.workspaceType = 'personal'
}

async function saveWorkspace() {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      icon: form.icon || '📦',
      color: form.color || 'indigo',
      description: form.description || '',
      workspaceType: form.workspaceType || 'personal',
    }
    if (editingId.value) {
      await workspaceStore.updateWorkspace(editingId.value, payload)
      await workspaceStore.refresh()
      ElMessage.success('Workspace updated')
    } else {
      await workspaceStore.createWorkspace(payload)
      ElMessage.success('Workspace created and activated')
    }
    closeCreate()
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to save workspace')
  } finally {
    saving.value = false
  }
}

async function saveModes() {
  if (!activeWorkspaceId.value || !canEditModes.value || modesSaving.value) return
  modesSaving.value = true
  try {
    await workspaceStore.applyWorkspaceSettings(activeWorkspaceId.value, {
      creatorModeEnabled: modeForm.creator,
      leaderModeEnabled: modeForm.leader,
    })
    modesDirty.value = false
    ElMessage.success('Workspace modes updated')
  } catch (err) {
    ElMessage.error(err?.message || 'Failed to update modes')
  } finally {
    modesSaving.value = false
  }
}

async function loadMembers(id = null) {
  const workspaceId = id || activeWorkspaceId.value
  if (!workspaceId) return
  if (!workspaces.value.length) return
  if (!['admin', 'owner'].includes(activeRole.value)) {
    members.value = []
    invites.value = []
    membersError.value = 'Only admins/owners can view members for this workspace.'
    return
  }
  membersLoading.value = true
  membersError.value = ''
  try {
    const { members: list, invites: pending } = await fetchWorkspaceMembers(workspaceId)
    members.value = list || []
    invites.value = normalizeInvites(pending || [])
  } catch (err) {
    members.value = []
    invites.value = []
    const status = err?.response?.status
    if (status === 403) {
      membersError.value = 'You need to be an admin/owner to view members for this workspace.'
    } else if (status === 400) {
      membersError.value = err?.response?.data?.error || 'workspaceId is required'
    } else {
      membersError.value = err?.response?.data?.error || err?.message || 'Failed to load members'
    }
  } finally {
    membersLoading.value = false
  }
}

function openInviteModal(ws = null) {
  if (!['admin', 'owner'].includes(activeRole.value)) {
    ElMessage.error('Only admins can invite members')
    return
  }
  if (ws?.id && ws.id !== activeWorkspaceId.value) {
    switchWorkspace(ws.id)
  }
  inviteForm.email = ''
  inviteForm.role = 'editor'
  inviteLink.value = null
  inviteEmailStatus.value = null
  inviteEmailError.value = ''
  inviteOpen.value = true
}

async function sendInvite() {
  if (!activeWorkspaceId.value) {
    ElMessage.error('Select a workspace first')
    return
  }
  if (!inviteForm.email) {
    ElMessage.error('Enter an email to invite')
    return
  }
  inviteForm.email = String(inviteForm.email).trim().toLowerCase()
  inviteEmailStatus.value = null
  inviteEmailError.value = ''
  inviteLink.value = null
  inviteSending.value = true
  try {
    const { invite, link, emailStatus, emailError, duplicate } = await sendWorkspaceInvite(
      activeWorkspaceId.value,
      inviteForm,
    )
    if (duplicate) {
      inviteEmailStatus.value = 'duplicate'
      inviteEmailError.value = emailError || 'Invite already pending for this email'
      ElMessage.warning(inviteEmailError.value)
      inviteSending.value = false
      return
    }
    inviteLink.value = link || null
    inviteEmailStatus.value = emailStatus || invite?.emailStatus || null
    inviteEmailError.value = emailError || invite?.emailError || ''
    if (invite) invites.value = normalizeInvites([...invites.value.filter((i) => i.id !== invite.id), invite])
    if (inviteEmailStatus.value === 'failed') {
      ElMessage.warning('Email failed — copy the invite link below.')
    } else if (link) {
      try {
        const copied = await copyText(link)
        if (!copied) throw new Error('Clipboard unavailable')
        ElMessage.success('Invite link copied')
      } catch {
        ElMessage.success('Invite created')
      }
    } else {
      ElMessage.success('Invite sent')
    }
    await loadMembers()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to send invite')
  } finally {
    inviteSending.value = false
  }
}

async function copyInviteLink(link = null) {
  const value = link || inviteLink.value
  if (!value) return
  try {
    const copied = await copyText(value)
    if (!copied) throw new Error('Clipboard unavailable')
    ElMessage.success('Invite link copied')
  } catch {
    ElMessage.success('Invite link ready')
  }
}

async function changeRole(member, role) {
  if (!activeWorkspaceId.value || !member?.userId) return
  if (member.userId === currentUserId.value) {
    ElMessage.error('You cannot change your own role')
    return
  }
  memberBusy[member.userId] = true
  try {
    const updated = await updateMemberRole(activeWorkspaceId.value, member.userId, role)
    members.value = members.value.map((m) => (m.userId === member.userId ? { ...m, ...updated } : m))
    ElMessage.success('Role updated')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to update role')
  } finally {
    memberBusy[member.userId] = false
  }
}

async function removeWorkspaceMember(member) {
  if (!activeWorkspaceId.value || !member?.userId) return
  if (member.userId === currentUserId.value) {
    ElMessage.error('You cannot remove yourself')
    return
  }
  memberBusy[member.userId] = true
  try {
    await removeMember(activeWorkspaceId.value, member.userId)
    members.value = members.value.filter((m) => m.userId !== member.userId)
    ElMessage.success('Member removed')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to remove member')
  } finally {
    memberBusy[member.userId] = false
  }
}

function formatDate(value) {
  try {
    if (!value) return 'Just now'
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Just now'
  }
}

async function switchWorkspace(id) {
  if (!id) return
  await workspaceStore.setActive(id)
  ElMessage.success('Switched workspace')
}

function editWorkspace(ws) {
  if (!ws) return
  editingId.value = ws.id
  createOpen.value = true
  form.name = ws.name || ''
  form.icon = ws.icon || '📦'
  form.color = ws.color || 'indigo'
  form.description = ws.description || ''
  form.workspaceType = ws.workspaceType || 'personal'
}

async function refresh() {
  try {
    await workspaceStore.refresh()
  } catch {}
}

function workspaceCardClass(ws) {
  const color = ws?.color || 'indigo'
  const base = {
    indigo: 'border-indigo-400/40 bg-indigo-900/20',
    emerald: 'border-emerald-400/40 bg-emerald-900/15',
    amber: 'border-amber-400/40 bg-amber-900/10',
    pink: 'border-pink-400/40 bg-pink-900/15',
    cyan: 'border-cyan-400/40 bg-cyan-900/15',
    slate: 'border-slate-700 bg-slate-900/70',
  }
  const hover = 'hover:border-indigo-400/80 hover:shadow-lg hover:shadow-indigo-900/30'
  return `${base[color] || base.indigo} ${hover}`
}

function roleLabel(role) {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'editor') return 'Editor'
  if (normalized === 'owner') return 'Owner'
  if (normalized === 'admin') return 'Admin'
  return 'Viewer'
}
</script>

<style scoped>
:global(.workspace-dialog .el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

:global(.workspace-dialog .el-dialog) {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  color: #e2e8f0;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
}

:global(.workspace-dialog .el-dialog__header) {
  margin: 0;
  padding: 18px 22px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

:global(.workspace-dialog .el-dialog__title) {
  letter-spacing: 0.08em;
  color: #c7d2fe;
  font-weight: 700;
  font-size: 0.85rem;
}

:global(.workspace-dialog .el-dialog__headerbtn) {
  top: 16px;
  right: 16px;
}

:global(.workspace-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #cbd5e1;
}

:global(.workspace-dialog .el-dialog__body) {
  padding: 18px 22px 8px;
  background: transparent;
}

:global(.workspace-dialog input),
:global(.workspace-dialog textarea),
:global(.workspace-dialog .el-input__wrapper),
:global(.workspace-dialog .el-input__inner),
:global(.workspace-dialog .el-textarea__inner) {
  background-color: #0f172a !important;
  border: 1px solid rgba(148, 163, 184, 0.25) !important;
  color: #e5e7eb !important;
  box-shadow: none !important;
}

:global(.workspace-dialog input::placeholder),
:global(.workspace-dialog textarea::placeholder),
:global(.workspace-dialog .el-input__inner::placeholder),
:global(.workspace-dialog .el-textarea__inner::placeholder) {
  color: rgba(148, 163, 184, 0.7) !important;
}

:global(.workspace-dialog .el-dialog__footer) {
  padding: 12px 22px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

:global(.workspace-dialog-overlay) {
  background-color: rgba(8, 15, 31, 0.78);
  backdrop-filter: blur(6px);
}
</style>
