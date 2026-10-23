# 09 — Foto Absensi dan Surat Dokter di Supabase Storage

Keputusan aktif per 14 Oktober 2026. Firebase dan Google Drive tidak dipakai.

## Desain

- Bucket: `attendance-photos` (privat).
- Format: JPEG, lebar maksimal 640 px.
- Target kompresi: sekitar 40–110 KB; batas keras 180 KB.
- Path: `<user-id>/<YYYY-MM>/<timestamp>_<tipe>_<event-id>.jpg`.
- Karyawan hanya dapat unggah, mengulang unggahan, dan membaca foldernya sendiri.
- Owner/Finance dapat membaca seluruh bukti absensi.
- Tautan baca berlaku 2 menit dan tidak disimpan permanen.
- Foto absensi dan surat dokter dihapus otomatis setelah berumur 15 hari.
- Penunjuk bukti surat dokter ikut dibersihkan agar tombol foto kedaluwarsa tidak tampil.

Dengan 15 karyawan × 2 foto/hari × rata-rata 80 KB, pemakaian stabil untuk
retensi 15 hari sekitar 36 MB. Bahkan jika seluruh foto mencapai batas 180 KB,
pemakaian stabil sekitar 162 MB—jauh di bawah kuota gratis Storage 1 GB.

## 1. Buat bucket dan policy

Jalankan seluruh isi migrasi berikut di Supabase SQL Editor:

```
supabase-clone/supabase/migrations/20261014000038_supabase_attendance_photo_storage.sql
```

Migrasi ini juga memperbarui RPC metadata foto dari Firebase ke Supabase dan
menambahkan status `EXPIRED`.

## 2. Deploy fungsi pembersihan

Deploy folder berikut sebagai Edge Function bernama `cleanup-attendance-photos`:

```
supabase-clone/supabase/functions/cleanup-attendance-photos/index.ts
```

Untuk jadwal otomatis, gunakan secret khusus `CLEANUP_CRON_SECRET` yang sama
di Edge Function dan Supabase Vault. Jangan memakai service-role utama sebagai
credential Cron.

Fungsi hanya menerima pemanggilan Owner atau `service_role`. Fungsi menghapus
file melalui Storage API (bukan DELETE SQL, supaya tidak membuat file yatim),
lalu mengubah metadata absensi menjadi `EXPIRED`.

## 3. Jadwalkan sekali sehari

Di Supabase Dashboard buka **Integrations → Cron** dan jadwalkan HTTP POST ke:

```
https://lhiepqldpiaqcctmqjss.supabase.co/functions/v1/cleanup-attendance-photos
```

Jalankan satu kali sehari, misalnya pukul 02.30 WIB. Authorization untuk job
harus memakai secret server-side/service role melalui Vault; jangan pernah
menaruh service role di JavaScript aplikasi atau repository.

## 4. Verifikasi

1. Login sebagai karyawan dan kirim satu absensi kamera serta satu pengajuan sakit.
2. Pastikan status berubah menjadi **Foto absensi tersimpan**.
3. Storage → `attendance-photos` harus berisi folder UUID karyawan.
4. Tombol **Lihat Foto Absensi** harus membuat tautan sementara dan membuka foto.
5. Karyawan lain tidak boleh dapat membaca path tersebut; Owner/Finance boleh.
