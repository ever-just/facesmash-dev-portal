import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = 'face@everjust.co';
const REPLY_TO_EMAIL = 'support@everjust.co';
const BRAND_COLOR = '#10B981';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Record<string, string>;
}

function normalizeHtmlForText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function sendEmail(options: EmailOptions) {
  try {
    const response = await resend.emails.send({
      from: `FaceSmash <${SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? normalizeHtmlForText(options.html),
      replyTo: REPLY_TO_EMAIL,
    });
    if (response.error) {
      console.error('Resend API Error:', response.error);
      return { success: false, error: response.error };
    }
    console.log(`Email sent to ${options.to}:`, response.data?.id);
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

function getEmailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,#059669 100%);">
      <td style="padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">FaceSmash</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${title}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;background:#fff;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${body}
      </td>
    </tr>
    <tr>
      <td style="padding:24px;text-align:center;color:#9ca3af;font-size:12px;">
        <p style="margin:0 0 8px;">&#169; 2026 FaceSmash &#x2014; everjust.co</p>
        <a href="https://developers.facesmash.app/dashboard/settings?tab=account" style="color:${BRAND_COLOR};text-decoration:none;">Email Preferences</a>
        &nbsp;&bull;&nbsp;
        <a href="https://facesmash.app/privacy" style="color:${BRAND_COLOR};text-decoration:none;">Privacy Policy</a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin:4px 0;">${text}</a>`;
}

// ─── Welcome Email ───────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string) {
  const firstName = (name || email).split(' ')[0];
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Welcome to FaceSmash! Your account is ready. You can now use passwordless face recognition to log in securely.
    </p>
    <ul style="color:#374151;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px;">
      <li>Register your face for instant login</li>
      <li>Create API keys for your projects</li>
      <li>Manage your team and billing</li>
    </ul>
    <p style="text-align:center;margin:0 0 24px;">${btn('Go to Dashboard', 'https://developers.facesmash.app/dashboard')}</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">If you didn't create this account, contact us at ${REPLY_TO_EMAIL}.</p>
  `;
  return sendEmail({ to: email, subject: 'Welcome to FaceSmash', html: getEmailWrapper('Welcome', body), tags: { type: 'welcome' } });
}

// ─── Team Invite Email ───────────────────────────────────────

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  teamName: string,
  inviteLink: string,
  role: string = 'member'
) {
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.
    </p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Accept the invitation to start collaborating on face recognition projects.
    </p>
    <p style="text-align:center;margin:0 0 24px;">${btn('Accept Invitation', inviteLink)}</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">This invitation expires in 7 days. If you don't recognize this, you can safely ignore it.</p>
  `;
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${teamName}`,
    html: getEmailWrapper('Team Invitation', body),
    tags: { type: 'team-invite' },
  });
}

// ─── Password Reset Email ────────────────────────────────────

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">Reset Your Password</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      We received a request to reset your password. Click the button below. This link expires in 1 hour.
    </p>
    <p style="text-align:center;margin:0 0 24px;">${btn('Reset Password', resetLink)}</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
  `;
  return sendEmail({ to: email, subject: 'Reset Your FaceSmash Password', html: getEmailWrapper('Password Reset', body), tags: { type: 'password-reset' } });
}

// ─── Password Changed Email ──────────────────────────────────

export async function sendPasswordChangedEmail(email: string) {
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">Password Changed Successfully</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Your password has been updated. If you didn't make this change, contact us immediately.
    </p>
    <p style="text-align:center;margin:0 0 24px;">${btn('Go to Dashboard', 'https://developers.facesmash.app/dashboard')}</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">Suspicious activity? Email us at ${REPLY_TO_EMAIL}</p>
  `;
  return sendEmail({ to: email, subject: 'Your Password Has Been Changed', html: getEmailWrapper('Password Changed', body), tags: { type: 'password-changed' } });
}

// ─── API Key Created Email ───────────────────────────────────

export async function sendApiKeyCreatedEmail(email: string, keyName: string, expiresAt?: string) {
  const expiry = expiresAt ? `Expires: <strong>${new Date(expiresAt).toLocaleDateString()}</strong>` : 'No expiration date.';
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">New API Key Created</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">
      Key name: <strong>${keyName}</strong><br>${expiry}
    </p>
    <div style="padding:12px 16px;background:#f0fdf4;border-left:4px solid ${BRAND_COLOR};border-radius:4px;margin:0 0 24px;">
      <p style="margin:0;color:#065f46;font-size:13px;"><strong>Keep this key secure.</strong> Never commit it to version control or share it publicly.</p>
    </div>
    <p style="text-align:center;margin:0 0 24px;">${btn('Manage API Keys', 'https://developers.facesmash.app/dashboard/settings')}</p>
  `;
  return sendEmail({ to: email, subject: `New API Key: ${keyName}`, html: getEmailWrapper('API Key Created', body), tags: { type: 'api-key-created' } });
}

// ─── Usage Alert Email ───────────────────────────────────────

export async function sendUsageAlertEmail(email: string, usagePercent: number, limit: string, resetDate: string) {
  const color = usagePercent >= 90 ? '#ef4444' : usagePercent >= 75 ? '#f59e0b' : BRAND_COLOR;
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">API Usage Alert</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;">
      You've used <strong style="color:${color};">${usagePercent}%</strong> of your ${limit} plan limit.
    </p>
    <div style="background:#f3f4f6;border-radius:6px;height:8px;overflow:hidden;margin:0 0 8px;">
      <div style="height:100%;width:${usagePercent}%;background:${color};border-radius:6px;"></div>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0 0 24px;">Resets: ${new Date(resetDate).toLocaleDateString()}</p>
    <p style="text-align:center;margin:0 0 24px;">${btn('View Usage', 'https://developers.facesmash.app/dashboard/settings?tab=billing')}</p>
  `;
  return sendEmail({ to: email, subject: `Usage Alert: ${usagePercent}% of ${limit} used`, html: getEmailWrapper('Usage Alert', body), tags: { type: 'usage-alert' } });
}

// ─── Security Alert Email ────────────────────────────────────

export async function sendSecurityAlertEmail(
  email: string,
  eventType: string,
  location: string,
  timestamp: string,
  verifyLink: string
) {
  const descriptions: Record<string, string> = {
    login: 'A new login was detected on your account',
    'new-device': 'Your account was accessed from a new device',
    'password-changed': 'Your password was changed',
    'api-key-created': 'A new API key was created',
  };
  const desc = descriptions[eventType] || 'Unusual activity was detected on your account';
  const body = `
    <div style="padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;margin:0 0 20px;">
      <p style="margin:0;color:#991b1b;font-weight:600;font-size:14px;">${desc}</p>
    </div>
    <p style="color:#374151;font-size:14px;margin:0 0 24px;">
      <strong>Location:</strong> ${location}<br>
      <strong>Time:</strong> ${new Date(timestamp).toLocaleString()}
    </p>
    <p style="text-align:center;margin:0 0 24px;">${btn('Verify Account', verifyLink)}</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">If this was you, ignore this email. If not, secure your account immediately.</p>
  `;
  return sendEmail({ to: email, subject: 'Security Alert: Verify Your Account', html: getEmailWrapper('Security Alert', body), tags: { type: 'security-alert', event: eventType } });
}

// ─── Weekly Digest Email ─────────────────────────────────────

export async function sendWeeklyDigestEmail(
  email: string,
  stats: { totalRequests: number; uniqueUsers: number; averageResponseTime: number; errorRate: number }
) {
  const body = `
    <p style="color:#111827;font-size:16px;margin:0 0 20px;">Your Weekly API Summary</p>
    <table width="100%" cellpadding="0" cellspacing="8" style="border-collapse:separate;">
      <tr>
        <td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Requests</p>
          <p style="margin:6px 0 0;color:${BRAND_COLOR};font-size:28px;font-weight:700;">${stats.totalRequests.toLocaleString()}</p>
        </td>
        <td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Users</p>
          <p style="margin:6px 0 0;color:${BRAND_COLOR};font-size:28px;font-weight:700;">${stats.uniqueUsers.toLocaleString()}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Avg Response</p>
          <p style="margin:6px 0 0;color:${BRAND_COLOR};font-size:28px;font-weight:700;">${stats.averageResponseTime}ms</p>
        </td>
        <td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Error Rate</p>
          <p style="margin:6px 0 0;color:${stats.errorRate > 1 ? '#ef4444' : BRAND_COLOR};font-size:28px;font-weight:700;">${stats.errorRate.toFixed(2)}%</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin:24px 0 0;">${btn('View Full Analytics', 'https://developers.facesmash.app/dashboard/settings?tab=activity')}</p>
  `;
  return sendEmail({ to: email, subject: 'Your FaceSmash Weekly Digest', html: getEmailWrapper('Weekly Digest', body), tags: { type: 'weekly-digest' } });
}
