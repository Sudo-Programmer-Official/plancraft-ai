import { ref, onMounted } from 'vue'
import { listBlogs } from '@/services/blogService'

export function useBlogs(publishedOnly = false) {
  const blogs = ref([])
  const loading = ref(true)

  const fetchBlogs = async () => {
    loading.value = true
    try {
      blogs.value = await listBlogs(publishedOnly)
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchBlogs)
  return { blogs, loading, fetchBlogs }
}

