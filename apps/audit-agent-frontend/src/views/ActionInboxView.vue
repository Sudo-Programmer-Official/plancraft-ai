<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1020] text-slate-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header class="space-y-3 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Inbox</p>
        <h1 class="text-3xl sm:text-4xl font-semibold">Everything your notes turned into</h1>
        <p class="max-w-3xl text-sm text-slate-300">
          Submit notes once. PlanCraft detects eligible actions automatically, prioritizes what matters today, and
          leaves final confirmation in your hands.
        </p>
      </header>

      <ActionInboxPanel
        title="Eligible actions waiting for review"
        description="Napkin, Journal, voice, and resurfacing logic all feed the same inbox. Confirm what belongs and ignore what does not."
        empty-message="No suggestions are waiting. Submit a note from Napkin or Journal and the system will add eligible tasks here automatically."
      />
    </div>
  </div>
</template>

<script setup>
import ActionInboxPanel from '@/components/ActionInboxPanel.vue'
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.45s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
