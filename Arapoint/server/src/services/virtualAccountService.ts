import { db } from '../config/database';
import { virtualAccounts, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { palmpayVirtualAccountService } from './palmpayVirtualAccountService';
import { payvesselService } from './payvesselService';
import { paymentpointService } from './paymentpointService';

interface VirtualAccountResult {
  success: boolean;
  account?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  message: string;
}

function normalizeNigerianPhone(phone: string | null | undefined): string {
  if (!phone) return '08000000000';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return '0' + digits.slice(3);
  if (digits.startsWith('0') && digits.length === 11) return digits;
  if (digits.length === 10) return '0' + digits;
  return digits.length >= 11 ? digits.slice(-11) : '08000000000';
}

export const virtualAccountService = {
  isConfigured(): boolean {
    return paymentpointService.isConfigured() || palmpayVirtualAccountService.isConfigured() || payvesselService.isConfigured();
  },

  async generateVirtualAccountForUser(userId: string, nin?: string, bvn?: string): Promise<VirtualAccountResult> {
    const existingAccount = await db.select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.userId, userId))
      .limit(1);

    const paymentpointConfigured = paymentpointService.isConfigured();
    const palmpayConfigured = palmpayVirtualAccountService.isConfigured();
    const payvesselConfigured = payvesselService.isConfigured();

    if (existingAccount.length > 0 && existingAccount[0].accountNumber) {
      const isOldGateway = ['payvessel', 'palmpay'].includes(existingAccount[0].providerSlug || '');
      if (!isOldGateway || !paymentpointConfigured) {
        return {
          success: true,
          account: {
            bankName: existingAccount[0].bankName || 'PalmPay',
            accountNumber: existingAccount[0].accountNumber,
            accountName: existingAccount[0].accountName || 'Arapoint Account',
          },
          message: 'Virtual account retrieved successfully',
        };
      }
    }

    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const user = userResult[0];
    const userNin = nin || user.nin;
    const userBvn = bvn || user.bvn;

    if (!paymentpointConfigured && !userNin && !userBvn) {
      return {
        success: false,
        message: 'NIN or BVN verification is required to generate a virtual account. Please complete KYC verification first.',
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
      };
    }

    let lastError: string | undefined;

    if (paymentpointConfigured) {
      const result = await paymentpointService.createVirtualAccount({
        email: user.email,
        name: user.name,
        phoneNumber: normalizeNigerianPhone(user.phone),
        bvn: userBvn || undefined,
        nin: userNin || undefined,
        accountReference: `arapoint_${userId}`,
      });

      if (result.success && result.account) {
        await db.insert(virtualAccounts).values({
          userId: userId,
          bankName: result.account.bankName,
          bankCode: 'paymentpoint',
          accountNumber: result.account.accountNumber,
          accountName: result.account.accountName,
          dedicatedAccountId: result.account.trackingReference,
          providerSlug: 'paymentpoint',
          isActive: true,
        }).onConflictDoUpdate({
          target: virtualAccounts.userId,
          set: {
            bankName: result.account.bankName,
            bankCode: 'paymentpoint',
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
            dedicatedAccountId: result.account.trackingReference,
            providerSlug: 'paymentpoint',
            isActive: true,
            updatedAt: new Date(),
          },
        });

        logger.info('Virtual account created via PaymentPoint', {
          userId,
          accountNumber: result.account.accountNumber,
        });

        return {
          success: true,
          account: {
            bankName: result.account.bankName,
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
          },
          message: 'Virtual account created successfully via PaymentPoint',
        };
      }

      lastError = result.error || 'PaymentPoint account creation failed';
      logger.warn('PaymentPoint VA creation failed, trying PalmPay fallback', {
        userId,
        error: result.error,
      });
    }

    if (palmpayConfigured) {
      const identityType = userNin ? 'personal_nin' : 'personal';
      const licenseNumber = userNin || userBvn || '';

      const result = await palmpayVirtualAccountService.createVirtualAccount({
        virtualAccountName: `${user.name} - Arapoint`,
        customerName: user.name,
        identityType,
        licenseNumber,
        email: user.email,
        accountReference: `arapoint_${userId}`,
      });

      if (result.success && result.account) {
        await db.insert(virtualAccounts).values({
          userId: userId,
          bankName: result.account.bankName,
          bankCode: 'palmpay',
          accountNumber: result.account.accountNumber,
          accountName: result.account.accountName,
          dedicatedAccountId: result.account.trackingReference,
          providerSlug: 'palmpay',
          isActive: true,
        }).onConflictDoUpdate({
          target: virtualAccounts.userId,
          set: {
            bankName: result.account.bankName,
            bankCode: 'palmpay',
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
            dedicatedAccountId: result.account.trackingReference,
            providerSlug: 'palmpay',
            isActive: true,
            updatedAt: new Date(),
          },
        });

        logger.info('Virtual account created via PalmPay', {
          userId,
          accountNumber: result.account.accountNumber,
        });

        return {
          success: true,
          account: {
            bankName: result.account.bankName,
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
          },
          message: 'Virtual account created successfully via PalmPay',
        };
      }

      logger.warn('PalmPay VA creation failed, trying PayVessel fallback', {
        userId,
        error: result.error,
      });
    }

    if (payvesselConfigured) {
      const result = await payvesselService.createVirtualAccount({
        email: user.email,
        name: user.name,
        phoneNumber: normalizeNigerianPhone(user.phone),
        bvn: userBvn || undefined,
        nin: userNin || undefined,
      });

      if (result.success && result.account) {
        await db.insert(virtualAccounts).values({
          userId: userId,
          bankName: result.account.bankName,
          bankCode: '120001',
          accountNumber: result.account.accountNumber,
          accountName: result.account.accountName,
          dedicatedAccountId: result.account.trackingReference,
          providerSlug: 'payvessel',
          isActive: true,
        }).onConflictDoUpdate({
          target: virtualAccounts.userId,
          set: {
            bankName: result.account.bankName,
            bankCode: '120001',
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
            dedicatedAccountId: result.account.trackingReference,
            providerSlug: 'payvessel',
            isActive: true,
            updatedAt: new Date(),
          },
        });

        logger.info('Virtual account created via PayVessel (fallback)', {
          userId,
          accountNumber: result.account.accountNumber,
        });

        return {
          success: true,
          account: {
            bankName: result.account.bankName,
            accountNumber: result.account.accountNumber,
            accountName: result.account.accountName,
          },
          message: 'Virtual account created successfully',
        };
      }

      return {
        success: false,
        message: result.error || 'Failed to generate virtual account. Please try again later.',
      };
    }

    return {
      success: false,
      message: lastError || 'No payment gateway available for virtual account creation. Please contact support.',
    };
  },

  async getVirtualAccount(userId: string): Promise<{
    configured: boolean;
    shouldGenerate?: boolean;
    requiresKyc?: boolean;
    account?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    message: string;
  }> {
    const existingAccount = await db.select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.userId, userId))
      .limit(1);

    if (existingAccount.length > 0 && existingAccount[0].accountNumber) {
      return {
        configured: true,
        account: {
          bankName: existingAccount[0].bankName || 'PalmPay',
          accountNumber: existingAccount[0].accountNumber,
          accountName: existingAccount[0].accountName || 'Arapoint Account',
          providerSlug: existingAccount[0].providerSlug || '',
        },
        message: 'Virtual account found',
      };
    }

    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Payment gateway not configured',
      };
    }

    const userResult = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length > 0) {
      const user = userResult[0];
      if (!user.nin && !user.bvn) {
        return {
          configured: true,
          requiresKyc: true,
          message: 'Please complete NIN or BVN verification to generate a virtual account. Submit your NIN to proceed.',
        };
      }
    }

    return {
      configured: true,
      shouldGenerate: true,
      message: 'Virtual account generation pending. Please contact support if you have verified your identity.',
    };
  },

  async findUserByAccountNumber(accountNumber: string): Promise<string | null> {
    const account = await db.select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.accountNumber, accountNumber))
      .limit(1);

    if (account.length > 0) {
      return account[0].userId;
    }

    return null;
  },
};
