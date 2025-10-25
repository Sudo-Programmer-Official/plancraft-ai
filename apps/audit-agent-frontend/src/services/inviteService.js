import { apiGet, apiPost } from '@/lib/api'

export async function fetchOrgInvites(orgId) {
  const res = await apiGet(`/api/orgs/${orgId}/invites`)
  return Array.isArray(res) ? res : []
}

export async function sendOrgInvite({ orgId, email, role }) {
  const payload = { email, role }
  return apiPost(`/api/orgs/${orgId}/invites`, payload)
}

export async function acceptInviteToken(token) {
  return apiPost(`/api/invites/${token}/accept`, {})
}

export default {
  fetchOrgInvites,
  sendOrgInvite,
  acceptInviteToken,
}
