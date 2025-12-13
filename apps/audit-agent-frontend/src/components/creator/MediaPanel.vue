<template>
  <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-100">Media</p>
        <p class="text-xs text-slate-400">Upload or generate platform-aware images.</p>
      </div>
      <div class="flex gap-2 text-xs">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="px-3 py-2 rounded-lg border"
          :class="tab === activeTab ? 'border-indigo-500 bg-indigo-500/10 text-indigo-100' : 'border-slate-700 text-slate-300'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'Upload'">
      <MediaUploadBlock v-model="localMedia" />
    </div>

    <div v-else-if="activeTab === 'Generate AI'" class="space-y-3">
      <label class="block text-sm text-slate-300 mb-1">Prompt</label>
      <textarea
        v-model="prompt"
        rows="3"
        class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
        placeholder="Calm productivity workspace, minimal, soft light, night vibes"
      />
      <div class="grid md:grid-cols-3 gap-3 text-xs">
        <div>
          <p class="text-slate-300 mb-1">Style</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in styles"
              :key="s"
              class="px-3 py-2 rounded-lg border"
              :class="style === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-100' : 'border-slate-700 text-slate-300'"
              @click="style = s"
            >
              {{ s }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-slate-300 mb-1">Aspect</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="ratio in aspects"
              :key="ratio"
              class="px-3 py-2 rounded-lg border"
              :class="aspect === ratio ? 'border-indigo-500 bg-indigo-500/10 text-indigo-100' : 'border-slate-700 text-slate-300'"
              @click="aspect = ratio"
            >
              {{ ratio }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-slate-300 mb-1">Platform hint</p>
          <select
            v-model="platform"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter/X</option>
          </select>
          <p class="text-[11px] text-slate-500 mt-1">Tone adjusts per platform quietly.</p>
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <label class="text-slate-300">Count</label>
        <select
          v-model.number="count"
          class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
        >
          <option :value="1">1</option>
          <option :value="3">3</option>
          <option :value="5">5</option>
        </select>
        <button
          class="ml-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-60"
          :disabled="generating"
          @click="runGenerate"
        >
          {{ generating ? 'Generating…' : 'Generate' }}
        </button>
      </div>

      <div v-if="generated.length" class="border border-slate-800 rounded-xl p-3 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="img in generated"
          :key="img.url"
          class="relative rounded-lg overflow-hidden border"
          :class="isSelected(img) ? 'border-indigo-500' : 'border-slate-700'"
        >
          <img :src="img.url" class="w-full h-40 object-cover" />
          <div class="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white">
            {{ img.width }}x{{ img.height }} {{ img.aspect || '' }}
          </div>
          <button
            class="absolute bottom-2 left-1 right-1 px-3 py-2 rounded-lg text-xs font-semibold"
            :class="isSelected(img) ? 'bg-indigo-600 text-white' : 'bg-slate-900/80 text-slate-100 border border-slate-700'"
            @click="toggleSelect(img)"
          >
            {{ isSelected(img) ? 'Selected' : 'Use' }}
          </button>
        </div>
      </div>
      <div v-else class="text-xs text-slate-500">Generate images to attach them to your post.</div>
    </div>

    <div v-else class="text-xs text-slate-400">
      Media Library coming soon (recent uploads & AI generations).
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import MediaUploadBlock from './MediaUploadBlock.vue'
import { generateAiImages } from '@/services/creatorApi'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  draftSnapshot: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const tabs = ['Upload', 'Generate AI', 'Media Library']
const activeTab = ref('Upload')
const styles = ['photoreal', 'illustration', '3d', 'flat', 'moody']
const aspects = ['1:1', '4:5', '16:9']
const style = ref('photoreal')
const aspect = ref('1:1')
const platform = ref('instagram')
const count = ref(1)
const generating = ref(false)
const generated = ref([])
const selected = ref([])
const prompt = ref('')

const localMedia = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

function isSelected(img) {
  return selected.value.some((i) => i.url === img.url)
}

function toggleSelect(img) {
  if (isSelected(img)) {
    selected.value = selected.value.filter((i) => i.url !== img.url)
  } else {
    selected.value = [...selected.value, img]
  }
  attachSelected()
}

function attachSelected() {
  const mapped = selected.value.map((img) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'image',
    url: img.url,
    provider: 'ai',
    width: img.width,
    height: img.height,
    aspectRatio: img.aspect || aspect.value,
  }))
  localMedia.value = [...localMedia.value, ...mapped]
}

async function runGenerate() {
  generating.value = true
  try {
    const { images } = await generateAiImages({
      prompt: prompt.value || defaultPrompt.value,
      style: style.value,
      aspect: aspect.value,
      count: count.value,
      platform: platform.value,
    })
    generated.value = images || []
    selected.value = []
  } catch (err) {
    console.error('AI image generation failed', err?.message || err)
  } finally {
    generating.value = false
  }
}

const defaultPrompt = computed(() => {
  const snap = props.draftSnapshot || {}
  const parts = [snap.text?.title, snap.text?.hook, snap.text?.body, (snap.tags?.hashtags || []).join(' ')]
  return parts.filter(Boolean).join('. ').slice(0, 280) || 'High-quality social image'
})

onMounted(() => {
  prompt.value = defaultPrompt.value
})

watch(
  () => props.draftSnapshot,
  () => {
    if (!prompt.value) prompt.value = defaultPrompt.value
  },
  { deep: true },
)
</script>
