import api from '@/services/api'

export async function deleteAccount() {
  const { data } = await api.delete('/account')
  return data || {}
}
