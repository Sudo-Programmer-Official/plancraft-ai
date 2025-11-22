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
import { useRouter } from 'vue-router'
const router = useRouter()
const items = [
  { id: 'c1', date: 'Mon 10 AM', title: 'IG Reel: Calm focus', platform: 'Instagram Reel', variant: 'reel_script' },
  { id: 'c2', date: 'Tue 9 AM', title: 'LinkedIn: Founder note', platform: 'LinkedIn', variant: 'linkedin_post' },
  { id: 'c3', date: 'Wed 2 PM', title: 'Thread: Planner tips', platform: 'Twitter Thread', variant: 'twitter_thread' },
]

function newSlot() {
  router.push('/creator/publish/new')
}
</script>
