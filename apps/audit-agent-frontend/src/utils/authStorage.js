const NATIVE_IOS_AUTH_SNAPSHOT_KEY = 'nativeIosAuthSnapshot'

export function readNativeIosAuthSnapshot() {
  try {
    const raw = localStorage.getItem(NATIVE_IOS_AUTH_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeNativeIosAuthSnapshot(snapshot) {
  try {
    if (!snapshot || typeof snapshot !== 'object') return
    localStorage.setItem(NATIVE_IOS_AUTH_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {}
}

export function clearNativeIosAuthSnapshot() {
  try {
    localStorage.removeItem(NATIVE_IOS_AUTH_SNAPSHOT_KEY)
  } catch {}
}

export function clearStoredAuthArtifacts() {
  try {
    const localKeys = ['user', 'token', 'authStore', 'sessionBackup', 'auth', 'authUser', NATIVE_IOS_AUTH_SNAPSHOT_KEY]
    localKeys.forEach((key) => localStorage.removeItem(key))

    const dynamicLocalKeys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('firebase:authUser:') || key.startsWith('firebase:persistence:')) {
        dynamicLocalKeys.push(key)
      }
    }
    dynamicLocalKeys.forEach((key) => localStorage.removeItem(key))
  } catch {}

  try {
    const dynamicSessionKeys = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (!key) continue
      if (key.startsWith('firebase:authUser:') || key.startsWith('firebase:persistence:')) {
        dynamicSessionKeys.push(key)
      }
    }
    dynamicSessionKeys.forEach((key) => sessionStorage.removeItem(key))
  } catch {}
}
