// src/stores/authStore.js
import { defineStore } from "pinia";
import {
  signInAsGuest,
  signInWithGoogle,
  signOutUser,
} from "@/services/authService";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import firebaseApp from "@/firebase/init";
import { identifyUser, trackEvent } from '@/services/analytics'


const auth = getAuth(firebaseApp);

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    user: null,
    token: null,
    loading: true, // start in loading mode until init runs
    guest: false
  }),

  actions: {
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

      // Attach Firebase auth listener
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.user = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          };
          this.token = await user.getIdToken();
          identifyUser(this.user)

          localStorage.setItem("user", JSON.stringify(this.user));
          localStorage.setItem("token", this.token);
        } else {
          this.user = null;
          this.token = null;
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
        this.loading = false;
      });
    },

    async loginAsGuest() {
      this.loading = true;
      try {
        const user = await signInAsGuest();
        this.user = user;
        this.guest = true;
        this.token = await user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);
      } finally {
        this.loading = false;
      }
    },

    async loginWithGoogle() {
      this.loading = true;
      try {
        const user = await signInWithGoogle();
        this.user = user;
        this.guest = false;
        this.token = await user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);
      } finally {
        this.loading = false;
      }
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
