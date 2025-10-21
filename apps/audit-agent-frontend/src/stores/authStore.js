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
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
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

        // Default desktop popup login
        const user = await signInWithGoogle()
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
        const result = await confirmationResult.confirm(otp)
        const user = result?.user
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
        const user = await signInWithEmail(email, password)
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
