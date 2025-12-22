import { getFirebaseAdmin } from "./firebase.js";
import { verifyHS256 } from "../utils/jwt.js";

// Attach req.user from (priority) app token -> Firebase ID token -> dev headers.
export async function attachAuth(req) {
  if (req.user?.id) return req.user;

  const allowDevHeaderAuth = process.env.ALLOW_DEV_HEADER_AUTH === "1" || process.env.NODE_ENV === "development";

  // 1) Service-to-service app token (HS256 signed)
  const appToken = req.headers?.["x-app-token"];
  const secret = process.env.APP_JWT_SECRET;
  if (secret && typeof appToken === "string" && appToken.split(".").length === 3) {
    const payload = verifyHS256(appToken, secret);
    if (payload?.sub) {
      req.user = {
        id: String(payload.sub),
        email: payload.email || null,
        source: "app-token",
      };
      return req.user;
    }
  }

  // 2) Firebase ID token (Authorization: Bearer)
  const authHeader = req.headers?.authorization || "";
  if (/^bearer\s+/i.test(authHeader)) {
    const token = authHeader.replace(/^bearer\s+/i, "").trim();
    try {
      const admin = getFirebaseAdmin();
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        id: decoded.uid,
        email: decoded.email || null,
        source: "firebase",
      };
      return req.user;
    } catch (err) {
      console.warn("[project-service] Firebase token verification failed", err?.message || err);
    }
  }

  // 3) Dev / fallback headers (kept for backward compatibility)
  const headerUserId = req.headers?.["x-user-id"] || req.headers?.["x-user"] || req.headers?.["authorization"];
  if (headerUserId && allowDevHeaderAuth) {
    req.user = { id: String(headerUserId), source: "header" };
    return req.user;
  }

  // If someone tried header auth while disabled, remember that for clearer 401.
  if (headerUserId && !allowDevHeaderAuth) {
    req._headerAuthDenied = true;
  }

  return null;
}
