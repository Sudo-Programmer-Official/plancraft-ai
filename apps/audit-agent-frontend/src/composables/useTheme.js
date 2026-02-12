import { ref } from 'vue'

const STORAGE_KEY = 'pcai:theme'
const currentTheme = ref('light')
let initialized = false

const applyTheme = (value) => {
  if (typeof document === 'undefined') return
  const next = value === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.style.colorScheme = next === 'dark' ? 'dark' : 'light'
  currentTheme.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch (_) {}
}

const readStoredTheme = () => {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch (_) {}
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch (_) {}
  return 'light'
}

export const loadInitialTheme = () => {
  const next = readStoredTheme()
  applyTheme(next)
  initialized = true
  return next
}

const setTheme = (value) => {
  applyTheme(value)
  return currentTheme.value
}

const toggleTheme = () => {
  const next = currentTheme.value === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}

export function useTheme() {
  if (!initialized) loadInitialTheme()

  return {
    theme: currentTheme,
    setTheme,
    toggleTheme,
    loadInitialTheme,
  }
}
