const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

const init = () => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    logger.warn('WhatsApp credentials missing, running in dry-run mode');
  }
  return { token, phoneId };
};

const sendMessage = async ({ message, recipients = [] }) => {
  init();
  logger.info('WhatsApp message stub executed', { recipientsCount: recipients.length });

  const engagement = simulateEngagement('whatsapp');
  const entry = await logger.logMarketingEvent({
    platform: 'whatsapp',
    message,
    status: 'queued',
    engagement,
    metadata: { recipients },
  });

  await recordEngagement('whatsapp', { ...engagement, logId: entry.id, id: randomUUID() });
  return { logId: entry.id };
};

const sendCampaign = async ({ messages = [], recipients = [] }) =>
  Promise.all(messages.map((message) => sendMessage({ message, recipients })));

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('whatsapp');
  await recordEngagement('whatsapp', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage: sendMessage,
  sendCampaign,
  trackEngagement,
};
