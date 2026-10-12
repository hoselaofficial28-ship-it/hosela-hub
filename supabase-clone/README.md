# Hosela Hub — Supabase Clone

Folder kerja untuk clone Hosela Hub berbasis Supabase. Aplikasi produksi di root tetap menjadi referensi dan tidak boleh ditimpa sampai seluruh parity test lulus.

Sebelum membuat kode:

1. Baca `../CLAUDE.md`.
2. Baca seluruh `../docs/clone-supabase/` sesuai urutan nomor.
3. Buat rencana schema, endpoint/RPC/Edge Function, fixture, dan test parity.
4. Jangan menghubungkan atau mengubah data produksi tanpa izin Ko Sanjaya.

Struktur target:

```text
app/
supabase/migrations/
supabase/functions/
supabase/seed/
tests/contract/
tests/business-rules/
tests/e2e/
```

Kredensial Supabase dan Google Drive harus berada di environment/secrets dan tidak boleh di-commit.

## Status lanjutan (12 Oktober 2026)

- Modul Pengumuman, Ide Tim, Kalender Libur, Peraturan, dan Notifikasi sudah teruji di backend + browser (migration 0018–0020).
- Kalender/Matrix Absensi sudah diimplementasikan di frontend dan migration `20261012000021_attendance_matrix.sql`.
- Test kontrak lokal: `node tests/attendance-matrix.test.mjs`.
- Migration 0021 sudah dijalankan pada 12 Oktober 2026. Empat RPC terdeteksi aktif; uji baca Owner (`get_absensi_rekap`, `get_all_absensi_rekap`) mengembalikan HTTP 200 dan target edit palsu ditolak tanpa write.
- Uji end-to-end isi matrix/edit/perhitungan masih membutuhkan satu akun karyawan + fixture absensi sementara karena project saat ini hanya memiliki satu profil aktif (Owner).
- Upload foto absensi/izin ke Google Drive, acceptance test menyeluruh, dan migrasi data produksi masih belum selesai.
