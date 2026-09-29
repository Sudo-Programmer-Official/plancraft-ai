// Converts raw product screenshots into the responsive AVIF/WebP files the
// landing page's <ScreenshotSlot> expects.
//
//   marketing-src/screenshots/today.png
//     -> public/marketing/screenshots/today-640.{avif,webp}
//     -> public/marketing/screenshots/today-1080.{avif,webp}
//
// Usage: npm run marketing:images
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(root, 'marketing-src', 'screenshots')
const OUT_DIR = path.join(root, 'public', 'marketing', 'screenshots')
const WIDTHS = [640, 1080]
const INPUT = /\.(png|jpe?g|webp)$/i

// Slots used by src/views/LandingPage.vue.
const EXPECTED = ['today', 'voice-capture', 'task-created', 'reminder', 'focus', 'ai-action']

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  let files = []
  try {
    files = (await readdir(SRC_DIR)).filter((f) => INPUT.test(f))
  } catch {
    console.error(`No source folder at ${path.relative(root, SRC_DIR)}. Add your screenshots there.`)
    process.exitCode = 1
    return
  }

  for (const file of files) {
    const name = path.parse(file).name
    const input = sharp(path.join(SRC_DIR, file))
    const { width } = await input.metadata()
    for (const target of WIDTHS) {
      const resized = input.clone().resize({ width: Math.min(target, width), withoutEnlargement: true })
      await resized.clone().webp({ quality: 82 }).toFile(path.join(OUT_DIR, `${name}-${target}.webp`))
      await resized.clone().avif({ quality: 55 }).toFile(path.join(OUT_DIR, `${name}-${target}.avif`))
    }
    console.log(`✓ ${name}`)
  }

  const provided = new Set(files.map((f) => path.parse(f).name))
  const missing = EXPECTED.filter((name) => !provided.has(name))
  if (missing.length) console.log(`Still showing placeholders for: ${missing.join(', ')}`)
}

main()
