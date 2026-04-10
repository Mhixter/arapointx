import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { db } from '../config/database';
import { adminSettings } from '../db/schema';
import { inArray } from 'drizzle-orm';

let transporter: nodemailer.Transporter | null = null;
let lastSmtpConfig: string = '';

// Pre-load logo images from disk for CID inline embedding.
// CID attachments are the only approach that works reliably in all email
// clients (including Gmail which strips base64 data: URIs and blocks external URLs).
function loadLogoBuf(filename: string): Buffer | null {
  try {
    const p = path.resolve(__dirname, '../../../client/public', filename);
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}
const GREEN_LOGO_BUF = loadLogoBuf('email-logo-green.png');
const BLUE_LOGO_BUF  = loadLogoBuf('email-logo-blue.png');

async function getSmtpConfig() {
  let smtpHost = config.SMTP_HOST;
  let smtpPort = config.SMTP_PORT;
  let smtpUser = config.SMTP_USER;
  let smtpPass = config.SMTP_PASS;
  let smtpFromName = config.SMTP_FROM_NAME;
  let smtpFromEmail = config.SMTP_FROM_EMAIL;

  try {
    const dbSettings = await db.select().from(adminSettings)
      .where(inArray(adminSettings.settingKey, [
        'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFromName', 'smtpFromEmail'
      ]));

    for (const s of dbSettings) {
      if (s.settingValue) {
        switch (s.settingKey) {
          case 'smtpHost': smtpHost = s.settingValue; break;
          case 'smtpPort': smtpPort = parseInt(s.settingValue) || 587; break;
          case 'smtpUser': smtpUser = s.settingValue; break;
          case 'smtpPass': smtpPass = s.settingValue; break;
          case 'smtpFromName': smtpFromName = s.settingValue; break;
          case 'smtpFromEmail': smtpFromEmail = s.settingValue; break;
        }
      }
    }
  } catch (error: any) {
    logger.warn('Could not load SMTP settings from database, using env config', { error: error.message });
  }

  return { smtpHost, smtpPort, smtpUser, smtpPass, smtpFromName, smtpFromEmail };
}

async function getTransporter() {
  const smtpConfig = await getSmtpConfig();

  if (!smtpConfig.smtpUser || !smtpConfig.smtpPass) {
    return { transport: null, fromName: smtpConfig.smtpFromName, fromEmail: smtpConfig.smtpFromEmail };
  }

  const configKey = `${smtpConfig.smtpHost}:${smtpConfig.smtpPort}:${smtpConfig.smtpUser}:${smtpConfig.smtpPass}`;

  if (!transporter || configKey !== lastSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpPort === 465,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass,
      },
    });
    lastSmtpConfig = configKey;
  }

  const fromEmail = smtpConfig.smtpHost === 'smtp.gmail.com' ? smtpConfig.smtpUser : smtpConfig.smtpFromEmail;

  return { transport: transporter, fromName: smtpConfig.smtpFromName, fromEmail };
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  cid?: string;
}

export interface EmailFromOverride {
  name?: string;
  email?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  attachments?: EmailAttachment[],
  fromOverride?: EmailFromOverride,
): Promise<boolean> {
  try {
    const { transport, fromName, fromEmail } = await getTransporter();

    if (!transport) {
      logger.warn('SMTP not configured - logging email to console', { to, subject });
      logger.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      logger.info(`[DEV EMAIL] Body: ${text || html.replace(/<[^>]*>/g, '')}`);
      if (attachments?.length) {
        logger.info(`[DEV EMAIL] Attachments: ${attachments.map(a => a.filename).join(', ')}`);
      }
      return true;
    }

    const effectiveFromName = fromOverride?.name || fromName || 'Arapoint';
    const effectiveFromEmail = fromOverride?.email || fromEmail || 'noreply@arapoint.com.ng';
    const fromAddress = `${effectiveFromName} <${effectiveFromEmail}>`;
    const replyTo = effectiveFromEmail;
    const domain = effectiveFromEmail.split('@')[1] || 'arapoint.com.ng';
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@${domain}>`;

    const plainText = text || html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '  ')
      .replace(/<\/th>/gi, '  ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Auto-attach logo images as CID inline attachments when the HTML references them.
    // This is the only method that works reliably in all email clients including Gmail.
    const cidAttachments: nodemailer.Attachment[] = [];
    if (html.includes('cid:email-logo-green') && GREEN_LOGO_BUF) {
      cidAttachments.push({
        filename: 'email-logo-green.png',
        content: GREEN_LOGO_BUF,
        contentType: 'image/png',
        cid: 'email-logo-green',
        contentDisposition: 'inline',
      });
    }
    if (html.includes('cid:email-logo-blue') && BLUE_LOGO_BUF) {
      cidAttachments.push({
        filename: 'email-logo-blue.png',
        content: BLUE_LOGO_BUF,
        contentType: 'image/png',
        cid: 'email-logo-blue',
        contentDisposition: 'inline',
      });
    }

    const extraAttachments = attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      ...(a.cid ? { cid: a.cid, contentDisposition: 'inline' as const } : {}),
    })) ?? [];

    await transport.sendMail({
      from: fromAddress,
      to,
      replyTo,
      subject,
      html,
      text: plainText,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'Arapoint Digital Platform',
        'X-Entity-Ref-ID': messageId,
        'Precedence': 'first-class',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
      },
      attachments: [...cidAttachments, ...extraAttachments],
    });

    logger.info('Email sent successfully via SMTP', { to });
    return true;
  } catch (error: any) {
    logger.error('Failed to send email via SMTP', { to, error: error.message });
    return false;
  }
}
