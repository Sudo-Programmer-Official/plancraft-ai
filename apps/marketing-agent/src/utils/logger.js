const { randomUUID } = require('crypto');

const format = (level, message, meta) => {
  const payload = typeof meta === 'object' && meta !== null ? meta : {};
  return `[marketing-agent] ${level.toUpperCase()}: ${message}${Object.keys(payload).length ? ` | ${JSON.stringify(payload)}` : ''}`;
};

const info = (message, meta) => console.log(format('info', message, meta));
const warn = (message, meta) => console.warn(format('warn', message, meta));
const error = (message, meta) => console.error(format('error', message, meta));

const logMarketingEvent = async ({
  platform,
  message,
  status,
  engagement = {},
  metadata = {},
}) => {
  const logEntry = {
    id: randomUUID(),
    platform,
    message,
    status,
    timestamp: new Date().toISOString(),
    engagement,
    ...metadata,
  };

  try {
    const { getFirestore } = require('../config');
    const firestore = getFirestore();
    await firestore.collection('marketing_logs').doc(logEntry.id).set(logEntry);
  } catch (err) {
    error('Failed to persist marketing log', { err: err.message });
  }

  return logEntry;
};

module.exports = {
  info,
  warn,
  error,
  logMarketingEvent,
};
