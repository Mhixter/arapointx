import { Router, Request, Response } from 'express';
import { userService } from '../../services/userService';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../validators/auth';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { adminUsers, adminRoles, users, jambAgents, identityAgents, educationAgents, a2cAgents, cacAgents } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { otpService } from '../../services/otpService';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { logLoginActivity } from '../../utils/loginActivity';

const router = Router();

router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error', 
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const result = await userService.register(validation.data);
    
    res.status(201).json(formatResponse('success', 201, 'User registered successfully', result));
  } catch (error: any) {
    logger.error('Registration error', { error: error.message });
    
    if (error.message === 'Email already registered') {
      return res.status(409).json(formatErrorResponse(409, error.message));
    }
    
    res.status(500).json(formatErrorResponse(500, 'Registration failed'));
  }
});

router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const result = await userService.login(validation.data);

    logLoginActivity(req, {
      actorType: 'user',
      actorId: result.user.id,
      actorEmail: result.user.email,
      actorName: result.user.name || result.user.email,
    });

    res.json(formatResponse('success', 200, 'Login successful', result));
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
  }
});

router.post('/admin/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Email and password are required'));
    }

    const [admin] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin) {
      logger.warn('Admin login failed: user not found', { email });
      return res.status(401).json(formatErrorResponse(401, 'Invalid admin credentials'));
    }

    if (!admin.isActive) {
      logger.warn('Admin login failed: account inactive', { email });
      return res.status(401).json(formatErrorResponse(401, 'Admin account is inactive'));
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      logger.warn('Admin login failed: invalid password', { email });
      return res.status(401).json(formatErrorResponse(401, 'Invalid admin credentials'));
    }

    // Block agent accounts from logging in through the admin portal
    const isAgentAccount = (await Promise.all([
      db.select({ id: jambAgents.id }).from(jambAgents).where(eq(jambAgents.adminUserId, admin.id)).limit(1),
      db.select({ id: identityAgents.id }).from(identityAgents).where(eq(identityAgents.adminUserId, admin.id)).limit(1),
      db.select({ id: educationAgents.id }).from(educationAgents).where(eq(educationAgents.adminUserId, admin.id)).limit(1),
      db.select({ id: a2cAgents.id }).from(a2cAgents).where(eq(a2cAgents.adminUserId, admin.id)).limit(1),
      db.select({ id: cacAgents.id }).from(cacAgents).where(eq(cacAgents.adminUserId, admin.id)).limit(1),
    ])).some((rows) => rows.length > 0);

    if (isAgentAccount) {
      logger.warn('Admin login blocked: account belongs to an agent', { email, adminId: admin.id });
      return res.status(403).json(formatErrorResponse(403, 'Invalid admin credentials'));
    }

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, admin.id));

    let roleName = 'admin';
    if (admin.roleId) {
      const [role] = await db.select({ name: adminRoles.name })
        .from(adminRoles)
        .where(eq(adminRoles.id, admin.roleId))
        .limit(1);
      if (role) roleName = role.name;
    }

    const accessToken = jwt.sign(
      { adminId: admin.id, isAdmin: true, role: roleName },
      config.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id, isAdmin: true, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Admin login successful', { adminId: admin.id, email: admin.email, role: roleName });

    logLoginActivity(req, {
      actorType: roleName === 'support_agent' ? 'agent' : 'admin',
      actorId: admin.id,
      actorEmail: admin.email,
      actorName: admin.name || admin.email,
    });

    res.json(formatResponse('success', 200, 'Admin login successful', {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: roleName,
      }
    }));
  } catch (error: any) {
    logger.error('Admin login error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Admin login failed'));
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const validation = refreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const result = await userService.refreshToken(validation.data.refreshToken);
    
    res.json(formatResponse('success', 200, 'Token refreshed successfully', result));
  } catch (error: any) {
    logger.error('Token refresh error', { error: error.message });
    res.status(401).json(formatErrorResponse(401, 'Invalid refresh token'));
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    logger.info('User logged out', { userId: req.userId });
    res.json(formatResponse('success', 200, 'Logged out successfully'));
  } catch (error: any) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Logout failed'));
  }
});

router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json(formatErrorResponse(400, 'Email is required'));
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (user) {
      await otpService.sendOTP(email.toLowerCase(), 'password_reset');
      logger.info('Password reset OTP sent', { email });
    } else {
      logger.info('Password reset requested for non-existent email', { email });
    }

    res.json(formatResponse('success', 200, 'If an account with that email exists, a reset code has been sent'));
  } catch (error: any) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/reset-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json(formatErrorResponse(400, 'Email, OTP code, and new password are required'));
    }

    if (newPassword.length < 8) {
      return res.status(400).json(formatErrorResponse(400, 'Password must be at least 8 characters'));
    }

    const isValid = await otpService.verifyOTP(email.toLowerCase(), otp, 'password_reset');
    if (!isValid) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid or expired OTP code'));
    }

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      return res.status(400).json(formatErrorResponse(400, 'Account not found'));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    logger.info('Password reset completed', { userId: user.id });
    res.json(formatResponse('success', 200, 'Password reset successfully'));
  } catch (error: any) {
    logger.error('Reset password error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to reset password'));
  }
});

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const profile = await userService.getProfile(req.userId!);
    res.json(formatResponse('success', 200, 'Profile retrieved successfully', profile));
  } catch (error: any) {
    logger.error('Get profile error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get profile'));
  }
});

router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const profile = await userService.updateProfile(req.userId!, validation.data);
    res.json(formatResponse('success', 200, 'Profile updated successfully', profile));
  } catch (error: any) {
    logger.error('Update profile error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to update profile'));
  }
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json(formatErrorResponse(400, 'Current password and new password are required'));
    }

    if (newPassword.length < 8) {
      return res.status(400).json(formatErrorResponse(400, 'New password must be at least 8 characters'));
    }

    await userService.changePassword(req.userId!, currentPassword, newPassword);
    res.json(formatResponse('success', 200, 'Password changed successfully'));
  } catch (error: any) {
    logger.error('Change password error', { error: error.message, userId: req.userId });
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json(formatErrorResponse(400, error.message));
    }
    res.status(500).json(formatErrorResponse(500, 'Failed to change password'));
  }
});

router.post('/admin/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json(formatErrorResponse(400, 'Email is required'));
    }

    const [admin] = await db.select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (admin) {
      await otpService.sendOTP(email.toLowerCase(), 'password_reset');
      logger.info('Admin password reset OTP sent', { email });
    } else {
      logger.info('Admin password reset requested for non-existent email', { email });
    }

    res.json(formatResponse('success', 200, 'If an admin account with that email exists, a reset code has been sent'));
  } catch (error: any) {
    logger.error('Admin forgot password error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/admin/reset-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json(formatErrorResponse(400, 'Email, OTP code, and new password are required'));
    }

    if (newPassword.length < 8) {
      return res.status(400).json(formatErrorResponse(400, 'Password must be at least 8 characters'));
    }

    const isValid = await otpService.verifyOTP(email.toLowerCase(), otp, 'password_reset');
    if (!isValid) {
      return res.status(400).json(formatErrorResponse(400, 'Invalid or expired OTP code'));
    }

    const [admin] = await db.select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin) {
      return res.status(400).json(formatErrorResponse(400, 'Admin account not found'));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, admin.id));

    logger.info('Admin password reset completed', { adminId: admin.id });
    res.json(formatResponse('success', 200, 'Password reset successfully'));
  } catch (error: any) {
    logger.error('Admin reset password error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to reset password'));
  }
});

router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dashboard = await userService.getDashboard(req.userId!);
    res.json(formatResponse('success', 200, 'Dashboard retrieved successfully', dashboard));
  } catch (error: any) {
    logger.error('Get dashboard error', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to get dashboard'));
  }
});

export default router;
