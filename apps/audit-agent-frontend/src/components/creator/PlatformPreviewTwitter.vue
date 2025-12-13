<template>
  <div class="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
      <div class="w-10 h-10 rounded-full bg-slate-700" />
      <div class="flex-1">
        <p class="text-sm font-semibold">Twitter Preview</p>
        <p class="text-xs text-slate-400">Thread</p>
      </div>
      <span class="text-xs px-2 py-1 rounded-full border" :class="connected ? 'border-emerald-400/60 text-emerald-100 bg-emerald-500/10' : 'border-slate-700 text-slate-400'">
        {{ connected ? 'Ready' : 'Mock' }}
      </span>
    </header>
    <div class="p-4 space-y-4 text-sm leading-relaxed">
      <div v-for="(tweet, idx) in tweets" :key="idx" class="pb-3 border-b border-slate-800 last:border-0 space-y-2">
        <p class="whitespace-pre-line">{{ tweet }}</p>
        <div v-if="media?.length && idx === 0" class="rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
          <img v-if="media[0].type === 'image'" :src="media[0].url" class="w-full h-44 object-cover" />
          <video v-else class="w-full h-44 object-cover" :src="media[0].url" muted />
        </div>
        <div class="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Tweet {{ idx + 1 }}</span>
          <span v-if="tweet.length" class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px]">{{ tweet.length }}/280</span>
        </div>
      </div>
      <div v-if="warnings?.length" class="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/40 px-3 py-2 rounded-lg">
        <p class="font-semibold">Warnings</p>
        <ul class="list-disc list-inside space-y-1">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
    </div>
  </div>
  </template>

<script setup>
defineProps({
  tweets: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  warnings: { type: Array, default: () => [] },
  connected: { type: Boolean, default: false },
})
</script>
