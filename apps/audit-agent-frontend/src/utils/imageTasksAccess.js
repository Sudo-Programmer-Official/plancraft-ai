import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

function parseEnvFlag(value) {
  return String(value || '')
    .split('#')[0]
    .trim()
    .toLowerCase() === 'true'
}

export function areImageTasksEnabled() {
  return parseEnvFlag(import.meta.env.VITE_ENABLE_IMAGE_TASKS) && !isNativePackagedApp()
}
