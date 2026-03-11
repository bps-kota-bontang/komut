import mysql.connector
from faker import Faker
import random
from datetime import datetime, timedelta
import bcrypt

# Setup Faker
fake = Faker('id_ID')

# Database Connection
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='db_entries',
            user='root',
            password=''
        )
        return connection
    except mysql.connector.Error as e:
        print(f"Error connecting to database: {e}")
        return None

# Password Hashing
def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def seed_data():
    conn = get_db_connection()
    if not conn:
        return

    cursor = conn.cursor()
    
    print("1. Cleaning existing data...")
    # Disable FK checks to allow truncation
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    cursor.execute("TRUNCATE TABLE ship_entries")
    cursor.execute("TRUNCATE TABLE users")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")

    print("2. Seeding Users...")
    users = [
        # Admin
        (999, 'Administrator', 'ADMIN', 'admin@example.com', hash_password('password123')),
        # Operators
        (1, 'Operator Satu', 'OPERATOR', 'op1@example.com', hash_password('password123')),
        (2, 'Operator Dua', 'OPERATOR', 'op2@example.com', hash_password('password123')),
        (3, 'Operator Tiga', 'OPERATOR', 'op3@example.com', hash_password('password123'))
    ]
    
    user_sql = """INSERT INTO users (id, nama, role, email, password_hash) VALUES (%s, %s, %s, %s, %s)"""
    cursor.executemany(user_sql, users)
    conn.commit()

    print("3. Generating Ship Entries...")
    entries = []
    
    # Configuration
    TOTAL_ENTRIES = 600 # > 500 requested
    OPERATORS = [1, 2, 3]
    CATEGORIES = ['Luar Negeri', 'Dalam Negeri', 'Perintis', 'Rakyat']
    STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
    ACTIVITIES = ['Bongkar', 'Muat']
    
    # Date Range: 2024-01-01 to Today
    start_date = datetime(2024, 1, 1)
    end_date = datetime.now()
    days_diff = (end_date - start_date).days

    # Commodities mapping for realism
    COMMODITIES = {
        'Barang': [
            ('Semen', 'Ton', 'Sack'), ('Pupuk', 'Ton', 'Bag'), 
            ('Beras', 'Ton', 'Karung'), ('Minyak Goreng', 'Ton', 'Drum'),
            ('Batu Bara', 'MT', 'Curah'), ('CPO', 'MT', 'Curah'),
            ('Pasir', 'M3', 'Curah'), ('Batu Split', 'M3', 'Curah'),
            ('BBM Solar', 'KL', 'Tangki'), ('BBM Pertalite', 'KL', 'Tangki')
        ],
        'Hewan': [
            ('Sapi', 'Ekor', 'Non-Kemasan'), ('Kambing', 'Ekor', 'Non-Kemasan'),
            ('Ayam', 'Ekor', 'Keranjang')
        ],
        'Manusia': [
            ('Penumpang Umum', 'Orang', 'Non-Kemasan')
        ]
    }
    
    # Container types
    CONTAINER_TYPES = [('Container 20ft', 'Teus', 'Box'), ('Container 40ft', 'Teus', 'Box')]

    for i in range(TOTAL_ENTRIES):
        # 1. Distribute evenly among operators
        operator_id = OPERATORS[i % 3]
        
        # 2. Random Date (Even distribution)
        random_days = random.randint(0, days_diff)
        report_date = (start_date + timedelta(days=random_days)).date()
        
        # Create timestamps
        created_at = datetime.combine(report_date, datetime.min.time()) + timedelta(hours=random.randint(8, 17))
        
        # 3. Random Status
        status = random.choice(STATUSES)
        submitted_at = None
        submit_method = 'MANUAL'
        
        if status != 'DRAFT':
            # If submitted, set submitted_at slightly after created_at
            submitted_at = created_at + timedelta(minutes=random.randint(30, 300))
            if random.random() > 0.8: # 20% auto submit
                submit_method = 'AUTO'
        
        # 4. Random Category & Activity
        category = random.choice(CATEGORIES)
        activity = random.choice(ACTIVITIES)
        
        # 5. Cargo Details
        cargo_type = random.choices(['Barang', 'Hewan', 'Manusia', 'Container'], weights=[60, 10, 10, 20])[0]
        
        nama_muatan = ""
        satuan = ""
        kemasan = ""
        jumlah = 0
        berat_ton = 0
        jumlah_penumpang = 0
        teus_20 = 0
        teus_40 = 0
        cont_status = 'N/A'
        
        if cargo_type == 'Container':
            # Logic for container
            c_item = random.choice(CONTAINER_TYPES)
            nama_muatan = c_item[0]
            satuan = c_item[1]
            kemasan = c_item[2]
            jenis_muatan_db = 'Barang' # Map to Barang in DB generally or handle specific if schema changed
            # Actually schema has `jenis_muatan` ENUM('Barang', 'Hewan', 'Manusia'). Container falls under Barang usually or just handled by teus columns.
            # Let's check schema... `jenis_muatan` ENUM('Barang', 'Hewan', 'Manusia').
            # So Container is 'Barang' but with teus fields filled.
            jenis_muatan_db = 'Barang'
            
            teus_20 = random.randint(0, 50)
            teus_40 = random.randint(0, 30)
            if teus_20 == 0 and teus_40 == 0: teus_20 = 10
            
            cont_status = random.choice(['Isi', 'Kosong'])
            jumlah = teus_20 + (teus_40 * 2) # Approximation for 'jumlah_muatan' if needed, or leave 0
            
        elif cargo_type == 'Manusia':
            item = COMMODITIES['Manusia'][0]
            nama_muatan = item[0]
            satuan = item[1]
            kemasan = item[2]
            jenis_muatan_db = 'Manusia'
            jumlah = random.randint(10, 500)
            jumlah_penumpang = jumlah
            
        else: # Barang or Hewan
            item = random.choice(COMMODITIES[cargo_type])
            nama_muatan = item[0]
            satuan = item[1]
            kemasan = item[2]
            jenis_muatan_db = cargo_type
            jumlah = random.uniform(10, 1000)
            if satuan in ['Ton', 'MT']:
                berat_ton = jumlah
            
        # 6. Cargo Entry
        entry = (
            category, # Kategori
            random.uniform(50, 300), # LOA
            random.uniform(100, 5000), # GRT
            activity, # Jenis Kegiatan
            round(berat_ton, 2),
            jumlah_penumpang,
            report_date, # Tanggal Laporan
            operator_id,
            status,
            jenis_muatan_db,
            nama_muatan,
            round(jumlah, 2),
            satuan,
            kemasan,
            submitted_at,
            submit_method,
            teus_20,
            teus_40,
            cont_status,
            created_at
        )
        entries.append(entry)

    sql = """INSERT INTO ship_entries (
        kategori_pelayaran, loa, grt, 
        jenis_kegiatan, berat_ton, jumlah_penumpang,
        tanggal_laporan,
        operator_id, status,
        jenis_muatan, nama_muatan, jumlah_muatan, satuan_muatan, jenis_kemasan,
        submitted_at, submit_method,
        teus_20_box, teus_40_box, container_status, created_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
    
    # Batch Insert
    batch_size = 100
    for i in range(0, len(entries), batch_size):
        batch = entries[i:i + batch_size]
        cursor.executemany(sql, batch)
        conn.commit()
        print(f"Inserted batch {i//batch_size + 1}/{(len(entries)-1)//batch_size + 1}")

    print("4. Optimizing Database...")
    # Analyze table to update statistics for query optimizer
    cursor.execute("ANALYZE TABLE ship_entries")
    cursor.fetchall() # Consume result to avoid Unread result found error
    
    # Check indexes (Schema already has them, but verifying)
    # INDEX `idx_entry_operator` (`operator_id`),
    # INDEX `idx_entry_status` (`status`),
    # INDEX `idx_entry_date` (`tanggal_laporan`),
    # INDEX `idx_entry_category` (`kategori_pelayaran`),
    # INDEX `idx_entry_composite_report` (`operator_id`, `tanggal_laporan`, `status`)
    
    print("Seeding Complete!")
    print(f"Total Entries: {TOTAL_ENTRIES}")
    print(f"Date Range: {start_date.date()} to {end_date.date()}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed_data()
