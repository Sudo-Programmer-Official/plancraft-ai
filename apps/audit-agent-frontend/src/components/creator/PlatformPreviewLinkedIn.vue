<template>
  <div class="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
      <div class="w-10 h-10 rounded-full bg-slate-300" />
      <div class="flex-1">
        <p class="text-sm font-semibold">LinkedIn Preview</p>
        <p class="text-xs text-slate-500">Post</p>
      </div>
      <span class="text-xs px-2 py-1 rounded-full border" :class="connected ? 'border-emerald-500/50 text-emerald-600 bg-emerald-50' : 'border-slate-300 text-slate-500'">
        {{ connected ? 'Ready' : 'Mock' }}
      </span>
    </header>
    <div class="p-4 space-y-3">
      <p v-if="title" class="text-sm font-semibold">{{ title }}</p>
      <p class="whitespace-pre-line leading-relaxed text-sm">{{ content }}</p>
      <div v-if="media?.length" class="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        <img v-if="media[0].type === 'image'" :src="media[0].url" class="w-full h-48 object-cover" />
        <video v-else class="w-full h-48 object-cover" :src="media[0].url" muted />
      </div>
      <div v-else class="rounded-xl border border-slate-200 bg-slate-50 h-36 flex items-center justify-center text-slate-400 text-sm">
        Add media or a link preview
      </div>
      <div
        v-if="link"
        class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex gap-3 items-center"
      >
        <div class="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
          {{ linkHost }}
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold truncate">{{ link.title || link.url }}</p>
          <p class="text-xs text-slate-500 truncate">{{ link.url }}</p>
        </div>
      </div>
      <div v-if="warnings?.length" class="text-[11px] text-amber-700 bg-amber-100 border border-amber-200 px-3 py-2 rounded-lg">
        <p class="font-semibold">Warnings</p>
        <ul class="list-disc list-inside space-y-1">
          <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  link: { type: Object, default: null },
  media: { type: Array, default: () => [] },
  warnings: { type: Array, default: () => [] },
  connected: { type: Boolean, default: false },
})

const linkHost = computed(() => {
  try {
    const u = new URL(props.link?.url || '')
    return u.hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
})
</script>
