import { postingClient } from './leader/http'

export async function getSocialStatus() {
  const { data } = await postingClient.get('/social/status')
  return data?.accounts || {}
}

export async function getLinkedInAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/auth/linkedin', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function getInstagramAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/auth/instagram', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function getTwitterAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/auth/twitter', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function disconnectSocial(platform: 'linkedin' | 'instagram' | 'twitter') {
  const { data } = await postingClient.post(`/social/disconnect/${platform}`)
  return data
}
