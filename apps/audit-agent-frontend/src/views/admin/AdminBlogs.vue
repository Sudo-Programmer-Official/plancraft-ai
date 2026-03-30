<template>
  <div
    class="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] text-slate-100 px-6 md:px-10 py-8 font-inter relative overflow-hidden"
  >
    <!-- Subtle gradient overlay -->
    <div
      class="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.4),transparent_60%),radial-gradient(circle_at_80%_80%,rgba(79,70,229,0.4),transparent_60%)] pointer-events-none"
    ></div>

    <!-- Header -->
    <header
      class="relative flex items-center justify-between mb-10 border-b border-white/10 pb-5"
    >
      <div class="flex items-center gap-3">
        <span
          class="text-3xl md:text-4xl bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent"
          >🧠 Admin • Blogs</span
        >
      </div>

      <router-link
        to="/dashboard"
        class="px-5 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition"
      >
        ← Back to App
      </router-link>
    </header>

    <!-- Published List -->
    <AdminBlogList @select="select" />

    <!-- Grid: Editor + Preview -->
    <div
      class="relative grid md:grid-cols-2 gap-10 md:gap-8 transition-all duration-300"
    >
      <!-- === Editor Section === -->
      <section
        class="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6 transition hover:border-indigo-400/40 hover:bg-white/10"
      >
        <!-- Top controls -->
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-2xl font-semibold flex items-center gap-2 text-indigo-200"
          >
            ✍️ Editor
          </h2>
          <el-button
            size="small"
            plain
            class="!border-indigo-400/30 !text-indigo-300 hover:!bg-indigo-500/10"
            @click="genIdea"
          >
            💡 Generate Idea
          </el-button>
        </div>

        <!-- Title -->
        <div data-field="title">
          <label class="text-sm text-slate-300 mb-1 block">Title</label>
          <el-input
            v-model="form.title"
            placeholder="Enter blog title"
            class="rounded-lg"
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('title')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
          <p v-if="lastModel" class="text-xs text-slate-400 mt-1">Model: {{ lastModel }}</p>
        </div>

        <div data-field="focusKeyword">
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm text-slate-300">SEO Keyword</label>
            <el-button
              size="small"
              text
              class="!text-indigo-300 hover:!text-indigo-200"
              @click="genIdea"
            >
              💡 Use for idea
            </el-button>
          </div>
          <el-input
            v-model="form.focusKeyword"
            placeholder="Example: AI daily planner"
            class="rounded-lg"
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('focusKeyword')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
          <p class="mt-1 text-xs text-slate-400">
            Start with the exact search phrase you want the post to rank for.
          </p>
        </div>

        <!-- Summary -->
        <div data-field="summary">
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm text-slate-300">Summary</label>
            <div class="flex items-center gap-2">
              <el-button size="small" text class="!text-indigo-300 hover:!text-indigo-200" @click="genSummary" :loading="sumLoading">
                ⚡ Generate Summary
              </el-button>
              <el-tooltip content="Enhance current summary">
                <el-button size="small" text class="!text-indigo-300 hover:!text-indigo-200" @click="enhanceField('summary')" :loading="aiLoading">✨</el-button>
              </el-tooltip>
            </div>
          </div>
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            placeholder="Write a short summary..."
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('summary')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
        </div>

        <div data-field="seoTitle">
          <label class="text-sm text-slate-300 mb-1 block">SEO Title</label>
          <el-input
            v-model="form.seoTitle"
            placeholder="Search result title"
            class="rounded-lg"
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('seoTitle')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
          <p class="mt-1 text-xs text-slate-400">
            Keep this around 55-60 characters for cleaner search snippets.
          </p>
        </div>

        <div data-field="metaDescription">
          <label class="text-sm text-slate-300 mb-1 block">Meta Description</label>
          <el-input
            v-model="form.metaDescription"
            type="textarea"
            :rows="2"
            placeholder="Short search description"
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('metaDescription')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
          <p class="mt-1 text-xs text-slate-400">
            Aim for one sentence under 155 characters.
          </p>
        </div>

        <!-- Tags -->
        <div data-field="tags">
          <label class="text-sm text-slate-300 mb-1 block">Tags</label>
          <el-input
            v-model="tags"
            placeholder="Tags (comma separated)"
          >
            <template #append>
              <el-button
                text
                @click="enhanceField('tags')"
                class="text-indigo-400 hover:text-indigo-300"
              >
                ✨
              </el-button>
            </template>
          </el-input>
        </div>

        <!-- Cover Image -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm text-slate-300">Cover Image</label>
            <el-button
              size="small"
              text
              class="!text-indigo-300 hover:!text-indigo-200"
              @click="genImage"
              :loading="imgLoading"
            >
              🎨 Generate
            </el-button>
          </div>
          <el-input
            v-model="form.coverImage"
            placeholder="Image URL"
            class="rounded-lg"
          />
          <p class="mt-1 text-xs text-slate-400">
            Best result: replace AI artwork with a real product screenshot or realistic stock-style cover when possible.
          </p>
          <transition name="fade">
            <img
              v-if="form.coverImage"
              :src="form.coverImage"
              alt="cover preview"
              class="w-full h-48 object-cover rounded-xl mt-4 border border-white/10 shadow-md"
            />
          </transition>
        </div>

        <!-- Content -->
        <div data-field="content">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm text-slate-300">Content</label>
            <div class="flex items-center gap-2">
              <el-tooltip content="Generate full blog from title + summary">
                <el-button
                  size="small"
                  text
                  class="!text-indigo-300 hover:!text-indigo-200"
                  @click="writeContent"
                  :loading="aiLoading"
                >
                  🧠 Write
                </el-button>
              </el-tooltip>
              <el-button
                size="small"
                text
                class="!text-indigo-300 hover:!text-indigo-200"
                @click="enhanceField('content')"
                :loading="aiLoading"
              >
                ✨ Enhance
              </el-button>
            </div>
          </div>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="12"
            placeholder="Write your content in Markdown or HTML..."
          />
          <p v-if="lastModel" class="text-xs text-slate-400 mt-1">Model: {{ lastModel }}</p>
        </div>

        <div class="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.28em] text-emerald-200/80">SEO score</p>
              <div class="mt-2 flex items-center gap-3">
                <span class="text-3xl font-semibold text-white">{{ form.qualityScore || 0 }}</span>
                <span
                  class="rounded-full px-3 py-1 text-xs font-medium"
                  :class="form.qualityReady ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'"
                >
                  {{ form.qualityReady ? 'Ready to publish' : 'Needs work' }}
                </span>
              </div>
              <p class="mt-2 text-xs text-slate-300">
                Word count: {{ form.qualityWordCount || 0 }}
                <span class="mx-2 text-slate-500">•</span>
                Keyword density: {{ form.qualityKeywordDensity || 0 }}%
              </p>
            </div>
            <el-button
              size="small"
              plain
              class="!border-emerald-400/30 !text-emerald-200 hover:!bg-emerald-500/10"
              @click="refreshQuality"
            >
              Check score
            </el-button>
          </div>

          <div v-if="qualityChecks.length" class="mt-4 grid gap-2">
            <div
              v-for="check in qualityChecks"
              :key="check.key"
              class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <span class="text-slate-200">{{ check.label }}</span>
              <span :class="check.passed ? 'text-emerald-300' : 'text-amber-200'">
                {{ check.passed ? 'Pass' : 'Miss' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          class="flex flex-wrap gap-3 justify-end border-t border-white/10 pt-4 mt-4"
        >
          <el-button
            @click="saveDraft"
            type="primary"
            :loading="saving"
            class="!px-5 !py-2"
          >
            💾 Save Draft
          </el-button>
          <el-button
            @click="publish"
            type="success"
            plain
            :disabled="publishBlocked"
            class="!px-5 !py-2"
          >
            🚀 Publish
          </el-button>
          <el-button
            @click="remove"
            type="danger"
            plain
            class="!px-5 !py-2"
          >
            🗑 Delete
          </el-button>
        </div>

        <p
          v-if="autosaved"
          class="text-xs text-indigo-300 mt-3 italic animate-pulse"
        >
          ✓ Auto-saved at {{ new Date().toLocaleTimeString() }}
        </p>
      </section>

      <!-- === Live Preview Section === -->
      <aside
        class="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl transition hover:border-indigo-400/40 hover:bg-white/10"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-indigo-200 flex items-center gap-2">
            👀 Preview
          </h2>
        </div>

        <div
          v-if="!form.title && !form.content"
          class="text-slate-400 italic text-sm"
        >
          Start typing to see a live preview...
        </div>

        <div
          v-else
          class="prose prose-invert max-w-none leading-relaxed space-y-3"
        >
          <div
            v-if="searchPreviewTitle || searchPreviewDescription"
            class="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 not-prose"
          >
            <p class="text-[11px] tracking-wide uppercase text-emerald-200/80">Search snippet</p>
            <p class="mt-2 text-xs text-emerald-300">{{ searchPreviewUrl }}</p>
            <h3 class="mt-1 text-lg font-semibold text-white">
              {{ searchPreviewTitle }}
            </h3>
            <p class="mt-2 text-sm leading-relaxed text-slate-300">
              {{ searchPreviewDescription }}
            </p>
          </div>

          <img
            v-if="form.coverImage"
            :src="form.coverImage"
            class="w-full h-56 object-cover rounded-xl mb-4 shadow-md"
          />
          <h1
            class="text-3xl font-semibold mb-2 text-white tracking-tight leading-snug"
          >
            {{ form.title }}
          </h1>
          <p class="text-indigo-100/90 mb-3 text-sm leading-relaxed">
            {{ form.summary }}
          </p>
          <div v-if="form.focusKeyword || relatedLinks.length" class="mb-5 space-y-3 not-prose">
            <div v-if="form.focusKeyword" class="flex flex-wrap items-center gap-2">
              <span class="text-xs uppercase tracking-[0.28em] text-slate-400">Target keyword</span>
              <span class="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
                {{ form.focusKeyword }}
              </span>
            </div>
            <div v-if="relatedLinks.length" class="space-y-2">
              <p class="text-xs uppercase tracking-[0.28em] text-slate-400">Internal links</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="link in relatedLinks"
                  :key="link.href || link.path"
                  class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                >
                  {{ link.anchorText || link.label || link.path }}
                </span>
              </div>
            </div>
          </div>
          <div v-html="renderedMarkdown" class="text-slate-200"></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { useBlogs } from '@/composables/useBlogs'
import { createBlog, updateBlog, deleteBlog } from '@/services/blogService'
import api from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminBlogList from '@/components/admin/AdminBlogList.vue'

const md = new MarkdownIt({ html: true, linkify: true })
const { fetchBlogs } = useBlogs(false)
const active = ref(null)
const saving = ref(false)
const aiLoading = ref(false)
const imgLoading = ref(false)
const sumLoading = ref(false)
const autosaved = ref(false)
const autoSaving = ref(false)
let autoTimer = null
const lastModel = ref('')

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag || '').trim()).filter(Boolean)
  return String(value || '')
    .split(/[,#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function normalizeFaqItems(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      question: String(item?.question || item?.q || '').trim(),
      answer: String(item?.answer || item?.a || '').trim(),
    }))
    .filter((item) => item.question && item.answer)
}

function normalizeInternalLinks(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      path: String(item?.path || '').trim(),
      href: String(item?.href || '').trim(),
      anchorText: String(item?.anchorText || item?.label || '').trim(),
      label: String(item?.label || item?.anchorText || '').trim(),
    }))
    .filter((item) => item.path || item.href)
}

function normalizeQualityChecks(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => ({
      key: String(item?.key || ''),
      label: String(item?.label || '').trim(),
      passed: !!item?.passed,
      points: Number(item?.points || 0),
    }))
    .filter((item) => item.key && item.label)
}

function buildEmptyForm() {
  return {
    title: '',
    seoTitle: '',
    metaDescription: '',
    focusKeyword: '',
    summary: '',
    content: '',
    tags: [],
    faqItems: [],
    internalLinks: [],
    qualityScore: 0,
    qualityReady: false,
    qualityWordCount: 0,
    qualityKeywordDensity: 0,
    qualityChecks: [],
    coverImage: '',
    author: '',
  }
}

const form = ref(buildEmptyForm())

// Render markdown preview live
const renderedMarkdown = computed(() => md.render(form.value.content || ''))
const searchPreviewTitle = computed(() => form.value.seoTitle || form.value.title || 'SEO title preview')
const searchPreviewDescription = computed(
  () => form.value.metaDescription || form.value.summary || 'Meta description preview'
)
const searchPreviewUrl = computed(() => {
  const slug = String(active.value?.slug || form.value.title || 'new-post')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `plancraftai.com/blog/${slug || 'new-post'}`
})
const relatedLinks = computed(() => normalizeInternalLinks(form.value.internalLinks))
const qualityChecks = computed(() => normalizeQualityChecks(form.value.qualityChecks))
const publishBlocked = computed(() => (form.value.qualityScore || 0) > 0 && !form.value.qualityReady)

const tags = computed({
  get: () => (Array.isArray(form.value.tags) ? form.value.tags.join(', ') : ''),
  set: (v) => {
    form.value.tags = normalizeTags(v)
  }
})

function select(b) {
  active.value = b
  form.value = {
    ...buildEmptyForm(),
    ...b,
    tags: normalizeTags(b?.tags),
    faqItems: normalizeFaqItems(b?.faqItems),
    internalLinks: normalizeInternalLinks(b?.internalLinks),
    qualityChecks: normalizeQualityChecks(b?.qualityChecks),
  }
  refreshQuality({ silent: true })
}

async function ensureId() {
  if (active.value?.id) return active.value.id
  if (!form.value.title) throw new Error('Enter a title first')
  const created = await createBlog({ ...form.value, published: false })
  active.value = created
  await fetchBlogs()
  return created.id
}

// async function enhanceField(field) {
//   try {
//     const id = await ensureId()
//     aiLoading.value = true
//     const resp = await api.post(`/blogs/${id}/enhance`, { field, value: form.value[field] })
//     if (resp?.data?.success && resp?.data?.enhanced) {
//       form.value[field] = resp.data.enhanced
//       ElMessage.success(`✨ ${field} enhanced`)
//     } else throw new Error(resp?.data?.error || 'Enhancement failed')
//   } catch (e) {
//     ElMessage.error(e?.message || 'AI enhancement failed')
//   } finally {
//     aiLoading.value = false
//   }
// }
async function enhanceField(field) {
  try {
    const id = await ensureId()
    aiLoading.value = true
    const resp = await api.post(`/blogs/${id}/enhance`, { field, value: form.value[field] })
    if (resp?.data?.success && resp?.data?.enhanced) {
      if (field === 'tags') form.value.tags = normalizeTags(resp.data.enhanced)
      else form.value[field] = resp.data.enhanced
      lastModel.value = 'AI enhanced'
      ElMessage({
        message: `✨ ${field[0].toUpperCase() + field.slice(1)} enhanced!`,
        type: 'success',
        duration: 2000,
      })
      // mini animation pulse
      const el = document.querySelector(`[data-field='${field}']`)
      if (el) {
        el.classList.add('animate-pulse-once')
        setTimeout(() => el.classList.remove('animate-pulse-once'), 700)
      }
    } else throw new Error(resp?.data?.error || 'Enhancement failed')
  } catch (e) {
    ElMessage.error(e?.message || 'AI enhancement failed')
  } finally {
    aiLoading.value = false
  }
}

async function writeContent() {
  try {
    const id = await ensureId()
    aiLoading.value = true
    await updateBlog(id, {
      title: form.value.title,
      summary: form.value.summary,
      focusKeyword: form.value.focusKeyword,
      seoTitle: form.value.seoTitle,
      metaDescription: form.value.metaDescription,
      tags: form.value.tags,
    })
    const resp = await api.post(`/blogs/${id}/content`)
    if (resp?.data?.success && resp?.data?.content) {
      form.value.content = resp.data.content
      form.value.summary = resp.data.summary || form.value.summary
      form.value.seoTitle = resp.data.seoTitle || form.value.seoTitle
      form.value.metaDescription = resp.data.metaDescription || form.value.metaDescription
      form.value.focusKeyword = resp.data.focusKeyword || form.value.focusKeyword
      form.value.tags = normalizeTags(resp.data.tags || form.value.tags)
      form.value.faqItems = normalizeFaqItems(resp.data.faqItems || form.value.faqItems)
      form.value.internalLinks = normalizeInternalLinks(resp.data.internalLinks || form.value.internalLinks)
      form.value.qualityScore = Number(resp.data.qualityScore || 0)
      form.value.qualityReady = !!resp.data.qualityReady
      form.value.qualityWordCount = Number(resp.data.qualityWordCount || 0)
      form.value.qualityKeywordDensity = Number(resp.data.qualityKeywordDensity || 0)
      form.value.qualityChecks = normalizeQualityChecks(resp.data.qualityChecks)
      lastModel.value = resp?.data?.model || lastModel.value
      ElMessage.success('SEO article generated')
    } else throw new Error(resp?.data?.error || 'Generation failed')
  } catch (e) {
    ElMessage.error(e?.message || 'AI write failed')
  } finally {
    aiLoading.value = false
  }
}

async function genIdea() {
  try {
    const resp = await api.post('/blogs/idea', { keyword: form.value.focusKeyword })
    if (resp?.data?.success && resp?.data?.draft) {
      const d = resp.data.draft
      ElMessage.success('Idea created')
      await fetchBlogs()
      active.value = d
      form.value = {
        ...buildEmptyForm(),
        ...d,
        tags: normalizeTags(d?.tags),
        faqItems: normalizeFaqItems(d?.faqItems),
        internalLinks: normalizeInternalLinks(d?.internalLinks),
        qualityChecks: normalizeQualityChecks(d?.qualityChecks),
      }
      await refreshQuality({ silent: true })
    } else throw new Error(resp?.data?.error || 'Failed')
  } catch (e) {
    ElMessage.error(e?.message || 'Idea generation failed')
  }
}

async function genSummary() {
  try {
    const id = await ensureId()
    sumLoading.value = true
    // persist latest title/content before summarizing
    await updateBlog(id, { title: form.value.title, content: form.value.content, summary: form.value.summary })
    const resp = await api.post(`/blogs/${id}/summarize`)
    if (resp?.data?.success && resp?.data?.summary) {
      form.value.summary = resp.data.summary
      lastModel.value = resp?.data?.model || lastModel.value
      ElMessage.success('Summary generated')
    } else throw new Error(resp?.data?.error || 'Failed')
  } catch (e) {
    ElMessage.error(e?.message || 'Summary generation failed')
  } finally {
    sumLoading.value = false
  }
}

async function genImage() {
  imgLoading.value = true
  try {
    const id = await ensureId()
    const resp = await api.post(`/blogs/${id}/image`)
    if (resp?.data?.success) {
      form.value.coverImage = resp.data.coverImage
      ElMessage.success('Image generated')
    } else throw new Error(resp?.data?.error || 'Failed')
  } catch (e) {
    ElMessage.error(e?.message || 'Image generation failed')
  } finally {
    imgLoading.value = false
  }
}

async function saveDraft() {
  try {
    saving.value = true
    if (!form.value.title) return ElMessage.warning('Title required')
    if (!active.value?.id) {
      const created = await createBlog({ ...form.value, published: false })
      active.value = created
      ElMessage.success('Draft created')
    } else {
      await updateBlog(active.value.id, { ...form.value, published: false })
      ElMessage.success('Draft saved')
    }
    autosaved.value = true
    await fetchBlogs()
    await refreshQuality({ silent: true })
  } catch (e) {
    ElMessage.error(e?.message || 'Save failed')
  } finally {
    saving.value = false
  }
}

async function publish() {
  try {
    // Ensure we have a draft ID and latest fields saved
    const id = await ensureId()
    await updateBlog(id, { ...form.value, published: false })
    // Trigger publish + announcement hook on backend
    const resp = await api.post(`/blogs/${id}/publish`)
    if (resp?.data) {
      form.value.qualityScore = Number(resp.data.qualityScore || form.value.qualityScore || 0)
      form.value.qualityReady = !!resp.data.qualityReady
      form.value.qualityWordCount = Number(resp.data.qualityWordCount || form.value.qualityWordCount || 0)
      form.value.qualityKeywordDensity = Number(resp.data.qualityKeywordDensity || form.value.qualityKeywordDensity || 0)
      form.value.qualityChecks = normalizeQualityChecks(resp.data.qualityChecks || form.value.qualityChecks)
    }
    ElMessage.success('Published')
    await fetchBlogs()
  } catch (e) {
    const data = e?.response?.data
    if (data?.qualityChecks) {
      form.value.qualityScore = Number(data.qualityScore || 0)
      form.value.qualityReady = !!data.qualityReady
      form.value.qualityWordCount = Number(data.qualityWordCount || 0)
      form.value.qualityKeywordDensity = Number(data.qualityKeywordDensity || 0)
      form.value.qualityChecks = normalizeQualityChecks(data.qualityChecks)
    }
    ElMessage.error(data?.error || e?.message || 'Publish failed')
  }
}

async function refreshQuality(options = {}) {
  const { silent = false } = options
  try {
    if (!active.value?.id) return
    const resp = await api.post(`/blogs/${active.value.id}/score`)
    if (resp?.data?.success) {
      form.value.qualityScore = Number(resp.data.qualityScore || 0)
      form.value.qualityReady = !!resp.data.qualityReady
      form.value.qualityWordCount = Number(resp.data.qualityWordCount || 0)
      form.value.qualityKeywordDensity = Number(resp.data.qualityKeywordDensity || 0)
      form.value.qualityChecks = normalizeQualityChecks(resp.data.qualityChecks)
      if (!silent) ElMessage.success('Blog score refreshed')
    }
  } catch (e) {
    if (!silent) ElMessage.error(e?.response?.data?.error || e?.message || 'Failed to score blog')
  }
}

async function remove() {
  try {
    if (!active.value?.id) return
    await ElMessageBox.confirm('Delete this post?', 'Confirm', { type: 'warning' })
    await deleteBlog(active.value.id)
    active.value = null
    form.value = buildEmptyForm()
    await fetchBlogs()
    ElMessage.success('Deleted')
  } catch {
    /* noop */
  }
}

onMounted(fetchBlogs)

// Debounced auto-save when title/summary change
watch(
  () => [
    form.value.title,
    form.value.summary,
    form.value.focusKeyword,
    form.value.seoTitle,
    form.value.metaDescription,
  ],
  () => {
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = setTimeout(async () => {
      try {
        if (!form.value.title) return
        autoSaving.value = true
        const id = await ensureId()
        await updateBlog(id, {
          title: form.value.title,
          summary: form.value.summary,
          focusKeyword: form.value.focusKeyword,
          seoTitle: form.value.seoTitle,
          metaDescription: form.value.metaDescription,
          published: false,
        })
        autosaved.value = true
      } catch {
        // no-op
      } finally {
        autoSaving.value = false
      }
    }, 800)
  }
)
</script>

<style scoped>
/* === PlanCraftAI Unified Theme (inspired by TaskPlannerDialog) === */

:root {
  --bg-gradient: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  --text-light: #e2e8f0;
  --text-muted: #94a3b8;
  --border-faint: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.2);
  --surface-dark: rgba(255, 255, 255, 0.06);
  --surface-hover: rgba(255, 255, 255, 0.1);
  --indigo-accent: #6366f1;
  --emerald-accent: linear-gradient(to right, #059669, #10b981, #06b6d4);
}

/* Background + Layout */
.min-h-screen {
  background: var(--bg-gradient);
  color: var(--text-light);
}

/* Card & Panels */
.bg-slate-800,
.bg-slate-800\/70 {
  background-color: var(--surface-dark) !important;
  border: 1px solid var(--border-faint) !important;
  backdrop-filter: blur(10px);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.bg-slate-800:hover {
  background-color: var(--surface-hover) !important;
  transform: translateY(-2px);
  border-color: var(--border-strong) !important;
}

/* Headings */
h1, h2 {
  color: #f8fafc;
  font-weight: 600;
  letter-spacing: 0.4px;
}

/* Text Contrast */
.text-gray-400,
.text-gray-600 {
  color: var(--text-muted) !important;
}

/* Buttons */
.el-button--primary {
  background: var(--emerald-accent) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
}
.el-button--primary:hover {
  background: linear-gradient(to right, #047857, #059669, #0ea5e9) !important;
}

.el-button.is-plain {
  background-color: transparent !important;
  border: 1px solid var(--border-strong) !important;
  color: #cbd5e1 !important;
}
.el-button.is-plain:hover {
  background-color: var(--surface-hover) !important;
}

/* Blog List Cards */
.border-slate-700 {
  border-color: var(--border-faint) !important;
}
.border-indigo-500 {
  border-color: var(--indigo-accent) !important;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
}
.font-medium {
  color: #f1f5f9;
}

/* Inputs inside editor */
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid var(--border-strong) !important;
  color: var(--text-light) !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--indigo-accent) !important;
  background-color: rgba(255, 255, 255, 0.12) !important;
}
:deep(.el-input__inner::placeholder),
:deep(.el-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

/* Animations */
.shadow-md {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* Subtle pulse for auto-save text */
.animate-pulse {
  color: #93c5fd;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: #ffffff !important;
  caret-color: #ffffff !important;
}
</style>
