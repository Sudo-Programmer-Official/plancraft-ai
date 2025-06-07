<template>
  <section class="bg-indigo-50 py-16 px-6 text-center">
    <h2 class="text-3xl font-bold text-gray-800 mb-8">Why Prompt2Quote?</h2>

    <div class="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto text-left">
      <div class="flex items-start gap-4">
        <el-icon class="text-purple-600 text-2xl"><Lightning /></el-icon>
        <div>
          <h3 class="font-semibold text-lg text-gray-800">No Signup Needed</h3>
          <p class="text-gray-600 text-sm">Jump in and get your quote instantly. No barriers.</p>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <el-icon class="text-purple-600 text-2xl"><Cpu /></el-icon>
        <div>
          <h3 class="font-semibold text-lg text-gray-800">Powered by GPT</h3>
          <p class="text-gray-600 text-sm">Advanced LLMs generate accurate timelines and stacks.</p>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <el-icon class="text-purple-600 text-2xl"><Document /></el-icon>
        <div>
          <h3 class="font-semibold text-lg text-gray-800">Export as PDF</h3>
          <p class="text-gray-600 text-sm">Download your custom quote and share it anytime.</p>
        </div>
      </div>

      <div class="flex items-start gap-4">
        <el-icon class="text-purple-600 text-2xl"><PieChart /></el-icon>
        <div>
          <h3 class="font-semibold text-lg text-gray-800">Clear Breakdown</h3>
          <p class="text-gray-600 text-sm">Stack, estimate & timeline all in one view.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Lightning, Cpu, Document, PieChart } from '@element-plus/icons-vue'
</script>
