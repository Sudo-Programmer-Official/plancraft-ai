<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold">Payments</h2>
    <div class="overflow-auto rounded border border-white/10">
      <table class="min-w-full text-sm">
        <thead class="bg-white/5">
          <tr>
            <th class="text-left px-3 py-2">User</th>
            <th class="text-left px-3 py-2">Plan</th>
            <th class="text-left px-3 py-2">Status</th>
            <th class="text-left px-3 py-2">Renews</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id" class="border-t border-white/10">
            <td class="px-3 py-2">{{ p.userEmail || p.userId }}</td>
            <td class="px-3 py-2">{{ p.plan }}</td>
            <td class="px-3 py-2">{{ p.status }}</td>
            <td class="px-3 py-2">{{ formatDate(p.renewsAt) }}</td>
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

const payments = ref([])

function formatDate(d) { try { return new Date(d).toLocaleString() } catch { return '' } }

onMounted(async () => {
  try {
    const res = await api.get('/admin/payments')
    payments.value = res?.data || []
  } catch (e) {
    ElMessage.error('Failed to load payments')
  }
})
</script>
