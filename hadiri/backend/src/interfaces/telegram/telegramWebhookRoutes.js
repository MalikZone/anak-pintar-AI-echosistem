import crypto from 'crypto';
import { Router } from 'express';
import { ENV } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { handleTelegramUpdate } from './telegramGateway.js';

const router = Router();
let warnedMissingSecret = false;

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Verifies Telegram's `X-Telegram-Bot-Api-Secret-Token` header (set via setWebhook secret_token).
 * Without a configured secret the webhook is only allowed outside production.
 */
const verifyTelegramSecret = (req, res, next) => {
  const expected = ENV.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    if (ENV.NODE_ENV === 'production') {
      return next(new AppError('assistant.telegram_webhook_forbidden', 403));
    }
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('[telegram] TELEGRAM_WEBHOOK_SECRET is empty — webhook accepted without verification (development only).');
    }
    return next();
  }

  const provided = req.headers['x-telegram-bot-api-secret-token'] || '';
  if (!safeEqual(provided, expected)) {
    return next(new AppError('assistant.telegram_webhook_forbidden', 403));
  }
  return next();
};

/**
 * POST /api/v1/telegram/webhook
 * Always answers 200 for verified requests so Telegram does not retry-storm on business errors.
 */
router.post('/webhook', verifyTelegramSecret, async (req, res) => {
  try {
    const result = await handleTelegramUpdate(req.body || {});
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[telegram] Unhandled webhook error:', err);
    return res.status(200).json({ success: false, data: { action: 'internal_error' } });
  }
});

export default router;

