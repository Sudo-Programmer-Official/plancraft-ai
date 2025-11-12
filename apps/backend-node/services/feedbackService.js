import fetch from "node-fetch";
import { db } from "./firebaseAdmin.js";

const feedbackCollection = () => db.collection("feedback");
const SLACK_WEBHOOK = process.env.FEEDBACK_SLACK_WEBHOOK || "";

function clampRating(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(1, Math.min(5, Math.round(num)));
}

function sanitizeString(value, fallback = "", limit = 1000) {
  if (!value && value !== 0) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (!limit || text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

function safeObject(obj) {
  if (!obj || typeof obj !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return {};
  }
}

async function sendSlackNotification(entry) {
  if (!SLACK_WEBHOOK) return;
  try {
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New PlanCraft feedback*\nType: *${entry.type || "unspecified"}* | Rating: *${entry.rating || "n/a"}*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: entry.message ? entry.message : "_No message provided_",
        },
      },
    ];
    if (entry.context && Object.keys(entry.context).length) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Context: \`${JSON.stringify(entry.context)}\``,
          },
        ],
      });
    }
    await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (err) {
    console.warn("[FeedbackService] Slack notification failed", err?.message || err);
  }
}

export async function saveFeedback({
  userId,
  rating,
  type,
  message,
  context,
  metadata,
  userAgent,
  locale,
}) {
  if (!userId) throw new Error("Missing userId for feedback");
  const entry = {
    userId: String(userId),
    rating: clampRating(rating),
    type: sanitizeString(type, "general", 40),
    message: sanitizeString(message, "", 2000),
    context: safeObject(context),
    metadata: safeObject(metadata),
    userAgent: sanitizeString(userAgent, "", 400),
    locale: sanitizeString(locale, "", 40),
    createdAt: new Date(),
  };

  const docRef = await feedbackCollection().add(entry);
  const stored = { id: docRef.id, ...entry };
  sendSlackNotification(stored);
  return stored;
}
