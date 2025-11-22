import dotenv from 'dotenv'
import { createGoalsApp } from './src/server.js'

dotenv.config({ path: process.env.GOALS_ENV_FILE || '.env' })

const PORT = Number(process.env.PORT || 8080)
const app = createGoalsApp()

app.listen(PORT, () => {
  const base = process.env.GOALS_SERVICE_BASE_PATH || '/api/goals'
  console.log(`🏁 Goals service listening on http://localhost:${PORT}${base}`)
})
