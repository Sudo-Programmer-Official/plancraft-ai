export function errorHandler(err, _req, res, _next) {
  const status = err?.status || 500;
  const message = err?.message || "Internal error";
  if (status >= 500) {
    console.error("[habit-service] error", err);
  }
  res.status(status).json({ error: message });
}
