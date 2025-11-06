<template>
  <div
    class="empty-state flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-6 py-10 shadow-inner shadow-indigo-900/20"
  >
    <div class="text-4xl sm:text-5xl animate-pulse-slow">{{ icon }}</div>
    <h3 class="text-lg sm:text-xl font-semibold text-slate-100">{{ title }}</h3>
    <p class="text-sm sm:text-base text-slate-400 max-w-md">
      {{ subtitle }}
    </p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Nothing to see here',
  },
  subtitle: {
    type: String,
    default: 'Come back after you create something.',
  },
  icon: {
    type: String,
    default: '✨',
  },
})
</script>

<style scoped>
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.75;
    transform: scale(1.05);
  }
}
.animate-pulse-slow {
  animation: pulse-slow 2.4s ease-in-out infinite;
}
</style>
