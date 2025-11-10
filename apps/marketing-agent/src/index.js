const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const routes = require('./routes');
const { initializeScheduler } = require('./scheduler');
const logger = require('./utils/logger');

const createApp = () => {
  const app = express();

  app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);

  return app;
};

const startServer = async () => {
  const app = createApp();
  await initializeScheduler();

  const port = process.env.PORT || 4003;
  return app.listen(port, () => {
    logger.info(`marketing-agent listening on port ${port}`);
  });
};

module.exports = {
  createApp,
  startServer,
};
