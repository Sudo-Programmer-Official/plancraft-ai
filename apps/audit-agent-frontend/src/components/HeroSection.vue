<!-- Hero Section -->
<section
  class="relative py-24 md:py-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 overflow-hidden"
>
  <!-- 🌠 Falling stars background -->
  <canvas
    ref="starsCanvas"
    class="absolute inset-0 w-full h-full z-0"
  ></canvas>

  <!-- Hero Content -->
  <div class="relative z-10 max-w-4xl mx-auto text-center">
    <h1
      id="hero-title"
      class="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg"
      data-aos="fade-up"
    >
      Peaceful Productivity
    </h1>
    <p
      class="mt-6 text-lg md:text-2xl text-indigo-100 max-w-2xl mx-auto leading-relaxed"
      data-aos="fade-up"
      data-aos-delay="150"
    >
      Pause, plan, and reflect — with gentle voice journaling, smart tasks, and mindful insights
      guiding your daily flow.
    </p>
    <div
      class="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
      data-aos="zoom-in"
      data-aos-delay="250"
    >
      <el-button
        type="primary"
        size="large"
        aria-label="Log in to AuditAgent"
        @click="goToLogin"
      >
        🚀 Get Started
      </el-button>
      <el-button size="large" plain aria-label="Continue as guest" @click="continueAsGuest">
        🌿 Continue as Guest
      </el-button>
       <el-button
    id="installBtn"
    size="large"
    type="success"
    style="display: none"
  >
    📲 Install App
  </el-button>
    </div>
  </div>
</section>

<script setup>
import { ref, onMounted } from 'vue'

const starsCanvas = ref(null)

onMounted(() => {
  const canvas = starsCanvas.value
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5,
    speed: Math.random() * 1 + 0.5,
  }))

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    stars.forEach((star) => {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fill()
      star.y += star.speed
      if (star.y > canvas.height) {
        star.y = 0
        star.x = Math.random() * canvas.width
      }
    })
    requestAnimationFrame(animate)
  }

  animate()
})
</script>
