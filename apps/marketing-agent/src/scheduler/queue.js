const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config');
const logger = require('../utils/logger');

const posts = require('../templates/posts.json');
const defaultPosts = require('../templates/defaultPosts.json');

const queueName = 'marketing-posts';
const connection = getRedisConnection();
const queue = new Queue(queueName, { connection, defaultJobOptions: { removeOnComplete: true } });
let queueReady = false;

const pickTemplate = (platform) => {
  const pool = [...posts, ...defaultPosts];
  const filtered = platform ? pool.filter((item) => item.platform === platform) : pool;
  if (!filtered.length) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
};

const randomDelay = (minSeconds = 30, maxSeconds = 300) => {
  const min = Math.ceil(minSeconds * 1000);
  const max = Math.floor(maxSeconds * 1000);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const enqueuePostJob = async ({ platform, payload = {}, delay, jobId }) => {
  const template = pickTemplate(platform);
  const body = {
    platform,
    payload: {
      ...template,
      ...payload,
      message: payload.message || template.message,
      tags: payload.tags || template.tags || [],
    },
  };

  if (!queueReady) {
    logger.warn('Queue unavailable. Posting immediately.', { platform });
    const handler = require('../channels')[platform];
    if (!handler || typeof handler.postMessage !== 'function') {
      throw new Error(`Unsupported platform handler: ${platform}`);
    }
    return handler.postMessage(body.payload);
  }

  const jobOptions = {
    jobId,
    delay: typeof delay === 'number' ? delay : randomDelay(),
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  };

  logger.info('Queueing marketing job', { platform: body.platform, jobId: jobOptions.jobId });
  return queue.add('post', body, jobOptions);
};

const scheduleCampaignJobs = async ({ campaignId, steps = [] }) =>
  Promise.all(
    steps.map((step, index) =>
      enqueuePostJob({
        platform: step.platform,
        payload: step,
        delay: step.delayMs ?? randomDelay(index * 60, index * 60 + 120),
        jobId: `${campaignId}-${index}`,
      }),
    ),
  );

const waitForScheduler = async () => {
  await queue.waitUntilReady();
  queueReady = true;
  logger.info('BullMQ queue ready');
};

module.exports = {
  queue,
  enqueuePostJob,
  scheduleCampaignJobs,
  waitForScheduler,
  isQueueReady: () => queueReady,
};
