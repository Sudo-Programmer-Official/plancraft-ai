import api from '@/services/api'

export async function listReports(limit = 3, workspaceId = null) {
  const params = { limit }
  const config = { params }
  if (workspaceId) {
    params.workspaceId = workspaceId
    config.headers = { 'x-workspace-id': workspaceId }
  }
  const { data } = await api.get('/reports/list', config)
  return data?.items || []
}

export async function generateReport(period = 'weekly', sendEmail = false, workspaceId = null) {
  const payload = { period, sendEmail }
  const config = {}
  if (workspaceId) {
    payload.workspaceId = workspaceId
    config.headers = { 'x-workspace-id': workspaceId }
  }
  const { data } = await api.post('/reports/generate', payload, config)
  return data?.report
}
