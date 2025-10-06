// src/stores/authStore.js
import { defineStore } from "pinia";
import { signInAsGuest, signInWithGoogle, signOutUser, signInWithEmail, registerWithEmail, sendResetEmail, fetchUserProfile } from "@/services/authService";
import { getAuth, onAuthStateChanged, onIdTokenChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import firebaseApp from "@/firebase/init";
import { identifyUser, trackEvent } from '@/services/analytics'
import { getSubscriptionStatus } from '@/services/stripeService'
import { getUsageStatus } from '@/services/planService'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/init'
import { ElNotification } from 'element-plus'


const auth = getAuth(firebaseApp);
setPersistence(auth, browserLocalPersistence);

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    user: null,
    token: null,
    loading: true, // start in loading mode until init runs
    guest: false
  }),

  actions: {
    resetAuth() {
      this.user = null
      this.token = null
      this.guest = false
      this.loading = false
      try {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('authStore')
      } catch {}
      try {
        // Lazily import to avoid circular dependency at module load
        import('@/stores/subscriptionStore').then(mod => {
          try { mod.useSubscriptionStore().reset() } catch {}
        })
      } catch {}
    },
    async refreshUser() {
      try {
        if (!this.user?.uid) return
        const profile = await fetchUserProfile(this.user.uid)
        // Merge fresh profile fields; preserve existing auth fields
        this.user = {
          ...(this.user || {}),
          ...profile,
          // Ensure plan/role are updated from profile if present
          plan: (profile && profile.plan) ? profile.plan : this.user?.plan,
          role: (profile && profile.role) ? profile.role : this.user?.role,
        }
      } catch (e) {
        // no-op; keep existing user
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
        // Attach plan and usage to local user object for convenience
        this.user = { ...(this.user || {}), plan, usage }
        try { await updateDoc(doc(db, 'users', this.user.uid), { plan }) } catch {}
      } catch {}
    },
    async init() {
      // If Firebase has no current user at app start, ensure we don't show stale cached state
      const fbUser = auth.currentUser
      if (!fbUser) {
        this.resetAuth()
      }

      // Attach Firebase auth listeners
      onAuthStateChanged(auth, async (user) => {
        // This fires on initial mount and sign-in/out. Keep it lightweight; token refresh handled below.
        if (!user) this.resetAuth()
        this.loading = false
      })

      // Keep ID token fresh to avoid 401 loops
      onIdTokenChanged(auth, async (user) => {
        try {
          if (user) {
            const token = await user.getIdToken(true) // force refresh when Firebase deems necessary
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
            // Refresh plan status in background
            this.refreshPlan().catch(() => {})
          } else {
            this.resetAuth()
          }
        } catch (e) {
          // On error, clear potentially stale creds
          this.resetAuth()
        }
      })
    },

    async loginAsGuest() {
      this.loading = true;
      try {
        const user = await signInAsGuest();
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = true;
        this.token = await user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user))
        localStorage.setItem("token", this.token)
        try {
          ElNotification({
            title: 'Welcome ✨',
            message: 'Using guest mode. You can upgrade anytime.',
            type: 'success',
            duration: 2200,
            offset: 80,
          })
        } catch {}
      } finally {
        this.loading = false;
      }
    },

    async loginWithGoogle() {
      this.loading = true;
      try {
        const user = await signInWithGoogle();
        const profile = await fetchUserProfile(user.uid)
        this.user = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          role: profile?.role || 'user',
        }
        this.guest = false;
        this.token = await user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user))
        localStorage.setItem("token", this.token)
        try {
          ElNotification({
            title: 'Welcome back ✨',
            message: `Signed in as ${this.user.displayName || this.user.email || 'User'}`,
            type: 'success',
            duration: 2500,
            offset: 80,
          })
        } catch {}
      } finally {
        this.loading = false;
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
          ElNotification({
            title: 'Signed in ✨',
            message: `Welcome ${this.user.displayName || this.user.email || ''}`,
            type: 'success',
            duration: 2400,
            offset: 80,
          })
        } catch {}
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
          ElNotification({
            title: 'Account created 🎉',
            message: `Hi ${this.user.email || 'there'}!`,
            type: 'success',
            duration: 2600,
            offset: 80,
          })
        } catch {}
      } finally {
        this.loading = false
      }
    },

    async resetPassword(email) {
      await sendResetEmail(email)
    },

    async logout() {
      try {
        await signOutUser();
      } catch (e) {
        console.warn('Sign-out failed:', e)
      } finally {
        try {
          ElNotification({
            title: 'Signed out 👋',
            message: 'You have successfully logged out.',
            type: 'info',
            duration: 1600,
            offset: 80,
          })
        } catch {}
        try { trackEvent('Logout') } catch {}
        this.resetAuth()
        // Small delay to allow toast render, then hard redirect
        setTimeout(() => { try { window.location.href = '/login' } catch {} }, 350)
      }
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.user,
    isGuest: (state) => state.guest === true
  },
});
