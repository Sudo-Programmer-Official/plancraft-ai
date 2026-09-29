<template>
  <div class="min-h-full bg-pc-bg text-pc-text">
    <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ActionInboxPanel
        title="Suggested actions"
        description="Review before adding to your plan."
        empty-message="No suggestions yet. Capture a note to create one."
        compact
      />
    </div>
  </div>
</template>

<script setup>
import ActionInboxPanel from '@/components/ActionInboxPanel.vue'
</script>
