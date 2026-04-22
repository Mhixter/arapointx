import { db } from '../config/database';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export type JobTableName =
  | 'identity_service_requests'
  | 'education_service_requests'
  | 'jamb_service_requests'
  | 'a2c_requests'
  | 'cac_registration_requests';

export interface ClaimResult {
  ok: boolean;
  reason?: 'not_found' | 'already_claimed' | 'wrong_status';
  row?: any;
}

export async function claimJob(table: JobTableName, jobId: string, agentId: string): Promise<ClaimResult> {
  try {
    const q = sql`
      UPDATE ${sql.raw(table)}
      SET assigned_agent_id = ${agentId}, assigned_at = NOW(), status = 'pickup', updated_at = NOW()
      WHERE id = ${jobId} AND status = 'pending' AND assigned_agent_id IS NULL
      RETURNING *
    `;
    const result: any = await db.execute(q);
    const rows = result.rows || result;
    if (rows.length === 0) {
      const probe: any = await db.execute(sql`SELECT id, status, assigned_agent_id FROM ${sql.raw(table)} WHERE id = ${jobId} LIMIT 1`);
      const probeRows = probe.rows || probe;
      if (probeRows.length === 0) return { ok: false, reason: 'not_found' };
      const r = probeRows[0];
      if (r.assigned_agent_id) return { ok: false, reason: 'already_claimed' };
      return { ok: false, reason: 'wrong_status' };
    }
    return { ok: true, row: rows[0] };
  } catch (err: any) {
    logger.error('claimJob failed', { table, jobId, agentId, error: err.message });
    return { ok: false, reason: 'not_found' };
  }
}

// Atomic claim that accepts any unassigned in-progress status — used for legacy
// orders stuck in non-pending states (e.g. A2C airtime_sent, airtime_received).
// Always preserves the original status so the agent picks up the order exactly
// where the customer left it.
export async function claimJobAny(
  table: JobTableName,
  jobId: string,
  agentId: string,
  acceptableStatuses: string[],
): Promise<ClaimResult> {
  try {
    const statusList = sql.raw(acceptableStatuses.map((s) => `'${s.replace(/'/g, "''")}'`).join(','));
    const q = sql`
      UPDATE ${sql.raw(table)}
      SET assigned_agent_id = ${agentId}, assigned_at = NOW(), updated_at = NOW()
      WHERE id = ${jobId}
        AND assigned_agent_id IS NULL
        AND status IN (${statusList})
      RETURNING *
    `;
    const result: any = await db.execute(q);
    const rows = result.rows || result;
    if (rows.length === 0) {
      const probe: any = await db.execute(sql`SELECT id, status, assigned_agent_id FROM ${sql.raw(table)} WHERE id = ${jobId} LIMIT 1`);
      const probeRows = probe.rows || probe;
      if (probeRows.length === 0) return { ok: false, reason: 'not_found' };
      const r = probeRows[0];
      if (r.assigned_agent_id) return { ok: false, reason: 'already_claimed' };
      return { ok: false, reason: 'wrong_status' };
    }
    return { ok: true, row: rows[0] };
  } catch (err: any) {
    logger.error('claimJobAny failed', { table, jobId, agentId, error: err.message });
    return { ok: false, reason: 'not_found' };
  }
}

export async function releaseJob(table: JobTableName, jobId: string, agentId: string): Promise<ClaimResult> {
  try {
    const q = sql`
      UPDATE ${sql.raw(table)}
      SET assigned_agent_id = NULL, assigned_at = NULL, status = 'pending', updated_at = NOW()
      WHERE id = ${jobId} AND assigned_agent_id = ${agentId} AND status = 'pickup'
      RETURNING *
    `;
    const result: any = await db.execute(q);
    const rows = result.rows || result;
    if (rows.length === 0) return { ok: false, reason: 'wrong_status' };
    return { ok: true, row: rows[0] };
  } catch (err: any) {
    logger.error('releaseJob failed', { table, jobId, agentId, error: err.message });
    return { ok: false };
  }
}

export async function markProcessing(table: JobTableName, jobId: string, agentId: string): Promise<ClaimResult> {
  try {
    const q = sql`
      UPDATE ${sql.raw(table)}
      SET status = 'processing', updated_at = NOW()
      WHERE id = ${jobId} AND assigned_agent_id = ${agentId} AND status IN ('pickup','processing')
      RETURNING *
    `;
    const result: any = await db.execute(q);
    const rows = result.rows || result;
    if (rows.length === 0) return { ok: false, reason: 'wrong_status' };
    return { ok: true, row: rows[0] };
  } catch (err: any) {
    logger.error('markProcessing failed', { table, jobId, agentId, error: err.message });
    return { ok: false };
  }
}

const TABLES: JobTableName[] = [
  'identity_service_requests',
  'education_service_requests',
  'jamb_service_requests',
  'a2c_requests',
  'cac_registration_requests',
];

export async function autoReleaseStalePickups(thresholdMinutes = 30): Promise<{ table: string; released: number }[]> {
  const out: { table: string; released: number }[] = [];
  for (const t of TABLES) {
    try {
      const q = sql`
        UPDATE ${sql.raw(t)}
        SET assigned_agent_id = NULL, assigned_at = NULL, status = 'pending', updated_at = NOW()
        WHERE status = 'pickup'
          AND assigned_at IS NOT NULL
          AND assigned_at < NOW() - INTERVAL '${sql.raw(String(thresholdMinutes))} minutes'
        RETURNING id
      `;
      const result: any = await db.execute(q);
      const rows = result.rows || result;
      out.push({ table: t, released: rows.length });
      if (rows.length > 0) logger.info(`Auto-released stale pickups`, { table: t, count: rows.length, ids: rows.map((r: any) => r.id) });
    } catch (err: any) {
      logger.error('autoReleaseStalePickups error', { table: t, error: err.message });
    }
  }
  return out;
}

let sweeperHandle: NodeJS.Timeout | null = null;

export function startJobAutoReleaseSweeper(intervalMinutes = 2, thresholdMinutes = 30) {
  if (sweeperHandle) return;
  logger.info(`Job auto-release sweeper started (every ${intervalMinutes}m, threshold ${thresholdMinutes}m)`);
  const run = () => {
    autoReleaseStalePickups(thresholdMinutes).catch(err => logger.error('Sweeper run failed', { error: err.message }));
  };
  sweeperHandle = setInterval(run, intervalMinutes * 60 * 1000);
  setTimeout(run, 30 * 1000);
}

export function stopJobAutoReleaseSweeper() {
  if (sweeperHandle) {
    clearInterval(sweeperHandle);
    sweeperHandle = null;
  }
}
