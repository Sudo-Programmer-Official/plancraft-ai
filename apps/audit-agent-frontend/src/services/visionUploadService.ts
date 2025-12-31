import api from '@/services/api'

type UploadResponse = {
  imageUrl: string
  path: string
  contentType?: string
}

export async function uploadImageForVision(file: File | Blob): Promise<UploadResponse> {
  if (!file) throw new Error('File is required')
  const form = new FormData()
  form.append('file', file)

  const res = await api.post('/vision/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })

  if (!res?.data?.imageUrl || !res?.data?.path) {
    throw new Error('Upload failed')
  }

  return {
    imageUrl: res.data.imageUrl,
    path: res.data.path,
    contentType: res.data.contentType,
  }
}
