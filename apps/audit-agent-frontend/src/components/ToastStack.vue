<template>
  <div v-if="toasts.length" class="toast-stack" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <article v-for="toast in toasts" :key="toast.id" class="toast" :class="toast.type">
        <div class="toast__body">
          <span class="toast__icon">{{ iconFor(toast.type) }}</span>
          <p class="toast__message">{{ toast.message }}</p>
        </div>
        <button
          v-if="toast.action"
          type="button"
          class="toast__action"
          @click="handleAction(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button type="button" class="toast__close" aria-label="Dismiss" @click="remove(toast.id)">
          ×
        </button>
      </article>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/toastStore'

const toastStore = useToastStore()
const toasts = computed(() => toastStore.toasts)

const icons: Record<string, string> = {
  info: '💬',
  success: '✅',
  warning: '⚠️',
  error: '⚡️',
}

function iconFor(type: string) {
  return icons[type] || icons.info
}

function remove(id: string) {
  toastStore.remove(id)
}

async function handleAction(toast) {
  try {
    await toast.action?.handler?.()
  } finally {
    remove(toast.id)
  }
}
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2000;
}

.toast {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-radius: 14px;
  min-width: 260px;
  color: #0f172a;
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
}

.toast.success {
  border-color: rgba(74, 222, 128, 0.4);
}
.toast.warning {
  border-color: rgba(250, 204, 21, 0.4);
}
.toast.error {
  border-color: rgba(248, 113, 113, 0.4);
}

.toast__body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast__icon {
  font-size: 1.2rem;
}

.toast__message {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.9);
}

.toast__action {
  border: none;
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}

.toast__action:hover {
  background: rgba(79, 70, 229, 0.24);
}

.toast__close {
  border: none;
  background: transparent;
  color: rgba(15, 23, 42, 0.45);
  font-size: 1.2rem;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 640px) {
  .toast-stack {
    left: 16px;
    right: 16px;
  }
  .toast {
    min-width: auto;
    grid-template-columns: 1fr auto;
  }
  .toast__close {
    justify-self: flex-end;
  }
}
</style>
