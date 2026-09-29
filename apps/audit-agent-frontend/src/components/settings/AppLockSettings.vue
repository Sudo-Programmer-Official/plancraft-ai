<template>
  <section v-if="platformSupported" class="settings-panel">
    <h2 class="app-lock-settings__title">Security</h2>
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="app-lock-settings__label">{{ appLock.label }}</h3>
          <p class="app-lock-settings__help">
            <template v-if="appLock.supported">
              Unlock PlanCraftAI with {{ appLock.label }} when you open the app.
            </template>
            <template v-else-if="appLock.availabilityChecked">
              Face ID or fingerprint isn’t set up on this device. Turn it on in your phone’s settings to lock PlanCraftAI.
            </template>
            <template v-else>Checking this device…</template>
          </p>
        </div>
        <el-switch
          :model-value="appLock.enabled"
          :loading="busy"
          :disabled="!appLock.supported || busy"
          :aria-label="`Unlock with ${appLock.label}`"
          @update:model-value="toggle"
        />
      </div>

      <div v-if="appLock.enabled">
        <p class="app-lock-settings__label mb-2">Lock after leaving the app</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Lock after">
          <button
            v-for="option in LOCK_TIMEOUT_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="appLock.timeoutMs === option.value"
            class="app-lock-settings__option"
            @click="appLock.setTimeoutMs(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="app-lock-settings__error" role="alert">{{ errorMessage }}</p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppLockStore } from '@/stores/appLockStore'
import { useAuthStore } from '@/stores/authStore'
import { LOCK_TIMEOUT_OPTIONS, isAppLockPlatform, markAppLockOffered } from '@/services/appLockService'

const appLock = useAppLockStore()
const authStore = useAuthStore()
const platformSupported = isAppLockPlatform()
const busy = ref(false)
const errorMessage = ref('')

onMounted(() => {
  if (platformSupported) appLock.refreshAvailability()
})

async function toggle(next) {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    if (next) {
      const uid = authStore.user?.uid
      await appLock.enable(uid)
      if (uid) markAppLockOffered(uid)
      ElMessage.success(`${appLock.label} is on`)
    } else {
      await appLock.disable()
      ElMessage.success(`${appLock.label} is off`)
    }
  } catch (err) {
    if (err?.kind !== 'cancelled') errorMessage.value = err?.message || 'Something went wrong. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.app-lock-settings__title {
  margin: 0 0 var(--pc-space-4);
  color: var(--pc-text);
  font-size: var(--pc-text-title);
  font-weight: 600;
}

.app-lock-settings__label {
  margin: 0;
  color: var(--pc-text);
  font-size: var(--pc-text-body);
  font-weight: 600;
}

.app-lock-settings__help {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.app-lock-settings__option {
  padding: var(--pc-space-2) var(--pc-space-3);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-surface);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  cursor: pointer;
}

.app-lock-settings__option[aria-checked='true'] {
  border-color: var(--pc-accent);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-weight: 600;
}

.app-lock-settings__error {
  margin: 0;
  color: var(--pc-danger);
  font-size: var(--pc-text-small);
}
</style>
