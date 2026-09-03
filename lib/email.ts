import "server-only";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type EmailResult = {
  id: string | null;
  suppressed: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function emailLayout(input: {
  eyebrow?: string;
  title: string;
  intro?: string;
  imageUrl?: string;
  imageAlt?: string;
  sections?: Array<{ title: string; items: string[] }>;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const sections = (input.sections ?? [])
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `
        <div style="margin-top:24px">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8B7B68;font-weight:600;margin-bottom:8px">${escapeHtml(section.title)}</div>
          ${section.items
            .map(
              (item) => `<div style="padding:10px 12px;margin:6px 0;background:#F7F1E8;border:1px solid #E7DBC8;border-radius:10px;color:#2B2119;font-size:14px;line-height:1.45">${escapeHtml(item)}</div>`,
            )
            .join("")}
        </div>`,
    )
    .join("");

  const image = input.imageUrl
    ? `<div style="margin-top:20px"><img src="${escapeHtml(input.imageUrl)}" alt="${escapeHtml(input.imageAlt ?? "Ayna morning motivation")}" width="540" style="display:block;width:100%;max-width:540px;height:auto;border:0;border-radius:16px" /></div>`
    : "";

  const cta = input.ctaLabel && input.ctaUrl
    ? `<div style="margin-top:28px"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#A8532B;color:#FFF8F2;text-decoration:none;padding:11px 16px;border-radius:10px;font-size:14px;font-weight:600">${escapeHtml(input.ctaLabel)}</a></div>`
    : "";

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#F7F1E8;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2B2119">
      <div style="padding:32px 16px">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E7DBC8;border-radius:22px;padding:30px">
          <div style="font-family:Georgia,serif;font-size:23px;font-weight:600;color:#7C3D1F;margin-bottom:24px">ayna</div>
          ${input.eyebrow ? `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8B7B68;font-weight:600;margin-bottom:8px">${escapeHtml(input.eyebrow)}</div>` : ""}
          <h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;margin:0 0 10px;color:#2B2119">${escapeHtml(input.title)}</h1>
          ${input.intro ? `<p style="font-size:14px;line-height:1.6;color:#6F6253;margin:0">${escapeHtml(input.intro)}</p>` : ""}
          ${image}
          ${sections}
          ${cta}
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #EFE5D8;font-size:11px;line-height:1.5;color:#A19482">Ayna Tracker sends internal work reminders only. Notification preferences can be changed in Settings.</div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendTrackerEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const isProduction = process.env.VERCEL_ENV === "production" || (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");
  const apiKey = process.env.RESEND_API_KEY;

  // Never send real team emails from local or preview deployments.
  if (!isProduction) {
    console.info("[email:suppressed]", input.subject, input.to);
    return { id: "suppressed", suppressed: true };
  }

  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AYNA_EMAIL_FROM ?? "Ayna Tracker <tracker@aynahealth.co>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ?? `Resend returned ${response.status}`);
  }

  return { id: typeof body?.id === "string" ? body.id : null, suppressed: false };
}
