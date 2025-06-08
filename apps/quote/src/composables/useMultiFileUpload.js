import { ref } from 'vue'
import {
  getStorage,
  ref as firebaseRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'

export default function useMultiFileUpload() {
  const uploadProgress = ref({})
  const uploadError = ref(null)
  const downloadUrls = ref([])

  const uploadFiles = async (files) => {
    try {
      const storage = getStorage()
      downloadUrls.value = [] // Clear previous URLs

      for (const file1 of files) {
        const fileRaw = file1.raw
        // Ensure unique file name using timestamp
        const uniqueFileName = `${Date.now()}-${fileRaw.name}`
        const storageRef = firebaseRef(storage, uniqueFileName)

        const uploadTask = uploadBytesResumable(storageRef, fileRaw)

        // Track individual file progress
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            uploadProgress.value[fileRaw.name] =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          },
          (error) => {
            uploadError.value = error
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)
            downloadUrls.value.push(url) // Add URL to the list
          },
        )
      }
    } catch (error) {
      uploadError.value = error
    }
  }

  return { uploadFiles, uploadProgress, uploadError, downloadUrls }
}
