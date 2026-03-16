import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

export async function copyText(value) {
  const text = String(value || '')
  if (!text) return false

  try {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}

  try {
    if (typeof document === 'undefined') return false
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return !!copied
  } catch {
    return false
  }
}

export function openExternalUrl(url) {
  const targetUrl = String(url || '').trim()
  if (!targetUrl || typeof window === 'undefined') return false

  if (isNativePackagedApp()) {
    try {
      if (typeof document !== 'undefined') {
        const link = document.createElement('a')
        link.href = targetUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return true
      }
    } catch {}

    try {
      const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer')
      if (popup) return true
    } catch {}
  }

  try {
    window.location.href = targetUrl
    return true
  } catch {
    return false
  }
}
