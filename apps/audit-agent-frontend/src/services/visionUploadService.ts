import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'
import firebaseApp, { auth } from '@/firebase/init'

const storage = getStorage(firebaseApp)

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 10)
}

export async function uploadImageForVision(file: File | Blob) {
  const uid = auth?.currentUser?.uid || 'anon'
  const ext = typeof (file as File).name === 'string' && (file as File).name.includes('.')
    ? (file as File).name.split('.').pop()
    : (file as File).type?.split('/')?.pop() || 'png'
  const key = `vision-uploads/${uid}/${Date.now()}-${randomId()}.${ext}`
  const ref = storageRef(storage, key)
  await uploadBytes(ref, file, {
    contentType: (file as File).type || 'image/png',
  })
  const imageUrl = await getDownloadURL(ref)
  return { imageUrl, path: key }
}
