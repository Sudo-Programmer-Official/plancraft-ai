<template>
  <section
    class="w-full h-screen bg-cover bg-center flex items-center justify-center text-white px-4"
    :style="`background-image: url(${heroImage})`"
  >
    <!-- Logo -->
    <div class="absolute top-8 left-12 z-10 h-24">
      <img :src="logo" alt="Prompt2Quote Logo" class="h-24 md:h-16 drop-shadow-md" height="44" />
    </div>

    <!-- Main Content -->
    <div class="text-center max-w-2xl mx-auto">
      <h1 class="text-5xl sm:text-6xl font-bold leading-tight mb-4 text-white drop-shadow-lg">
        Turn Your Idea into a <br class="hidden sm:inline" />
        Quote, Instantly
      </h1>
      <p class="text-lg sm:text-xl text-white/90 mb-8">
        Enter a product idea. We’ll show you cost, timeline, <br class="hidden sm:inline" />
        and stack — in seconds.
      </p>

      <!-- Input Card -->
      <div class="bg-white/90 backdrop-blur-sm rounded-xl p-6 max-w-xl mx-auto shadow-lg space-y-4">
        <!-- Idea Textarea -->
        <el-input
          v-model="quoteStore.idea"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="⚙️ Describe your product idea"
          size="large"
          :disabled="quoteStore.loading"
          clearable
        />

        <!-- File Upload UI -->
        <div class="flex items-center gap-3">
          <el-upload
            class="upload-demo"
            :auto-upload="false"
            :multiple="true"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".pdf,.txt,.docx,.md"
          >
            <el-button text icon="el-icon-plus ml-2">
              <!-- <Upload class="text-gray-500" /> -->
              <el-icon><Upload /></el-icon>
              <span class="text-sm text-gray-600">Attach a file</span>
            </el-button>
          </el-upload>

          <!-- File Preview -->
          <div v-if="selectedFiles.length" class="text-xs text-gray-700">
            <span class="font-semibold">Attached:</span>
            <span v-for="(file, index) in selectedFiles" :key="index" class="ml-2">
              {{ file.name }}
            </span>
          </div>
        </div>

        <!-- Submit -->
        <el-button
          type="primary"
          size="large"
          class="w-full"
          :loading="quoteStore.loading"
          @click="handleGenerate"
        >
          {{ quoteStore.loading ? 'Generating...' : 'Generate Quote' }}
        </el-button>
      </div>
    </div>
  </section>
</template>

<script setup>
import heroImage from '@/assets/images/hero-bg-image.png'
import { View } from '@element-plus/icons-vue'
import logo from '@/assets/images/logo.svg'
import { Upload } from '@element-plus/icons-vue'
import { useQuoteStore } from '@/stores/quoteStore'
import { ref } from 'vue'
import useMultiFileUpload from '@/composables/useMultiFileUpload' // ← Your existing composable

const quoteStore = useQuoteStore()
const selectedFiles = ref([])
const { uploadFiles, downloadUrls } = useMultiFileUpload()

// Handle File Change
function handleFileChange(fileObj) {
  selectedFiles.value = fileObj.fileList.map((f) => f.raw)
}

// Handle Generate Button
async function handleGenerate() {
  if (!quoteStore.idea.trim()) return

  if (selectedFiles.value.length > 0) {
    await uploadFiles(selectedFiles.value)
    const firstFileUrl = downloadUrls.value?.[0] || ''
    await quoteStore.generateQuoteWithFile(firstFileUrl)
  } else {
    await quoteStore.generateQuote()
  }
}
</script>

<style scoped>
/* optional scrollbar styling */
</style>
