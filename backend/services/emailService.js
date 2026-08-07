const EMAIL_PROVIDER = "resend";
const RESEND_API_URL = "https://api.resend.com/emails";
const RESET_EXPIRY_MINUTES = 30;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isProduction = () => process.env.NODE_ENV === "production";

const isEmailConfigured = () => Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);

const getEmailProviderName = () => EMAIL_PROVIDER;

const buildPasswordResetEmail = ({ name = "", resetLink }) => {
  const displayName = String(name || "").trim() || "Trader";
  const safeName = escapeHtml(displayName);
  const safeResetLink = escapeHtml(resetLink);
  const subject = "Reset your Trade Abhyas password";

  const text = [
    `Hi ${displayName},`,
    "",
    "We received a request to reset your Trade Abhyas password.",
    `Open this link to choose a new password: ${resetLink}`,
    "",
    `This link expires in ${RESET_EXPIRY_MINUTES} minutes.`,
    "If you did not request this, you can ignore this email."
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:28px;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Trade Abhyas password reset</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hi ${safeName},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">We received a request to reset your Trade Abhyas password.</p>
      <p style="margin:0 0 24px;">
        <a href="${safeResetLink}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-size:14px;font-weight:700;">Reset password</a>
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">This link expires in ${RESET_EXPIRY_MINUTES} minutes.</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">If the button does not work, paste this link into your browser:</p>
      <p style="margin:0 0 20px;font-size:13px;line-height:1.5;word-break:break-all;color:#374151;">${safeResetLink}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">If you did not request this, you can ignore this email.</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
};

const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
  if (!isEmailConfigured()) {
    if (isProduction()) {
      throw new Error("Password reset email delivery is not configured");
    }
    return { skipped: true, provider: EMAIL_PROVIDER };
  }

  const email = buildPasswordResetEmail({ name, resetLink });
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });

  if (!response.ok) {
    const error = new Error("Password reset email delivery failed");
    error.status = response.status;
    throw error;
  }

  return { skipped: false, provider: EMAIL_PROVIDER };
};

module.exports = {
  buildPasswordResetEmail,
  getEmailProviderName,
  isEmailConfigured,
  sendPasswordResetEmail
};
