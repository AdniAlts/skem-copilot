# Catatan `credit_table.json`

Sumber: Pedoman Pelaksanaan SKEM Reguler PENS (dibuat 2 Juni 2026), Lampiran "Daftar Kegiatan SKEM PENS", halaman cetak 25–33 (PDF hal. 28–36). Satu entri = satu baris tabel (kegiatan × tingkat × jabatan/prestasi).

## Jumlah baris

| Bagian | Kegiatan | Baris |
|---|---|---|
| Komponen 1 — Interpersonal dan Manajerial | 4 | 4 |
| Komponen 2 — Spiritual | 1 | 1 |
| Komponen 3 A — Organisasi dan Kepemimpinan | 3 | 42 |
| Komponen 3 B — Penalaran, Kreativitas, Kewirausahaan | 10 | 103 |
| Komponen 3 C — Minat dan Bakat | 3 | 27 |
| Komponen 3 D — Kegiatan Lainnya | 5 | 5 |
| **Total** | **26** | **182** |

Dikunci oleh tes `packages/shared/test/credit-table.test.ts`.

## Cara verifikasi

Transkripsi dari teks Pedoman, lalu dicocokkan otomatis dengan ekstraksi independen dari PDF (pypdf, mode layout): urutan 182 nilai kredit dan nomor halaman tiap baris identik. Tetap disarankan cek silang manual 10 baris acak oleh orang kedua (acceptance criteria #6).

## Konvensi

- `id` = `K{komponen}-{bidang}{no}[-{TINGKAT}][-{PERAN}]`, mis. `K3-B01-NAS-JUARA2`; `categoryCode` = `K{komponen}-{bidang}{no}` (`K1-01` untuk Komponen 1–2 tanpa bidang).
- `level` dan `role` ditulis persis seperti tabel (kapitalisasi dirapikan). Bernilai `null` jika kolomnya kosong di tabel; tidak pernah diisi tebakan.
- `bidang` `null` untuk Komponen 1–2.
- `basis` (Dasar Penilaian) dinormalisasi dengan pemisah ` / `.
- Kolom **Durasi** (1 Periode, 1 Kegiatan, 1 Semester, 1 Periode Mentoring) tidak disimpan karena schema belum punya field-nya dan tidak memengaruhi nilai kredit.

## Kasus ambigu (dicatat, tidak ditebak)

1. **B7 "Nasional Terakreditasi (S5-S6)" terpotong antar halaman.** Baris "Ketua 0,4" ada di akhir hlm. 29 tanpa label tingkat; label "Nasional Terakreditasi (S5-S6)" muncul di hlm. 30 sejajar "Anggota 0,2". Ditafsirkan sebagai satu kelompok: Ketua 0,4 dan Anggota 0,2 (urutan nilai cocok dengan pola S1-S2 → S3-S4 → S5-S6 yang menurun).
2. **B7 "Tidak Terakreditasi"** tidak diawali "Nasional". Disimpan apa adanya.
3. **B8 "Internasional bereputasi" vs "Internasional"** adalah dua tingkat berbeda (0,8/0,4 vs 0,6/0,3). Kapitalisasi diseragamkan menjadi "Internasional Bereputasi" (sama dengan B7).
4. **A2 tingkat "Program Studi"** tanpa keterangan (Hima/BSO), berbeda dengan A1 yang memisahkan "Program Studi (Hima)" dan "Program Studi (BSO)". Disimpan apa adanya.
5. **Tingkat yang bukan cakupan peserta**: "Program Studi (Hima)", "UKM / Tim Kompetisi", "Program Studi (BSO)", "Program Studi", "Lanjut", "Menengah", "Sekolah" (C2), jenis jurnal/akreditasi (B7–B8), dan bentuk badan usaha (B10). Pertanyaan cakupan peserta (Internasional/Nasional/Regional/Kampus) hanya relevan untuk baris bertingkat cakupan (ARCHITECTURE §8).
6. **C2 tingkat "Sekolah"** tidak ada di definisi Tingkat Kegiatan (Ketentuan Umum poin 12).
7. **Peran tanpa padanan langsung di sertifikat**: "Penghargaan Lain" (mis. Juara Harapan, Finalis, Best Paper?) dan "Pengurus Inti Lain" (Sekretaris, Bendahara, Kepala/Koordinator Divisi menurut Keterangan Lampiran). Pemetaan dari teks sertifikat ke peran ini adalah keputusan agent/Verifikator; perlu dikonfirmasi ke Unit Kemahasiswaan.
8. **D5 "Mentor Keagamaan" (0,5, Komponen 3) vs Komponen 2 "Mentoring Keagamaan" peserta (0,5)**: kegiatan berbeda (mentor vs peserta) dengan nilai sama. Disimpan sebagai dua entri.
9. **Bidang D tanpa tingkat dan jabatan**; Upacara Bendera menerima "Daftar Hadir" sebagai dasar penilaian.
10. **B5–B6 (hak cipta, paten)** tanpa tingkat; hanya Ketua/Anggota.
