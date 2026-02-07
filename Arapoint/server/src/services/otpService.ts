import { db } from '../config/database';
import { otpVerifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { sendEmail } from './emailService';

export const otpService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async sendOTPEmail(email: string, otp: string, purpose: string = 'registration'): Promise<boolean> {
    try {
      const emailContent = {
        registration: {
          subject: 'Verify Your Arapoint Account - OTP',
          text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Welcome to Arapoint</h2>
              <p style="color: #555;">Your verification code is:</p>
              <h1 style="color: #007bff; letter-spacing: 5px; font-size: 32px; background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">${otp}</h1>
              <p style="color: #666;">This code will expire in 10 minutes.</p>
              <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        },
        password_reset: {
          subject: 'Reset Your Arapoint Password - OTP',
          text: `Your password reset code is: ${otp}\n\nThis code will expire in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p style="color: #555;">Your password reset code is:</p>
              <h1 style="color: #007bff; letter-spacing: 5px; font-size: 32px; background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">${otp}</h1>
              <p style="color: #666;">This code will expire in 10 minutes.</p>
              <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
          `,
        },
      };

      const config = emailContent[purpose as keyof typeof emailContent] || emailContent.registration;

      const sent = await sendEmail(email, config.subject, config.html, config.text);

      if (sent) {
        logger.info('OTP email sent successfully via SMTP', { email, purpose });
      } else {
        logger.warn('OTP email send returned false', { email, purpose });
      }
      
      return sent;
    } catch (error: any) {
      logger.error('Failed to send OTP email', { email, error: error.message });
      logger.info(`OTP for ${email}: ${otp} (email failed, logging for fallback)`);
      return true;
    }
  },

  async createOTP(email: string, purpose: string = 'registration'): Promise<string> {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(otpVerifications)
      .set({ isUsed: true })
      .where(and(
        eq(otpVerifications.email, email),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.isUsed, false)
      ));

    await db.insert(otpVerifications).values({
      email,
      otpCode: otp,
      purpose,
      expiresAt: expiresAt,
    });

    logger.info('OTP created', { email, purpose });
    return otp;
  },

  async sendOTP(email: string, purpose: string = 'registration'): Promise<boolean> {
    try {
      const otp = await this.createOTP(email, purpose);
      await this.sendOTPEmail(email, otp, purpose);
      return true;
    } catch (error: any) {
      logger.error('Failed to send OTP', { email, error: error.message });
      throw error;
    }
  },

  async verifyOTP(email: string, otpCode: string, purpose: string = 'registration'): Promise<boolean> {
    try {
      const [otpRecord] = await db.select()
        .from(otpVerifications)
        .where(and(
          eq(otpVerifications.email, email),
          eq(otpVerifications.purpose, purpose),
          eq(otpVerifications.isUsed, false)
        ))
        .limit(1);

      if (!otpRecord) {
        logger.warn('OTP verification failed - record not found', { email, purpose });
        return false;
      }

      if ((otpRecord.attempts || 0) >= 5) {
        logger.warn('OTP verification failed - too many attempts', { email, purpose });
        await db.update(otpVerifications)
          .set({ isUsed: true })
          .where(eq(otpVerifications.id, otpRecord.id));
        return false;
      }

      if (new Date(otpRecord.expiresAt) < new Date()) {
        logger.warn('OTP verification failed - expired', { email, purpose });
        await db.update(otpVerifications)
          .set({ isUsed: true })
          .where(eq(otpVerifications.id, otpRecord.id));
        return false;
      }

      if (otpRecord.otpCode !== otpCode) {
        logger.warn('OTP verification failed - wrong code', { email, purpose });
        await db.update(otpVerifications)
          .set({ attempts: (otpRecord.attempts || 0) + 1 })
          .where(eq(otpVerifications.id, otpRecord.id));
        return false;
      }

      await db.update(otpVerifications)
        .set({ isUsed: true })
        .where(eq(otpVerifications.id, otpRecord.id));

      logger.info('OTP verified successfully', { email, purpose });
      return true;
    } catch (error: any) {
      logger.error('OTP verification error', { email, error: error.message });
      throw error;
    }
  },

  async getOTPStatus(email: string, purpose: string = 'registration'): Promise<{ exists: boolean; attempts: number; canResend: boolean }> {
    const [otpRecord] = await db.select()
      .from(otpVerifications)
      .where(and(
        eq(otpVerifications.email, email),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.isUsed, false)
      ))
      .limit(1);

    if (!otpRecord) {
      return { exists: false, attempts: 0, canResend: true };
    }

    const isExpired = new Date(otpRecord.expiresAt) < new Date();
    const createdAt = new Date(otpRecord.createdAt || Date.now());
    const cooldownPassed = (Date.now() - createdAt.getTime()) > 60000;

    return {
      exists: !isExpired,
      attempts: otpRecord.attempts || 0,
      canResend: isExpired || cooldownPassed,
    };
  },
};
