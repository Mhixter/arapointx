import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const cleanupStore = () => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
};

setInterval(cleanupStore, 60000);

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, message, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator 
      ? keyGenerator(req) 
      : (req.userId || req.ip || 'anonymous');
    
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      
      logger.warn('Rate limit exceeded', { key, count: store[key].count, max });
      
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.ceil(store[key].resetTime / 1000)));

      return res.status(429).json({
        status: 'error',
        code: 429,
        message: message || 'Too many requests, please try again later',
        retryAfter,
      });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(max - store[key].count));
    res.set('X-RateLimit-Reset', String(Math.ceil(store[key].resetTime / 1000)));

    next();
  };
};

export const publicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests from this IP, please try again after a minute',
  keyGenerator: (req) => req.ip || 'unknown',
});

export const authenticatedRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again after a minute',
  keyGenerator: (req) => req.userId || req.ip || 'unknown',
});

export const rpaRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'RPA query limit reached, please try again after a minute',
  keyGenerator: (req) => `rpa_${req.userId || req.ip || 'unknown'}`,
});
