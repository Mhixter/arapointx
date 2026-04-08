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
  const typeLabel: Record<string, string> = {
    user: 'User Account',
    admin: 'Admin Account',
    developer: 'Developer Account',
    agent: 'Agent Account',
  };
  const typeColor: Record<string, string> = {
    user: '#059669',
    admin: '#dc2626',
    developer: '#0B5FFF',
    agent: '#7c3aed',
  };
  const label = typeLabel[opts.actorType] || 'Account';
  const color = typeColor[opts.actorType] || '#059669';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:95%;">
      <tr>
        <td style="background:${color};padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🔐</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">New Login Detected</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${label} · Arapoint</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hi <strong>${opts.name}</strong>,</p>
          <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
            A new login was just detected on your Arapoint <strong>${label.toLowerCase()}</strong>. 
            If this was you, no action is needed. If you didn't sign in, please change your password immediately.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tr style="background:#F3F4F6;">
              <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6B7280;">Login Details</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;width:140px;">📧 Account</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;">${opts.email}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;">🕐 Time</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;">${opts.time} (WAT)</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;">🌐 IP Address</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;font-family:monospace;">${opts.ip}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;">💻 Device</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;">${opts.device}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;">🌍 Operating System</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;">${opts.os}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#6B7280;font-size:13px;border-top:1px solid #E5E7EB;">🔎 Browser</td>
              <td style="padding:12px 16px;color:#111827;font-size:13px;font-weight:600;border-top:1px solid #E5E7EB;">${opts.browser}</td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;margin-bottom:24px;">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0;color:#991B1B;font-size:13px;font-weight:600;">⚠️ Didn't recognise this login?</p>
                <p style="margin:4px 0 0;color:#B91C1C;font-size:13px;">Change your password immediately and contact Arapoint support.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;text-align:center;">
          <p style="margin:0;color:#9CA3AF;font-size:12px;">Arapoint Digital Platform · arapoint.com.ng</p>
          <p style="margin:4px 0 0;color:#9CA3AF;font-size:11px;">This is an automated security notification.</p>
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
        '🔐 New Login Detected — Arapoint',
        html,
      ).catch((e: any) => logger.error('Login alert email failed', { error: e.message }));
    }
  } catch (error: any) {
    logger.error('Failed to log login activity', { error: error.message });
  }
}

export { loginActivities, desc, eq, and, gte, ilike, or };
