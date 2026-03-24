import { db } from '../config/database';
import { transactions, fraudAlerts, users } from '../db/schema';
import { eq, and, gte, desc, count, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface FraudCheckResult {
  flagged: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertType: string;
  description: string;
  metadata: Record<string, any>;
}

export const fraudService = {
  async checkTransaction(userId: string, amount: number, type: string): Promise<FraudCheckResult | null> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [hourlyCount] = await db.select({ count: count() })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, oneHourAgo)
        ));

      const [dailyTotal] = await db.select({
        total: sql<string>`COALESCE(SUM(ABS(CAST(${transactions.amount} AS DECIMAL))), 0)`,
        failedCount: sql<number>`COUNT(CASE WHEN ${transactions.status} = 'failed' THEN 1 END)`,
      }).from(transactions).where(and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, oneDayAgo)
      ));

      const txCount = Number(hourlyCount?.count || 0);
      const dailyVolume = parseFloat(dailyTotal?.total || '0');
      const failedCount = Number(dailyTotal?.failedCount || 0);

      if (txCount >= 15) {
        return {
          flagged: true,
          severity: 'high',
          alertType: 'velocity_spike',
          description: `User made ${txCount} transactions in the last hour (velocity spike detected).`,
          metadata: { txCount, window: '1h', userId },
        };
      }

      if (amount >= 500000) {
        return {
          flagged: true,
          severity: 'high',
          alertType: 'large_amount',
          description: `Single transaction of ₦${amount.toLocaleString()} exceeds high-value threshold.`,
          metadata: { amount, type, userId },
        };
      }

      if (dailyVolume >= 2000000) {
        return {
          flagged: true,
          severity: 'critical',
          alertType: 'daily_volume_exceeded',
          description: `Daily transaction volume of ₦${dailyVolume.toLocaleString()} exceeds critical threshold.`,
          metadata: { dailyVolume, userId },
        };
      }

      if (failedCount >= 5) {
        return {
          flagged: true,
          severity: 'medium',
          alertType: 'multiple_failed',
          description: `User has ${failedCount} failed transactions in the last 24 hours.`,
          metadata: { failedCount, userId },
        };
      }

      if (txCount >= 8 && amount >= 50000) {
        return {
          flagged: true,
          severity: 'medium',
          alertType: 'suspicious_pattern',
          description: `High-frequency (${txCount} tx/hr) combined with large amount ₦${amount.toLocaleString()}.`,
          metadata: { txCount, amount, userId },
        };
      }

      return null;
    } catch (error) {
      logger.error('Fraud check error', { error, userId });
      return null;
    }
  },

  async createAlert(userId: string, result: FraudCheckResult): Promise<string | null> {
    try {
      const existing = await db.select({ id: fraudAlerts.id })
        .from(fraudAlerts)
        .where(and(
          eq(fraudAlerts.userId, userId),
          eq(fraudAlerts.alertType, result.alertType),
          eq(fraudAlerts.status, 'open'),
          gte(fraudAlerts.createdAt, new Date(Date.now() - 6 * 60 * 60 * 1000))
        ))
        .limit(1);

      if (existing.length > 0) {
        return existing[0].id;
      }

      const [alert] = await db.insert(fraudAlerts).values({
        userId,
        alertType: result.alertType,
        severity: result.severity,
        description: result.description,
        metadata: result.metadata,
        status: 'open',
      }).returning({ id: fraudAlerts.id });

      logger.warn('Fraud alert created', { alertId: alert.id, userId, type: result.alertType, severity: result.severity });
      return alert.id;
    } catch (error) {
      logger.error('Create fraud alert error', { error, userId });
      return null;
    }
  },

  async runAndAlert(userId: string, amount: number, type: string): Promise<void> {
    const result = await this.checkTransaction(userId, amount, type);
    if (result?.flagged) {
      await this.createAlert(userId, result);
    }
  },

  async getAlerts(page = 1, limit = 20, status?: string) {
    const offset = (page - 1) * limit;
    const conditions = status && status !== 'all' ? [eq(fraudAlerts.status, status)] : [];

    const [alerts, [total]] = await Promise.all([
      db.select({
        id: fraudAlerts.id,
        userId: fraudAlerts.userId,
        userName: users.name,
        userEmail: users.email,
        alertType: fraudAlerts.alertType,
        severity: fraudAlerts.severity,
        description: fraudAlerts.description,
        metadata: fraudAlerts.metadata,
        status: fraudAlerts.status,
        resolvedAt: fraudAlerts.resolvedAt,
        resolvedNote: fraudAlerts.resolvedNote,
        createdAt: fraudAlerts.createdAt,
      }).from(fraudAlerts)
        .innerJoin(users, eq(fraudAlerts.userId, users.id))
        .where(conditions.length > 0 ? conditions[0] : sql`1=1`)
        .orderBy(
          sql`CASE ${fraudAlerts.severity} WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
          desc(fraudAlerts.createdAt)
        )
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(fraudAlerts)
        .where(conditions.length > 0 ? conditions[0] : sql`1=1`),
    ]);

    return { alerts, total: Number(total?.count || 0), page, limit };
  },

  async resolveAlert(alertId: string, resolvedById: string, note: string) {
    await db.update(fraudAlerts).set({
      status: 'resolved',
      resolvedById,
      resolvedAt: new Date(),
      resolvedNote: note,
    }).where(eq(fraudAlerts.id, alertId));
    logger.info('Fraud alert resolved', { alertId, resolvedById });
  },

  async dismissAlert(alertId: string, resolvedById: string) {
    await db.update(fraudAlerts).set({
      status: 'dismissed',
      resolvedById,
      resolvedAt: new Date(),
    }).where(eq(fraudAlerts.id, alertId));
  },
};
