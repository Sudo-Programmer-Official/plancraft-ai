import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import planRoutes from './routes/planRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import { errorHandler } from './utils/errorHandler.js'
import { verifyAuth } from './utils/auth.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.use('/creator/plan', verifyAuth, planRoutes)
app.use('/creator/ai', verifyAuth, aiRoutes)

app.use(errorHandler)

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }))

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`creator-service listening on ${port}`)
})
