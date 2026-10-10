import { Bot, webhookCallback } from 'grammy';
import { eq } from 'drizzle-orm';
import { loadEnv } from '../env.js';
import { createDb } from '../db/client.js';
import { users } from '../db/schema.js';

let botInstance: Bot | null = null;
let isRunning = false;

export function getTelegramBot(): Bot | null {
  const env = loadEnv();
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  if (!botInstance) {
    botInstance = new Bot(env.TELEGRAM_BOT_TOKEN);
    setupBotHandlers(botInstance);
  }
  return botInstance;
}

export function setTelegramBotForTest(bot: Bot | null): void {
  botInstance = bot;
}

export function setupBotHandlers(bot: Bot): void {
  bot.command('start', async (ctx) => {
    const token = ctx.match?.trim();
    if (!token) {
      await ctx.reply(
        'Halo! Ini adalah bot notifikasi SKEM AI Co-Pilot.\n\n' +
          'Untuk menghubungkan akun Anda, buka menu profil di aplikasi SKEM dan klik tombol "Hubungkan Telegram".',
      );
      return;
    }

    const { client, db } = createDb();
    try {
      const [user] = await db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.telegramLinkToken, token))
        .limit(1);

      if (!user) {
        await ctx.reply(
          'Token tautan tidak valid atau sudah kedaluwarsa.\n\n' +
            'Silakan buat tautan baru melalui profil di aplikasi SKEM.',
        );
        return;
      }

      await db
        .update(users)
        .set({
          telegramChatId: String(ctx.chat.id),
          telegramLinkToken: null,
        })
        .where(eq(users.id, user.id));

      await ctx.reply(
        `Halo ${user.name}!\n\n` +
          'Akun SKEM Anda berhasil terhubung dengan Telegram. ' +
          'Anda akan menerima notifikasi setiap kali ada keputusan dari Verifikator atau Validator.',
      );
    } catch (err) {
      console.error('Gagal menghubungkan akun Telegram:', err);
      await ctx.reply('Terjadi kesalahan saat menghubungkan akun. Silakan coba lagi nanti.');
    } finally {
      await client.end();
    }
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Bot Notifikasi SKEM AI Co-Pilot\n\n' +
        '/start - Info atau tautkan akun dengan token\n' +
        '/help - Bantuan perintah bot',
    );
  });

  bot.catch((err) => {
    console.error('Telegram bot error:', err);
  });
}

export function telegramWebhookHandler() {
  const bot = getTelegramBot();
  if (!bot) return null;
  const secretToken = loadEnv().TELEGRAM_WEBHOOK_SECRET || undefined;
  return webhookCallback(bot, 'express', { secretToken });
}

export function startTelegramBot(): void {
  const bot = getTelegramBot();
  if (!bot) {
    console.log('Telegram bot dinonaktifkan (TELEGRAM_BOT_TOKEN kosong).');
    return;
  }
  if (isRunning) return;

  isRunning = true;
  bot
    .start({
      onStart: (botInfo) => {
        console.log(`Telegram bot @${botInfo.username} berjalan (long polling).`);
      },
    })
    .catch((err) => {
      console.error('Telegram bot gagal start:', err);
      isRunning = false;
    });
}

export async function stopTelegramBot(): Promise<void> {
  if (botInstance && isRunning) {
    try {
      await botInstance.stop();
    } catch (err) {
      console.error('Error stopping Telegram bot:', err);
    } finally {
      isRunning = false;
    }
  }
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const bot = getTelegramBot();
  if (!bot) throw new Error('Telegram bot is not configured');
  await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' });
}
