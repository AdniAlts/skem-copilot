# Pengungkapan Teknologi dan Penggunaan AI

> Diperbarui sepanjang acara supaya sesuai kenyataan. Setiap anggota harus bisa menjelaskan kontribusinya.

## Pekerjaan sebelum acara (bukan kode aplikasi)
Dokumen perencanaan berikut dibuat sebelum 9 Oktober 2026 dengan bantuan **Claude (Anthropic, antarmuka chat)**: ide dan konsep MVP, PRD (`docs/PRD.md`), deck presentasi, prompt desain UI (`docs/design-prompts/`), rencana kerja 20 jam, dan template README/`tech.md`. Tidak ada kode aplikasi yang ditulis sebelum acara.

- Persiapan repo (dokumen `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `docs/API.md`, template issue/PR, `.env.example`, `.gitignore`, label, milestone, dan issue) disusun dengan **Claude Code** (model Claude Opus) berdasarkan PRD. Semua isinya dokumen dan konfigurasi, tanpa kode aplikasi.
- Tabel bobot dalam bentuk JSON (`data/credit_table.json`) dikerjakan saat acara (issue D-01): ditranskripsi dari teks Pedoman dan dicocokkan otomatis dengan PDF memakai pypdf (alat lokal, bukan dependensi repo). Pecahan Pedoman bertag: TODO (issue D-02).

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
| React, React DOM | 19.3.0 | MIT | UI web | — |
| Vite, @vitejs/plugin-react | 8.3.4, 6.1.2 | MIT | Dev server & build web | Konfigurasi ditulis manual (bukan `npm create vite`) |
| Express | 5.3.0 | MIT | REST API | — |
| tsx | 4.23.15 | MIT | Menjalankan TypeScript API saat dev/start | — |
| TypeScript | 6.0.3 | Apache-2.0 | Bahasa & typecheck | — |
| Vitest, Supertest | 5.0.3, 7.3.1 | MIT | Tes unit & integrasi HTTP | — |
| ESLint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, eslint-config-prettier | 10.12.0, 8.71.1, … | MIT | Lint | — |
| Prettier | 3.9.9 | MIT | Format kode | — |
| concurrently | 10.0.6 | MIT | Menjalankan API + web bersamaan | — |
| zod | 3.25.76 | MIT | Validasi schema API, keluaran LLM, dan file data (`@skem/shared`) | — |
| react-router-dom | 7.18.4 | MIT | Routing per peran di aplikasi web | — |
| @tanstack/react-query | 5.104.1 | MIT | State management & caching API di web | — |
| tailwindcss, postcss, autoprefixer | 3.4.19, 8.5.29, 10.6.1 | MIT | Styling & sistem tema warna web | — |
| lucide-react | 1.54.0 | ISC | Ikon garis antarmuka web | — |
| clsx, tailwind-merge | 2.1.1, 3.7.0 | MIT | Utility penggabungan kelas styling (`cn`) | — |
| TODO (menyusul: Drizzle, pdf-lib, sharp, grammY, …) | | | | |

Jika memakai starter template (mis. `npm create vite@latest`, shadcn/ui), tulis di sini dan sebutkan bagian mana yang berasal dari template.

## Pekerjaan yang dikerjakan selama acara
| Waktu | Pekerjaan | Oleh |
|---|---|---|
| 9 Oktober 2026 | Implementasi @skem/shared (enum, zod schema, labels, tes) untuk issue L-03 | AdniAlts dengan OpenCode (qwen3-coder-flash) |
| 9 Oktober 2026 | Scaffold web: routing per peran, layout, klien API, TanStack Query, komponen dasar, tema untuk issue FE-01 (#5) | AdniAlts |

## Data
- Seluruh sertifikat dan data mahasiswa di repo bersifat sintetis.
- Tabel bobot dan bagian Pedoman berasal dari Pedoman Pelaksanaan SKEM PENS (dokumen institusi); file PDF Pedoman tidak disertakan di repo.
- TODO: sebutkan jika ada data publik atau dataset panitia yang dipakai.
