<template>
  <div class="border-2 border-dashed border-slate-700 rounded-xl p-4 bg-slate-900/60 hover:border-indigo-500 transition">
    <p class="text-sm text-slate-300 mb-2 font-semibold">{{ title }}</p>
    <p class="text-xs text-slate-500 mb-3">Upload images or video for previews and publishing.</p>
    <label class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm cursor-pointer">
      📁 Upload
      <input type="file" class="hidden" @change="onFile" :accept="accept" multiple>
    </label>
    <div v-if="files && files.length" class="mt-3 text-xs text-slate-400 space-y-1">
      <div v-for="(file, idx) in files" :key="idx">{{ file.name }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: 'Media' },
  accept: { type: String, default: 'image/*,video/*' },
  files: { type: Array, default: () => [] },
})

const emit = defineEmits(['upload'])

function onFile(e) {
  const list = Array.from(e.target.files || [])
  emit('upload', list)
}
</script>
