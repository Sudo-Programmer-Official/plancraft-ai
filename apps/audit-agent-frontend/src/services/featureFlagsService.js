import api from '@/services/api'

export async function fetchFeatureFlags() {
  const { data } = await api.get('/feature-flags')
  return data || {}
}

export async function fetchAdminFeatureFlags() {
  const { data } = await api.get('/admin/feature-flags')
  return data || {}
}

export async function updateAdminFeatureFlags(flags) {
  const { data } = await api.patch('/admin/feature-flags', { flags })
  return data || {}
}
