import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import publishRoutes from './routes/publishRoutes.js'
import authRoutes from './routes/authRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import schedulerRoutes from './routes/schedulerRoutes.js'
import linkedinRoutes from './routes/linkedinRoutes.js'
import instagramRoutes from './routes/instagramRoutes.js'
import twitterRoutes from './routes/twitterRoutes.js'
import socialRoutes from './routes/socialRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import { errorHandler } from './utils/errorHandler.js'
import { verifyAuth } from './utils/auth.js'

const app = express()

const envOrigins =
  process.env.ALLOWED_ORIGINS?.split(',')?.map((o) => o.trim()).filter(Boolean) || []
const baseOrigins = [
  'https://plancraftai.com',
  'https://www.plancraftai.com',
  'http://localhost:5173',
  'http://localhost:4173',
]
const allowAll = process.env.CORS_ALLOW_ALL !== '0'
const appRunnerPattern = /\.awsapprunner\.com$/
const plancraftPattern = /\.plancraftai\.com$/
const corsOptions = {
  origin: (_origin, callback) => {
    if (allowAll) return callback(null, true)
    if (! _origin) return callback(null, true)
    if ([...baseOrigins, ...envOrigins].includes(_origin)) return callback(null, true)
    if (plancraftPattern.test(_origin)) return callback(null, true)
    if (appRunnerPattern.test(_origin)) return callback(null, true)
    return callback(new Error('Origin not allowed'))
  },
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-app-token',
    'x-user-country',
    'x-user-email',
    'x-user-id',
    'x-user-role',
    'x-user-tz',
    'x-workspace-id',
    'x-request-id',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))
app.get('/debug/workspace', verifyAuth, (req, res) => {
  const workspaceId =
    req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
  res.json({ success: true, userId: req.user?.uid || null, workspaceId })
})

// LinkedIn OAuth has mixed public/protected routes; auth applied per-route inside file
app.use('/', linkedinRoutes)
app.use('/', instagramRoutes)
app.use('/', twitterRoutes)
app.use('/', socialRoutes)
app.use('/tokens', verifyAuth, authRoutes)
app.use('/', verifyAuth, publishRoutes)
app.use('/', verifyAuth, messageRoutes)
app.use('/', verifyAuth, jobRoutes)
app.use('/', verifyAuth, schedulerRoutes)

app.use(errorHandler)

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`posting-service listening on ${port}`))
