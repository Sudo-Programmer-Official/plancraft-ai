<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-100">
    <div class="max-w-4xl mx-auto py-16 px-6">
  <div class="max-w-3xl mx-auto px-6 py-12 text-gray-200">
    <h1 class="text-3xl font-bold mb-6">📬 Contact Us</h1>
    <p class="mb-6">
      We'd love to hear from you! Whether you have questions, feedback, or need support,
      use the form below or reach us directly via email, website, or LinkedIn.
    </p>

    <!-- 🔹 Contact Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6 bg-gray-800/60 rounded-lg p-6 shadow-md mb-10">
      <div>
        <label class="block text-sm font-medium mb-1">Name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full border border-gray-600 rounded-md shadow-sm px-3 py-2 bg-gray-900 text-gray-200 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="w-full border border-gray-600 rounded-md shadow-sm px-3 py-2 bg-gray-900 text-gray-200 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Message</label>
        <textarea
          v-model="form.message"
          required
          rows="5"
          class="w-full border border-gray-600 rounded-md shadow-sm px-3 py-2 bg-gray-900 text-gray-200 focus:ring-purple-500 focus:border-purple-500"
        ></textarea>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="px-6 py-2 rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
      >
        {{ loading ? 'Sending...' : 'Send Message' }}
      </button>

      <p v-if="success" class="text-green-400 font-medium">✅ Message sent successfully!</p>
      <p v-if="error" class="text-red-400 font-medium">❌ Something went wrong. Please try again.</p>
    </form>

    <!-- 🔹 Direct Contact Info -->
    <div class="space-y-6">
      <div class="bg-gray-800/60 rounded-lg p-6 shadow-md">
        <h2 class="text-xl font-semibold mb-2">📧 Email</h2>
        <a href="mailto:help@sudoprogrammer.com" class="text-blue-400 underline">
          help@sudoprogrammer.com
        </a>
      </div>

      <div class="bg-gray-800/60 rounded-lg p-6 shadow-md">
        <h2 class="text-xl font-semibold mb-2">🌐 Website</h2>
        <a href="https://sudoprogrammer.com" target="_blank" class="text-blue-400 underline">
          sudoprogrammer.com
        </a>
      </div>

      <div class="bg-gray-800/60 rounded-lg p-6 shadow-md">
        <h2 class="text-xl font-semibold mb-2">💼 LinkedIn</h2>
        <a
          href="https://www.linkedin.com/in/fullstuffdeveloper/"
          target="_blank"
          class="text-blue-400 underline"
        >
          Abhishek Kumar Jha
        </a>
      </div>
    </div>
  </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import firebaseApp from '@/firebase/init'

const db = getFirestore(firebaseApp)

const form = ref({ name: '', email: '', message: '' })
const loading = ref(false)
const success = ref(false)
const error = ref(false)

const handleSubmit = async () => {
  loading.value = true
  success.value = false
  error.value = false

  try {
    await addDoc(collection(db, 'contactMessages'), {
      ...form.value,
      createdAt: serverTimestamp()
    })
    success.value = true
    form.value = { name: '', email: '', message: '' }
  } catch (err) {
    console.error('❌ Firestore error:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>
