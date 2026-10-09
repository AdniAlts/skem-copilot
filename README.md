# SKEM AI Co-Pilot

AI first-pass reviewer untuk pengajuan SKEM (Satuan Kredit Ekstrakurikuler Mahasiswa) PENS.
Track: CBN Digital Campus Worker, PENS Hackathon 2026 (9–10 Oktober 2026).

> Bagian bertanda `TODO` diisi dengan hasil nyata selama acara. Angka akurasi dan token hanya ditulis setelah benar-benar diukur.

Dokumen lain: [PRD](docs/PRD.md) · [Arsitektur](ARCHITECTURE.md) · [API](docs/API.md) · [Aturan agent](AGENTS.md) · [Pengungkapan teknologi & AI](tech.md)

## 1. Target user dan masalah
- **Target user:** mahasiswa D3/STr angkatan 2024+ yang mengajukan SKEM; dosen wali (Verifikator) yang memeriksa pengajuan kelasnya; Validator yang memvalidasi secara administratif dan teknis.
- **Tugas operasional:** pemeriksaan awal pengajuan SKEM (kategori, tingkat, peran, nama kegiatan, kecocokan nama, rentang tanggal per angkatan, kelengkapan) dan estimasi kredit, sebelum sampai ke staf.
- **Masalah:** setiap pengajuan diperiksa manual oleh dosen wali (wawancara satu Verifikator: 10–20 berkas per mahasiswa, sekitar 3–5 menit per berkas). Pedoman resmi mencatat lima kesalahan umum. Data penolakan masih terbatas (satu kelas, 2 pengajuan, 0 dikembalikan).
- **Sumber validasi:** wawancara satu Verifikator dan Pedoman Pelaksanaan SKEM. TODO: tambahkan sumber lain jika ada.

## 2. Alur kerja (input → output)
1. Mahasiswa mengunggah hingga 10 PDF sertifikat sekaligus (1 file = 1 pengajuan).
2. Antrian di server menganalisis tiap file: Pre-Check Agent membaca dokumen, memanggil tool deterministik, dan bila perlu bertanya balik (maks. 3 pertanyaan per kartu, berupa pilihan).
3. Tiap kartu berstatus **Ready**, **Perlu perbaikan**, atau **Bermasalah**, dengan hasil per pemeriksaan, confidence, rujukan Pedoman ("Kenapa?"), dan estimasi kredit dari tabel bobot.
4. Formulir FM.MHS.PENGAJUANSKEM terisi otomatis. Mahasiswa memeriksa/mengedit metadata kegiatan, membubuhkan e-sign, lalu mengajukan (satu per satu atau sekaligus).
5. Dosen wali (Verifikator) hanya membaca lalu **Setujui** (e-sign) atau **Tolak** (alasan wajib).
6. Yang disetujui otomatis dibuatkan PDF formulir final dan masuk antrian Validator. Validator **Validasi** atau **Tolak** (alasan wajib) dan boleh mengubah kredit final dengan alasan tercatat.
7. Mahasiswa memantau status: Draf → Menunggu Verifikator → Menunggu Validator → Disetujui / Ditolak.

Seluruh proses online. Keputusan akhir selalu di staf; sistem tidak mengirim pesan atau mengubah status tanpa tindakan manusia.

## 3. Sumber data dan komponen simulasi
| Item | Sumber | Status |
|---|---|---|
| Tabel bobot kredit | Lampiran Pedoman Pelaksanaan SKEM, didigitalkan ke `data/credit_table.json` | Nyata (182 baris; lihat `data/credit_table.NOTES.md`) |
| Bagian Pedoman | Pedoman dipecah per bagian dan diberi tag (`data/guideline_sections.json`) | Nyata |
| Aturan tanggal per angkatan | Pedoman (Ketentuan Waktu & Peralihan), ditafsirkan tim; `data/rules.json` | Nyata (tafsiran tim) |
| Sertifikat dan data mahasiswa | Dibuat sendiri (sintetis) | **Simulasi** |
| Kelas, dosen wali, akun | Data seed | **Simulasi** |
| Login | Mock login dengan pemilih peran | **Simulasi** |
| E-sign | Gambar tanda tangan tersimpan, bukan tanda tangan elektronik tersertifikasi | **Simulasi** |

Tidak ada data pribadi asli di repo. TODO: konfirmasi sebelum submit.

## 4. Arsitektur
Lihat [ARCHITECTURE.md](ARCHITECTURE.md). Ringkasan:
- **Frontend:** React + TypeScript (Vite, React Router, TanStack Query); tampilan per peran Mahasiswa, Verifikator, Validator, Unit Kemahasiswaan (read-only).
- **Backend:** Node.js + TypeScript (Express) dengan worker antrian analisis di proses yang sama.
- **Penyimpanan:** Supabase Postgres (Drizzle ORM) dan Supabase Storage (bucket privat), diakses hanya dari backend. Hasil dan riwayat bertahan setelah refresh.
- **Model AI:** `deepseek-v4.1-flash` lewat gateway LiteLLM CBN (OpenAI-compatible) untuk membaca dokumen (teks atau gambar) dan klasifikasi.
- **Tools di luar LLM:** `lookup_credit_table`, `check_deadline`, `match_name`, `get_relevant_sections`, `ask_student`.
- Skor kredit dihitung deterministik dari tabel JSON; LLM tidak mengeluarkan skor. Rujukan Pedoman memakai section-lookup bertag (tanpa vector DB).
- Notifikasi dalam aplikasi; bot Telegram (Should have) hanya sebagai akibat tindakan staf.

## 5. Setup
```bash
# TODO: verifikasi ulang di mesin bersih sebelum submit
git clone https://github.com/AdniAlts/skem-copilot
cd skem-copilot
cp .env.example .env     # isi kunci (JANGAN di-commit)
npm install
npm run db:migrate
npm run seed             # data dummy (Simulasi)
npm run dev              # API http://localhost:3000, web http://localhost:5173
```
Variabel lingkungan: lihat [`.env.example`](.env.example) (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `STORAGE_BUCKET_*`, `TELEGRAM_BOT_TOKEN`, `PORT`, `SESSION_SECRET`).

## 6. Test case dan hasil
- **Test set:** TODO jumlah kasus, cara pembuatan, dan pembagian set tuning vs held-out.
- **Cakupan:** lima jenis kesalahan, foto HP miring/silau, kombinasi tidak ada di tabel, nama berbeda kecil vs milik orang lain, di luar rentang tanggal per angkatan.
- **Cara menjalankan:** `npm run eval -- --split=heldout`

| Jenis kasus | Jumlah | Benar | Akurasi |
|---|---|---|---|
| Salah kategori | TODO | TODO | TODO |
| Salah tingkat | TODO | TODO | TODO |
| Nama disingkat | TODO | TODO | TODO |
| Dokumen kurang | TODO | TODO | TODO |
| Nama tidak cocok | TODO | TODO | TODO |
| Di luar rentang tanggal | TODO | TODO | TODO |
| Kasus benar (tanpa kesalahan) | TODO | TODO | TODO |
| **Total (held-out)** | TODO | TODO | TODO |

- **Penanganan kegagalan yang diuji:** TODO (dokumen buram, kombinasi tidak ada di tabel, timeout/API error, JSON invalid, jawaban "Saya tidak tahu").
- **Input baru saat demo:** TODO (contoh file di `data/testset/` atau `samples/`).

## 7. Penggunaan token
- Setiap panggilan LLM dicatat di tabel `llm_calls` (model, token input/output, latensi, error, cache hit). Ringkasan: `GET /api/stats/tokens`.
- Ringkasan: TODO (total token, rata-rata per pengajuan).
- **Optimasi dan dampaknya ke akurasi:**

| Perubahan | Token per pengajuan sebelum | Sesudah | Akurasi sebelum → sesudah |
|---|---|---|---|
| TODO (mis. teks PDF lebih dulu sebelum gambar) | TODO | TODO | TODO |
| TODO (bagian Pedoman relevan saja) | TODO | TODO | TODO |
| TODO (cache ekstraksi per hash file) | TODO | TODO | TODO |

## 8. Keterbatasan
- Bukti masalah berasal dari satu Verifikator dan satu kelas.
- Akurasi diukur pada data sintetis; dokumen nyata belum diuji.
- Belum terintegrasi dengan sistem pengajuan/monitoring resmi PENS (butuh keputusan PENS); monitoring tersedia di aplikasi.
- E-sign berupa gambar tanda tangan, bukan tanda tangan elektronik tersertifikasi; peniadaan jalur kertas butuh persetujuan PENS.
- Estimasi kredit bukan keputusan resmi; nilai final ditetapkan Validator.
- TODO: keterbatasan lain yang ditemukan selama acara.

## 9. Pembagian tugas tim
| Anggota | GitHub | Peran | Kontribusi saat acara |
|---|---|---|---|
| Bagus | [@bagusmukti](https://github.com/bagusmukti) | Team Lead, frontend (layar staf), data & aturan, reviewer PR | TODO |
| Janesh | [@JaneshPutra](https://github.com/JaneshPutra) | Backend & AI pipeline | TODO |
| Adni | [@AdniAlts](https://github.com/AdniAlts) | Frontend (alur mahasiswa) | TODO |
| TODO (dosen pembimbing) | — | Validasi dan masukan | TODO |

## 10. Penggunaan AI dan komponen pihak ketiga
Lihat [`tech.md`](./tech.md).
