import { writeFileSync } from 'node:fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function generateVectorCases() {
  // Helper warna
  const brandDark = rgb(0.07, 0.2, 0.23); // #12343B
  const brandTeal = rgb(0.12, 0.44, 0.41); // #1F7068
  const brandAmber = rgb(0.91, 0.64, 0.24); // #E8A33D
  const textDark = rgb(0.1, 0.1, 0.1);
  const textMuted = rgb(0.4, 0.4, 0.4);
  const redText = rgb(0.7, 0.15, 0.15);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. c001: Juara II Lomba Desain (Tuning, demo utama, K3-B01)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]); // Landscape A4
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    // Border sertifikat
    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: brandAmber,
      borderWidth: 5,
    });
    page.drawRectangle({
      x: 40,
      y: 40,
      width: 762,
      height: 515,
      borderColor: brandDark,
      borderWidth: 2,
    });

    page.drawText('SERTIFIKAT PENGHARGAAN', {
      x: 230,
      y: 470,
      size: 26,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('Nomor: 142/SK/FKD/V/2026', {
      x: 330,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('Sertifikat ini diberikan dengan bangga kepada:', {
      x: 280,
      y: 390,
      size: 14,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('BUDI SANTOSO', {
      x: 310,
      y: 340,
      size: 28,
      font: fontBold,
      color: brandTeal,
    });

    page.drawLine({
      start: { x: 260, y: 325 },
      end: { x: 580, y: 325 },
      thickness: 1.5,
      color: brandAmber,
    });

    page.drawText('Atas prestasinya sebagai:', {
      x: 345,
      y: 295,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('JUARA II', {
      x: 360,
      y: 260,
      size: 24,
      font: fontBold,
      color: redText,
    });

    page.drawText('dalam kegiatan Lomba Desain Poster Inovasi Kreatif Mahasiswa 2026', {
      x: 200,
      y: 215,
      size: 14,
      font: fontBold,
      color: textDark,
    });
    page.drawText(
      'yang diselenggarakan oleh Forum Komunikasi Desain Kreatif Mahasiswa pada tanggal 15 Mei 2026.',
      {
        x: 140,
        y: 190,
        size: 12,
        font: fontRegular,
        color: textDark,
      },
    );

    // Tanda tangan
    page.drawText('Ketua Pelaksana,', {
      x: 160,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Wahyu Hidayat, S.Ds.', {
      x: 160,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    page.drawText('Ketua Forum Kreatif,', {
      x: 560,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Arif Wicaksono, M.Sn.', {
      x: 560,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c001_juara2_lomba_desain.pdf', pdfBytes);
    console.log('OK c001_juara2_lomba_desain.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. c002: Sertifikat atas nama orang lain (Nisa Rahma) - Tuning, K3-B03
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: rgb(0.2, 0.3, 0.5),
      borderWidth: 4,
    });

    page.drawText('SERTIFIKAT KEHADIRAN', {
      x: 255,
      y: 470,
      size: 26,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText('Nomor: 215/SEM-AI/VIII/2025', {
      x: 335,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('Diberikan kepada:', {
      x: 370,
      y: 390,
      size: 14,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('NISA RAHMA', {
      x: 325,
      y: 340,
      size: 28,
      font: fontBold,
      color: brandDark,
    });

    page.drawLine({
      start: { x: 280, y: 325 },
      end: { x: 560, y: 325 },
      thickness: 1.5,
      color: brandTeal,
    });

    page.drawText('Sebagai:', {
      x: 395,
      y: 295,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('PESERTA DARING', {
      x: 330,
      y: 260,
      size: 22,
      font: fontBold,
      color: brandTeal,
    });

    page.drawText(
      'dalam Seminar Nasional Perkembangan Kecerdasan Buatan dan Robotika Cerdas 2025',
      {
        x: 140,
        y: 215,
        size: 14,
        font: fontBold,
        color: textDark,
      },
    );
    page.drawText(
      'Tingkat Nasional yang diselenggarakan oleh Pusat Studi Informatika Nusantara pada tanggal 20 Agustus 2025.',
      {
        x: 100,
        y: 190,
        size: 12,
        font: fontRegular,
        color: textDark,
      },
    );

    page.drawText('Surabaya, 20 Agustus 2025', {
      x: 540,
      y: 120,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Ketua Pelaksana Seminar,', {
      x: 540,
      y: 105,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Prof. Dr. Ir. Gunawan Wibisono, M.T.', {
      x: 540,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c002_nama_orang_lain.pdf', pdfBytes);
    console.log('OK c002_nama_orang_lain.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. c003: Beda ejaan nama satu huruf (Rizki Pratama vs Rizky Pratama) - Tuning, K1-03
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: brandTeal,
      borderWidth: 4,
    });

    page.drawText('SERTIFIKAT KELULUSAN LKMM PRA-TD', {
      x: 165,
      y: 470,
      size: 24,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('Nomor: 045/BEM-PENS/LKMM/IX/2024', {
      x: 310,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('Kementerian PSDM Badan Eksekutif Mahasiswa PENS', {
      x: 250,
      y: 415,
      size: 12,
      font: fontRegular,
      color: brandTeal,
    });
    page.drawText('menerangkan bahwa mahasiswa:', {
      x: 315,
      y: 380,
      size: 13,
      font: fontRegular,
      color: textDark,
    });

    page.drawText('RIZKI PRATAMA', {
      x: 305,
      y: 335,
      size: 28,
      font: fontBold,
      color: brandDark,
    });

    page.drawLine({
      start: { x: 270, y: 320 },
      end: { x: 570, y: 320 },
      thickness: 1.5,
      color: brandAmber,
    });

    page.drawText('Telah LULUS sebagai PESERTA dalam pelatihan kepemimpinan mahasiswa:', {
      x: 190,
      y: 280,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Latihan Keterampilan Manajemen Mahasiswa Pra-Tingkat Dasar (LKMM Pra-TD) 2024', {
      x: 125,
      y: 250,
      size: 15,
      font: fontBold,
      color: brandTeal,
    });
    page.drawText(
      'yang diselenggarakan pada tanggal 14 - 15 September 2024 di Kampus PENS Surabaya.',
      {
        x: 160,
        y: 220,
        size: 12,
        font: fontRegular,
        color: textDark,
      },
    );

    page.drawText('Presiden Mahasiswa BEM PENS,', {
      x: 140,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Fajar Maulana', {
      x: 140,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    page.drawText('Koordinator LKMM Pra-TD,', {
      x: 540,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Dian Anggraini', {
      x: 540,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c003_beda_ejaan_nama.pdf', pdfBytes);
    console.log('OK c003_beda_ejaan_nama.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. c004: Nama kegiatan disingkat (Panitia LKTIN 2025) - Tuning, K3-A02
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: rgb(0.3, 0.4, 0.3),
      borderWidth: 4,
    });

    page.drawText('SERTIFIKAT KEPANITIAAN', {
      x: 250,
      y: 470,
      size: 26,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('Nomor: 012/PAN-LKTIN/III/2025', {
      x: 325,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('Diberikan kepada:', {
      x: 370,
      y: 390,
      size: 14,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('SITI NURHALIZA', {
      x: 305,
      y: 340,
      size: 28,
      font: fontBold,
      color: brandDark,
    });

    page.drawLine({
      start: { x: 270, y: 325 },
      end: { x: 570, y: 325 },
      thickness: 1.5,
      color: brandAmber,
    });

    page.drawText('Sebagai:', {
      x: 395,
      y: 295,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('ANGGOTA PANITIA', {
      x: 310,
      y: 260,
      size: 22,
      font: fontBold,
      color: brandTeal,
    });

    page.drawText('dalam kegiatan: LKTIN 2025', {
      x: 285,
      y: 215,
      size: 18,
      font: fontBold,
      color: textDark,
    });
    page.drawText(
      'Tingkat Kampus yang diselenggarakan oleh Himpunan Mahasiswa Departemen Informatika PENS pada tanggal 10 Maret 2025.',
      {
        x: 80,
        y: 185,
        size: 12,
        font: fontRegular,
        color: textDark,
      },
    );

    page.drawText('Ketua HIMA Informatika,', {
      x: 160,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Rian Pratama', {
      x: 160,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    page.drawText('Ketua Pelaksana LKTIN 2025,', {
      x: 530,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Anugrah Ilham', {
      x: 530,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c004_nama_kegiatan_singkat.pdf', pdfBytes);
    console.log('OK c004_nama_kegiatan_singkat.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. c005: Tanggal di luar rentang angkatan 2025 - Tuning, K3-B04
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: rgb(0.2, 0.4, 0.6),
      borderWidth: 4,
    });

    page.drawText('SERTIFIKAT PELATIHAN & WORKSHOP', {
      x: 180,
      y: 470,
      size: 24,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('Nomor: 89/DTI-JATIM/V/2024', {
      x: 335,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('Diberikan kepada:', {
      x: 370,
      y: 390,
      size: 14,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('DIMAS ANGGARA', {
      x: 295,
      y: 340,
      size: 28,
      font: fontBold,
      color: brandDark,
    });

    page.drawLine({
      start: { x: 260, y: 325 },
      end: { x: 580, y: 325 },
      thickness: 1.5,
      color: brandAmber,
    });

    page.drawText('Sebagai:', {
      x: 395,
      y: 295,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('PESERTA LURING', {
      x: 325,
      y: 260,
      size: 22,
      font: fontBold,
      color: brandTeal,
    });

    page.drawText('dalam Workshop Pemrograman Antarmuka Web Modern Regional Jawa Timur', {
      x: 160,
      y: 215,
      size: 14,
      font: fontBold,
      color: textDark,
    });
    page.drawText(
      'Tingkat Regional yang diselenggarakan oleh Dinas Komunikasi dan Informatika Jawa Timur pada tanggal 10 Mei 2024.',
      {
        x: 90,
        y: 190,
        size: 12,
        font: fontRegular,
        color: textDark,
      },
    );

    page.drawText('Kepala Dinas Kominfo Jawa Timur,', {
      x: 520,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Ir. H. Mochammad Syarif, M.MT.', {
      x: 520,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c005_tanggal_kadaluarsa.pdf', pdfBytes);
    console.log('OK c005_tanggal_kadaluarsa.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. c006: Kombinasi tidak ada di tabel (K3-C02 Tingkat Internasional) - Tuning
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({
      x: 30,
      y: 30,
      width: 782,
      height: 535,
      borderColor: rgb(0.6, 0.4, 0.2),
      borderWidth: 4,
    });

    page.drawText('CERTIFICATE OF RECOGNITION', {
      x: 230,
      y: 470,
      size: 24,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('No: 077/INT-ROBO/VII/2025', {
      x: 345,
      y: 440,
      size: 12,
      font: fontRegular,
      color: textMuted,
    });

    page.drawText('This certificate is proudly presented to:', {
      x: 290,
      y: 390,
      size: 14,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('FARHAN RAMADHAN', {
      x: 275,
      y: 340,
      size: 28,
      font: fontBold,
      color: brandDark,
    });

    page.drawLine({
      start: { x: 250, y: 325 },
      end: { x: 590, y: 325 },
      thickness: 1.5,
      color: brandAmber,
    });

    page.drawText('In recognition of honorable role as:', {
      x: 310,
      y: 295,
      size: 13,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('PELATIH (HEAD COACH)', {
      x: 280,
      y: 260,
      size: 22,
      font: fontBold,
      color: brandTeal,
    });

    page.drawText('in the International Youth Robotics Boot Camp 2025 (Tingkat Internasional)', {
      x: 165,
      y: 215,
      size: 14,
      font: fontBold,
      color: textDark,
    });
    page.drawText('organized by Global Youth Robotics Association on July 22, 2025.', {
      x: 210,
      y: 190,
      size: 12,
      font: fontRegular,
      color: textDark,
    });

    page.drawText('Executive Director,', {
      x: 540,
      y: 110,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Prof. Andrew Tan, Ph.D.', {
      x: 540,
      y: 65,
      size: 12,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c006_kombinasi_tidak_ada_di_tabel.pdf', pdfBytes);
    console.log('OK c006_kombinasi_tidak_ada_di_tabel.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. c009: Dokumen yang bukan sertifikat (Kuitansi UKT) - Tuning
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // Portrait A4
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    // Header institusi
    page.drawText('POLITEKNIK ELEKTRONIKA NEGERI SURABAYA', {
      x: 95,
      y: 770,
      size: 16,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('BAGIAN KEUANGAN & TATA USAHA - BUKTI TRANSAKSI PEMBAYARAN', {
      x: 115,
      y: 750,
      size: 10,
      font: fontRegular,
      color: textMuted,
    });

    page.drawLine({
      start: { x: 50, y: 735 },
      end: { x: 545, y: 735 },
      thickness: 2,
      color: brandDark,
    });

    page.drawText('KUITANSI PEMBAYARAN BIAYA PENDIDIKAN (UKT)', {
      x: 105,
      y: 690,
      size: 15,
      font: fontBold,
      color: textDark,
    });
    page.drawText('No. Transaksi: TRX-20250815-992147', {
      x: 190,
      y: 665,
      size: 11,
      font: fontRegular,
      color: textMuted,
    });

    // Box data kuitansi
    page.drawRectangle({
      x: 50,
      y: 380,
      width: 495,
      height: 250,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    const rows: [string, string][] = [
      ['Nama Mahasiswa', ': BAYU SAPUTRA'],
      ['NRP', ': 3125600042'],
      ['Program Studi', ': D4 Teknik Elektronika'],
      ['Tahun Akademik / Semester', ': 2025/2026 - Gasal (Semester 1)'],
      ['Jenis Pembayaran', ': Uang Kuliah Tunggal (UKT) - Golongan 4'],
      ['Kanal Pembayaran', ': Bank Syariah Indonesia Virtual Account'],
      ['Tanggal Pembayaran', ': 15 Agustus 2025, 10:24:18 WIB'],
      ['Jumlah Pembayaran', ': Rp 4.500.000,00'],
      ['Status Transaksi', ': LUNAS (BERHASIL)'],
    ];

    let rowY = 595;
    for (const [col1, col2] of rows) {
      page.drawText(col1, {
        x: 70,
        y: rowY,
        size: 11,
        font: fontBold,
        color: textDark,
      });
      page.drawText(col2, {
        x: 245,
        y: rowY,
        size: 11,
        font: col1.includes('Status') ? fontBold : fontRegular,
        color: col1.includes('Status') ? brandTeal : textDark,
      });
      rowY -= 25;
    }

    page.drawText(
      '* Kuitansi ini adalah bukti sah pembayaran keuangan dan bukan dokumen sertifikat kegiatan.',
      {
        x: 50,
        y: 340,
        size: 9,
        font: fontRegular,
        color: textMuted,
      },
    );

    page.drawText('Surabaya, 15 Agustus 2025', {
      x: 370,
      y: 270,
      size: 10,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Bendahara Penerimaan PENS,', {
      x: 370,
      y: 255,
      size: 10,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Siti Rahmawati, S.E., M.Ak.', {
      x: 370,
      y: 195,
      size: 11,
      font: fontBold,
      color: textDark,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c009_bukan_sertifikat.pdf', pdfBytes);
    console.log('OK c009_bukan_sertifikat.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. c010: Kasus benar tanpa kesalahan (K3-D01 Upacara Bendera) - Heldout
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // Portrait A4
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    page.drawText('POLITEKNIK ELEKTRONIKA NEGERI SURABAYA', {
      x: 105,
      y: 770,
      size: 15,
      font: fontBold,
      color: brandDark,
    });
    page.drawText('DIREKTORAT KEMAHASISWAAN DAN ALUMNI', {
      x: 145,
      y: 750,
      size: 12,
      font: fontBold,
      color: brandTeal,
    });
    page.drawText('Kampus PENS, Jalan Raya ITS Sukolilo, Surabaya 60111 | www.pens.ac.id', {
      x: 125,
      y: 735,
      size: 9,
      font: fontRegular,
      color: textMuted,
    });

    page.drawLine({
      start: { x: 50, y: 720 },
      end: { x: 545, y: 720 },
      thickness: 2,
      color: brandDark,
    });

    page.drawText('SURAT KETERANGAN UPACARA BENDERA', {
      x: 125,
      y: 670,
      size: 15,
      font: fontBold,
      color: textDark,
    });
    page.drawText('Nomor: 17/DIR-KEMAHASISWAAN/VIII/2025', {
      x: 175,
      y: 645,
      size: 11,
      font: fontRegular,
      color: textMuted,
    });

    const desc =
      'Direktur Kemahasiswaan Politeknik Elektronika Negeri Surabaya dengan ini menerangkan bahwa:';
    page.drawText(desc, {
      x: 50,
      y: 590,
      size: 11,
      font: fontRegular,
      color: textDark,
    });

    const rows: [string, string][] = [
      ['Nama Mahasiswa', ': ANISA PUTRI'],
      ['NRP', ': 3124600005'],
      ['Program Studi', ': D4 Teknik Informatika'],
      ['Angkatan', ': 2024'],
      ['Kegiatan', ': Upacara Peringatan Hari Kemerdekaan RI ke-80 (Upacara Bendera)'],
      ['Tanggal Pelaksanaan', ': 17 Agustus 2025'],
      ['Tempat', ': Lapangan Upacara Kampus PENS Surabaya'],
    ];

    let rowY = 540;
    for (const [col1, col2] of rows) {
      page.drawText(col1, {
        x: 70,
        y: rowY,
        size: 11,
        font: fontBold,
        color: textDark,
      });
      page.drawText(col2, {
        x: 215,
        y: rowY,
        size: 11,
        font: col1.includes('Nama') ? fontBold : fontRegular,
        color: textDark,
      });
      rowY -= 30;
    }

    const statement =
      'Telah hadir dan mengikuti Upacara Bendera secara tertib dan penuh tanggung jawab. ' +
      'Surat keterangan ini diterbitkan sebagai bukti keikutsertaan kegiatan kemahasiswaan ' +
      'untuk pemenuhan Satuan Kredit Kegiatan Mahasiswa (SKEM) Komponen 3 Bidang D.';
    page.drawText(statement.slice(0, 85), {
      x: 50,
      y: 300,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText(statement.slice(85, 172), {
      x: 50,
      y: 280,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText(statement.slice(172), {
      x: 50,
      y: 260,
      size: 11,
      font: fontRegular,
      color: textDark,
    });

    page.drawText('Surabaya, 18 Agustus 2025', {
      x: 370,
      y: 190,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Direktur Kemahasiswaan,', {
      x: 370,
      y: 175,
      size: 11,
      font: fontRegular,
      color: textDark,
    });
    page.drawText('Dr. Tri Budi Santoso, S.T., M.T.', {
      x: 370,
      y: 115,
      size: 11,
      font: fontBold,
      color: textDark,
    });
    page.drawText('NIP. 197405101999031001', {
      x: 370,
      y: 95,
      size: 10,
      font: fontRegular,
      color: textMuted,
    });

    const pdfBytes = await doc.save();
    writeFileSync('data/testset/cases/c010_kasus_benar_lengkap.pdf', pdfBytes);
    console.log('OK c010_kasus_benar_lengkap.pdf');
  }
}

generateVectorCases().catch((err) => {
  console.error(err);
  process.exit(1);
});
