import { ENV } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { t } from '../utils/i18n.js';
import { leaveService } from './leaveService.js';
import { overtimeService } from './overtimeService.js';
import { aiDraftStore } from './aiDraftStore.js';
import { LEAVE_TYPES, OVERTIME_TYPES } from '../config/constants.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_OVERTIME_HOURS_PER_DAY = 4;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^\d{2}:\d{2}$/;

/**
 * Maps Gatekeeper intent taxonomy (AI-shared-orchestration/rag-gatekeeper/app/domains/hadirin/intents.py)
 * to the Hadirin business capability handled by this backend.
 */
const INTENT_KIND = {
  ANNUAL_LEAVE_REQUEST: 'leave',
  SICK_LEAVE_REPORT: 'leave',
  OVERTIME_CLAIM: 'overtime',
  SHIFT_SWAP_REQUEST: 'shift_swap',
  ATTENDANCE_STATUS_QUERY: 'quota',
  POLICY_HR_QUERY: 'policy',
};

const LEAVE_TYPE_LABELS = {
  id: { annual: 'Cuti Tahunan', sick: 'Izin Sakit', special: 'Izin Khusus' },
  en: { annual: 'Annual Leave', sick: 'Sick Leave', special: 'Special Leave' },
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * AI Orchestrator Service — Hadirin client for the Layer 1 RAG & Intent Gatekeeper (FastAPI :8000).
 *
 * Responsibilities (Clean Architecture boundary):
 *  1. Build deterministic sender metadata from an already-authenticated Hadirin user
 *     (JWT session for Web Copilot, or users.telegram_id lookup for Telegram).
 *  2. Ask the Gatekeeper for semantic intent + structured draft extraction (Mock / Ollama LLM adapter).
 *  3. Convert actionable intents into short-lived drafts that the employee must confirm (HITL step 1).
 *  4. Persist confirmed drafts ONLY through existing domain services (leaveService / overtimeService),
 *     so quota checks, approval hierarchy and leader notifications (HITL step 2) stay in one place.
 */
class AiOrchestratorService {
  buildSenderMetadata(user, { telegramId = null, chatId = null, messageId = null } = {}) {
    return {
      telegram_id: telegramId || user.telegramId || null,
      user_id: user.id,
      sender_name: user.name,
      tenant_id: user.tenantId,
      department: user.department || 'Umum',
      position: user.position || 'Staff',
      role: String(user.role || 'employee').toUpperCase(),
      remaining_leave_quota: Number(user.leaveBalance?.remainingAnnual ?? 0),
      leader_id: user.leaderId || null,
      chat_id: chatId,
      message_id: messageId,
    };
  }

  async callGatekeeper(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ENV.AI_GATEKEEPER_TIMEOUT_MS);
    try {
      const response = await fetch(`${ENV.AI_GATEKEEPER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.warn(`[aiOrchestrator] Gatekeeper ${path} responded ${response.status}: ${detail.slice(0, 300)}`);
        throw new AppError('assistant.gatekeeper_unavailable', 503);
      }
      return await response.json();
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn(`[aiOrchestrator] Gatekeeper ${path} unreachable: ${err.message}`);
      throw new AppError('assistant.gatekeeper_unavailable', 503);
    } finally {
      clearTimeout(timer);
    }
  }

  async getHealth() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${ENV.AI_GATEKEEPER_URL}/health`, { signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      return {
        gatekeeperUrl: ENV.AI_GATEKEEPER_URL,
        online: response.ok,
        llmProvider: data.llm_provider || null,
        qdrantConnected: data.qdrant_connected ?? null,
        embeddingModel: data.embedding_model || null,
        telegramBotConfigured: Boolean(ENV.TELEGRAM_BOT_TOKEN),
      };
    } catch (err) {
      return {
        gatekeeperUrl: ENV.AI_GATEKEEPER_URL,
        online: false,
        error: err.message,
        telegramBotConfigured: Boolean(ENV.TELEGRAM_BOT_TOKEN),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  normalizeLeaveDraft(extracted, intent, lang) {
    const rawType = String(extracted.leave_type || '').toUpperCase();
    let type = LEAVE_TYPES.ANNUAL;
    if (rawType === 'SICK' || intent === 'SICK_LEAVE_REPORT') type = LEAVE_TYPES.SICK;
    else if (rawType === 'SPECIAL') type = LEAVE_TYPES.SPECIAL;

    const startDate = ISO_DATE.test(String(extracted.start_date || '')) ? extracted.start_date : todayIso();
    let endDate = ISO_DATE.test(String(extracted.end_date || '')) ? extracted.end_date : startDate;
    if (endDate < startDate) endDate = startDate;

    const spanDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    const totalDays = Math.max(1, Number.parseInt(extracted.total_days, 10) || spanDays);

    return {
      type,
      typeLabel: (LEAVE_TYPE_LABELS[lang] || LEAVE_TYPE_LABELS.id)[type],
      startDate,
      endDate,
      totalDays,
      reason: String(extracted.reason || '').trim().slice(0, 500) || '-',
    };
  }

  normalizeOvertimeDraft(extracted) {
    const date = ISO_DATE.test(String(extracted.date || '')) ? extracted.date : todayIso();
    const startTime = HH_MM.test(String(extracted.start_time || '')) ? extracted.start_time : '17:00';
    const endTime = HH_MM.test(String(extracted.end_time || '')) ? extracted.end_time : '19:00';
    const durationHours = Math.max(0.5, Number(extracted.duration_hours) || 2);
    const type =
      String(extracted.overtime_type || '').toUpperCase() === 'HOLIDAY'
        ? OVERTIME_TYPES.HOLIDAY_OFFDAY
        : OVERTIME_TYPES.POST_SHIFT;

    return {
      type,
      date,
      startTime,
      endTime,
      durationHours,
      reason: String(extracted.reason || '').trim().slice(0, 500) || '-',
    };
  }

  publicDraft(entry) {
    return {
      id: entry.id,
      kind: entry.kind,
      intent: entry.intent,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      fields: entry.payload,
    };
  }

  async retrievePolicies(text) {
    const res = await this.callGatekeeper('/gatekeeper/retrieve', { query: text, limit: 6 });
    return (res.results || [])
      .filter((hit) => hit?.payload?.title && hit?.payload?.category)
      .slice(0, 2)
      .map((hit) => ({
        title: hit.payload.title,
        category: hit.payload.category,
        snippet: String(hit.payload.text || '').slice(0, 320),
        score: Number(hit.score?.toFixed?.(4) ?? hit.score),
      }));
  }

  /**
   * Process a natural-language message from Web Copilot or Telegram.
   * @returns {Promise<{type: string, kind: string|null, intent: string, confidence: number, reply: string, draft: object|null, sources: Array, latencyMs: number}>}
   */
  async handleMessage({ user, text, source = 'web_chat', lang = 'id', telegramId = null, chatId = null, messageId = null }) {
    const cleanText = String(text || '').trim();
    if (!cleanText) throw new AppError('assistant.message_required', 400);
    if (cleanText.length > MAX_MESSAGE_LENGTH) {
      throw new AppError('assistant.message_too_long', 400, { max: MAX_MESSAGE_LENGTH });
    }

    const gk = await this.callGatekeeper('/gatekeeper/process-input', {
      id: `msg-${source}-${Date.now()}`,
      text: cleanText,
      source,
      domain: 'hadirin',
      metadata: this.buildSenderMetadata(user, { telegramId, chatId, messageId }),
      threshold: ENV.AI_INTENT_THRESHOLD,
    });

    const intent = gk.intent || 'UNKNOWN';
    const base = {
      intent,
      confidence: Number(gk.confidence || 0),
      latencyMs: Number(gk.latency_ms || 0),
      draft: null,
      sources: [],
    };
    const kind = gk.is_actionable ? INTENT_KIND[intent] : null;

    if (!kind) {
      return { ...base, type: 'ignored', kind: null, reply: t('assistant.reply_ignored', lang) };
    }

    const extracted =
      gk.temporal_payload?.input?.extracted_draft || gk.node_7_augmented_prompt?.extracted_draft_preview || {};

    if (kind === 'leave') {
      const draft = this.normalizeLeaveDraft(extracted, intent, lang);
      const remaining = Number(user.leaveBalance?.remainingAnnual ?? 0);
      if (draft.type === LEAVE_TYPES.ANNUAL && draft.totalDays > remaining) {
        return {
          ...base,
          type: 'rejected',
          kind,
          reply: t('assistant.reply_quota_insufficient', lang, { remaining, requested: draft.totalDays }),
        };
      }
      const entry = aiDraftStore.save({
        userId: user.id,
        tenantId: user.tenantId,
        kind,
        intent,
        payload: draft,
        channel: source,
        telegramChatId: chatId,
      });
      return {
        ...base,
        type: 'draft',
        kind,
        draft: this.publicDraft(entry),
        reply: t('assistant.reply_leave_draft', lang, draft),
      };
    }

    if (kind === 'overtime') {
      const draft = this.normalizeOvertimeDraft(extracted);
      if (draft.durationHours > MAX_OVERTIME_HOURS_PER_DAY) {
        return {
          ...base,
          type: 'rejected',
          kind,
          reply: t('assistant.reply_overtime_exceeded', lang, { durationHours: draft.durationHours }),
        };
      }
      const entry = aiDraftStore.save({
        userId: user.id,
        tenantId: user.tenantId,
        kind,
        intent,
        payload: draft,
        channel: source,
        telegramChatId: chatId,
      });
      return {
        ...base,
        type: 'draft',
        kind,
        draft: this.publicDraft(entry),
        reply: t('assistant.reply_overtime_draft', lang, draft),
      };
    }

    if (kind === 'quota') {
      const lb = user.leaveBalance || {};
      return {
        ...base,
        type: 'answer',
        kind,
        reply: t('assistant.reply_quota_info', lang, {
          name: user.name,
          remaining: lb.remainingAnnual ?? 0,
          total: lb.annualTotal ?? 12,
          used: lb.annualUsed ?? 0,
          sick: lb.sickTotal ?? 14,
        }),
      };
    }

    if (kind === 'policy') {
      const sources = await this.retrievePolicies(cleanText);
      return {
        ...base,
        type: 'answer',
        kind,
        sources,
        reply: t(sources.length ? 'assistant.reply_policy_found' : 'assistant.reply_policy_empty', lang),
      };
    }

    return { ...base, type: 'answer', kind, reply: t('assistant.reply_shift_swap', lang) };
  }

  getOwnedDraft(user, draftId) {
    if (!draftId) throw new AppError('assistant.draft_required', 400);
    const entry = aiDraftStore.get(draftId);
    if (!entry) throw new AppError('assistant.draft_not_found', 404);
    if (entry.userId !== user.id || entry.tenantId !== user.tenantId) {
      throw new AppError('assistant.draft_forbidden', 403);
    }
    return entry;
  }

  /**
   * Employee confirmed the AI draft → persist via the existing domain services.
   * leaveService/overtimeService re-validate quota & hierarchy and notify the leader (HITL step 2).
   */
  async confirmDraft({ user, draftId, lang = 'id' }) {
    const entry = this.getOwnedDraft(user, draftId);
    const p = entry.payload;

    let record;
    let reply;
    if (entry.kind === 'leave') {
      record = await leaveService.createLeaveRequest({
        userId: user.id,
        tenantId: user.tenantId,
        type: p.type,
        typeLabel: p.typeLabel,
        startDate: p.startDate,
        endDate: p.endDate,
        totalDays: p.totalDays,
        reason: p.reason,
        attachmentUrl: null,
      });
      reply = t('assistant.reply_leave_submitted', lang, {
        typeLabel: record.typeLabel || p.typeLabel,
        startDate: p.startDate,
        endDate: p.endDate,
        status: record.status,
      });
    } else {
      record = await overtimeService.createOvertimeRequest({
        userId: user.id,
        tenantId: user.tenantId,
        type: p.type,
        date: p.date,
        startTime: p.startTime,
        endTime: p.endTime,
        durationHours: p.durationHours,
        reason: p.reason,
      });
      reply = t('assistant.reply_overtime_submitted', lang, {
        date: p.date,
        durationHours: p.durationHours,
        status: record.status,
      });
    }

    aiDraftStore.remove(entry.id);
    return { kind: entry.kind, record, reply };
  }

  cancelDraft({ user, draftId }) {
    const entry = this.getOwnedDraft(user, draftId);
    aiDraftStore.remove(entry.id);
    return { id: entry.id, cancelled: true };
  }
}

export const aiOrchestratorService = new AiOrchestratorService();
export default aiOrchestratorService;

