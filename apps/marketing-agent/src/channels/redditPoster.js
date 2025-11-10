const Snoowrap = require('snoowrap');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

let redditClient;

const init = () => {
  if (redditClient) {
    return redditClient;
  }

  const {
    REDDIT_CLIENT_ID,
    REDDIT_SECRET,
    REDDIT_REFRESH_TOKEN,
    REDDIT_USER_AGENT = 'PlanCraftAIAgent/1.0',
  } = process.env;

  if (!REDDIT_CLIENT_ID || !REDDIT_SECRET || !REDDIT_REFRESH_TOKEN) {
    throw new Error('Reddit credentials are not configured');
  }

  redditClient = new Snoowrap({
    userAgent: REDDIT_USER_AGENT,
    clientId: REDDIT_CLIENT_ID,
    clientSecret: REDDIT_SECRET,
    refreshToken: REDDIT_REFRESH_TOKEN,
  });

  return redditClient;
};

const safeTitle = (title, message) => {
  if (title) return title;
  if (!message) return 'PlanCraftAI Update';
  const trimmed = message.trim();
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
};

const formatBody = (message, tags = []) => {
  if (!tags.length) return message;
  return `${message}\n\n${tags.join(' ')}`;
};

const postMessage = async ({
  message,
  title,
  subreddit = 'Productivity',
  flair,
  tags = [],
}) => {
  const client = init();
  const postTitle = safeTitle(title, message);
  const text = formatBody(message, tags);

  try {
    const submission = await client.getSubreddit(subreddit).submitSelfpost({
      title: postTitle,
      text,
      flair_text: flair,
    });

    const engagement = simulateEngagement('reddit');
    const entry = await logger.logMarketingEvent({
      platform: 'reddit',
      message: postTitle,
      status: 'success',
      engagement,
      metadata: { subreddit, postId: submission?.name },
    });

    await recordEngagement('reddit', { ...engagement, postId: submission?.name });
    logger.info('Reddit post successful', { subreddit, postId: submission?.name });
    return { id: submission?.name, logId: entry.id };
  } catch (err) {
    await logger.logMarketingEvent({
      platform: 'reddit',
      message: postTitle,
      status: 'failed',
      metadata: { subreddit, error: err.message },
    });
    logger.error('Reddit post failed', { error: err.message });
    throw err;
  }
};

const sendCampaign = async (payload) => postMessage(payload);

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('reddit');
  await recordEngagement('reddit', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage,
  sendCampaign,
  trackEngagement,
};
