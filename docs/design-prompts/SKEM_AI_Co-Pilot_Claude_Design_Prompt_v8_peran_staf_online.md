# Prompt Claude Design — Verifikator Baca-saja, Validator, dan Proses Online (v8, berdasarkan PRD v0.11)

Tempel setelah prompt v3 sampai v7. Jika ada yang bertentangan dengan prompt sebelumnya, ikuti prompt ini. Salin semua isi di bawah garis ini.

---

Perbarui desain SKEM AI Co-Pilot dengan perubahan berikut. Pertahankan gaya visual dan komponen yang sudah ada.

## 1. Verifikator hanya membaca, lalu Setujui atau Tolak
- **Hapus** dari layar Verifikator semua kontrol edit: tombol/menu "Ubah hasil AI", override kategori, tingkat, peran, atau skor, ikon pensil, dan field yang bisa diisi. Semua data pengajuan tampil **hanya-baca** (teks biasa, bukan input).
- Aksi di detail pengajuan hanya dua tombol: **Setujui** dan **Tolak**.
- **Tolak** membuka modal "Alasan penolakan" dengan kolom teks **wajib diisi**. Tombol "Kirim penolakan" nonaktif sampai alasan terisi (tampilkan pesan bantu: "Alasan akan dilihat mahasiswa").
- **Setujui** tetap memakai alur e-sign dari prompt v5 (modal tanda tangan pertama kali, lalu konfirmasi dengan pratinjau bagian III). Catatan boleh dikosongkan.
- Di tabel antrian dan detail, hapus kolom atau lencana apa pun yang menyiratkan data "diubah" atau "dikoreksi" oleh Verifikator.

## 2. Validator: Validasi atau Tolak, boleh mengubah kredit final
- Detail pengajuan di antrian Validator menampilkan PDF formulir final (kedua tanda tangan), bukti, data SKEM (kategori, tingkat, peran, capaian, tanggal, penyelenggara), catatan Verifikator, dan indikator "PDF formulir final: tersedia / belum tersedia" dengan tombol "Buat ulang" bila belum ada. Semua data kegiatan **hanya-baca**.
- Satu-satunya kolom yang bisa diubah adalah **Kredit final**. Nilai awalnya sama dengan estimasi dari tabel bobot, dengan label "Estimasi dari tabel: X". Ada tautan kecil "Ubah kredit final".
- Menekan "Ubah kredit final" membuka kolom angka dan kolom **Alasan perubahan (wajib)**. "Simpan" nonaktif sampai angka berbeda dan alasan terisi. Setelah disimpan tampil baris riwayat di panel Validator: "Kredit final diubah dari 0,25 ke 0,5 oleh [nama Validator], [tanggal]. Alasan: [teks]".
- Aksi: **Validasi** (status menjadi Disetujui, kredit final ditetapkan) dan **Tolak** (modal alasan wajib, sama seperti Verifikator).
- Mahasiswa pada kartu yang sudah Disetujui melihat **Kredit final**. Alasan perubahan hanya tampil di sisi Validator.

## 3. Hapus fitur kelola pengguna dan dukungan teknis
Layar Validator tidak memiliki menu "Kelola Pengguna", "Kelola Kelas", "Tambah/Ubah/Hapus akun", atau "Dukungan teknis". Jika ada di desain sebelumnya, hapus. Validator hanya memiliki antrian, detail, dan riwayat keputusannya sendiri. Akun dan kelas berasal dari data contoh (ditandai "Simulasi").

## 4. Seluruh proses online
- Hapus tombol atau teks yang mengarahkan pengguna **mencetak formulir** untuk ditandatangani, menandatangani di kertas, atau mengunggah formulir bertanda tangan.
- Di halaman Unggah dan di dialog "Tanda tangani dan kirim", tambahkan keterangan kecil: "Seluruh proses pengajuan dilakukan online. Tidak perlu mencetak atau menandatangani formulir kertas."
- Tombol "Unduh formulir (PDF)" setelah Verifikator menyetujui **tetap ada** sebagai arsip, bukan untuk ditandatangani ulang.
- Field "Lokasi / Platform" tetap teks bebas; kegiatan luring tetap boleh diajukan (bukti berupa sertifikat PDF). Jangan menambah pemblokir atau peringatan untuk kegiatan luring.

## 5. Pertanyaan tingkat kegiatan berupa pilihan jawaban
Saat agent bertanya tentang tingkat (di kartu Perlu perbaikan), tampilkan pilihan, bukan kolom teks bebas:
- Pertanyaan: "Peserta kegiatan ini berasal dari mana?"
- Pilihan (radio): "Hanya lingkungan PENS", "Satu provinsi (minimal 3 kota/kabupaten)", "Minimal 3 provinsi di Indonesia", "Minimal 3 negara", "Saya tidak tahu".
- Teks bantu kecil: "Tingkat kegiatan ditentukan oleh asal peserta, bukan lokasi acara."
- Tombol "Kenapa?" di samping pertanyaan menampilkan rujukan Pedoman (definisi Tingkat Kegiatan).
