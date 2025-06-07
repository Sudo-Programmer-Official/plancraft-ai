<template>
  <section class="bg-white py-20 px-6">
    <div class="max-w-xl mx-auto text-center">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Want to save your quote?</h2>
      <p class="text-gray-600 mb-6">We’ll send it to your email so you don’t lose it.</p>

      <div class="flex flex-col sm:flex-row items-center gap-4">
        <el-input
          v-model="email"
          placeholder="Enter your email"
          type="email"
          size="large"
          class="w-full flex-1"
          clearable
        />

        <el-button
          type="primary"
          size="large"
          class="px-6 py-3 font-semibold"
          :disabled="!isValidEmail"
          @click="submitEmail"
        >
          Send Quote
        </el-button>
      </div>

      <p v-if="submitted" class="text-green-600 mt-6">
        ✅ Quote sent to <strong>{{ email }}</strong>
      </p>
    </div>
  </section>
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
}
</script>
