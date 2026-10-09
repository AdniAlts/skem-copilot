# AGENTS.md — aturan untuk AI coding agent

Berkas ini dibaca otomatis oleh OpenCode (dan diimpor `CLAUDE.md`). Ditulis untuk agent: ringkas, wajib dipatuhi.

## 1. Produk dalam 5 baris
SKEM AI Co-Pilot = *AI first-pass reviewer* pengajuan SKEM (kredit ekstrakurikuler PENS, syarat lulus 3,0).
Mahasiswa unggah ≤10 PDF sertifikat → worker server membaca, memeriksa, mengestimasi kredit dari tabel → kartu Ready / Perlu perbaikan / Bermasalah.
Formulir FM.MHS.PENGAJUANSKEM terisi otomatis; mahasiswa mengedit metadata, e-sign, lalu Ajukan.
Verifikator (dosen wali, per kelas) hanya Setujui (e-sign) atau Tolak (alasan) → otomatis PDF final → Validator: Validasi/Tolak, boleh ubah kredit final dengan alasan.
Keputusan akhir selalu manusia. Acuan: [`docs/PRD.md`](docs/PRD.md) (produk), [`ARCHITECTURE.md`](ARCHITECTURE.md) (teknis), [`docs/API.md`](docs/API.md) (kontrak).

## 2. Aturan keras (pelanggaran = bug, PR ditolak)
1. **Tidak ada rahasia di repo.** Kunci hanya di `.env` (di-ignore). Jangan menulis kunci di kode, tes, issue, PR, atau log. Jangan meminta manusia menempelkan kunci ke percakapan.
2. **LLM tidak pernah menghasilkan skor kredit.** Kredit hanya dari `lookup_credit_table` (`data/credit_table.json`). Skema output LLM tidak boleh punya field kredit. Kombinasi tidak ada → jangan menebak, tampilkan pesan.
3. **Semua panggilan LLM lewat `apps/api/src/llm/client.ts`** yang mencatat ke tabel `llm_calls` (token, latensi, error). Tidak ada SDK/fetch LLM di tempat lain. Jangan simpan isi prompt/respons di log.
4. **Verifikator baca-saja**: hanya Setujui atau Tolak. Tidak ada endpoint/kontrol edit untuk Verifikator. Tolak tanpa alasan → ditolak di UI **dan** API.
5. **Hanya Validator** yang bisa mengubah **kredit final**, dengan alasan wajib dan tercatat (`reviews.adjust_credit`). Tidak ada perubahan lain oleh Validator.
6. **Identitas mahasiswa** (nama, NRP, prodi, departemen) selalu dari akun login, tidak bisa diedit. `class_id` dari profil, bukan dari klien.
7. **Verifikator hanya melihat kelasnya.** Akses kelas lain → 404.
8. **Seluruh proses online.** Tidak ada cetak formulir untuk ditandatangani, unggah formulir bertanda tangan, atau tanda tangan basah.
9. **Tidak ada aksi tanpa staf**: pesan (Telegram/in-app ke pihak lain), perubahan status setelah diajukan, dan persetujuan hanya terjadi akibat tindakan staf/mahasiswa, tidak pernah otomatis oleh AI.
10. **Data dummy saja.** Tidak ada data pribadi asli di repo, seed, test set, atau screenshot.
11. **Antarmuka dan pesan error untuk pengguna dalam Bahasa Indonesia.** Nama kode, API, tabel dalam bahasa Inggris.
12. Browser tidak pernah mengakses Supabase langsung. File tanda tangan privat: tidak ada URL publik/signed untuk tanda tangan orang lain.

## 3. Peta repo dan perintah
```
apps/web          @skem/web    React + Vite + React Router + TanStack Query
apps/api          @skem/api    Express; routes/ services/ agent/ rules/ llm/ reader/ pdf/ queue/ telegram/ db/
packages/shared   @skem/shared enum, zod schema, tipe API (sumber kebenaran kontrak)
data/             credit_table.json, guideline_sections.json, rules.json, seed/, testset/
scripts/          eval.ts, validate-data.ts
docs/             PRD.md, API.md, ui-spec.md (acuan layar final), design-prompts/ (riwayat)
```
| Perintah | Fungsi |
|---|---|
| `npm install` | pasang semua workspace |
| `npm run dev` | API :3000 + web :5173 (proxy `/api`) |
| `npm run dev:api` / `npm run dev:web` | jalankan satu sisi |
| `npm test` | Vitest semua workspace |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` per workspace |
| `npm run format` | Prettier (tulis ulang) |
| `npm run db:generate` / `npm run db:migrate` | buat / terapkan migrasi Drizzle |
| `npm run seed` | data dummy kelas & akun |
| `npm run data:validate` | validasi `data/*.json` dengan zod |
| `npm run eval [-- --split=heldout]` | evaluasi test set (memanggil gateway, memakan token) |
| `npm run build` | build produksi web (API dijalankan dengan `npm run start -w @skem/api`) |
Node.js ≥ 22. Perintah yang belum diimplementasi mencetak "belum diimplementasi" beserta issue yang akan mengisinya; isi lewat issue itu, jangan membuat versi sendiri.
`@skem/shared` dipakai langsung dari `src/*.ts` (tanpa build); jangan menambah langkah build untuk paket itu.

## 4. Konvensi kode
- TypeScript `strict`. Tanpa `any`; jika terpaksa, `// eslint-disable-next-line` + alasan.
- **zod di setiap batas**: body/query HTTP, `process.env` (`env.ts`), keluaran JSON LLM, file `data/*.json`.
- Tipe dan enum bersama hanya dari `@skem/shared`. Jangan menduplikasi tipe API di web/api.
- Nilai enum persis seperti ARCHITECTURE §3.1 (mis. `needs_fix`, `waiting_verifier`). Jangan membuat sinonim.
- Error API: `{ error: { code, message, details? } }` lewat error handler pusat; lempar `AppError(code, message)`.
- `apps/api/src/rules/*` = **fungsi murni** (tanpa DB, LLM, Express, `Date.now()` langsung — terima `today` sebagai argumen) dan wajib dites unit.
- Transisi status hanya lewat fungsi service yang memeriksa status asal di dalam transaksi (`WHERE status = ...`) dan menulis `status_history`.
- Nama file `kebab-case.ts`, komponen React `PascalCase.tsx`. Format dengan Prettier.
- Tambah dependensi besar (> ukuran kecil atau framework baru) = tanya manusia dulu, lalu catat di `tech.md`.

## 5. Git dan PR
- Branch dari `develop`: `feat/<ID>-slug`, `fix/<ID>-slug`, `docs/<ID>-slug` (mis. `feat/BE-03-reader`). `<ID>` = ID di judul issue.
- Commit kecil dan sering, gaya conventional: `feat(api): ...`, `fix(web): ...`, `test(rules): ...`, `docs: ...`. Riwayat commit dinilai panitia — jangan squash riwayat kerja menjadi satu commit raksasa, jangan force-push ke branch bersama.
- PR ke **`develop`**, satu issue per PR, badan berisi `Closes #<nomor>`. Reviewer: **Bagus (`bagusmukti`)**. Di akhir acara `develop` di-merge ke `main`.
- Jangan push langsung ke `develop` atau `main` (kecuali dokumen awal sebelum L-01 selesai).
- Sebelum membuka PR: `npm run typecheck && npm run lint && npm test` lulus.

## 6. Disiplin token (untuk agent)
- Baca **hanya** bagian PRD/ARCHITECTURE yang ditunjuk issue. Jangan memuat seluruh PRD untuk tugas kecil.
- Jangan menempelkan seluruh dokumen/Pedoman ke prompt aplikasi; pakai `get_relevant_sections`.
- Model murah untuk pekerjaan rutin (default OpenCode `qwen3-coder-flash`); model lebih kuat hanya untuk desain sulit.
- Hentikan eksplorasi yang tidak menyentuh issue. Ringkas log/stack trace panjang sebelum dianalisis.
- `npm run eval` memakan token gateway: jalankan subset saat menyetel (`--limit`, `--split=tuning`).

## 7. Cara bekerja per issue
1. Baca issue sampai habis, termasuk Kontrak dan Acceptance criteria.
2. Baca bagian dokumen yang ditunjuk (bukan seluruhnya).
3. Logika deterministik → tulis tes dulu.
4. Kerjakan dalam lingkup issue saja. Temuan di luar lingkup → catat di PR atau usulkan issue baru.
5. Jalankan typecheck, lint, test. Uji manual sesuai "Cara menguji".
6. Kontrak berubah → perbarui `packages/shared`, `docs/API.md`, dan ARCHITECTURE di PR yang sama.
7. Buka PR dengan template, sebut alat AI yang dipakai.

## 8. Kapan bertanya ke manusia (berhenti dan tanya)
- Kontrak API/DB/enum perlu berubah, atau kebutuhan bertentangan dengan PRD/ARCHITECTURE.
- Butuh kunci, akses, atau layanan baru.
- Menambah dependensi besar atau mengganti pustaka yang sudah dipilih.
- Ragu soal aturan domain (kategori, tingkat, tanggal, kredit). Jangan menebak aturan SKEM.
- Tes yang ada harus diubah agar lulus.

## 9. Sudah ditolak — jangan dihidupkan lagi
- Integrasi Google Sheet/Form/Data Studio; WhatsApp; RAG/vector DB; chatbot tanya-jawab bebas.
- Surat keterangan penyelenggara untuk nama berbeda; penanda "diubah dari hasil AI"; mengunci edit metadata kegiatan.
- Verifikator mengedit/override; status "minta revisi"; langkah "Kirim pengajuan" setelah disetujui; unggah formulir bertanda tangan.
- CRUD akun/kelas atau "dukungan teknis" untuk Validator; memblokir kegiatan luring.
- OCR lokal sebagai jalur utama.

## 10. Definition of done
- [ ] Acceptance criteria issue terpenuhi dan bisa didemonstrasikan.
- [ ] Tes relevan ditulis dan lulus; `typecheck` dan `lint` bersih.
- [ ] Tidak ada rahasia, data pribadi asli, atau `console.log` debug tertinggal.
- [ ] State loading/kosong/error ditangani (UI) atau error memakai format seragam (API).
- [ ] Dokumen kontrak diperbarui jika berubah.
- [ ] PR dijelaskan, `Closes #n`, alat AI disebut; alat AI/library baru dicatat di `tech.md`.

## 11. Pengungkapan AI
Setiap PR mengisi bagian "Alat AI" (alat, model, untuk apa). Ringkasan akhir ditulis Bagus di `tech.md`. Setiap anggota harus bisa menjelaskan kode yang di-merge atas namanya.
