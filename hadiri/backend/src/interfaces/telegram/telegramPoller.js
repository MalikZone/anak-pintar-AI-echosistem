import { ENV } from '../../config/env.js';
import { handleTelegramUpdate } from './telegramGateway.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

async function startPolling() {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is missing in hadiri/backend/.env');
    process.exit(1);
  }

  const botUrl = `${TELEGRAM_API_BASE}/bot${ENV.TELEGRAM_BOT_TOKEN}`;

  try {
    // 1. Verify Bot Token & Info
    const meRes = await fetch(`${botUrl}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      console.error('❌ Failed to getMe from Telegram:', meData.description);
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log(`🤖 HADIRIN TELEGRAM POLLER (DEV MODE)`);
    console.log(`   Bot Name: ${meData.result.first_name}`);
    console.log(`   Username: @${meData.result.username}`);
    console.log(`   Can Read All Group Messages: ${meData.result.can_read_all_group_messages ? '✅ YES' : '❌ NO'}`);
    console.log('======================================================');

    // 2. Clear any active webhook to allow polling
    await fetch(`${botUrl}/deleteWebhook?drop_pending_updates=false`);
    console.log('📡 Webhook cleared. Listening for incoming messages...\n');
  } catch (err) {
    console.error('❌ Connection error to Telegram:', err.message);
    process.exit(1);
  }

  let offset = 0;

  while (true) {
    try {
      const response = await fetch(`${botUrl}/getUpdates?offset=${offset}&timeout=25`, {
        signal: AbortSignal.timeout(35000),
      });

      const data = await response.json().catch(() => ({}));

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          const sender = update.message?.from?.username || update.message?.from?.first_name || update.callback_query?.from?.first_name || 'Unknown';
          const text = update.message?.text || update.callback_query?.data || '(non-text)';

          console.log(`📩 [Update #${update.update_id}] From: ${sender} | Text/Data: "${text}"`);

          const result = await handleTelegramUpdate(update);
          console.log(`   ↳ Gateway Action:`, result);
        }
      } else if (!data.ok) {
        console.warn('⚠️ getUpdates warning:', data.description);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      if (err.name !== 'TimeoutError') {
        console.warn('⚠️ Polling error (retrying in 3s):', err.message);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Graceful exit
process.on('SIGINT', () => {
  console.log('\n🛑 Poller stopped gracefully.');
  process.exit(0);
});

startPolling();

