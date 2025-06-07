<template>
  <div class="bg-white py-10 px-6 rounded shadow max-w-xl mx-auto text-center mt-12">
    <p class="mb-4 text-lg font-semibold text-gray-800">Want to save your quote?</p>

    <el-input
      v-model="email"
      placeholder="Enter your email"
      type="email"
      size="large"
      class="w-full mb-4"
      clearable
    />

    <el-button
      type="primary"
      size="large"
      class="w-full sm:w-auto"
      :disabled="!isValidEmail"
      @click="submitEmail"
    >
      Send Quote to Email
    </el-button>

    <p v-if="submitted" class="text-green-600 mt-4">✅ Quote sent to {{ email }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const email = ref('')
const submitted = ref(false)

const isValidEmail = computed(() => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(email.value)
})

function submitEmail() {
  if (!isValidEmail.value) return
  submitted.value = true
  console.log('Email sent to:', email.value)
  // You can later hook into Firebase, EmailOctopus, or your Node backend here.
}
</script>
