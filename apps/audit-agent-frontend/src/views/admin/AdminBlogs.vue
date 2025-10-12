<template>
  <div class="min-h-screen bg-slate-900 text-white p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
    <div class="md:col-span-5 flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Admin • Blogs</h1>
      <router-link to="/dashboard" class="text-sm px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">← Back to App</router-link>
    </div>
    <div class="md:col-span-2">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xl font-semibold">Posts</h2>
        <div class="flex items-center gap-2">
          <el-button size="small" @click="genIdea">Generate Idea</el-button>
          <el-button size="small" type="primary" @click="newDraft">New Draft</el-button>
        </div>
      </div>
      <div class="space-y-2">
        <div v-for="b in blogs" :key="b.id" @click="select(b)" class="p-3 rounded bg-slate-800 border border-slate-700 hover:border-indigo-500 cursor-pointer">
          <div class="font-medium">{{ b.title }}</div>
          <div class="text-xs text-gray-400">{{ b.published ? 'Published' : 'Draft' }} • {{ b.slug }}</div>
        </div>
      </div>
    </div>
    <div class="md:col-span-3">
      <h2 class="text-xl font-semibold mb-3">Editor</h2>
      <div v-if="active" class="space-y-3">
        <el-input v-model="form.title" placeholder="Title" />
        <el-input v-model="form.summary" type="textarea" :rows="3" placeholder="Summary" />
        <el-input v-model="tags" placeholder="Tags (comma separated)" />
        <el-input v-model="form.coverImage" placeholder="Cover Image URL (optional)" />
        <el-input v-model="form.content" type="textarea" :rows="12" placeholder="Content (HTML/Markdown)" />
        <div class="flex flex-wrap gap-2">
          <el-button @click="saveDraft" type="primary">Save Draft</el-button>
          <el-button @click="publish" type="success">Publish</el-button>
          <el-button @click="remove" type="danger" plain>Delete</el-button>
          <el-button @click="genContent" plain>🧠 Generate Content</el-button>
          <el-button @click="genImage" plain>🎨 Generate Image</el-button>
        </div>
      </div>
      <div v-else class="text-gray-400">Select a post or create a new draft.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBlogs } from '@/composables/useBlogs'
import { createBlog, updateBlog, deleteBlog, publishBlog } from '@/services/blogService'
import api from '@/services/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const { blogs, loading, fetchBlogs } = useBlogs(false)
const active = ref(null)
const form = ref({ title: '', summary: '', content: '', tags: [], coverImage: '', author: '' })
const tags = computed({
  get: () => (Array.isArray(form.value.tags) ? form.value.tags.join(', ') : ''),
  set: (v) => { form.value.tags = String(v || '').split(',').map(s => s.trim()).filter(Boolean) }
})

function select(b) {
  active.value = b
  form.value = { title: b.title || '', summary: b.summary || '', content: b.content || '', tags: b.tags || [], coverImage: b.coverImage || '', author: b.author || '' }
}

function newDraft() {
  active.value = { id: null }
  form.value = { title: '', summary: '', content: '', tags: [], coverImage: '', author: '' }
}

async function saveDraft() {
  try {
    if (!form.value.title) return ElMessage.warning('Title required')
    if (!active.value?.id) {
      const created = await createBlog({ ...form.value, published: false })
      active.value = created
      ElMessage.success('Draft created')
    } else {
      await updateBlog(active.value.id, { ...form.value, published: false })
      ElMessage.success('Draft saved')
    }
    await fetchBlogs()
  } catch (e) { ElMessage.error(e?.message || 'Save failed') }
}

async function publish() {
  try {
    if (!active.value?.id) {
      const created = await createBlog({ ...form.value, published: true })
      active.value = created
    } else {
      await updateBlog(active.value.id, { ...form.value })
      await publishBlog(active.value.id, true)
    }
    ElMessage.success('Published')
    await fetchBlogs()
  } catch (e) { ElMessage.error(e?.message || 'Publish failed') }
}

async function remove() {
  try {
    if (!active.value?.id) return
    await ElMessageBox.confirm('Delete this post?', 'Confirm', { type: 'warning' })
    await deleteBlog(active.value.id)
    active.value = null
    await fetchBlogs()
    ElMessage.success('Deleted')
  } catch {}
}

onMounted(fetchBlogs)

async function ensureId() {
  if (active.value?.id) return active.value.id
  if (!form.value.title) throw new Error('Enter a title first')
  const created = await createBlog({ ...form.value, published: false })
  active.value = created
  await fetchBlogs()
  return created.id
}

async function genContent() {
  try {
    const id = await ensureId()
    const resp = await api.post(`/blogs/${id}/content`)
    if (resp?.data?.success) {
      form.value.content = resp.data.content || form.value.content
      ElMessage.success('Generated content')
      await fetchBlogs()
    } else {
      throw new Error(resp?.data?.error || 'Failed')
    }
  } catch (e) { ElMessage.error(e?.message || 'Generation failed') }
}

async function genImage() {
  try {
    const id = await ensureId()
    const resp = await api.post(`/blogs/${id}/image`)
    if (resp?.data?.success) {
      form.value.coverImage = resp.data.coverImage || form.value.coverImage
      ElMessage.success('Generated image')
      await fetchBlogs()
    } else {
      throw new Error(resp?.data?.error || 'Failed')
    }
  } catch (e) { ElMessage.error(e?.message || 'Image generation failed') }
}

async function genIdea() {
  try {
    const resp = await api.post('/blogs/idea')
    if (resp?.data?.success && resp?.data?.draft) {
      const d = resp.data.draft
      ElMessage.success('Idea created')
      await fetchBlogs()
      // Select newly created draft for editing
      active.value = d
      form.value = {
        title: d.title || '',
        summary: d.summary || '',
        content: d.content || '',
        tags: Array.isArray(d.tags) ? d.tags : [],
        coverImage: d.coverImage || '',
        author: d.author || ''
      }
    } else {
      throw new Error(resp?.data?.error || 'Failed')
    }
  } catch (e) {
    ElMessage.error(e?.message || 'Idea generation failed')
  }
}
</script>

<style scoped>
</style>
