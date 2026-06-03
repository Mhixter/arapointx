import { Router, Request, Response } from "express";
import { db } from "../../config/database";
import { testimonials } from "../../db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { formatResponse, formatErrorResponse } from "../../utils/helpers";
import { adminAuthMiddleware } from "../middleware/auth";
import multer from "multer";
import { objectStorageService } from "../../services/objectStorage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Ensure table exists ──────────────────────────────────────────────────────
(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS testimonials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        avatar_url VARCHAR(500),
        quote TEXT NOT NULL,
        rating INTEGER DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const existing = await db.execute(sql`SELECT COUNT(*) FROM testimonials`);
    const count = Number((existing.rows[0] as any).count);

    if (count === 0) {
      await db.execute(sql`
        INSERT INTO testimonials (name, role, company, quote, rating, is_active, display_order) VALUES
        ('Amaka Obi', 'Head of Talent', 'TechBridge Lagos', 'We onboard over 50 professionals every quarter. Before Arapoint, verification took 2 weeks. Now we get a cross-referenced PASS/FAIL in minutes — it has completely changed how we hire.', 5, true, 1),
        ('Chukwuemeka Adeyemi', 'Chief Executive Officer', 'QuickLend Finance', 'Our loan default rate dropped 40% in the first quarter after integrating Arapoint. The BVN + NIN cross-reference catches fraud patterns we would have missed entirely. Best API investment we have made.', 5, true, 2),
        ('Chioma Eze', 'Compliance & KYC Lead', 'PayFast Africa', 'NDPA compliance is non-negotiable for us. Arapoint was the only provider that gave us direct-registry data with proper audit trails. The sandbox made our integration completely painless.', 5, true, 3),
        ('Ibrahim Musa', 'Chief Technology Officer', 'HireRight Nigeria', 'We have processed over 3,000 employment screenings through Arapoint. The automated scoring is incredibly accurate — it flags exactly what needs manual review and clears everything else automatically.', 5, true, 4),
        ('Ngozi Nwosu', 'Operations Director', 'LendSmart', 'From API signup to first live verification in under 30 minutes. The developer portal is clean, the documentation is excellent, and when we had questions, support was fast. Rare for a Nigerian tech product.', 5, true, 5)
      `);
      logger.info("Seeded 5 default testimonials");
    }
  } catch (e: any) {
    logger.warn("Testimonials table setup warning", { error: e.message });
  }
})();

// ── PUBLIC: Get active testimonials ─────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, name, role, company, avatar_url, quote, rating, display_order
      FROM testimonials
      WHERE is_active = true
      ORDER BY display_order ASC, created_at ASC
    `);
    res.json(formatResponse("success", 200, "Testimonials", rows.rows));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to fetch testimonials"));
  }
});

// ── ADMIN: Get all testimonials ───────────────────────────────────────────────
router.get("/all", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM testimonials ORDER BY display_order ASC, created_at ASC
    `);
    res.json(formatResponse("success", 200, "All testimonials", rows.rows));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to fetch testimonials"));
  }
});

// ── ADMIN: Create testimonial ────────────────────────────────────────────────
router.post("/", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, role, company, quote, rating, avatarUrl, displayOrder, isActive } = req.body;
    if (!name || !role || !quote) {
      return res.status(400).json(formatErrorResponse(400, "name, role, and quote are required"));
    }
    const result = await db.execute(sql`
      INSERT INTO testimonials (name, role, company, avatar_url, quote, rating, is_active, display_order)
      VALUES (${name}, ${role}, ${company || null}, ${avatarUrl || null}, ${quote}, ${Number(rating) || 5}, ${isActive !== false}, ${Number(displayOrder) || 0})
      RETURNING *
    `);
    res.status(201).json(formatResponse("success", 201, "Testimonial created", result.rows[0]));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to create testimonial"));
  }
});

// ── ADMIN: Update testimonial ────────────────────────────────────────────────
router.put("/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, company, quote, rating, avatarUrl, displayOrder, isActive } = req.body;
    const result = await db.execute(sql`
      UPDATE testimonials
      SET
        name = COALESCE(${name}, name),
        role = COALESCE(${role}, role),
        company = ${company !== undefined ? company : sql`company`},
        avatar_url = ${avatarUrl !== undefined ? avatarUrl : sql`avatar_url`},
        quote = COALESCE(${quote}, quote),
        rating = COALESCE(${Number(rating) || null}, rating),
        is_active = ${isActive !== undefined ? isActive : sql`is_active`},
        display_order = COALESCE(${displayOrder !== undefined ? Number(displayOrder) : null}, display_order),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    if (!result.rows.length) return res.status(404).json(formatErrorResponse(404, "Not found"));
    res.json(formatResponse("success", 200, "Testimonial updated", result.rows[0]));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to update testimonial"));
  }
});

// ── ADMIN: Toggle active ─────────────────────────────────────────────────────
router.patch("/:id/toggle", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      UPDATE testimonials SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = ${id} RETURNING id, is_active
    `);
    if (!result.rows.length) return res.status(404).json(formatErrorResponse(404, "Not found"));
    res.json(formatResponse("success", 200, "Toggled", result.rows[0]));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to toggle"));
  }
});

// ── ADMIN: Upload avatar image ───────────────────────────────────────────────
router.post("/:id/image", adminAuthMiddleware, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(formatErrorResponse(400, "No file uploaded"));

    const ext = req.file.mimetype === "image/png" ? ".png" : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const url = await objectStorageService.uploadBuffer(req.file.buffer, req.file.mimetype, "testimonials", ext);

    if (!url) {
      return res.status(400).json(formatErrorResponse(400, "Object storage not configured. Use an image URL instead."));
    }

    await db.execute(sql`
      UPDATE testimonials SET avatar_url = ${url}, updated_at = NOW() WHERE id = ${req.params.id}
    `);

    res.json(formatResponse("success", 200, "Image uploaded", { avatarUrl: url }));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Image upload failed"));
  }
});

// ── ADMIN: Delete testimonial ────────────────────────────────────────────────
router.delete("/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM testimonials WHERE id = ${id}`);
    res.json(formatResponse("success", 200, "Deleted", { id }));
  } catch (e: any) {
    res.status(500).json(formatErrorResponse(500, "Failed to delete"));
  }
});

export default router;
