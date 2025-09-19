// src/stores/authStore.js
import { defineStore } from "pinia";
import {
  signInAsGuest,
  signInWithGoogle,
  signOutUser,
} from "@/services/authService";

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    user: null,
    token: null,
    loading: false,
  }),
  actions: {
    async loginAsGuest() {
      this.loading = true;
      try {
        this.user = await signInAsGuest();
        this.token = await this.user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);
      } finally {
        this.loading = false;
      }
    },
    async loginWithGoogle() {
      this.loading = true;
      try {
        this.user = await signInWithGoogle();
        this.token = await this.user.getIdToken();
        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      await signOutUser();
      this.user = null;
      this.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },
  },
  getters: {
    isLoggedIn: (state) => !!state.user,
  },
});