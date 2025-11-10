const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

const init = () => {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) {
    logger.warn('Facebook credentials missing, running in dry-run mode');
  }
  return { token, pageId };
};

const postMessage = async ({ message, mediaUrl }) => {
  init();
  logger.info('Facebook post stub executed', { message, mediaUrl });

  const engagement = simulateEngagement('facebook');
  const entry = await logger.logMarketingEvent({
    platform: 'facebook',
    message,
    status: 'queued',
    engagement,
    metadata: { mediaUrl },
  });

  await recordEngagement('facebook', { ...engagement, logId: entry.id, id: randomUUID() });
  return { logId: entry.id };
};

const sendCampaign = async ({ posts = [] }) => Promise.all(posts.map(postMessage));

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('facebook');
  await recordEngagement('facebook', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage,
  sendCampaign,
  trackEngagement,
};
