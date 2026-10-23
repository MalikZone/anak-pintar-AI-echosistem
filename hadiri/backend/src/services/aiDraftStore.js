import crypto from 'crypto';
import { ENV } from '../config/env.js';

/**
 * In-memory store for AI-generated request drafts awaiting employee confirmation (HITL step 1).
 *
 * Drafts are short-lived (default 30 minutes) and are NOT persisted to MySQL until the
 * employee explicitly confirms them from the Copilot Drawer or Telegram inline button.
 * A backend restart clears all pending drafts, so the user simply resends the message.
 */
class AiDraftStore {
  constructor() {
    this.drafts = new Map();
    this.ttlMs = Math.max(1, ENV.AI_DRAFT_TTL_MINUTES) * 60 * 1000;
  }

  purgeExpired() {
    const now = Date.now();
    for (const [id, entry] of this.drafts.entries()) {
      if (entry.expiresAt <= now) {
        this.drafts.delete(id);
      }
    }
  }

  save({ userId, tenantId, kind, intent, payload, channel, telegramChatId = null }) {
    this.purgeExpired();
    const id = `drf-${crypto.randomBytes(6).toString('hex')}`;
    const now = Date.now();
    const entry = {
      id,
      userId,
      tenantId,
      kind,
      intent,
      payload,
      channel,
      telegramChatId,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + this.ttlMs,
    };
    this.drafts.set(id, entry);
    return entry;
  }

  get(id) {
    if (!id) return null;
    const entry = this.drafts.get(id);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.drafts.delete(id);
      return null;
    }
    return entry;
  }

  remove(id) {
    return this.drafts.delete(id);
  }
}

export const aiDraftStore = new AiDraftStore();
export default aiDraftStore;

