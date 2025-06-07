<template>
  <section class="w-full bg-gray-50 py-24 px-6">
    <div class="max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-gray-800 text-center mb-14">Why Prompt2Quote?</h2>

      <div class="grid gap-10 md:grid-cols-2">
        <!-- Card 1 -->
        <div class="bg-white/80 rounded-xl shadow-md p-6 flex items-start gap-4">
          <el-icon class="text-purple-600 text-2xl"><Lightning /></el-icon>
          <div>
            <h3 class="font-semibold text-lg text-gray-800">No Signup Needed</h3>
            <p class="text-gray-600 text-sm">Jump in and get your quote instantly. No barriers.</p>
          </div>
        </div>

        <!-- Card 2 -->
        <div class="bg-white/80 rounded-xl shadow-md p-6 flex items-start gap-4">
          <el-icon class="text-purple-600 text-2xl"><Cpu /></el-icon>
          <div>
            <h3 class="font-semibold text-lg text-gray-800">Powered by GPT</h3>
            <p class="text-gray-600 text-sm">
              Advanced LLMs generate accurate timelines and stacks.
            </p>
          </div>
        </div>

        <!-- Card 3 -->
        <div class="bg-white/80 rounded-xl shadow-md p-6 flex items-start gap-4">
          <el-icon class="text-purple-600 text-2xl"><Document /></el-icon>
          <div>
            <h3 class="font-semibold text-lg text-gray-800">Export as PDF</h3>
            <p class="text-gray-600 text-sm">Download your custom quote and share it anytime.</p>
          </div>
        </div>

        <!-- Card 4 -->
        <div class="bg-white/80 rounded-xl shadow-md p-6 flex items-start gap-4">
          <el-icon class="text-purple-600 text-2xl"><PieChart /></el-icon>
          <div>
            <h3 class="font-semibold text-lg text-gray-800">Clear Breakdown</h3>
            <p class="text-gray-600 text-sm">Stack, estimate & timeline all in one view.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Lightning, Cpu, Document, PieChart } from '@element-plus/icons-vue'
</script>
