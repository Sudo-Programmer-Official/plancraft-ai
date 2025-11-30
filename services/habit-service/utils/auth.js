export function requireUser(req, res, next) {
  const userId = String(req.headers["x-user-id"] || req.user?.uid || "").trim();
  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id" });
  }
  req.userId = userId;
  next();
}

export function requireServiceToken(req, res, next) {
  const token = String(req.headers["x-service-token"] || req.headers["x-app-token"] || "").trim();
  const expected = String(process.env.INTERNAL_SERVICE_TOKEN || process.env.API_SERVICE_TOKEN || "").trim();
  if (!expected) {
    return res.status(500).json({ error: "Service token not configured" });
  }
  if (!token || token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
