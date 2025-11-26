<template>
  <div class="space-y-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-200">Voice Message</h3>
      <button
        class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-indigo-500"
        @click="clearAudio"
      >
        Clear
      </button>
    </div>
    <div class="flex flex-col sm:flex-row gap-2">
      <label class="flex-1 text-xs text-slate-300 border border-dashed border-slate-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500">
        Upload audio (.mp3/.wav)
        <input type="file" class="hidden" accept=".mp3,.wav,audio/*" @change="onFile" />
      </label>
      <button
        class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
        type="button"
      >
        Use AI Voice (TODO)
      </button>
    </div>
    <p v-if="uploading" class="text-xs text-slate-400">Uploading...</p>
    <p v-else-if="audioUrl" class="text-xs text-emerald-300 break-all">Audio uploaded: {{ audioUrl }}</p>
    <p v-else class="text-xs text-slate-500">No audio selected.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadVoiceMedia } from '@/services/leader/messages'

const emit = defineEmits(['update:audioUrl'])
const audioUrl = ref(null)
const uploading = ref(false)

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const url = await uploadVoiceMedia(file)
    audioUrl.value = url
    emit('update:audioUrl', url)
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Upload failed')
  } finally {
    uploading.value = false
  }
}

function clearAudio() {
  audioUrl.value = null
  emit('update:audioUrl', null)
}
</script>
