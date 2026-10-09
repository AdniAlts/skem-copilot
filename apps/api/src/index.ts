import { createApp } from './app';
import { loadEnv } from './env';

const env = loadEnv();

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
