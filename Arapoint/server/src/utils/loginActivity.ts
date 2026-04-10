import { Request } from 'express';
import { db } from '../config/database';
import { loginActivities } from '../db/schema';
import { sendEmail } from '../services/emailService';
import { logger } from './logger';
import { sql } from 'drizzle-orm';
import { desc, eq, and, gte, ilike, or } from 'drizzle-orm';

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS login_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_type VARCHAR(20) NOT NULL,
        actor_id VARCHAR(255),
        actor_email VARCHAR(255) NOT NULL,
        actor_name VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        device VARCHAR(100),
        browser VARCHAR(100),
        os VARCHAR(100),
        status VARCHAR(20) DEFAULT 'success' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS la_actor_type_idx ON login_activities(actor_type);
      CREATE INDEX IF NOT EXISTS la_actor_id_idx ON login_activities(actor_id);
      CREATE INDEX IF NOT EXISTS la_created_idx ON login_activities(created_at);
      CREATE INDEX IF NOT EXISTS la_status_idx ON login_activities(status);
    `);
  } catch (e: any) {
    logger.error('login_activities migration error', { error: e.message });
  }
})();

function parseUserAgent(ua: string = '') {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (ua.includes('Edg/') || ua.includes('EdgA/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';
  else if (ua.includes('SamsungBrowser/')) browser = 'Samsung Browser';

  if (ua.includes('Windows NT 10') || ua.includes('Windows NT 11')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone')) os = 'iOS (iPhone)';
  else if (ua.includes('iPad')) os = 'iOS (iPad)';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (ua.includes('iPhone') || (ua.includes('Android') && ua.includes('Mobile'))) device = 'Mobile';
  else if (ua.includes('iPad') || (ua.includes('Android') && !ua.includes('Mobile'))) device = 'Tablet';

  return { browser, os, device };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return (req as any).ip || (req.socket as any)?.remoteAddress || 'Unknown';
}

function loginAlertEmailHtml(opts: {
  name: string;
  email: string;
  actorType: string;
  ip: string;
  browser: string;
  os: string;
  device: string;
  time: string;
}): string {
  const SITE_URL = "https://arapoint.com.ng";
  const YEAR = new Date().getFullYear();

  const isDeveloper = opts.actorType === 'developer';
  const logoUrl = isDeveloper ? "https://arapoint.com.ng/email-logo-blue.png" : "https://arapoint.com.ng/email-logo-green.png";

  const typeLabel: Record<string, string> = {
    user: 'User Account',
    admin: 'Admin Account',
    developer: 'Developer Account',
    agent: 'Agent Account',
  };
  const accentColor: Record<string, string> = {
    user: '#16a34a',
    admin: '#16a34a',
    developer: '#1D4ED8',
    agent: '#16a34a',
  };
  const label = typeLabel[opts.actorType] || 'Account';
  const accent = accentColor[opts.actorType] || '#16a34a';

  const outerBg = isDeveloper ? '#0D1117' : '#EEF2F7';
  const cardBg  = isDeveloper ? '#161B27' : '#FFFFFF';
  const cardBorder = isDeveloper ? 'border:1px solid #21293A;' : '';
  const rowBg   = isDeveloper ? '#1F2937' : '#F9FAFB';
  const rowBorderColor = isDeveloper ? '#21293A' : '#E5E7EB';
  const labelColor = isDeveloper ? '#9CA3AF' : '#6B7280';
  const valueColor = isDeveloper ? '#E5E7EB' : '#111827';
  const bodyText   = isDeveloper ? '#9CA3AF' : '#6B7280';
  const headingColor = isDeveloper ? '#F9FAFB' : '#111827';
  const footerBg   = isDeveloper ? '#0D1117' : '#F8FAFC';
  const footerBorderTop = isDeveloper ? '1px solid #21293A' : '1px solid #E5E7EB';
  const footerHeadColor  = isDeveloper ? '#E5E7EB' : '#374151';
  const footerSubColor   = isDeveloper ? '#6B7280' : '#6B7280';
  const footerLinkColor  = isDeveloper ? '#3B82F6' : '#166534';
  const footerTextColor  = isDeveloper ? '#4B5563' : '#9CA3AF';
  const alertBg    = isDeveloper ? '#1F2937' : '#FEF2F2';
  const alertBorder = isDeveloper ? '#21293A' : '#FECACA';
  const alertLeft  = '#EF4444';
  const alertText  = isDeveloper ? '#E5E7EB' : '#991B1B';

  const infoRows = [
    { label: "Account Email", value: opts.email },
    { label: "Time (WAT)",    value: opts.time },
    { label: "IP Address",    value: `<span style="font-family:'Courier New',monospace;">${opts.ip}</span>` },
    { label: "Device",        value: opts.device },
    { label: "Operating System", value: opts.os },
    { label: "Browser",       value: opts.browser },
  ].map(row => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid ${rowBorderColor};">
        <p style="margin:0;color:${labelColor};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${row.label}</p>
        <p style="margin:4px 0 0;color:${valueColor};font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${row.value}</p>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Login Detected — Arapoint</title>
</head>
<body style="margin:0;padding:0;background:${outerBg};font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${outerBg};padding:32px 0;">
  <tr><td align="center" style="padding:0 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${cardBg};border-radius:8px;overflow:hidden;${cardBorder}">

      <!-- Logo Header -->
      <tr>
        <td style="padding:0;margin:0;font-size:0;line-height:0;mso-line-height-rule:exactly;">
          <img src="${logoUrl}" alt="Arapoint" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;" />
        </td>
      </tr>

      <!-- Accent bar -->
      <tr>
        <td style="height:4px;font-size:0;line-height:0;mso-line-height-rule:exactly;background:${accent};">&nbsp;</td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 32px;">
          <h1 style="margin:0 0 8px;color:${headingColor};font-size:22px;font-weight:800;font-family:Arial,sans-serif;">New Login Detected</h1>
          <p style="margin:0 0 24px;color:${bodyText};font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">
            Dear <strong style="color:${headingColor};">${opts.name}</strong>, a new login was detected on your Arapoint <strong style="color:${headingColor};">${label}</strong>. If this was you, no action is needed. If you did not sign in, please change your password immediately and contact our support team.
          </p>

          <p style="margin:0 0 10px;color:${labelColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,sans-serif;">Login Details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${rowBg};border:1px solid ${rowBorderColor};border-radius:8px;margin-bottom:24px;overflow:hidden;">
            ${infoRows}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${alertBg};border:1px solid ${alertBorder};border-left:4px solid ${alertLeft};border-radius:0 6px 6px 0;margin-bottom:24px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0 0 4px;color:${alertText};font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Did not recognise this login?</p>
                <p style="margin:0;color:${alertText};font-size:13px;line-height:1.6;font-family:Arial,sans-serif;">Change your password immediately and contact Arapoint support at <a href="mailto:support@arapoint.com.ng" style="color:${alertLeft};text-decoration:none;">support@arapoint.com.ng</a>.</p>
              </td>
            </tr>
          </table>

          <p style="margin:0;color:${bodyText};font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">
            This is an automated security notification. No action is required if you initiated this login.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:${footerBg};padding:24px 32px;border-top:${footerBorderTop};text-align:center;">
          <p style="margin:0 0 4px;color:${footerHeadColor};font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Arapoint Solutions</p>
          <p style="margin:0 0 14px;color:${footerSubColor};font-size:11px;font-family:Arial,sans-serif;">Nigeria's Digital Identity &amp; Verification Platform</p>
          <p style="margin:0 0 10px;font-size:12px;font-family:Arial,sans-serif;">
            <a href="${SITE_URL}" style="color:${footerLinkColor};text-decoration:none;">arapoint.com.ng</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="mailto:support@arapoint.com.ng" style="color:${footerLinkColor};text-decoration:none;">support@arapoint.com.ng</a>
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <a href="mailto:hello@arapoint.com.ng" style="color:${footerLinkColor};text-decoration:none;">hello@arapoint.com.ng</a>
          </p>
          <p style="margin:0;color:${footerTextColor};font-size:10px;line-height:1.7;font-family:Arial,sans-serif;">
            &copy; ${YEAR} Arapoint Solutions. All rights reserved.<br>
            This is an automated security notification. If you have concerns about your account, contact support immediately.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function logLoginActivity(
  req: Request,
  data: {
    actorType: 'user' | 'admin' | 'developer' | 'agent';
    actorId: string;
    actorEmail: string;
    actorName: string;
    status?: 'success' | 'failed';
  }
) {
  try {
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';
    const { browser, os, device } = parseUserAgent(ua);
    const status = data.status || 'success';

    await db.insert(loginActivities).values({
      actorType: data.actorType,
      actorId: data.actorId,
      actorEmail: data.actorEmail,
      actorName: data.actorName || data.actorEmail,
      ipAddress: ip,
      userAgent: ua,
      device,
      browser,
      os,
      status,
    });

    if (status === 'success') {
      const time = new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const html = loginAlertEmailHtml({
        name: data.actorName || data.actorEmail,
        email: data.actorEmail,
        actorType: data.actorType,
        ip,
        browser,
        os,
        device,
        time,
      });

      sendEmail(
        data.actorEmail,
        'New Login Detected — Arapoint Security Alert',
        html,
      ).catch((e: any) => logger.error('Login alert email failed', { error: e.message }));
    }
  } catch (error: any) {
    logger.error('Failed to log login activity', { error: error.message });
  }
}

export { loginActivities, desc, eq, and, gte, ilike, or };
