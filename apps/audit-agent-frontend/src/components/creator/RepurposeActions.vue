<template>
  <div class="space-y-3">
    <p class="text-sm text-slate-300">Repurpose to formats:</p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        v-for="item in targets"
        :key="item.key"
        class="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/70 hover:border-indigo-500 text-sm text-left"
        @click="$emit('repurpose', item.key)"
      >
        <div class="font-semibold text-slate-100">{{ item.label }}</div>
        <div class="text-xs text-slate-400">{{ item.desc }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  targets: {
    type: Array,
    default: () => [
      { key: 'instagram_feed', label: 'Instagram Feed', desc: 'Square + caption' },
      { key: 'instagram_story', label: 'Instagram Story', desc: 'Vertical frames' },
      { key: 'reel_script', label: 'Reel Script', desc: 'Hook, beats, CTA' },
      { key: 'linkedin_post', label: 'LinkedIn', desc: 'Professional tone' },
      { key: 'twitter_thread', label: 'Twitter Thread', desc: '5–8 tweets' },
    ],
  },
})

defineEmits(['repurpose'])
</script>
