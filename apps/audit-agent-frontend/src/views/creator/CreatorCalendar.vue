<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Content Calendar</h1>
      </div>
      <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold" @click="newSlot">
        New slot
      </button>
    </div>
    <div class="grid lg:grid-cols-4 gap-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow"
      >
        <p class="text-sm text-slate-400">{{ item.date }}</p>
        <p class="text-lg font-semibold mt-1">{{ item.title }}</p>
        <p class="text-xs text-slate-500">{{ item.platform }}</p>
        <div class="mt-3 text-xs text-slate-400">Variant: {{ item.variant }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchCreatorSlots } from '@/services/creatorApi'

const router = useRouter()
const items = ref([])

function newSlot() {
  router.push('/creator/publish/new')
}

function formatWhen(date) {
  if (!date) return 'Unscheduled'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

async function loadSlots() {
  try {
    const slots = await fetchCreatorSlots()
    items.value = slots.map((slot) => ({
      id: slot.id,
      date: formatWhen(slot.scheduledAt),
      title: slot.caption || slot.title || 'Scheduled post',
      platform: slot.platform || 'platform',
      variant: slot.variantType || slot.variantId || 'variant',
    }))
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to load slots')
  }
}

onMounted(loadSlots)
</script>
