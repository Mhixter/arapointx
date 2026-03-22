import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import { users, transactions, identityVerifications, bvnServices, educationServices, airtimeServices, dataServices, electricityServices, cableServices } from '../../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
      });
    }

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        walletBalance: users.walletBalance,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found',
      });
    }

    const [transactionCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const [ninCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId));

    const [bvnCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bvnServices)
      .where(eq(bvnServices.userId, userId));

    const [educationCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(educationServices)
      .where(eq(educationServices.userId, userId));

    const [airtimeCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(airtimeServices)
      .where(eq(airtimeServices.userId, userId));

    const [airtimeSuccessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(airtimeServices)
      .where(and(eq(airtimeServices.userId, userId), eq(airtimeServices.status, 'completed')));

    const [dataCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dataServices)
      .where(eq(dataServices.userId, userId));

    const [dataSuccessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dataServices)
      .where(and(eq(dataServices.userId, userId), eq(dataServices.status, 'completed')));

    const [electricityCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(electricityServices)
      .where(eq(electricityServices.userId, userId));

    const [electricitySuccessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(electricityServices)
      .where(and(eq(electricityServices.userId, userId), eq(electricityServices.status, 'completed')));

    const [cableCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cableServices)
      .where(eq(cableServices.userId, userId));

    const [cableSuccessCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cableServices)
      .where(and(eq(cableServices.userId, userId), eq(cableServices.status, 'completed')));

    const totalVerifications = 
      Number(ninCountResult?.count || 0) + 
      Number(bvnCountResult?.count || 0) + 
      Number(educationCountResult?.count || 0);

    res.json({
      status: 'success',
      code: 200,
      data: {
        user: {
          name: user[0].name,
          email: user[0].email,
          walletBalance: parseFloat(user[0].walletBalance as string || '0'),
        },
        stats: {
          totalTransactions: Number(transactionCountResult?.count || 0),
          totalVerifications,
          ninVerifications: Number(ninCountResult?.count || 0),
          bvnVerifications: Number(bvnCountResult?.count || 0),
          educationVerifications: Number(educationCountResult?.count || 0),
          airtimeTotal: Number(airtimeCountResult?.count || 0),
          airtimeSuccess: Number(airtimeSuccessCountResult?.count || 0),
          dataTotal: Number(dataCountResult?.count || 0),
          dataSuccess: Number(dataSuccessCountResult?.count || 0),
          electricityTotal: Number(electricityCountResult?.count || 0),
          electricitySuccess: Number(electricitySuccessCountResult?.count || 0),
          cableTotal: Number(cableCountResult?.count || 0),
          cableSuccess: Number(cableSuccessCountResult?.count || 0),
        },
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to fetch dashboard stats',
    });
  }
});

router.get('/transactions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ status: 'error', code: 401, message: 'Unauthorized' });
    }

    const CREDIT_TYPES = ['credit', 'fund', 'wallet_funding', 'admin_fund'];
    const isCredit = (type: string) => CREDIT_TYPES.some(k => type?.toLowerCase().includes(k));

    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    const TX_LABELS: Record<string, string> = {
      fund_wallet: 'Wallet Funding',
      wallet_funding: 'Wallet Funding',
      admin_fund: 'Admin Funding',
      admin_debit: 'Admin Debit',
      refund: 'Refund',
      nin_verification: 'NIN Verification',
      vnin_verification: 'Virtual NIN Verification',
      nin_phone_verification: 'NIN Phone Verification',
      nin_validation: 'NIN Validation',
      nin_tracking: 'NIN With Tracking ID',
      ipe_clearance: 'IPE Clearance',
      birth_attestation: 'Birth Attestation',
      bvn_verification: 'BVN Verification',
      bvn_digital_card: 'BVN Digital Card',
      bvn_modification: 'BVN Modification',
      airtime_purchase: 'Airtime Purchase',
      data_purchase: 'Data Purchase',
      electricity_purchase: 'Electricity Payment',
      cable_purchase: 'Cable TV Subscription',
      cac_registration: 'CAC Registration',
      education_service: 'Education Service',
      jamb_service: 'JAMB Service',
      jamb_olevel_upload: "JAMB O'Level Upload",
      jamb_admission_letter: 'JAMB Admission Letter',
      jamb_original_result: 'JAMB Original Result',
      jamb_reprinting_caps: 'JAMB Reprinting & Caps',
      jamb_score_lookup: 'JAMB Score Lookup',
      waec_result_lookup: 'WAEC Result Lookup',
      neco_result_lookup: 'NECO Result Lookup',
      nabteb_result_lookup: 'NABTEB Result Lookup',
      nbais_result_lookup: 'NBAIS Result Lookup',
      pin_purchase: 'Exam PIN Purchase',
      service_purchase: 'Service Purchase',
    };

    res.json({
      status: 'success',
      code: 200,
      data: {
        total: Number(totalCount || 0),
        page,
        limit,
        transactions: recentTransactions.map((tx) => ({
          id: tx.id,
          type: isCredit(tx.transactionType || '') ? 'credit' : 'debit',
          description: (tx as any).description || TX_LABELS[tx.transactionType || ''] || tx.transactionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Transaction',
          amount: parseFloat(tx.amount as string || '0'),
          status: tx.status,
          date: tx.createdAt,
          reference: tx.referenceId,
          transactionType: tx.transactionType,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard transactions error:', error);
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to fetch transactions' });
  }
});

router.get('/verifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
      });
    }

    const ninVerifications = await db
      .select({
        id: identityVerifications.id,
        type: sql<string>`'NIN'`,
        reference: identityVerifications.nin,
        status: identityVerifications.status,
        details: identityVerifications.verificationType,
        date: identityVerifications.createdAt,
      })
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId))
      .orderBy(desc(identityVerifications.createdAt))
      .limit(limit);

    const bvnVerificationsData = await db
      .select({
        id: bvnServices.id,
        type: sql<string>`'BVN'`,
        reference: bvnServices.bvn,
        status: bvnServices.status,
        details: bvnServices.serviceType,
        date: bvnServices.createdAt,
      })
      .from(bvnServices)
      .where(eq(bvnServices.userId, userId))
      .orderBy(desc(bvnServices.createdAt))
      .limit(limit);

    const eduVerifications = await db
      .select({
        id: educationServices.id,
        type: educationServices.serviceType,
        reference: educationServices.registrationNumber,
        status: educationServices.status,
        details: sql<string>`CONCAT('Year ', ${educationServices.examYear})`,
        date: educationServices.createdAt,
      })
      .from(educationServices)
      .where(eq(educationServices.userId, userId))
      .orderBy(desc(educationServices.createdAt))
      .limit(limit);

    interface VerificationItem {
      id: string;
      type: string | null;
      reference: string | null;
      status: string | null;
      details: string | null;
      date: Date | null;
    }

    const allVerifications: VerificationItem[] = [
      ...ninVerifications.map((v) => ({ ...v, type: 'NIN' as string })),
      ...bvnVerificationsData.map((v) => ({ ...v, type: 'BVN' as string })),
      ...eduVerifications.map((v) => ({ ...v, type: v.type?.toUpperCase() || 'EDUCATION' })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    }).slice(0, limit);

    res.json({
      status: 'success',
      code: 200,
      data: {
        verifications: allVerifications.map((v) => ({
          id: v.id,
          type: v.type,
          reference: v.reference || 'N/A',
          status: v.status === 'completed' ? 'verified' : v.status || 'pending',
          details: v.details || '',
          date: v.date,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard verifications error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to fetch verifications',
    });
  }
});

router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        code: 401,
        message: 'Unauthorized',
      });
    }

    // Fetch recent transactions
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    // Fetch recent identity verifications
    const recentIdentity = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId))
      .orderBy(desc(identityVerifications.createdAt))
      .limit(limit);

    // Fetch recent education services
    const recentEducation = await db
      .select()
      .from(educationServices)
      .where(eq(educationServices.userId, userId))
      .orderBy(desc(educationServices.createdAt))
      .limit(limit);

    // Fetch recent BVN services
    const recentBvn = await db
      .select()
      .from(bvnServices)
      .where(eq(bvnServices.userId, userId))
      .orderBy(desc(bvnServices.createdAt))
      .limit(limit);

    interface Notification {
      id: string;
      type: 'success' | 'warning' | 'info' | 'error';
      title: string;
      message: string;
      timestamp: Date | null;
      category: string;
    }

    const notifications: Notification[] = [];

    // Process transactions into notifications
    recentTransactions.forEach((tx) => {
      const isCredit = tx.transactionType?.includes('credit') || tx.transactionType?.includes('fund');
      const amount = parseFloat(tx.amount as string || '0');
      const typeLabel = tx.transactionType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Transaction';
      
      notifications.push({
        id: `tx-${tx.id}`,
        type: tx.status === 'completed' || tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'error' : 'info',
        title: isCredit ? 'Wallet Funded' : typeLabel,
        message: isCredit 
          ? `Your wallet was credited with ₦${amount.toLocaleString()}`
          : `${typeLabel} of ₦${amount.toLocaleString()} ${tx.status === 'completed' ? 'completed' : tx.status === 'failed' ? 'failed' : 'is processing'}`,
        timestamp: tx.createdAt,
        category: 'transaction',
      });
    });

    // Process identity verifications into notifications
    recentIdentity.forEach((v) => {
      notifications.push({
        id: `id-${v.id}`,
        type: v.status === 'completed' || v.status === 'verified' ? 'success' : v.status === 'failed' ? 'error' : 'info',
        title: `${v.verificationType?.toUpperCase() || 'Identity'} Verification`,
        message: v.status === 'completed' || v.status === 'verified' 
          ? `Your ${v.verificationType?.toUpperCase() || 'identity'} verification was successful`
          : v.status === 'failed' 
            ? `Your ${v.verificationType?.toUpperCase() || 'identity'} verification failed`
            : `Your ${v.verificationType?.toUpperCase() || 'identity'} verification is processing`,
        timestamp: v.createdAt,
        category: 'identity',
      });
    });

    // Process education services into notifications
    recentEducation.forEach((e) => {
      notifications.push({
        id: `edu-${e.id}`,
        type: e.status === 'completed' || e.status === 'verified' ? 'success' : e.status === 'failed' ? 'error' : 'info',
        title: `${e.serviceType?.toUpperCase() || 'Education'} Result Check`,
        message: e.status === 'completed' || e.status === 'verified'
          ? `Your ${e.serviceType?.toUpperCase() || 'education'} result for ${e.registrationNumber} is ready`
          : e.status === 'failed'
            ? `Failed to retrieve ${e.serviceType?.toUpperCase() || 'education'} result`
            : `Processing ${e.serviceType?.toUpperCase() || 'education'} result request`,
        timestamp: e.createdAt,
        category: 'education',
      });
    });

    // Process BVN services into notifications
    recentBvn.forEach((b) => {
      const serviceLabel = b.serviceType === 'retrieval' ? 'BVN Retrieval' : 
                          b.serviceType === 'card' ? 'BVN Card' : 
                          b.serviceType === 'modification' ? 'BVN Modification' : 'BVN Service';
      notifications.push({
        id: `bvn-${b.id}`,
        type: b.status === 'completed' || b.status === 'verified' ? 'success' : b.status === 'failed' ? 'error' : 'info',
        title: serviceLabel,
        message: b.status === 'completed' || b.status === 'verified'
          ? `Your ${serviceLabel.toLowerCase()} request has been completed`
          : b.status === 'failed'
            ? `Your ${serviceLabel.toLowerCase()} request failed`
            : `Your ${serviceLabel.toLowerCase()} request is being processed`,
        timestamp: b.createdAt,
        category: 'bvn',
      });
    });

    // Sort all notifications by timestamp (newest first)
    notifications.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });

    res.json({
      status: 'success',
      code: 200,
      data: {
        notifications: notifications.slice(0, limit),
      },
    });
  } catch (error) {
    console.error('Dashboard notifications error:', error);
    res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to fetch notifications',
    });
  }
});

export default router;
