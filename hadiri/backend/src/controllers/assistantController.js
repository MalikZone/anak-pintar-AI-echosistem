import { aiOrchestratorService } from '../services/aiOrchestratorService.js';
import { sendSuccess } from '../utils/responseHandler.js';

/**
 * POST /api/v1/assistant/chat
 * Web AI Copilot: identity is resolved deterministically from the JWT session (req.user).
 */
export const chat = async (req, res, next) => {
  try {
    const result = await aiOrchestratorService.handleMessage({
      user: req.user,
      text: req.body?.message,
      source: 'web_chat',
      lang: req.lang,
    });
    return sendSuccess(res, result, 'assistant.reply_ready');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/assistant/drafts/:draftId/confirm
 * Employee confirms the AI-generated draft → persisted via leaveService / overtimeService.
 */
export const confirmDraft = async (req, res, next) => {
  try {
    const result = await aiOrchestratorService.confirmDraft({
      user: req.user,
      draftId: req.params.draftId,
      lang: req.lang,
    });
    return sendSuccess(res, result, 'assistant.draft_confirmed', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/assistant/drafts/:draftId
 */
export const cancelDraft = async (req, res, next) => {
  try {
    const result = aiOrchestratorService.cancelDraft({ user: req.user, draftId: req.params.draftId });
    return sendSuccess(res, result, 'assistant.draft_cancelled');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/assistant/health
 */
export const health = async (req, res, next) => {
  try {
    const result = await aiOrchestratorService.getHealth();
    return sendSuccess(res, result, 'assistant.health_loaded');
  } catch (error) {
    next(error);
  }
};

