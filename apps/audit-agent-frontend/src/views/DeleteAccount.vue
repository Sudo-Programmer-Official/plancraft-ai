<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-900">
    <router-link to="/" class="absolute top-6 left-6 flex items-center gap-2">
      <img src="/plancraft-mark.svg" alt="PlanCraftAI Logo" class="h-10 w-auto sm:h-12 drop-shadow-lg" />
      <span class="text-lg sm:text-xl md:text-2xl font-bold">PlanCraftAI</span>
    </router-link>

    <div class="max-w-4xl mx-auto py-16 px-6 text-gray-200">
      <h1 class="text-3xl font-bold mb-6">Delete Your Account</h1>
      <p class="mb-4 text-sm text-gray-400">Last updated: April 6, 2026</p>

      <p class="mb-6">
        If you can sign in to <strong>PlanCraftAI</strong>, delete your account directly inside the app:
        <strong> Settings → Account → Delete Account</strong>.
      </p>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-4">
        <h2 class="text-xl font-semibold text-white">How to Delete Your Account</h2>
        <ol class="list-decimal pl-6 space-y-2">
          <li>Open the app and sign in to your account.</li>
          <li>Go to <strong>Settings</strong>.</li>
          <li>Open the <strong>Account</strong> section.</li>
          <li>Tap <strong>Delete Account</strong> and confirm the permanent deletion.</li>
        </ol>
      </div>

      <div class="bg-indigo-500/10 border border-indigo-300/20 rounded-2xl p-6 mb-8 space-y-3">
        <h2 class="text-xl font-semibold text-white">Can't Sign In?</h2>
        <p>
          If you no longer have access to the account, email
          <a href="mailto:support@plancraftai.com" class="text-blue-400 underline">support@plancraftai.com</a>
          from your registered email address, or include the email address or phone number linked to the account so we can verify ownership manually.
        </p>
      </div>

      <div class="space-y-5">
        <div>
          <h2 class="text-xl font-semibold mb-3">What We Delete</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>Your account profile and authentication access.</li>
            <li>Tasks, planner entries, reminders, notes, and linked workspace data associated with your account.</li>
            <li>Connected integration tokens and synced access for services like Google Calendar, Slack, Discord, Twilio, and WhatsApp.</li>
            <li>Stored voice, transcription, and productivity data associated with your account, unless retention is legally required.</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xl font-semibold mb-3">What May Be Retained</h2>
          <p class="mb-4">
            We may retain limited records when required for legal, fraud-prevention, security, tax, or accounting purposes,
            such as subscription transaction history processed by Stripe.
          </p>
        </div>

        <div>
          <h2 class="text-xl font-semibold mb-3">Need Help?</h2>
          <p>
            If you cannot access your registered email, contact
            <a href="mailto:help@sudoprogrammer.com" class="text-blue-400 underline">help@sudoprogrammer.com</a>
            and include enough information for us to verify ownership of the account.
          </p>
        </div>
      </div>
    </div>

    <footer class="py-8 text-center text-sm text-indigo-200 bg-slate-950/80 border-t border-white/10">
      <div class="max-w-4xl mx-auto px-6 space-y-2">
        <p>
          © {{ new Date().getFullYear() }} <strong>Sudo Programmer Inc.</strong> — PlanCraftAI · All rights reserved.
        </p>
        <div class="space-x-4">
          <router-link to="/privacy" class="hover:underline">Privacy</router-link>
          <router-link to="/terms" class="hover:underline">Terms</router-link>
          <router-link to="/contact" class="hover:underline">Contact</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Delete Your Account | PlanCraftAI',
  description:
    'Delete your PlanCraftAI account inside the app, or request manual help if you cannot access your account.',
  keywords: ['PlanCraftAI account deletion', 'delete PlanCraftAI account', 'PlanCraftAI data deletion'],
  canonicalPath: '/delete-account',
  type: 'article',
})
</script>
