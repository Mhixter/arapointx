import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { db } from '../../config/database';
import { adminUsers } from '../../db/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      adminId?: string;
      isAdmin?: boolean;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'No token provided',
      });
    }
    
    const token = authHeader.slice(7); // Extract token after 'Bearer '
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'No token provided',
      });
    }
    
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Invalid token',
    });
  }
};

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'No admin token provided',
      });
    }
    
    const token = authHeader.slice(7);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'No admin token provided',
      });
    }
    
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    if (!decoded.isAdmin) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Admin access required',
      });
    }
    
    const [admin] = await db.select({ id: adminUsers.id, isActive: adminUsers.isActive })
      .from(adminUsers)
      .where(eq(adminUsers.id, decoded.adminId))
      .limit(1);
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Admin account is inactive or not found',
      });
    }
    
    req.adminId = decoded.adminId;
    req.userId = decoded.adminId;
    req.isAdmin = true;
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Invalid admin token',
    });
  }
};
