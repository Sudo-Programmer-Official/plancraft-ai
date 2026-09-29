<template>
  <Teleport to="body">
    <div
      v-if="appLock.locked || appLock.obscured"
      class="app-lock"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-lock-title"
    >
      <div class="app-lock__panel">
        <img src="/plancraft-mark.svg" alt="" class="app-lock__logo" />
        <template v-if="appLock.locked">
          <p class="app-lock__eyebrow">PlanCraftAI</p>
          <h1 id="app-lock-title" class="app-lock__title">PlanCraftAI is locked</h1>
          <p class="app-lock__subtitle">
            {{ appLock.fallbackRequired ? 'Sign in again to get back to your plans.' : `Use ${appLock.label} to open your plans.` }}
          </p>

          <p v-if="appLock.errorMessage" class="app-lock__error" role="alert">{{ appLock.errorMessage }}</p>

          <div class="app-lock__actions">
            <button
              v-if="!appLock.fallbackRequired"
              type="button"
              class="app-lock__primary"
              :disabled="appLock.verifying"
              @click="appLock.unlock()"
            >
              {{ appLock.verifying ? 'Checking…' : `Unlock with ${appLock.label}` }}
            </button>
            <button
              type="button"
              :class="appLock.fallbackRequired ? 'app-lock__primary' : 'app-lock__secondary'"
              :disabled="appLock.verifying || signingOut"
              @click="signInAnotherWay"
            >
              {{ signingOut ? 'Signing out…' : 'Sign in another way' }}
            </button>
          </div>
        </template>
        <h1 v-else id="app-lock-title" class="sr-only">PlanCraftAI</h1>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useAppLockStore } from '@/stores/appLockStore'
import { useAuthStore } from '@/stores/authStore'

const appLock = useAppLockStore()
const authStore = useAuthStore()
const signingOut = ref(false)

// Prompt automatically whenever the lock engages, once availability is known.
watch(
  () => [appLock.locked, appLock.availabilityChecked],
  async ([locked, checked]) => {
    if (!locked || !checked || appLock.fallbackRequired) return
    await nextTick()
    if (document.visibilityState === 'visible') appLock.unlock()
  },
  { immediate: true },
)

async function signInAnotherWay() {
  signingOut.value = true
  appLock.reset()
  try {
    await authStore.logout()
  } finally {
    signingOut.value = false
  }
}
</script>

<style scoped>
.app-lock {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(2rem, env(safe-area-inset-top)) 1.5rem max(2rem, env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at top, rgba(96, 165, 250, 0.18), transparent 28%),
    linear-gradient(135deg, #1d1645 0%, #4f2b93 58%, #241d53 100%);
  color: #fff;
}

.app-lock__panel {
  width: min(100%, 24rem);
  text-align: center;
}

.app-lock__logo {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1rem;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 18px 34px rgba(31, 41, 55, 0.35));
}

.app-lock__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(199, 210, 254, 0.8);
}

.app-lock__title {
  margin: 0.5rem 0 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.app-lock__subtitle {
  margin: 0.6rem 0 0;
  color: rgba(224, 231, 255, 0.85);
  line-height: 1.5;
}

.app-lock__error {
  margin: 1rem 0 0;
  color: rgb(252, 165, 165);
  font-size: 0.9rem;
}

.app-lock__actions {
  display: grid;
  gap: 0.75rem;
  margin-top: 2rem;
}

.app-lock__primary,
.app-lock__secondary {
  width: 100%;
  min-height: 3rem;
  border-radius: 0.9rem;
  font-weight: 600;
  font-size: 1rem;
  transition: opacity 0.2s ease;
}

.app-lock__primary {
  background: linear-gradient(120deg, #a855f7, #6366f1);
  color: #fff;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.35);
}

.app-lock__secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(226, 232, 240, 0.92);
}

.app-lock__primary:disabled,
.app-lock__secondary:disabled {
  opacity: 0.6;
}
</style>
