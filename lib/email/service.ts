/**
 * Email Service - Resend Integration
 * Primary email provider for FaceSmash Developer Portal
 */

import { Resend } from 'resend';

const resend = new Resend('re_78sX6QZx_2PpYuF6ULzkuaueHxdQzf56P');

export const SENDER_EMAIL = 'noreply@developers.facesmash.app';
export const REPLY_TO_EMAIL = 'support@facesmash.app';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || REPLY_TO_EMAIL,
      tags: options.tags || {},
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const html = getWelcomeEmailTemplate(name);
  return sendEmail({
    to: email,
    subject: 'Welcome to FaceSmash Developer Portal',
    html,
    tags: { type: 'welcome' },
  });
}

/**
 * Send team invite email
 */
export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  teamName: string,
  inviteLink: string,
  role: string = 'member'
) {
  const html = getTeamInviteEmailTemplate(inviterName, teamName, inviteLink, role);
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${teamName}`,
    html,
    tags: { type: 'team-invite', team: teamName },
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const html = getPasswordResetEmailTemplate(resetLink);
  return sendEmail({
    to: email,
    subject: 'Reset your FaceSmash password',
    html,
    tags: { type: 'password-reset' },
  });
}

/**
 * Send password changed confirmation
 */
export async function sendPasswordChangedEmail(email: string) {
  const html = getPasswordChangedEmailTemplate();
  return sendEmail({
    to: email,
    subject: 'Your password has been changed',
    html,
    tags: { type: 'password-changed' },
  });
}

/**
 * Send API key created notification
 */
export async function sendApiKeyCreatedEmail(
  email: string,
  keyName: string,
  expiresAt?: string
) {
  const html = getApiKeyCreatedEmailTemplate(keyName, expiresAt);
  return sendEmail({
    to: email,
    subject: 'API Key Created',
    html,
    tags: { type: 'api-key-created' },
  });
}

/**
 * Send usage alert
 */
export async function sendUsageAlertEmail(
  email: string,
  usagePercent: number,
  limit: number,
  resetDate: string
) {
  const html = getUsageAlertEmailTemplate(usagePercent, limit, resetDate);
  return sendEmail({
    to: email,
    subject: '⚠️ API Usage Alert',
    html,
    tags: { type: 'usage-alert' },
  });
}

/**
 * Send security alert
 */
export async function sendSecurityAlertEmail(
  email: string,
  eventType: string,
  location: string,
  timestamp: string,
  verifyLink: string
) {
  const html = getSecurityAlertEmailTemplate(eventType, location, timestamp, verifyLink);
  return sendEmail({
    to: email,
    subject: '🔒 Security Alert: Unusual Activity',
    html,
    tags: { type: 'security-alert' },
  });
}

// ─── Email Template Functions ───────────────────────────────────────

function getEmailLayout(content: string, previewText: string = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 30px 20px 20px; }
    .logo { height: 40px; margin-bottom: 10px; }
    .content { padding: 30px 20px; }
    .cta { background: #10B981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: 600; }
    .footer { background: #F3F4F6; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://facesmash.app/facesmash-logo.png" alt="FaceSmash" class="logo">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">FaceSmash</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>FaceSmash Developer Portal</p>
      <p>© 2026 EVERJUST COMPANY. All rights reserved.</p>
      <p><a href="https://developers.facesmash.app/settings" style="color: #10B981; text-decoration: none;">Manage email preferences</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

function getWelcomeEmailTemplate(name: string) {
  const content = `
    <h2>Welcome to FaceSmash! 👋</h2>
    <p>Hi ${name},</p>
    <p>Your developer account has been created successfully. You're now ready to integrate face authentication into your applications.</p>
    <h3>Next Steps:</h3>
    <ol>
      <li><strong>Create your first app</strong> – Register an application in the Applications section</li>
      <li><strong>Generate an API key</strong> – Get credentials to start using the FaceSmash API</li>
      <li><strong>Read the docs</strong> – Check out our <a href="https://docs.facesmash.app">comprehensive documentation</a></li>
    </ol>
    <a href="https://developers.facesmash.app/dashboard/overview" class="cta">Go to Dashboard</a>
    <p>Questions? <a href="mailto:support@facesmash.app">Contact our support team</a></p>
  `;
  return getEmailLayout(content, 'Welcome to FaceSmash Developer Portal');
}

function getTeamInviteEmailTemplate(inviterName: string, teamName: string, inviteLink: string, role: string) {
  const content = `
    <h2>You're invited to join ${teamName}</h2>
    <p>Hi,</p>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.</p>
    <p>Click below to accept this invitation (valid for 7 days):</p>
    <a href="${inviteLink}" class="cta">Accept Invitation</a>
    <p style="color: #6B7280; font-size: 14px;">If you did not expect this invitation, you can safely ignore this email.</p>
  `;
  return getEmailLayout(content, `${inviterName} invited you to ${teamName}`);
}

function getPasswordResetEmailTemplate(resetLink: string) {
  const content = `
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your password. Click the link below to create a new password (valid for 24 hours):</p>
    <a href="${resetLink}" class="cta">Reset Password</a>
    <p style="color: #6B7280; font-size: 14px;">If you did not request this, you can ignore this email. Your password will remain unchanged.</p>
  `;
  return getEmailLayout(content, 'Password Reset Request');
}

function getPasswordChangedEmailTemplate() {
  const content = `
    <h2>Password Changed ✓</h2>
    <p>Your password has been successfully changed.</p>
    <p>If you did not make this change, <a href="https://developers.facesmash.app/settings">visit your security settings immediately</a> to investigate.</p>
  `;
  return getEmailLayout(content, 'Password Changed');
}

function getApiKeyCreatedEmailTemplate(keyName: string, expiresAt?: string) {
  const content = `
    <h2>New API Key Created</h2>
    <p>A new API key has been created:</p>
    <p><strong>${keyName}</strong>${expiresAt ? ` (Expires: ${expiresAt})` : ''}</p>
    <p><a href="https://developers.facesmash.app/settings">View all API keys</a></p>
    <p style="color: #6B7280; font-size: 14px;">If you did not create this key, revoke it immediately in your settings.</p>
  `;
  return getEmailLayout(content, 'API Key Created');
}

function getUsageAlertEmailTemplate(usagePercent: number, limit: number, resetDate: string) {
  const content = `
    <h2>⚠️ API Usage Alert</h2>
    <p>Your API usage has reached <strong>${usagePercent}%</strong> of your monthly limit.</p>
    <p>Monthly Limit: <strong>${limit.toLocaleString()}</strong> calls</p>
    <p>Resets on: <strong>${resetDate}</strong></p>
    <a href="https://developers.facesmash.app/settings?tab=billing" class="cta">View Usage Details</a>
    <p><a href="https://developers.facesmash.app/settings?tab=billing">Upgrade your plan</a> to increase your limit.</p>
  `;
  return getEmailLayout(content, 'API Usage Alert');
}

function getSecurityAlertEmailTemplate(eventType: string, location: string, timestamp: string, verifyLink: string) {
  const content = `
    <h2>🔒 Security Alert</h2>
    <p><strong>${eventType}</strong> on your account</p>
    <p>
      <strong>Location:</strong> ${location}<br>
      <strong>Time:</strong> ${timestamp}
    </p>
    <p style="color: #6B7280; font-size: 14px;">If this was you, you can ignore this email. If not, verify your account immediately:</p>
    <a href="${verifyLink}" class="cta">Review Activity</a>
  `;
  return getEmailLayout(content, 'Security Alert');
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendTeamInviteEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendApiKeyCreatedEmail,
  sendUsageAlertEmail,
  sendSecurityAlertEmail,
};
