<template>
  <div class="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
    <div class="relative">
      <UserAvatar
        :src="previewUrl || currentUrl"
        :name="name"
        :email="email"
        alt="Profile photo"
        size-class="h-16 w-16"
        text-class="text-base"
        class="border-white/20"
      />
      <label class="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs cursor-pointer shadow">
        <input type="file" accept="image/*" class="hidden" @change="onFile" />
        ⬆︎
      </label>
    </div>
    <div class="min-w-0 text-sm text-slate-300">
      <div class="font-medium">Profile Photo</div>
      <div class="opacity-80">JPG/PNG, up to 3 MB</div>
      <div v-if="uploading" class="text-indigo-300 mt-1">Uploading…</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getAuth, updateProfile } from 'firebase/auth'
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from 'firebase/storage'
import firebaseApp, { db } from '@/firebase/init'
import { doc, setDoc } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  url: { type: String, default: '' },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
})
const emit = defineEmits(['updated'])

const auth = getAuth()
const storage = getStorage(firebaseApp)

const previewUrl = ref('')
const uploading = ref(false)
const currentUrl = computed(() => props.url)

function readFileAsURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function cropImageToSquare(dataUrl, size = 512, mime = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const s = Math.min(img.width, img.height)
        const sx = (img.width - s) / 2
        const sy = (img.height - s) / 2
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to produce blob'))
          resolve({ blob, dataUrl: canvas.toDataURL(mime, quality) })
        }, mime, quality)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

async function onFile(e) {
  const file = e?.target?.files?.[0]
  if (!file) return
  try {
    if (!/^image\//.test(file.type)) {
      return ElMessage.error('Please select an image file')
    }
    if (file.size > 3 * 1024 * 1024) {
      return ElMessage.error('File too large (max 3 MB)')
    }
    const originalDataUrl = await readFileAsURL(file)
    // Center-crop to a square (512px) for consistent avatars
    let crop
    try {
      crop = await cropImageToSquare(originalDataUrl, 512, 'image/jpeg', 0.92)
      previewUrl.value = crop.dataUrl
    } catch {
      // Fallback to original preview if crop fails
      previewUrl.value = originalDataUrl
    }
    const user = auth.currentUser
    if (!user?.uid) return ElMessage.error('Not signed in')
    uploading.value = true
    // Use jpeg for normalized avatar output
    const ext = 'jpg'
    const path = `avatars/${user.uid}.${ext}`
    const ref = sref(storage, path)
    const toUpload = crop?.blob || file
    await uploadBytes(ref, toUpload, { contentType: crop ? 'image/jpeg' : file.type })
    const url = await getDownloadURL(ref)
    // Save in Firestore and update Auth photoURL
    await setDoc(doc(db, 'users', user.uid), { avatarUrl: url, updatedAt: new Date() }, { merge: true })
    try { await updateProfile(user, { photoURL: url }) } catch {}
    emit('updated', url)
    ElMessage.success('Avatar updated!')
  } catch (err) {
    console.error('[AvatarUpload] failed', err)
    ElMessage.error('Failed to upload avatar')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
</style>
