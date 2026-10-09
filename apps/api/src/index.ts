import { createApp } from './app';

// Validasi env lengkap (zod) menyusul di BE-01.
const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT ?? DEFAULT_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
