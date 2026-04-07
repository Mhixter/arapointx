import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { db } from '../../config/database';
import {
  supportTickets,
  supportConversations,
  supportMessages,
  supportPresence,
  supportQueue,
  agentInternalMessages,
  fraudAlerts,
  users,
  adminUsers,
  adminRoles,
  transactions,
  a2cRequests,
  identityServiceRequests,
  educationServiceRequests,
  cacRegistrationRequests,
} from '../../db/schema';
import { eq, and, desc, gt, or, sql, count, asc, ilike, lt } from 'drizzle-orm';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { fraudService } from '../../services/fraudService';
import { localAi } from '../../services/localAiService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const SUPPORT_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'support');
if (!fs.existsSync(SUPPORT_UPLOADS_DIR)) fs.mkdirSync(SUPPORT_UPLOADS_DIR, { recursive: true });

const supportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUPPORT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});
const supportUpload = multer({
  storage: supportStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const router = Router();

router.use(authMiddleware);

async function findAvailableAgent(): Promise<{ id: string; name: string } | null> {
  try {
    const agents = await db.select({
      id: adminUsers.id,
      name: adminUsers.name,
    })
      .from(adminUsers)
      .innerJoin(adminRoles, eq(adminUsers.roleId, adminRoles.id))
      .where(and(
        eq(adminRoles.name, 'support_agent'),
        eq(adminUsers.isActive, true)
      ));

    if (agents.length === 0) return null;

    let bestAgent: { id: string; name: string } | null = null;
    let lowestCount = Infinity;

    for (const agent of agents) {
      const [result] = await db.select({ count: count() })
        .from(supportTickets)
        .where(and(
          eq(supportTickets.assignedAgentId, agent.id),
          sql`${supportTickets.status} IN ('assigned', 'in_progress', 'escalated')`
        ));

      const activeCount = Number(result?.count || 0);
      if (activeCount === 0) return agent;
      if (activeCount < lowestCount) {
        lowestCount = activeCount;
        bestAgent = agent;
      }
    }

    return bestAgent;
  } catch (error) {
    logger.error('Find available agent error', { error });
    return null;
  }
}

async function autoAssignTicket(ticketId: string, conversationId: string): Promise<{ agentId: string; agentName: string } | null> {
  const agent = await findAvailableAgent();
  if (!agent) return null;

  const now = new Date();
  await db.update(supportTickets)
    .set({
      assignedAgentId: agent.id,
      assignedAt: now,
      status: 'assigned',
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(supportTickets.id, ticketId));

  await db.insert(supportMessages).values({
    conversationId,
    senderType: 'system',
    senderName: 'System',
    content: `Agent ${agent.name} has been assigned to your ticket and will assist you shortly.`,
  });

  await db.insert(supportPresence).values({
    ticketId,
    participantId: agent.id,
    participantType: 'agent',
    participantName: agent.name,
    isOnline: false,
    lastSeenAt: now,
  }).onConflictDoNothing();

  logger.info('Ticket auto-assigned', { ticketId, agentId: agent.id, agentName: agent.name });
  return { agentId: agent.id, agentName: agent.name };
}

async function addToQueue(ticketId: string, userId: string, conversationId: string, priority: string, category: string): Promise<{ position: number; estimatedWaitMinutes: number }> {
  try {
    const [existing] = await db.select({ id: supportQueue.id })
      .from(supportQueue)
      .where(and(eq(supportQueue.ticketId, ticketId), eq(supportQueue.status, 'waiting')))
      .limit(1);
    if (existing) {
      const position = await getQueuePosition(ticketId);
      return { position, estimatedWaitMinutes: position * 3 };
    }

    const [waitingCount] = await db.select({ count: count() })
      .from(supportQueue)
      .where(eq(supportQueue.status, 'waiting'));
    const currentCount = Number(waitingCount?.count || 0);
    const estimatedWait = Math.max(2, (currentCount + 1) * 3);

    await db.insert(supportQueue).values({
      ticketId,
      userId,
      conversationId,
      priority: priority || 'medium',
      category: category || 'general',
      status: 'waiting',
      estimatedWaitMinutes: estimatedWait,
    });

    logger.info('Added to support queue', { ticketId, position: currentCount + 1, estimatedWait });
    return { position: currentCount + 1, estimatedWaitMinutes: estimatedWait };
  } catch (error) {
    logger.error('Add to queue error', { error, ticketId });
    return { position: 0, estimatedWaitMinutes: 5 };
  }
}

async function removeFromQueue(ticketId: string, reason: string, agentId?: string): Promise<void> {
  try {
    const now = new Date();
    await db.update(supportQueue)
      .set({
        status: reason === 'accepted' ? 'accepted' : 'removed',
        removedAt: now,
        removeReason: reason,
        acceptedBy: agentId || null,
        acceptedAt: reason === 'accepted' ? now : null,
      })
      .where(and(eq(supportQueue.ticketId, ticketId), eq(supportQueue.status, 'waiting')));
    logger.info('Removed from queue', { ticketId, reason });
  } catch (error) {
    logger.error('Remove from queue error', { error, ticketId });
  }
}

async function getQueuePosition(ticketId: string): Promise<number> {
  try {
    const [entry] = await db.select({ joinedAt: supportQueue.joinedAt, priority: supportQueue.priority })
      .from(supportQueue)
      .where(and(eq(supportQueue.ticketId, ticketId), eq(supportQueue.status, 'waiting')))
      .limit(1);
    if (!entry) return 0;

    const [ahead] = await db.select({ count: count() })
      .from(supportQueue)
      .where(and(
        eq(supportQueue.status, 'waiting'),
        or(
          sql`CASE ${supportQueue.priority}
            WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END
            > CASE '${sql.raw(entry.priority || 'medium')}'
            WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`,
          and(
            eq(supportQueue.priority, entry.priority || 'medium'),
            lt(supportQueue.joinedAt, entry.joinedAt)
          )
        )
      ));
    return Number(ahead?.count || 0) + 1;
  } catch (error) {
    logger.error('Get queue position error', { error, ticketId });
    return 0;
  }
}

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

    const aiResult = await localAi.processQuery(message, conversation.id, ticket.id);
    const aiResponse = aiResult.answer;

    await db.insert(supportMessages).values({
      conversationId: conversation.id,
      senderType: 'ai',
      senderName: 'Ara (AI Assistant)',
      content: aiResponse,
    });

    let queueInfo = null;
    if (aiResult.shouldEscalate) {
      await db.update(supportTickets)
        .set({ status: 'escalated', escalatedAt: new Date(), priority: 'high', lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(supportTickets.id, ticket.id));

      const assigned = await autoAssignTicket(ticket.id, conversation.id);

      if (assigned) {
        await db.insert(supportMessages).values({
          conversationId: conversation.id,
          senderType: 'system',
          senderName: 'System',
          content: 'Your ticket has been escalated and an agent has been assigned.',
        });
      } else {
        queueInfo = await addToQueue(ticket.id, userId, conversation.id, 'high', category || 'general');
        await db.insert(supportMessages).values({
          conversationId: conversation.id,
          senderType: 'system',
          senderName: 'System',
          content: `Your ticket has been escalated. You are #${queueInfo.position} in the queue. Estimated wait: ~${queueInfo.estimatedWaitMinutes} minutes.`,
        });
      }
    }

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
      queue: queueInfo,
    }));
  } catch (error: any) {
    logger.error('Create ticket error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to create ticket'));
  }
});

router.get('/tickets/active', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Auto-close tickets inactive for more than 10 minutes
    await db.update(supportTickets)
      .set({ status: 'closed', updatedAt: now })
      .where(and(
        eq(supportTickets.userId, userId),
        sql`${supportTickets.status} NOT IN ('closed', 'resolved')`,
        lt(supportTickets.lastActivityAt, tenMinutesAgo)
      ));

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

router.post('/upload', supportUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json(formatErrorResponse(400, 'No file uploaded'));
    const fileUrl = `/api/support/files/${req.file.filename}`;
    res.json(formatResponse('success', 200, 'File uploaded', {
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to upload file'));
  }
});

router.get('/files/:filename', async (req: Request, res: Response) => {
  try {
    const filePath = path.join(SUPPORT_UPLOADS_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json(formatErrorResponse(404, 'File not found'));
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to download file'));
  }
});

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, fileUrl, fileName } = req.body;
    const userId = req.userId!;

    if (!content?.trim() && !fileUrl) {
      return res.status(400).json(formatErrorResponse(400, 'Message content or file is required'));
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
      content: content?.trim() || (fileName ? `Sent a file: ${fileName}` : 'Sent a file'),
      fileUrl: fileUrl || null,
      attachments: fileUrl ? [{ url: fileUrl, name: fileName || 'File', type: 'file' }] : [],
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

      const assigned = await autoAssignTicket(conv.ticketId, id);

      if (assigned) {
        await removeFromQueue(conv.ticketId, 'accepted', assigned.agentId);
        await db.insert(supportMessages).values({
          conversationId: id,
          senderType: 'system',
          senderName: 'System',
          content: `Your ticket has been escalated. Agent ${assigned.agentName} will assist you shortly.`,
        });
      } else {
        const queueInfo = await addToQueue(conv.ticketId, userId, id, 'high', ticket?.category || 'general');
        await db.insert(supportMessages).values({
          conversationId: id,
          senderType: 'system',
          senderName: 'System',
          content: `Your ticket has been escalated. You are #${queueInfo.position} in the queue. Estimated wait: ~${queueInfo.estimatedWaitMinutes} minutes.`,
        });
      }

      return res.status(201).json(formatResponse('success', 201, 'Message sent and ticket escalated', {
        message,
        escalated: true,
        assignedAgent: assigned?.agentName || null,
      }));
    }

    let aiContent = '';
    let shouldEscalate = false;

    const aiResult = await localAi.processQuery(content, id, conv.ticketId);
    aiContent = aiResult.answer;
    shouldEscalate = aiResult.shouldEscalate;

    await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'ai',
      senderName: 'Ara (AI Assistant)',
      content: aiContent,
    });

    if (shouldEscalate) {
      await db.update(supportTickets)
        .set({ status: 'escalated', escalatedAt: now, priority: 'high', lastActivityAt: now, updatedAt: now })
        .where(eq(supportTickets.id, conv.ticketId));

      const assigned = await autoAssignTicket(conv.ticketId, id);

      if (assigned) {
        await removeFromQueue(conv.ticketId, 'accepted');
        await db.insert(supportMessages).values({
          conversationId: id,
          senderType: 'system',
          senderName: 'System',
          content: `An agent has been assigned to help you. ${assigned.agentName} will be with you shortly.`,
        });
      } else {
        const queueInfo = await addToQueue(conv.ticketId, userId, id, 'high', ticket?.category || 'general');
        await db.insert(supportMessages).values({
          conversationId: id,
          senderType: 'system',
          senderName: 'System',
          content: `This issue requires human assistance. You are #${queueInfo.position} in the queue. Estimated wait: ~${queueInfo.estimatedWaitMinutes} minutes.`,
        });
      }

      return res.status(201).json(formatResponse('success', 201, 'Message processed and escalated', {
        message,
        aiResponse: aiContent,
        escalated: true,
        assignedAgent: assigned?.agentName || null,
      }));
    }

    res.status(201).json(formatResponse('success', 201, 'Message processed', { message, aiResponse: aiContent }));
  } catch (error: any) {
    logger.error('Send message error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send message'));
  }
});

router.post('/conversations/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const now = new Date();

    const [conv] = await db.select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);

    if (!conv) return res.status(404).json(formatErrorResponse(404, 'Conversation not found'));

    const [ticket] = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, conv.ticketId))
      .limit(1);

    await db.update(supportTickets)
      .set({ status: 'escalated', escalatedAt: now, priority: 'high', lastActivityAt: now, updatedAt: now })
      .where(eq(supportTickets.id, conv.ticketId));

    const assigned = await autoAssignTicket(conv.ticketId, id);

    let queueInfo = null;
    if (assigned) {
      await removeFromQueue(conv.ticketId, 'accepted');
      await db.insert(supportMessages).values({
        conversationId: id,
        senderType: 'system',
        senderName: 'System',
        content: `Agent ${assigned.agentName} has been assigned to your ticket.`,
      });
    } else {
      queueInfo = await addToQueue(conv.ticketId, userId, id, 'high', ticket?.category || 'general');
      await db.insert(supportMessages).values({
        conversationId: id,
        senderType: 'system',
        senderName: 'System',
        content: `Your ticket has been escalated. You are #${queueInfo.position} in the queue. Estimated wait: ~${queueInfo.estimatedWaitMinutes} minutes.`,
      });
    }

    res.json(formatResponse('success', 200, 'Ticket escalated', {
      assignedAgent: assigned?.agentName || null,
      queue: queueInfo,
    }));
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

// =====================================================
// CROSS-DEPARTMENT LOOKUP (Support Agent Tool)
// =====================================================

router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 3) {
      return res.status(400).json(formatErrorResponse(400, 'Search query too short (min 3 chars)'));
    }

    const query = q.trim();
    const results: any[] = [];

    // A2C Requests
    try {
      const a2cRows = await db.select({
        id: a2cRequests.id,
        trackingId: a2cRequests.trackingId,
        phoneNumber: a2cRequests.phoneNumber,
        airtimeAmount: a2cRequests.airtimeAmount,
        cashAmount: a2cRequests.cashAmount,
        status: a2cRequests.status,
        network: a2cRequests.network,
        createdAt: a2cRequests.createdAt,
        userId: a2cRequests.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(a2cRequests)
        .innerJoin(users, eq(a2cRequests.userId, users.id))
        .where(or(
          ilike(a2cRequests.trackingId, `%${query}%`),
          ilike(a2cRequests.phoneNumber, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).limit(5);

      for (const row of a2cRows) {
        results.push({ type: 'a2c', label: 'Airtime to Cash', ...row });
      }
    } catch {}

    // Identity Service Requests
    try {
      const idRows = await db.select({
        id: identityServiceRequests.id,
        referenceId: identityServiceRequests.trackingId,
        serviceType: identityServiceRequests.serviceType,
        status: identityServiceRequests.status,
        createdAt: identityServiceRequests.createdAt,
        userId: identityServiceRequests.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(identityServiceRequests)
        .innerJoin(users, eq(identityServiceRequests.userId, users.id))
        .where(or(
          ilike(identityServiceRequests.trackingId, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).limit(5);

      for (const row of idRows) {
        results.push({ type: 'identity', label: 'Identity Verification', ...row });
      }
    } catch {}

    // Education Service Requests
    try {
      const eduRows = await db.select({
        id: educationServiceRequests.id,
        referenceId: educationServiceRequests.trackingId,
        serviceType: educationServiceRequests.serviceType,
        status: educationServiceRequests.status,
        createdAt: educationServiceRequests.createdAt,
        userId: educationServiceRequests.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(educationServiceRequests)
        .innerJoin(users, eq(educationServiceRequests.userId, users.id))
        .where(or(
          ilike(educationServiceRequests.trackingId, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).limit(5);

      for (const row of eduRows) {
        results.push({ type: 'education', label: 'Education Service', ...row });
      }
    } catch {}

    // CAC Requests
    try {
      const cacRows = await db.select({
        id: cacRegistrationRequests.id,
        businessName: cacRegistrationRequests.businessName,
        serviceType: cacRegistrationRequests.serviceType,
        status: cacRegistrationRequests.status,
        paymentReference: cacRegistrationRequests.paymentReference,
        createdAt: cacRegistrationRequests.createdAt,
        userId: cacRegistrationRequests.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(cacRegistrationRequests)
        .innerJoin(users, eq(cacRegistrationRequests.userId, users.id))
        .where(or(
          ilike(cacRegistrationRequests.businessName, `%${query}%`),
          ilike(cacRegistrationRequests.paymentReference, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).limit(5);

      for (const row of cacRows) {
        results.push({ type: 'cac', label: 'CAC Registration', ...row });
      }
    } catch {}

    // Transactions
    try {
      const txRows = await db.select({
        id: transactions.id,
        reference: transactions.reference,
        type: transactions.type,
        amount: transactions.amount,
        status: transactions.status,
        description: transactions.description,
        createdAt: transactions.createdAt,
        userId: transactions.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(transactions)
        .innerJoin(users, eq(transactions.userId, users.id))
        .where(or(
          ilike(transactions.reference, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).orderBy(desc(transactions.createdAt)).limit(5);

      for (const row of txRows) {
        results.push({ type: 'transaction', label: 'Transaction', ...row });
      }
    } catch {}

    // Support Tickets
    try {
      const ticketRows = await db.select({
        id: supportTickets.id,
        referenceId: supportTickets.referenceId,
        subject: supportTickets.subject,
        status: supportTickets.status,
        category: supportTickets.category,
        departmentTag: supportTickets.departmentTag,
        linkedOrderId: supportTickets.linkedOrderId,
        createdAt: supportTickets.createdAt,
        userId: supportTickets.userId,
        userName: users.name,
        userEmail: users.email,
      }).from(supportTickets)
        .innerJoin(users, eq(supportTickets.userId, users.id))
        .where(or(
          ilike(supportTickets.referenceId, `%${query}%`),
          ilike(supportTickets.subject, `%${query}%`),
          ilike(supportTickets.linkedOrderId, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.phone, `%${query}%`),
        )).orderBy(desc(supportTickets.createdAt)).limit(5);

      for (const row of ticketRows) {
        results.push({ type: 'ticket', label: 'Support Ticket', ...row });
      }
    } catch {}

    // User direct match
    try {
      const userRows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isVerified: users.isVerified,
        isSuspended: users.isSuspended,
        createdAt: users.createdAt,
      }).from(users).where(or(
        ilike(users.email, `%${query}%`),
        ilike(users.name, `%${query}%`),
        ilike(users.phone, `%${query}%`),
      )).limit(5);

      for (const row of userRows) {
        results.push({ type: 'user', label: 'User Account', ...row });
      }
    } catch {}

    res.json(formatResponse('success', 200, `Found ${results.length} results`, { results, query }));
  } catch (error: any) {
    logger.error('Lookup error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Lookup failed'));
  }
});

// =====================================================
// DEPARTMENT TAGGING
// =====================================================

router.put('/tickets/:id/department', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { departmentTag, linkedOrderId, linkedOrderType } = req.body;
    const agentId = req.userId!;

    const [ticket] = await db.select({ id: supportTickets.id })
      .from(supportTickets).where(eq(supportTickets.id, id)).limit(1);

    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    await db.update(supportTickets).set({
      departmentTag: departmentTag || null,
      linkedOrderId: linkedOrderId || null,
      linkedOrderType: linkedOrderType || null,
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, id));

    logger.info('Ticket department tagged', { ticketId: id, departmentTag, linkedOrderId, agentId });

    res.json(formatResponse('success', 200, 'Department tag updated', { departmentTag, linkedOrderId, linkedOrderType }));
  } catch (error: any) {
    logger.error('Tag department error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to tag department'));
  }
});

// =====================================================
// INTERNAL MESSAGES (cross-dept notes)
// =====================================================

router.get('/tickets/:id/internal-messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [ticket] = await db.select({ id: supportTickets.id })
      .from(supportTickets).where(eq(supportTickets.id, id)).limit(1);

    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    const messages = await db.select()
      .from(agentInternalMessages)
      .where(eq(agentInternalMessages.ticketId, id))
      .orderBy(asc(agentInternalMessages.createdAt));

    res.json(formatResponse('success', 200, 'Internal messages', { messages }));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to get internal messages'));
  }
});

router.post('/tickets/:id/internal-messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, toDepartment, linkedOrderId } = req.body;
    const agentId = req.userId!;

    if (!message?.trim() || !toDepartment) {
      return res.status(400).json(formatErrorResponse(400, 'Message and target department are required'));
    }

    const [ticket] = await db.select({ id: supportTickets.id })
      .from(supportTickets).where(eq(supportTickets.id, id)).limit(1);

    if (!ticket) return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));

    const [agentUser] = await db.select({ name: users.name })
      .from(users).where(eq(users.id, agentId)).limit(1);

    const [newMsg] = await db.insert(agentInternalMessages).values({
      ticketId: id,
      fromType: 'support_agent',
      fromId: agentId,
      fromName: agentUser?.name || 'Support Agent',
      toDepartment,
      message: message.trim(),
      linkedOrderId: linkedOrderId || null,
    }).returning();

    logger.info('Internal message sent', { ticketId: id, toDepartment, agentId });

    res.status(201).json(formatResponse('success', 201, 'Internal message sent', { message: newMsg }));
  } catch (error: any) {
    logger.error('Send internal message error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send internal message'));
  }
});

// =====================================================
// FRAUD ALERTS
// =====================================================

router.get('/fraud-alerts', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query as any;
    const result = await fraudService.getAlerts(parseInt(page), parseInt(limit), status);
    res.json(formatResponse('success', 200, 'Fraud alerts', result));
  } catch (error: any) {
    logger.error('Get fraud alerts error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get fraud alerts'));
  }
});

router.post('/fraud-alerts/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const agentId = req.userId!;

    await fraudService.resolveAlert(id, agentId, note || '');
    res.json(formatResponse('success', 200, 'Alert resolved'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to resolve alert'));
  }
});

router.post('/fraud-alerts/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agentId = req.userId!;

    await fraudService.dismissAlert(id, agentId);
    res.json(formatResponse('success', 200, 'Alert dismissed'));
  } catch (error: any) {
    res.status(500).json(formatErrorResponse(500, 'Failed to dismiss alert'));
  }
});

router.get('/queue/position/:ticketId', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId!;

    const [ticket] = await db.select({ userId: supportTickets.userId })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    if (!ticket || ticket.userId !== userId) {
      return res.status(404).json(formatErrorResponse(404, 'Ticket not found'));
    }

    const [entry] = await db.select()
      .from(supportQueue)
      .where(and(eq(supportQueue.ticketId, ticketId), eq(supportQueue.status, 'waiting')))
      .limit(1);

    if (!entry) {
      return res.json(formatResponse('success', 200, 'Not in queue', { inQueue: false, position: 0, estimatedWaitMinutes: 0 }));
    }

    const position = await getQueuePosition(ticketId);
    const estimatedWait = Math.max(2, position * 3);

    const [totalWaiting] = await db.select({ count: count() })
      .from(supportQueue)
      .where(eq(supportQueue.status, 'waiting'));

    res.json(formatResponse('success', 200, 'Queue position', {
      inQueue: true,
      position,
      estimatedWaitMinutes: estimatedWait,
      totalWaiting: Number(totalWaiting?.count || 0),
      joinedAt: entry.joinedAt,
      priority: entry.priority,
    }));
  } catch (error: any) {
    logger.error('Get queue position error', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to get queue position'));
  }
});

export default router;
