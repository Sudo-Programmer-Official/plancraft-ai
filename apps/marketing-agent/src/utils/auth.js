const logger = require('./logger');

const requireApiKey = (req, res, next) => {
  const requiredKey = process.env.MARKETING_AGENT_API_KEY;
  if (!requiredKey) {
    return next();
  }

  const provided = req.headers['x-api-key'];
  if (requiredKey !== provided) {
    logger.warn('Blocked request with invalid API key', { path: req.path });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
};

module.exports = {
  requireApiKey,
};
