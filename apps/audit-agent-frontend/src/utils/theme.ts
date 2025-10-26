import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'

export type ThemeMode = 'light' | 'dark'

export function getThemeValue<T>(lightValue: T, darkValue: T): T {
  const ui = useUiStore()
  return ui.currentTheme === 'dark' ? darkValue : lightValue
}

export function useThemeValue<T>(lightValue: T, darkValue: T) {
  const ui = useUiStore()
  return computed(() => (ui.currentTheme === 'dark' ? darkValue : lightValue))
}
