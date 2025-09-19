<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";

const router = useRouter();
const auth = useAuthStore();

const loginAsGuest = async () => {
  await auth.loginAsGuest();
  router.push("/journal");
};

const loginWithGoogle = async () => {
  await auth.loginWithGoogle();
  router.push("/journal");
};
</script>

<template>
  <div class="text-center mt-12">
    <h1 class="text-3xl font-semibold">Sign In to AuditAgent</h1>
    <el-button class="mt-4" @click="loginWithGoogle">Continue with Google</el-button>
    <el-button class="mt-2" @click="loginAsGuest">Continue as Guest</el-button>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.page__title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600;
}

.page__description {
  font-size: 1rem;
  color: #4b5563;
}
</style>
