<template>
  <div
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-900/30 select-none"
    :class="sizeClass"
    :style="avatarStyle"
  >
    <img
      v-if="hasImage"
      :src="src"
      :alt="altText"
      class="h-full w-full object-cover"
      @error="imageFailed = true"
    />
    <span
      v-else
      class="pointer-events-none font-semibold uppercase text-white"
      :class="textClass"
      aria-hidden="true"
    >
      {{ initials }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  seed: { type: String, default: '' },
  alt: { type: String, default: 'Profile avatar' },
  sizeClass: { type: String, default: 'h-10 w-10' },
  textClass: { type: String, default: 'text-sm' },
})

const PALETTES = [
  { from: '#4f46e5', to: '#8b5cf6', border: 'rgba(191, 219, 254, 0.28)' },
  { from: '#7c3aed', to: '#ec4899', border: 'rgba(233, 213, 255, 0.28)' },
  { from: '#0f766e', to: '#2563eb', border: 'rgba(153, 246, 228, 0.28)' },
  { from: '#be185d', to: '#7c3aed', border: 'rgba(251, 207, 232, 0.28)' },
  { from: '#1d4ed8', to: '#0891b2', border: 'rgba(191, 219, 254, 0.28)' },
]

const imageFailed = ref(false)
const hasImage = computed(() => String(props.src || '').trim().length > 0 && imageFailed.value === false)

function buildLabel() {
  const name = String(props.name || '').trim()
  if (name) return name
  const email = String(props.email || '').trim()
  if (email) return email.replace(/@.*/, '')
  return 'PlanCraftAI'
}

function buildInitials(label) {
  const parts = String(label || '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  const value = parts.map((part) => part[0]?.toUpperCase?.() || '').join('')
  return value || 'PC'
}

function hashSeed(value) {
  return Array.from(String(value || 'plan-craft-ai')).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) >>> 0
  }, 0)
}

const label = computed(() => buildLabel())
const initials = computed(() => buildInitials(label.value))
const palette = computed(() => {
  const seed = String(props.seed || props.email || props.name || label.value)
  return PALETTES[hashSeed(seed) % PALETTES.length]
})
const altText = computed(() => {
  const labelText = label.value
  return labelText ? `${labelText} avatar` : props.alt
})
const avatarStyle = computed(() => {
  if (hasImage.value) return null
  return {
    background: `linear-gradient(135deg, ${palette.value.from}, ${palette.value.to})`,
    borderColor: palette.value.border,
  }
})

watch(
  () => props.src,
  () => {
    imageFailed.value = false
  },
)
</script>
