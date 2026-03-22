import { db } from '../config/database';
import { users, transactions } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { generateReferenceId } from '../utils/helpers';

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
    const currentBalance = await this.getBalance(userId);
    const newBalance = currentBalance.balance + amount;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

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
      newBalance,
      amount,
      reference,
    };
  },

  async deductBalance(userId: string, amount: number, description: string, serviceType: string = 'service_purchase') {
    const currentBalance = await this.getBalance(userId);

    if (currentBalance.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = currentBalance.balance - amount;
    const reference = generateReferenceId();

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

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

    return {
      newBalance,
      amount,
      reference,
      description,
    };
  },

  async refundBalance(userId: string, amount: number, originalReference: string) {
    const currentBalance = await this.getBalance(userId);
    const newBalance = currentBalance.balance + amount;
    const refundReference = `refund_${originalReference}`;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          walletBalance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

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
      newBalance,
      amount,
      reference: refundReference,
    };
  },

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const allTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    return {
      transactions: userTransactions,
      pagination: {
        page,
        limit,
        total: allTransactions.length,
        totalPages: Math.ceil(allTransactions.length / limit),
      },
    };
  },
};
