export function errorHandler(err, _req, res, _next) {
  console.error("[project-service]", err?.stack || err);
  if (res.headersSent) return;
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || "Server error" });
}
