import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import publishRoutes from './routes/publishRoutes.js'
import authRoutes from './routes/authRoutes.js'
import { errorHandler } from './utils/errorHandler.js'
import { verifyAuth } from './utils/auth.js'

const app = express()
const allowedOrigins = [
  'https://plancraftai.com',
  'https://www.plancraftai.com',
  'http://localhost:5173',
  'http://localhost:4173',
]
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))

app.use('/tokens', verifyAuth, authRoutes)
app.use('/', verifyAuth, publishRoutes)

app.use(errorHandler)

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`posting-service listening on ${port}`))
