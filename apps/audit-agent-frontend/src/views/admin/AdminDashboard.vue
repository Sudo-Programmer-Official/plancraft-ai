<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold">Overview</h2>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Users</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.users }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Active Subs</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.subs }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Unread Notes</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.notifications }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
    </div>
    <div v-if="error" class="text-sm text-amber-300">⚠ {{ error }}</div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import api from '@/services/api'

const stats = reactive({ users: 0, subs: 0, notifications: 0 })
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [users, payments, notes] = await Promise.all([
      api.get('/admin/users').then(r => r.data || []),
      api.get('/admin/payments').then(r => r.data || []),
      api.get('/admin/notifications').then(r => r.data || []),
    ])
    stats.users = users.length
    stats.subs = payments.filter(p => p.status === 'active').length
    stats.notifications = notes.length
  } catch (e) {
    error.value = 'Failed to load admin stats.'
  } finally {
    loading.value = false
  }
})
</script>
