# Rencana Kerja Hackathon (sekitar 20 jam) dan Checklist Submit

Catatan: jam asli di bawah perkiraan. Sesuaikan dengan jadwal panitia. **Konfirmasi batas pengumpulan**, karena PDF tertulis "10 September 2026, 09.00 WIB" (kemungkinan salah ketik untuk 10 Oktober).

## Aturan emas
1. **Repo kosong saat acara dimulai.** Commit kecil dan sering, dengan riwayat utuh.
2. **Pipeline tipis end-to-end dulu**, baru dipoles. Jam ke-6 harus sudah ada alur upload → hasil → tersimpan.
3. **Ukur sambil jalan:** akurasi (test set) dan token (log) dari awal, bukan di akhir.
4. **Rekam video demo cadangan lebih awal**, jangan menunggu jam terakhir.
5. **Bekukan fitur** sekitar 3 jam sebelum batas, setelah itu hanya perbaikan bug, README, dan latihan pitch.

## Jam 0–1: setup dan uji model (semua)
- Install OpenCode, pasang konfigurasi dan API key panitia (key tidak masuk repo; buat `.env.example`).
- **Uji vision:** kirim 3 foto sertifikat dummy (satu bersih, satu miring, satu silau) ke `qwen3.8-omni-flash` lewat gateway. Catat apakah isi terbaca dan apakah structured output (JSON) bisa dipakai.
- **Keputusan di jam ke-1:** vision langsung bisa → lanjut. Tidak bisa → cadangan: OCR lokal (mis. Tesseract) atau model lain di gateway, dan perbarui klaim privasi.
- Buat repo, struktur folder, deploy/local run kosong, dan sepakati kontrak data (bentuk JSON hasil ekstraksi dan hasil pre-check).

## Jam 1–6: fondasi (paralel)
| Anggota | Tugas |
|---|---|
| A: AI pipeline | Prompt ekstraksi dengan JSON schema; pemanggilan model; wrapper yang mencatat token dan latensi tiap panggilan |
| B: Rule engine & data | Tabel bobot JSON (hitung jumlah barisnya); `lookup_credit_table`, `check_deadline`, `match_name`; pecahan Pedoman bertag dan `get_relevant_sections`; skema database (SQLite) |
| C: UI & data | Layout, halaman upload dan hasil, 10 sertifikat dummy pertama (termasuk skenario "Juara II Lomba Desain, 5 provinsi" dan foto HP) |

**Target jam 6:** upload sertifikat → model membaca → tool menghitung → hasil tampil dan tersimpan (bertahan setelah refresh).

## Jam 6–12: fitur Core
- Pre-Check Agent lengkap: lima pemeriksaan, confidence, "Kenapa?" dengan rujukan Pedoman, `ask_student` (maks 3 pertanyaan), estimasi kredit.
- Draf formulir verifikasi (PDF atau halaman cetak).
- **Staff Review Queue per kelas (Verifikator baca-saja):** daftar, detail, hanya Setujui atau Tolak; alasan wajib saat menolak; tidak ada edit data.
- Status pengajuan (Draf → Menunggu Verifikator → Menunggu Validator → Disetujui / Ditolak) dan riwayat.
- Perluas test set ke 30 kasus; buat skrip evaluasi (`npm run eval`) yang mencetak akurasi per jenis kesalahan.
- **Jam 10–12: checkpoint scope.** Kalau Core belum stabil, pangkas: Advisor (rekomendasi) dan Checkpoint B dipotong dulu.

## Jam 12–16: kualitas dan nilai tambah
- Jalankan eval, perbaiki prompt dan aturan. **Sisihkan sebagian kasus (held-out)** untuk angka akurasi akhir.
- **Efisiensi token (15%):** lihat log, cari pemborosan (prompt terlalu panjang, bagian Pedoman berlebih, panggilan ulang), optimalkan, lalu ukur lagi akurasi supaya terbukti tidak turun. Catat sebelum/sesudah di README.
- Penanganan kegagalan: foto buram, kombinasi tidak ada di tabel, timeout/API error, jawaban mahasiswa tidak jelas. Pesan error harus jelas di UI.
- Checkpoint B otomatis: setelah Verifikator menyetujui, buat PDF formulir final (e-sign mahasiswa dan Verifikator) dan teruskan ke antrian Validator. Tidak ada integrasi spreadsheet.
- Antrian Validator: Validasi atau Tolak (alasan wajib); Validator boleh mengubah kredit final dengan alasan wajib (tercatat). Tanpa kelola akun/CRUD pengguna; akun dari data seed.
- **Notifikasi bot Telegram = Should have:** mulai hanya jika Must have sudah stabil (sekitar jam 12 atau lebih), perkiraan 1 jam. Buat bot lewat BotFather (token di `.env`), tautan "Hubungkan Telegram" (`t.me/<bot>?start=<token>`, pengguna harus menekan Start), long polling. Satu pemicu dari tindakan staf (mis. Verifikator menyetujui); notifikasi dalam aplikasi sebagai cadangan (aturan panitia: pesan butuh persetujuan staf).

## Jam 16–19: freeze dan dokumen
- **Bekukan fitur.** Hanya perbaiki bug.
- Isi README (template di `repo-templates/`) dan `tech.md` dengan angka nyata.
- Tes setup dari nol di mesin lain (clone, install, jalan), pastikan langkah di README benar.
- Hapus API key dan data pribadi dari repo (cek juga riwayat commit).
- Rekam **video demo 2–5 menit**: input → hasil, sertakan contoh input dan akses uji.
- Finalkan deck (maks 7 slide; template: `SKEM_AI_CoPilot_Pitch_7slide.pptx`), tambahkan angka akurasi dan token yang nyata.

## Jam 19–20: submit
- Commit final, **catat hash commit**, berikan akses repo ke penyelenggara.
- Submit ke kanal resmi: link GitHub, presentasi, video demo. Lakukan **sebelum** batas waktu. Perubahan kode setelah cutoff tidak dinilai.

## Pitch (hari kedua): urutan yang diminta panitia
1. **Problem statement:** target user, tugas, input, output yang diharapkan (slide 1–3).
2. **Live workflow:** alur lengkap dengan data contoh **dan satu input baru** dari juri atau yang belum pernah dicoba (slide 4 sebagai pegangan).
3. **Technical overview:** komponen AI, tools, penyimpanan, keterbatasan, dan bagian yang disimulasikan (slide 5–7).
Latih 2–3 kali dengan timer. Siapkan video sebagai cadangan jika internet atau API bermasalah.

## Cara memenangkan poin
| Kriteria | Bobot | Yang harus terlihat |
|---|---|---|
| Akurasi solusi | 30% | Angka akurasi per jenis kesalahan dari kasus held-out; input baru berhasil; kegagalan ditangani anggun |
| Ide & orisinalitas | 20% | Pengguna jelas (dosen wali), bukti wawancara, jujur soal batas bukti |
| Pitching | 20% | Alur rapi, demo lancar, jawaban akurat, waktu tepat |
| UI/UX | 15% | Status proses, state error, hasil mudah dibaca, "Kenapa?" |
| Efisiensi token | 15% | Log lengkap, optimasi terukur tanpa menurunkan akurasi |

## Checklist submit (centang sebelum kirim)
- [ ] Alur utama jalan dari input sampai output lewat UI
- [ ] Minimal satu tool/data di luar LLM berfungsi (tabel bobot, cek deadline, cocok nama)
- [ ] UI menampilkan sumber/rujukan, status eksekusi, atau ringkasan tugas
- [ ] Hasil dan riwayat bertahan setelah refresh
- [ ] Menerima input baru saat demo; komponen simulasi ditandai jelas
- [ ] README lengkap: user, masalah, alur, sumber data, arsitektur, setup, test case dan hasil, token, keterbatasan, tim
- [ ] `tech.md`: AI coding assistant, library, template, pekerjaan saat acara
- [ ] Setup README sudah dites dari nol
- [ ] Tidak ada API key dan data pribadi di repo maupun riwayat commit
- [ ] Riwayat commit utuh; hash commit final dicatat; akses repo untuk panitia
- [ ] Video demo 2–5 menit
- [ ] Presentasi maks 7 slide (atau satu halaman)
- [ ] Link GitHub, presentasi, video dikirim lewat kanal resmi sebelum batas

## Pertanyaan untuk panitia (tanyakan segera)
1. Batas pengumpulan tepatnya kapan ("10 September" di PDF)?
2. Apakah dosen pembimbing perlu terdaftar sebagai anggota tim (syarat minimal satu dosen dan satu mahasiswa aktif)?
3. Apakah Qwen 3.8 Omni Flash menerima input gambar? Apakah ada batas ukuran gambar dan batas laju (rate limit)?
4. Bolehkah memakai API model di luar gateway panitia untuk bagian aplikasi (token tidak dihitung)?
5. Bagaimana cara log token dinilai (dari log gateway, atau dari log tim sendiri)?
