<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold">Users</h2>
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
            <td class="px-3 py-2">{{ u.plan || 'free' }}</td>
            <td class="px-3 py-2">
              <button @click="toggleRole(u)" class="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700">Toggle Role</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { ElMessage } from 'element-plus'

const users = ref([])

async function load() {
  try {
    const res = await api.get('/admin/users')
    users.value = res?.data || []
  } catch (e) {
    ElMessage.error('Failed to load users')
  }
}

async function toggleRole(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  try {
    await api.patch(`/admin/users/${encodeURIComponent(u.id)}`, { role: newRole })
    ElMessage.success('Role updated')
    await load()
  } catch (e) {
    ElMessage.error('Failed to update role')
  }
}

onMounted(load)
</script>
