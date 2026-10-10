import { createApp } from './app';
import { loadEnv } from './env';
import { recoverStaleJobs, startWorker } from './queue/worker.js';
import { startTelegramBot, stopTelegramBot } from './telegram/bot.js';

const env = loadEnv();

void recoverStaleJobs().then(() => {
  createApp().listen(env.PORT, () => {
    startWorker();
    startTelegramBot();
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
});

process.on('SIGTERM', () => {
  void stopTelegramBot().finally(() => process.exit(0));
});
process.on('SIGINT', () => {
  void stopTelegramBot().finally(() => process.exit(0));
});
