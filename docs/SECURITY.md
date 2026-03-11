# Security Overview

Dokumen ini menjelaskan aspek keamanan sistem **Web Entries** berdasarkan implementasi saat ini, serta rekomendasi hardening untuk environment produksi.

---

## 🔐 Authentication

### Login + JWT

- Endpoint: `POST /api/login`
- Backend mengembalikan JWT (`access_token`) dengan claim minimal:
  - `sub`: user id
  - `role`: role user

JWT diverifikasi pada setiap request melalui dependency `get_current_user`.

---

## 🧾 Authorization (RBAC)

Role yang digunakan di database (`users.role`):
- `ADMIN`
- `OPERATOR`
- `VIEWER` (tersedia di schema, dan beberapa endpoint memperhitungkannya)

Pola enforcement (backend):
- RBAC dilakukan secara eksplisit di setiap endpoint router (contoh: operator-only untuk batch submission).

Contoh:
- `POST /api/entries/report` → OPERATOR-only
- `/api/admin/*` → ADMIN-only
- `/api/operators` → ADMIN-only

---

## 🔑 Password Hashing

Backend menggunakan `passlib` dengan bcrypt:
- hashing: `get_password_hash()`
- verify: `verify_password()`

Catatan implementasi:
- Ada patch kompatibilitas untuk `passlib` vs `bcrypt` pada startup backend.

Rekomendasi produksi:
- Pastikan kebijakan password minimal dan rate limit pada endpoint login.

---

## 🧰 Token Storage (Frontend)

Frontend menyimpan token di:
- `localStorage` key: `token`

Axios interceptor menambahkan header:

```http
Authorization: Bearer <token>
```

Trade-off:
- Praktis untuk SPA.
- Namun memperbesar dampak apabila terjadi XSS (token dapat dicuri).

Rekomendasi produksi:
- Terapkan Content Security Policy (CSP) yang ketat.
- Pertimbangkan migrasi ke httpOnly cookie jika threat model mengharuskan.

---

## 🗄️ Environment Secrets

Backend membutuhkan environment variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SECRET_KEY`
- `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`

Rekomendasi:
- Jangan menyimpan `.env` di repository.
- Gunakan secret manager (Vault/KMS) atau mekanisme secret management pada platform deployment.
- Rotasi `SECRET_KEY` pada setiap environment.

---

## 🌐 CORS

Backend mengaktifkan CORS untuk origin localhost (dev):
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`

Rekomendasi produksi:
- Konfigurasi origin berdasarkan environment variable.
- Hindari `allow_origins=["*"]` bila memakai credential.

---

## 🧨 Common Risk Areas & Recommendations

### SQL injection

Backend memakai raw SQL dengan mysql-connector.

Best practice yang sudah terlihat:
- Banyak query menggunakan placeholder `%s` untuk parameter value.

Risk area:
- Query yang menyusun SQL secara dinamis (misalnya IN clause atau dynamic update fields) harus dipastikan hanya menyisipkan data yang berasal dari whitelist (kolom) dan tidak memasukkan input user ke string SQL mentah.

### Rate limiting

Saat ini tidak terlihat mekanisme rate limiting.

Rekomendasi:
- Tambahkan rate limit untuk:
  - `POST /api/login`
  - endpoint write (create/update/submit)

### Error handling

Rekomendasi:
- Hindari mengembalikan detail exception mentah ke client.
- Gunakan error response yang konsisten dan aman (tanpa DB error detail).

### Audit logging

Sistem memiliki tabel log (`admin_audit_logs`, `auto_submit_logs`). Pastikan:
- aksi kritikal (submit batch, perubahan admin) tercatat
- format log konsisten dan tidak menyimpan secrets/token

---

## ✅ Security Checklist (Production)

- Rotate `SECRET_KEY` dan gunakan kredensial DB non-root
- Strict CORS + HTTPS everywhere
- Rate limiting untuk login/write endpoints
- CSP + secure headers untuk frontend
- Centralized error handling yang aman
- Monitoring + audit trail untuk aksi admin/operator
