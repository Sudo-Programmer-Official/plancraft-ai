const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config');
const logger = require('../utils/logger');
const channels = require('../channels');

const queueName = 'marketing-posts';

const startWorker = async () => {
  const worker = new Worker(
    queueName,
    async (job) => {
      const { platform, payload } = job.data;
      const handler = channels[platform];
      if (!handler || typeof handler.postMessage !== 'function') {
        throw new Error(`Unsupported platform handler: ${platform}`);
      }

      logger.info('Executing queued post', { platform, jobId: job.id });
      return handler.postMessage(payload);
    },
    { connection: getRedisConnection() },
  );

  worker.on('completed', (job) => logger.info('Job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.error('Job failed', { jobId: job?.id, error: err?.message }),
  );

  await worker.waitUntilReady();
  logger.info('BullMQ worker ready');

  return worker;
};

module.exports = {
  startWorker,
};
