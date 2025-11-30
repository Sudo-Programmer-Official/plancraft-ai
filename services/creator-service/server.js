import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import planRoutes from './routes/planRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import draftRoutes from './routes/draftRoutes.js'
import calendarRoutes from './routes/calendarRoutes.js'
import repurposeRoutes from './routes/repurposeRoutes.js'
import editorRoutes from './routes/editorRoutes.js'
import mediaRoutes from './routes/mediaRoutes.js'
import publishRoutes from './routes/publishRoutes.js'
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
    if (!_origin) return callback(null, true)
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
    'x-request-id',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.use('/creator/plan', verifyAuth, planRoutes)
app.use('/creator/ai', verifyAuth, aiRoutes)
app.use('/creator', verifyAuth, draftRoutes)
app.use('/creator', verifyAuth, calendarRoutes)
app.use('/creator', verifyAuth, repurposeRoutes)
app.use('/creator', verifyAuth, editorRoutes)
app.use('/creator', verifyAuth, mediaRoutes)
app.use('/creator', verifyAuth, publishRoutes)

app.use(errorHandler)

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`creator-service listening on ${port}`)
})
