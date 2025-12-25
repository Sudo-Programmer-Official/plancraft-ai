<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-100">
    <!-- Logo / Back to Dashboard -->
    <router-link to="/dashboard" class="absolute top-6 left-6 flex items-center gap-2">
      <img src="/logo-bg-remove.png" alt="PlanCraftAI Logo" class="h-10 w-auto sm:h-12 drop-shadow-lg" />
      <span class="text-lg sm:text-xl md:text-2xl font-bold">PlanCraftAI</span>
    </router-link>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto py-16 px-6 text-gray-200">
      <h1 class="text-3xl font-bold mb-6">Data Deletion</h1>
      <p class="mb-4 text-sm text-gray-400">Last updated: October 1, 2025</p>

      <p class="mb-6">
        You may request the deletion of your account and all associated data at any time. We provide
        two ways to request deletion:
      </p>

      <h2 class="text-xl font-semibold mt-8 mb-4">1. Email Request</h2>
      <p class="mb-6">
        Email us at
        <a href="mailto:help@sudoprogrammer.com" class="text-blue-400 underline">help@sudoprogrammer.com</a>.
        Your request will be verified and processed within
        <strong>7 business days</strong>. Once completed, all personal data, tasks, preferences,
        and logs will be permanently deleted.
      </p>

      <h2 class="text-xl font-semibold mt-8 mb-4">2. API Endpoint (for Meta/Facebook Login)</h2>
      <p class="mb-4">
        If you signed up using Meta/Facebook login, you may directly call our secure API endpoint:
      </p>
      <div class="bg-slate-800 text-left p-4 rounded-lg overflow-x-auto text-sm text-gray-200 font-mono shadow-md">
        POST https://plancraftai.com/api/delete-user <br />
        { "userId": "your-facebook-user-id" }
      </div>

      <h2 class="text-xl font-semibold mt-8 mb-4">3. Confirmation</h2>
      <p class="mb-6">
        Once your request is processed, all personal data associated with your account (including
        login information, tasks, integrations, and preferences) will be <strong>permanently
        deleted</strong>.
      </p>

      <!-- Back to app button -->
      <div class="mt-10">
        <router-link
          to="/dashboard"
          class="inline-block px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg transition"
        >
          ← Back to PlanCraftAI
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Data Deletion | PlanCraft AI',
  description:
    'Request deletion of your PlanCraft AI account and data. Learn how to remove your information via email or API.',
  keywords: ['PlanCraft data deletion', 'delete PlanCraft account', 'PlanCraft privacy'],
  canonicalPath: '/data-deletion',
  type: 'article',
  noindex: false,
})
</script>
