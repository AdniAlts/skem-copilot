# Pengungkapan Teknologi dan Penggunaan AI

> Diperbarui sepanjang acara supaya sesuai kenyataan. Setiap anggota harus bisa menjelaskan kontribusinya.

## Pekerjaan sebelum acara (bukan kode aplikasi)
Dokumen perencanaan berikut dibuat sebelum 9 Oktober 2026 dengan bantuan **Claude (Anthropic, antarmuka chat)**: ide dan konsep MVP, PRD (`docs/PRD.md`), deck presentasi, prompt desain UI (`docs/design-prompts/`), rencana kerja 20 jam, dan template README/`tech.md`. Tidak ada kode aplikasi yang ditulis sebelum acara.

- Persiapan repo (dokumen `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `docs/API.md`, template issue/PR, `.env.example`, `.gitignore`, label, milestone, dan issue) disusun dengan **Claude Code** (model Claude Opus) berdasarkan PRD. Semua isinya dokumen dan konfigurasi, tanpa kode aplikasi.
- Tabel bobot dan pecahan Pedoman dalam bentuk JSON: TODO (sebutkan jika dikerjakan sebelum acara dan oleh siapa; rencana saat ini: dikerjakan saat acara, issue D-01 dan D-02).

## AI coding assistant
| Alat | Model | Dipakai untuk | Catatan |
|---|---|---|---|
| OpenCode | `qwen3-coder-flash` (default) dan model lain di gateway CBN | Coding oleh semua anggota selama acara | Lewat gateway CBN, masuk kuota 10 juta token tim |
| Claude Code (Anthropic) | Claude Opus | Menyiapkan dokumen repo, label, milestone, dan issue | Di luar gateway CBN; tidak masuk kuota/log panitia |
| Claude (chat, Anthropic) | Claude | Dokumen perencanaan sebelum acara | Di luar gateway CBN |
| TODO | TODO | TODO | TODO |

## Model AI di dalam aplikasi
| Model | Lewat | Fungsi |
|---|---|---|
| `deepseek-v4.1-flash` | Gateway LiteLLM CBN (OpenAI-compatible) | Membaca sertifikat (teks atau gambar), ekstraksi field terstruktur, klasifikasi kategori/tingkat/peran. Tidak menghasilkan skor kredit. |

## Layanan pihak ketiga
| Layanan | Dipakai untuk | Catatan |
|---|---|---|
| Supabase (Postgres + Storage) | Database aplikasi dan penyimpanan file (bukti, tanda tangan, PDF final) | Diakses hanya dari backend dengan service key di `.env` |
| Telegram Bot API | Notifikasi (Should have) | Opt-in; token bot di `.env` |
| GitHub / GitHub Actions | Repo, issue, CI (typecheck, lint, test) | Tanpa rahasia di CI |

## Library, framework, template, boilerplate
| Nama | Versi | Lisensi | Dipakai untuk | Template/boilerplate? |
|---|---|---|---|---|
| zod | 3.23.x | MIT | Validasi schema API, LLM output, dan data file | Bukan template |
| TypeScript | 5.6.x | Apache-2.0 | Bahasa pemrograman utama | Bukan template |
| Vitest | 2.1.x | MIT | Testing framework | Bukan template |
| Node.js | ≥22 | MIT | Runtime | Bukan template |

Jika memakai starter template (mis. `npm create vite@latest`, shadcn/ui), tulis di sini dan sebutkan bagian mana yang berasal dari template.

## Pekerjaan yang dikerjakan selama acara
| Waktu | Pekerjaan | Oleh |
|---|---|---|
| 9 Oktober 2026 | Setup monorepo minimal (root package.json, tsconfig) dan implementasi @skem/shared (enum, zod schema, labels, tes) untuk issue L-03 | AdniAlts dengan OpenCode (qwen3-coder-flash) |

## Data
- Seluruh sertifikat dan data mahasiswa di repo bersifat sintetis.
- Tabel bobot dan bagian Pedoman berasal dari Pedoman Pelaksanaan SKEM PENS (dokumen institusi); file PDF Pedoman tidak disertakan di repo.
- TODO: sebutkan jika ada data publik atau dataset panitia yang dipakai.
