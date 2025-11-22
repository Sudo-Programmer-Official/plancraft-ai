import { logger } from './logger.js'

export function errorHandler(err, req, res, next) {
  logger.error(err.message)
  res.status(500).json({ success: false, error: err.message })
}
