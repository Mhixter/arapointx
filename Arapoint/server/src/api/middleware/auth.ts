import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { adminUsers, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { ErrorCodes } from '../../utils/errorCodes';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      adminId?: string;
      isAdmin?: boolean;
      adminRole?: string;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.UNAUTHORIZED, message: 'No token provided' });
    }

    const token = authHeader.slice(7);

    if (!token || token.trim() === '') {
      return res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.UNAUTHORIZED, message: 'No token provided' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as any;
    } catch (jwtErr: any) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      return res.status(401).json({
        status: 'error', code: 401,
        error_code: isExpired ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.TOKEN_INVALID,
        message: isExpired ? 'Token has expired' : 'Invalid token',
      });
    }

    req.userId = decoded.userId;

    const [user] = await db.select({ isSuspended: users.isSuspended, suspendReason: users.suspendReason })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.UNAUTHORIZED, message: 'Account not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        status: 'error', code: 403,
        error_code: ErrorCodes.ACCOUNT_SUSPENDED,
        message: 'Your account has been suspended. Please contact support.',
        reason: user.suspendReason || 'Account suspended by administrator',
        suspended: true,
      });
    }

    next();
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.TOKEN_INVALID, message: 'Invalid token' });
  }
};

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.UNAUTHORIZED, message: 'No admin token provided' });
    }

    const token = authHeader.slice(7);

    if (!token || token.trim() === '') {
      return res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.UNAUTHORIZED, message: 'No admin token provided' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as any;
    } catch (jwtErr: any) {
      const isExpired = jwtErr.name === 'TokenExpiredError';
      return res.status(401).json({
        status: 'error', code: 401,
        error_code: isExpired ? ErrorCodes.TOKEN_EXPIRED : ErrorCodes.TOKEN_INVALID,
        message: isExpired ? 'Admin token has expired' : 'Invalid admin token',
      });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ status: 'error', code: 403, error_code: ErrorCodes.FORBIDDEN, message: 'Admin access required' });
    }

    const [admin] = await db.select({ id: adminUsers.id, isActive: adminUsers.isActive })
      .from(adminUsers)
      .where(eq(adminUsers.id, decoded.adminId))
      .limit(1);

    if (!admin || !admin.isActive) {
      return res.status(403).json({ status: 'error', code: 403, error_code: ErrorCodes.ACCOUNT_INACTIVE, message: 'Admin account is inactive or not found' });
    }

    req.adminId = decoded.adminId;
    req.userId = decoded.adminId;
    req.isAdmin = true;
    req.adminRole = decoded.role || 'admin';
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(401).json({ status: 'error', code: 401, error_code: ErrorCodes.TOKEN_INVALID, message: 'Invalid admin token' });
  }
};

export const screeningAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', code: 401, message: 'No token provided' });
    }
    const token = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as any;
    } catch (jwtErr: any) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Invalid or expired token' });
    }
    if (!decoded.isScreening || !decoded.screeningOrgId) {
      return res.status(403).json({ status: 'error', code: 403, message: 'Screening account token required' });
    }
    (req as any).screeningOrgId = decoded.screeningOrgId;
    (req as any).screeningUserId = decoded.screeningUserId;
    (req as any).screeningRole = decoded.role || 'recruiter';
    next();
  } catch (error) {
    res.status(401).json({ status: 'error', code: 401, message: 'Invalid token' });
  }
};

export const requireAdminRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.adminRole || 'admin';
    if (allowedRoles.includes(role) || role === 'super_admin' || role === 'admin') {
      return next();
    }
    return res.status(403).json({ status: 'error', code: 403, error_code: ErrorCodes.FORBIDDEN, message: 'You do not have permission to access this resource' });
  };
};
