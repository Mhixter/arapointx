import { db } from '../config/database';
import { users, transactions, adminSettings } from '../db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';
import { fraudService } from './fraudService';

const VTU_SERVICE_TYPES = new Set(['airtime_purchase', 'data_purchase', 'cable', 'electricity', 'airtime_to_cash', 'wallet_fund', 'bank_transfer', 'refund']);

async function getCommissionRate(): Promise<number> {
  try {
    const [row] = await db.select({ settingValue: adminSettings.settingValue })
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'commission_rate'))
      .limit(1);
    const rate = parseFloat(row?.settingValue || '5');
    return isNaN(rate) ? 5 : Math.max(0, Math.min(rate, 100));
  } catch {
    return 5;
  }
}

// ─── Idempotency: check if a payment reference was already processed ──────────
async function isReferenceAlreadyProcessed(reference: string): Promise<boolean> {
  try {
    const [existing] = await db.select({ referenceId: transactions.referenceId })
      .from(transactions)
      .where(eq(transactions.referenceId, reference))
      .limit(1);
    return !!existing;
  } catch {
    return false;
  }
}

export const walletService = {
  async getBalance(userId: string) {
    const [user] = await db.select({ walletBalance: users.walletBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      balance: parseFloat(user.walletBalance || '0'),
      currency: 'NGN',
    };
  },

  async addBalance(userId: string, amount: number, reference: string, paymentMethod: string = 'wallet_fund') {
    // ── Idempotency guard: reject duplicate references ──────────────────────
    const alreadyProcessed = await isReferenceAlreadyProcessed(reference);
    if (alreadyProcessed) {
      logger.warn('Duplicate wallet credit rejected — reference already processed', { userId, reference, amount });
      const [user] = await db.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, userId)).limit(1);
      const currentBalance = parseFloat(user?.walletBalance || '0');
      return { newBalance: currentBalance, amount, reference, duplicate: true };
    }

    let newBalance: number;

    await db.transaction(async (tx) => {
      // Atomic increment — no read-modify-write race condition
      const [updated] = await tx.update(users)
        .set({
          walletBalance: sql`${users.walletBalance} + ${amount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ walletBalance: users.walletBalance });

      if (!updated) throw new Error('User not found');
      newBalance = parseFloat(updated.walletBalance || '0');

      await tx.insert(transactions).values({
        userId,
        transactionType: 'wallet_funding',
        amount: amount.toFixed(2),
        paymentMethod,
        referenceId: reference,
        status: 'successful',
        description: 'Wallet Funding',
      });
    });

    logger.info('Wallet funded', { userId, amount, reference });

    return {
      newBalance: newBalance!,
      amount,
      reference,
    };
  },

  async deductBalance(userId: string, amount: number, description: string, serviceType: string = 'service_purchase') {
    const reference = generateReferenceId();
    let newBalance: number;

    await db.transaction(async (tx) => {
      // Atomic decrement — only deducts if balance is sufficient; fails cleanly otherwise
      const [updated] = await tx.update(users)
        .set({
          walletBalance: sql`${users.walletBalance} - ${amount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ walletBalance: users.walletBalance });

      if (!updated) throw new Error('User not found');

      newBalance = parseFloat(updated.walletBalance || '0');

      // Guard against negative balance (belt-and-suspenders; DB CHECK constraint is the true safety net)
      if (newBalance < 0) {
        throw new Error('Insufficient wallet balance');
      }

      await tx.insert(transactions).values({
        userId,
        transactionType: serviceType,
        amount: (-amount).toFixed(2),
        paymentMethod: 'wallet',
        referenceId: reference,
        status: 'successful',
        description,
      });
    });

    logger.info('Wallet deducted', { userId, amount, description, reference });

    fraudService.runAndAlert(userId, amount, serviceType).catch(() => {});

    // Award commission on service transactions (not VTU pass-throughs or funding)
    if (!VTU_SERVICE_TYPES.has(serviceType)) {
      getCommissionRate().then(async (rate) => {
        if (rate <= 0) return;
        const commissionAmount = parseFloat((amount * rate / 100).toFixed(2));
        if (commissionAmount <= 0) return;
        await db.update(users)
          .set({
            commissionBalance: sql`${users.commissionBalance} + ${commissionAmount.toFixed(2)}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
        logger.info('Commission earned', { userId, commissionAmount, rate, serviceType });
      }).catch(() => {});
    }

    return {
      newBalance: newBalance!,
      amount,
      reference,
      description,
    };
  },

  async getCommissionBalance(userId: string) {
    const [user] = await db.select({ commissionBalance: users.commissionBalance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error('User not found');
    return parseFloat(user.commissionBalance || '0');
  },

  async convertCommissionToWallet(userId: string) {
    const commissionBal = await this.getCommissionBalance(userId);
    if (commissionBal <= 0) throw new Error('No commission balance to convert');

    const reference = generateReferenceId();

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: sql`${users.walletBalance} + ${commissionBal.toFixed(2)}`,
          commissionBalance: '0',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx.insert(transactions).values({
        userId,
        transactionType: 'commission_conversion',
        amount: commissionBal.toFixed(2),
        paymentMethod: 'commission',
        referenceId: reference,
        status: 'successful',
        description: `Commission converted to wallet balance`,
      });
    });

    logger.info('Commission converted', { userId, amount: commissionBal, reference });
    return { converted: commissionBal, reference };
  },

  async refundBalance(userId: string, amount: number, originalReference: string) {
    const refundReference = `refund_${originalReference}`;
    let newBalance: number;

    await db.transaction(async (tx) => {
      // Atomic increment
      const [updated] = await tx.update(users)
        .set({
          walletBalance: sql`${users.walletBalance} + ${amount.toFixed(2)}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ walletBalance: users.walletBalance });

      if (!updated) throw new Error('User not found');
      newBalance = parseFloat(updated.walletBalance || '0');

      await tx.insert(transactions).values({
        userId,
        transactionType: 'refund',
        amount: amount.toFixed(2),
        paymentMethod: 'wallet',
        referenceId: refundReference,
        status: 'successful',
      });
    });

    logger.info('Wallet refunded', { userId, amount, refundReference });

    return {
      newBalance: newBalance!,
      amount,
      reference: refundReference,
    };
  },

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [userTransactions, [{ total }]] = await Promise.all([
      db.select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset),

      // Single COUNT query instead of fetching all rows
      db.select({ total: count() })
        .from(transactions)
        .where(eq(transactions.userId, userId)),
    ]);

    return {
      transactions: userTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
