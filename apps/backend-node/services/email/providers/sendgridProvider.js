import sgMail from "@sendgrid/mail";

let initialized = false;

function ensureClient() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return null;
  if (!initialized) {
    try {
      sgMail.setApiKey(key);
      initialized = true;
      console.log("[email] SendGrid initialized");
    } catch (err) {
      console.error("[email] Failed to set API key:", err?.message || err);
    }
  }
  return key;
}

export function init() {
  return ensureClient();
}

export async function send({ to, subject, html, text, from }) {
  try {
    const key = ensureClient();
    const sender = from || process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL;
    if (!key) {
      console.log("[email] SENDGRID_API_KEY not set; skipping send to", to);
      return { skipped: true, reason: "no_api_key" };
    }
    if (!sender) {
      console.log(
        "[email] EMAIL_FROM not set; skipping send to",
        to,
        "(set a verified SendGrid sender or domain)"
      );
      return { skipped: true, reason: "no_from" };
    }
    if (!to) return { success: false, error: "missing_to" };

    const msg = {
      to,
      from: sender,
      subject: subject || "PlanCraftAI Update",
      html: html || "",
      text: text || undefined,
    };
    const [response] = await sgMail.send(msg);
    const status = response?.statusCode;
    console.info("[email] sent (sendgrid)", { to, status });
    return { success: true, status, response: response || null };
  } catch (e) {
    const status = e?.code || e?.response?.statusCode;
    const details = e?.response?.body?.errors?.map((x) => x?.message).join("; ");
    const msg = e?.message || details || String(e);
    const hint =
      status === 403
        ? "Hint: Verify your SendGrid sender identity or domain and set EMAIL_FROM to that verified address."
        : "";
    console.warn(`sendgrid send failed (status ${status || "n/a"}): ${msg} ${hint}`);
    return { success: false, status, error: msg };
  }
}
