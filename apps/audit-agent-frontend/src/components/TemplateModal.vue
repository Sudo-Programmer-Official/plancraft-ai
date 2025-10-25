<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="open" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal-panel">
          <header class="modal-header">
            <h2 v-if="mode === 'start'">Start from Template</h2>
            <h2 v-else>Save as Template</h2>
            <button type="button" class="close-btn" @click="$emit('close')" aria-label="Close">×</button>
          </header>

          <section v-if="mode === 'start'" class="modal-body">
            <div class="template-layout">
              <aside class="template-list">
                <h3>Suggestions</h3>
                <p v-if="!suggestions.length" class="empty">No suggestions yet.</p>
                <ul v-else>
                  <li
                    v-for="tpl in suggestions"
                    :key="tpl.id"
                    :class="{ selected: tpl.id === selectedTemplateId }"
                    @click="selectTemplate(tpl.id)"
                  >
                    <strong>{{ tpl.name }}</strong>
                    <span class="meta">{{ tpl.type }} · {{ tpl.industry }}</span>
                  </li>
                </ul>

                <h3>All templates</h3>
                <p v-if="!templates.length" class="empty">No templates saved yet.</p>
                <ul v-else>
                  <li
                    v-for="tpl in templates"
                    :key="tpl.id"
                    :class="{ selected: tpl.id === selectedTemplateId }"
                    @click="selectTemplate(tpl.id)"
                  >
                    <strong>{{ tpl.name }}</strong>
                    <span class="meta">{{ tpl.type }} · {{ tpl.industry }}</span>
                  </li>
                </ul>
              </aside>

              <section class="template-preview" v-if="activeTemplate">
                <header>
                  <h3>{{ activeTemplate.name }}</h3>
                  <p class="summary" v-if="activeTemplate.summary">{{ activeTemplate.summary }}</p>
                  <p class="summary" v-else>Preview tasks and launch a cloned project instantly.</p>
                  <p class="tags">
                    <span class="chip">{{ activeTemplate.type }}</span>
                    <span class="chip">{{ activeTemplate.industry }}</span>
                    <span class="chip" v-if="Array.isArray(activeTemplate.tags) && activeTemplate.tags.length">{{ activeTemplate.tags.join(', ') }}</span>
                  </p>
                </header>

                <div class="tasks-preview" v-if="activeTemplate.tasks?.length">
                  <h4>Included Tasks</h4>
                  <ol>
                    <li v-for="task in activeTemplate.tasks" :key="task.title + task.description">
                      <strong>{{ task.title }}</strong>
                      <span v-if="task.description"> – {{ task.description }}</span>
                    </li>
                  </ol>
                </div>
                <div v-else class="empty">No tasks captured in this template.</div>

                <footer class="actions">
                  <input
                    v-model="projectName"
                    type="text"
                    placeholder="Project name"
                  />
                  <button type="button" class="primary" :disabled="!canCreate" @click="emitCreate">
                    Create Project
                  </button>
                </footer>
              </section>

              <section v-else class="template-placeholder">
                <p>Select a template to preview details.</p>
              </section>
            </div>
          </section>

          <section v-else class="modal-body">
            <form class="template-form" @submit.prevent="emitSave">
              <label>
                Template name
                <input v-model="form.name" type="text" required />
              </label>
              <div class="grid">
                <label>
                  Type
                  <input v-model="form.type" type="text" placeholder="e.g. sprint" />
                </label>
                <label>
                  Industry
                  <input v-model="form.industry" type="text" placeholder="e.g. product" />
                </label>
              </div>
              <label>
                Summary
                <textarea v-model="form.summary" rows="3" placeholder="How should this template be used?" />
              </label>
              <label>
                Tags (comma separated)
                <input v-model="form.tags" type="text" placeholder="marketing, agile, weekly" />
              </label>
              <footer class="actions">
                <button type="button" class="ghost" @click="$emit('close')">Cancel</button>
                <button type="submit" class="primary" :disabled="!form.name.trim() || saving">Save Template</button>
              </footer>
            </form>
          </section>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

interface TemplatePayload {
  id?: string
  name: string
  summary?: string
  type?: string
  industry?: string
  tags?: string[]
  tasks?: Array<Record<string, any>>
}

const props = defineProps<{
  open: boolean
  mode: 'start' | 'save'
  templates: TemplatePayload[]
  suggestions: TemplatePayload[]
  projectNameDefault?: string | null
  saving?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', payload: { templateId: string; name: string }): void
  (e: 'save', payload: { name: string; summary: string; type: string; industry: string; tags: string[] }): void
}>()

const selectedTemplateId = ref<string | null>(null)
const projectName = ref('')

const form = reactive({
  name: '',
  summary: '',
  type: 'general',
  industry: 'general',
  tags: '',
})

const templates = computed(() => props.templates || [])
const suggestions = computed(() => props.suggestions || [])
const saving = computed(() => !!props.saving)

watch(
  () => props.open,
  (open) => {
    if (!open) {
      selectedTemplateId.value = null
      projectName.value = props.projectNameDefault || ''
      return
    }
    projectName.value = props.projectNameDefault || ''
    if (props.mode === 'save') {
      form.name = props.projectNameDefault || ''
      form.type = 'general'
      form.industry = 'general'
      form.summary = ''
      form.tags = ''
    }
  },
  { immediate: true },
)

const mergedTemplates = computed(() => {
  const map = new Map<string, TemplatePayload>()
  ;[...suggestions.value, ...templates.value].forEach((tpl) => {
    if (tpl?.id) map.set(tpl.id, tpl)
  })
  return Array.from(map.values())
})

watch(
  [() => props.open, suggestions, templates],
  ([open]) => {
    if (!open) return
    if (!selectedTemplateId.value) {
      const first = suggestions.value[0] || templates.value[0]
      if (first?.id) {
        selectedTemplateId.value = first.id
        if (!projectName.value) {
          projectName.value = `${first.name} Project`
        }
      }
    }
  },
  { immediate: false },
)

const activeTemplate = computed(() => {
  if (!selectedTemplateId.value) return null
  return mergedTemplates.value.find((tpl) => tpl.id === selectedTemplateId.value) || null
})

const canCreate = computed(() => !!selectedTemplateId.value && !!projectName.value.trim())

function selectTemplate(id: string) {
  selectedTemplateId.value = id
  if (!projectName.value && activeTemplate.value) {
    projectName.value = `${activeTemplate.value.name} Project`
  }
}

function emitCreate() {
  if (!canCreate.value || !selectedTemplateId.value) return
  emit('create', { templateId: selectedTemplateId.value, name: projectName.value.trim() })
}

function emitSave() {
  const tags = form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  emit('save', {
    name: form.name.trim(),
    summary: form.summary.trim(),
    type: form.type.trim() || 'general',
    industry: form.industry.trim() || 'general',
    tags,
  })
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 23, 0.72);
  backdrop-filter: blur(18px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3200;
}

.modal-panel {
  width: min(960px, 94vw);
  max-height: 88vh;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-direction: column;
  box-shadow: 0 34px 80px rgba(8, 12, 23, 0.45);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 28px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.6rem;
}

.close-btn {
  border: none;
  background: rgba(148, 163, 184, 0.2);
  color: inherit;
  font-size: 1.4rem;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  cursor: pointer;
}

.modal-body {
  padding: 0;
  flex: 1;
  overflow: hidden;
}

.template-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 360px;
}

.template-list {
  border-right: 1px solid rgba(148, 163, 184, 0.15);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(15, 23, 42, 0.8);
}

.template-list h3 {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(148, 163, 184, 0.8);
}

.template-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-list li {
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 10px 12px;
  cursor: pointer;
  background: rgba(30, 41, 59, 0.65);
  transition: border-color 140ms ease, background 140ms ease;
}

.template-list li strong {
  display: block;
  font-size: 0.95rem;
}

.template-list li .meta {
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.82);
}

.template-list li:hover {
  border-color: rgba(99, 102, 241, 0.55);
}

.template-list li.selected {
  border-color: rgba(129, 140, 248, 0.8);
  background: rgba(129, 140, 248, 0.2);
}

.template-preview,
.template-placeholder {
  padding: 24px;
  overflow-y: auto;
}

.template-preview header h3 {
  margin: 0 0 6px;
  font-size: 1.35rem;
}

.summary {
  margin: 0 0 12px;
  color: rgba(226, 232, 240, 0.85);
}

.tags .chip {
  display: inline-block;
  margin-right: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.18);
  color: #c7d2fe;
  font-size: 0.75rem;
}

.tasks-preview {
  margin-top: 18px;
}

.tasks-preview h4 {
  margin-bottom: 10px;
}

.tasks-preview ol {
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty {
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

.actions input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.55);
  color: inherit;
}

.primary,
.ghost {
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.primary {
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #f8fafc;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost {
  background: rgba(148, 163, 184, 0.2);
  color: inherit;
}

.template-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.template-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.95rem;
}

.template-form input,
.template-form textarea {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.template-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(148, 163, 184, 0.8);
  font-size: 0.95rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .template-layout {
    grid-template-columns: 1fr;
  }

  .template-list {
    order: 2;
  }

  .template-preview,
  .template-placeholder {
    order: 1;
  }
}
</style>
