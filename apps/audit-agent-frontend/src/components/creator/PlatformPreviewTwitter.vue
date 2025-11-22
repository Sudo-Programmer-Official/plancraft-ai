<template>
  <div class="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
      <div class="w-10 h-10 rounded-full bg-slate-700" />
      <div class="flex-1">
        <p class="text-sm font-semibold">Twitter Preview</p>
        <p class="text-xs text-slate-400">Thread</p>
      </div>
      <span class="text-xs text-slate-400">Mock</span>
    </header>
    <div class="p-4 space-y-4 text-sm leading-relaxed">
      <div v-for="(tweet, idx) in tweets" :key="idx" class="pb-3 border-b border-slate-800 last:border-0">
        <p class="whitespace-pre-line">{{ tweet }}</p>
        <div class="mt-2 text-[11px] text-slate-500">Tweet {{ idx + 1 }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  tweets: { type: Array, default: () => [] },
})
</script>
