import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../../utils/logger';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { db } from '../../config/database';
import { sharedFiles } from '../../db/schema';
import { eq, and, or, desc, isNull } from 'drizzle-orm';
import { objectStorageService, ObjectNotFoundError } from '../../services/objectStorage';
import multer from 'multer';
import { randomBytes } from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function normalizeFileKey(fileKey: string): string {
  if (!fileKey) return fileKey;
  if (fileKey.startsWith('/objects/') || fileKey.startsWith('/uploads/')) return fileKey;
  if (/^\/replit-objstore-/.test(fileKey)) {
    const firstSlash = fileKey.indexOf('/', 1);
    return `/objects${fileKey.slice(firstSlash)}`;
  }
  return fileKey;
}

// POST /api/files/upload — upload a file to object storage and record it in the DB
router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(formatErrorResponse(400, 'No file provided'));
    }

    const { relatedRequestId, relatedRequestType, description, accessibleTo } = req.body;
    const { originalname, mimetype, size, buffer } = req.file;

    const ext = originalname.includes('.') ? `.${originalname.split('.').pop()}` : '';
    const prefix = `shared/${relatedRequestType || 'general'}`;

    const fileKey = await objectStorageService.uploadBuffer(buffer, mimetype, prefix, ext);

    if (!fileKey) {
      return res.status(503).json(formatErrorResponse(503, 'Object storage is not configured. Please contact admin.'));
    }

    const [inserted] = await db.insert(sharedFiles).values({
      uploadedByUserId: req.userId!,
      uploaderRole: 'user',
      fileKey,
      fileName: originalname,
      mimeType: mimetype,
      fileSize: size,
      relatedRequestId: relatedRequestId || null,
      relatedRequestType: relatedRequestType || null,
      accessibleTo: accessibleTo || 'user',
      description: description || null,
    }).returning();

    logger.info('File uploaded', { fileId: inserted.id, userId: req.userId, fileKey });
    res.status(201).json(formatResponse('success', 201, 'File uploaded successfully', {
      fileId: inserted.id,
      fileKey,
      fileName: originalname,
    }));
  } catch (error: any) {
    logger.error('File upload error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'File upload failed'));
  }
});

// GET /api/files — list files accessible to the requesting user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { relatedRequestId, relatedRequestType } = req.query;

    const files = await db
      .select({
        id: sharedFiles.id,
        uploadedByUserId: sharedFiles.uploadedByUserId,
        uploaderRole: sharedFiles.uploaderRole,
        fileKey: sharedFiles.fileKey,
        fileName: sharedFiles.fileName,
        mimeType: sharedFiles.mimeType,
        fileSize: sharedFiles.fileSize,
        relatedRequestId: sharedFiles.relatedRequestId,
        relatedRequestType: sharedFiles.relatedRequestType,
        accessibleTo: sharedFiles.accessibleTo,
        description: sharedFiles.description,
        shareToken: sharedFiles.shareToken,
        shareTokenExpiresAt: sharedFiles.shareTokenExpiresAt,
        isDeleted: sharedFiles.isDeleted,
        createdAt: sharedFiles.createdAt,
      })
      .from(sharedFiles)
      .where(
        and(
          eq(sharedFiles.isDeleted, false),
          or(
            eq(sharedFiles.uploadedByUserId, req.userId!),
            eq(sharedFiles.accessibleTo, 'all'),
          )
        )
      )
      .orderBy(desc(sharedFiles.createdAt))
      .limit(100);

    const filtered = files
      .filter(f => {
        if (relatedRequestId && f.relatedRequestId !== relatedRequestId) return false;
        if (relatedRequestType && f.relatedRequestType !== relatedRequestType) return false;
        return true;
      })
      .map(f => {
        const isOwner = f.uploadedByUserId === req.userId;
        return {
          ...f,
          shareToken: isOwner ? f.shareToken : undefined,
          shareTokenExpiresAt: isOwner ? f.shareTokenExpiresAt : undefined,
        };
      });

    res.json(formatResponse('success', 200, 'Files retrieved', { files: filtered }));
  } catch (error: any) {
    logger.error('List files error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to list files'));
  }
});

// GET /api/files/:id/download — stream or redirect to a file
router.get('/:id/download', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [file] = await db
      .select()
      .from(sharedFiles)
      .where(and(eq(sharedFiles.id, id), eq(sharedFiles.isDeleted, false)))
      .limit(1);

    if (!file) {
      return res.status(404).json(formatErrorResponse(404, 'File not found'));
    }

    const isOwner = file.uploadedByUserId === req.userId;
    const isPubliclyAccessible = file.accessibleTo === 'all';

    if (!isOwner && !isPubliclyAccessible) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    // If the fileKey is an external URL (e.g. CAC certificate URL), redirect to it
    if (file.fileKey.startsWith('http://') || file.fileKey.startsWith('https://')) {
      return res.redirect(302, file.fileKey);
    }

    const objectFile = await objectStorageService.getObjectEntityFile(normalizeFileKey(file.fileKey));
    const stream = objectFile.createReadStream();

    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.setHeader('Content-Type', file.mimeType);

    stream.on('error', (err) => {
      logger.error('File download stream error', { error: err.message });
      if (!res.headersSent) res.status(500).json(formatErrorResponse(500, 'Download failed'));
    });

    stream.pipe(res);
  } catch (error: any) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json(formatErrorResponse(404, 'File not found in storage'));
    }
    logger.error('File download error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to download file'));
  }
});

// POST /api/files/:id/share — generate or refresh a shareable link token (expires in 7 days)
router.post('/:id/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expiryDays = 7 } = req.body;

    const [file] = await db
      .select({ id: sharedFiles.id, uploadedByUserId: sharedFiles.uploadedByUserId, fileName: sharedFiles.fileName, isDeleted: sharedFiles.isDeleted })
      .from(sharedFiles)
      .where(and(eq(sharedFiles.id, id), eq(sharedFiles.isDeleted, false)))
      .limit(1);

    if (!file) {
      return res.status(404).json(formatErrorResponse(404, 'File not found'));
    }

    if (file.uploadedByUserId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied — you can only share your own files'));
    }

    const days = Math.min(Math.max(parseInt(expiryDays) || 7, 1), 30);
    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.update(sharedFiles)
      .set({ shareToken, shareTokenExpiresAt: expiresAt })
      .where(eq(sharedFiles.id, id));

    logger.info('Share link generated', { fileId: id, userId: req.userId, expiresAt });

    res.json(formatResponse('success', 200, 'Share link generated', {
      shareToken,
      expiresAt: expiresAt.toISOString(),
      expiryDays: days,
    }));
  } catch (error: any) {
    logger.error('Share link error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to generate share link'));
  }
});

// DELETE /api/files/:id/share — revoke a shareable link
router.delete('/:id/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [file] = await db
      .select({ id: sharedFiles.id, uploadedByUserId: sharedFiles.uploadedByUserId })
      .from(sharedFiles)
      .where(and(eq(sharedFiles.id, id), eq(sharedFiles.isDeleted, false)))
      .limit(1);

    if (!file) return res.status(404).json(formatErrorResponse(404, 'File not found'));
    if (file.uploadedByUserId !== req.userId) return res.status(403).json(formatErrorResponse(403, 'Access denied'));

    await db.update(sharedFiles)
      .set({ shareToken: null, shareTokenExpiresAt: null })
      .where(eq(sharedFiles.id, id));

    res.json(formatResponse('success', 200, 'Share link revoked'));
  } catch (error: any) {
    logger.error('Revoke share error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to revoke share link'));
  }
});

// GET /api/files/shared/:token — public download via share token (no auth required)
router.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const [file] = await db
      .select()
      .from(sharedFiles)
      .where(and(eq(sharedFiles.shareToken, token), eq(sharedFiles.isDeleted, false)))
      .limit(1);

    if (!file) {
      return res.status(404).json(formatErrorResponse(404, 'Share link is invalid or has been revoked'));
    }

    if (file.shareTokenExpiresAt && new Date(file.shareTokenExpiresAt) < new Date()) {
      return res.status(410).json(formatErrorResponse(410, 'This share link has expired'));
    }

    const objectFile = await objectStorageService.getObjectEntityFile(normalizeFileKey(file.fileKey));
    const stream = objectFile.createReadStream();

    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.setHeader('Content-Type', file.mimeType);

    stream.on('error', (err) => {
      logger.error('Shared file download error', { error: err.message });
      if (!res.headersSent) res.status(500).json(formatErrorResponse(500, 'Download failed'));
    });

    stream.pipe(res);
  } catch (error: any) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json(formatErrorResponse(404, 'File not found in storage'));
    }
    logger.error('Shared file error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to retrieve shared file'));
  }
});

// DELETE /api/files/:id — soft-delete a file
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [file] = await db
      .select({ id: sharedFiles.id, uploadedByUserId: sharedFiles.uploadedByUserId })
      .from(sharedFiles)
      .where(and(eq(sharedFiles.id, id), eq(sharedFiles.isDeleted, false)))
      .limit(1);

    if (!file) {
      return res.status(404).json(formatErrorResponse(404, 'File not found'));
    }

    if (file.uploadedByUserId !== req.userId) {
      return res.status(403).json(formatErrorResponse(403, 'Access denied'));
    }

    await db.update(sharedFiles).set({ isDeleted: true, shareToken: null }).where(eq(sharedFiles.id, id));
    res.json(formatResponse('success', 200, 'File deleted'));
  } catch (error: any) {
    logger.error('Delete file error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to delete file'));
  }
});

export default router;
