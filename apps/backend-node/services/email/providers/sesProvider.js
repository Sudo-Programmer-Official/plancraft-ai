import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const REGION = process.env.AWS_SES_REGION || process.env.AWS_REGION || null;
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SES_FROM_EMAIL || null;

function buildClient() {
  if (!REGION) {
    console.warn("[email] AWS_SES_REGION not set; SES client not initialized");
    return null;
  }
  try {
    return new SESClient({ region: REGION });
  } catch (err) {
    console.error("[email] Failed to init SES client", err?.message || err);
    return null;
  }
}

const client = buildClient();

export function init() {
  return client;
}

export async function send({ to, subject, html, text, from }) {
  const sender = from || FROM_EMAIL;
  if (!client) {
    return { success: false, error: "SES client not initialized", status: null };
  }
  if (!sender) {
    return { success: false, error: "EMAIL_FROM not set", status: null };
  }
  if (!to) {
    return { success: false, error: "missing_to", status: null };
  }

  const toList = Array.isArray(to) ? to : [to];
  const params = {
    Source: sender,
    Destination: {
      ToAddresses: toList,
    },
    Message: {
      Subject: { Data: subject || "PlanCraftAI Update", Charset: "UTF-8" },
      Body: {},
    },
  };

  if (html) {
    params.Message.Body.Html = { Data: html, Charset: "UTF-8" };
  }
  if (text) {
    params.Message.Body.Text = { Data: text, Charset: "UTF-8" };
  }

  try {
    const command = new SendEmailCommand(params);
    const response = await client.send(command);
    const status = response?.$metadata?.httpStatusCode || 200;
    return { success: true, status, messageId: response?.MessageId || null };
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode || err?.$metadata?.httpStatus || null;
    const message = err?.message || err?.name || "SES send failed";
    console.warn("[email] SES send failed", { status, message });
    return { success: false, status, error: message };
  }
}
