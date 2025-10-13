<template>
  <div class="mb-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-xl font-semibold text-indigo-200">📰 Published Blogs</h2>
      <el-button
        size="small"
        plain
        class="!border-indigo-400/30 !text-indigo-300 hover:!border-indigo-400 hover:!text-indigo-200 transition"
        @click="reload"
      >
        Refresh
      </el-button>
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="text-sm text-indigo-300/70 py-6 animate-pulse">
      Loading published blogs...
    </div>

    <!-- Blog Grid -->
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="b in blogs"
        :key="b.id"
        class="group bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md hover:border-indigo-400/40 hover:shadow-lg hover:shadow-indigo-900/30 hover:scale-[1.02] transition-all duration-200 flex flex-col justify-between"
      >
        <!-- Blog Info -->
        <div class="flex items-start gap-3">
          <img
            v-if="b.coverImage"
            :src="b.coverImage"
            alt="cover"
            class="w-16 h-16 object-cover rounded-lg border border-white/10 flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <!-- Title -->
            <p
              class="font-semibold text-slate-50 line-clamp-2 leading-snug hover:text-indigo-300 cursor-pointer transition"
              :title="b.title"
            >
              {{ b.title }}
            </p>
            <!-- Summary -->
            <p
              class="text-xs text-indigo-200/80 line-clamp-2 mt-1"
              :title="b.summary"
            >
              {{ b.summary }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between mt-3">
          <span
            class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-400/30"
          >
            Published
          </span>
          <el-button
            size="small"
            plain
            class="!border-indigo-400/30 !text-indigo-200 hover:!border-indigo-400 hover:!text-indigo-100 transition"
            @click="$emit('select', b)"
          >
            Edit
          </el-button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!loading && blogs.length === 0"
        class="col-span-full text-slate-400 text-sm italic text-center py-6"
      >
        No published blogs yet.
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useBlogs } from '@/composables/useBlogs'

const emit = defineEmits(['select'])
const { blogs, loading, fetchBlogs } = useBlogs(true)

function reload() {
  fetchBlogs()
}

onMounted(fetchBlogs)
</script>

<style scoped>
/* Adds support for multi-line truncation (if Tailwind line-clamp plugin missing) */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Smooth hover scaling + shadow transition */
.group {
  transition: all 0.25s ease-in-out;
}

.group:hover {
  transform: translateY(-2px);
}

/* Optional: Fine tune scrollbar hiding (for visual consistency) */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>