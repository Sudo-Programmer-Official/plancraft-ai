<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Users</h2>
      <div class="flex items-center gap-2">
        <select v-model="filterRole" @change="refresh()" class="rounded bg-gray-800 px-3 py-1 text-white text-sm">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select v-model="filterPlan" @change="refresh()" class="rounded bg-gray-800 px-3 py-1 text-white text-sm">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <button @click="refresh" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs">Refresh</button>
      </div>
    </div>
    <div class="overflow-auto rounded border border-white/10">
      <table class="min-w-full text-sm">
        <thead class="bg-white/5">
          <tr>
            <th class="text-left px-3 py-2">Name</th>
            <th class="text-left px-3 py-2">Email</th>
            <th class="text-left px-3 py-2">Role</th>
            <th class="text-left px-3 py-2">Plan</th>
            <th class="text-left px-3 py-2">Actions</th>
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
                @change="(e) => onChangePlan(u, e.target.value)"
                class="rounded bg-gray-800 px-2 py-1 text-white text-xs border border-gray-700"
              >
                <option value="free">free</option>
                <option value="premium">premium</option>
              </select>
            </td>
            <td class="px-3 py-2">
              <button
                @click="toggleRole(u)"
                class="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
              >
                Toggle Role
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-end gap-3">
      <button @click="prevPageFn" :disabled="!prevStack.length" class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1 rounded text-white text-xs">Previous</button>
      <button @click="nextPageFn" :disabled="!nextPage" class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1 rounded text-white text-xs">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const users = ref([])
const loading = ref(false)
const nextPage = ref(null)
const prevStack = ref([])
const currentCursor = ref(null)
const filterRole = ref('')
const filterPlan = ref('')
const updatingPlanId = ref(null)

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
  } catch (e) {
    ElMessage.error('Failed to load users')
  } finally {
    loading.value = false
  }
}

function nextPageFn() {
  if (nextPage.value) {
    prevStack.value.push(currentCursor.value)
    fetchUsers(nextPage.value)
  }
}

function prevPageFn() {
  const prev = prevStack.value.pop() || null
  fetchUsers(prev)
}

function refresh() {
  prevStack.value = []
  fetchUsers(null)
}

async function toggleRole(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  try {
    await api.patch(`/admin/users/${encodeURIComponent(u.id)}`, { role: newRole })
    ElMessage.success('Role updated')
    await fetchUsers(currentCursor.value)
  } catch (e) {
    ElMessage.error('Failed to update role')
  }
}

async function onChangePlan(u, newPlan) {
  try {
    updatingPlanId.value = u.id
    await api.post('/admin/users/updatePlan', { id: u.id, plan: newPlan })
    ElMessage.success('Plan updated')
    await fetchUsers(currentCursor.value)
  } catch (e) {
    ElMessage.error('Failed to update plan')
  } finally {
    updatingPlanId.value = null
  }
}

onMounted(() => fetchUsers())
</script>
