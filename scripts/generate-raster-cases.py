import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
FONT_SERIF_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"

def generate_c007():
    """Foto HP miring/silau disimpan sebagai PDF (K3-C01 Regional Juara 1)"""
    # 1. Gambar sertifikat asli
    cert_w, cert_h = 1200, 850
    cert = Image.new("RGB", (cert_w, cert_h), (252, 250, 245))
    draw = ImageDraw.Draw(cert)

    # Frame & border ornamen
    draw.rectangle([(20, 20), (cert_w - 20, cert_h - 20)], outline=(190, 150, 60), width=6)
    draw.rectangle([(32, 32), (cert_w - 32, cert_h - 32)], outline=(30, 60, 90), width=3)
    draw.rectangle([(38, 38), (cert_w - 38, cert_h - 38)], outline=(190, 150, 60), width=1)

    # Font setup
    f_title = ImageFont.truetype(FONT_SERIF_BOLD, 46)
    f_sub = ImageFont.truetype(FONT_REGULAR, 22)
    f_name = ImageFont.truetype(FONT_BOLD, 42)
    f_body = ImageFont.truetype(FONT_REGULAR, 24)
    f_bold = ImageFont.truetype(FONT_BOLD, 26)
    f_small = ImageFont.truetype(FONT_REGULAR, 18)

    # Teks sertifikat
    draw.text((cert_w / 2, 90), "PIAGAM PENGHARGAAN", fill=(25, 45, 75), font=f_title, anchor="mm")
    draw.text((cert_w / 2, 140), "No: 114/PBSI-JTM/XI/2025", fill=(100, 100, 100), font=f_small, anchor="mm")
    draw.text((cert_w / 2, 195), "Diberikan dengan hormat kepada:", fill=(60, 60, 60), font=f_sub, anchor="mm")
    draw.text((cert_w / 2, 260), "DEWI ANGGRAINI", fill=(20, 35, 60), font=f_name, anchor="mm")
    draw.line([(350, 290), (850, 290)], fill=(190, 150, 60), width=2)

    draw.text((cert_w / 2, 340), "Sebagai", fill=(80, 80, 80), font=f_sub, anchor="mm")
    draw.text((cert_w / 2, 390), "JUARA I", fill=(180, 40, 30), font=f_bold, anchor="mm")

    text_event = (
        "dalam Kejuaraan Bulu Tangkis Antar Mahasiswa Regional Jawa Timur 2025\n"
        "Tingkat Regional\n"
        "yang diselenggarakan pada tanggal 12 November 2025 di Surabaya"
    )
    draw.multiline_text((cert_w / 2, 470), text_event, fill=(40, 40, 40), font=f_body, anchor="mm", align="center", spacing=10)

    # Tanda tangan & cap
    draw.text((280, 650), "Ketua Panitia Pelaksana,", fill=(50, 50, 50), font=f_small, anchor="mm")
    draw.text((280, 730), "Dr. Hendra Wijaya, M.Pd.", fill=(30, 30, 30), font=f_bold, anchor="mm")
    draw.text((cert_w - 280, 650), "Pengprov PBSI Jawa Timur,", fill=(50, 50, 50), font=f_small, anchor="mm")
    draw.text((cert_w - 280, 730), "Bambang Sutrisno, S.E.", fill=(30, 30, 30), font=f_bold, anchor="mm")

    # Stempel buatan
    stamp = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stamp)
    s_draw.ellipse([(10, 10), (130, 130)], outline=(30, 70, 180, 190), width=3)
    s_draw.ellipse([(18, 18), (122, 122)], outline=(30, 70, 180, 190), width=1)
    s_draw.text((70, 70), "PBSI JATIM\nTERVERIFIKASI", fill=(30, 70, 180, 190), font=ImageFont.truetype(FONT_BOLD, 14), anchor="mm", align="center")
    cert.paste(stamp, (cert_w - 350, 640), stamp)

    # 2. Buat background meja kerja (simulasi foto HP di atas meja kayu/meja kerja gelap)
    desk_w, desk_h = 1600, 1200
    desk = Image.new("RGB", (desk_w, desk_h), (55, 48, 42)) # Meja cokelat tua
    d_draw = ImageDraw.Draw(desk)
    # Tekstur serat meja sederhana
    for y in range(0, desk_h, 8):
        shade = 55 + (y % 13) - 6
        d_draw.line([(0, y), (desk_w, y)], fill=(shade, shade - 7, shade - 13), width=4)

    # 3. Rotasi sertifikat 6.5 derajat (miring sudut HP)
    rot_cert = cert.rotate(6.5, expand=True, resample=Image.BICUBIC)

    # Bayangan sertifikat (drop shadow)
    shadow = Image.new("RGBA", rot_cert.size, (0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(15))
    paste_x = (desk_w - rot_cert.width) // 2 + 30
    paste_y = (desk_h - rot_cert.height) // 2 + 10
    desk.paste(shadow, (paste_x + 12, paste_y + 16), shadow)
    desk.paste(rot_cert, (paste_x, paste_y))

    # 4. Tambahkan efek silau cahaya (glare flash smartphone)
    glare = Image.new("RGBA", (desk_w, desk_h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glare)
    # Lingkaran gradient silau
    glare_cx, glare_cy = paste_x + 400, paste_y + 350
    for r in range(350, 0, -10):
        alpha = int(45 * (1 - r / 350))
        g_draw.ellipse([(glare_cx - r, glare_cy - r), (glare_cx + r, glare_cy + r)], fill=(255, 255, 255, alpha))
    desk = Image.alpha_composite(desk.convert("RGBA"), glare).convert("RGB")

    # Simpan sebagai PDF
    desk.save("data/testset/cases/c007_foto_hp_miring.pdf", "PDF", resolution=150.0)
    print("OK c007_foto_hp_miring.pdf")

def generate_c008():
    """PDF hasil scan tanpa teks (K2-01 Mentoring Keagamaan)"""
    w, h = 1240, 1754 # A4 portrait ~150 DPI
    scan = Image.new("RGB", (w, h), (250, 250, 248))
    draw = ImageDraw.Draw(scan)

    f_kop_main = ImageFont.truetype(FONT_SERIF_BOLD, 30)
    f_kop_sub = ImageFont.truetype(FONT_SERIF, 20)
    f_title = ImageFont.truetype(FONT_BOLD, 34)
    f_no = ImageFont.truetype(FONT_REGULAR, 20)
    f_body = ImageFont.truetype(FONT_REGULAR, 24)
    f_bold = ImageFont.truetype(FONT_BOLD, 26)

    # Kop surat instansi
    draw.text((w / 2, 120), "LEMBAGA DAKWAH & BIMBINGAN KEAGAMAAN", fill=(20, 20, 20), font=f_kop_main, anchor="mm")
    draw.text((w / 2, 160), "TAKMIR MASJID AL-IRFAN POLITEKNIK ELEKTRONIKA NEGERI SURABAYA", fill=(40, 40, 40), font=f_kop_sub, anchor="mm")
    draw.text((w / 2, 195), "Jl. Raya ITS Sukolilo, Surabaya 60111", fill=(60, 60, 60), font=ImageFont.truetype(FONT_REGULAR, 16), anchor="mm")
    draw.line([(100, 220), (w - 100, 220)], fill=(0, 0, 0), width=4)
    draw.line([(100, 226), (w - 100, 226)], fill=(0, 0, 0), width=1)

    # Judul
    draw.text((w / 2, 330), "SURAT KETERANGAN LULUS MENTORING", fill=(10, 10, 10), font=f_title, anchor="mm")
    draw.text((w / 2, 380), "Nomor: 088/SK-MENTORING/XII/2024", fill=(50, 50, 50), font=f_no, anchor="mm")

    # Isi
    intro = (
        "Yang bertanda tangan di bawah ini, Koordinator Mentoring Keagamaan PENS,\n"
        "menerangkan bahwa mahasiswa tersebut di bawah ini:"
    )
    draw.multiline_text((150, 470), intro, fill=(20, 20, 20), font=f_body, spacing=12)

    # Data mahasiswa
    y_data = 580
    data_items = [
        ("Nama Mahasiswa", ": MUHAMMAD ILHAM"),
        ("NRP", ": 3124500018"),
        ("Program Studi", ": D4 Teknik Informatika"),
        ("Angkatan", ": 2024"),
        ("Peran / Status", ": Peserta"),
        ("Nama Kegiatan", ": Mentoring Keagamaan Mahasiswa PENS"),
        ("Semester", ": Gasal 2024/2025"),
        ("Tanggal Selesai", ": 20 Desember 2024"),
    ]
    for label, val in data_items:
        draw.text((180, y_data), label, fill=(30, 30, 30), font=f_bold if "Nama" in label or "Peran" in label else f_body)
        draw.text((450, y_data), val, fill=(10, 10, 10), font=f_bold if "Nama" in label or "Peran" in label else f_body)
        y_data += 48

    closing = (
        "Dinyatakan telah MENYELESAIKAN dan LULUS seluruh rangkaian kegiatan\n"
        "Mentoring Keagamaan Semester Gasal 2024/2025 dengan predikat BAIK.\n"
        "Surat keterangan ini diberikan sebagai bukti pemenuhan Komponen 2 SKEM PENS."
    )
    draw.multiline_text((150, y_data + 40), closing, fill=(20, 20, 20), font=f_body, spacing=12)

    # Tanda tangan
    draw.text((w - 400, 1250), "Surabaya, 20 Desember 2024", fill=(30, 30, 30), font=f_body)
    draw.text((w - 400, 1290), "Koordinator Mentoring Keagamaan,", fill=(30, 30, 30), font=f_body)
    draw.text((w - 400, 1450), "Ust. Ahmad Farisi, S.Ag., M.Pd.", fill=(10, 10, 10), font=f_bold)
    draw.text((w - 400, 1485), "NIP. 198204122010121003", fill=(50, 50, 50), font=f_no)

    # Stempel grayscale
    stamp = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(stamp)
    s_draw.ellipse([(10, 10), (170, 170)], outline=(40, 40, 40, 160), width=3)
    s_draw.text((90, 90), "TAKMIR MASJID\nAL-IRFAN PENS", fill=(40, 40, 40, 160), font=ImageFont.truetype(FONT_BOLD, 18), anchor="mm", align="center")
    scan.paste(stamp, (w - 450, 1340), stamp)

    # 2. Ubah menjadi grayscale dan tambahkan noise tekstur scanner
    scan_gray = scan.convert("L")
    # Sedikit rotasi kemiringan kertas scanner (0.6 derajat)
    scan_gray = scan_gray.rotate(0.6, expand=False, fillcolor=245, resample=Image.BICUBIC)

    # Tambah noise acak halus khas scanner flatbed
    pixels = scan_gray.load()
    random.seed(42)
    for _ in range(25000):
        rx = random.randint(0, w - 1)
        ry = random.randint(0, h - 1)
        orig = pixels[rx, ry]
        delta = random.randint(-25, 20)
        pixels[rx, ry] = max(0, min(255, orig + delta))

    # Efek kontras scanner
    enhancer = ImageEnhance.Contrast(scan_gray)
    scan_gray = enhancer.enhance(1.15)

    scan_rgb = scan_gray.convert("RGB")
    scan_rgb.save("data/testset/cases/c008_scan_tanpa_teks.pdf", "PDF", resolution=150.0)
    print("OK c008_scan_tanpa_teks.pdf")

if __name__ == "__main__":
    generate_c007()
    generate_c008()
