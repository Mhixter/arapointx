import OpenAI from 'openai';
import { db } from '../config/database';
import { rpaRecoverySuggestions, adminSettings, rpaJobs, adminUsers } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { sendEmail } from './emailService';
import crypto from 'crypto';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

const PROVIDER_CONTEXT: Record<string, string> = {
  waec: `WAEC (West African Examinations Council) result checker portal at waecdirect.org. Common selectors: #ExamNo for exam number input, #ExamType for exam type dropdown, select for year, button or input[type=submit] for submit. The portal uses server-rendered HTML tables to display results.`,
  neco: `NECO (National Examinations Council) result checker at result.neco.gov.ng. Common selectors: input for exam number, select for type and year, button[type=submit] for submission. Results displayed in HTML table.`,
  nabteb: `NABTEB (National Business and Technical Examinations Board) result portal. Common selectors: form inputs for candidate number and year, submit button. Results in table format.`,
  nbais: `NBAIS (National Board for Arabic and Islamic Studies) result checker portal. Similar form-based structure with candidate number and year inputs.`,
  jamb: `JAMB (Joint Admissions and Matriculation Board) portal at results.jamb.org.ng. Common selectors: input[name=reg_no] for registration number, button for submit. Results displayed in dedicated result page.`,
};

export interface AISuggestion {
  selectors: Record<string, string>;
  navigationSteps: string[];
  analysis: string;
  confidence: number;
  alternativeSelectors?: Record<string, string[]>;
}

export const rpaRecoveryService = {
  async analyzeJobFailure(
    jobId: string,
    provider: string,
    serviceType: string,
    errorMessage: string,
    failureStep?: string,
    pageHtmlSnippet?: string
  ): Promise<string> {
    const existingPending = await db.select({ id: rpaRecoverySuggestions.id })
      .from(rpaRecoverySuggestions)
      .where(and(
        eq(rpaRecoverySuggestions.failedJobId, jobId),
        eq(rpaRecoverySuggestions.status, 'pending')
      ))
      .limit(1);

    if (existingPending.length > 0) {
      logger.info('Recovery suggestion already exists for job', { jobId });
      return existingPending[0].id;
    }

    const providerCtx = PROVIDER_CONTEXT[provider] || `${provider.toUpperCase()} portal automation via Puppeteer.`;
    const htmlContext = pageHtmlSnippet
      ? `\n\nCaptured page HTML snippet (first 3000 chars):\n${pageHtmlSnippet.slice(0, 3000)}`
      : '';

    const prompt = `You are an expert RPA (Robotic Process Automation) engineer specializing in Nigerian educational portals. A Puppeteer-based automation job has failed and you must diagnose the issue and suggest corrective CSS selectors and navigation steps.

PORTAL CONTEXT:
${providerCtx}

FAILURE DETAILS:
- Provider: ${provider.toUpperCase()}
- Service: ${serviceType}
- Failed Step: ${failureStep || 'unknown'}
- Error Message: ${errorMessage}${htmlContext}

Analyze this failure carefully. The portal's HTML structure may have changed. Suggest:
1. New CSS selectors that are more resilient to layout changes (use attribute-based selectors like [name=...], [placeholder=...], [type=...] over fragile IDs/classes when possible)
2. Step-by-step navigation corrections
3. Alternative backup selectors for each critical element

Respond ONLY with a valid JSON object matching this exact structure:
{
  "selectors": {
    "examNumberInput": "selector_here",
    "yearSelect": "selector_here",
    "typeSelect": "selector_here",
    "submitButton": "selector_here",
    "resultTable": "selector_here"
  },
  "alternativeSelectors": {
    "examNumberInput": ["alt1", "alt2"],
    "submitButton": ["alt1", "alt2"]
  },
  "navigationSteps": [
    "Step 1 description",
    "Step 2 description"
  ],
  "analysis": "Brief explanation of what likely changed and why",
  "confidence": 0.75
}`;

    let aiSuggestions: AISuggestion | null = null;
    let aiAnalysis = '';

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      aiSuggestions = JSON.parse(content) as AISuggestion;
      aiAnalysis = aiSuggestions.analysis || 'AI analysis complete.';
      logger.info('AI recovery analysis complete', { provider, jobId, confidence: aiSuggestions.confidence });
    } catch (err: any) {
      logger.error('AI analysis failed', { error: err.message, jobId });
      aiAnalysis = `AI analysis unavailable: ${err.message}. Manual review required.`;
    }

    const [inserted] = await db.insert(rpaRecoverySuggestions).values({
      provider,
      serviceType,
      failedJobId: jobId,
      failureError: errorMessage,
      failureStep: failureStep || null,
      pageHtmlSnippet: pageHtmlSnippet ? pageHtmlSnippet.slice(0, 5000) : null,
      aiAnalysis,
      aiSuggestions: aiSuggestions as any,
      status: 'pending',
    }).returning({ id: rpaRecoverySuggestions.id });

    logger.info('Recovery suggestion created', { suggestionId: inserted.id, provider, jobId });
    return inserted.id;
  },

  async sendApprovalOTP(suggestionId: string, adminId: string): Promise<boolean> {
    const admin = await db.select({ email: adminUsers.email, name: adminUsers.name })
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);

    if (!admin.length) throw new Error('Admin not found');

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(rpaRecoverySuggestions)
      .set({ otpToken: otp, otpExpiresAt: expiresAt, status: 'otp_pending', updatedAt: new Date() })
      .where(eq(rpaRecoverySuggestions.id, suggestionId));

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Arapoint RPA Recovery Approval</h2>
        <p style="color: #555;">An AI-generated RPA selector fix is awaiting your approval. Use this OTP to confirm deployment:</p>
        <h1 style="color: #2563eb; letter-spacing: 6px; font-size: 36px; background: #f0f4ff; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #2563eb;">${otp}</h1>
        <p style="color: #666;">This code expires in <strong>10 minutes</strong>. The fix will go live once you enter this code.</p>
        <p style="color: #999; font-size: 12px;">If you did not initiate this approval, please reject the suggestion from the admin dashboard immediately.</p>
      </div>
    `;

    try {
      await sendEmail(admin[0].email, 'Arapoint RPA Recovery — OTP Approval Required', html, `Your RPA recovery approval OTP: ${otp}. Expires in 10 minutes.`);
      logger.info('Recovery OTP sent to admin', { adminId, email: admin[0].email });
      return true;
    } catch (err: any) {
      logger.error('Failed to send recovery OTP email', { error: err.message });
      return true;
    }
  },

  async confirmAndDeploy(suggestionId: string, otp: string, adminId: string, adminNotes?: string): Promise<void> {
    const [suggestion] = await db.select()
      .from(rpaRecoverySuggestions)
      .where(eq(rpaRecoverySuggestions.id, suggestionId))
      .limit(1);

    if (!suggestion) throw new Error('Suggestion not found');
    if (suggestion.status !== 'otp_pending') throw new Error('Suggestion is not awaiting OTP confirmation');
    if (suggestion.otpToken !== otp) throw new Error('Invalid OTP');
    if (suggestion.otpExpiresAt && new Date() > suggestion.otpExpiresAt) throw new Error('OTP has expired');

    const settingKey = `rpa_selectors_${suggestion.provider}`;
    const settingValue = JSON.stringify(suggestion.aiSuggestions);

    await db.insert(adminSettings).values({
      settingKey,
      settingValue,
      description: `AI-suggested RPA selectors for ${suggestion.provider.toUpperCase()} portal. Deployed ${new Date().toISOString()}. Job: ${suggestion.failedJobId}`,
    }).onConflictDoUpdate({
      target: adminSettings.settingKey,
      set: {
        settingValue,
        description: `AI-suggested RPA selectors for ${suggestion.provider.toUpperCase()} portal. Deployed ${new Date().toISOString()}. Job: ${suggestion.failedJobId}`,
        updatedAt: new Date(),
      },
    });

    await db.update(rpaRecoverySuggestions)
      .set({
        status: 'deployed',
        approvedByAdminId: adminId,
        adminNotes: adminNotes || null,
        otpToken: null,
        deployedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rpaRecoverySuggestions.id, suggestionId));

    logger.info('Recovery suggestion deployed', { suggestionId, provider: suggestion.provider, settingKey });
  },

  async reject(suggestionId: string, adminId: string, adminNotes?: string): Promise<void> {
    await db.update(rpaRecoverySuggestions)
      .set({
        status: 'rejected',
        approvedByAdminId: adminId,
        adminNotes: adminNotes || null,
        otpToken: null,
        updatedAt: new Date(),
      })
      .where(eq(rpaRecoverySuggestions.id, suggestionId));
  },

  async getDeployedSelectors(provider: string): Promise<AISuggestion | null> {
    const settingKey = `rpa_selectors_${provider}`;
    const [setting] = await db.select({ settingValue: adminSettings.settingValue })
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, settingKey))
      .limit(1);

    if (!setting?.settingValue) return null;
    try {
      return JSON.parse(setting.settingValue) as AISuggestion;
    } catch {
      return null;
    }
  },

  async listSuggestions(status?: string, limit = 20, offset = 0) {
    const query = db.select().from(rpaRecoverySuggestions)
      .orderBy(desc(rpaRecoverySuggestions.createdAt))
      .limit(limit)
      .offset(offset);

    return query;
  },

  async getSuggestion(id: string) {
    const [row] = await db.select()
      .from(rpaRecoverySuggestions)
      .where(eq(rpaRecoverySuggestions.id, id))
      .limit(1);
    return row || null;
  },
};
