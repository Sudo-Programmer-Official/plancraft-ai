// PlanCraft Design System. Import components from here in migrated screens:
//   import { PcButton, PcTaskRow } from '@/design'
// Wrap a migrated screen in an element with class="pc-theme" to opt it into
// the tokens (overlays like PcSheet and PcMenu carry the class themselves).
import './tokens.css'

export { default as PcButton } from './components/PcButton.vue'
export { default as PcIconButton } from './components/PcIconButton.vue'
export { default as PcTaskRow } from './components/PcTaskRow.vue'
export { default as PcSheet } from './components/PcSheet.vue'
export { default as PcMenu } from './components/PcMenu.vue'
export { default as PcCaptureSheet } from './components/PcCaptureSheet.vue'
export { default as PcTabBar } from './components/PcTabBar.vue'
export { default as PcSidebar } from './components/PcSidebar.vue'
export { default as PcMoreSheet } from './components/PcMoreSheet.vue'
export { default as PcUpsellSheet } from './components/PcUpsellSheet.vue'
export { default as PcAppShell } from './components/PcAppShell.vue'
export { PRIMARY_NAV, MORE_GROUPS, ACCOUNT_NAV } from './navigation.js'
export { useTheme, setThemePreference } from './useTheme.js'
