import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import growthRoutes from './routes/growthRoutes.js'
import contactsRoutes from './routes/contactsRoutes.js'
import leaderRoutes from './routes/leaderRoutes.js'
import { verifyAuth } from './utils/auth.js'
import { errorHandler } from './utils/errorHandler.js'

const app = express()
const basePaths = ['/api/growth', '/growth'] // allow both /api/growth/* and /growth/*

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
const allowAll = process.env.CORS_ALLOW_ALL !== '0'
const appRunnerPattern = /\.awsapprunner\.com$/
const plancraftPattern = /\.plancraftai\.com$/

const corsOptions = {
  origin: (_origin, callback) => {
    // Default: be permissive for App Runner + local dev unless explicitly disabled
    if (allowAll) return callback(null, true)
    if (!_origin) return callback(null, true)
    if ([...baseOrigins, ...envOrigins].includes(_origin)) return callback(null, true)
    if (plancraftPattern.test(_origin)) return callback(null, true)
    if (appRunnerPattern.test(_origin)) return callback(null, true)
    return callback(new Error('Origin not allowed'))
  },
  credentials: true,
  // Allow all request headers so custom workspace/app tokens don't get blocked by preflight
  allowedHeaders: (req, cb) =>
    cb(null, req.header('Access-Control-Request-Headers') || '*'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))
app.get('/debug/workspace', verifyAuth, (req, res) => {
  const workspaceId =
    req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
  res.json({ success: true, userId: req.user?.uid || null, workspaceId })
})

basePaths.forEach((base) => {
  app.use(base, verifyAuth, growthRoutes)
  app.use(`${base}/contacts`, verifyAuth, contactsRoutes)
  app.use(`${base}/leader`, verifyAuth, leaderRoutes)
})

app.use(errorHandler)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`growth-service listening on ${PORT}`)
})
