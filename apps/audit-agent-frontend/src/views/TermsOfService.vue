<template>
  <div class="marketing-light min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-900">
    <router-link
      to="/"
      class="absolute top-6 left-6 z-20 flex items-center gap-2 cursor-pointer"
    >
      <img
        src="/plancraft-mark.svg"
        alt="PlanCraftAI Logo"
        class="h-10 w-auto sm:h-12 md:h-14 drop-shadow-lg select-none"
      />
      <span class="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
        PlanCraftAI
      </span>
    </router-link>

    <div class="max-w-4xl mx-auto py-16 px-6">
      <div class="max-w-4xl mx-auto px-6 py-12 text-gray-200">
        <h1 class="text-3xl font-bold mb-6">📜 Terms of Use</h1>
        <p class="mb-4 text-sm text-gray-400">Last updated: April 6, 2026</p>

        <p class="mb-6">
          Welcome to <strong>PlanCraftAI</strong>. By using our application, you agree to the
          following terms. Please read them carefully.
        </p>

        <div class="space-y-8">
          <!-- Section 1 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using PlanCraftAI, you agree to comply with these Terms & Conditions.
              If you do not agree, you must not use the service.
            </p>
          </section>

          <!-- Section 2 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">2. Use of Service</h2>
            <p>
              PlanCraftAI is designed to help you plan daily, weekly, and monthly goals. You agree
              not to misuse the service, attempt unauthorized access, or disrupt our systems.
            </p>
          </section>

          <!-- Section 3 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">3. User Responsibilities</h2>
            <p>
              You agree to maintain accurate account information, safeguard your login credentials,
              and comply with applicable laws while using PlanCraftAI. By connecting a Google Account,
              users grant PlanCraftAI limited, read-only access to view calendar events solely for
              the purpose of displaying and managing reminders within the app.
            </p>
          </section>

          <!-- Section 4 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">4. Data & Privacy</h2>
            <p>
              We respect your privacy. Guest data is temporary and not saved. Logged-in users’ data
              is securely stored. For more details, please review our
              <router-link to="/privacy" class="text-blue-400 underline">Privacy Policy</router-link>.
              If you wish to delete your data, please visit our
              <router-link to="/data-deletion" class="text-blue-400 underline">Data Deletion page</router-link>.
            </p>
          </section>

          <!-- Section 5 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">5. Google Calendar Data Usage</h2>
            <div class="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5 text-slate-100/90">
              <div>
                <p class="font-semibold text-lg mb-2 text-white">Description of Data Access</p>
                <ul class="list-disc pl-6 space-y-1">
                  <li>PlanCraftAI requests read-only (<code>calendar.readonly</code>) permissions to view upcoming events, times, and titles.</li>
                  <li>The app will never modify, delete, or create events on your Google Calendar.</li>
                </ul>
              </div>
              <div>
                <p class="font-semibold text-lg mb-2 text-white">Purpose of Access</p>
                <ul class="list-disc pl-6 space-y-1">
                  <li>Event data appears only inside your AI planner dashboard to list upcoming meetings and reminders.</li>
                  <li>It powers scheduling recommendations, reminder timing, and summary insights.</li>
                </ul>
              </div>
              <div>
                <p class="font-semibold text-lg mb-2 text-white">Data Handling</p>
                <ul class="list-disc pl-6 space-y-1">
                  <li>PlanCraftAI does not store, share, or sell Google Calendar data.</li>
                  <li>Information stays encrypted in transit and is visible only to the authenticated user during their session.</li>
                  <li>No calendar data is transmitted to any third-party systems outside PlanCraftAI infrastructure.</li>
                </ul>
              </div>
              <div>
                <p class="font-semibold text-lg mb-2 text-white">User Control</p>
                <ul class="list-disc pl-6 space-y-1">
                  <li>You can revoke Google access anytime from your Google Account settings.</li>
                  <li>Deleting your PlanCraftAI account immediately revokes and removes stored OAuth tokens.</li>
                </ul>
              </div>
              <div>
                <p class="font-semibold text-lg mb-2 text-white">Compliance Statement</p>
                <p>PlanCraftAI adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>
              </div>
            </div>
          </section>

          <!-- Section 6 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">6. Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account. We are not liable
              for any loss or damage arising from unauthorized use of your account.
            </p>
          </section>

          <!-- Section 7 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">7. Payments & Subscriptions</h2>
            <p>
              If you choose a paid plan, payments are securely processed via
              <strong>Stripe</strong>. We do not store your card details. Subscription renewals,
              billing cycles, and cancellations are governed by Stripe’s policies.
            </p>
            <p class="mt-3">
              If you subscribe through the Apple App Store, Apple’s standard Licensed Application End User License Agreement also applies:
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noreferrer"
                class="text-blue-400 underline"
              >
                Apple Standard EULA
              </a>.
            </p>
          </section>

          <!-- Section 8 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p>
              PlanCraftAI is provided “as is.” We are not liable for indirect, incidental, or
              consequential damages that may result from using our service.
            </p>
          </section>

          <!-- Section 9 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the service means you
              accept the revised Terms.
            </p>
          </section>
        </div>

        <!-- Footer -->
        <div class="mt-12 py-6 text-sm text-gray-300 text-center border border-white/5 rounded-2xl bg-white/5">
          <p>
            Questions about these Terms? Email
            <a href="mailto:support@plancraftai.com" class="text-blue-400 underline">
              support@plancraftai.com
            </a>.
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
  title: 'Terms of Use | PlanCraft AI',
  description:
    'Review the terms of use for PlanCraft AI, including billing, account responsibilities, calendar data handling, and the Apple standard EULA for App Store subscriptions.',
  keywords: ['PlanCraft terms', 'PlanCraft AI terms of service', 'PlanCraft user agreement'],
  canonicalPath: '/terms',
  type: 'article',
})
</script>
