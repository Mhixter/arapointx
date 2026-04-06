import { Router } from 'express';
import {
  Request, Response, db, bcrypt, jwt, config, logger,
  developerUsers, developerApiKeys, eq,
  otpService, generateApiKey, generateSecretKey, devBalance,
} from './shared';

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
    const token = jwt.sign({ developerId: dev.id }, config.JWT_SECRET, { expiresIn: '7d' });
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

export default router;
