
import random
from datetime import date, datetime, timedelta
from typing import Optional
import logging

# LOGGING CONFIG
logger = logging.getLogger("seeder")

def seed_sample_data(
    conn,
    num_operators: int = 3,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entries_per_operator_min: int = 10,
    entries_per_operator_max: int = 15,
    reset_existing: bool = False,
    get_password_hash_func=None # Inject dependency
):
    cursor = conn.cursor()

    today = date.today()
    if end_date is None:
        end_date = today
    if start_date is None:
        start_date = end_date - timedelta(days=90)

    c_ops = conn.cursor(dictionary=True)
    c_ops.execute("SELECT id, nama FROM users WHERE role='OPERATOR'")
    existing_ops = c_ops.fetchall()

    if not existing_ops:
        pwd_hash = get_password_hash_func("password123") if get_password_hash_func else "hashed_default"
        for i in range(1, num_operators + 1):
            name = f"Operator {i}"
            email = f"operator{i}@example.com"
            try:
                c_ops.execute(
                    "INSERT INTO users (nama, email, role, password_hash) VALUES (%s, %s, 'OPERATOR', %s)",
                    (name, email, pwd_hash),
                )
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Gagal membuat operator {name}: {e}")
        c_ops.execute("SELECT id, nama FROM users WHERE role='OPERATOR'")
        existing_ops = c_ops.fetchall()

    operator_ids = [op["id"] for op in existing_ops]

    if reset_existing and operator_ids:
        format_strings = ",".join(["%s"] * len(operator_ids))
        cursor.execute(
            f"DELETE FROM ship_entries WHERE operator_id IN ({format_strings})",
            tuple(operator_ids),
        )
        conn.commit()

    SHIP_NAMES = [
        "KM Nusantara", "MV Samudra", "KM Sejahtera", "KM Laut Biru", "MV Andalas",
        "KM Merah Putih", "MV Borneo Star", "KM Baruna", "KM Tangguh", "MV Makassar"
    ]
    FLAGS = ["Indonesia", "Panama", "Liberia", "Singapore", "Malaysia", "Japan"]
    PORTS = ["Tanjung Priok", "Belawan", "Makassar", "Batam", "Dumai", "Balikpapan", "Singapore", "Port Klang"]
    BERTHS = ["Dermaga Umum 01", "Terminal Petikemas A", "Dermaga Curah Cair", "Dermaga Curah Kering"]
    CATEGORIES = ["Luar Negeri", "Dalam Negeri", "Perintis", "Rakyat"]
    ACTIVITIES = ["Bongkar", "Muat"]
    COMMODITIES = [
        ("Sirtu", "M3", "Curah"),
        ("BBM", "KL", "Curah"),
        ("Motor", "unit", "Unit"),
        ("Mobil", "unit", "Unit"),
        ("Truk", "unit", "Unit"),
        ("Bus", "unit", "Unit"),
        ("Alat Berat", "unit", "Unit"),
        ("Container (isi)", "Teus", "Box"),
        ("Container (kosong)", "Teus", "Box"),
        ("Beras", "Ton", "Bag"),
        ("Garam", "Ton", "Curah"),
        ("Besi", "Ton", "Bundle")
    ]

    months = []
    y, m = start_date.year, start_date.month
    end_y, end_m = end_date.year, end_date.month
    while (y, m) <= (end_y, end_m):
        months.append((y, m))
        if m == 12:
            y += 1
            m = 1
        else:
            m += 1

    def last_day_of_month(year: int, month: int) -> int:
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        return (next_month - timedelta(days=1)).day

    total_rows = 0
    for op_id in operator_ids:
        n = random.randint(entries_per_operator_min, entries_per_operator_max)
        month_count = len(months) if months else 1
        base = n // month_count
        counts = [base] * month_count
        remainder = n - (base * month_count)
        for i in range(remainder):
            counts[i] += 1
        random.shuffle(counts)

        values = []
        for idx, (yy, mm) in enumerate(months):
            cnt = counts[idx]
            if cnt <= 0:
                continue

            month_start = date(yy, mm, 1)
            month_end = date(yy, mm, last_day_of_month(yy, mm))
            clamp_start = max(month_start, start_date)
            clamp_end = min(month_end, end_date)
            if clamp_start > clamp_end:
                continue

            submitted_dt = datetime(
                yy, mm, last_day_of_month(yy, mm), 23, 59, 0
            )

            for _ in range(cnt):
                day_offset = random.randint(0, (clamp_end - clamp_start).days)
                tgl = clamp_start + timedelta(days=day_offset)

                cat = random.choice(CATEGORIES)
                act = random.choice(ACTIVITIES)

                jenis_muatan = random.choice(["Barang", "Hewan", "Manusia"])
                nama_muatan = ""
                jumlah_muatan = 0
                satuan_muatan = ""
                jenis_kemasan = ""
                berat_ton = 0
                jumlah_penumpang = 0

                if jenis_muatan == "Manusia":
                    nama_muatan = "Penumpang"
                    jumlah_muatan = random.randint(10, 300)
                    satuan_muatan = "Orang"
                    jenis_kemasan = "-"
                    jumlah_penumpang = int(jumlah_muatan)
                elif jenis_muatan == "Hewan":
                    nama_muatan = random.choice(["Sapi", "Kambing", "Kerbau"])
                    jumlah_muatan = random.randint(10, 200)
                    satuan_muatan = "Ekor"
                    jenis_kemasan = "Kandang"
                else:
                    nm, satuan, kemasan = random.choice(COMMODITIES)
                    nama_muatan = nm
                    satuan_muatan = satuan
                    jenis_kemasan = kemasan
                    jumlah_muatan = random.uniform(10, 1000)
                    if satuan_muatan in ['Ton', 'MT']:
                        berat_ton = jumlah_muatan

                # 6. Cargo Entry
                entry = (
                    cat, # Kategori
                    random.uniform(50, 300), # LOA
                    random.uniform(100, 5000), # GRT
                    act, # Jenis Kegiatan
                    round(berat_ton, 2),
                    jumlah_penumpang,
                    tgl, # Tanggal Laporan
                    op_id,
                    'SUBMITTED', # status
                    jenis_muatan,
                    nama_muatan,
                    round(jumlah_muatan, 2),
                    satuan_muatan,
                    jenis_kemasan,
                    submitted_dt,
                    'AUTO'
                )
                values.append(entry)

        if values:
            insert_sql = """INSERT INTO ship_entries (
                kategori_pelayaran, loa, grt, 
                jenis_kegiatan, berat_ton, jumlah_penumpang,
                tanggal_laporan,
                operator_id, status,
                jenis_muatan, nama_muatan, jumlah_muatan, satuan_muatan, jenis_kemasan,
                submitted_at, submit_method
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            try:
                cursor.executemany(insert_sql, values)
                conn.commit()
                total_rows += cursor.rowcount
            except Exception as e:
                conn.rollback()
                logger.error(f"Gagal seeding operator_id={op_id}: {e}")

    logger.info(f"Seeding selesai, total baris ditambahkan: {total_rows}")
    cursor.close()
