export function clearStoredAuthArtifacts() {
  try {
    const localKeys = ['user', 'token', 'authStore', 'sessionBackup', 'auth', 'authUser']
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
