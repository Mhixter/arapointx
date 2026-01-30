import { Router, Request, Response } from 'express';
import { userService } from '../../services/userService';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../validators/auth';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { adminUsers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(formatErrorResponse(400, 'Validation error',
        validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      ));
    }

    const result = await userService.login(validation.data);
    
    res.json(formatResponse('success', 200, 'Login successful', result));
  } catch (error: any) {
    logger.error('Login error', { error: error.message });
    res.status(401).json(formatErrorResponse(401, 'Invalid credentials'));
  }
});

router.post('/admin/login', async (req: Request, res: Response) => {
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

    await db.update(adminUsers)
      .set({ lastLogin: new Date() })
      .where(eq(adminUsers.id, admin.id));

    const accessToken = jwt.sign(
      { adminId: admin.id, isAdmin: true },
      config.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id, isAdmin: true, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Admin login successful', { adminId: admin.id, email: admin.email });

    res.json(formatResponse('success', 200, 'Admin login successful', {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
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

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json(formatErrorResponse(400, 'Email is required'));
    }

    logger.info('Password reset requested', { email });
    
    res.json(formatResponse('success', 200, 'If the email exists, a reset link has been sent'));
  } catch (error: any) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to process request'));
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json(formatErrorResponse(400, 'Token and password are required'));
    }

    if (password.length < 8) {
      return res.status(400).json(formatErrorResponse(400, 'Password must be at least 8 characters'));
    }

    logger.info('Password reset completed');
    
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
