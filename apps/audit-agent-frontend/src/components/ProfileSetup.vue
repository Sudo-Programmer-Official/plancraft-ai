<template>
  <el-dialog
    v-model="openLocal"
    class="profile-setup-dialog"
    modal-class="profile-setup-overlay"
    width="min(420px, calc(100vw - 24px))"
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :lock-scroll="true"
    @close="handleClose"
  >
    <template #header>
      <h2 class="text-lg font-semibold text-white">Complete your profile</h2>
      <p class="text-sm text-indigo-200/80 mt-1">
        Add your name so we can personalize your plans. Email is optional.
      </p>
    </template>

    <form class="space-y-3" @submit.prevent="saveProfile">
      <el-input v-model="name" placeholder="Your name" autocomplete="name" clearable />
      <el-input v-model="email" placeholder="Email (optional)" type="email" autocomplete="email" clearable />
      <el-input v-model="phone" placeholder="Phone (optional)" type="tel" autocomplete="tel" clearable />
      <p v-if="errorMessage" class="text-sm text-red-300" role="alert">{{ errorMessage }}</p>
      <div class="pt-2 flex gap-2 justify-end">
        <el-button @click="handleLater">Later</el-button>
        <el-button type="primary" native-type="submit" :loading="saving">Save</el-button>
      </div>
    </form>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getAuth, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth'
import { db } from '@/firebase/init'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'saved', 'dismissed'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const auth = getAuth()
const openLocal = ref(!!props.open)
const name = ref('')
const email = ref('')
const phone = ref('')
const saving = ref(false)
const errorMessage = ref('')
let savedThisOpen = false
const authStore = useAuthStore()

watch(
  () => props.open,
  (v) => {
    openLocal.value = v
    // Load when shown, not on mount: the layout mounts before auth settles.
    if (v) {
      savedThisOpen = false
      loadDefaults()
    }
  },
  { immediate: true },
)

watch([name, email, phone], () => {
  errorMessage.value = ''
})

async function loadDefaults() {
  const user = auth.currentUser
  if (!user) return
  errorMessage.value = ''
  try {
    const snap = await getDoc(doc(db, 'users', user.uid))
    const data = snap.exists() ? (snap.data() || {}) : {}
    name.value = data.name || user.displayName || ''
    email.value = data.email || user.email || ''
    phone.value = data.phone || user.phoneNumber || ''
  } catch {
    name.value = user.displayName || ''
    email.value = user.email || ''
    phone.value = user.phoneNumber || ''
  }
}

// Fires for Later, the X button, and after a successful save.
function handleClose() {
  if (!savedThisOpen) emit('dismissed')
  emit('close')
}

function handleLater() {
  openLocal.value = false
}

async function saveProfile() {
  const user = auth.currentUser
  if (!user || saving.value) return
  const trimmedName = name.value.trim()
  const trimmedEmail = email.value.trim()
  if (!trimmedName) {
    errorMessage.value = 'Please enter your name.'
    return
  }
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
    errorMessage.value = 'Enter a valid email address, or leave it blank.'
    return
  }

  saving.value = true
  try {
    let phoneE164 = phone.value.trim()
    try {
      phoneE164 = normalizePhone(phoneE164, guessCountryFromLocale()) || phoneE164
    } catch {}

    // Firestore rejects undefined values, so only include fields that are set.
    const payload = {
      name: trimmedName,
      profileComplete: true,
      updatedAt: new Date(),
    }
    if (trimmedEmail) payload.email = trimmedEmail
    if (phoneE164) payload.phone = phoneE164
    await setDoc(doc(db, 'users', user.uid), payload, { merge: true })

    try { await updateProfile(user, { displayName: trimmedName }) } catch {}

    let emailVerificationSent = false
    if (trimmedEmail && trimmedEmail !== user.email) {
      try {
        await verifyBeforeUpdateEmail(user, trimmedEmail)
        emailVerificationSent = true
      } catch (err) {
        console.warn('[ProfileSetup] Email verification send failed', err?.code || err)
      }
    }

    authStore.user = {
      ...(authStore.user || {}),
      uid: user.uid,
      displayName: trimmedName,
      name: trimmedName,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      ...(phoneE164 ? { phone: phoneE164 } : {}),
    }
    try { localStorage.setItem('user', JSON.stringify(authStore.user)) } catch {}

    ElMessage.success(
      emailVerificationSent
        ? `Profile saved. Check ${trimmedEmail} to confirm your email.`
        : 'Profile updated!',
    )
    savedThisOpen = true
    emit('saved')
    openLocal.value = false
  } catch (err) {
    console.error('[ProfileSetup] Save failed', err)
    errorMessage.value = 'Could not save your profile. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<style>
/* Unscoped: the dialog is teleported to <body>, outside scoped-style reach. */
.profile-setup-dialog.el-dialog {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.9rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}

.profile-setup-dialog .el-dialog__header,
.profile-setup-dialog .el-dialog__body {
  background: transparent;
  color: #e2e8f0;
}

.profile-setup-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #c7d2fe;
}

.profile-setup-dialog .el-input__wrapper {
  background: rgba(15, 23, 42, 0.7);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.profile-setup-dialog .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px #818cf8 inset;
}

.profile-setup-dialog .el-input__inner {
  color: #f1f5f9;
  font-size: 16px; /* prevents iOS zoom on focus */
}

.profile-setup-overlay {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
}
</style>
