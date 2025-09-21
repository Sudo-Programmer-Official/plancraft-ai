<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { fetchEntries } from "@/services/firebaseService"
import { useAuthStore } from "@/stores/authStore"

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const now = new Date()
  const hour = now.getHours()

  // only morning hours (or force-enable while testing)
  const isMorning = hour >= 5 && hour <= 11
  // const isMorning = true // 👈 use only for testing

  if (!isMorning) return

  if (!authStore.isLoggedIn) {
    // 🚨 Guest user → stay on landing/login
    // do NOT redirect unless they already navigated manually
    return
  }

  // ✅ Logged-in users → check if they already did morning entry
  try {
    const logs = await fetchEntries()
    const todayISO = new Date().toISOString().split("T")[0]

    const hasToday = logs.some(
      (log) =>
        log.date?.startsWith(todayISO) ||
        log.createdAt?.toDate?.()?.toISOString().startsWith(todayISO)
    )

    if (!hasToday) {
      router.replace("/morning")
    }
  } catch (err) {
    console.error("Morning redirect check failed:", err.message)
  }
})
</script>