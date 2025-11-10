const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

const init = () => {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    logger.warn('LinkedIn access token missing, operating in dry-run mode');
  }
  return token;
};

const postMessage = async ({ message, mediaUrl, targetGroups = [] }) => {
  init();
  logger.info('LinkedIn post stub executed', { message, mediaUrl, targetGroups });

  const engagement = simulateEngagement('linkedin');
  const entry = await logger.logMarketingEvent({
    platform: 'linkedin',
    message,
    status: 'queued',
    engagement,
    metadata: { targetGroups, mediaUrl },
  });

  await recordEngagement('linkedin', { ...engagement, logId: entry.id, id: randomUUID() });
  return { logId: entry.id };
};

const sendCampaign = async ({ posts = [] }) => Promise.all(posts.map(postMessage));

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('linkedin');
  await recordEngagement('linkedin', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage,
  sendCampaign,
  trackEngagement,
};
