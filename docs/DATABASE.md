# Database Reference (MySQL)

Dokumen ini merangkum skema database utama untuk **Web Entries**.

Sumber skema: [database/schema.sql](../database/schema.sql)

---

## 🧱 Core Tables

### 1) `users`

Menyimpan akun autentikasi dan role.

Kolom penting:

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` | Primary key |
| `nama` | `VARCHAR(255)` | Display name |
| `role` | `ENUM('ADMIN','OPERATOR','VIEWER')` | Role untuk RBAC |
| `email` | `VARCHAR(255)` | Unique |
| `password_hash` | `VARCHAR(255)` | Hash bcrypt (via passlib) |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

Index:
- unique: `(email)`

---

### 2) `ship_entries`

Tabel utama untuk laporan operasional kapal. Digunakan oleh:
- operator (create/update/delete/submit)
- admin (rekap dan agregasi)
- dashboard (trend dan statistik)

Kolom penting (subset):

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` | Primary key |
| `operator_id` | `INT` | Foreign key → `users.id` (ON DELETE SET NULL) |
| `nama_kapal` | `VARCHAR(255)` | Nama kapal |
| `kategori_pelayaran` | `ENUM('Luar Negeri','Dalam Negeri','Perintis','Rakyat')` | Kategori pelayaran |
| `loa` | `FLOAT` | LOA |
| `grt` | `FLOAT` | GRT |
| `jenis_kegiatan` | `ENUM('Bongkar','Muat')` | Activity |
| `komoditas` | `VARCHAR(255)` | Commodity (free text) |
| `nama_muatan` | `VARCHAR(255)` | Detail barang |
| `jumlah_muatan` | `FLOAT` | Volume/amount |
| `satuan_muatan` | `VARCHAR(50)` | Unit (free text) |
| `jenis_kemasan` | `VARCHAR(50)` | Packaging (free text) |
| `tanggal_laporan` | `DATE` | Reporting date (banyak query memakai ini) |
| `status` | `ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED')` | Status workflow |
| `submitted_at` | `TIMESTAMP` | Timestamp submit |
| `submit_method` | `ENUM('AUTO','MANUAL')` | Cara submit |

Indexes (existing):
- `idx_entry_operator (operator_id)`
- `idx_entry_status (status)`
- `idx_entry_date (tanggal_laporan)`
- `idx_entry_category (kategori_pelayaran)`
- `idx_entry_composite_report (operator_id, tanggal_laporan, status)`

---

### 3) `auto_submit_logs`

Log sistem terkait auto submit.

Kolom penting:

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` | Primary key |
| `date` | `DATE` | Tanggal event |
| `status` | `ENUM('SUCCESS','FAILED')` | Status eksekusi |
| `message` | `TEXT` | Pesan/detail |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

---

### 4) `admin_audit_logs`

Audit trail untuk aksi admin.

Kolom penting:

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` | Primary key |
| `admin_id` | `INT` | Foreign key → users |
| `action` | `VARCHAR(255)` | Jenis aksi |
| `details` | `TEXT` | Detail action |
| `created_at` | `TIMESTAMP` | Default `CURRENT_TIMESTAMP` |

---

## 🔗 Relationships

```text
users (1) ──< ship_entries (N)
users (1) ──< admin_audit_logs (N)
```

---

## 📥 Data Flow Notes

### Spreadsheet batch submission

Endpoint `POST /api/entries/report` menulis banyak row ke `ship_entries` dalam satu transaksi:
- `operator_id` diambil dari JWT user
- `kategori_pelayaran` dipetakan dari key payload (luar_negeri → “Luar Negeri”, dst)
- `tanggal_laporan` memakai `CURRENT_DATE`
- `status` diset ke `SUBMITTED`

---

## 🚀 Performance Notes (Schema-Level)

Beberapa query agregasi memakai `YEAR()`/`MONTH()` pada kolom tanggal. Ini mengurangi efektivitas index. Secara umum, query yang menggunakan rentang tanggal:

```sql
WHERE tanggal_laporan >= '2026-03-01'
  AND tanggal_laporan <  '2026-04-01'
```

lebih mudah memanfaatkan index dibanding:

```sql
WHERE YEAR(tanggal_laporan) = 2026 AND MONTH(tanggal_laporan) = 3
```

---

## 🧩 Suggested Index Improvements (Future)

Tanpa mengubah skema saat ini, rekomendasi umum untuk beban rekap:
- `(kategori_pelayaran, tanggal_laporan, status, jenis_kegiatan)`

Catatan: perubahan index perlu diuji pada data aktual dan query plan (EXPLAIN).
