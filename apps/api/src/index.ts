import { createApp } from './app';
import { loadEnv } from './env';
import { recoverStaleJobs, startWorker } from './queue/worker.js';

const env = loadEnv();

void recoverStaleJobs().then(() => {
  createApp().listen(env.PORT, () => {
    startWorker();
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
