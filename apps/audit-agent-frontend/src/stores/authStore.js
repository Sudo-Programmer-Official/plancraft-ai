// src/stores/authStore.js
import { defineStore } from 'pinia'
import {
  signInAsGuest,
  signInWithGoogle, // still used for popup flow
  signOutUser,
  signInWithEmail,
  registerWithEmail,
  sendResetEmail,
  fetchUserProfile,
} from '@/services/authService'
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  PhoneAuthProvider,
} from 'firebase/auth'
import firebaseApp from '@/firebase/init'
import { identifyUser, trackEvent } from '@/services/analytics'
import { getSubscriptionStatus } from '@/services/stripeService'
import { getUsageStatus } from '@/services/planService'
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/init'
import { ElNotification } from 'element-plus'
import { clearAppToken } from '@/services/appTokenService'

const auth = getAuth(firebaseApp)
setPersistence(auth, browserLocalPersistence)

// 🧠 Helper: detect in-app / insecure browsers (LinkedIn, Instagram, etc.)
function isInAppBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return /FBAN|FBAV|Instagram|LinkedInApp|Twitter/i.test(ua)
}

export const useAuthStore = defineStore('authStore', {
  state: () => ({
    user: null,
    token: null,
    loading: true,
    guest: false,
    usage: { used: 0, limit: 0, plan: '' },
    _refreshTimer: null,
    _profileUnsub: null,
  }),

  actions: {
    resetAuth() {
      this.user = null
      this.token = null
      this.guest = false
      this.loading = false
      try {
        if (this._refreshTimer) {
          clearInterval(this._refreshTimer)
          this._refreshTimer = null
        }
      } catch {}
      try {
        if (this._profileUnsub) {
          this._profileUnsub()
          this._profileUnsub = null
        }
      } catch {}
      try {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('authStore')
        localStorage.removeItem('sessionBackup')
      } catch {}
      try { clearAppToken() } catch {}
      try {
        import('@/stores/subscriptionStore').then((mod) => {
          try {
            mod.useSubscriptionStore().reset()
          } catch {}
        })
      } catch {}
      try {
        import('@/stores/workspaceStore').then((mod) => {
          try {
            mod.useWorkspaceStore().reset()
          } catch {}
        })
      } catch {}
    },

    async refreshUser() {
      try {
        if (!this.user?.uid) return
        const profile = await fetchUserProfile(this.user.uid)
        this.user = {
          ...(this.user || {}),
          ...profile,
          plan: profile?.plan || this.user?.plan,
          role: profile?.role || this.user?.role,
        }
      } catch {
        // no-op
      }
    },

    async refreshPlan() {
      try {
        if (!this.user?.uid) return
        const [status, usage] = await Promise.all([
          getSubscriptionStatus(this.user.uid),
          getUsageStatus(this.user.uid),
        ])
        const plan = (status?.plan || 'free').toLowerCase()
        this.user = { ...(this.user || {}), plan, usage }
        try {
          await updateDoc(doc(db, 'users', this.user.uid), { plan })
        } catch {}
      } catch {}
    },

    async init() {
      // 🧩 Attempt fast bootstrap from local backup (helps iOS PWA)
      try {
        const cachedUser = localStorage.getItem('user')
        const cachedToken = localStorage.getItem('token')
        if (!auth.currentUser && cachedUser && cachedToken) {
          this.user = JSON.parse(cachedUser)
          this.token = cachedToken
          this.guest = false
          this.loading = false
          console.log('[Auth] Restored session from local backup')
        }
      } catch (e) {
        console.warn('[Auth] Failed to restore local session', e)
      }

      onAuthStateChanged(auth, async (user) => {
        if (!user) this.resetAuth()
        this.loading = false
      })

      onIdTokenChanged(auth, async (user) => {
        try {
          if (user) {
            const token = await user.getIdToken(true)
            const profile = await fetchUserProfile(user.uid)
            this.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: profile?.role || 'user',
            }
            this.token = token
            identifyUser(this.user)
            localStorage.setItem('user', JSON.stringify(this.user))
            localStorage.setItem('token', this.token)
            try {
              import('@/stores/workspaceStore').then((mod) => {
                try { mod.useWorkspaceStore().init() } catch {}
              })
            } catch {}
            // Live profile sync from Firestore (name/email/plan/etc.)
            try {
              if (this._profileUnsub) { this._profileUnsub(); this._profileUnsub = null }
              this._profileUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
                if (!snap.exists()) return
                const data = snap.data() || {}
                this.user = {
                  ...(this.user || {}),
                  ...data,
                  // prefer Firebase Auth displayName but fall back to profile name
                  displayName: this.user?.displayName || data.name || null,
                  email: this.user?.email || data.email || null,
                  photoURL: data.avatarUrl || this.user?.photoURL || null,
                }
                try { localStorage.setItem('user', JSON.stringify(this.user)) } catch {}
              })
            } catch {}
            try {
              if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
                const mod = await import('@/services/appTokenService.js')
                mod.refreshAppToken().catch(() => {})
              }
            } catch {}
            this.refreshPlan().catch(() => {})
          } else {
            this.resetAuth()
          }
        } catch {
          this.resetAuth()
        }
      })

      // 🔁 Handle redirect sign-ins (Google fallback flow)
      try {
        await this.checkRedirectResult()
      } catch {}

      // 🧠 Silent token refresh to keep sessions alive in PWA contexts
      try {
        if (this._refreshTimer) clearInterval(this._refreshTimer)
        this._refreshTimer = setInterval(async () => {
          const user = auth.currentUser
          if (user) {
            try {
              const token = await user.getIdToken(true)
              this.token = token
              localStorage.setItem('token', token)
              // Optionally refresh long-lived app token if enabled and nearing expiry
              try {
                if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
                  const exp = parseInt(localStorage.getItem('app_token_exp') || '0', 10)
                  const soon = Date.now() + 24 * 60 * 60 * 1000 // within 24h
                  if (!exp || exp < soon) {
                    const mod = await import('@/services/appTokenService.js')
                    await mod.refreshAppToken().catch(() => {})
                  }
                }
              } catch {}
            } catch (err) {
              console.warn('[Auth] Token refresh failed', err)
            }
          } else {
            // Try to nudge a restore from backup when Firebase layer is null
            try {
              const cachedUser = localStorage.getItem('user')
              const cachedToken = localStorage.getItem('token')
              if (!this.user && cachedUser && cachedToken) {
                this.user = JSON.parse(cachedUser)
                this.token = cachedToken
              }
            } catch {}
          }
        }, 45 * 60 * 1000) // every 45 minutes
      } catch {}
    },

    async loginAsGuest() {
      this.loading = true
      try {
        const user = await signInAsGuest()
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = true
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        ElNotification({
          title: 'Welcome ✨',
          message: 'Using guest mode. You can upgrade anytime.',
          type: 'success',
          duration: 2200,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    // ✅ Fixed: Smart Google Login (Popup + Redirect Fallback)
    async loginWithGoogle() {
      this.loading = true
      try {
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })

        // If already signed in (phone/email/guest), link Google to the current UID to avoid duplicates.
        const current = auth.currentUser
        const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'google.com')
        if (current && !alreadyLinked) {
          try {
            const linkResult = await linkWithPopup(current, provider)
            const user = linkResult?.user || current
            await setDoc(
              doc(db, 'users', user.uid),
              {
                email: user.email,
                name: user.displayName || '',
                mode: 'google',
                lastLoginAt: Date.now(),
                profileComplete: !!(user.displayName),
              },
              { merge: true },
            )
            this.user = {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              role: this.user?.role || 'user',
            }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        ElNotification({
          title: 'Google connected',
          message: 'Your Google account is now linked.',
          type: 'success',
          duration: 2200,
          offset: 80,
        })
        return user
      } catch (err) {
        const code = String(err?.code || '')
        if (code.includes('provider-already-linked')) {
          return current
        }
        // Do not fall through to sign-in while a session exists; avoids duplicate users.
        console.warn('[Auth] Google link failed; aborting sign-in to avoid duplicates', err?.message || err)
        throw err
      }
    }

        // Safari/iOS and standalone PWAs are unreliable with popups → prefer redirect
        try {
          const ua = navigator.userAgent || ''
          const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
          const isIOS = /iP(hone|ad|od)/i.test(ua)
          const isSafari = /safari/i.test(ua) && !/crios|fxios|fxios|edgios|chrome/i.test(ua)
          if (isStandalone || (isIOS && isSafari)) {
            await signInWithRedirect(auth, provider)
            return
          }
        } catch {}

        // if (isInAppBrowser()) {
        //   console.warn('In-app browser detected — showing warning modal')
        //   // Dynamically mount the modal to DOM
        //   const container = document.createElement('div')
        //   document.body.appendChild(container)

        //   const { createApp } = await import('vue')
        //   const InAppBrowserWarning = (await import('@/components/InAppBrowserWarning.vue')).default

        //   const app = createApp(InAppBrowserWarning, {
        //     onContinue: async () => {
        //       try {
        //         app.unmount()
        //         document.body.removeChild(container)
        //         await signInWithRedirect(auth, provider)
        //       } catch (e) {
        //         console.error('Redirect failed:', e)
        //       }
        //     },
        //   })
        //   app.mount(container)

        //   return // Wait until modal resolves
        // }
        if (isInAppBrowser()) {
          console.warn('In-app browser detected — showing helper modal')
          const container = document.createElement('div')
          document.body.appendChild(container)

          const { createApp } = await import('vue')
          const InAppBrowserHelper = (await import('@/components/InAppBrowserWarning.vue')).default

          const app = createApp(InAppBrowserHelper, {
            redirectUrl: window.location.href,
            onContinue: async () => {
              app.unmount()
              document.body.removeChild(container)
              try {
                await signInWithRedirect(auth, provider)
              } catch (e) {
                console.error('Redirect failed:', e)
              }
            },
          })
          app.mount(container)
          return
        }

        // Default attempt: popup; be selective about redirect fallback.
        let user
        try {
          user = await signInWithGoogle()
        } catch (popupErr) {
          const code = String(popupErr?.code || '')
          const msg = String(popupErr?.message || '')
          const popupBlocked = code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request'
          const ua = navigator.userAgent || ''
          const isIOS = /iP(hone|ad|od)/i.test(ua)
          const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome/i.test(ua)
          const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone
          const shouldTryRedirect = popupBlocked || isStandalone || (isIOS && isSafari)

          if (shouldTryRedirect) {
            console.warn('[Auth] Popup sign-in blocked/unavailable; trying redirect instead', { code, msg })
            try {
              await signInWithRedirect(auth, provider)
              return
            } catch (redirErr) {
              console.error('[Auth] Redirect sign-in also failed', redirErr)
              throw redirErr
            }
          }

          // Do not auto-redirect for other failures (e.g., storage partitioning).
          // Surface the error so the UI can suggest trying a non-private window.
          throw popupErr
        }
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        ElNotification({
          title: 'Welcome back ✨',
          message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
          type: 'success',
          duration: 2500,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    // ✅ Handles post-redirect Google login
    async checkRedirectResult() {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          const user = result.user
          const profile = await fetchUserProfile(user.uid)
          this.user = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            role: profile?.role || 'user',
          }
          this.guest = false
          this.token = await user.getIdToken()
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('token', this.token)
          try {
            if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
              const mod = await import('@/services/appTokenService.js')
              mod.refreshAppToken().catch(() => {})
            }
          } catch {}
          ElNotification({
            title: 'Welcome back ✨',
            message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
            type: 'success',
            duration: 2500,
            offset: 80,
          })

          // After a successful redirect sign‑in, navigate away from /login to
          // prevent a stuck screen. Prefer an explicit redirect param or any
          // stored intent; otherwise fall back to dashboard.
          try {
            // 1) stored intent set by guards
            const stored = localStorage.getItem('postLoginRedirect')
            if (stored) {
              localStorage.removeItem('postLoginRedirect')
              window.location.replace(stored)
              return
            }
            // 2) redirect query param
            const params = new URLSearchParams(window.location.search)
            const q = params.get('redirect')
            if (q) {
              window.location.replace(q)
              return
            }
            // 3) default
            if (window.location.pathname === '/login') {
              window.location.replace('/dashboard')
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Redirect sign-in restore failed:', err)
      }
    },

    // 📱 Phone OTP: send code
    async sendPhoneOtp(phone, recaptchaVerifier) {
      if (!phone) throw new Error('Missing phone number')
      if (!recaptchaVerifier) throw new Error('Missing reCAPTCHA verifier')
      // Use Firebase auth directly for OTP
      return await signInWithPhoneNumber(auth, phone, recaptchaVerifier)
    },

    // 📱 Phone OTP: confirm code and finalize login
    async confirmPhoneOtp(confirmationResult, otp) {
      if (!confirmationResult) throw new Error('Missing confirmation result')
      if (!otp) throw new Error('Missing OTP code')
      this.loading = true
      try {
        const current = auth.currentUser
        const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'phone')

        let user = null
        if (current && !alreadyLinked) {
          // Link phone credential to existing session to avoid duplicate UIDs.
          const cred = PhoneAuthProvider.credential(confirmationResult.verificationId, otp)
          const linkRes = await linkWithCredential(current, cred)
          user = linkRes?.user || current
        } else {
          const result = await confirmationResult.confirm(otp)
          user = result?.user
        }
        if (!user?.uid) throw new Error('Phone sign-in failed')

        // Ensure Firestore profile exists/updated
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              phone: user.phoneNumber || null,
              mode: 'phone',
              lastLoginAt: Date.now(),
              createdAt: Date.now(),
              profileComplete: false,
            },
            { merge: true },
          )
        } catch {}

        // Mirror other login flows
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
          phone: user.phoneNumber || profile?.phone || undefined,
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        this.refreshPlan().catch(() => {})
        ElNotification({
          title: 'Welcome ✨',
          message: `Signed in with phone ${this.user.phone || ''}`,
          type: 'success',
          duration: 2400,
          offset: 80,
        })
        return user
      } finally {
        this.loading = false
      }
    },

  async loginWithEmail(email, password) {
    this.loading = true
    try {
      const current = auth.currentUser
      const alreadyLinked = (current?.providerData || []).some((p) => p?.providerId === 'password')

      if (current && !alreadyLinked) {
        // Link email/password to current session; abort on failure to avoid duplicate UIDs.
        const credential = EmailAuthProvider.credential(email, password)
        const linkRes = await linkWithCredential(current, credential)
        const user = linkRes?.user || current
        await setDoc(
          doc(db, 'users', user.uid),
          {
            email: user.email,
            name: user.displayName || '',
            mode: 'email',
            lastLoginAt: Date.now(),
            profileComplete: !!(user.displayName),
          },
          { merge: true },
        )
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || this.user?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        ElNotification({
          title: 'Email linked',
          message: 'Email/password added to your account.',
          type: 'success',
          duration: 2200,
          offset: 80,
        })
        return user
      }

      // No active session or already linked: standard sign-in.
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const user = cred.user
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          name: user.displayName || '',
          mode: 'email',
          lastLoginAt: Date.now(),
          ...(user.displayName ? { profileComplete: true } : {}),
        },
        { merge: true },
      )
      const profile = await fetchUserProfile(user.uid)
      this.user = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: profile?.role || 'user',
      }
      this.guest = false
      this.token = await user.getIdToken()
      localStorage.setItem('user', JSON.stringify(this.user))
      localStorage.setItem('token', this.token)
      try {
        if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
          const mod = await import('@/services/appTokenService.js')
          mod.refreshAppToken().catch(() => {})
        }
      } catch {}
      ElNotification({
        title: 'Signed in ✨',
        message: `Welcome ${this.user.displayName || this.user.email || ''}`,
        type: 'success',
        duration: 2400,
        offset: 80,
      })
    } finally {
      this.loading = false
    }
  },

    async registerEmail(email, password) {
      this.loading = true
      try {
        const user = await registerWithEmail(email, password)
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = false
        this.token = await user.getIdToken()
        localStorage.setItem('user', JSON.stringify(this.user))
        localStorage.setItem('token', this.token)
        try {
          if (import.meta.env.VITE_USE_APP_TOKEN === '1') {
            const mod = await import('@/services/appTokenService.js')
            mod.refreshAppToken().catch(() => {})
          }
        } catch {}
        ElNotification({
          title: 'Account created 🎉',
          message: `Hi ${this.user.email || 'there'}!`,
          type: 'success',
          duration: 2600,
          offset: 80,
        })
      } finally {
        this.loading = false
      }
    },

    async resetPassword(email) {
      await sendResetEmail(email)
    },

    async logout() {
      try {
        await signOutUser()
      } catch (e) {
        console.warn('Sign-out failed:', e)
      } finally {
        ElNotification({
          title: 'Signed out 👋',
          message: 'You have successfully logged out.',
          type: 'info',
          duration: 1600,
          offset: 80,
        })
        try {
          trackEvent('Logout')
        } catch {}
        this.resetAuth()
        setTimeout(() => {
          try {
            window.location.href = '/login'
          } catch {}
        }, 350)
      }
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.user,
    isGuest: (state) => state.guest === true,
  },
})

// Placeholder shim (for older views)
export const userPrefs = undefined
