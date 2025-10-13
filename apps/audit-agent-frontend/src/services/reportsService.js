import api from '@/services/api'

export async function listReports(limit = 3) {
  const { data } = await api.get('/reports/list', { params: { limit } })
  return data?.items || []
}

export async function generateReport(period = 'weekly', sendEmail = false) {
  const { data } = await api.post('/reports/generate', { period, sendEmail })
  return data?.report
}

