<template>
  <div class="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold text-purple-700 mb-6">📬 Contact Us</h1>
    <p class="text-gray-600 mb-8">
      Have a question, feedback, or a business inquiry? We'd love to hear from you. Fill out the
      form below and our team will get back to you shortly.
    </p>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700">Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Message</label>
        <textarea
          v-model="form.message"
          required
          rows="5"
          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
        ></textarea>
      </div>

      <div>
        <button
          type="submit"
          :disabled="loading"
          class="inline-flex justify-center items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          {{ loading ? 'Sending...' : 'Send Message' }}
        </button>
      </div>

      <p v-if="success" class="text-green-600 font-medium">✅ Message sent successfully!</p>
      <p v-if="error" class="text-red-600 font-medium">
        ❌ Something went wrong. Please try again.
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({ name: '', email: '', message: '' })
const loading = ref(false)
const success = ref(false)
const error = ref(false)

const handleSubmit = async () => {
  loading.value = true
  success.value = false
  error.value = false

  try {
    // Dummy delay simulation; replace this with actual backend request
    await new Promise((resolve) => setTimeout(resolve, 1000))
    success.value = true
    form.value = { name: '', email: '', message: '' }
  } catch (err) {
    console.error(err)
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
input,
textarea {
  font-family: inherit;
}
</style>
