<template>
  <div class="public-layout">
    <header class="public-header">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">🌙</span>
        <span class="brand-name">PlanCraftAI</span>
      </RouterLink>
    </header>

    <main class="public-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top, rgba(99, 102, 241, 0.15), transparent 45%),
    linear-gradient(160deg, #0b1220 0%, #05070c 55%, #0b1220 100%);
  color: #f8fafc;
}

.public-header {
  padding: 24px;
  display: flex;
  justify-content: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
  color: inherit;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(16px);
  transition: transform 180ms ease, border-color 180ms ease;
}

.brand:hover {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.45);
}

.brand-mark {
  font-size: 1.2rem;
}

.public-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

@media (max-width: 640px) {
  .public-header {
    padding: 18px;
  }

  .public-main {
    padding: 16px;
  }

  .brand {
    padding: 8px 14px;
    font-size: 1rem;
  }
}
</style>
