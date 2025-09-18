<template>
  <section class="page">
    <header class="page__header">
      <h1 class="page__title">Planner</h1>
      <p class="page__description">Organize your upcoming tasks and milestones in one place.</p>
    </header>
  </section>
</template>

<style scoped>
.page {
  padding: 2rem 1.5rem;
  max-width: 960px;
  margin: 0 auto;
}

.page__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page__title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 600;
}

.page__description {
  font-size: 1rem;
  color: #4b5563;
}
</style>
