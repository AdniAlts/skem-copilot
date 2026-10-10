# Deployment Vercel

Aplikasi dapat dideploy sebagai satu link Vercel: frontend Vite static dan Express API pada Vercel Functions. Supabase, Griphub, dan Telegram tetap layanan eksternal.

## Arsitektur

- `apps/web` dibangun menjadi static output `apps/web/dist`.
- `api/[...path].ts` mengekspos seluruh Express API pada `/api/*`.
- `api/cron/worker.ts` menjalankan satu siklus worker: recovery pekerjaan stale lalu proses submission queued.
- `api/cron/worker.ts` dijadwalkan oleh `vercel.json`.
- Telegram memakai webhook `POST /api/telegram/webhook`, bukan long polling.

## Deploy

1. Import repository ke Vercel.
2. Framework preset: **Other**.
3. Root Directory: repository root.
4. Build Command dan Output Directory sudah dikunci di `vercel.json`:
   ```text
   npm ci && npm run build -w @skem/web
   apps/web/dist
   ```
5. Isi environment variables untuk Production dan Preview:
   ```env
   SESSION_SECRET=<minimal 16 karakter>
   LLM_BASE_URL=https://griphubrouter.web.id/v1
   LLM_API_KEY=<Griphub key>
   LLM_MODEL=gpt-5.6-luna
   SUPABASE_URL=<project URL>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   DATABASE_URL=<Postgres URL>
   STORAGE_BUCKET_CERTIFICATES=certificates
   STORAGE_BUCKET_SIGNATURES=signatures
   STORAGE_BUCKET_FORMS=final-forms
   TELEGRAM_BOT_TOKEN=<BotFather token, optional>
   TELEGRAM_BOT_USERNAME=<username tanpa @, optional>
   TELEGRAM_WEBHOOK_SECRET=<token acak, optional>
   ```
6. Deploy ke Production.
7. Pastikan `https://<deployment>/api/health` mengembalikan `{"ok":true,"db":"ok"}`.

## Database dan storage

Sebelum demo, jalankan migrasi dan seed dari mesin lokal yang memakai environment Supabase target:

```bash
npm run db:migrate
npm run seed
```

Bucket `certificates`, `signatures`, dan `final-forms` harus ada dan privat.

## Telegram webhook

Setelah domain Production tersedia, jalankan sekali. Jangan masukkan token ke terminal history bersama atau repository.

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://<deployment>/api/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Lalu jalankan `/start <token>` lewat deep link dari endpoint `POST /api/me/telegram/link`.

## Worker cron

Vercel memanggil `GET /api/cron/worker` sesuai `vercel.json`. Route memverifikasi header `Authorization: Bearer $CRON_SECRET` jika Vercel menyediakannya. Fungsi memproses maksimal `rules.worker.concurrency` submission per invocation.

Untuk demo, setelah upload tunggu cron berikutnya lalu refresh batch/submission. Bila plan Vercel membatasi frekuensi cron, buka endpoint melalui Vercel Cron run atau gunakan plan yang mendukung jadwal pada `vercel.json`.

## Batas serverless

- Fungsi API dan worker dikonfigurasi maksimum 60 detik.
- PDF besar, render multi-halaman, atau respon LLM lambat bisa mencapai limit provider/plan.
- Vercel Cron dan serverless cocok untuk demo. Untuk volume produksi atau worker latency panjang, pindahkan worker ke layanan proses persistent.
