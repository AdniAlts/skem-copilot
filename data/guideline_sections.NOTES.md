# Catatan `guideline_sections.json`

Sumber: Pedoman Pelaksanaan SKEM Reguler PENS (dibuat 2 Juni 2026). Dipakai `get_relevant_sections` (`apps/api/src/rules/guideline.ts`) untuk tombol "Kenapa?" dan konteks klasifikasi LLM. Section-lookup deterministik, bukan RAG.

## Isi (28 bagian)

| Kelompok | Bagian | Tag `check:` |
|---|---|---|
| Istilah dan Definisi (hlm. 9–10) | bukti kegiatan, verifikasi/validasi, tingkat kegiatan | completeness, level |
| Ketentuan Umum SKEM (hlm. 10) | total kredit, bukti sah, bobot, satu kali pengajuan, masa studi aktif | completeness, credit, deadline |
| Struktur SKEM (hlm. 11) | bobot, komponen umum, Komponen 1, 2, 3 | credit, role, category, completeness |
| Pelaksanaan SKEM (hlm. 12–16) | batas waktu, peran dalam kegiatan, persiapan pengajuan, ketentuan waktu | deadline, role, completeness |
| Kesalahan Umum Pengisian (hlm. 20) | poin 1–5 | category, level, activity_name, completeness, name_match |
| Ketentuan Peralihan (hlm. 21) | poin 1–2 | deadline |
| Lampiran (hlm. 25–33) | pengurus inti lain, daftar kegiatan bidang A–D | role, category |

Setiap `check_type` (ARCHITECTURE §3.1) punya minimal satu bagian; dikunci tes.

## Cara pembuatan

- `text` adalah kutipan verbatim dari teks Pedoman (spasi dirapikan). Bagian panjang dipotong per poin agar satu panggilan tetap ≤ 1.500 karakter; `panduan-ketentuan-waktu` hanya memuat huruf a, b, d.
- `ref` memakai halaman cetak; halaman dicari otomatis dengan mencocokkan kutipan ke PDF (pypdf) dan sesuai daftar isi Pedoman.
- `lampiran-bidang-a`…`d` bukan paragraf Pedoman, melainkan judul bagian Lampiran + daftar nama kegiatan (verbatim dari `credit_table.json`), dengan `categoryCodes` agar bisa dicari per kategori.

## Konvensi

- `id` kebab-case dan stabil: `findings.guideline_ref` merujuk ke `id` ini. Jangan mengganti `id` yang sudah dipakai.
- `tags`: `check:<check_type>` (harus nilai CHECK_TYPE) atau `topic:<slug>`. Kategori **tidak** ditulis sebagai tag, melainkan di `categoryCodes` (mengikuti schema L-03, berbeda dari contoh di issue #7).
- Bagian dengan `categoryCodes` hanya dikembalikan jika `categoryCode` yang dicari cocok (atau tidak ada `categoryCode` di query).

## Perlu keputusan tim

Kutipan Pedoman yang **bertentangan dengan keputusan produk** (PRD v0.11) tetap dikutip apa adanya:

1. `kesalahan-umum-5`: "Apabila terdapat perbedaan, mahasiswa wajib menyertakan surat keterangan dari penyelenggara." Keputusan tim: beda nama kecil cukup peringatan, tanpa surat keterangan.
2. `kesalahan-umum-4`: menyebut "formulir verifikasi yang telah ditandatangani dosen wali". Di aplikasi, tanda tangan Verifikator dibubuhkan otomatis (e-sign), bukan diunggah mahasiswa.

Agent/UI perlu menampilkan pesan temuan versi aplikasi di samping rujukan ini, atau tim memutuskan memotong kalimat tersebut dari kutipan.
