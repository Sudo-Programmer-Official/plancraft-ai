import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '@/lib/api'
import { useToastStore } from '@/stores/toastStore'
import {
  fetchTemplates,
  fetchTemplateSuggestions,
  createTemplateFromProject,
  cloneTemplate,
  deleteTemplate as apiDeleteTemplate,
  updateTemplate as apiUpdateTemplate,
} from '@/services/templateService'
import { trackEvent } from '@/services/analytics'

export interface ProjectPayload {
  name: string
  key?: string
  status?: string
  leadUid?: string | null
  defaultAssignees?: string[]
}

export interface Project extends ProjectPayload {
  id: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const templates = ref<any[]>([])
  const templatesLoading = ref(false)
  const templateSuggestions = ref<any[]>([])
  const templateSaving = ref(false)
  const toastStore = useToastStore()

  async function load(orgId: string) {
    if (!orgId) return []
    loading.value = true
    try {
      const res = await apiGet(`/api/orgs/${orgId}/projects`)
      projects.value = Array.isArray(res) ? res : []
      return projects.value
    } finally {
      loading.value = false
    }
  }

  async function create(orgId: string, payload: ProjectPayload) {
    if (!orgId) throw new Error('Missing orgId')
    const project = await apiPost(`/api/orgs/${orgId}/projects`, payload)
    projects.value.unshift(project)
    return project
  }

  async function loadTemplates(orgId: string) {
    if (!orgId) return []
    templatesLoading.value = true
    try {
      const list = await fetchTemplates(orgId)
      templates.value = Array.isArray(list) ? list : []
      return templates.value
    } catch (err) {
      console.warn('[projectStore] Failed to load templates', err)
      templates.value = []
      return []
    } finally {
      templatesLoading.value = false
    }
  }

  async function loadTemplateSuggestions(orgId: string) {
    if (!orgId) {
      templateSuggestions.value = []
      return []
    }
    try {
      const list = await fetchTemplateSuggestions(orgId)
      templateSuggestions.value = Array.isArray(list) ? list : []
      return templateSuggestions.value
    } catch (err) {
      console.warn('[projectStore] Failed to load template suggestions', err)
      templateSuggestions.value = []
      return []
    }
  }

  async function saveTemplateFromProject(orgId: string, projectId: string, payload: { name: string; summary?: string; type?: string; industry?: string; tags?: string[] }) {
    if (!orgId || !projectId) throw new Error('Missing identifiers')
    templateSaving.value = true
    try {
      const result = await createTemplateFromProject(orgId, { projectId, ...payload })
      templates.value = [result, ...templates.value]
      toastStore.push('Template saved', { type: 'success', duration: 2600 })
      trackEvent('template_saved', { orgId, projectId, templateId: result.id })
      return result
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to save template'
      toastStore.push(message, { type: 'error', duration: 3200 })
      trackEvent('template_save_failed', { orgId, projectId, reason: message })
      throw err
    } finally {
      templateSaving.value = false
    }
  }

  async function startProjectFromTemplate(orgId: string, templateId: string, overrides: { name: string; key?: string }) {
    if (!orgId || !templateId) throw new Error('Missing identifiers')
    try {
      const result = await cloneTemplate(orgId, templateId, overrides)
      if (result?.project) {
        projects.value.unshift(result.project)
      }
      toastStore.push('Project created from template', { type: 'success', duration: 2600 })
      trackEvent('template_instantiated', { orgId, templateId, projectId: result?.projectId })
      return result
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to create project'
      toastStore.push(message, { type: 'error', duration: 3200 })
      trackEvent('template_instantiate_failed', { orgId, templateId, reason: message })
      throw err
    }
  }

  async function deleteTemplate(orgId: string, templateId: string) {
    if (!orgId || !templateId) return
    try {
      await apiDeleteTemplate(orgId, templateId)
      templates.value = templates.value.filter((tpl) => tpl.id !== templateId)
      toastStore.push('Template deleted', { type: 'info', duration: 2200 })
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to delete template'
      toastStore.push(message, { type: 'error', duration: 3200 })
      throw err
    }
  }

  async function updateTemplate(orgId: string, templateId: string, updates: Record<string, any>) {
    if (!orgId || !templateId) throw new Error('Missing identifiers')
    try {
      const result = await apiUpdateTemplate(orgId, templateId, updates)
      const idx = templates.value.findIndex((tpl) => tpl.id === templateId)
      if (idx >= 0) templates.value[idx] = result
      return result
    } catch (err) {
      console.warn('[projectStore] Failed to update template', err)
      throw err
    }
  }

  function clear() {
    projects.value = []
    templates.value = []
    templateSuggestions.value = []
  }

  return {
    projects,
    loading,
    templates,
    templatesLoading,
    templateSuggestions,
    templateSaving,
    load,
    create,
    loadTemplates,
    loadTemplateSuggestions,
    saveTemplateFromProject,
    startProjectFromTemplate,
    deleteTemplate,
    updateTemplate,
    clear,
  }
})
