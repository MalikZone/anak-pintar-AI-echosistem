import { ENV } from '../../config/env.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Thin Telegram Bot API client (Outbound Adapter).
 * When TELEGRAM_BOT_TOKEN is empty (local development), calls are logged and skipped
 * so the webhook flow can be exercised end-to-end without a real bot.
 */
class TelegramClient {
  get isConfigured() {
    return Boolean(ENV.TELEGRAM_BOT_TOKEN);
  }

  async call(method, payload) {
    if (!this.isConfigured) {
      console.info(`[telegram] (dry) ${method}: ${JSON.stringify(payload).slice(0, 400)}`);
      return { ok: true, skipped: true, method, payload };
    }

    try {
      const response = await fetch(`${TELEGRAM_API_BASE}/bot${ENV.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!data.ok) {
        console.warn(`[telegram] ${method} failed: ${data.description || response.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[telegram] ${method} network error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  }

  sendMessage(chatId, html, { replyToMessageId = null, inlineKeyboard = null } = {}) {
    const payload = {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyToMessageId) {
      payload.reply_parameters = { message_id: replyToMessageId, allow_sending_without_reply: true };
    }
    if (inlineKeyboard) {
      payload.reply_markup = { inline_keyboard: inlineKeyboard };
    }
    return this.call('sendMessage', payload);
  }

  answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: String(text).slice(0, 190),
      show_alert: showAlert,
    });
  }

  clearInlineKeyboard(chatId, messageId) {
    return this.call('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  }
}

export const telegramClient = new TelegramClient();
export default telegramClient;

