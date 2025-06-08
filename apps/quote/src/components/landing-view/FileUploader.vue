<template>
  <div class="space-y-4">
    <el-upload
      class="upload-demo"
      drag
      multiple
      :auto-upload="false"
      :on-change="handleChange"
      :file-list="fileList"
      accept=".pdf,.txt,.docx"
    >
      <!-- <i class="el-icon-upload" /> -->
      <div class="el-upload__text">Drop files here or <em>click to upload</em></div>
    </el-upload>

    <el-button type="primary" @click="uploadFiles">Upload Files</el-button>

    <ul v-if="downloadUrls.length" class="mt-4 text-sm">
      <li v-for="url in downloadUrls" :key="url" class="text-blue-600 truncate">
        {{ url }}
      </li>
    </ul>

    <div v-if="uploadError" class="text-red-500">{{ uploadError.message }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import useMultiFileUpload from '@/composables/useMultiFileUpload'

const fileList = ref([])
const { uploadFiles, uploadProgress, uploadError, downloadUrls } = useMultiFileUpload()

const handleChange = ({ file, fileList: newList }) => {
  fileList.value = newList
}

const uploadFilesWrapper = async () => {
  const files = fileList.value
  if (files.length === 0) return
  await uploadFiles(files)
}
</script>
