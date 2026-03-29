import { Router, Request, Response } from 'express';
import { otpService } from '../../services/otpService';
import { userService } from '../../services/userService';
import { sendOTPSchema, verifyOTPSchema, registerWithOTPSchema } from '../validators/otp';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/send', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = sendOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { email, purpose } = validation.data;

    const status = await otpService.getOTPStatus(email, purpose);
    if (status.exists && !status.canResend) {
      return res.status(429).json(formatErrorResponse(429, 'Please wait 1 minute before requesting a new OTP.'));
    }

    await otpService.sendOTP(email, purpose);

    logger.info('OTP sent', { email, purpose });

    res.json(formatResponse('success', 200, 'OTP sent successfully', {
      message: `A verification code has been sent to ${email}`,
      expiresIn: 600,
    }));
  } catch (error: any) {
    logger.error('Send OTP error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send OTP'));
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const validation = verifyOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { email, otp, purpose } = validation.data;

    const isValid = await otpService.verifyOTP(email, otp, purpose);

    if (!isValid) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid or expired OTP'));
    }

    logger.info('OTP verified', { email, purpose });

    res.json(formatResponse('success', 200, 'OTP verified successfully', {
      verified: true,
    }));
  } catch (error: any) {
    logger.error('Verify OTP error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to verify OTP'));
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerWithOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const { email, name, phone, password, otp } = validation.data;

    const isOtpValid = await otpService.verifyOTP(email, otp, 'registration');
    if (!isOtpValid) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid or expired OTP'));
    }

    const result = await userService.register({
      email,
      name,
      phone,
      password,
      emailVerified: true,
    });

    logger.info('User registered with OTP verification', { email });

    res.status(201).json(formatResponse('success', 201, 'User registered successfully', result));
  } catch (error: any) {
    logger.error('Registration with OTP error', { error: error.message });

    if (error.message === 'Email already registered') {
      return res.status(409).json(formatErrorResponse(409, error.message));
    }

    res.status(500).json(formatErrorResponse(500, 'Registration failed'));
  }
});

export default router;
