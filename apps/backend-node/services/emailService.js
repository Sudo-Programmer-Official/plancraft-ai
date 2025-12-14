import { initEmail as initEmailProvider, sendEmail as sendEmailProvider } from "./email/index.js";

// Personalized Report Email (themed)
export async function sendReportEmail(to, htmlUrl, pdfUrl, metrics = {}) {
  const period = metrics.period || "weekly";
  const name = metrics.name || "there";
  const completed = metrics.completed ?? "N/A";
  const avgTime = metrics.avgTime || "N/A";
  const topMood = metrics.topMood || "N/A";
  const carryover = metrics.carryover ?? "—";

  const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
        <h2 style="margin:0 0 8px">Hey ${name} 💜</h2>
        <p style="margin:0 0 12px">Here’s your ${period} summary:</p>
        <ul style="line-height:1.7;margin:0 0 12px">
          <li>✅ Tasks completed: <b>${completed}</b></li>
          <li>🕐 Avg. completion time: <b>${avgTime}</b></li>
          <li>🌿 Mood trend: <b>${topMood}</b></li>
          <li>🔁 Carryover rate: <b>${carryover}</b></li>
        </ul>
        <p style="margin:12px 0">
          <a href="${htmlUrl}" style="color:#6366f1;text-decoration:none">📊 View report online</a>
        </p>
        ${pdfUrl ? `<p style=\"margin:8px 0\"><a href=\"${pdfUrl}\" style=\"color:#22c55e;text-decoration:none\">📄 Download PDF</a></p>` : ""}
        <hr style="border-color:#1f2937;border-width:0;border-top:1px solid #1f2937;margin:16px 0"/>
        <p style="font-size:12px;color:#94a3b8;margin:0">Made with 💜 by PlanCraftAI</p>
      </div>
    `;

  return sendEmailProvider({
    to,
    subject: `Your ${period} PlanCraftAI Report 📊`,
    html,
    text: `Your ${period} PlanCraftAI report is ready. View it here: ${htmlUrl}${pdfUrl ? ` or download the PDF: ${pdfUrl}` : ""}`,
  });
}

export function initEmail() {
  return initEmailProvider?.();
}

export async function sendEmail(payload) {
  return sendEmailProvider(payload);
}
