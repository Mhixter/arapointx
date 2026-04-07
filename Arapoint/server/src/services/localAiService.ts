import { db } from '../config/database';
import { aiKnowledgeBase, aiUnresolvedQueries, supportMessages } from '../db/schema';
import { eq, desc, sql as sqlExpr, and } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export interface AiMatch {
  answer: string;
  confidence: number;
  entryId: string;
  category: string;
}

export interface AiResult {
  matched: boolean;
  answer: string;
  confidence: number;
  shouldEscalate: boolean;
  entryId?: string;
}

const ESCALATION_TRIGGERS = [
  'refund', 'deducted', 'debited', 'charged without', 'not credited', 'stolen', 'hacked',
  'unauthorized', 'fraud', 'scam', 'locked', 'blocked', 'suspended', 'urgent',
  'complaint', 'frustrated', 'angry', 'unacceptable', 'legal', 'police', 'sue',
  'dispute', 'never received', 'double charge', 'overcharged',
];

const AGENT_KEYWORDS = ['agent', 'human', 'person', 'speak to', 'talk to', 'representative', 'manager', 'supervisor', 'live person', 'real person'];

const STOPWORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'can', 'shall', 'should', 'may', 'might', 'must', 'to', 'of', 'in', 'for', 'on',
  'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'the', 'a', 'an',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only',
  'same', 'than', 'too', 'very', 'just', 'now', 'then', 'also', 'any', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'own', 'while',
  'please', 'thanks', 'thank', 'hi', 'hello', 'dear', 'sir', 'madam',
]);

interface KbEntry {
  id: string;
  question: string;
  variations: string[];
  answer: string;
  category: string;
  tags: string[];
  tokens: string[];
  tfVector: Map<string, number>;
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return null;
  if (!_openai) {
    _openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are "Ara", Arapoint's friendly and knowledgeable AI support assistant for a Nigerian identity verification and services platform.

ABOUT ARAPOINT:
Arapoint provides: NIN/BVN identity verification, education verification (WAEC, NECO, NABTEB, NBAIS, JAMB), employment background checks, fraud scoring, airtime & data purchase, electricity & cable TV bill payments, wallet management, CAC business registration, and a developer API platform.

YOUR PERSONALITY:
- Warm, professional, and empathetic — like a helpful Nigerian customer service representative
- Understand Nigerian Pidgin English, slang, and informal language naturally
- Use clear, simple language — avoid overly formal or robotic responses
- Be concise but thorough — answer the question fully without unnecessary filler
- Show genuine care for the user's problem
- Use appropriate Nigerian context (Naira currency, local references, WAT timezone)

YOUR CAPABILITIES:
- Answer questions about all Arapoint services, pricing, and how things work
- Help users troubleshoot common issues (failed transactions, pending verifications, wallet problems)
- Guide users through processes (how to verify NIN, how to fund wallet, etc.)
- Understand follow-up questions in context of the conversation

ESCALATION RULES:
- If the user's issue involves money disputes (refunds, unauthorized charges, missing credits), include [ESCALATE] in your response
- If the user is clearly frustrated, angry, or mentions legal action, include [ESCALATE]
- If you genuinely cannot help with their specific account issue (you don't have access to their account data), include [ESCALATE]
- Do NOT escalate for simple informational questions — you can answer those yourself
- Do NOT escalate just because a question is unusual — try your best to help first

KNOWLEDGE BASE (use these as reference for accurate answers):
`;

class LocalAiService {
  private entries: KbEntry[] = [];
  private idf: Map<string, number> = new Map();
  private indexBuilt = false;
  private lastReload = 0;
  private RELOAD_INTERVAL_MS = 5 * 60 * 1000;
  private CONFIDENCE_THRESHOLD = 0.18;
  private kbSummary: string = '';

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOPWORDS.has(t));
  }

  private buildTfVector(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    const vec = new Map<string, number>();
    for (const [term, c] of freq) {
      vec.set(term, c / tokens.length);
    }
    return vec;
  }

  private applyIdf(tf: Map<string, number>): Map<string, number> {
    const result = new Map<string, number>();
    for (const [term, tfVal] of tf) {
      const idfVal = this.idf.get(term) || 0;
      result.set(term, tfVal * idfVal);
    }
    return result;
  }

  private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0, normA = 0, normB = 0;
    for (const [term, val] of a) {
      dot += val * (b.get(term) || 0);
      normA += val * val;
    }
    for (const [, val] of b) normB += val * val;
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private buildIdf(allEntries: KbEntry[]): void {
    const N = allEntries.length;
    const df = new Map<string, number>();
    for (const entry of allEntries) {
      const terms = new Set(entry.tokens);
      for (const term of terms) df.set(term, (df.get(term) || 0) + 1);
    }
    this.idf.clear();
    for (const [term, c] of df) {
      this.idf.set(term, Math.log((N + 1) / (c + 1)) + 1);
    }
  }

  private entryToTokens(entry: { question: string; variations: string[]; tags: string[] }): string[] {
    const combined = [
      entry.question,
      ...(entry.variations || []),
      ...(entry.tags || []),
    ].join(' ');
    return this.tokenize(combined);
  }

  private loadStaticKb(): KbEntry[] {
    try {
      const kbPath = path.join(process.cwd(), 'server', 'data', 'arapoint-knowledge-base.json');
      const raw = fs.readFileSync(kbPath, 'utf8');
      const kb = JSON.parse(raw);
      return (kb.entries || []).map((e: any) => {
        const tokens = this.entryToTokens(e);
        return {
          id: `static:${e.id}`,
          question: e.question,
          variations: e.variations || [],
          answer: e.answer,
          category: e.category,
          tags: e.tags || [],
          tokens,
          tfVector: this.buildTfVector(tokens),
        };
      });
    } catch (err) {
      logger.error('Failed to load static knowledge base', { error: err });
      return [];
    }
  }

  private async loadDbKb(): Promise<KbEntry[]> {
    try {
      const rows = await db.select().from(aiKnowledgeBase).where(eq(aiKnowledgeBase.isActive, true));
      return rows.map(row => {
        const variations = Array.isArray(row.variations) ? row.variations as string[] : [];
        const tags = Array.isArray(row.tags) ? row.tags as string[] : [];
        const tokens = this.entryToTokens({ question: row.question, variations, tags });
        return {
          id: `db:${row.id}`,
          question: row.question,
          variations,
          answer: row.answer,
          category: row.category,
          tags,
          tokens,
          tfVector: this.buildTfVector(tokens),
        };
      });
    } catch (err) {
      logger.error('Failed to load DB knowledge base', { error: err });
      return [];
    }
  }

  private buildKbSummary(entries: KbEntry[]): string {
    const nonGreeting = entries.filter(e => e.category !== 'greeting');
    const grouped = new Map<string, { q: string; a: string }[]>();
    for (const e of nonGreeting) {
      const cat = e.category || 'general';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push({ q: e.question, a: e.answer });
    }
    const parts: string[] = [];
    for (const [cat, items] of grouped) {
      parts.push(`\n## ${cat.toUpperCase()}`);
      for (const item of items.slice(0, 15)) {
        const shortAnswer = item.a.length > 300 ? item.a.substring(0, 300) + '...' : item.a;
        parts.push(`Q: ${item.q}\nA: ${shortAnswer}`);
      }
    }
    return parts.join('\n');
  }

  async rebuildIndex(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.indexBuilt && (now - this.lastReload) < this.RELOAD_INTERVAL_MS) return;

    const staticEntries = this.loadStaticKb();
    const dbEntries = await this.loadDbKb();
    const allEntries = [...staticEntries, ...dbEntries];

    this.buildIdf(allEntries);
    this.entries = allEntries.map(e => ({
      ...e,
      tfVector: this.applyIdf(e.tfVector),
    }));

    this.kbSummary = this.buildKbSummary(allEntries);
    this.indexBuilt = true;
    this.lastReload = now;
    logger.info('AI knowledge base index built', { totalEntries: this.entries.length });
  }

  findBestMatch(query: string): AiMatch | null {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return null;
    const queryTf = this.buildTfVector(queryTokens);
    const queryTfIdf = this.applyIdf(queryTf);

    let bestScore = 0;
    let bestEntry: KbEntry | null = null;

    for (const entry of this.entries) {
      const score = this.cosineSimilarity(queryTfIdf, entry.tfVector);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    if (!bestEntry || bestScore < this.CONFIDENCE_THRESHOLD) return null;

    return {
      answer: bestEntry.answer,
      confidence: bestScore,
      entryId: bestEntry.id,
      category: bestEntry.category,
    };
  }

  private findTopMatches(query: string, topN = 5): KbEntry[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];
    const queryTf = this.buildTfVector(queryTokens);
    const queryTfIdf = this.applyIdf(queryTf);

    const scored: { entry: KbEntry; score: number }[] = [];
    for (const entry of this.entries) {
      const score = this.cosineSimilarity(queryTfIdf, entry.tfVector);
      if (score > 0.05) scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN).map(s => s.entry);
  }

  detectEscalation(query: string): boolean {
    const lower = query.toLowerCase();
    return ESCALATION_TRIGGERS.some(kw => lower.includes(kw));
  }

  detectAgentRequest(query: string): boolean {
    const lower = query.toLowerCase();
    return AGENT_KEYWORDS.some(kw => lower.includes(kw));
  }

  private async getConversationHistory(conversationId: string, limit = 10): Promise<{ role: 'user' | 'assistant' | 'system'; content: string }[]> {
    try {
      const msgs = await db.select({
        senderType: supportMessages.senderType,
        content: supportMessages.content,
      })
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, conversationId))
        .orderBy(desc(supportMessages.createdAt))
        .limit(limit);

      return msgs.reverse().map(m => ({
        role: m.senderType === 'user' ? 'user' as const
          : m.senderType === 'ai' ? 'assistant' as const
          : 'system' as const,
        content: m.content,
      })).filter(m => m.role !== 'system');
    } catch {
      return [];
    }
  }

  private async processWithOpenAI(query: string, conversationId?: string): Promise<{ answer: string; shouldEscalate: boolean } | null> {
    const openai = getOpenAI();
    if (!openai) return null;

    try {
      const relevantEntries = this.findTopMatches(query, 5);
      let contextBlock = '';
      if (relevantEntries.length > 0) {
        contextBlock = '\n\nMOST RELEVANT KNOWLEDGE FOR THIS QUERY:\n';
        for (const e of relevantEntries) {
          contextBlock += `Q: ${e.question}\nA: ${e.answer}\n\n`;
        }
      }

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: SYSTEM_PROMPT + this.kbSummary + contextBlock },
      ];

      if (conversationId) {
        const history = await this.getConversationHistory(conversationId, 8);
        for (const h of history) {
          messages.push(h);
        }
      }

      messages.push({ role: 'user', content: query });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices?.[0]?.message?.content?.trim();
      if (!response) return null;

      const shouldEscalate = response.includes('[ESCALATE]');
      const cleanAnswer = response.replace(/\[ESCALATE\]/g, '').trim();

      return { answer: cleanAnswer, shouldEscalate };
    } catch (err: any) {
      logger.error('OpenAI support query failed', { error: err.message });
      return null;
    }
  }

  async processQuery(query: string, conversationId?: string, ticketId?: string): Promise<AiResult> {
    await this.rebuildIndex();

    if (this.detectAgentRequest(query)) {
      return {
        matched: false,
        answer: "I understand you'd like to speak with a human agent. Let me connect you now — please hold on.",
        confidence: 1,
        shouldEscalate: true,
      };
    }

    const hasEscalationTrigger = this.detectEscalation(query);

    const aiResult = await this.processWithOpenAI(query, conversationId);

    if (aiResult) {
      const shouldEscalate = aiResult.shouldEscalate || hasEscalationTrigger;
      let answer = aiResult.answer;
      if (hasEscalationTrigger && !aiResult.shouldEscalate) {
        answer += '\n\nI\'m also connecting you with a human agent who can look into your specific account details.';
      }
      return {
        matched: true,
        answer,
        confidence: 0.95,
        shouldEscalate,
      };
    }

    const match = this.findBestMatch(query);

    if (match && match.confidence >= this.CONFIDENCE_THRESHOLD) {
      await this.incrementUseCount(match.entryId);

      if (hasEscalationTrigger) {
        return {
          matched: true,
          answer: match.answer + '\n\nBased on your message, I am also connecting you with a human agent who can assist further.',
          confidence: match.confidence,
          shouldEscalate: true,
          entryId: match.entryId,
        };
      }

      return {
        matched: true,
        answer: match.answer,
        confidence: match.confidence,
        shouldEscalate: false,
        entryId: match.entryId,
      };
    }

    await this.saveUnresolved(query, conversationId, ticketId);

    return {
      matched: false,
      answer: "I'm not sure I have the exact answer for that, but let me connect you with a support agent who can help you right away.",
      confidence: match?.confidence || 0,
      shouldEscalate: true,
    };
  }

  private async incrementUseCount(entryId: string): Promise<void> {
    if (!entryId.startsWith('db:')) return;
    const id = entryId.replace('db:', '');
    try {
      await db.update(aiKnowledgeBase)
        .set({ useCount: sqlExpr`${aiKnowledgeBase.useCount} + 1` })
        .where(eq(aiKnowledgeBase.id, id));
    } catch {}
  }

  private async saveUnresolved(query: string, conversationId?: string, ticketId?: string): Promise<void> {
    try {
      await db.insert(aiUnresolvedQueries).values({
        query,
        conversationId: conversationId || null,
        ticketId: ticketId || null,
      });
    } catch (err) {
      logger.error('Failed to save unresolved query', { error: err });
    }
  }

  async addKnowledgeEntry(entry: {
    question: string;
    variations?: string[];
    answer: string;
    category: string;
    tags?: string[];
    addedBy?: string;
  }): Promise<string> {
    const [row] = await db.insert(aiKnowledgeBase).values({
      question: entry.question,
      variations: entry.variations || [],
      answer: entry.answer,
      category: entry.category,
      tags: entry.tags || [],
      addedBy: entry.addedBy || null,
      isActive: true,
    }).returning({ id: aiKnowledgeBase.id });

    await this.rebuildIndex(true);
    return row.id;
  }

  async updateKnowledgeEntry(id: string, updates: Partial<{
    question: string;
    variations: string[];
    answer: string;
    category: string;
    tags: string[];
    isActive: boolean;
  }>): Promise<void> {
    await db.update(aiKnowledgeBase).set({ ...updates, updatedAt: new Date() }).where(eq(aiKnowledgeBase.id, id));
    await this.rebuildIndex(true);
  }

  async deleteKnowledgeEntry(id: string): Promise<void> {
    await db.update(aiKnowledgeBase).set({ isActive: false, updatedAt: new Date() }).where(eq(aiKnowledgeBase.id, id));
    await this.rebuildIndex(true);
  }

  async resolveQuery(queryId: string, answer: string, addToKb: boolean, category: string, agentId: string): Promise<void> {
    const [query] = await db.select().from(aiUnresolvedQueries).where(eq(aiUnresolvedQueries.id, queryId)).limit(1);
    if (!query) return;

    let kbId: string | null = null;
    if (addToKb) {
      kbId = await this.addKnowledgeEntry({
        question: query.query,
        answer,
        category: category || 'general',
        addedBy: agentId,
      });
    }

    await db.update(aiUnresolvedQueries).set({
      isResolved: true,
      resolvedAnswer: answer,
      resolvedKbId: kbId,
      resolvedAt: new Date(),
      resolvedBy: agentId,
    }).where(eq(aiUnresolvedQueries.id, queryId));
  }

  async getUnresolvedQueries(limit = 50) {
    return db.select().from(aiUnresolvedQueries)
      .where(eq(aiUnresolvedQueries.isResolved, false))
      .orderBy(desc(aiUnresolvedQueries.createdAt))
      .limit(limit);
  }

  async getAllKnowledgeEntries() {
    return db.select().from(aiKnowledgeBase)
      .where(eq(aiKnowledgeBase.isActive, true))
      .orderBy(desc(aiKnowledgeBase.createdAt));
  }

  getIndexStats() {
    return {
      totalEntries: this.entries.length,
      indexBuilt: this.indexBuilt,
      lastReloaded: new Date(this.lastReload).toISOString(),
      staticEntries: this.entries.filter(e => e.id.startsWith('static:')).length,
      dbEntries: this.entries.filter(e => e.id.startsWith('db:')).length,
      openaiAvailable: !!getOpenAI(),
    };
  }
}

export const localAi = new LocalAiService();
