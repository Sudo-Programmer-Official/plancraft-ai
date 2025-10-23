<template>
  <section class="team-tasks">
    <header>
      <h1>Team Tasks</h1>
      <p>Tasks scoped to the active team will appear here.</p>
    </header>
    <div class="placeholder">
      <p>This view is a placeholder for Sprint 2 task boards.</p>
    </div>
  </section>
</template>

<script setup>
// Wire up taskStore in follow-up work
</script>

<style scoped>
.team-tasks { padding: 12px; display: flex; flex-direction: column; gap: 16px; }
.placeholder { padding: 24px; border: 1px dashed rgba(0,0,0,0.2); border-radius: 12px; text-align: center; color: rgba(0,0,0,0.6); background: #fff; }
</style>

