import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import growthRoutes from './routes/growthRoutes.js'
import contactsRoutes from './routes/contactsRoutes.js'
import { verifyAuth } from './utils/auth.js'
import { errorHandler } from './utils/errorHandler.js'

const app = express()

// 🌐 CORS: allow App Runner host + env overrides + localhost
const envOrigins =
  process.env.ALLOWED_ORIGINS?.split(',')?.map((o) => o.trim()).filter(Boolean) || []
const baseOrigins = [
  'https://plancraftai.com',
  'https://www.plancraftai.com',
  'https://app.plancraftai.com',
  'http://localhost:5173',
  'http://localhost:4173',
]
// Default to permissive unless explicitly disabled
const allowAll = process.env.CORS_ALLOW_ALL !== '0'
const allowedOrigins = Array.from(new Set([...baseOrigins, ...envOrigins]))

const corsOptions = {
  origin: (origin, callback) => {
    if (allowAll || !origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // Allow subdomains of plancraftai.com
    if (/\.plancraftai\.com$/.test(origin)) return callback(null, true)
    return callback(new Error(`Origin not allowed: ${origin}`))
  },
  credentials: true,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))

app.use('/api/growth', verifyAuth, growthRoutes)
app.use('/api/growth/contacts', verifyAuth, contactsRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`growth-service listening on ${PORT}`)
})
