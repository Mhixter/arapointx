import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { adminUsers, adminRoles } from './schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'saidumuhammed664@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Mhixter664@gmail.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin';

async function getOrCreateSuperAdminRole(): Promise<string> {
  const [existing] = await db.select({ id: adminRoles.id })
    .from(adminRoles)
    .where(eq(adminRoles.name, 'super_admin'))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db.insert(adminRoles).values({
    name: 'super_admin',
    description: 'Full system access — Arapoint Super Administrator',
    permissions: JSON.parse('["*"]'),
    isActive: true,
  }).returning({ id: adminRoles.id });

  console.log('[Seed] super_admin role created');
  return created.id;
}

export async function seedAdmin() {
  try {
    const superAdminRoleId = await getOrCreateSuperAdminRole();

    const [existing] = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .limit(1);

    if (existing) {
      const updates: Record<string, any> = { isActive: true };

      const isValidPassword = await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash);
      if (!isValidPassword) {
        updates.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        console.log(`[Seed] Admin password reset for ${ADMIN_EMAIL}`);
      }

      if (existing.roleId !== superAdminRoleId) {
        updates.roleId = superAdminRoleId;
        console.log(`[Seed] Super admin role assigned to ${ADMIN_EMAIL}`);
      }

      if (Object.keys(updates).length > 1 || updates.roleId) {
        await db.update(adminUsers)
          .set(updates)
          .where(eq(adminUsers.id, existing.id));
      }
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await db.insert(adminUsers).values({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      roleId: superAdminRoleId,
      isActive: true,
    });

    console.log(`[Seed] Super admin ${ADMIN_EMAIL} created successfully`);
  } catch (error: any) {
    console.log('[Seed] Admin seed skipped:', error.message);
  }
}
