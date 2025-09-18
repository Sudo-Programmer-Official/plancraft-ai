<template>
  <section class="page page--center">
    <h1 class="page__title">Login</h1>
    <p class="page__description">Please log in to access your account.</p>
  </section>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.page__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
}

.page__description {
  font-size: 1rem;
  color: #4b5563;
}
</style>
