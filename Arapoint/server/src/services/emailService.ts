import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { db } from '../config/database';
import { adminSettings } from '../db/schema';
import { inArray } from 'drizzle-orm';

let transporter: nodemailer.Transporter | null = null;
let lastSmtpConfig: string = '';

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

  return { transport: transporter, fromName: smtpConfig.smtpFromName, fromEmail: smtpConfig.smtpFromEmail };
}

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    const { transport, fromName, fromEmail } = await getTransporter();

    if (!transport) {
      logger.warn('SMTP not configured - logging email to console', { to, subject });
      logger.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      logger.info(`[DEV EMAIL] Body: ${text || html.replace(/<[^>]*>/g, '')}`);
      return true;
    }

    const fromAddress = `${fromName} <${fromEmail}>`;

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    logger.info('Email sent successfully via SMTP', { to });
    return true;
  } catch (error: any) {
    logger.error('Failed to send email via SMTP', { to, error: error.message });
    return false;
  }
}
