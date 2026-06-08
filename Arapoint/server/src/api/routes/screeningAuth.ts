import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { screeningOrganizations, screeningUsers } from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { logger } from "../../utils/logger";
import { formatResponse, formatErrorResponse } from "../../utils/helpers";
import * as emailService from "../../services/emailService";
import { config } from "../../config/env";

const router = Router();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── OTP TABLE ──────────────────────────────────────────────────────────────

db.execute(sql`
  CREATE TABLE IF NOT EXISTS screening_registration_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    otp TEXT NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '10 minutes',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`).catch((e: any) => logger.warn('[screening] OTP table migration', { error: e.message }));

// ── SEND OTP ───────────────────────────────────────────────────────────────

router.post("/auth/send-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(formatErrorResponse(400, "Email required"));
    }

    // Check email not registered
    const existing = await db.select().from(screeningOrganizations)
      .where(eq(screeningOrganizations.email, email))
      .limit(1);

    if (existing.length) {
      return res.status(400).json(formatErrorResponse(400, "Email already registered"));
    }

    const otp = generateOTP();

    // Upsert OTP
    await db.execute(sql`
      INSERT INTO screening_registration_otps (email, otp, verified, expires_at)
      VALUES (${email}, ${otp}, false, now() + INTERVAL '10 minutes')
      ON CONFLICT (email) DO UPDATE SET
        otp = ${otp},
        attempts = 0,
        verified = false,
        expires_at = now() + INTERVAL '10 minutes'
    `);

    // Send OTP email
    try {
      await emailService.sendEmail(
        email,
        "Arapoint - Email Verification Code",
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#111827;margin-bottom:8px;">Verify Your Email</h2>
          <p style="color:#6b7280;">Enter the code below to complete your Arapoint Employment Screening registration.</p>
          <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Your verification code</p>
            <p style="font-size:40px;font-weight:700;font-family:monospace;letter-spacing:0.2em;color:#0B5FFF;margin:0;">${otp}</p>
            <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">Expires in 10 minutes</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>`
      );
    } catch (emailErr: any) {
      logger.warn("OTP email send failed", { error: emailErr.message });
    }

    logger.info("OTP sent", { email });

    res.json(formatResponse("success", 200, "OTP sent to email", { email }));
  } catch (err: any) {
    logger.error("Send OTP error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, "Failed to send OTP"));
  }
});

// ── REGISTER WITH OTP ──────────────────────────────────────────────────────

router.post("/auth/register-with-otp", async (req: Request, res: Response) => {
  try {
    const { organizationName, email, password, phone, industry, size, otp } = req.body;

    // Validate
    if (!organizationName || !email || !password || !otp) {
      return res.status(400).json(formatErrorResponse(400, "Missing required fields"));
    }

    if (password.length < 8) {
      return res.status(400).json(formatErrorResponse(400, "Password must be 8+ characters"));
    }

    // Verify OTP
    const otpRecord = await db.execute(sql`
      SELECT * FROM screening_registration_otps
      WHERE email = ${email} AND verified = false
      LIMIT 1
    `);

    if (!otpRecord.rows.length) {
      return res.status(400).json(formatErrorResponse(400, "OTP not found"));
    }

    const record = otpRecord.rows[0] as any;

    if (record.attempts >= record.max_attempts) {
      return res.status(400).json(formatErrorResponse(400, "Too many attempts"));
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json(formatErrorResponse(400, "OTP expired"));
    }

    if (record.otp !== otp) {
      await db.execute(sql`
        UPDATE screening_registration_otps
        SET attempts = attempts + 1
        WHERE email = ${email}
      `);
      return res.status(400).json(formatErrorResponse(400, "Invalid OTP"));
    }

    // Mark OTP verified
    await db.execute(sql`
      UPDATE screening_registration_otps
      SET verified = true
      WHERE email = ${email}
    `);

    // Check email not registered
    const existing = await db.select().from(screeningOrganizations)
      .where(eq(screeningOrganizations.email, email))
      .limit(1);

    if (existing.length) {
      return res.status(400).json(formatErrorResponse(400, "Email already registered"));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization - FIXED: Use correct field names from schema
    const orgId = uuid();
    await db.insert(screeningOrganizations).values({
      id: orgId,
      name: organizationName,  // ✅ FIX: Use 'name' not 'organizationName'
      email,
      phone: phone || "",
      industry: industry || "",
      size: size || "",  // ✅ FIX: Use 'size' not 'companySize'
      passwordHash,
      isActive: true,  // ✅ FIX: Use 'isActive' not 'status'
      emailVerified: true,
      walletBalance: "0",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Create admin user
    const userId = uuid();
    await db.insert(screeningUsers).values({
      id: userId,
      orgId,
      email,
      name: organizationName.split(" ")[0],  // ✅ FIX: Use 'name' not 'firstName' 
      role: "admin",
      isActive: true,  // ✅ FIX: Use 'isActive' not 'status'
      createdAt: new Date(),
    } as any);

    // Generate token — must match screeningAuthMiddleware expectations
    const token = jwt.sign(
      { screeningOrgId: orgId, screeningUserId: userId, isScreening: true, email, role: "admin" },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    logger.info("Organization registered", { orgId, email });

    res.json(formatResponse("success", 201, "Organization created", {
      token,
      organization: { id: orgId, name: organizationName, email },
      user: { id: userId, email, role: "admin" },
    }));
  } catch (err: any) {
    logger.error("Register with OTP error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, err.message || "Registration failed"));
  }
});

export default router;
