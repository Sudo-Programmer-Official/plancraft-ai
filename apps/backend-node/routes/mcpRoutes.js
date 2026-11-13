import express from "express";
import admin from "firebase-admin";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import "../services/firebaseAdmin.js";
import { verifyHS256 } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { createPlanCraftMcpServer } from "../services/mcpServer.js";

const router = express.Router();

function isMcpEnabled() {
  return ["1", "true", "yes", "on"].includes(
    String(process.env.MCP_ENABLED || "").trim().toLowerCase(),
  );
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  return /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, "").trim() : null;
}

async function attachMcpAuth(req, res, next) {
  const bearer = bearerToken(req);
  const candidates = [req.headers["x-app-token"], bearer].filter(Boolean);
  const secret = process.env.APP_JWT_SECRET;

  if (secret) {
    for (const token of candidates) {
      if (String(token).split(".").length !== 3) continue;
      try {
        const payload = verifyHS256(token, secret);
        const scopes = String(payload?.scope || "")
          .split(/[\s,]+/)
          .map((scope) => scope.trim())
          .filter(Boolean);
        if (!payload?.sub || (!scopes.includes("gpt_action") && !scopes.includes("mcp"))) continue;
        req.user = { uid: payload.sub, email: payload.email || null, source: "app" };
        req.auth = { type: "app", token, payload };
        return next();
      } catch {
        // Try the Firebase bearer token below when the app token is invalid.
      }
    }
  }

  if (bearer) {
    try {
      const decoded = await admin.auth().verifyIdToken(bearer);
      req.user = { uid: decoded.uid, email: decoded.email || null, source: "firebase" };
      req.auth = { type: "firebase", token: bearer, payload: decoded };
      return next();
    } catch {
      // Fall through to a uniform unauthorized response.
    }
  }

  return res.status(401).json({ error: "Unauthorized" });
}

router.use((req, res, next) => {
  if (!isMcpEnabled()) {
    return res.status(404).json({ error: "MCP endpoint is disabled" });
  }
  return next();
});
router.use(attachMcpAuth, requireAuth);

router.all("/", async (req, res, next) => {
  try {
    const handler = createMcpHandler(
      () => createPlanCraftMcpServer({ userId: req.user.uid }),
      {
        legacy: "stateless",
        responseMode: "auto",
        onerror: (error) => console.error("[MCP] protocol error", error?.message || error),
      },
    );
    const nodeHandler = toNodeHandler(handler);
    return await nodeHandler(req, res, req.body);
  } catch (error) {
    return next(error);
  }
});

export default router;
