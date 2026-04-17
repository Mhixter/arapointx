import { Router, Request, Response } from 'express';
import { db } from '../../config/database';
import {
  aiChatSessions, aiChatMessages, users, supportTickets,
  supportConversations, supportMessages, supportQueue, transactions,
  virtualAccounts,
} from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

const router = Router();

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(64) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'active',
        escalated_ticket_id UUID REFERENCES support_tickets(id),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS acs_user_idx ON ai_chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS acs_token_idx ON ai_chat_sessions(session_token);
      CREATE INDEX IF NOT EXISTS acs_status_idx ON ai_chat_sessions(status);

      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES ai_chat_sessions(id) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT,
        tool_calls JSONB,
        tool_call_id VARCHAR(100),
        name VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS acm_session_idx ON ai_chat_messages(session_id);

      CREATE TABLE IF NOT EXISTS support_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES support_tickets(id) NOT NULL UNIQUE,
        user_id UUID REFERENCES users(id) NOT NULL,
        conversation_id UUID REFERENCES support_conversations(id) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        status VARCHAR(20) DEFAULT 'waiting' NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        estimated_wait_minutes INTEGER DEFAULT 5,
        accepted_by UUID REFERENCES admin_users(id),
        accepted_at TIMESTAMP,
        removed_at TIMESTAMP,
        remove_reason VARCHAR(50)
      );
      CREATE INDEX IF NOT EXISTS sq_status_idx ON support_queue(status);
      CREATE INDEX IF NOT EXISTS sq_ticket_idx ON support_queue(ticket_id);
      CREATE INDEX IF NOT EXISTS sq_joined_idx ON support_queue(joined_at);
      CREATE INDEX IF NOT EXISTS sq_priority_idx ON support_queue(priority);
    `);
    logger.info('AI chat tables ready');
  } catch (e: any) {
    logger.error('AI chat table migration error', { error: e.message });
  }
})();

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

async function resolveUser(req: Request): Promise<{ userId: string; user: any } | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    if (!decoded?.userId) return null;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user || user.isSuspended) return null;
    return { userId: user.id, user };
  } catch {
    return null;
  }
}

function generateRefId(): string {
  return `AI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const SYSTEM_PROMPT = `You are Ara, Arapoint's intelligent AI assistant. Arapoint is a Nigerian platform for identity verification, education services, digital services, and VTU (airtime, data, bills).

Your role:
- Help users with their questions about Arapoint services
- Look up account information, transactions, and wallet details for logged-in users
- Guide users step-by-step through using any of the services listed below
- Help users fund their wallet using their virtual account details or payment links
- Handle OTP-based verification for sensitive actions
- Escalate complaints, disputes, and unresolved issues to the human support team
- Be warm, professional, and helpful — speak in plain English (and Nigerian Pidgin if the user uses it naturally)

=== ARAPOINT FULL SERVICE LIST ===

IDENTITY VERIFICATION:
- NIN Slip Generation: Generate a printable NIN slip using a person's NIN number.
  Variants: Information (₦400), Regular (₦700), Standard (₦1200), Premium (₦2000)
- BVN Retrieval: Look up BVN details using a phone number or BVN number
- NIN Phone Lookup: Find NIN linked to a phone number
- Face Verification: Verify that a face matches a NIN record (liveness check)

EDUCATION SERVICES (all require wallet balance):
- JAMB Score/Result Check: Look up a candidate's JAMB score using registration number (automated via RPA bot)
- JAMB Exam Slip Printing: Print/reprint a candidate's JAMB exam slip using their registration number (processed by our RPA bot — usually delivered within minutes to hours)
- JAMB CAPS Reprinting: Reprint JAMB CAPS (Central Admissions Processing System) document for a candidate
- JAMB O'Level Upload: Upload candidate's O'Level results to the JAMB portal
- JAMB Admission Letter: Obtain/reprint a candidate's JAMB admission letter
- JAMB Original Result: Obtain a candidate's original JAMB result document
- WAEC Result Verification: Verify a candidate's WAEC result using their exam number and PIN
- NECO Result Verification: Verify a candidate's NECO result
- NABTEB Result Verification: Verify a candidate's NABTEB result
- NBAIS Verification: Nigerian Blind Action Institute result verification (currently limited availability)

SCRATCH CARDS / EXAMINATION PINs (auto-delivered instantly from stock):
- WAEC Scratch Cards (PINs) — purchase and receive instantly via email
- NECO Scratch Cards (PINs) — purchase and receive instantly via email
- NABTEB Scratch Cards (PINs) — purchase and receive instantly via email

VTU (VIRTUAL TOP-UP):
- Airtime top-up: MTN, Airtel, Glo, 9mobile
- Data bundles: All major Nigerian networks
- Electricity bills: Prepaid and postpaid meter recharge (all DISCOs)
- Cable TV subscriptions: DStv, GOtv, StarTimes

CAC (CORPORATE AFFAIRS COMMISSION):
- Business name search
- Company/RC number search

BIRTH ATTESTATION:
- Birth certificate attestation service

WALLET & PAYMENTS:
- Fund wallet via dedicated virtual bank account (instant bank transfer)
- Fund wallet via Paystack payment link

=== HOW RPA (BOT) SERVICES WORK ===
Services like JAMB Exam Slip Printing, JAMB Result Check, WAEC/NECO/NABTEB result checks are processed by automated bots.
- After payment is deducted from wallet, a job is queued
- The bot processes it and delivers the result/document (usually within minutes to a few hours)
- Users can track job status in their dashboard under the relevant section
- If a job fails, it is retried automatically. If it still fails, the user's wallet is refunded.

=== RULES ===
- NEVER tell a user a service is unavailable on Arapoint unless you are absolutely certain it is not in the list above
- ALWAYS verify identity with OTP before making account changes
- NEVER share sensitive data (password hashes, full card numbers, etc.)
- If a user reports wallet deducted but service not delivered, use escalate_to_support immediately
- If a user asks to speak to a human agent, use escalate_to_support
- Keep responses concise and clear
- For account-specific queries (balance, transactions), use the available tools — do NOT make up numbers
- If user is not logged in, explain that they need to sign in for account-specific actions
- Pricing shown here are defaults — actual prices may vary. Always direct users to the dashboard for live pricing`;

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_account_info',
      description: 'Get the logged-in user\'s account info including wallet balance, email, name, and KYC status. Only works when user is authenticated.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_transactions',
      description: 'Get the user\'s 10 most recent wallet transactions/deductions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_virtual_account',
      description: 'Get the user\'s dedicated virtual bank account details for wallet funding.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_otp',
      description: 'Send a 6-digit OTP to the user\'s registered email for verifying a sensitive action.',
      parameters: {
        type: 'object',
        properties: {
          purpose: {
            type: 'string',
            description: 'Short description of why the OTP is being sent, e.g. "account_settings_change"',
          },
        },
        required: ['purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'verify_otp',
      description: 'Verify the OTP code the user provided against what was sent to their email.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The 6-digit OTP code the user entered' },
          purpose: { type: 'string', description: 'The same purpose used when sending the OTP' },
        },
        required: ['code', 'purpose'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_support',
      description: 'Escalate the conversation to a human support agent. Use this for complaints, disputes, unresolved issues, or when the user requests a human agent.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Brief reason for escalation, e.g. "User reports wallet deducted but NIN slip not received"' },
          category: {
            type: 'string',
            enum: ['general', 'wallet', 'identity', 'education', 'vtu', 'cac', 'complaint', 'fraud'],
            description: 'Category of the issue',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Priority level',
          },
        },
        required: ['reason', 'category', 'priority'],
      },
    },
  },
];

async function executeToolCall(
  toolName: string,
  toolArgs: any,
  userId: string | null,
  user: any | null,
  sessionId: string,
): Promise<string> {
  try {
    switch (toolName) {
      case 'get_account_info': {
        if (!userId || !user) return JSON.stringify({ error: 'User not logged in. Please sign in to view account information.' });
        return JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone || 'Not set',
          walletBalance: `₦${parseFloat(user.walletBalance || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          kycStatus: user.kycStatus || 'pending',
          emailVerified: user.emailVerified,
          memberSince: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' }) : 'Unknown',
        });
      }

      case 'get_recent_transactions': {
        if (!userId) return JSON.stringify({ error: 'User not logged in.' });
        const txns = await db.select({
          type: transactions.transactionType,
          amount: transactions.amount,
          description: transactions.description,
          status: transactions.status,
          reference: transactions.referenceId,
          createdAt: transactions.createdAt,
        })
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.createdAt))
          .limit(10);

        if (txns.length === 0) return JSON.stringify({ message: 'No transactions found yet.', transactions: [] });
        return JSON.stringify({
          transactions: txns.map(t => ({
            type: t.type,
            amount: `₦${parseFloat(t.amount || '0').toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            description: t.description || 'N/A',
            status: t.status,
            reference: t.reference,
            date: t.createdAt ? new Date(t.createdAt).toLocaleString('en-NG') : 'N/A',
          })),
        });
      }

      case 'get_virtual_account': {
        if (!userId) return JSON.stringify({ error: 'User not logged in.' });
        const [va] = await db.select().from(virtualAccounts).where(eq(virtualAccounts.userId, userId)).limit(1);
        if (!va) return JSON.stringify({ message: 'No virtual account found. Please visit Dashboard > Fund Wallet to generate your dedicated virtual account.' });
        return JSON.stringify({
          bankName: va.bankName,
          accountNumber: va.accountNumber,
          accountName: va.accountName,
          note: 'Transfer any amount to this account and your wallet will be credited automatically within minutes.',
        });
      }

      case 'send_otp': {
        if (!userId || !user) return JSON.stringify({ error: 'User not logged in. Cannot send OTP.' });
        const { otpService } = await import('../../services/otpService');
        await otpService.sendOTP(user.email, toolArgs.purpose || 'chat_action');
        return JSON.stringify({ success: true, message: `A 6-digit verification code has been sent to ${user.email}. It is valid for 10 minutes.` });
      }

      case 'verify_otp': {
        if (!userId || !user) return JSON.stringify({ error: 'User not logged in.' });
        const { otpService } = await import('../../services/otpService');
        const valid = await otpService.verifyOTP(user.email, toolArgs.code, toolArgs.purpose || 'chat_action');
        if (valid) return JSON.stringify({ verified: true, message: 'OTP verified successfully. You may proceed.' });
        return JSON.stringify({ verified: false, message: 'Invalid or expired OTP code. Please try again or request a new code.' });
      }

      case 'escalate_to_support': {
        if (!userId) {
          return JSON.stringify({
            success: false,
            message: 'You need to be logged in to escalate to support. Please sign in and try again, or contact us at support@arapoint.com.ng',
          });
        }

        const refId = generateRefId();
        const subject = `AI Chat Escalation: ${toolArgs.reason.slice(0, 100)}`;
        const [ticket] = await db.insert(supportTickets).values({
          referenceId: refId,
          userId,
          subject,
          category: toolArgs.category || 'general',
          status: 'open',
          priority: toolArgs.priority || 'medium',
          departmentTag: toolArgs.category || 'general',
        }).returning();

        const [conversation] = await db.insert(supportConversations).values({
          ticketId: ticket.id,
          isActive: true,
        }).returning();

        await db.insert(supportMessages).values({
          conversationId: conversation.id,
          senderType: 'system',
          senderName: 'Ara (AI Assistant)',
          content: `This conversation was escalated from the Ara AI chatbot.\n\nReason: ${toolArgs.reason}\n\nThe user's chat history has been forwarded for context.`,
        });

        await db.insert(supportQueue).values({
          ticketId: ticket.id,
          userId,
          conversationId: conversation.id,
          priority: toolArgs.priority || 'medium',
          category: toolArgs.category || 'general',
          status: 'waiting',
          estimatedWaitMinutes: 5,
        });

        await db.update(aiChatSessions)
          .set({ status: 'escalated', escalatedTicketId: ticket.id, updatedAt: new Date() })
          .where(eq(aiChatSessions.id, sessionId));

        logger.info('AI chat escalated to support', { userId, ticketId: ticket.id, refId, reason: toolArgs.reason });

        return JSON.stringify({
          success: true,
          ticketRef: refId,
          message: `Your concern has been escalated to our support team. Your ticket reference is **${refId}**. A support agent will reach out to you shortly. You can also track this ticket in your dashboard under Support.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    logger.error('Tool execution error', { toolName, error: err.message });
    return JSON.stringify({ error: 'Tool execution failed. Please try again.' });
  }
}

router.post('/session', async (req: Request, res: Response) => {
  try {
    const auth = await resolveUser(req);
    const sessionToken = randomUUID().replace(/-/g, '');
    const [session] = await db.insert(aiChatSessions).values({
      sessionToken,
      userId: auth?.userId || null,
      userAgent: req.headers['user-agent'] || null,
    }).returning();

    res.json({ status: 'success', code: 200, data: { sessionId: session.id, sessionToken } });
  } catch (err: any) {
    logger.error('Chat session create error', { error: err.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to create chat session' });
  }
});

router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message?.trim()) {
      return res.status(400).json({ status: 'error', code: 400, message: 'sessionId and message are required' });
    }

    const openai = getOpenAI();
    if (!openai) {
      return res.status(503).json({ status: 'error', code: 503, message: 'AI service unavailable' });
    }

    const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, sessionId)).limit(1);
    if (!session) return res.status(404).json({ status: 'error', code: 404, message: 'Chat session not found' });

    const auth = await resolveUser(req);
    const userId = auth?.userId || session.userId || null;
    const user = auth?.user || null;

    if (userId && !session.userId) {
      await db.update(aiChatSessions).set({ userId, updatedAt: new Date() }).where(eq(aiChatSessions.id, sessionId));
    }

    const history = await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(30);

    history.reverse();

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    for (const msg of history) {
      if (msg.role === 'user') {
        openaiMessages.push({ role: 'user', content: msg.content || '' });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls) {
          openaiMessages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.toolCalls as any });
        } else {
          openaiMessages.push({ role: 'assistant', content: msg.content || '' });
        }
      } else if (msg.role === 'tool') {
        openaiMessages.push({ role: 'tool', content: msg.content || '', tool_call_id: msg.toolCallId || '' });
      }
    }

    openaiMessages.push({ role: 'user', content: message.trim() });

    await db.insert(aiChatMessages).values({
      sessionId,
      role: 'user',
      content: message.trim(),
    });

    await db.update(aiChatSessions).set({ updatedAt: new Date() }).where(eq(aiChatSessions.id, sessionId));

    let aiResponse = '';
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: openaiMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      if (choice.finish_reason === 'stop' || !assistantMsg.tool_calls?.length) {
        aiResponse = assistantMsg.content || "I'm sorry, I couldn't generate a response. Please try again.";
        await db.insert(aiChatMessages).values({
          sessionId,
          role: 'assistant',
          content: aiResponse,
        });
        openaiMessages.push({ role: 'assistant', content: aiResponse });
        break;
      }

      await db.insert(aiChatMessages).values({
        sessionId,
        role: 'assistant',
        content: assistantMsg.content || null,
        toolCalls: assistantMsg.tool_calls as any,
      });
      openaiMessages.push({ role: 'assistant', content: assistantMsg.content || null, tool_calls: assistantMsg.tool_calls });

      for (const toolCall of assistantMsg.tool_calls) {
        let toolArgs: any = {};
        try { toolArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

        const toolResult = await executeToolCall(toolCall.function.name, toolArgs, userId, user, sessionId);

        await db.insert(aiChatMessages).values({
          sessionId,
          role: 'tool',
          content: toolResult,
          toolCallId: toolCall.id,
          name: toolCall.function.name,
        });
        openaiMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
      }
    }

    res.json({ status: 'success', code: 200, data: { reply: aiResponse, sessionId } });
  } catch (err: any) {
    logger.error('Chat message error', { error: err.message });
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to process message' });
  }
});

router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await db.select().from(aiChatMessages)
      .where(and(
        eq(aiChatMessages.sessionId, sessionId),
        eq(aiChatMessages.role, 'user'),
      ))
      .orderBy(aiChatMessages.createdAt)
      .limit(50);

    const allMessages = await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.createdAt)
      .limit(100);

    const visible = allMessages.filter(m => m.role === 'user' || m.role === 'assistant');
    res.json({ status: 'success', code: 200, data: { messages: visible } });
  } catch (err: any) {
    res.status(500).json({ status: 'error', code: 500, message: 'Failed to load history' });
  }
});

export default router;
