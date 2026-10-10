# UI Spec — SKEM AI Co-Pilot (final, gabungan prompt desain v3–v8)

Spesifikasi layar yang **berlaku sekarang**. Disusun dari prompt Claude Design v3–v8; hal yang sudah dibatalkan oleh versi berikutnya dibuang. Jika bertentangan dengan `docs/PRD.md` (v0.11), PRD menang. Riwayat perubahan prompt: [`design-prompts/`](design-prompts/) (hanya v8 tersimpan).

Nama status/enum di kode mengikuti [ARCHITECTURE §3.1](../ARCHITECTURE.md); label di bawah adalah teks UI.

## 1. Gaya visual
- Desktop 1440 px sebagai acuan; tetap usable di layar laptop kecil. Bahasa Indonesia, semua data dummy.
- Warna mengikuti logo PENS: **biru PENS `#1B4679`** (aksi, tautan, aktif; kelas `brand-blue`, tint `brand-blue-50…900`), navy gelap `#102A49` (teks judul, `brand-dark`), **kuning PENS `#F4C801`** sebagai aksen identitas saja (`brand-yellow`, mis. garis bawah header), latar `#F4F6F9`. Warna **status** tetap semantik dan tidak memakai warna merek: hijau (emerald) = lolos/Ready/Disetujui, amber = perlu perhatian, terakota `#C8553D` **hanya** untuk peringatan/kesalahan.
- Kartu putih, sudut 12 px, bayangan halus. Judul serif, isi sans-serif, ikon garis.
- **Status selalu ikon + teks**, tidak hanya warna.
- Tanpa logo/merek resmi PENS; cukup nama teks.
- Komponen konsisten dan mudah dipindah ke kode: `Card`, `Table`, `Timeline`, `Toast`, `Badge`, `Modal`, `StatusBadge`, `WhyButton`, `SignaturePad`, `FormPreview`.

## 2. Aturan global
- **Pemilih peran (mock login)** di halaman awal dan pojok atas: Mahasiswa, Verifikator, Validator, Unit Kemahasiswaan. Lencana **"Simulasi"**.
- Lencana "Simulasi" juga pada data kelas/dosen wali dan e-sign ("bukan tanda tangan tersertifikasi").
- Setiap proses panjang punya keadaan **memuat** (langkah progres), **gagal** (pesan jelas + "Coba lagi"), dan **kosong**.
- Semua hasil dan riwayat tetap ada setelah refresh.
- Ikon lonceng: notifikasi dalam aplikasi.
- Tidak ada tautan ke Google Form/Sheet, tidak ada WhatsApp, tidak ada ajakan mencetak/menandatangani kertas.
- Skor selalu ditulis "Estimasi. Nilai final ditetapkan Validator." dan "dihitung dari tabel bobot resmi". Jangan tampilkan skor seolah keluaran bebas AI.
- Tidak ada penanda "Diubah dari hasil AI" di layar mana pun.

## 3. Status
**Kartu analisis (draf):**

| Kode | Label | Warna | Isi kartu | Tombol |
|---|---|---|---|---|
| `queued` | Menunggu antrean | abu-abu | "Menunggu giliran" | Batalkan |
| `analyzing` | Sedang dianalisis | teal + animasi | langkah "Membaca dokumen → Memeriksa aturan → Mengisi formulir" | — |
| `ready` | Ready | hijau | "Formulir sudah terisi, siap diajukan" + estimasi kredit; lencana kuning bila ada peringatan | Detail, Ajukan |
| `needs_fix` | Perlu perbaikan | amber | pertanyaan AI dengan pilihan jawaban di kartu | Detail, Kirim jawaban |
| `problem` | Bermasalah | terakota | alasan jelas, mis. "Nama di sertifikat (Nisa Rahma) tidak sesuai dengan akun Anda (Budi Santoso)" | Detail, Unggah ulang, Batalkan |
| `error` | Gagal dianalisis | abu-abu + ikon peringatan | "Terjadi gangguan sistem, bukan kesalahan Anda" | Coba lagi, Batalkan |
| `cancelled` | — | — | kartu hilang (animasi) | — |

**Pengajuan (timeline mahasiswa):** Draf → Menunggu Verifikator → Menunggu Validator → Disetujui, dengan cabang **Ditolak** (dari Verifikator atau Validator) yang menampilkan alasan. Lencana kecil status resmi: *Dalam proses* (menunggu), *Disetujui*, *Ditolak*.

## 4. Mahasiswa

### A1. Dashboard
- Sapaan; nama, NRP, kelas, dosen wali (Verifikator).
- Progres menuju 3,0: tiga bar (Komponen 1 target 1,25; Komponen 2 target 0,5; Komponen 3 minimal 1,25) + total. Sudah ≥ 3,0 → "Terpenuhi". Komponen 1/2 belum lengkap → tampil sebagai prioritas.
- Daftar pengajuan dengan timeline ringkas dan lencana status resmi.
- Tombol utama "Unggah sertifikat".
- (Should) Kartu "Notifikasi Telegram": Terhubung / Belum terhubung + "Hubungkan Telegram".

### A2. Unggah batch dan daftar kartu
- Area seret-lepas: "Seret hingga 10 PDF sertifikat ke sini" + "Pilih file", penghitung "5 / 10 file".
- Error: > 10 file atau bukan PDF → pesan jelas, sebut nama file yang ditolak.
- Keterangan kecil: "Seluruh proses pengajuan dilakukan online. Tidak perlu mencetak atau menandatangani formulir kertas."
- Di atas daftar: bar progres "3 dari 5 selesai dianalisis", jumlah per status, filter cepat Semua / Ready / Perlu perhatian / Bermasalah, tombol **"Ajukan semua yang Ready (N)"** (nonaktif jika 0).
- Kartu: nama file, thumbnail halaman 1, nama kegiatan terdeteksi, estimasi kredit (jika Ready), lencana status, tombol (tabel §3).
- Kartu lain tetap diproses saat satu kartu menunggu jawaban.
- **Batalkan** → konfirmasi "Batalkan pengajuan ini? Hanya kartu ini yang dihapus."
- **Unggah ulang** → pemilih file untuk kartu itu saja → kembali Menunggu antrean.
- Panel "Perlu perhatian" mengumpulkan kartu yang menunggu jawaban; pertanyaan selalu menyebut nama file.

### A3. Pertanyaan agent (di kartu Perlu perbaikan dan di Detail)
- Maks. 3 per kartu, penghitung "Pertanyaan 1 dari 3".
- Pertanyaan tingkat selalu pilihan (radio): "Peserta kegiatan ini berasal dari mana?" → "Hanya lingkungan PENS" / "Satu provinsi (minimal 3 kota/kabupaten)" / "Minimal 3 provinsi di Indonesia" / "Minimal 3 negara" / "Saya tidak tahu". Teks bantu: "Tingkat kegiatan ditentukan oleh asal peserta, bukan lokasi acara." + tombol "Kenapa?" (definisi Tingkat Kegiatan).
- Kategori ambigu → top-3 kandidat dengan confidence untuk dipilih.
- Setelah dijawab, hasil diperbarui (tanpa menunggu analisis ulang panjang).

### A4. Detail pengajuan (3 kolom)
- **Kiri:** pratinjau PDF sertifikat, navigasi halaman ("Halaman X dari Y"), zoom.
- **Tengah:** pratinjau formulir resmi terisi (§6).
- **Kanan:** panel metadata, tiga kelompok:
  1. **Identitas Mahasiswa (dari akun)** — Nama, NRP, Program Studi, Departemen; ikon gembok, tidak bisa diedit.
  2. **Informasi Kegiatan (dibaca AI, bisa diedit)** — Nama Kegiatan, **Tanggal selesai kegiatan** (dengan keterangan rentang valid per angkatan, mis. "Valid untuk kegiatan 9 Okt 2025 – 9 Okt 2026" atau "sejak 1 Januari 2024"), Lokasi/Platform (teks bebas; kegiatan luring boleh), Penyelenggara, Jenis Lampiran.
  3. **Data SKEM (untuk Verifikator, tidak tercetak di formulir)** — Kategori, Tingkat, Peran, Capaian, Estimasi kredit.
- Setiap field: confidence (%) dan tombol "Kenapa?" (penjelasan + rujukan bagian Pedoman). Confidence rendah disorot amber.
- Hasil per pemeriksaan: kategori, tingkat, peran, nama kegiatan lengkap (tandai singkatan + saran nama lengkap), kecocokan nama, rentang tanggal, kelengkapan — ikon lolos / perlu perhatian / bermasalah.
- **Peringatan nama** (bukan pemblokir): "Nama di sertifikat: Budi Santosa. Nama di akun: Budi Santoso. Anda tetap bisa mengajukan; Verifikator akan memeriksa."
- Kombinasi tidak ada di tabel bobot: pesan jelas, arahkan ke Unit Kemahasiswaan, tanpa angka.
- Edit field → pratinjau formulir dan estimasi kredit ikut berubah.
- "Dokumen pendukung": tambah file lain (mis. SK). Tidak ada "surat keterangan penyelenggara".
- Panel lipat "Penggunaan token": token masuk/keluar, waktu proses.
- Bawah: lencana status, estimasi kredit besar, "Ajukan ke Verifikator" (aktif hanya jika Ready), kembali ke daftar.

### A5. Ajukan (satu atau batch) + e-sign mahasiswa
- **Pertama kali:** modal "Siapkan tanda tangan Anda", tab "Unggah gambar (PNG)" dan "Gambar di sini" (kanvas + Hapus), tombol "Simpan".
- **Dialog pengajuan:** judul "Tanda tangani dan kirim 3 pengajuan ke Dr. [dosen wali]?"; daftar yang dikirim (nama kegiatan, estimasi kredit); daftar yang **tidak ikut** + alasan (Perlu perbaikan, Bermasalah, masih dianalisis); jumlah yang memiliki peringatan; teks Pernyataan Mahasiswa lengkap; "Surabaya, [tanggal hari ini]"; pratinjau tanda tangan; nama dan NRP; keterangan proses online. Tombol utama **"Tanda tangani dan kirim"**.
- Sukses: toast "3 pengajuan terkirim ke Verifikator"; kartu menjadi Menunggu Verifikator dan hanya-baca.

### A6. Status pengajuan
- Kartu yang sudah diajukan hanya-baca: "Lihat detail"; setelah Verifikator menyetujui: "Unduh formulir (PDF)" (arsip).
- Timeline dengan waktu, pelaku, dan catatan staf. Disetujui → tampil **Kredit final**.

### A7. Profil
- Pratinjau tanda tangan + "Ganti tanda tangan". (Should) Hubungkan Telegram.

### A8. Advisor (Could)
- Sisa kredit, rekomendasi kegiatan Komponen 3 dengan estimasi poin, event/lomba dummy (tandai fitur tambahan).

## 5. Staf

### B1. Antrian Verifikator
- Judul "Antrian Kelas [nama kelas]"; hanya pengajuan kelasnya.
- Ringkasan: jumlah menunggu, jumlah dengan peringatan/bermasalah.
- Tabel: mahasiswa, kegiatan, kategori/tingkat, status AI (ikon), jumlah flag, confidence, estimasi kredit, tanggal masuk; ikon peringatan nama. Filter dan urut berdasarkan status AI.

### B2. Detail Verifikator (baca-saja)
- Semua data teks biasa (bukan input), tanpa pensil/override/"Ubah hasil AI".
- Pratinjau PDF, hasil tiap pemeriksaan + "Kenapa?", confidence, riwayat tanya-jawab agent, peringatan nama.
- Teks: "Keputusan Anda selalu berlaku, terlepas dari rekomendasi AI."
- Dua tombol: **Setujui** dan **Tolak**.
- **Tolak** → modal "Alasan penolakan", wajib; "Kirim penolakan" nonaktif sampai terisi; bantu: "Alasan akan dilihat mahasiswa". Tanpa tanda tangan.
- **Setujui** → pertama kali modal tanda tangan ("Simpan dan setujui"); berikutnya konfirmasi dengan pratinjau tanda tangan dan bagian III (nama, jabatan, tanggal, keputusan) → "Setujui dan bubuhkan tanda tangan". Catatan opsional.
- Toast: "Disetujui dan diteruskan ke Validator. Formulir final telah dibuat."
- Pengaturan Verifikator: pratinjau tanda tangan, "Ganti tanda tangan", "Tanda tangan hanya dipakai untuk formulir yang Anda setujui."

### C1. Antrian Validator (Should)
- Lintas kelas, filter kelas. Kolom: mahasiswa, kelas, kegiatan, kredit, "PDF formulir final: tersedia / belum tersedia".
- Tanpa menu Kelola Pengguna/Kelas atau Dukungan teknis.

### C2. Detail Validator (Should)
- PDF formulir final (dua tanda tangan), bukti, data SKEM, catatan Verifikator — hanya-baca. "Buat ulang" bila PDF belum ada.
- **Kredit final** satu-satunya yang bisa diubah: "Estimasi dari tabel: X" + tautan "Ubah kredit final" → kolom angka + **Alasan perubahan (wajib)**; "Simpan" aktif hanya jika angka berbeda dan alasan terisi. Riwayat: "Kredit final diubah dari 0,25 ke 0,5 oleh [Validator], [tanggal]. Alasan: …".
- Aksi **Validasi** (→ Disetujui) dan **Tolak** (modal alasan wajib).
- Alasan perubahan kredit hanya tampil di sisi Validator.

### D1. Monitoring Unit Kemahasiswaan (Could)
- Hanya-baca: jumlah per status resmi, per kelas, jenis kesalahan paling sering. Keterangan "Peran: monitoring dan evaluasi". Tanpa tombol keputusan.

## 6. Formulir FM.MHS.PENGAJUANSKEM (pratinjau & PDF final)
Header tabel: "Satuan Kredit Ekstrakurikuler Mahasiswa (SKEM) – Formulir Kegiatan SKEM", No. Identifikasi, No. Revisi, Tanggal Terbit, Halaman. Tanpa logo.

Halaman 1 (label : isi):
- **I. Identitas Mahasiswa:** Nama Lengkap, NRP, Program Studi, Departemen.
- **II. Informasi Kegiatan:** Nama Kegiatan, Tanggal Kegiatan, Lokasi / Platform, Penyelenggara, Jenis Lampiran, Bukti Kegiatan ("terlampir").
- **III. Verifikasi:** Nama Verifikator, Jabatan, Tanggal Verifikasi, Keputusan (☐ Disetujui ☐ Ditolak), Tanda Tangan. Sebelum disetujui: kosong, keterangan abu-abu "Diisi otomatis saat Verifikator menyetujui".
- **IV. Pernyataan Mahasiswa:** paragraf pernyataan kebenaran data, "Surabaya, [tanggal]", tanda tangan, (Nama) (NRP). Sebelum diajukan: placeholder "Tanda tangan dibubuhkan saat Anda mengajukan".

Halaman 2: **Lampiran Bukti Kegiatan** (gambar sertifikat).

Kategori, tingkat, peran, capaian, kredit **tidak** ada di formulir.

## 7. Data dummy demo
- Mahasiswa **Budi Santoso**, NRP fiktif, D3 Teknik Informatika, Departemen Teknik Informatika dan Komputer, angkatan 2025, kelas **2 D3 IT B**.
- Verifikator: Dr. [nama fiktif], jabatan "Dosen Wali Kelas 2 D3 IT B". Dua kelas lain dengan dosen wali berbeda (untuk menunjukkan pemisahan antrian). Satu Validator, satu akun Unit.
- Batch contoh (5 file):
  1. `sertif_seminar_nasional.pdf` → Ready
  2. `juara2_lomba_desain.pdf` → Perlu perbaikan (asal peserta tidak disebut; jawaban demo "Minimal 3 provinsi" → Nasional)
  3. `pelatihan_cloud.pdf` → Ready
  4. `panitia_dies_natalis.pdf` → Ready
  5. `sertif_lkmm.pdf` → Bermasalah (atas nama Nisa Rahma)
- Temuan contoh lain: nama kegiatan disingkat, ejaan nama beda satu huruf (Ready + peringatan), tanggal di luar rentang angkatan, kombinasi tidak ada di tabel.
