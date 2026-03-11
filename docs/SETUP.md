# Setup Guide (Development)

Dokumen ini menjelaskan cara menyiapkan **Web Entries** dari nol sampai dapat dijalankan secara lokal untuk pengembangan.

---

## ✅ System Requirements

- Windows / macOS / Linux
- Python 3.10+ (disarankan 3.11+)
- Node.js 18+
- MySQL 8.0+ atau MariaDB 10.4+
- Git (opsional)

---

## 🗄️ 1) Database Setup (MySQL)

1. Jalankan MySQL server.
2. Buat database:

```sql
CREATE DATABASE db_entries;
```

3. Siapkan kredensial database (contoh XAMPP default):
- Host: `localhost`
- User: `root`
- Password: kosong

Skema referensi tersedia di: [database/schema.sql](../database/schema.sql)

---

## 🐍 2) Backend Setup (FastAPI)

### Install dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Environment variables

Buat file `.env` di folder `backend/`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=db_entries
SECRET_KEY=change_me_in_real_deployment
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

Catatan penting:
- `SECRET_KEY` wajib unik untuk setiap environment.
- Jangan commit `.env` ke repository.

### Initialize schema + seed

```bash
python setup_db.py
python seed_direct.py
```

### Run backend server

```bash
python main.py
```

Backend default:
- Base URL: `http://localhost:8001`
- API base: `http://localhost:8001/api`
- Swagger UI: `http://localhost:8001/docs`

---

## ⚛️ 3) Frontend Setup (React / Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend default:
- App URL: `http://localhost:5173`

API call dari frontend menggunakan:
- Axios baseURL: `/api` (lihat `frontend/src/services/api.js`)
- Vite dev proxy: `/api` → `http://localhost:8001` (lihat `frontend/vite.config.js`)

Karena itu, `VITE_API_URL` **tidak diperlukan** untuk development default.

---

## 👤 4) Default Accounts (Seed)

Script `seed_direct.py` membuat akun default berikut bila belum ada:

| Role | Email | Password | Notes |
|---|---|---|---|
| ADMIN | `admin@example.com` | `admin123` | Admin dashboard dan operator management |
| OPERATOR | `andi@example.com` | `password123` | Input data dan submit batch |

Jika Anda menjalankan seeder lain (mis. `seed_comprehensive.py`), akun tambahan bisa dibuat sesuai script tersebut.

---

## 🧪 Common Workflows

### Verify API is reachable

```bash
curl http://localhost:8001/
```

### Login

`POST /api/login` menggunakan JSON body `{email,password}`. Detail: [API.md](API.md)

---

## 🧯 Troubleshooting

### Backend: “Database tidak terhubung”
- Pastikan MySQL berjalan.
- Pastikan `backend/.env` sesuai (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME).
- Pastikan database `db_entries` sudah dibuat.

### Frontend: “Network Error” saat call API
- Pastikan backend berjalan di `http://localhost:8001`
- Pastikan Vite dev server berjalan di `http://localhost:5173`
- Pastikan endpoint di frontend memakai prefix `/api/...` (proxy)

### Login gagal (401)
- Pastikan akun seed sudah dibuat (`python seed_direct.py`)
- Pastikan request body login memakai `email` dan `password` (bukan `username`)

---

## 🏭 Production Notes (High-Level)

- Gunakan reverse proxy (Nginx/Apache) untuk:
  - serve frontend build
  - forward `/api` ke backend
- Jalankan backend dengan process manager (systemd, supervisor, atau container orchestration).
- Rotasi `SECRET_KEY` dan gunakan kredensial DB yang non-root.

---

## ♻️ Reset Data (Development)

Untuk menghapus data transaksi (entries/log) tanpa menghapus user:

```bash
cd backend
python clear_data.py
```
