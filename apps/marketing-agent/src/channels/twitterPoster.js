const { TwitterApi } = require('twitter-api-v2');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

let client;

const init = () => {
  if (client) return client;

  const { TWITTER_API_KEY, TWITTER_SECRET, TWITTER_BEARER } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_SECRET || !TWITTER_BEARER) {
    logger.warn('Twitter credentials missing, operating in dry-run mode');
    return null;
  }

  client = new TwitterApi(TWITTER_BEARER);
  return client;
};

const postMessage = async ({ message, mediaUrl }) => {
  const twitterClient = init();
  let tweetId = null;

  if (twitterClient) {
    try {
      const response = await twitterClient.v2.tweet({
        text: mediaUrl ? `${message}\n${mediaUrl}` : message,
      });
      tweetId = response?.data?.id;
    } catch (err) {
      logger.error('Twitter API failed, falling back to dry-run', { error: err.message });
    }
  }

  logger.info('Twitter post stub executed', { message, mediaUrl });
  const engagement = simulateEngagement('twitter');
  const entry = await logger.logMarketingEvent({
    platform: 'twitter',
    message,
    status: twitterClient ? 'queued' : 'dry-run',
    engagement,
    metadata: { mediaUrl, tweetId },
  });

  await recordEngagement('twitter', { ...engagement, logId: entry.id, id: randomUUID() });
  return { tweetId, logId: entry.id };
};

const sendCampaign = async ({ posts = [] }) => Promise.all(posts.map(postMessage));

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('twitter');
  await recordEngagement('twitter', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage,
  sendCampaign,
  trackEngagement,
};
