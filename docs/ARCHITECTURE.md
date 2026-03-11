# Architecture

Dokumen ini menjelaskan arsitektur sistem **Web Entries** berdasarkan implementasi repository saat ini.

---

## 🧭 System Overview

Web Entries adalah aplikasi full-stack dengan pola **Modular Monolith**:
- **Frontend** (React/Vite) berkomunikasi dengan backend melalui REST API.
- **Backend** (FastAPI) menangani autentikasi, RBAC, logika bisnis, dan query reporting.
- **Database** (MySQL) menyimpan data user, ship entries, dan log.

---

## 🏛️ High-Level Architecture Diagram

```text
┌───────────────────────────┐
│        Frontend           │
│  React 19 + Vite + Axios  │
│  TailwindCSS + Recharts   │
└─────────────┬─────────────┘
              │ HTTP (Bearer JWT)
              │ Base URL: /api (dev proxy)
              v
┌───────────────────────────┐
│          Backend          │
│     FastAPI (Python)      │
│ Routers: auth/entries/... │
│ Auth: JWT + passlib/bcrypt│
│ DB: mysql-connector (SQL) │
└─────────────┬─────────────┘
              │ SQL
              v
┌───────────────────────────┐
│          Database         │
│          MySQL            │
│ Tables: users, ship_entries│
│ logs: auto_submit_logs... │
└───────────────────────────┘
```

---

## 🔌 Frontend ↔ Backend Interaction

### Dev-mode API routing

- Frontend Axios memakai `baseURL: "/api"` (relative).
- Vite dev server melakukan proxy:
  - `/api/*` → `http://localhost:8001/*`

Implikasi:
- Frontend dan backend dapat dijalankan lokal tanpa konfigurasi URL tambahan.
- Di production, Anda biasanya menempatkan reverse proxy untuk meneruskan `/api` ke backend.

---

## 🧾 Operator Entry System (Spreadsheet Workflow)

### Data model (frontend)

Entry page spreadsheet menyimpan state per kategori:

```js
entries = {
  luar_negeri: [row, row, ...],
  dalam_negeri: [...],
  perintis: [...],
  rakyat: [...]
}
```

Setiap row memiliki bentuk:

```js
{
  loa: 0,
  grt: 0,
  activity: "",
  commodity: "",
  description: "",
  amount: 0,
  unit: "",
  packaging: ""
}
```

### Dynamic row behavior

- Setiap kategori dimulai dengan 1 row kosong.
- Row baru ditambahkan hanya jika:
  - user berinteraksi pada **last row**, dan
  - ada minimal 1 row di kategori tersebut yang sudah berisi data (anti spam).

### Summary calculations (frontend)

Di bawah tabel per kategori ditampilkan ringkasan real-time:
- jumlah LOA / GRT (sum > 0)
- keterangan barang gabungan (comma-separated)
- total amount (sum > 0)
- daftar satuan unik

---

## 📝 Autosave Draft (Frontend)

Autosave draft menggunakan debounce:
- Saat `entries` berubah, UI menampilkan “Saving draft…”
- Setelah 5 detik tanpa perubahan, sistem melakukan simulasi autosave (console log) dan UI menjadi “Saved ✓”

Catatan:
- Saat ini autosave belum mengirim request ke backend.
- Mekanisme ini mempersiapkan integrasi draft persistence di masa depan (local storage atau server-side draft).

---

## ✅ Batch Submission (Operator → Backend)

### API endpoint

Spreadsheet entry disubmit dalam bentuk batch:
- `POST /api/entries/report`

### Payload

```json
{
  "luar_negeri": [ { "loa": 0, "grt": 0, "activity": "", "commodity": "", "description": "", "amount": 0, "unit": "", "packaging": "" } ],
  "dalam_negeri": [],
  "perintis": [],
  "rakyat": []
}
```

### Backend behavior

- RBAC: hanya role `OPERATOR`
- Backend melakukan:
  - skip baris kosong
  - insert tiap row ke `ship_entries` (satu koneksi + satu cursor + transaksi)
  - set metadata:
    - `tanggal_laporan = CURRENT_DATE`
    - `status = SUBMITTED`
    - `submitted_at = NOW()`
    - `submit_method = MANUAL`

Response:

```json
{
  "message": "Entries submitted successfully",
  "rows_inserted": 10
}
```

---

## 📊 Dashboard & Rekap Data Aggregation

Backend menyediakan query agregasi untuk:
- dashboard harian/mingguan/bulanan
- tren (berdasarkan tahun dan filter jenis)
- rekap admin per kategori dan rentang tanggal

Karena memakai raw SQL, kompleksitas query berada di router `admin.py` dan `dashboard.py`.

---

## 📎 References

- API reference: [API.md](API.md)
- Database reference: [DATABASE.md](DATABASE.md)
- Security overview: [SECURITY.md](SECURITY.md)
