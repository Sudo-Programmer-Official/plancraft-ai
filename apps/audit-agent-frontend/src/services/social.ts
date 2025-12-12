import { postingClient } from './leader/http'

export async function getSocialStatus(workspaceId?: string | null) {
  const { data } = await postingClient.get('/social/status', { params: workspaceId ? { workspaceId } : {} })
  return data || {}
}

export async function getLinkedInAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/social/linkedin/connect', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function getInstagramAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/social/instagram/connect', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function getTwitterAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/social/twitter/connect', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function disconnectSocial(platform: 'linkedin' | 'instagram' | 'twitter') {
  const { data } = await postingClient.post(`/social/disconnect/${platform}`)
  return data
}

export async function setSocialEnabled(workspaceId: string, provider: string, enabled: boolean) {
  const { data } = await postingClient.post('/social/workspace-enabled', { workspaceId, provider, enabled })
  return data
}
