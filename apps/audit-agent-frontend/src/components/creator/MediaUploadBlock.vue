<template>
  <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
    <div class="flex items-center justify-between mb-3">
      <div>
        <p class="text-sm font-semibold text-slate-100">Media</p>
        <p class="text-xs text-slate-400">Images / video — drag to reorder, paste URL, or upload.</p>
      </div>
      <div class="flex gap-2">
        <button
          class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold hover:border-indigo-500"
          @click="fileInput?.click()"
        >
          Upload
        </button>
        <button
          class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs hover:border-indigo-500"
          @click="promptUrl"
        >
          Paste URL
        </button>
      </div>
    </div>

    <div
      class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3 min-h-[140px]"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div v-if="!mediaList.length" class="h-28 flex items-center justify-center text-slate-500 text-sm">
        Drag images/video here or click Upload
      </div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="(item, idx) in mediaList"
          :key="item.id"
          class="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-900"
          draggable="true"
          @dragstart="onDrag(idx)"
          @dragover.prevent
          @drop.prevent="onDrop(idx)"
        >
          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition" />
          <img v-if="item.type === 'image'" :src="item.url" class="w-full h-28 object-cover" />
          <video v-else class="w-full h-28 object-cover" :src="item.url" muted />
          <div class="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200">
            {{ badgeText(item) }}
          </div>
          <div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button class="text-[10px] px-2 py-1 rounded bg-slate-900/80 border border-slate-700" @click.stop="move(idx, -1)">↑</button>
            <button class="text-[10px] px-2 py-1 rounded bg-slate-900/80 border border-slate-700" @click.stop="move(idx, 1)">↓</button>
            <button class="text-[10px] px-2 py-1 rounded bg-rose-900/80 border border-rose-700" @click.stop="remove(idx)">✕</button>
          </div>
        </div>
      </div>
    </div>
    <input ref="fileInput" type="file" class="hidden" accept="image/*,video/*" multiple @change="handleFiles" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { deriveAspectRatio } from '@/services/creator/draftModel'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const dragIndex = ref(null)

const mediaList = computed(() => props.modelValue || [])

function badgeText(item) {
  const ratio = item.aspectRatio || ''
  if (item.type === 'video') return `Video ${ratio || ''}`.trim()
  if (item.type === 'gif') return `GIF ${ratio || ''}`.trim()
  return `Image ${ratio || ''}`.trim()
}

function update(list) {
  emit('update:modelValue', list)
}

function remove(idx) {
  const next = [...mediaList.value]
  next.splice(idx, 1)
  update(next)
}

function move(idx, delta) {
  const next = [...mediaList.value]
  const target = idx + delta
  if (target < 0 || target >= next.length) return
  const [item] = next.splice(idx, 1)
  next.splice(target, 0, item)
  update(next)
}

function onDrag(idx) {
  dragIndex.value = idx
}

function onDrop(idx) {
  if (dragIndex.value === null || dragIndex.value === idx) return
  move(dragIndex.value, idx - dragIndex.value)
  dragIndex.value = null
}

async function handleFiles(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  const items = await Promise.all(files.map((f) => fileToMedia(f)))
  update([...mediaList.value, ...items])
  e.target.value = ''
}

async function handleDrop(e) {
  const files = Array.from(e.dataTransfer.files || [])
  if (files.length) {
    const items = await Promise.all(files.map((f) => fileToMedia(f)))
    update([...mediaList.value, ...items])
    return
  }
  const text = e.dataTransfer.getData('text')
  if (text) addUrl(text)
}

async function promptUrl() {
  const url = window.prompt('Paste image/video URL')
  if (url) addUrl(url)
}

function guessTypeFromUrl(url) {
  const lower = url.toLowerCase()
  if (/\.(mp4|mov|webm)$/.test(lower)) return 'video'
  if (/\.(gif)$/.test(lower)) return 'gif'
  return 'image'
}

async function addUrl(url) {
  const clean = url.trim()
  if (!clean) return
  const type = guessTypeFromUrl(clean)
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    url: clean,
    provider: 'url',
    width: null,
    height: null,
    durationSec: null,
    aspectRatio: null,
  }
  update([...mediaList.value, item])
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageSize(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => resolve({ width: null, height: null })
    img.src = dataUrl
  })
}

async function fileToMedia(file) {
  const dataUrl = await readFileAsDataUrl(file)
  const type = file.type.startsWith('video') ? 'video' : file.type.includes('gif') ? 'gif' : 'image'
  let dimensions = { width: null, height: null }
  if (type === 'image') {
    dimensions = await getImageSize(dataUrl)
  }
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    url: dataUrl,
    provider: 'upload',
    width: dimensions.width,
    height: dimensions.height,
    durationSec: null,
    aspectRatio: dimensions.width && dimensions.height ? deriveAspectRatio(dimensions.width, dimensions.height) : null,
  }
}
</script>
