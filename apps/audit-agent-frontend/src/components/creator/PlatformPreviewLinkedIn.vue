<template>
  <div class="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
      <div class="w-10 h-10 rounded-full bg-slate-300" />
      <div class="flex-1">
        <p class="text-sm font-semibold">LinkedIn Preview</p>
        <p class="text-xs text-slate-500">Post</p>
      </div>
      <span class="text-xs text-slate-500">Mock</span>
    </header>
    <div class="p-4 space-y-3">
      <p class="whitespace-pre-line leading-relaxed text-sm">{{ content }}</p>
      <div class="rounded-xl border border-slate-200 bg-slate-50 h-48 flex items-center justify-center text-slate-500 text-sm">
        Media placeholder
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  content: { type: String, default: '' },
})
</script>
