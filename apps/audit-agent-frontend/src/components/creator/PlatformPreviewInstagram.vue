<template>
  <div class="bg-gradient-to-b from-slate-900 to-black text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
    <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
      <div class="w-10 h-10 rounded-full bg-slate-700" />
      <div class="flex-1">
        <p class="text-sm font-semibold">Instagram Preview</p>
        <p class="text-xs text-slate-400">Feed style</p>
      </div>
      <span
        class="text-[11px] px-2 py-1 rounded-full border"
        :class="connected ? 'border-emerald-400/60 text-emerald-100 bg-emerald-500/10' : 'border-slate-700 text-slate-400'"
      >
        {{ connected ? 'Ready' : 'Mock' }}
      </span>
    </header>
    <div class="p-4 space-y-3">
      <p class="whitespace-pre-line leading-relaxed text-sm">{{ caption }}</p>
      <div v-if="hashtags?.length" class="text-xs text-indigo-200">
        {{ hashtags.map((h) => `#${h.replace('#','')}`).join(' ') }}
      </div>
      <div class="w-full h-64 rounded-xl bg-slate-800 flex items-center justify-center text-slate-100 text-sm relative overflow-hidden">
        <template v-if="displayMedia?.length">
          <img
            v-if="displayMedia[0].type === 'image'"
            :src="displayMedia[0].url"
            class="absolute inset-0 w-full h-full object-cover"
            :alt="displayMedia[0].type"
          />
          <video
            v-else
            class="absolute inset-0 w-full h-full object-cover"
            :src="displayMedia[0].url"
            muted
            loop
            playsinline
          />
          <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            <span
              v-for="(dot, idx) in displayMedia.length"
              :key="idx"
              class="w-2 h-2 rounded-full"
              :class="idx === 0 ? 'bg-white' : 'bg-white/40'"
            />
          </div>
        </template>
        <template v-else>
          <span class="text-slate-500">Add media to see carousel</span>
        </template>
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
import { computed } from 'vue'

const props = defineProps({
  caption: { type: String, default: '' },
  hashtags: { type: Array, default: () => [] },
  media: { type: Array, default: () => [] },
  attachments: { type: Array, default: () => [] },
  warnings: { type: Array, default: () => [] },
  connected: { type: Boolean, default: false },
})

const displayMedia = computed(() => {
  const list = props.attachments?.length ? props.attachments : props.media
  return list.map((item) => ({
    ...item,
    type: item.type || item.kind || 'image',
  }))
})
</script>
