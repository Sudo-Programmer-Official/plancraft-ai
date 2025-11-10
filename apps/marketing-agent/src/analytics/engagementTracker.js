const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const simulateEngagement = (platform) => {
  const base = platform === 'reddit' ? 50 : 20;
  return {
    likes: randomBetween(base, base + 40),
    comments: randomBetween(1, 15),
    shares: randomBetween(0, 10),
    clicks: randomBetween(5, 80),
  };
};

const recordEngagement = async (platform, data = {}) => {
  try {
    const { getFirestore } = require('../config');
    const firestore = getFirestore();
    const payload = {
      id: data.id || randomUUID(),
      platform,
      timestamp: new Date().toISOString(),
      ...data,
    };
    await firestore.collection('engagement_stats').doc(payload.id).set(payload);
    return payload;
  } catch (err) {
    logger.error('Failed to store engagement', { error: err.message });
    return null;
  }
};

module.exports = {
  simulateEngagement,
  recordEngagement,
};
