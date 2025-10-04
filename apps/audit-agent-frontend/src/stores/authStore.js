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
      // Restore from localStorage (optional fallback)
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("token");
      if (savedUser && savedToken) {
        try {
          this.user = JSON.parse(savedUser);
          this.token = savedToken;
        } catch {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }

      // Attach Firebase auth listeners
      onAuthStateChanged(auth, async (user) => {
        // This fires on initial mount and sign-in/out. Keep it lightweight; token refresh handled below.
        if (!user) {
          this.user = null
          this.token = null
          localStorage.removeItem("user")
          localStorage.removeItem("token")
        }
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
            this.user = null
            this.token = null
            localStorage.removeItem('user')
            localStorage.removeItem('token')
          }
        } catch (e) {
          // On error, clear potentially stale creds
          this.user = null
          this.token = null
          localStorage.removeItem('user')
          localStorage.removeItem('token')
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
      } finally {
        this.loading = false
      }
    },

    async resetPassword(email) {
      await sendResetEmail(email)
    },

    async logout() {
      await signOutUser();
      try { trackEvent('Logout') } catch {}
      this.user = null;
      this.guest = false;
      this.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.user,
    isGuest: (state) => state.guest === true
  },
});
