import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { auth } from '@/firebase/init'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

export function useGoogleLogin() {
  async function login() {
    const isNative = !!Capacitor?.isNativePlatform?.()
    if (isNative) {
      console.info('[Auth] Native platform detected; using redirect Google login')
      await signInWithRedirect(auth, provider)
      return null
    }

    try {
      console.info('[Auth] Web Google login via popup')
      const res = await signInWithPopup(auth, provider)
      return res?.user || null
    } catch (err) {
      if (isNative && (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user')) {
        try {
          console.warn('[Auth] Popup blocked; falling back to redirect')
          await signInWithRedirect(auth, provider)
          return null
        } catch (e) {
          console.error('[Auth] Redirect fallback failed', e)
          throw e
        }
      }
      console.error('[Auth] Popup login failed', err)
      throw err
    }
  }

  async function handleRedirect() {
    try {
      const res = await getRedirectResult(auth)
      return res?.user || null
    } catch (err) {
      console.error('[Auth] Redirect result error', err)
      return null
    }
  }

  return { login, handleRedirect }
}
