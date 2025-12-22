#!/usr/bin/env node
// Quick auth/membership smoke test for project-service.
// Usage examples:
// node scripts/auth-smoke.js --mode app --token "$APP_TOKEN" --workspace ws_123
// node scripts/auth-smoke.js --mode firebase --token "$ID_TOKEN" --workspace ws_123
// node scripts/auth-smoke.js --mode header --user user123 --roles workspace_admin --workspace ws_123

import process from "process";
import { attachAuth } from "../src/services/auth.js";
import { getWorkspaceMembership } from "../src/services/workspace.js";
import { deriveRoles } from "../src/middleware/auth.js";

const allowHeaderFallback = process.env.ALLOW_HEADER_ROLE_OVERRIDE !== "0";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { mode: "firebase", roles: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i + 1];
    if (a === "--mode" && next) out.mode = next;
    if (a === "--token" && next) out.token = next;
    if (a === "--workspace" && next) out.workspace = next;
    if (a === "--user" && next) out.user = next;
    if (a === "--roles" && next) out.roles = next.split(",").map((r) => r.trim()).filter(Boolean);
    if (a === "--help" || a === "-h") {
      console.log(`Usage:
  --mode app|firebase|header
  --token <token>            (required for app/firebase)
  --workspace <workspaceId>
  --user <userId>            (required for header mode)
  --roles r1,r2              (header roles, header mode only)`);
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  const req = { headers: {} };

  if (opts.workspace) {
    req.headers["x-workspace-id"] = opts.workspace;
  }

  if (opts.mode === "app") {
    if (!opts.token) throw new Error("app mode requires --token (x-app-token)");
    req.headers["x-app-token"] = opts.token;
  } else if (opts.mode === "firebase") {
    if (!opts.token) throw new Error("firebase mode requires --token (ID token)");
    req.headers.authorization = `Bearer ${opts.token}`;
  } else if (opts.mode === "header") {
    if (!opts.user) throw new Error("header mode requires --user");
    req.headers["x-user-id"] = opts.user;
    if (opts.roles?.length) req.headers["x-roles"] = opts.roles.join(",");
  } else {
    throw new Error(`unknown mode: ${opts.mode}`);
  }

  await attachAuth(req);
  if (!req.user) {
    console.error("❌ auth failed");
    process.exit(1);
  }

  const workspaceId = req.headers["x-workspace-id"] || null;
  let membership = null;
  if (workspaceId) {
    membership = await getWorkspaceMembership(workspaceId, req.user.id);
  }

  const roles = deriveRoles({
    membership,
    headerRoles: (req.headers["x-roles"] || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.toLowerCase()),
    allowHeaderFallback,
  });

  console.log("✅ auth ok");
  console.log("user:", req.user);
  console.log("workspace:", workspaceId || "(none)");
  console.log("membership:", membership || "(none)");
  console.log("roles:", roles);
}

main().catch((err) => {
  console.error("❌ smoke failed:", err?.message || err);
  process.exit(1);
});
