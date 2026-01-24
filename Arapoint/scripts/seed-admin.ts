import { Pool, neonConfig } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

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
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existing.rows.length > 0) {
      console.log(`[Seed] Admin user ${adminEmail} already exists, skipping`);
      await pool.end();
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await pool.query(
      `INSERT INTO users (email, name, password_hash, email_verified, kyc_status) 
       VALUES ($1, $2, $3, true, 'verified')`,
      [adminEmail, adminName, passwordHash]
    );

    console.log(`[Seed] Admin user ${adminEmail} created successfully!`);
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
