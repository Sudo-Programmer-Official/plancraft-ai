<template>
  <div class="bg-gradient-to-b from-slate-900 to-black text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
      <div class="w-10 h-10 rounded-full bg-slate-700" />
      <div class="flex-1">
        <p class="text-sm font-semibold">Instagram Preview</p>
        <p class="text-xs text-slate-400">Feed style</p>
      </div>
      <span class="text-indigo-300 text-xs">Mock</span>
    </header>
    <div class="p-4 space-y-3">
      <p class="whitespace-pre-line leading-relaxed text-sm">{{ caption }}</p>
      <div v-if="hashtags?.length" class="text-xs text-indigo-200">
        {{ hashtags.map((h) => `#${h.replace('#','')}`).join(' ') }}
      </div>
      <div class="w-full h-64 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
        Media placeholder
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  caption: { type: String, default: '' },
  hashtags: { type: Array, default: () => [] },
})
</script>
