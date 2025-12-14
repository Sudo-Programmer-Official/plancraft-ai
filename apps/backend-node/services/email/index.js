import * as sendgridProvider from "./providers/sendgridProvider.js";
import * as sesProvider from "./providers/sesProvider.js";

const PROVIDERS = {
  sendgrid: sendgridProvider,
  ses: sesProvider,
};

function selectProvider() {
  const key = String(process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase();
  return PROVIDERS[key] || sendgridProvider;
}

const provider = selectProvider();

export function initEmail() {
  return provider?.init?.();
}

export async function sendEmail({ to, subject, html, text, from, tags = [], metadata = {} }) {
  if (!to || !subject || (!html && !text)) {
    return { success: false, error: "Invalid email payload" };
  }

  const result = await provider.send({ to, subject, html, text, from, tags, metadata });
  return result;
}
