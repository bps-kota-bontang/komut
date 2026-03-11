<div align="center">
  <img src="frontend/public/logo-bps.png" alt="BPS Logo" width="220" />

# Web Entries

Sistem Manajemen & Rekapitulasi Laporan Operasional Kapal Pelabuhan

</div>

---

## 📌 Project Overview

Web Entries adalah aplikasi full-stack untuk pencatatan dan rekapitulasi laporan operasional kapal. Sistem menyediakan alur kerja **Operator** (entry data berbasis spreadsheet) dan **Admin** (rekap, dashboard, dan manajemen operator) dengan API berbasis **FastAPI + MySQL**.

---

## ✨ Key Features

### 🧾 Operator

- Spreadsheet-style input per kategori pelayaran: **Luar Negeri / Dalam Negeri / Perintis / Rakyat**
- Dynamic rows + safety logic (hindari spam baris kosong)
- Ringkasan otomatis per kategori (LOA, GRT, total muatan, satuan unik, deskripsi gabungan)
- Auto-mapping **Komoditas → Satuan** + placeholder amount yang adaptif
- Autosave draft (debounce) + submit manual batch ke backend

### 🧭 Admin

- Rekap per kategori & periode (screen view dan full view)
- Dashboard ringkas dan tren (berbasis query agregasi)
- Manajemen operator (ADMIN-only)
- Audit/log endpoint untuk kebutuhan operasional

---

## 🏛️ System Architecture

```text
React (Vite) ──HTTP /api──> FastAPI ──SQL──> MySQL
     │                       │
     ├─ Axios (Bearer JWT)   ├─ Routers (Auth/Entries/Admin/Dashboard/Operators)
     └─ Spreadsheet UI       └─ Raw SQL (mysql-connector-python)
```

Detail lengkap: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🧰 Technology Stack

### Frontend

- React 19, Vite
- TailwindCSS
- Axios
- Recharts

### Backend

- FastAPI (Python)
- MySQL (raw SQL via mysql-connector-python)
- JWT Authentication (python-jose + passlib/bcrypt)

---

## 🖼️ Screenshots

- Operator Entry Page (Spreadsheet UI): _TODO_
- Admin Rekap Dashboard: _TODO_
- PDF/Export: _TODO_

---

## ⚡ Installation (Quick Start)

Panduan lengkap: [docs/SETUP.md](docs/SETUP.md)

### 1) Database

```sql
CREATE DATABASE db_entries;
```

### 2) Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

python setup_db.py
python seed_direct.py
python main.py
```

Backend default:

- API base: `http://localhost:8001/api`
- Swagger: `http://localhost:8001/docs`

### 3) Frontend (React/Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend default:

- App: `http://localhost:5173`
- Dev proxy: `/api` → `http://localhost:8001`

---

## �️ Folder Structure

Ringkasan struktur repository:

- [backend/](backend) — FastAPI app, routers, auth, DB access
- [frontend/](frontend) — React app (feature-based)
- [database/](database) — SQL schema referensi
- [docs/](docs) — dokumentasi teknis

Detail: [docs/STRUCTURE.md](docs/STRUCTURE.md)

---

## � Documentation Links

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- API Reference: [docs/API.md](docs/API.md)
- Setup Guide: [docs/SETUP.md](docs/SETUP.md)
- Database: [docs/DATABASE.md](docs/DATABASE.md)
- Security: [docs/SECURITY.md](docs/SECURITY.md)

---

## 🧾 Changelog

Lihat: [docs/CHANGELOG.md](docs/CHANGELOG.md)

---

## 🏢 Organization

Dikembangkan untuk kebutuhan operasional **Badan Pusat Statistik (BPS)**.
