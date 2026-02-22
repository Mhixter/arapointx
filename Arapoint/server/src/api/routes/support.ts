import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { db } from '../../config/database';
import {
  supportTickets,
  supportConversations,
  supportMessages,
  supportPresence,
  users,
  adminUsers,
} from '../../db/schema';
import { eq, and, desc, gt, or, sql } from 'drizzle-orm';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.use(authMiddleware);

function generateReferenceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ARP-${code}`;
}

router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const { subject, category, message } = req.body;
    const userId = req.userId!;

    if (!subject || !message) {
      return res.status(400).json(formatErrorResponse(400, 'Subject and message are required'));
    }

    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

    let referenceId = generateReferenceId();
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await db.select({ id: supportTickets.id })
        .from(supportTickets).where(eq(supportTickets.referenceId, referenceId)).limit(1);
      if (!existing) break;
      referenceId = generateReferenceId();
      attempts++;
    }

    const [ticket] = await db.insert(supportTickets).values({
      referenceId,
      userId,
      subject,
      category: category || 'general',
      status: 'open',
      priority: 'medium',
      lastActivityAt: new Date(),
    }).returning();

    const [conversation] = await db.insert(supportConversations).values({
      ticketId: ticket.id,
      isActive: true,
      lastMessageAt: new Date(),
    }).returning();

    await db.insert(supportMessages).values({
      conversationId: conversation.id,
      senderType: 'user',
      senderId: userId,
      senderName: user?.name || 'User',
      content: message,
    });

    await db.insert(supportMessages).values({
      conversationId: conversation.id,
      senderType: 'system',
      senderName: 'System',
      content: `Ticket ${referenceId} created. Our AI assistant will try to help you first. If needed, your issue will be escalated to a human agent.`,
    });

    await db.insert(supportPresence).values({
      ticketId: ticket.id,
      participantId: userId,
      participantType: 'user',
      participantName: user?.name || 'User',
      isOnline: true,
      lastSeenAt: new Date(),
    });

    const history = [{ role: 'user' as const, content: message }];
    let aiResponse = '';
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Arapoint Support AI assistant. Help users with questions about identity verification (NIN, BVN), education services (JAMB, WAEC, NECO), VTU services (airtime, data), wallet funding, and CAC registration. Be helpful and concise. If the user has a complex issue you cannot resolve, tell them you can escalate to a human agent. Never make up information about their account.`
          },
          ...history,
        ],
      });
      aiResponse = response.choices[0].message.content || 'I apologize, I am having trouble responding. Please try again.';
    } catch {
      aiResponse = 'Welcome to Arapoint Support! I am currently unable to connect to AI assistance. You can type "agent" to speak with a human support agent.';
    }

    await db.insert(supportMessages).values({
      conversationId: conversation.id,
      senderType: 'ai',
      senderName: 'AI Assistant',
      content: aiResponse,
    });

    logger.info('Support ticket created', { ticketId: ticket.id, referenceId, userId });

    res.status(201).json(formatResponse('success', 201, 'Ticket created', {
      ticket: {
        id: ticket.id,
        referenceId: ticket.referenceId,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
      conversationId: conversation.id,
    }));
  } catch (error: any) {
    logger.error('Create ticket error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create ticket'));
  }
});

router.get('/tickets/active', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const activeTickets = await db.select({
      id: supportTickets.id,
      referenceId: supportTickets.referenceId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      status: supportTickets.status,
      priority: supportTickets.priority,
      assignedAgentId: supportTickets.assignedAgentId,
      lastActivityAt: supportTickets.lastActivityAt,
      createdAt: supportTickets.createdAt,
    })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.userId, userId),
        sql`${supportTickets.status} NOT IN ('closed', 'resolved')`
      ))
      .orderBy(desc(supportTickets.updatedAt));

    const ticketsWithConv = await Promise.all(activeTickets.map(async (ticket) => {
      const [conv] = await db.select({ id: supportConversations.id, isActive: supportConversations.isActive })
        .from(supportConversations)
        .where(eq(supportConversations.ticketId, ticket.id))
        .limit(1);

      let agentName = null;
      if (ticket.assignedAgentId) {
        const [agent] = await db.select({ name: adminUsers.name })
          .from(adminUsers).where(eq(adminUsers.id, ticket.assignedAgentId)).limit(1);
        agentName = agent?.name || null;
      }

      return { ...ticket, conversationId: conv?.id || null, isActive: conv?.isActive ?? true, agentName };
    }));

    res.json(formatResponse('success', 200, 'Active tickets', { tickets: ticketsWithConv }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get active tickets'));
  }
});

router.get('/tickets/history', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const tickets = await db.select({
      id: supportTickets.id,
      referenceId: supportTickets.referenceId,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      resolvedAt: supportTickets.resolvedAt,
      closedAt: supportTickets.closedAt,
    })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));

    res.json(formatResponse('success', 200, 'Ticket history', { tickets }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get ticket history'));
  }
});

router.get('/tickets/track/:referenceId', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.params;
    const userId = req.userId!;

    const [ticket] = await db.select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.referenceId, referenceId.toUpperCase()),
        eq(supportTickets.userId, userId),
      ))
      .limit(1);

    if (!ticket) {
      return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    }

    let agentName = null;
    if (ticket.assignedAgentId) {
      const [agent] = await db.select({ name: adminUsers.name })
        .from(adminUsers).where(eq(adminUsers.id, ticket.assignedAgentId)).limit(1);
      agentName = agent?.name || null;
    }

    res.json(formatResponse('success', 200, 'Ticket found', { ticket: { ...ticket, agentName } }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to track ticket'));
  }
});

router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const since = req.query.since as string;

    let msgs;
    if (since) {
      msgs = await db.select()
        .from(supportMessages)
        .where(and(
          eq(supportMessages.conversationId, id),
          gt(supportMessages.createdAt, new Date(since))
        ))
        .orderBy(supportMessages.createdAt);
    } else {
      msgs = await db.select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, id))
        .orderBy(supportMessages.createdAt);
    }

    const [conv] = await db.select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));

    const presence = await db.select()
      .from(supportPresence)
      .where(eq(supportPresence.ticketId, conv.ticketId));

    const now = new Date();
    const presenceData = presence.map(p => ({
      participantId: p.participantId,
      participantType: p.participantType,
      participantName: p.participantName,
      isOnline: p.lastSeenAt ? (now.getTime() - new Date(p.lastSeenAt).getTime() < 15000) : false,
      isTyping: p.isTyping && p.typingAt ? (now.getTime() - new Date(p.typingAt).getTime() < 5000) : false,
    }));

    const [ticket] = await db.select({
      status: supportTickets.status,
      referenceId: supportTickets.referenceId,
      assignedAgentId: supportTickets.assignedAgentId,
      lastActivityAt: supportTickets.lastActivityAt,
    })
      .from(supportTickets)
      .where(eq(supportTickets.id, conv.ticketId))
      .limit(1);

    let agentName = null;
    if (ticket?.assignedAgentId) {
      const [agent] = await db.select({ name: adminUsers.name })
        .from(adminUsers).where(eq(adminUsers.id, ticket.assignedAgentId)).limit(1);
      agentName = agent?.name || null;
    }

    const inactiveMinutes = ticket?.lastActivityAt
      ? (now.getTime() - new Date(ticket.lastActivityAt).getTime()) / 60000
      : 0;

    if (inactiveMinutes > 30 && conv.isActive && ticket?.status !== 'closed' && ticket?.status !== 'resolved') {
      await db.update(supportConversations)
        .set({ isActive: false, closedReason: 'inactivity', updatedAt: now })
        .where(eq(supportConversations.id, id));

      await db.update(supportTickets)
        .set({ status: 'closed', closedAt: now, updatedAt: now })
        .where(eq(supportTickets.id, conv.ticketId));

      await db.insert(supportMessages).values({
        conversationId: id,
        senderType: 'system',
        senderName: 'System',
        content: 'This conversation has been automatically closed due to 30 minutes of inactivity. You can open a new ticket if you need further assistance.',
      });
    }

    res.json(formatResponse('success', 200, 'Messages retrieved', {
      messages: msgs,
      presence: presenceData,
      isActive: conv.isActive,
      closedReason: conv.closedReason,
      ticketStatus: ticket?.status,
      referenceId: ticket?.referenceId,
      agentName,
    }));
  } catch (error: any) {
    logger.error('Get messages error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get messages'));
  }
});

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    if (!content?.trim()) {
      return res.status(400).json(formatErrorResponse(400, 'Message content is required'));
    }

    const [conv] = await db.select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));
    if (!conv.isActive) return res.status(400).json(formatErrorResponse(400, 'This conversation has been closed'));

    const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const now = new Date();

    const [message] = await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'user',
      senderId: userId,
      senderName: user?.name || 'User',
      content: content.trim(),
    }).returning();

    await db.update(supportConversations)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(supportConversations.id, id));

    await db.update(supportTickets)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(supportTickets.id, conv.ticketId));

    await db.update(supportPresence)
      .set({ isTyping: false, lastSeenAt: now })
      .where(and(
        eq(supportPresence.ticketId, conv.ticketId),
        eq(supportPresence.participantId, userId)
      ));

    const [ticket] = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, conv.ticketId))
      .limit(1);

    if (ticket?.assignedAgentId) {
      return res.status(201).json(formatResponse('success', 201, 'Message sent', { message }));
    }

    if (content.toLowerCase().includes('agent') || content.toLowerCase().includes('human') || content.toLowerCase().includes('escalate') || content.toLowerCase().includes('speak to someone')) {
      await db.update(supportTickets)
        .set({ status: 'escalated', escalatedAt: now, priority: 'high', lastActivityAt: now, updatedAt: now })
        .where(eq(supportTickets.id, conv.ticketId));

      await db.insert(supportMessages).values({
        conversationId: id,
        senderType: 'system',
        senderName: 'System',
        content: 'Your ticket has been escalated to a human support agent. An agent will be assigned to you shortly. Please wait.',
      });

      return res.status(201).json(formatResponse('success', 201, 'Message sent and ticket escalated', { message, escalated: true }));
    }

    const history = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, id))
      .orderBy(desc(supportMessages.createdAt))
      .limit(10);

    const messagesForAI = history.reverse().filter(m => m.senderType === 'user' || m.senderType === 'ai').map(m => ({
      role: (m.senderType === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    let aiContent = '';
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Arapoint Support AI. Help with identity verification (NIN, BVN), education services (JAMB, WAEC, NECO), VTU services, wallet funding, and CAC registration. Be concise and helpful. If you cannot resolve the issue, suggest typing "agent" to speak with a human.`
          },
          ...messagesForAI,
        ],
      });
      aiContent = response.choices[0].message.content || 'I apologize, I am having trouble responding.';
    } catch {
      aiContent = 'I am currently unable to process your request. Type "agent" to speak with a human support agent.';
    }

    await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'ai',
      senderName: 'AI Assistant',
      content: aiContent,
    });

    res.status(201).json(formatResponse('success', 201, 'Message processed', { message, aiResponse: aiContent }));
  } catch (error: any) {
    logger.error('Send message error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send message'));
  }
});

router.post('/conversations/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date();

    const [conv] = await db.select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));

    await db.update(supportTickets)
      .set({ status: 'escalated', escalatedAt: now, priority: 'high', lastActivityAt: now, updatedAt: now })
      .where(eq(supportTickets.id, conv.ticketId));

    await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'system',
      senderName: 'System',
      content: 'Your ticket has been escalated to a human support agent. An agent will be assigned shortly.',
    });

    res.json(formatResponse('success', 200, 'Ticket escalated'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to escalate'));
  }
});

router.post('/presence/heartbeat', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { ticketId, isTyping } = req.body;
    const now = new Date();

    const [existing] = await db.select()
      .from(supportPresence)
      .where(and(
        eq(supportPresence.ticketId, ticketId),
        eq(supportPresence.participantId, userId)
      ))
      .limit(1);

    if (existing) {
      await db.update(supportPresence)
        .set({
          isOnline: true,
          isTyping: !!isTyping,
          lastSeenAt: now,
          typingAt: isTyping ? now : existing.typingAt,
        })
        .where(eq(supportPresence.id, existing.id));
    } else {
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      await db.insert(supportPresence).values({
        ticketId,
        participantId: userId,
        participantType: 'user',
        participantName: user?.name || 'User',
        isOnline: true,
        isTyping: !!isTyping,
        lastSeenAt: now,
        typingAt: isTyping ? now : undefined,
      });
    }

    res.json(formatResponse('success', 200, 'OK'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed'));
  }
});

export default router;
