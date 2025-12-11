<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Workspaces</p>
          <h1 class="text-3xl font-bold">Your universes inside PlanCraft</h1>
          <p class="text-slate-300 max-w-3xl text-sm sm:text-base">
            Switch contexts without losing focus. Every workspace keeps its own tasks, drafts, events, and AI memory.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-sm font-semibold"
            @click="refresh"
          >
            Refresh
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold shadow-lg shadow-indigo-900/40"
            @click="openCreate"
          >
            + Create workspace
          </button>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-4">
          <div
            v-if="!workspaces.length && workspaceStore.loading"
            class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400"
          >
            Loading your workspaces…
          </div>

          <div
            v-else-if="!workspaces.length"
            class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 space-y-3 text-slate-300"
          >
            <h3 class="text-lg font-semibold text-slate-100">No workspaces yet</h3>
            <p class="text-sm text-slate-400">
              Create your first workspace to keep tasks, drafts, and reminders grouped by a theme.
            </p>
            <button
              class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
              @click="openCreate"
            >
              Start with “Personal”
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <article
              v-for="ws in workspaces"
              :key="ws.id"
              class="rounded-2xl border bg-slate-900/70 p-4 space-y-3 transition hover:-translate-y-0.5"
              :class="workspaceCardClass(ws)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">{{ ws.icon || '📦' }}</span>
                  <div>
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

              <div class="flex items-center gap-3 text-[12px] text-slate-400">
                <span>Last opened: {{ formatDate(ws.lastOpenedAt || ws.updatedAt || ws.createdAt) }}</span>
                <span>•</span>
                <span>Theme: {{ ws.color }}</span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-sm font-semibold hover:bg-indigo-500"
                  :disabled="activeWorkspaceId === ws.id"
                  @click="switchWorkspace(ws.id)"
                >
                  {{ activeWorkspaceId === ws.id ? 'Current workspace' : 'Switch here' }}
                </button>
                <button
                  class="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:border-indigo-400"
                  @click="editWorkspace(ws)"
                >
                  Edit
                </button>
              </div>
            </article>
          </div>
        </div>

        <aside class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-4 h-fit">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl">
              {{ activeWorkspace?.icon || '📦' }}
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Active</p>
              <p class="text-lg font-semibold">{{ activeWorkspace?.name || 'Personal' }}</p>
              <p class="text-xs text-slate-400">Data is scoped to this workspace.</p>
            </div>
          </div>
          <ul class="space-y-2 text-sm text-slate-300">
            <li class="flex items-start gap-2">
              <span>✅</span>
              <span>Planner tasks save to <code class="text-indigo-200">/workspaces/{{ activeWorkspaceId || '...' }}/tasks</code></span>
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
          <button
            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:border-indigo-400"
            @click="openCreate"
          >
            + New workspace
          </button>
        </aside>
      </section>
    </div>

    <el-dialog
      v-model="createOpen"
      width="480px"
      :close-on-click-modal="false"
      class="workspace-dialog"
      modal-class="workspace-dialog-overlay"
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '@/stores/workspaceStore'

const workspaceStore = useWorkspaceStore()
const createOpen = ref(false)
const saving = ref(false)
const editingId = ref(null)
const form = reactive({
  name: '',
  icon: '📦',
  color: 'indigo',
  description: '',
  workspaceType: 'personal',
})

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

function typeLabel(value) {
  const found = workspaceTypes.find((t) => t.value === value)
  return found ? found.label : 'Personal'
}

onMounted(() => {
  workspaceStore.init()
})

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
</script>

<style scoped>
:global(.workspace-dialog .el-overlay-dialog) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

:global(.workspace-dialog .el-dialog) {
  background: radial-gradient(circle at 20% 20%, #0f172a 0%, #0b1220 40%, #0b1020 100%);
  color: #e5e7eb;
  border-radius: 18px;
  border: 1px solid rgba(99, 102, 241, 0.35);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);
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
