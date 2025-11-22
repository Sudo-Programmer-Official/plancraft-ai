import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import growthRoutes from './routes/growthRoutes.js'
import { verifyAuth } from './utils/auth.js'
import { errorHandler } from './utils/errorHandler.js'

const app = express()
const allowedOrigins = [
  'https://plancraftai.com',
  'https://www.plancraftai.com',
  'http://localhost:5173',
  'http://localhost:4173',
]
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))

app.use('/api/growth', verifyAuth, growthRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`growth-service listening on ${PORT}`)
})
