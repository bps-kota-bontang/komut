# API Reference (FastAPI)

Dokumentasi ini berisi referensi API yang **sesuai dengan kode backend saat ini**.

- Base URL: `http://localhost:8001/api`
- Swagger UI: `http://localhost:8001/docs`

---

## 🔐 API Authentication Flow (JWT)

1. **Login** menggunakan email + password.
2. Backend mengembalikan `access_token` (JWT) dan `user`.
3. Frontend menyimpan token dan mengirim header:

```http
Authorization: Bearer <token>
```

Catatan:
- Token diverifikasi oleh dependency `get_current_user`.
- Role tersedia di claim token (`role`) dan digunakan untuk RBAC di endpoint.

---

## 🔑 Authentication

### Login
- **Method**: `POST`
- **Endpoint**: `/login`
- **Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

- **Example Response**:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 999,
    "nama": "Administrator",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### Current User (Token Introspection)
- **Method**: `GET`
- **Endpoint**: `/users/me`
- **Auth**: Bearer JWT
- **Example Response**:

```json
{
  "id": "999",
  "role": "ADMIN"
}
```

---

## 🚢 Operator APIs (Entries)

### Get Entries (History)
- **Method**: `GET`
- **Endpoint**: `/entries`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `operator_id` (optional) — akan di-override jika role OPERATOR
  - `year` (optional, int)
  - `month` (optional, int)
  - `status` (optional, string) — mendukung `status=A,B,C`
- **Example Request**:

```http
GET /api/entries?year=2026&month=3&status=SUBMITTED,APPROVED
Authorization: Bearer <token>
```

- **Example Response**: array of `ship_entries` rows (shape mengikuti database).

### Get Available Periods (per Operator)
- **Method**: `GET`
- **Endpoint**: `/entries/periods`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `operator_id` (optional) — akan di-override jika role OPERATOR
- **Example Response**:

```json
{
  "years": [2026, 2025],
  "months_by_year": {
    "2026": [1, 2, 3],
    "2025": [11, 12]
  }
}
```

### Get Entry Detail
- **Method**: `GET`
- **Endpoint**: `/entries/{entry_id}`
- **Auth**: Bearer JWT
- **Access**:
  - ADMIN: dapat lihat semua
  - OPERATOR: hanya entry miliknya
  - VIEWER: dapat lihat semua (jika role tersebut ada di sistem)

### Create Entry (Legacy / Single Entry)
- **Method**: `POST`
- **Endpoint**: `/entri`
- **Auth**: Bearer JWT (role OPERATOR)
- **Request Body**: sesuai schema `ShipEntry` (lihat Swagger UI)
- **Example Response**:

```json
{ "message": "Data berhasil disimpan" }
```

### Update Entry (Single Entry)
- **Method**: `PUT`
- **Endpoint**: `/entries/{id}`
- **Auth**: Bearer JWT (role OPERATOR, ownership enforced)
- **Request Body**: schema `ShipEntry`
- **Example Response**:

```json
{ "message": "Data berhasil diperbarui" }
```

### Delete Entry (Legacy / Single Entry)
- **Method**: `DELETE`
- **Endpoint**: `/entri/{id}`
- **Auth**: Bearer JWT (role OPERATOR, ownership enforced)
- **Example Response**:

```json
{ "message": "Data berhasil dihapus" }
```

### Draft Count
- **Method**: `GET`
- **Endpoint**: `/entries/draft-count`
- **Auth**: Bearer JWT
- **Query Parameters**:
  - `operator_id` (optional) — akan di-override jika role OPERATOR
- **Example Response**:

```json
{ "draft_count": 0 }
```

---

## 📦 Batch Submission API (Spreadsheet Entry)

### Submit Batch Entries (Spreadsheet UI)
- **Method**: `POST`
- **Endpoint**: `/entries/report`
- **Auth**: Bearer JWT (role OPERATOR only)
- **Request Body**:

```json
{
  "luar_negeri": [
    {
      "loa": 120.5,
      "grt": 3456,
      "activity": "Bongkar",
      "commodity": "Ton dan MT",
      "description": "Beras",
      "amount": 100,
      "unit": "Ton/MT",
      "packaging": "Bag"
    }
  ],
  "dalam_negeri": [],
  "perintis": [],
  "rakyat": []
}
```

- **Behavior**:
  - Backend akan skip baris kosong.
  - Backend menulis ke tabel `ship_entries` dengan `status=SUBMITTED`, `submit_method=MANUAL`, `tanggal_laporan=CURDATE()`.

- **Example Response**:

```json
{
  "message": "Entries submitted successfully",
  "rows_inserted": 1
}
```

### Manual Submit Existing Draft Entries (by IDs)
- **Method**: `POST`
- **Endpoint**: `/entries/manual-submit`
- **Auth**: Bearer JWT (role OPERATOR)
- **Request Body**:

```json
{
  "entry_ids": [123, 124, 125]
}
```

- **Example Response**:

```json
{
  "message": "Berhasil mensubmit 3 data secara manual.",
  "rows": 3
}
```

---

## 📊 Dashboard APIs

### Dashboard Stats
- **Method**: `GET`
- **Endpoint**: `/dashboard/stats`

### Dashboard Monthly
- **Method**: `GET`
- **Endpoint**: `/dashboard/monthly`
- **Query Parameters**:
  - `tahun` (required, int)
  - `operator_id` (optional, int)

### Dashboard Weekly
- **Method**: `GET`
- **Endpoint**: `/dashboard/weekly`
- **Query Parameters**:
  - `operator_id` (optional, int)

### Dashboard Trend
- **Method**: `GET`
- **Endpoint**: `/dashboard/trend`
- **Query Parameters**:
  - `tahun` (required, int)
  - `jenis_trend` (required, string) — contoh: `Bongkar`, `Muat`, `kategori`, `jenis_muatan`

### Yearly Summary
- **Method**: `GET`
- **Endpoint**: `/summary/tahunan`
- **Query Parameters**:
  - `tahun` (required, int)
  - `operator_id` (optional, int)

---

## 👮 Admin APIs

Semua endpoint di bawah membutuhkan Bearer JWT dengan role **ADMIN**.

### Auto Submit Logs
- **Method**: `GET`
- **Endpoint**: `/admin/auto-submit-logs`
- **Query Parameters**:
  - `page` (optional, default 1)
  - `limit` (optional, default 10)
  - `search` (optional)
  - `filter` (optional: `7_days`, `30_days`, `today`, `all`)
  - `sort` (optional: `newest`, `oldest`)

### Seed Sample Data
- **Method**: `POST`
- **Endpoint**: `/admin/seed-sample`
- **Query Parameters**:
  - `days` (optional, default 90)
  - `min_entries` (optional)
  - `max_entries` (optional)
  - `reset_existing` (optional, boolean)

### Rekap Entries (Screen View)
- **Method**: `GET`
- **Endpoint**: `/admin/rekap-entries`
- **Query Parameters**:
  - `category` (required)
  - `start_date` (required, YYYY-MM-DD)
  - `end_date` (required, YYYY-MM-DD)

### Rekap Entries (Full View)
- **Method**: `GET`
- **Endpoint**: `/admin/rekap-entries/all`
- **Query Parameters**:
  - `start_date` (required, YYYY-MM-DD)
  - `end_date` (required, YYYY-MM-DD)

### Admin Dashboard Summary
- **Method**: `GET`
- **Endpoint**: `/admin/dashboard-summary`
- **Query Parameters**:
  - `bulan` (required, int)
  - `tahun` (required, int)
  - `trend_type` (optional, default `Bongkar`)

### Operator Management

#### List Operators
- **Method**: `GET`
- **Endpoint**: `/operators`

#### Create Operator
- **Method**: `POST`
- **Endpoint**: `/operators`
- **Request Body**:

```json
{
  "nama": "Operator Baru",
  "email": "operator.baru@example.com",
  "password": "password123"
}
```

#### Delete Operator
- **Method**: `DELETE`
- **Endpoint**: `/operators/{id}`
