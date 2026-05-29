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
      await emailService.sendEmail({
        to: email,
        subject: "Arapoint - Email Verification Code",
        html: `
          <h2>Verify Your Email</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; font-weight: bold; font-family: monospace; color: #0B5FFF;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        `,
      });
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

    // Create organization
    const orgId = uuid();
    await db.insert(screeningOrganizations).values({
      id: orgId,
      organizationName,
      email,
      phone: phone || "",
      industry: industry || "",
      companySize: size || "",
      passwordHash,
      status: "active",
      walletBalance: "0",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Create admin user
    const userId = uuid();
    await db.insert(screeningUsers).values({
      id: userId,
      orgId,
      email,
      firstName: organizationName.split(" ")[0],
      lastName: organizationName.split(" ").slice(1).join(" ") || "Admin",
      role: "admin",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Generate token
    const token = jwt.sign(
      { orgId, userId, email, role: "admin" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    logger.info("Organization registered", { orgId, email });

    res.json(formatResponse("success", 201, "Organization created", {
      token,
      organization: { id: orgId, organizationName, email },
      user: { id: userId, email, role: "admin" },
    }));
  } catch (err: any) {
    logger.error("Register with OTP error", { error: err.message });
    res.status(500).json(formatErrorResponse(500, err.message || "Registration failed"));
  }
});

export default router;