import { userRepository } from '../../repositories/UserRepository.js';
import { aiOrchestratorService } from '../../services/aiOrchestratorService.js';
import { AppError } from '../../utils/appError.js';
import { t } from '../../utils/i18n.js';
import { telegramClient, escapeHtml } from './telegramClient.js';

const CALLBACK_CONFIRM = 'ai:c:';
const CALLBACK_CANCEL = 'ai:x:';

const resolveLang = (from) => (String(from?.language_code || '').toLowerCase().startsWith('en') ? 'en' : 'id');
const isPrivateChat = (chat) => chat?.type === 'private';
const errorText = (err, lang) =>
  err instanceof AppError ? t(err.message, lang, err.params) : t('system.internal_error', lang);

const unlinkedNoticeSent = new Set();

/**
 * Deterministic Identity Resolution (Zero AI Guesswork):
 * message.from.id → hadirin.users.telegram_id (numeric ID first, then @username fallback).
 */
async function resolveEmployee(from) {
  if (!from?.id) return null;
  const byId = await userRepository.findByTelegramId(String(from.id));
  if (byId) return byId;
  if (from.username) {
    return userRepository.findByTelegramId(from.username);
  }
  return null;
}

function formatDraftCard(result, user, lang) {
  const f = result.draft.fields;
  const isEn = lang === 'en';
  const lines = [`📝 <b>${isEn ? 'AI REQUEST DRAFT' : 'DRAF PENGAJUAN AI'}</b>`, `• ${isEn ? 'Employee' : 'Pemohon'}: <b>${escapeHtml(user.name)}</b>`];

  if (result.kind === 'leave') {
    lines.push(
      `• ${isEn ? 'Type' : 'Jenis'}: ${escapeHtml(f.typeLabel)}`,
      `• ${isEn ? 'Period' : 'Periode'}: <code>${f.startDate}</code> s/d <code>${f.endDate}</code> (${f.totalDays} ${isEn ? 'days' : 'hari'})`
    );
  } else {
    lines.push(
      `• ${isEn ? 'Date' : 'Tanggal'}: <code>${f.date}</code>`,
      `• ${isEn ? 'Time' : 'Jam'}: <code>${f.startTime}–${f.endTime}</code> (${f.durationHours} ${isEn ? 'hours' : 'jam'})`
    );
  }
  lines.push(
    `• ${isEn ? 'Reason' : 'Alasan'}: <i>${escapeHtml(f.reason)}</i>`,
    `• Intent: <code>${result.intent}</code> (${Math.round(result.confidence * 100)}%)`,
    '',
    escapeHtml(result.reply)
  );
  return lines.join('\n');
}

function formatAnswer(result) {
  const lines = [escapeHtml(result.reply)];
  (result.sources || []).forEach((src) => {
    lines.push('', `📘 <b>${escapeHtml(src.title)}</b>`, escapeHtml(src.snippet));
  });
  return lines.join('\n');
}

async function handleTextMessage(message) {
  const { chat, from } = message;
  const text = String(message.text || '').trim();
  const lang = resolveLang(from);

  if (!text || from?.is_bot) return { action: 'skipped_non_text' };

  // /start & /help: expose the numeric Telegram ID so the employee can link it from the Profile page
  if (/^\/(start|help|id)\b/i.test(text)) {
    const html =
      lang === 'en'
        ? `👋 Hadirin AI Assistant\nYour Telegram ID: <code>${from.id}</code>\nFill it in the Profile menu of Hadirin Web to link your account.`
        : `👋 Asisten AI Hadirin\nTelegram ID Anda: <code>${from.id}</code>\nIsikan ID ini pada menu Profil di Hadirin Web untuk menautkan akun Anda.`;
    await telegramClient.sendMessage(chat.id, html, { replyToMessageId: message.message_id });
    return { action: 'help_sent', telegramId: String(from.id) };
  }

  const user = await resolveEmployee(from);
  if (!user) {
    const noticeKey = `${chat.id}:${from.id}`;
    if (isPrivateChat(chat) || !unlinkedNoticeSent.has(noticeKey)) {
      unlinkedNoticeSent.add(noticeKey);
      await telegramClient.sendMessage(
        chat.id,
        escapeHtml(t('assistant.telegram_unlinked', lang, { telegramId: from.id })),
        { replyToMessageId: message.message_id }
      );
      return { action: 'unlinked_notice_sent', telegramId: String(from.id) };
    }
    return { action: 'unlinked_silent', telegramId: String(from.id) };
  }

  let result;
  try {
    result = await aiOrchestratorService.handleMessage({
      user,
      text,
      source: 'telegram',
      lang,
      telegramId: String(from.id),
      chatId: chat.id,
      messageId: message.message_id,
    });
  } catch (err) {
    console.warn(`[telegram] handleMessage failed for user ${user.id}: ${err.message}`);
    if (isPrivateChat(chat)) {
      await telegramClient.sendMessage(chat.id, escapeHtml(errorText(err, lang)), {
        replyToMessageId: message.message_id,
      });
    }
    return { action: 'error', userId: user.id, error: err.message };
  }

  // Noise filtering: stay silent in group chats for non-actionable chatter
  if (result.type === 'ignored') {
    if (isPrivateChat(chat)) {
      await telegramClient.sendMessage(chat.id, escapeHtml(result.reply), { replyToMessageId: message.message_id });
    }
    return { action: 'ignored', userId: user.id, intent: result.intent, confidence: result.confidence };
  }

  if (result.type === 'draft') {
    const isEn = lang === 'en';
    await telegramClient.sendMessage(chat.id, formatDraftCard(result, user, lang), {
      replyToMessageId: message.message_id,
      inlineKeyboard: [
        [
          { text: isEn ? '✅ Submit Request' : '✅ Kirim Pengajuan', callback_data: `${CALLBACK_CONFIRM}${result.draft.id}` },
          { text: isEn ? '❌ Cancel' : '❌ Batal', callback_data: `${CALLBACK_CANCEL}${result.draft.id}` },
        ],
      ],
    });
    return { action: 'draft_card_sent', userId: user.id, intent: result.intent, draftId: result.draft.id };
  }

  await telegramClient.sendMessage(chat.id, formatAnswer(result), { replyToMessageId: message.message_id });
  return { action: `${result.type}_sent`, userId: user.id, intent: result.intent, kind: result.kind };
}

async function handleCallbackQuery(callbackQuery) {
  const { id, from, data, message } = callbackQuery;
  const lang = resolveLang(from);
  const isConfirm = String(data || '').startsWith(CALLBACK_CONFIRM);
  const isCancel = String(data || '').startsWith(CALLBACK_CANCEL);
  if (!isConfirm && !isCancel) {
    await telegramClient.answerCallbackQuery(id);
    return { action: 'callback_ignored' };
  }

  const draftId = String(data).slice(CALLBACK_CONFIRM.length);
  const user = await resolveEmployee(from);
  if (!user) {
    await telegramClient.answerCallbackQuery(id, t('assistant.telegram_unlinked', lang, { telegramId: from.id }), true);
    return { action: 'callback_unlinked', telegramId: String(from.id) };
  }

  try {
    if (isCancel) {
      aiOrchestratorService.cancelDraft({ user, draftId });
      await telegramClient.answerCallbackQuery(id, t('assistant.draft_cancelled', lang));
      if (message) {
        await telegramClient.clearInlineKeyboard(message.chat.id, message.message_id);
        await telegramClient.sendMessage(message.chat.id, `❌ ${escapeHtml(t('assistant.draft_cancelled', lang))}`);
      }
      return { action: 'draft_cancelled', userId: user.id, draftId };
    }

    const result = await aiOrchestratorService.confirmDraft({ user, draftId, lang });
    await telegramClient.answerCallbackQuery(id, t('assistant.draft_confirmed', lang));
    if (message) {
      await telegramClient.clearInlineKeyboard(message.chat.id, message.message_id);
      await telegramClient.sendMessage(message.chat.id, `✅ ${escapeHtml(result.reply)}`);
    }
    return { action: 'draft_confirmed', userId: user.id, draftId, recordId: result.record?.id };
  } catch (err) {
    // Ownership check in confirmDraft blocks other group members from approving someone else's draft
    await telegramClient.answerCallbackQuery(id, errorText(err, lang), true);
    return { action: 'callback_error', userId: user.id, draftId, error: err.message };
  }
}

/**
 * Telegram Gateway entrypoint (Inbound Adapter) for a single Bot API Update object.
 */
export async function handleTelegramUpdate(update) {
  if (update?.callback_query) return handleCallbackQuery(update.callback_query);
  // edited_message is intentionally ignored to avoid generating duplicate drafts
  const message = update?.message;
  if (message) return handleTextMessage(message);
  return { action: 'unsupported_update' };
}

export default { handleTelegramUpdate };
