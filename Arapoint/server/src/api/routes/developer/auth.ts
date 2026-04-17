import { Router } from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import {
  Request, Response, db, bcrypt, jwt, config, logger,
  developerUsers, developerApiKeys, eq, sql,
  otpService, generateApiKey, generateSecretKey, devBalance, devJwtAuth,
} from './shared';
import { logLoginActivity } from '../../../utils/loginActivity';

const router = Router();

router.post('/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email required' });
    }
    const existing = await db.select({ id: developerUsers.id }).from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Email already registered' });
    }
    await otpService.sendOTP(email.toLowerCase(), 'dev_registration');
    res.json({ status: 'success', code: 200, message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (e: any) {
    logger.error('Dev send-otp error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to send OTP' });
  }
});

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, company, password, otpCode } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email, name and password required' });
    }
    if (!otpCode) {
      return res.status(400).json({ status: 'error', code: 400, message: 'OTP verification code required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password must be at least 8 characters' });
    }
    const existing = await db.select({ id: developerUsers.id }).from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (existing.length) {
      return res.status(409).json({ status: 'error', code: 409, message: 'Email already registered' });
    }
    const otpValid = await otpService.verifyOTP(email.toLowerCase(), otpCode, 'dev_registration');
    if (!otpValid) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Invalid or expired OTP code' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [dev] = await db.insert(developerUsers).values({
      email: email.toLowerCase(),
      name,
      company: company || null,
      passwordHash,
      emailVerified: true,
      environmentMode: 'sandbox',
    }).returning();

    const sandboxApiKey = generateApiKey('sandbox');
    const sandboxSecretRaw = generateSecretKey('sandbox');
    const sandboxSecretHash = await bcrypt.hash(sandboxSecretRaw, 10);
    await db.insert(developerApiKeys).values({
      developerId: dev.id,
      keyName: 'Sandbox Key',
      apiKey: sandboxApiKey,
      secretKeyHash: sandboxSecretHash,
      secretKeyLastFour: sandboxSecretRaw.slice(-4),
      environment: 'sandbox',
    });

    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      status: 'success', code: 201, message: 'Developer account created',
      data: {
        token,
        developer: { id: dev.id, email: dev.email, name: dev.name, company: dev.company, walletBalance: 0 },
        sandboxCredentials: {
          accountId: dev.id,
          apiKey: sandboxApiKey,
          secretKey: sandboxSecretRaw,
          environment: 'sandbox',
          note: 'Save your Secret Key now — it will not be shown again.',
        },
      }
    });
  } catch (e: any) {
    logger.error('Dev register error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Registration failed' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email and password required' });
    }
    const [dev] = await db.select().from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase())).limit(1);
    if (!dev || !dev.isActive) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, dev.passwordHash);
    if (!valid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid credentials' });
    }

    const twoFactorEnabled = (dev as any).twoFactorEnabled || false;
    if (twoFactorEnabled) {
      const tempToken = jwt.sign({ developerId: dev.id, twoFactorPending: true }, config.JWT_SECRET, { expiresIn: '5m' });
      return res.json({
        status: '2fa_required', code: 200, message: '2FA verification required',
        data: { temp_token: tempToken },
      });
    }

    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });

    logLoginActivity(req, {
      actorType: 'developer',
      actorId: dev.id,
      actorEmail: dev.email,
      actorName: dev.name || dev.email,
    });

    res.json({
      status: 'success', code: 200, message: 'Login successful',
      data: {
        token,
        developer: {
          id: dev.id, email: dev.email, name: dev.name,
          company: dev.company, walletBalance: devBalance(dev),
          webhookUrl: dev.webhookUrl,
        }
      }
    });
  } catch (e: any) {
    logger.error('Dev login error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Login failed' });
  }
});

router.post('/auth/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { temp_token, totp_code } = req.body;
    if (!temp_token || !totp_code) {
      return res.status(400).json({ status: 'error', code: 400, message: 'temp_token and totp_code required' });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(temp_token, config.JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or expired session. Please log in again.' });
    }
    if (!decoded.twoFactorPending || !decoded.developerId) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid token type' });
    }
    const [dev] = await db.select().from(developerUsers)
      .where(eq(developerUsers.id, decoded.developerId)).limit(1);
    if (!dev || !dev.isActive) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Account not found or inactive' });
    }
    const secret = (dev as any).twoFactorSecret;
    if (!secret) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is not configured on this account' });
    }
    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(totp_code).replace(/\s/g, ''), window: 1 });
    if (!isValid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid authenticator code. Please try again.' });
    }
    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });

    logLoginActivity(req, {
      actorType: 'developer',
      actorId: dev.id,
      actorEmail: dev.email,
      actorName: dev.name || dev.email,
    });

    res.json({
      status: 'success', code: 200, message: 'Login successful',
      data: {
        token,
        developer: {
          id: dev.id, email: dev.email, name: dev.name,
          company: dev.company, walletBalance: devBalance(dev),
          webhookUrl: dev.webhookUrl,
        }
      }
    });
  } catch (e: any) {
    logger.error('Dev 2fa verify error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Verification failed' });
  }
});

router.get('/auth/2fa/setup', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    if ((dev as any).twoFactorEnabled) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is already enabled on this account' });
    }
    const secretObj = speakeasy.generateSecret({ name: `Arapoint Developer Portal (${dev.email})`, length: 20 });
    const secret = secretObj.base32;
    const otpauthUrl = secretObj.otpauth_url!;
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
    res.json({
      status: 'success', code: 200,
      data: { secret, qrCode: qrDataUrl, otpauthUrl },
    });
  } catch (e: any) {
    logger.error('Dev 2fa setup error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to generate 2FA setup' });
  }
});

router.post('/auth/2fa/enable', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { secret, totp_code } = req.body;
    if (!secret || !totp_code) {
      return res.status(400).json({ status: 'error', code: 400, message: 'secret and totp_code required' });
    }
    if ((dev as any).twoFactorEnabled) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is already enabled' });
    }
    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(totp_code).replace(/\s/g, ''), window: 1 });
    if (!isValid) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Invalid authenticator code — make sure you scanned the QR code correctly.' });
    }
    await db.execute(sql`
      UPDATE developer_users
      SET two_factor_secret = ${secret}, two_factor_enabled = true, updated_at = now()
      WHERE id = ${dev.id}
    `);
    res.json({ status: 'success', code: 200, message: '2FA has been enabled successfully.' });
  } catch (e: any) {
    logger.error('Dev 2fa enable error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to enable 2FA' });
  }
});

router.post('/auth/2fa/disable', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password required to disable 2FA' });
    }
    if (!(dev as any).twoFactorEnabled) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is not enabled on this account' });
    }
    const valid = await bcrypt.compare(password, dev.passwordHash);
    if (!valid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Incorrect password' });
    }
    await db.execute(sql`
      UPDATE developer_users
      SET two_factor_secret = null, two_factor_enabled = false, updated_at = now()
      WHERE id = ${dev.id}
    `);
    res.json({ status: 'success', code: 200, message: '2FA has been disabled.' });
  } catch (e: any) {
    logger.error('Dev 2fa disable error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to disable 2FA' });
  }
});

router.post('/auth/2fa/challenge', devJwtAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { totp_code } = req.body;
    if (!totp_code) {
      return res.status(400).json({ status: 'error', code: 400, message: 'totp_code required' });
    }
    if (!(dev as any).twoFactorEnabled) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is not enabled on this account' });
    }
    const secret = (dev as any).twoFactorSecret;
    if (!secret) {
      return res.status(400).json({ status: 'error', code: 400, message: '2FA is not configured' });
    }
    const isValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(totp_code).replace(/\s/g, ''), window: 1 });
    if (!isValid) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid authenticator code. Please try again.' });
    }
    res.json({ status: 'success', code: 200, message: 'Challenge passed' });
  } catch (e: any) {
    logger.error('Dev 2fa challenge error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Verification failed' });
  }
});

router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email required' });
    }
    const [dev] = await db.select({ id: developerUsers.id })
      .from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase()))
      .limit(1);
    if (dev) {
      await otpService.sendOTP(email.toLowerCase(), 'password_reset');
      logger.info('Developer password reset OTP sent', { email });
    } else {
      logger.info('Developer password reset requested for unknown email', { email });
    }
    res.json({ status: 'success', code: 200, message: 'If that email is registered, a reset code has been sent.' });
  } catch (e: any) {
    logger.error('Dev forgot-password error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to process request' });
  }
});

router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Email, OTP code, and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Password must be at least 8 characters' });
    }
    const isValid = await otpService.verifyOTP(email.toLowerCase(), otp, 'password_reset');
    if (!isValid) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Invalid or expired reset code' });
    }
    const [dev] = await db.select({ id: developerUsers.id })
      .from(developerUsers)
      .where(eq(developerUsers.email, email.toLowerCase()))
      .limit(1);
    if (!dev) {
      return res.status(400).json({ status: 'error', code: 400, message: 'Developer account not found' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(developerUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(developerUsers.id, dev.id));
    logger.info('Developer password reset completed', { developerId: dev.id });
    res.json({ status: 'success', code: 200, message: 'Password reset successfully' });
  } catch (e: any) {
    logger.error('Dev reset-password error', { error: e.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to reset password' });
  }
});

export default router;
