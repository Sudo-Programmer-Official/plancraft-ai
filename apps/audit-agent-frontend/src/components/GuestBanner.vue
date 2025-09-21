<template>
  <div
    v-if="isGuest && !dismissed"
    class="bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 
           px-5 py-4 rounded-xl shadow-md mb-6 flex items-center justify-between"
  >
    <div class="flex items-center gap-2">
      <span class="text-lg">⚠️</span>
      <span class="text-sm sm:text-base">
        You are in <strong>Guest Mode</strong>. Data won’t be saved.  
        Please log in to keep your progress.
      </span>
    </div>

    <div class="flex gap-2 ml-4 shrink-0">
      <button
        @click="$emit('login')"
        class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md text-white text-sm"
      >
        Log In
      </button>
      <button
        @click="dismissed = true"
        class="text-xs text-gray-400 hover:text-gray-200"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isGuest: Boolean
})

const dismissed = ref(false)
</script>