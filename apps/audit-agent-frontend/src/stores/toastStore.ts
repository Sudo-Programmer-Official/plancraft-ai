import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastAction {
  label: string
  handler: () => void | Promise<void>
}

export interface ToastEntry {
  id: string
  message: string
  type: ToastType
  duration: number
  action?: ToastAction
  createdAt: number
}

const DEFAULT_DURATION = 4000

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastEntry[]>([])

  function push(message: string, opts: Partial<Omit<ToastEntry, 'id' | 'message' | 'createdAt'>> = {}) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const toast: ToastEntry = {
      id,
      message,
      type: opts.type || 'info',
      duration: typeof opts.duration === 'number' ? opts.duration : DEFAULT_DURATION,
      action: opts.action,
      createdAt: Date.now(),
    }
    toasts.value = [...toasts.value, toast]
    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration)
    }
    return id
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const hasToasts = computed(() => toasts.value.length > 0)

  return {
    toasts,
    hasToasts,
    push,
    remove,
  }
})
