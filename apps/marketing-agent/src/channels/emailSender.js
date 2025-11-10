const nodemailer = require('nodemailer');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { simulateEngagement, recordEngagement } = require('../analytics/engagementTracker');

let transporter;

const init = () => {
  if (transporter) return transporter;

  const { SENDGRID_API_KEY, EMAIL_FROM } = process.env;

  if (SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: SENDGRID_API_KEY,
      },
    });
  } else {
    logger.warn('SendGrid API key missing, using JSON transport for email');
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  transporter.emailFrom = EMAIL_FROM || 'noreply@plancraftai.com';
  return transporter;
};

const sendEmail = async ({ to = [], subject, message }) => {
  const mailer = init();
  const payload = {
    from: mailer.emailFrom,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    text: message,
  };

  await mailer.sendMail(payload);
  logger.info('Email stub executed', { recipients: payload.to });

  const engagement = simulateEngagement('email');
  const entry = await logger.logMarketingEvent({
    platform: 'email',
    message: subject,
    status: 'queued',
    engagement,
    metadata: { to },
  });

  await recordEngagement('email', { ...engagement, logId: entry.id, id: randomUUID() });
  return { logId: entry.id };
};

const sendCampaign = async ({ emails = [] }) => Promise.all(emails.map(sendEmail));

const trackEngagement = async (metadata = {}) => {
  const stats = simulateEngagement('email');
  await recordEngagement('email', { ...stats, ...metadata, id: randomUUID() });
  return stats;
};

module.exports = {
  init,
  postMessage: sendEmail,
  sendCampaign,
  trackEngagement,
};
