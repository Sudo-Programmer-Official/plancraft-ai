<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-950 text-slate-100">
    <router-link to="/dashboard" class="absolute top-6 left-6 flex items-center gap-2">
      <img src="/logo-bg-remove.png" alt="PlanCraftAI Logo" class="h-10 w-auto sm:h-12 drop-shadow-lg" />
      <span class="text-lg sm:text-xl md:text-2xl font-bold">PlanCraftAI</span>
    </router-link>

    <div class="max-w-4xl mx-auto py-16 px-6 text-gray-200">
      <h1 class="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p class="mb-4 text-sm text-gray-400">Last updated: October 1, 2025</p>

      <p class="mb-6">
        At <strong>PlanCraftAI</strong>, operated by <strong>Sudo Programmer Inc.</strong>, your privacy
        is very important to us. This Privacy Policy explains how we collect, use, and safeguard your information
        when you use our application and services.
      </p>

      <h2 class="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li>Account information (name, email, profile photo).</li>
        <li>Notification preferences and integration tokens (Google, Slack, Discord, WhatsApp).</li>
        <li>Usage data (app interactions, analytics events).</li>
        <li>Audio and call data (processed via Twilio, OpenAI, ElevenLabs, Google STT).</li>
        <li>Payment information (processed via Stripe, never stored by us).</li>
      </ul>

      <h2 class="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li>Deliver reminders via Email, Push, WhatsApp, Slack, or other integrations.</li>
        <li>Enable AI-based productivity and call features.</li>
        <li>Process subscriptions and payments through Stripe.</li>
        <li>Maintain account security and prevent misuse.</li>
        <li>Improve features using anonymized analytics.</li>
      </ul>

      <h2 class="text-xl font-semibold mt-8 mb-4">3. Data Storage & Security</h2>
      <p class="mb-6">
        Data is stored on <strong>Firebase</strong> and <strong>Render</strong> with encryption in transit (HTTPS).
        Sensitive information such as payment details are processed directly by <strong>Stripe</strong>.
        Call data and integrations are secured and can be revoked at any time.
      </p>

      <h2 class="text-xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
      <ul class="list-disc pl-6 mb-6 space-y-2">
        <li><strong>Firebase</strong> – authentication, database, analytics</li>
        <li><strong>Stripe</strong> – payments & subscriptions</li>
        <li><strong>Twilio</strong> – calls, SMS, WhatsApp messaging</li>
        <li><strong>OpenAI</strong> – AI transcription and insights</li>
        <li><strong>Google</strong> – Calendar, Speech-to-Text</li>
        <li><strong>Slack & Discord</strong> – notifications</li>
        <li><strong>Mixpanel</strong> – usage analytics</li>
      </ul>

      <h2 class="text-xl font-semibold mt-8 mb-4">5. Google Calendar Data Usage</h2>
      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5 text-slate-100/90">
        <div>
          <p class="font-semibold text-lg mb-2 text-white">Description of Data Access</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>PlanCraftAI requests read-only (<code>calendar.readonly</code>) permissions to view upcoming events, event times, and titles.</li>
            <li>The app never modifies, deletes, or creates events on your Google Calendar.</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-lg mb-2 text-white">Purpose of Access</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Calendar details only appear inside your AI-powered planner dashboard to highlight upcoming meetings and reminders.</li>
            <li>They enable smarter scheduling suggestions, reminder timing, and summary insights tailored to your day.</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-lg mb-2 text-white">Data Handling</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>PlanCraftAI does not store, share, or sell Google Calendar data.</li>
            <li>Information remains encrypted in transit and is only visible to the authenticated user during their active session.</li>
            <li>No calendar data is transferred to any third-party systems outside PlanCraftAI infrastructure.</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-lg mb-2 text-white">User Control</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>You can revoke Google access at any time from your Google Account security settings.</li>
            <li>Deleting your PlanCraftAI account immediately revokes and removes stored OAuth tokens that power synchronization.</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-lg mb-2 text-white">Compliance Statement</p>
          <p>PlanCraftAI adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>
        </div>
      </div>

      <h2 class="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
      <p class="mb-6">
        You may request to <strong>access, update, or delete</strong> your data at any time.  
        For data deletion, visit our <a href="/data-deletion" class="text-blue-400 underline">Data Deletion page</a>
        or email us at <a href="mailto:help@sudoprogrammer.com" class="text-blue-400 underline">help@sudoprogrammer.com</a>.
      </p>

      <h2 class="text-xl font-semibold mt-8 mb-4">7. Contact Us</h2>
      <ul class="list-disc pl-6 mt-2 space-y-1">
        <li>Email: <a href="mailto:support@plancraftai.com" class="text-blue-400 underline">support@plancraftai.com</a></li>
        <li>Support: <a href="mailto:help@sudoprogrammer.com" class="text-blue-400 underline">help@sudoprogrammer.com</a></li>
        <li>Website: <a href="https://sudoprogrammer.com" target="_blank" class="text-blue-400 underline">sudoprogrammer.com</a></li>
      </ul>
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
