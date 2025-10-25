import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'

export async function fetchTemplates(orgId, params = {}) {
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  return apiGet(`/api/orgs/${orgId}/templates${suffix}`)
}

export async function fetchTemplateSuggestions(orgId, params = {}) {
  const query = new URLSearchParams(params).toString()
  const suffix = query ? `?${query}` : ''
  return apiGet(`/api/orgs/${orgId}/templates/suggestions${suffix}`)
}

export async function createTemplate(orgId, payload) {
  return apiPost(`/api/orgs/${orgId}/templates`, payload)
}

export async function createTemplateFromProject(orgId, payload) {
  return apiPost(`/api/orgs/${orgId}/templates/from-project`, payload)
}

export async function cloneTemplate(orgId, templateId, payload) {
  return apiPost(`/api/orgs/${orgId}/templates/${templateId}/instantiate`, payload)
}

export async function updateTemplate(orgId, templateId, payload) {
  return apiPatch(`/api/orgs/${orgId}/templates/${templateId}`, payload)
}

export async function deleteTemplate(orgId, templateId) {
  return apiDelete(`/api/orgs/${orgId}/templates/${templateId}`)
}

export default {
  fetchTemplates,
  fetchTemplateSuggestions,
  createTemplate,
  createTemplateFromProject,
  cloneTemplate,
  updateTemplate,
  deleteTemplate,
}
