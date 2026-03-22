<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Content Calendar</h1>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="loadSlots">
          Refresh
        </button>
        <button
          class="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          :class="autoDeployEnabled ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 border border-slate-700 text-slate-300'"
          :disabled="!autoDeployEnabled"
          @click="newSlot"
        >
          {{ autoDeployEnabled ? 'New slot' : 'Publishing Disabled' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid lg:grid-cols-4 gap-4">
      <div v-for="n in 6" :key="n" class="h-28 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
    </div>

    <div v-else class="space-y-4">
      <div class="grid md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="bucket in buckets"
          :key="bucket.key"
          class="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-2"
        >
          <div class="flex items-center justify-between text-sm text-slate-300">
            <span>{{ bucket.label }}</span>
            <span class="text-[11px] text-slate-500">{{ bucket.items.length }} slots</span>
          </div>
          <draggable
            :list="bucket.items"
            item-key="id"
            group="creator-slots"
            handle=".drag"
            :disabled="!autoDeployEnabled"
            class="space-y-2 min-h-[40px]"
            @change="(e) => onDrop(bucket.key, e)"
          >
            <template #item="{ element }">
              <article class="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-semibold">{{ element.title }}</p>
                    <p class="text-xs text-slate-500">{{ element.platform }} • {{ element.variant }}</p>
                    <p class="text-[11px] text-slate-500">{{ element.date }}</p>
                  </div>
                  <button class="drag text-slate-500 hover:text-slate-200 text-sm" title="Drag to reschedule">☰</button>
                </div>
                <div class="flex gap-2 pt-2">
                  <button
                    class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-50"
                    :disabled="!autoDeployEnabled"
                    @click="promptReschedule(element)"
                  >
                    Reschedule
                  </button>
                  <button
                    class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-50"
                    :disabled="!autoDeployEnabled"
                    @click="edit(element)"
                  >
                    Edit
                  </button>
                </div>
              </article>
            </template>
            <template #footer>
              <p v-if="bucket.items.length === 0" class="text-xs text-slate-500">Drop a slot here</p>
            </template>
          </draggable>
        </div>
      </div>

      <p v-if="totalCount === 0" class="text-sm text-slate-400">No scheduled content yet. Create your first slot.</p>
    </div>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable'
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchCreatorSlots, updateCreatorSlot } from '@/services/creatorApi'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

const router = useRouter()
const featureFlagsStore = useFeatureFlagsStore()
const slots = ref([])
const loading = ref(false)
const autoDeployEnabled = computed(() => featureFlagsStore.isEnabled('AUTO_DEPLOY'))

function newSlot() {
  if (!autoDeployEnabled.value) {
    ElMessage.info('Auto deployment is temporarily disabled while we stabilize the publishing flow.')
    return
  }
  router.push('/creator/publish/new')
}

function formatWhen(date) {
  if (!date) return 'Unscheduled'
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

function nextSevenDays() {
  const days = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ key: toLocalDateKey(d), date: d })
  }
  return days
}

function combineDateAndTime(dateKey, rawDate) {
  const base = dateKey === 'unscheduled' ? null : new Date(dateKey)
  const timeSrc = rawDate ? new Date(rawDate) : null
  if (!base) return null
  if (timeSrc && !Number.isNaN(timeSrc.getTime())) {
    base.setHours(timeSrc.getHours(), timeSrc.getMinutes(), 0, 0)
  } else {
    base.setHours(9, 0, 0, 0)
  }
  return base.toISOString()
}

async function loadSlots() {
  loading.value = true
  try {
    const data = await fetchCreatorSlots()
    slots.value = data.map((slot) => {
      const raw = slot.scheduledAt || slot.date || null
      return {
        id: slot.id,
        rawDate: raw,
        dateKey: raw ? toLocalDateKey(new Date(raw)) : 'unscheduled',
        date: formatWhen(raw),
        title: slot.caption || slot.title || 'Scheduled post',
        platform: slot.platform || 'platform',
        variant: slot.variantType || slot.variantId || 'variant',
      }
    })
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to load slots')
  } finally {
    loading.value = false
  }
}

const buckets = computed(() => {
  const days = nextSevenDays()
  const grouped = {}
  for (const day of days) grouped[day.key] = []
  grouped.unscheduled = []

  for (const slot of slots.value || []) {
    const key = grouped[slot.dateKey] ? slot.dateKey : 'unscheduled'
    grouped[key].push(slot)
  }

  return [
    ...days.map((d) => ({ key: d.key, label: d.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), items: grouped[d.key] })),
    { key: 'unscheduled', label: 'Unscheduled', items: grouped.unscheduled },
  ]
})

const totalCount = computed(() => slots.value?.length || 0)

async function onDrop(targetKey, evt) {
  if (!autoDeployEnabled.value) {
    ElMessage.info('Scheduling is temporarily disabled right now.')
    await loadSlots()
    return
  }
  const moved = evt?.added?.element || evt?.moved?.element
  if (!moved) return
  try {
    const iso = combineDateAndTime(targetKey, moved.rawDate)
    if (iso) {
      await updateCreatorSlot(moved.id, { scheduledAt: iso, status: 'scheduled' })
      moved.rawDate = iso
      moved.dateKey = targetKey
      moved.date = formatWhen(iso)
      ElMessage.success('Slot rescheduled')
    } else {
      await updateCreatorSlot(moved.id, { scheduledAt: null, status: 'draft' })
      moved.rawDate = null
      moved.dateKey = 'unscheduled'
      moved.date = 'Unscheduled'
      ElMessage.success('Slot unscheduled')
    }
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to reschedule')
    await loadSlots()
  }
}

async function promptReschedule(item) {
  if (!autoDeployEnabled.value) {
    ElMessage.info('Scheduling is temporarily disabled right now.')
    return
  }
  try {
    const next = window.prompt('Enter new date/time (YYYY-MM-DD HH:MM, 24h) or leave blank to cancel:', '')
    if (!next) return
    const parsed = new Date(next.replace(' ', 'T'))
    if (!parsed || Number.isNaN(parsed.getTime())) {
      ElMessage.warning('Invalid date format')
      return
    }
    await updateCreatorSlot(item.id, { scheduledAt: parsed.toISOString(), status: 'scheduled' })
    ElMessage.success('Slot rescheduled')
    await loadSlots()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to reschedule')
  }
}

function edit(item) {
  if (!autoDeployEnabled.value) {
    ElMessage.info('Publishing is temporarily disabled right now.')
    return
  }
  router.push({ path: '/creator/publish/new', query: { slotId: item.id } })
}

onMounted(() => {
  featureFlagsStore.ensureLoaded().catch(() => {})
  loadSlots()
})
</script>
