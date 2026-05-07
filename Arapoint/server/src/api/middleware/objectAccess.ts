import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth';
import { db } from '../../config/database';
import { sharedFiles } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Combined authentication + object-level ownership middleware for GET /objects/* routes.
 *
 * Enforces:
 * 1. Valid JWT (delegates to authMiddleware).
 * 2. The requested object path must exist in shared_files and belong to the
 *    requesting user (uploadedByUserId === req.userId) OR be marked accessibleTo='all'.
 *
 * Returns 403 if the record is absent from shared_files or belongs to a different user,
 * preventing cross-tenant access even by authenticated accounts.
 */
export function objectAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
  authMiddleware(req, res, async () => {
    try {
      const [fileRecord] = await db
        .select({ uploadedByUserId: sharedFiles.uploadedByUserId, accessibleTo: sharedFiles.accessibleTo })
        .from(sharedFiles)
        .where(and(eq(sharedFiles.fileKey, req.path), eq(sharedFiles.isDeleted, false)))
        .limit(1);

      if (!fileRecord) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const isOwner = fileRecord.uploadedByUserId === req.userId;
      const isPublic = fileRecord.accessibleTo === 'all';

      if (!isOwner && !isPublic) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
