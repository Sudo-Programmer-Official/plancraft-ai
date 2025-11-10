const { simulateEngagement, recordEngagement } = require('./engagementTracker');

const trackMetrics = async (platform, metadata = {}) => {
  const engagement = simulateEngagement(platform);
  await recordEngagement(platform, { ...engagement, ...metadata });
  return engagement;
};

module.exports = {
  trackMetrics,
};
