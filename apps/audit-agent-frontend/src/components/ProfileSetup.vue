<template>
  <el-dialog
    v-model="openLocal"
    title="Complete Your Profile"
    width="420px"
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :lock-scroll="true"
    modal-class="bg-black/70 backdrop-blur-md"
    class="dark-dialog"
    @close="handleClose"
  >
    <div class="space-y-3 bg-slate-900/80 text-gray-200 rounded-xl p-1">
      <p class="text-sm text-slate-400">
        Add your name to personalize your experience. Email is optional.
      </p>
      <el-input v-model="name" placeholder="Your name" clearable />
      <el-input v-model="email" placeholder="Email (optional)" type="email" clearable />
      <el-input v-model="phone" placeholder="Phone (optional)" type="tel" clearable />
      <div class="pt-2 flex gap-2 justify-end">
        <el-button @click="handleClose">Later</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">Save</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getAuth, updateProfile, updateEmail } from 'firebase/auth'
import { db } from '@/firebase/init'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { normalizePhone, guessCountryFromLocale } from '@/utils/phoneUtils'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'saved'])

const auth = getAuth()
const openLocal = ref(!!props.open)
const name = ref('')
const email = ref('')
const phone = ref('')
const saving = ref(false)
const authStore = useAuthStore()

watch(() => props.open, (v) => { openLocal.value = v })

// Prevent background scroll explicitly (Element Plus also locks scroll).
watch(openLocal, (v) => {
  try { document.body.style.overflow = v ? 'hidden' : '' } catch {}
})

async function loadDefaults() {
  const user = auth.currentUser
  if (!user) return
  try {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    const data = snap.exists() ? (snap.data() || {}) : {}
    name.value = data.name || user.displayName || ''
    email.value = data.email || user.email || ''
    phone.value = data.phone || user.phoneNumber || ''
  } catch {}
}

onMounted(loadDefaults)

function handleClose() {
  emit('close')
}

async function saveProfile() {
  const user = auth.currentUser
  if (!user) return
  if (!name.value.trim()) {
    return ElMessage.warning('Please enter your name')
  }
  saving.value = true
  try {
    let phoneE164 = phone.value.trim()
    try {
      const cc = guessCountryFromLocale()
      phoneE164 = normalizePhone(phoneE164, cc)
    } catch {}
    await setDoc(
      doc(db, 'users', user.uid),
      {
        name: name.value.trim(),
        email: email.value.trim() || undefined,
        phone: phoneE164 || undefined,
        profileComplete: true,
        updatedAt: new Date(),
      },
      { merge: true }
    )
    try { await updateProfile(user, { displayName: name.value.trim() }) } catch {}
    try {
      if (email.value && email.value !== user.email) {
        await updateEmail(user, email.value)
      }
    } catch {}
    try {
      authStore.user = {
        ...(authStore.user || {}),
        uid: user.uid,
        displayName: name.value.trim(),
        name: name.value.trim(),
        email: email.value.trim() || undefined,
        phone: phoneE164 || undefined,
      }
      localStorage.setItem('user', JSON.stringify(authStore.user))
    } catch {}
    ElMessage.success('Profile updated!')
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dark-dialog :deep(.el-dialog__header) {
  background: rgba(15, 23, 42, 0.9); /* slate-900 */
  color: #e5e7eb; /* gray-200 */
}
.dark-dialog :deep(.el-dialog__body) {
  background: rgba(15, 23, 42, 0.85);
  color: #e5e7eb;
}
.dark-dialog :deep(.el-dialog) {
  border-radius: 12px;
}
</style>
