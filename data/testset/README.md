# Test Set SKEM Co-Pilot (`data/testset/`)

Kumpulan dokumen sertifikat dan berkas sintetis untuk mengukur akurasi ekstraksi, klasifikasi, deteksi anomali, dan perhitungan kredit SKEM sesuai ketentuan **PRD §3.2** dan **ARCHITECTURE §12**.

> **Jaminan Privasi & Data Sintetis:** Seluruh nama mahasiswa, NRP, tanda tangan, nomor sertifikat, dan lembaga penyelenggara dalam test set ini bersifat **100% sintetis (fiktif)**. Tidak ada data pribadi asli yang disimpan di dalam repositori atau dikirimkan ke model AI.

---

## 1. Pembagian Data (Split)

Test set dibagi menjadi dua partisi utama:
- **`tuning` (70%, 7 kasus):** Digunakan untuk kalibrasi prompt, perbaikan parsing, dan penyetelan aturan ekstraksi.
- **`heldout` (30%, 3 kasus):** **Tidak dilihat atau disentuh** selama proses penyetelan prompt. Angka akurasi dan performa akhir yang dilaporkan pada evaluasi resmi (PRD §3.2) dihitung dari kasus `heldout` ini.

---

## 2. Ringkasan Kasus (Tahap 1 / M1: 10 Kasus)

| ID | File | Split | Akun (Angkatan) | Skenario Pengujian | Status Diharapkan | Kategori & Kredit | Error Diharapkan |
|---|---|---|---|---|---|---|---|
| `c001` | `cases/c001_juara2_lomba_desain.pdf` | `tuning` | Budi Santoso (2025) | Skenario Demo: Juara II Lomba Desain tanpa cakupan wilayah; tanya pengguna (jawab: nasional) | `needs_fix` → `ready` | `K3-B01` / `K3-B01-NAS-JUARA2` (1.1) | `["level"]` (sebelum dijawab) |
| `c002` | `cases/c002_nama_orang_lain.pdf` | `tuning` | Ahmad Fauzi (2024) | Sertifikat atas nama orang lain (*Nisa Rahma* vs akun *Ahmad Fauzi*) | `problem` | `K3-B03` / `K3-B03-NAS-PESERTADARING` | `["name_mismatch"]` |
| `c003` | `cases/c003_beda_ejaan_nama.pdf` | `tuning` | Rizky Pratama (2024) | Ejaan nama beda satu huruf (*Rizki Pratama* vs *Rizky Pratama*), masuk peringatan tapi tidak memblokir | `ready` | `K1-03` / `K1-03-PESERTA` (0.3) | `[]` (*warning: name*) |
| `c004` | `cases/c004_nama_kegiatan_singkat.pdf` | `tuning` | Siti Nurhaliza (2024) | Nama kegiatan disingkat (*LKTIN 2025*), masuk peringatan tapi tidak memblokir | `ready` | `K3-A02` / `K3-A02-KMP-ANGGOTA` (0.1) | `[]` (*warning: activity_name*) |
| `c005` | `cases/c005_tanggal_kadaluarsa.pdf` | `tuning` | Dimas Anggara (2025) | Tanggal kegiatan di luar rentang angkatan 2025 (> 1 tahun sebelum pengajuan 9 Okt 2026) | `problem` | `K3-B04` / `K3-B04-REG-PESERTALURING` | `["deadline"]` |
| `c006` | `cases/c006_kombinasi_tidak_ada_di_tabel.pdf` | `tuning` | Farhan Ramadhan (2024) | Kombinasi tingkat/peran tidak ada di tabel (K3-C02 Pelatih tidak memiliki baris tingkat Internasional) | `needs_fix` | `K3-C02` / `""` (tidak ada bobot) | `["credit"]` |
| `c007` | `cases/c007_foto_hp_miring.pdf` | `heldout` | Dewi Anggraini (2024) | Foto smartphone miring, di atas meja kerja dengan pantulan silau cahaya (K3-C01 Juara 1 Bulu Tangkis) | `ready` | `K3-C01` / `K3-C01-REG-JUARA1` (0.8) | `[]` |
| `c008` | `cases/c008_scan_tanpa_teks.pdf` | `heldout` | Muhammad Ilham (2024) | Dokumen scan flatbed hitam-putih murni bitmap tanpa stream teks (K2-01 Mentoring Keagamaan) | `ready` | `K2-01` / `K2-01-PESERTA` (0.5) | `[]` |
| `c009` | `cases/c009_bukan_sertifikat.pdf` | `tuning` | Bayu Saputra (2025) | Berkas bukan sertifikat kegiatan (Kuitansi Bukti Pembayaran UKT Bank) | `problem` | `""` / `""` | `["category"]` |
| `c010` | `cases/c010_kasus_benar_lengkap.pdf` | `heldout` | Anisa Putri (2024) | Kasus benar lengkap tanpa kesalahan (K3-D01 Surat Keterangan Upacara Bendera) | `ready` | `K3-D01` / `K3-D01` (0.1) | `[]` |

---

## 3. Cakupan Komponen & Bidang

Test set M1 memenuhi kriteria mencakup minimal satu kasus dari setiap komponen wajib dan bidang Komponen 3:
- **Komponen 1 (Wajib Institusi):** `c003` (`K1-03` LKMM Pra-TD)
- **Komponen 2 (Wajib Keagamaan):** `c008` (`K2-01` Mentoring Keagamaan)
- **Komponen 3 Bidang A (Organisasi & Kepanitiaan):** `c004` (`K3-A02` Panitia Kegiatan Kemahasiswaan)
- **Komponen 3 Bidang B (Penalaran & Keilmuan):** `c001` (`K3-B01` Prestasi Lomba), `c002` (`K3-B03` Seminar), `c005` (`K3-B04` Workshop)
- **Komponen 3 Bidang C (Minat & Bakat):** `c006` (`K3-C02` Pelatih Minat Bakat), `c007` (`K3-C01` Prestasi Olahraga/Seni)
- **Komponen 3 Bidang D (Bakti Kampus):** `c010` (`K3-D01` Upacara Bendera)
- **Non-Sertifikat:** `c009` (Kuitansi Keuangan UKT)

---

## 4. Cara Pembuatan Berkas PDF

Dokumen PDF sintetis dihasilkan secara terprogram agar dapat direproduksi secara deterministik:

1. **PDF Vektor Bersih (`c001`–`c006`, `c009`, `c010`):**
   - Dihasilkan menggunakan pustaka `pdf-lib` via skrip `scripts/generate-vector-cases.ts`.
   - Mengandung stream teks vektor asli sehingga dapat diuji langsung oleh strategi ekstraksi teks (`extract_text` / DocumentReader).
   - Dijalankan dengan perintah:
     ```bash
     npx tsx scripts/generate-vector-cases.ts
     ```

2. **PDF Distorsi & Citra Scan (`c007`, `c008`):**
   - Dihasilkan menggunakan modul Python `Pillow` via skrip `scripts/generate-raster-cases.py`.
   - `c007_foto_hp_miring.pdf`: Mensimulasikan foto jepretan kamera ponsel dengan rotasi 6.5°, drop shadow di atas latar meja kerja, serta pantulan silau cahaya blitz/lampu (*glare effect*).
   - `c008_scan_tanpa_teks.pdf`: Mensimulasikan hasil pemindaian flatbed 150 DPI yang diubah ke grayscale, rotasi mikro 0.6°, dan noise acak tanpa stream teks vektor (menguji jalur vision / OCR).
   - Dijalankan dengan perintah:
     ```bash
     python3 scripts/generate-raster-cases.py
     ```

---

## 5. Cara Validasi & Menjalankan Pengujian

Untuk memverifikasi keabsahan skema data dan keterhubungan kunci jawaban:

```bash
# Validasi schema answer_key.json dan credit_table.json terhadap @skem/shared
npm run data:validate

# Menjalankan unit test answer_key.json (ketersediaan file fisik, keunikan ID, split ratio, kecocokan credit_entry_id)
npm test
```
