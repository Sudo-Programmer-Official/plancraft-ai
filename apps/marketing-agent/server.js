const { startServer } = require('./src');

startServer().catch((error) => {
  console.error('[marketing-agent] Failed to start server', error);
  process.exit(1);
});
