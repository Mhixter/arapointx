import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { adminUsers } from './schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'saidumuhammed664@gmail.com';
const ADMIN_PASSWORD = 'Mhixter664@gmail.com';
const ADMIN_NAME = 'Super Admin';

export async function seedAdmin() {
  try {
    const [existing] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .limit(1);

    if (existing) {
      const isValidPassword = await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash);
      if (!isValidPassword) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await db.update(adminUsers)
          .set({ passwordHash, isActive: true })
          .where(eq(adminUsers.id, existing.id));
        console.log(`[Seed] Admin password reset for ${ADMIN_EMAIL}`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await db.insert(adminUsers).values({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      isActive: true,
    });

    console.log(`[Seed] Admin user ${ADMIN_EMAIL} created successfully`);
  } catch (error: any) {
    console.log('[Seed] Admin seed skipped:', error.message);
  }
}
