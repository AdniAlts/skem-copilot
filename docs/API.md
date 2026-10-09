# API — SKEM AI Co-Pilot

> **Status: kerangka.** Dilengkapi oleh issue **L-03** (kontrak bersama) dan diperbarui setiap kali kontrak berubah. Sumber kebenaran tipe: zod schema di `packages/shared/src/schemas/`. Dokumen ini harus selaras dengan [ARCHITECTURE.md §9](../ARCHITECTURE.md#9-api).

Konvensi:
- Base path `/api`. Request/response JSON (`camelCase`), kecuali unggahan `multipart/form-data`.
- Autentikasi: cookie sesi dari `POST /api/auth/mock-login` (Simulasi).
- Tanggal: `YYYY-MM-DD`; waktu: ISO 8601 UTC. Kredit: `number` (mis. `1.1`).
- Error: `{ "error": { "code", "message", "details?" } }`; `message` dalam Bahasa Indonesia, siap tampil di UI.
- Enum persis seperti ARCHITECTURE §3.1.

## Objek bersama

### `SubmissionCard` (daftar/kartu)
```json
{
  "publicId": "SKM-7Q2K9D1A",
  "batchId": "BCH-3F8A1C2E",
  "fileName": "juara2_lomba_desain.pdf",
  "status": "draft",
  "reviewStatus": "needs_fix",
  "activityName": "Lomba Desain Poster",
  "estimatedCredit": null,
  "finalCredit": null,
  "warnings": [],
  "openQuestionCount": 1,
  "lastError": null,
  "updatedAt": "2026-10-09T08:15:00Z"
}
```

### `SubmissionDetail`
```json
{
  "publicId": "SKM-7Q2K9D1A",
  "status": "draft",
  "reviewStatus": "ready",
  "officialStatus": null,
  "student": { "name": "Budi Santoso", "nrp": "3124500001", "programStudi": "D3 Teknik Informatika", "departemen": "Teknik Informatika dan Komputer", "angkatan": 2025, "className": "2 D3 IT B" },
  "verifier": { "name": "Dr. Contoh Dosen Wali", "jabatan": "Dosen Wali Kelas 2 D3 IT B" },
  "activity": {
    "activityName": "Lomba Desain Poster Nasional 2026",
    "activityDate": "2026-08-20",
    "locationPlatform": "Surabaya",
    "organizer": "Himpunan Contoh",
    "attachmentType": "Sertifikat"
  },
  "skem": {
    "komponen": 3,
    "categoryCode": "K3-B-01",
    "level": "Nasional",
    "roleInActivity": "Juara II",
    "achievement": "Juara II",
    "creditEntryId": "K3-B-01-NAS-JUARA2",
    "estimatedCredit": 1.1,
    "finalCredit": null,
    "candidates": { "category": [{ "code": "K3-B-01", "label": "…", "confidence": 0.82 }] }
  },
  "deadline": { "result": "pass", "validFrom": "2025-10-09", "validTo": "2026-10-09", "message": "…" },
  "findings": [
    { "checkType": "level", "result": "pass", "confidence": 0.9, "message": "Peserta dari 5 provinsi → tingkat Nasional.", "guidelineRef": { "id": "ketentuan-umum-12", "title": "Tingkat Kegiatan", "ref": "Pedoman hlm. 9" } }
  ],
  "warnings": [{ "code": "NAME_SPELLING", "message": "Nama di sertifikat: Budi Santosa. Nama di akun: Budi Santoso." }],
  "questions": [
    { "id": 12, "seq": 1, "field": "level", "question": "Peserta kegiatan ini berasal dari mana?", "options": [{ "value": "campus", "label": "Hanya lingkungan PENS" }, { "value": "regional", "label": "Satu provinsi (minimal 3 kota/kabupaten)" }, { "value": "national", "label": "Minimal 3 provinsi di Indonesia" }, { "value": "international", "label": "Minimal 3 negara" }, { "value": "unknown", "label": "Saya tidak tahu" }], "answer": "national" }
  ],
  "finalForm": { "status": "none" },
  "reviews": [],
  "timeline": [{ "field": "status", "from": null, "to": "draft", "at": "2026-10-09T08:00:00Z", "by": null, "note": null }],
  "tokenUsage": { "calls": 2, "promptTokens": 1830, "completionTokens": 210, "cacheHits": 0 }
}
```
Isi `findings`, `skem.candidates`, dan `guidelineRef` final ditetapkan di L-03.

## Endpoint

Format tiap entri: **peran** · request · response · error khusus.

### Sistem & sesi
| Endpoint | Ringkas |
|---|---|
| `GET /health` | publik · → `{ "ok": true, "db": "ok" }` |
| `GET /auth/mock-users` | publik · → `[{ id, name, role, className }]` (Simulasi) |
| `POST /auth/mock-login` | publik · `{ "userId": 3 }` → `Me` + cookie · 404 jika user tidak ada |
| `POST /auth/logout` | semua · → 204 |
| `GET /me` | semua · → `{ id, name, nrp, role, angkatan, programStudi, departemen, className, verifierName, jabatan, hasSignature, telegramLinked }` |
| `PUT /me/signature` | student, verifier · multipart `file` (PNG ≤ 1 MB) **atau** `{ "dataUrl": "data:image/png;base64,…" }` → `{ hasSignature: true }` |
| `GET /me/signature` | student, verifier · → `image/png` milik sendiri · 404 jika belum ada |
| `GET /me/progress` | student · → `Progress` (komponen per kategori + total menuju 3,0) · sumber riwayat dari pengajuan `approved` |

### Unggah & pengajuan (mahasiswa)
| Endpoint | Ringkas |
|---|---|
| `POST /batches` | multipart `files[]` 1–10 PDF → 201 `{ batch: { publicId, fileCount }, submissions: SubmissionCard[] }` · 400 `TOO_MANY_FILES`, 415 bukan PDF (sebut nama file), 413 > 10 MB |
| `GET /batches/:publicId` | → `{ batch, progress: { total, done, counts: { queued, analyzing, ready, needs_fix, problem, error } }, submissions: SubmissionCard[] }` |
| `GET /submissions` | query `status?`, `reviewStatus?` → `SubmissionCard[]` milik sendiri |
| `GET /submissions/:publicId` | → `SubmissionDetail`; metadata kegiatan/SKEM nullable selama ekstraksi belum lengkap |
| `PATCH /submissions/:publicId` | `{ activity?: {...}, skem?: { categoryCode?, level?, roleInActivity?, achievement? } }` → `SubmissionDetail` (cek ulang deterministik, tanpa LLM) · 400 body kosong/field tidak dikenal/identitas · 409 jika bukan `draft`, sedang `queued`/`analyzing`, atau `cancelled` · metadata boleh dikosongkan dengan `null` |
| `POST /submissions/:publicId/answers` | `{ "questionId": 12, "answer": "national" }` → `SubmissionDetail` · opsi harus cocok; hanya `activity_name` menerima teks bebas, `activity_date` harus `YYYY-MM-DD` · 400 jawaban tidak valid · 409 jika bukan `draft` atau sedang `queued`/`analyzing`/`cancelled` |
| `POST /submissions/:publicId/cancel` | → 204 · 409 jika bukan `draft` |
| `POST /submissions/:publicId/reupload` | multipart `file` → `SubmissionCard` (`queued`) |
| `POST /submissions/:publicId/retry` | → `SubmissionCard` (`queued`) · 409 jika bukan `error` |
| `POST /submissions/submit` | `{ "publicIds": ["SKM-…"] }` → `{ submitted: [publicId], skipped: [{ publicId, reason }] }` · 409 `SIGNATURE_REQUIRED` jika belum ada tanda tangan |
| `GET /submissions/:publicId/certificate` | → `{ url, expiresIn: 60 }` |
| `GET /submissions/:publicId/final-form` | → `{ url, expiresIn: 60 }` · 404 jika belum ada |

### Verifikator (baca-saja + keputusan)
| Endpoint | Ringkas |
|---|---|
| `GET /verifier/queue` | query `aiStatus?` (`clean` \| `warning`), `sort?` (`oldest` default \| `newest` \| `flags`) → `{ className, summary: { waiting, withWarnings }, items: [{ publicId, studentName, activityName, categoryLabel, level, estimatedCredit, aiStatus, flagCount, submittedAt }] }` — hanya kelasnya, `status=waiting_verifier`; `aiStatus=warning` jika `warnings` tidak kosong, `flagCount` = jumlah `warnings`; field metadata boleh `null` · 400 query tidak dikenal |
| `GET /submissions/:publicId` | detail yang sama (baca-saja); 404 untuk kelas lain |
| `POST /verifier/submissions/:publicId/approve` | `{ "note": "opsional, ≤ 1000" }` → `{ status: "waiting_validator", finalForm: { status } }` · 409 `SIGNATURE_REQUIRED` · 409 `INVALID_TRANSITION` jika bukan `waiting_verifier` · 404 kelas lain. Satu transaksi: `reviews(approve, signature_applied=true)`, `status_history`, notifikasi in-app mahasiswa; hook `onVerifierApproved` setelah commit (gagal tidak membatalkan) |
| `POST /verifier/submissions/:publicId/reject` | `{ "note": "wajib, ≤ 1000" }` → `{ status: "rejected" }` · 400 jika `note` kosong/spasi · 409 `INVALID_TRANSITION` · 404 kelas lain; `reviews(reject)`, `status_history` (catatan = alasan), notifikasi in-app mahasiswa |

### Validator
| Endpoint | Ringkas |
|---|---|
| `GET /validator/queue` | query `classId?` → items + `finalFormStatus` |
| `POST /validator/submissions/:publicId/credit` | `{ "finalCredit": 0.5, "reason": "wajib" }` → `{ previousCredit, finalCredit, review }` · 400 alasan kosong / nilai sama |
| `POST /validator/submissions/:publicId/validate` | `{}` → `{ status: "approved", finalCredit }` |
| `POST /validator/submissions/:publicId/reject` | `{ "note": "wajib" }` → `{ status: "rejected" }` |
| `POST /validator/submissions/:publicId/regenerate-form` | → `{ finalForm: { status } }` |

### Notifikasi, Telegram, monitoring
| Endpoint | Ringkas |
|---|---|
| `GET /notifications` | → `[{ id, title, body, submissionPublicId, channel, readAt, createdAt }]` |
| `POST /notifications/:id/read` | → 204 |
| `POST /me/telegram/link` | → `{ deepLink: "https://t.me/<bot>?start=<token>" }` (Should) |
| `GET /unit/summary` | unit, validator → `UnitSummary` (rekap per status/kelas/jenis temuan) (Could) |
| `GET /stats/tokens` | validator, unit → `{ totalCalls, promptTokens, completionTokens, perSubmissionAvg, byPurpose }` |
