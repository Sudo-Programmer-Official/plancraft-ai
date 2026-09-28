import { onBeforeUnmount, onMounted } from 'vue'

// Falling-star canvas background. Stops its animation loop on unmount,
// follows window resizes, and draws a static field for reduced-motion users.
export function useStarfield(canvasRef, { count = 100, minSpeed = 0.2, maxSpeed = 0.7, maxRadius = 1.5 } = {}) {
  let frameId = null
  let stars = []
  let ctx = null
  let canvas = null

  function resize() {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * maxRadius,
      sp: minSpeed + Math.random() * (maxSpeed - minSpeed),
    }))
  }

  function draw(move) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'white'
    stars.forEach((st) => {
      ctx.beginPath()
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
      ctx.fill()
      if (!move) return
      st.y += st.sp
      if (st.y > canvas.height) {
        st.y = 0
        st.x = Math.random() * canvas.width
      }
    })
  }

  function animate() {
    draw(true)
    frameId = requestAnimationFrame(animate)
  }

  function onResize() {
    resize()
    if (frameId === null) draw(false)
  }

  onMounted(() => {
    canvas = canvasRef.value
    ctx = canvas?.getContext?.('2d')
    if (!ctx) return
    resize()
    window.addEventListener('resize', onResize)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) draw(false)
    else animate()
  })

  onBeforeUnmount(() => {
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
    window.removeEventListener('resize', onResize)
  })
}
