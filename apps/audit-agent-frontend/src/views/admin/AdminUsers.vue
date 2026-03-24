<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Users</h2>
      <div class="flex items-center gap-2">
        <select v-model="filterRole" @change="refresh()" class="rounded bg-gray-800 px-3 py-1 text-sm text-white">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select v-model="filterPlan" @change="refresh()" class="rounded bg-gray-800 px-3 py-1 text-sm text-white">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="team">Team</option>
        </select>
        <button @click="refresh" class="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600">Refresh</button>
      </div>
    </div>

    <div class="overflow-auto rounded border border-white/10">
      <table class="min-w-full text-sm">
        <thead class="bg-white/5">
          <tr>
            <th class="px-3 py-2 text-left">Name</th>
            <th class="px-3 py-2 text-left">Email</th>
            <th class="px-3 py-2 text-left">Role</th>
            <th class="px-3 py-2 text-left">Plan</th>
            <th class="px-3 py-2 text-left">Override</th>
            <th class="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" class="border-t border-white/10">
            <td class="px-3 py-2">{{ u.name || '-' }}</td>
            <td class="px-3 py-2">{{ u.email || '-' }}</td>
            <td class="px-3 py-2">{{ u.role }}</td>
            <td class="px-3 py-2">
              <select
                :disabled="updatingPlanId === u.id"
                :value="u.plan || 'free'"
                class="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white"
                @change="(e) => onChangePlan(u, e.target.value)"
              >
                <option value="free">free</option>
                <option value="premium">premium</option>
                <option value="team">team</option>
              </select>
            </td>
            <td class="px-3 py-2">
              <div v-if="u.accessOverride" class="space-y-1 text-xs text-slate-300">
                <div>
                  <span class="font-semibold text-white">{{ u.accessOverride.plan || 'custom' }}</span>
                  <span v-if="u.accessOverride.expiresAt"> · expires {{ formatCompactDate(u.accessOverride.expiresAt) }}</span>
                </div>
                <div v-if="u.accessOverride.reason" class="text-slate-400">{{ u.accessOverride.reason }}</div>
              </div>
              <span v-else class="text-xs text-slate-500">None</span>
            </td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded bg-gray-800 px-3 py-1 hover:bg-gray-700"
                  @click="toggleRole(u)"
                >
                  Toggle Role
                </button>
                <button
                  class="rounded bg-indigo-700 px-3 py-1 text-white hover:bg-indigo-600"
                  @click="openOverrideDialog(u)"
                >
                  Access Override
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-end gap-3">
      <button @click="prevPageFn" :disabled="!prevStack.length" class="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50">Previous</button>
      <button @click="nextPageFn" :disabled="!nextPage" class="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600 disabled:opacity-50">Next</button>
    </div>

    <el-dialog
      v-model="overrideOpen"
      width="min(760px, calc(100vw - 2rem))"
      title="User Access Override"
      class="admin-access-override"
    >
      <div v-if="selectedUser" class="space-y-5 text-slate-100">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">Selected user</p>
          <p class="mt-2 text-lg font-semibold text-white">{{ selectedUser.name || selectedUser.email || selectedUser.id }}</p>
          <p class="text-sm text-slate-300">{{ selectedUser.email || selectedUser.id }}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-slate-300">Override plan</label>
            <el-select v-model="overrideForm.plan" class="w-full" placeholder="Inherit base plan">
              <el-option label="Inherit base plan" value="" />
              <el-option label="Free" value="free" />
              <el-option label="Premium" value="premium" />
              <el-option label="Team" value="team" />
            </el-select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">Reason / note</label>
            <el-input v-model="overrideForm.reason" placeholder="e.g. promo access, partner account" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">Starts at</label>
            <input v-model="overrideForm.startsAt" type="datetime-local" class="admin-access-override__native-input" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">Expires at</label>
            <input v-model="overrideForm.expiresAt" type="datetime-local" class="admin-access-override__native-input" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">Grace until</label>
            <input v-model="overrideForm.graceUntil" type="datetime-local" class="admin-access-override__native-input" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-slate-300">Grace period days</label>
            <el-input v-model="overrideForm.gracePeriodDays" placeholder="Optional" />
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">Limit overrides</p>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div v-for="field in limitFields" :key="field.key">
              <label class="mb-1 block text-sm text-slate-300">{{ field.label }}</label>
              <el-input v-model="overrideForm.limits[field.key]" :placeholder="field.placeholder" />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-[0.28em] text-slate-300/70">Entitlement overrides</p>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div v-for="field in entitlementFields" :key="field.key">
              <label class="mb-1 block text-sm text-slate-300">{{ field.label }}</label>
              <select v-model="overrideForm.entitlements[field.key]" class="admin-access-override__native-input">
                <option value="">Inherit</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <p class="mt-1 text-xs text-slate-400">{{ field.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            class="rounded border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15"
            :disabled="savingOverride"
            @click="clearOverride"
          >
            Clear Override
          </button>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="rounded border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              :disabled="savingOverride"
              @click="overrideOpen = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              :disabled="savingOverride"
              @click="saveOverride"
            >
              {{ savingOverride ? 'Saving…' : 'Save Override' }}
            </button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const limitFields = Object.freeze([
  { key: 'playbooks', label: 'Playbooks', placeholder: 'Leave blank to inherit' },
  { key: 'remindersPerDay', label: 'Reminders / day', placeholder: 'Leave blank to inherit' },
  { key: 'tasksPerDay', label: 'Tasks / day', placeholder: 'Leave blank to inherit' },
  { key: 'aiGenerations', label: 'AI generations / day', placeholder: 'Leave blank to inherit' },
])

const entitlementFields = Object.freeze([
  { key: 'aiSplit', label: 'AI split', description: 'Task generation and AI splitting.' },
  { key: 'priorityScheduling', label: 'Priority scheduling', description: 'Higher-end scheduling options.' },
  { key: 'voiceReminders', label: 'Voice reminders', description: 'Voice / call reminder features.' },
  { key: 'advancedPermissions', label: 'Advanced permissions', description: 'Admin/workspace permissions.' },
  { key: 'prioritySupport', label: 'Priority support', description: 'Premium support routing.' },
  { key: 'teamWorkspaces', label: 'Team workspaces', description: 'Team workspace entitlements.' },
])

function buildOverrideForm() {
  return {
    plan: '',
    reason: '',
    startsAt: '',
    expiresAt: '',
    graceUntil: '',
    gracePeriodDays: '',
    limits: {
      playbooks: '',
      remindersPerDay: '',
      tasksPerDay: '',
      aiGenerations: '',
    },
    entitlements: {
      aiSplit: '',
      priorityScheduling: '',
      voiceReminders: '',
      advancedPermissions: '',
      prioritySupport: '',
      teamWorkspaces: '',
    },
  }
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIsoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function normalizeOverrideForm(raw = {}) {
  const next = buildOverrideForm()
  next.plan = raw?.plan || ''
  next.reason = raw?.reason || ''
  next.startsAt = toDateTimeLocal(raw?.startsAt)
  next.expiresAt = toDateTimeLocal(raw?.expiresAt)
  next.graceUntil = toDateTimeLocal(raw?.graceUntil)
  next.gracePeriodDays = raw?.gracePeriodDays == null ? '' : String(raw.gracePeriodDays)
  limitFields.forEach((field) => {
    next.limits[field.key] = raw?.limits?.[field.key] == null ? '' : String(raw.limits[field.key])
  })
  entitlementFields.forEach((field) => {
    const value = raw?.entitlements?.[field.key]
    next.entitlements[field.key] = value == null ? '' : String(value)
  })
  return next
}

function buildOverridePayload(form) {
  const payload = {
    plan: form.plan || undefined,
    reason: form.reason?.trim() || undefined,
    startsAt: toIsoOrNull(form.startsAt) || undefined,
    expiresAt: toIsoOrNull(form.expiresAt) || undefined,
    graceUntil: toIsoOrNull(form.graceUntil) || undefined,
    gracePeriodDays: form.gracePeriodDays === '' ? undefined : Number(form.gracePeriodDays),
    limits: {},
    entitlements: {},
  }

  limitFields.forEach((field) => {
    const value = String(form.limits[field.key] || '').trim()
    if (!value) return
    payload.limits[field.key] = value
  })

  entitlementFields.forEach((field) => {
    const value = form.entitlements[field.key]
    if (value === '') return
    payload.entitlements[field.key] = value === 'true'
  })

  return payload
}

function formatCompactDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const users = ref([])
const loading = ref(false)
const nextPage = ref(null)
const prevStack = ref([])
const currentCursor = ref(null)
const filterRole = ref('')
const filterPlan = ref('')
const updatingPlanId = ref(null)

const overrideOpen = ref(false)
const savingOverride = ref(false)
const selectedUser = ref(null)
const overrideForm = ref(buildOverrideForm())

async function fetchUsers(cursor = null) {
  loading.value = true
  try {
    const params = { limit: 20 }
    if (cursor) params.last = cursor
    if (filterRole.value) params.role = filterRole.value
    if (filterPlan.value) params.plan = filterPlan.value
    const res = await api.get('/admin/users', { params })
    const data = res?.data || {}
    users.value = data.users || []
    nextPage.value = data.nextPage || null
    currentCursor.value = cursor
  } catch {
    ElMessage.error('Failed to load users')
  } finally {
    loading.value = false
  }
}

function nextPageFn() {
  if (!nextPage.value) return
  prevStack.value.push(currentCursor.value)
  fetchUsers(nextPage.value)
}

function prevPageFn() {
  const prev = prevStack.value.pop() || null
  fetchUsers(prev)
}

function refresh() {
  prevStack.value = []
  fetchUsers(null)
}

async function toggleRole(user) {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  try {
    await api.patch(`/admin/users/${encodeURIComponent(user.id)}`, { role: newRole })
    ElMessage.success('Role updated')
    await fetchUsers(currentCursor.value)
  } catch {
    ElMessage.error('Failed to update role')
  }
}

async function onChangePlan(user, newPlan) {
  try {
    updatingPlanId.value = user.id
    await api.post('/admin/users/updatePlan', { id: user.id, plan: newPlan })
    ElMessage.success('Plan updated')
    await fetchUsers(currentCursor.value)
  } catch {
    ElMessage.error('Failed to update plan')
  } finally {
    updatingPlanId.value = null
  }
}

function openOverrideDialog(user) {
  selectedUser.value = user
  overrideForm.value = normalizeOverrideForm(user?.accessOverride || {})
  overrideOpen.value = true
}

async function saveOverride() {
  if (!selectedUser.value?.id) return
  try {
    savingOverride.value = true
    const payload = buildOverridePayload(overrideForm.value)
    await api.post(`/admin/users/${encodeURIComponent(selectedUser.value.id)}/access-override`, payload)
    ElMessage.success('Access override saved')
    overrideOpen.value = false
    await fetchUsers(currentCursor.value)
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || 'Failed to save access override')
  } finally {
    savingOverride.value = false
  }
}

async function clearOverride() {
  if (!selectedUser.value?.id) return
  try {
    savingOverride.value = true
    await api.post(`/admin/users/${encodeURIComponent(selectedUser.value.id)}/access-override`, { clear: true })
    ElMessage.success('Access override cleared')
    overrideOpen.value = false
    await fetchUsers(currentCursor.value)
  } catch (error) {
    ElMessage.error(error?.response?.data?.error || 'Failed to clear access override')
  } finally {
    savingOverride.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.admin-access-override :deep(.el-dialog) {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.96), rgba(30, 27, 75, 0.94), rgba(49, 46, 129, 0.92));
  color: #e2e8f0;
  border-radius: 1.25rem;
}

.admin-access-override :deep(.el-dialog__title) {
  color: #fff;
}

.admin-access-override :deep(.el-input__wrapper),
.admin-access-override :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.admin-access-override__native-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.65rem 0.85rem;
}
</style>
