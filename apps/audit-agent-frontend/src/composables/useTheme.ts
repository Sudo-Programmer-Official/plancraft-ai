export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function readStoredTheme(): ThemeMode | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* noop */
  }
  return null
}

export function setTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', mode === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* noop */
  }
}

export function initTheme(defaultMode: ThemeMode = 'dark'): ThemeMode {
  const stored = readStoredTheme()
  const next = stored || defaultMode
  setTheme(next)
  return next
}

export function toggleTheme(): ThemeMode {
  const current = readStoredTheme() || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
