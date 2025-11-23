<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Occasions</h1>
        <p class="text-slate-400 text-sm">Birthdays and anniversaries with quick wishes and scheduling.</p>
      </div>
    </header>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="o in occasions"
        :key="o.id"
        class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-3"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-lg">{{ o.name }}</p>
            <p class="text-xs text-slate-400">{{ o.type }} • {{ o.date }}</p>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 rounded-lg bg-indigo-600 text-sm hover:bg-indigo-500" @click="sendNow(o)">
              Send now
            </button>
            <button class="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="aiAndSchedule(o)">
              AI + schedule
            </button>
          </div>
        </div>
        <p class="text-sm text-slate-300">Suggested: {{ o.suggested || '—' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { generateWish } from '@/services/leaderApi'

const occasions = ref([
  { id: '1', name: 'Aarav', type: 'birthday', date: '2025-02-12', suggested: '' },
  { id: '2', name: 'Priya & Rohit', type: 'anniversary', date: '2025-02-14', suggested: '' },
])

async function sendNow(o) {
  alert(`Would send now to ${o.name}`)
}

async function aiAndSchedule(o) {
  try {
    const res = await generateWish({ name: o.name, type: o.type })
    o.suggested = res?.text || res?.output || 'Generated wish'
    alert('Wish generated; open LeaderMessages to schedule at 00:00.')
  } catch (e) {
    console.error(e)
    alert('Failed to generate wish')
  }
}
</script>
