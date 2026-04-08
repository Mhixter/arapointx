import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { config } from './env';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_URL.includes('sslmode=require') || config.DATABASE_URL.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  max: parseInt(process.env.DB_POOL_MAX || '25'),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed', error);
    return false;
  }
}

export default db;
