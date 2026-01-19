import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const passwordHash = await bcrypt.hash('Password123!', 10);

  try {
    // 1. Create a regular user
    const userEmail = 'user@arapoint.com';
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (existingUser.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (email, name, password_hash, email_verified, kyc_status) VALUES ($1, $2, $3, $4, $5)',
        [userEmail, 'Regular User', passwordHash, true, 'verified']
      );
      console.log('Regular user created: ' + userEmail);
    } else {
      console.log('Regular user already exists');
    }

    // 2. Create an admin user
    const adminEmail = 'admin@arapoint.com';
    
    // We might need a role first
    let roleId;
    const existingRole = await pool.query("SELECT id FROM admin_roles WHERE name = 'Super Admin'");
    if (existingRole.rows.length === 0) {
      const roleResult = await pool.query(
        "INSERT INTO admin_roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING id",
        ['Super Admin', 'Full access to everything', JSON.stringify(['*'])]
      );
      roleId = roleResult.rows[0].id;
      console.log('Super Admin role created');
    } else {
      roleId = existingRole.rows[0].id;
    }

    const existingAdmin = await pool.query('SELECT id FROM admin_users WHERE email = $1', [adminEmail]);
    if (existingAdmin.rows.length === 0) {
      await pool.query(
        'INSERT INTO admin_users (email, name, password_hash, role_id) VALUES ($1, $2, $3, $4)',
        [adminEmail, 'System Admin', passwordHash, roleId]
      );
      console.log('Admin user created: ' + adminEmail);
    } else {
      console.log('Admin user already exists');
    }

  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await pool.end();
  }
}

seed();
