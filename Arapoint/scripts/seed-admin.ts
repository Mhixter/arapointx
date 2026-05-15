import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';

  if (!adminEmail || !adminPassword) {
    console.log('[Seed] No ADMIN_EMAIL or ADMIN_PASSWORD set, skipping admin creation');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('[Seed] DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'saidumuhammed664@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Mhixter664@gmail.com';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    const existingAdmin = await pool.query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length > 0) {
      console.log(`[Seed] Admin user ${adminEmail} already exists in admin_users, updating password`);
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query('UPDATE admin_users SET password_hash = $1 WHERE email = $2', [passwordHash, adminEmail]);
      await pool.end();
      process.exit(0);
    }

    let roleId;
    const existingRole = await pool.query("SELECT id FROM admin_roles WHERE name = 'Super Admin'");
    if (existingRole.rows.length === 0) {
      const roleResult = await pool.query(
        "INSERT INTO admin_roles (name, description, permissions) VALUES ('Super Admin', 'Full system access', '[\"all\"]') RETURNING id"
      );
      roleId = roleResult.rows[0].id;
    } else {
      roleId = existingRole.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await pool.query(
      `INSERT INTO admin_users (email, name, password_hash, role_id, is_active) 
       VALUES ($1, $2, $3, $4, true)`,
      [adminEmail, adminName, passwordHash, roleId]
    );

    console.log(`[Seed] Admin user ${adminEmail} created successfully in admin_users table!`);
    
    await pool.query('DELETE FROM users WHERE email = $1', [adminEmail]);
    console.log(`[Seed] Removed ${adminEmail} from users table to ensure admin-only access.`);

  } catch (error: any) {
    if (error.code === '42P01') {
      console.log('[Seed] Users table does not exist yet, will retry after migrations');
    } else {
      console.error('[Seed] Error creating admin:', error.message);
    }
  } finally {
    await pool.end();
  }
}

seedAdmin();
