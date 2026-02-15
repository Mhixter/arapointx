import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { db } from '../../config/database';
import { supportTickets, supportConversations, supportMessages, supportInternalNotes, users, adminUsers } from '../../db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { formatResponse, formatErrorResponse } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.use(authMiddleware);

// Get or create active ticket
router.post('/tickets/active', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Check for open ticket
    const [activeTicket] = await db.select()
      .from(supportTickets)
      .where(and(
        eq(supportTickets.userId, userId),
        or(eq(supportTickets.status, 'open'), eq(supportTickets.status, 'pending'))
      ))
      .limit(1);

    if (activeTicket) {
      const [conversation] = await db.select()
        .from(supportConversations)
        .where(eq(supportConversations.ticketId, activeTicket.id))
        .limit(1);
      
      return res.json(formatResponse('success', 200, 'Active ticket found', {
        ticket: activeTicket,
        conversationId: conversation?.id
      }));
    }

    // Create new ticket
    const [newTicket] = await db.insert(supportTickets).values({
      userId,
      status: 'open',
      priority: 'medium',
    }).returning();

    const [newConversation] = await db.insert(supportConversations).values({
      ticketId: newTicket.id,
    }).returning();

    res.status(201).json(formatResponse('success', 201, 'New ticket created', {
      ticket: newTicket,
      conversationId: newConversation.id
    }));
  } catch (error: any) {
    logger.error('Error getting/creating ticket', { error: error.message, userId: req.userId });
    res.status(500).json(formatErrorResponse(500, 'Failed to initialize support chat'));
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messages = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, id))
      .orderBy(supportMessages.createdAt);
    
    res.json(formatResponse('success', 200, 'Messages retrieved', messages));
  } catch (error: any) {
    logger.error('Error getting messages', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to load messages'));
  }
});

// Send message
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    // 1. Save user message
    const [userMessage] = await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'user',
      senderId: userId,
      content,
    }).returning();

    // 2. Update conversation timestamp
    await db.update(supportConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(supportConversations.id, id));

    // 3. Get history for AI context
    const history = await db.select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, id))
      .orderBy(desc(supportMessages.createdAt))
      .limit(10);

    const messagesForAI = history.reverse().map(m => ({
      role: m.senderType === 'user' ? 'user' : (m.senderType === 'ai' ? 'assistant' : 'system'),
      content: m.content
    }));

    // 4. Check if ticket is assigned to an agent
    const [conversation] = await db.select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id))
      .limit(1);
    
    const [ticket] = await db.select()
      .from(supportTickets)
      .where(eq(supportTickets.id, conversation.ticketId))
      .limit(1);

    if (ticket.assignedAgentId) {
      // Notify agent (mocked for now)
      return res.json(formatResponse('success', 200, 'Message sent, waiting for agent response', userMessage));
    }

    // 5. AI Response Logic
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are Arapoint Support AI. Help users with identity and education verification questions. If you cannot solve it or they ask for a human, escalate.' },
        ...messagesForAI as any
      ]
    });

    const aiContent = response.choices[0].message.content || 'I am sorry, I am having trouble responding right now.';
    
    // Save AI message
    await db.insert(supportMessages).values({
      conversationId: id,
      senderType: 'ai',
      content: aiContent,
    });

    // Check for escalation
    if (aiContent.toLowerCase().includes('escalate') || content.toLowerCase().includes('agent') || content.toLowerCase().includes('human')) {
      await db.update(supportTickets)
        .set({ status: 'pending', priority: 'high' })
        .where(eq(supportTickets.id, ticket.id));
    }

    res.json(formatResponse('success', 200, 'Message processed', { userMessage, aiResponse: aiContent }));
  } catch (error: any) {
    logger.error('Error processing message', { error: error.message });
    res.status(500).json(formatErrorResponse(500, 'Failed to send message'));
  }
});

export default router;
