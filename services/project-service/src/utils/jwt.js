import crypto from "crypto";

function base64urlDecode(str) {
  if (!str) return "";
  let value = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = value.length % 4;
  if (pad) value += "=".repeat(4 - pad);
  return Buffer.from(value, "base64").toString("utf8");
}

// Minimal HS256 verification (app token) without adding external deps.
export function verifyHS256(token, secret) {
  try {
    if (!token || !secret) return null;
    const [h, p, s] = String(token || "").split(".");
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    if (expected !== s) return null;
    const payload = JSON.parse(base64urlDecode(p));
    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
