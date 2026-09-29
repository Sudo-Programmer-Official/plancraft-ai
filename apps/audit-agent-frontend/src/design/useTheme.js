import { onBeforeUnmount, onMounted, ref } from 'vue'

// Light is the default. 'dark' pins dark; 'system' follows the OS. The choice
// is mirrored to data-pc-theme on <html>; index.html applies the stored value
// before first paint so a dark preference doesn't flash light.
export const THEME_STORAGE_KEY = 'pc_theme'
const THEMES = ['light', 'dark', 'system']
const preference = ref('light')
const resolved = ref('light')

function readStored() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(value) ? value : 'light'
  } catch {
    return 'light'
  }
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply() {
  document.documentElement.setAttribute('data-pc-theme', preference.value)
  resolved.value = preference.value === 'system' ? systemTheme() : preference.value
}

export function setThemePreference(value) {
  preference.value = THEMES.includes(value) ? value : 'light'
  try {
    if (preference.value === 'light') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, preference.value)
  } catch {
    /* storage unavailable: preference lasts for this session only */
  }
  apply()
}

export function useTheme() {
  let media = null
  const onSystemChange = () => apply()

  onMounted(() => {
    preference.value = readStored()
    apply()
    media = window.matchMedia?.('(prefers-color-scheme: dark)') || null
    media?.addEventListener?.('change', onSystemChange)
  })

  onBeforeUnmount(() => {
    media?.removeEventListener?.('change', onSystemChange)
  })

  return { preference, resolved, setThemePreference }
}
