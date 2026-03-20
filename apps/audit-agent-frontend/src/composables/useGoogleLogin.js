import { GoogleAuthProvider, signInWithPopup, getRedirectResult } from 'firebase/auth'
import { auth } from '@/firebase/init'
import { getNativeAuthRestriction, isNativePackagedApp } from '@/utils/nativeAuthSupport'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

export function useGoogleLogin() {
  async function login() {
    if (isNativePackagedApp()) {
      const err = new Error(getNativeAuthRestriction('google'))
      err.code = 'auth/native-google-unsupported'
      throw err
    }

    try {
      console.info('[Auth] Web Google login via popup')
      const res = await signInWithPopup(auth, provider)
      return res?.user || null
    } catch (err) {
      console.error('[Auth] Popup login failed', err)
      throw err
    }
  }

  async function handleRedirect() {
    if (isNativePackagedApp()) return null
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
