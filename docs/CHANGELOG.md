# Changelog

Changelog ini mengikuti **Semantic Versioning**: `MAJOR.MINOR.PATCH`.

---

## [2.1.0] – Current Development

### Added
- Spreadsheet-style operator entry (multi-row per kategori) dengan batch submission.
- Summary otomatis per kategori pada entry page (LOA, GRT, total muatan, satuan unik, deskripsi gabungan).
- Smart commodity behavior (komoditas → satuan otomatis, placeholder amount adaptif).

### Changed
- Perbaikan logika rekap untuk menangani `nama_muatan` kosong dengan fallback ke `komoditas`.

### Fixed
- Fix Error 500 pada cetak PDF rekap saat ada kontainer kosong (inisialisasi variabel statistik tonase dan proteksi kalkulasi).
- Fix data hilang di grafik tren saat `nama_muatan` kosong (COALESCE/NULLIF di query).

### Security
- _No security changes documented in this version._

---

## [2.0.0] – 2026-02-28

### Added
- Initial release Web Entries (React/Vite + FastAPI/MySQL).
- Area Operator: entry data, dashboard operator, riwayat laporan.
- Area Admin: rekap data entries, dashboard, operator management.
