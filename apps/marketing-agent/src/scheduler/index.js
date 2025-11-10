const { enqueuePostJob, scheduleCampaignJobs, waitForScheduler, isQueueReady } = require('./queue');
const { startWorker } = require('./worker');
const logger = require('../utils/logger');

let workerInstance;

const initializeScheduler = async () => {
  if (process.env.DISABLE_QUEUE === 'true') {
    logger.warn('BullMQ queue disabled via env flag');
    return null;
  }

  if (workerInstance) {
    return workerInstance;
  }

  try {
    await waitForScheduler();
    workerInstance = await startWorker();
    return workerInstance;
  } catch (err) {
    logger.error('Failed to initialize BullMQ. Falling back to immediate posts.', {
      error: err.message,
    });
    if (process.env.REQUIRE_QUEUE === 'true') {
      throw err;
    }
    return null;
  }
};

module.exports = {
  initializeScheduler,
  enqueuePostJob,
  scheduleCampaignJobs,
  isQueueReady,
};
