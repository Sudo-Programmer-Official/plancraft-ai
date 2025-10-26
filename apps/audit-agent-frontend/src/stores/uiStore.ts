import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'plancraft:theme'

function detectSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
}

export const useUiStore = defineStore('ui', () => {
  const preference = ref<ThemePreference>('system')
  const currentTheme = ref<ResolvedTheme>('light')
  const mobileSidebarOpen = ref(false)

  function resolveTheme(pref: ThemePreference): ResolvedTheme {
    if (pref === 'system') {
      return detectSystemTheme()
    }
    return pref
  }

  function setPreference(theme: ThemePreference) {
    preference.value = theme
  }

  function toggleTheme() {
    const next = currentTheme.value === 'dark' ? 'light' : 'dark'
    preference.value = next
  }

  function toggleMobileSidebar(force?: boolean) {
    if (typeof force === 'boolean') {
      mobileSidebarOpen.value = force
    } else {
      mobileSidebarOpen.value = !mobileSidebarOpen.value
    }
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  function hydrate() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        preference.value = stored
      } else {
        preference.value = 'system'
      }
    } catch {
      preference.value = 'system'
    }
    currentTheme.value = resolveTheme(preference.value)
    applyTheme(currentTheme.value)
  }

  if (typeof window !== 'undefined') {
    hydrate()
    window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
      if (preference.value === 'system') {
        currentTheme.value = resolveTheme('system')
        applyTheme(currentTheme.value)
      }
    })
  }

  watch(
    preference,
    (value) => {
      currentTheme.value = resolveTheme(value)
      applyTheme(currentTheme.value)
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch {}
    },
    { immediate: true },
  )

  return {
    preference,
    currentTheme,
    toggleTheme,
    setPreference,
    mobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
  }
})
