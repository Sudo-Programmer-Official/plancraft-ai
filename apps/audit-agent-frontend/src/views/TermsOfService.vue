<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-100">
    <router-link
      to="/dashboard"
      class="absolute top-6 left-6 z-20 flex items-center gap-2 cursor-pointer"
    >
      <img
        src="/logo-bg-remove.png"
        alt="PlanCraftAI Logo"
        class="h-10 w-auto sm:h-12 md:h-14 drop-shadow-lg select-none"
      />
      <span class="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
        PlanCraftAI
      </span>
    </router-link>

    <div class="max-w-4xl mx-auto py-16 px-6">
      <div class="max-w-4xl mx-auto px-6 py-12 text-gray-200">
        <h1 class="text-3xl font-bold mb-6">📜 Terms & Conditions</h1>
        <p class="mb-4 text-sm text-gray-400">Last updated: October 1, 2025</p>

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
            <h2 class="text-xl font-semibold mb-2">3. Data & Privacy</h2>
            <p>
              We respect your privacy. Guest data is temporary and not saved. Logged-in users’ data
              is securely stored. For more details, please review our
              <router-link to="/privacy" class="text-blue-400 underline">Privacy Policy</router-link>.
              If you wish to delete your data, please visit our
              <router-link to="/data-deletion" class="text-blue-400 underline">Data Deletion page</router-link>.
            </p>
          </section>

          <!-- Section 4 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">4. Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account. We are not liable
              for any loss or damage arising from unauthorized use of your account.
            </p>
          </section>

          <!-- Section 5 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">5. Payments & Subscriptions</h2>
            <p>
              If you choose a paid plan, payments are securely processed via
              <strong>Stripe</strong>. We do not store your card details. Subscription renewals,
              billing cycles, and cancellations are governed by Stripe’s policies.
            </p>
          </section>

          <!-- Section 6 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
            <p>
              PlanCraftAI is provided “as is.” We are not liable for indirect, incidental, or
              consequential damages that may result from using our service.
            </p>
          </section>

          <!-- Section 7 -->
          <section>
            <h2 class="text-xl font-semibold mb-2">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the service means you
              accept the revised Terms.
            </p>
          </section>
        </div>

        <!-- Footer -->
        <div class="mt-12 text-sm text-gray-400">
          <p>
            If you have questions about these Terms, contact us at
            <a href="mailto:support@plancraftai.com" class="text-blue-400 underline">
              support@plancraftai.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Static page, no script needed
</script>