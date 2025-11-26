<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Maps</h1>
        <p class="text-slate-400 text-sm">Visualize events, occasions, issues, and contacts on a single canvas.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 text-sm"
        @click="load"
      >
        Refresh
      </button>
    </header>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Geo view</p>
            <p class="text-sm text-slate-500">Markers colored by type (event / occasion / issue / contact).</p>
          </div>
          <div class="flex gap-2 text-[11px]">
            <span class="px-2 py-1 rounded bg-indigo-600/30 text-indigo-100 border border-indigo-500/50">Event</span>
            <span class="px-2 py-1 rounded bg-emerald-600/30 text-emerald-100 border border-emerald-500/50">Occasion</span>
            <span class="px-2 py-1 rounded bg-amber-600/30 text-amber-100 border border-amber-500/50">Issue</span>
            <span class="px-2 py-1 rounded bg-sky-600/30 text-sky-100 border border-sky-500/50">Contact</span>
          </div>
        </div>
        <div class="relative w-full h-[420px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.08),transparent),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.08),transparent)]"></div>
          <div class="absolute inset-0 opacity-30" style="background-image: linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px); background-size: 40px 40px;"></div>
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-slate-400">Loading map…</div>
          <template v-else>
            <button
              v-for="marker in projected"
              :key="marker.id"
              class="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-[10px] font-semibold shadow-lg border backdrop-blur"
              :style="{ left: marker.point.x + '%', top: marker.point.y + '%', background: marker.bg, color: marker.fg, borderColor: marker.border }"
              @click="select(marker)"
            >
              {{ marker.label }}
            </button>
          </template>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">Details</p>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">{{ locations.length }} markers</span>
        </div>
        <div v-if="selected" class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p class="font-semibold">{{ selected.label }}</p>
          <p class="text-xs text-slate-400">{{ selected.type }} • {{ selected.lat }}, {{ selected.lng }}</p>
          <p class="text-xs text-slate-500 break-words">{{ selected.metadata?.description || selected.metadata?.note || 'No extra details' }}</p>
        </div>
        <div class="space-y-2 max-h-[320px] overflow-y-auto scrollbar-plan">
          <div
            v-for="loc in locations"
            :key="loc.id"
            class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-sm flex items-center justify-between"
          >
            <div>
              <p class="font-semibold">{{ loc.label }}</p>
              <p class="text-[11px] text-slate-500">{{ loc.type }} • {{ loc.lat }}, {{ loc.lng }}</p>
            </div>
            <span :class="chipClass(loc.type)">{{ loc.type }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fetchLeaderLocations } from '@/services/leader/maps'

const loading = ref(false)
const locations = ref([])
const selected = ref(null)

function project(lat, lng) {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return { x: 50, y: 50 }
  const x = Math.min(100, Math.max(0, ((lng + 180) / 360) * 100))
  const y = Math.min(100, Math.max(0, (1 - (lat + 90) / 180) * 100))
  return { x, y }
}

const projected = computed(() =>
  (locations.value || []).map((loc) => {
    const palette = paletteFor(loc.type)
    return {
      ...loc,
      point: project(Number(loc.lat), Number(loc.lng)),
      bg: palette.bg,
      fg: palette.fg,
      border: palette.border,
      label: loc.label?.slice(0, 22) || loc.type,
    }
  }),
)

function paletteFor(type) {
  const t = (type || '').toLowerCase()
  if (t === 'occasion') return { bg: 'rgba(16,185,129,0.25)', fg: '#a7f3d0', border: 'rgba(16,185,129,0.6)' }
  if (t === 'issue') return { bg: 'rgba(251,191,36,0.25)', fg: '#fef3c7', border: 'rgba(251,191,36,0.6)' }
  if (t === 'contact') return { bg: 'rgba(56,189,248,0.25)', fg: '#e0f2fe', border: 'rgba(56,189,248,0.6)' }
  return { bg: 'rgba(99,102,241,0.25)', fg: '#e0e7ff', border: 'rgba(99,102,241,0.6)' }
}

function chipClass(type) {
  const t = (type || '').toLowerCase()
  if (t === 'occasion') return 'text-[10px] px-2 py-1 rounded bg-emerald-900/50 border border-emerald-700 text-emerald-100'
  if (t === 'issue') return 'text-[10px] px-2 py-1 rounded bg-amber-900/50 border border-amber-700 text-amber-100'
  if (t === 'contact') return 'text-[10px] px-2 py-1 rounded bg-sky-900/50 border border-sky-700 text-sky-100'
  return 'text-[10px] px-2 py-1 rounded bg-indigo-900/50 border border-indigo-700 text-indigo-100'
}

async function load() {
  loading.value = true
  try {
    locations.value = await fetchLeaderLocations()
    if (locations.value?.length) selected.value = locations.value[0]
  } finally {
    loading.value = false
  }
}

function select(marker) {
  selected.value = marker
}

load()
</script>
