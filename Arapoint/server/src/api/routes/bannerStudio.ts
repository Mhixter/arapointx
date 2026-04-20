import { Router, Request, Response } from 'express';
import { adminAuthMiddleware, requireAdminRole } from '../middleware/auth';
import { db } from '../../config/database';
import { marketingBanners } from '../../db/schema';
import { desc, eq, inArray, and, sql } from 'drizzle-orm';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { generateBanner, buildBannerPdf, SUBJECT_PRESETS, LAYOUTS } from '../../services/bannerStudioService';
import { objectStorageService } from '../../services/objectStorage';

const router = Router();
router.use(adminAuthMiddleware);
router.use(requireAdminRole('super_admin', 'admin', 'marketing_admin'));

router.get('/presets', async (_req: Request, res: Response) => {
  res.json(formatResponse('success', 200, 'Subject presets', {
    presets: Object.entries(SUBJECT_PRESETS).map(([key, desc]) => ({ key, desc })),
    categories: ['How It Works', 'Benefit', 'Festival', 'Developer', 'Trust Score', 'Customer Story', 'Future', 'Attracting Users', 'People Explaining', 'Email', 'Security'],
    audiences: ['main', 'developer'],
    aspectRatios: ['16:9', '4:3', '1:1', '9:16'],
    layouts: [
      { id: 'auto', name: 'Auto (smart pick by topic)', description: 'System chooses the best layout based on category and headline' },
      { id: 'random', name: 'Random (surprise me)', description: 'Picks a random layout each time' },
      ...LAYOUTS.map(l => ({ id: l.id, name: l.name, description: l.description, audience: l.audience })),
    ],
  }));
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).adminId as string | undefined;
    const {
      category, audience, headline, highlightWord, bodyText,
      subjectPreset, customPhotoPrompt,
      feature1Title, feature1Desc,
      feature2Title, feature2Desc,
      feature3Title, feature3Desc,
      aspectRatio,
    } = req.body || {};

    if (!headline || !category || !audience) {
      return res.status(400).json(formatErrorResponse(400, 'headline, category, and audience are required'));
    }
    if (!subjectPreset && !customPhotoPrompt) {
      return res.status(400).json(formatErrorResponse(400, 'subjectPreset or customPhotoPrompt is required'));
    }

    const result = await generateBanner({
      category, audience, headline, highlightWord, bodyText,
      subjectPreset: subjectPreset || 'photo_only',
      customPhotoPrompt,
      feature1Title, feature1Desc,
      feature2Title, feature2Desc,
      feature3Title, feature3Desc,
      aspectRatio,
    });

    const [row] = await db.insert(marketingBanners).values({
      category, audience, headline, highlightWord, bodyText,
      subjectPreset: subjectPreset || 'photo_only',
      photoPrompt: result.finalPhotoPrompt,
      feature1Title, feature1Desc,
      feature2Title, feature2Desc,
      feature3Title, feature3Desc,
      aspectRatio: aspectRatio || '16:9',
      photoUrl: result.photoUrl || null,
      bannerUrl: result.bannerUrl,
      status: 'ready',
      createdBy: adminId || null,
    } as any).returning();

    res.json(formatResponse('success', 200, 'Banner generated', { banner: row }));
  } catch (err: any) {
    logger.error('Banner generation failed', { error: err.message, stack: err.stack });
    res.status(500).json(formatErrorResponse(500, `Banner generation failed: ${err.message}`));
  }
});

router.get('/library', async (req: Request, res: Response) => {
  try {
    const audience = (req.query.audience as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const limit = Math.min(parseInt(String(req.query.limit || '60'), 10) || 60, 200);

    const conditions: any[] = [];
    if (audience) conditions.push(eq(marketingBanners.audience, audience));
    if (category) conditions.push(eq(marketingBanners.category, category));

    const rows = await db.select().from(marketingBanners)
      .where(conditions.length ? and(...conditions) : undefined as any)
      .orderBy(desc(marketingBanners.createdAt))
      .limit(limit);

    res.json(formatResponse('success', 200, 'Banners retrieved', { banners: rows, count: rows.length }));
  } catch (err: any) {
    logger.error('library failed', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to load banners'));
  }
});

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(marketingBanners).where(eq(marketingBanners.id, req.params.id));
    if (!row) return res.status(404).json(formatErrorResponse(404, 'Banner not found'));
    const fileKey = await objectStorageService.getObjectEntityFile(row.bannerUrl);
    res.setHeader('Content-Disposition', `attachment; filename="arapoint-banner-${row.id}.png"`);
    await objectStorageService.downloadObject(fileKey, res);
  } catch (err: any) {
    logger.error('download failed', { error: err.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to download banner'));
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db.delete(marketingBanners).where(eq(marketingBanners.id, req.params.id));
    res.json(formatResponse('success', 200, 'Banner deleted'));
  } catch (err: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to delete banner'));
  }
});

router.post('/export-pdf', async (req: Request, res: Response) => {
  try {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json(formatErrorResponse(400, 'ids array is required'));

    const rows = await db.select().from(marketingBanners).where(inArray(marketingBanners.id, ids));
    if (!rows.length) return res.status(404).json(formatErrorResponse(404, 'No banners found'));

    const sortedRows = ids.map(id => rows.find(r => r.id === id)).filter(Boolean) as typeof rows;
    const pdfBuf = await buildBannerPdf(sortedRows.map(r => ({ url: r.bannerUrl })));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="arapoint-banners-${Date.now()}.pdf"`);
    res.send(pdfBuf);
  } catch (err: any) {
    logger.error('export-pdf failed', { error: err.message, stack: err.stack });
    res.status(500).json(formatErrorResponse(500, `PDF export failed: ${err.message}`));
  }
});

export default router;
