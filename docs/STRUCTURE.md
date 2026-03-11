# Repository Structure

Dokumen ini menjelaskan struktur folder repository **Web Entries** sesuai kondisi kode saat ini.

---

## 📦 Repository Tree (High-Level)

```text
d:\web-entries\
├─ backend\
│  ├─ app\
│  │  ├─ core\
│  │  ├─ routers\
│  │  ├─ schemas\
│  │  ├─ services\
│  │  ├─ utils\
│  │  └─ main.py
│  ├─ tests\
│  ├─ requirements.txt
│  ├─ main.py
│  ├─ setup_db.py
│  ├─ seed_direct.py
│  ├─ clear_data.py
│  └─ seed_*.py / check_*.py (utility scripts)
├─ frontend\
│  ├─ public\
│  ├─ src\
│  │  ├─ assets\
│  │  ├─ components\
│  │  ├─ config\
│  │  ├─ context\
│  │  ├─ features\
│  │  ├─ lib\
│  │  ├─ pages\
│  │  ├─ services\
│  │  ├─ test\
│  │  ├─ utils\
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ package.json
│  ├─ vite.config.js
│  └─ tailwind.config.js
├─ database\
│  └─ schema.sql
└─ docs\
   ├─ API.md
   ├─ SETUP.md
   ├─ STRUCTURE.md
   └─ CHANGELOG.md
```

Catatan:
- Artefak lokal seperti `frontend/node_modules` dan `backend/venv` tidak perlu masuk repository.

---

## 🧠 Backend Architecture (FastAPI Modular Monolith)

### `backend/app/core/`
Konfigurasi dan komponen inti:
- `config.py` — memuat environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SECRET_KEY, dll)
- `database.py` — helper koneksi MySQL (`get_db_connection()`)
- `security.py` — JWT + password hashing + dependency `get_current_user()`
- `bcrypt_fix.py` — patch kompatibilitas passlib/bcrypt

### `backend/app/routers/`
Router API. Seluruh router di-include dengan prefix `/api` di `app/main.py`.
- `auth.py` — login dan `/users/me`
- `entries.py` — history entries, CRUD entry, batch submit, manual submit
- `admin.py` — rekap, export support, seed sample, audit/logs
- `dashboard.py` — statistik dan tren
- `operators.py` — manajemen operator (ADMIN-only)

### `backend/app/schemas/`
Pydantic models (request/response validation):
- `ShipEntry`, `EntryUpdate`, `SubmitRequest`, `UserLogin`, `Token`, dll

### `backend/app/services/`
Business logic dan helper (contoh: seeder internal).

---

## 🎨 Frontend Architecture (React Feature-Based)

### `frontend/src/features/`
Organisasi berdasarkan domain bisnis:
- `features/auth/` — login + route protection
- `features/operator/` — spreadsheet entry, laporan operator, dashboard operator
- `features/admin/` — dashboard admin, rekap, operator management, PDF viewer

### `frontend/src/components/`
Shared UI dan layout:
- `layout/` — Sidebar, Topbar, AdminLayout
- `shared/` — komponen reusable
- `ui/` — UI primitives

### `frontend/src/services/`
Integrasi API (axios instance + fungsi endpoint): `services/api.js`

### `frontend/src/context/`
Global auth state: `AuthContext.jsx`

---

## 🧰 Utility Scripts (Backend Root)

### `setup_db.py`
Inisialisasi database (pembuatan tabel).

### `seed_direct.py`
Seeding cepat untuk akun default dan pembersihan data operasional.

### `clear_data.py`
Menghapus data transaksi (entries/log tertentu) tanpa menghapus akun user.
