import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

function parseEnvFlag(value) {
  return String(value || '')
    .split('#')[0]
    .trim()
    .toLowerCase() === 'true'
}

function isNativeImageTasksDebugEnabled() {
  return (
    parseEnvFlag(import.meta.env.VITE_ENABLE_NATIVE_IMAGE_TASKS) ||
    parseEnvFlag(import.meta.env.VITE_ENABLE_NATIVE_IMAGE_TASKS_DEBUG) ||
    String(import.meta.env.MODE || '').trim().toLowerCase() === 'development'
  )
}

export function areImageTasksEnabled() {
  const globallyEnabled = parseEnvFlag(import.meta.env.VITE_ENABLE_IMAGE_TASKS)
  if (!globallyEnabled) return false
  if (!isNativePackagedApp()) return true
  return isNativeImageTasksDebugEnabled()
}
