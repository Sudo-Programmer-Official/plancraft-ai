import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'

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

export async function fetchInvitePreview(token) {
  if (!token) throw new Error('Missing invite token')
  return apiGet(`/api/invites/${token}`)
}

export async function resendOrgInvite(orgId, inviteId) {
  return apiPatch(`/api/orgs/${orgId}/invites/${inviteId}/resend`, {})
}

export async function revokeOrgInvite(orgId, inviteId) {
  return apiDelete(`/api/orgs/${orgId}/invites/${inviteId}`)
}

export async function validateInviteDomain(orgId, email) {
  return apiPost(`/api/orgs/${orgId}/invites/validate-domain`, { email })
}

export default {
  fetchOrgInvites,
  sendOrgInvite,
  acceptInviteToken,
  fetchInvitePreview,
  resendOrgInvite,
  revokeOrgInvite,
  validateInviteDomain,
}
