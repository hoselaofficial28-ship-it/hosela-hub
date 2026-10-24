# Status Produksi Hosela Hub

Tanggal audit: **24 Oktober 2026**.

## Sudah aktif

- Production: `https://hosela-hub.vercel.app`.
- Supabase Auth, database, RLS, RPC, dan Edge Functions menjadi backend aktif.
- Seluruh 80 aksi `gasCall` yang dipanggil frontend memiliki handler Supabase nyata.
- Login, daftar akun, role Owner/Finance/Karyawan, pengelolaan akun, jobdesk,
  peraturan, pengumuman, ide tim, kalender, izin, KPI, absensi, payroll, slip,
  sanksi, dan Review Telat sudah tersambung.
- Foto absensi dan surat dokter disimpan privat di bucket `attendance-photos`,
  dikompres maksimal 180 KB, dibuka memakai signed URL 2 menit, dan dihapus
  otomatis setelah 15 hari.
- Cron pembersihan berjalan setiap 02.30 WIB dengan secret khusus di Vault.
- Notifikasi Telegram untuk absensi datang/pulang sudah aktif.
- Test regresi lokal terakhir: **30/30 lulus**, termasuk pemeriksaan otomatis
  28 layar aktif dan 80 aksi frontend tanpa handler yang hilang. Layar lama
  `s-tambah-pengumuman` sudah digantikan panel Owner langsung di Pengumuman.

## Masih perlu diselesaikan

1. Acceptance test manual pada HP dan PC untuk tiga role, termasuk kamera, GPS,
   upload foto, Telegram, izin sakit, dan satu siklus payroll penuh.
2. Keputusan Owner untuk kasus gabungan dalam bulan yang sama: telat minimal lima
   kali sekaligus absen efektif minimal lima hari. Jangan mengubah rumus sebelum
   keputusan dicatat.
3. Rekonsiliasi dengan Spreadsheet/aplikasi lama bila histori lama memang ingin
   dipindahkan. Jika sistem dimulai dari data baru, pekerjaan ini tidak wajib.
4. Baseline riwayat migration Supabase. SQL 001–048 dijalankan manual sehingga
   tabel history CLI belum mencerminkan keadaan database sebenarnya. Jangan
   menjalankan semua migration ulang tanpa audit objek database.
5. Koneksi GitHub→Vercel. Upaya CLI ditolak karena akun integrasi Vercel belum
   memiliki write/admin access ke repository `hoselaofficial28-ship-it/hosela-hub`.
   Deploy manual ke project `hosela-hub` tetap bekerja dan tidak membuat project baru.
6. Uji rollback terkontrol sebelum aplikasi dinyatakan 100% final.

## Aturan deploy saat ini

- Frontend: deploy manual dari `supabase-clone/app` ke project Vercel `hosela-hub`.
- Edge Functions: deploy memakai Supabase CLI ke project `lhiepqldpiaqcctmqjss`.
- Perubahan SQL: audit dahulu apakah objek sudah ada karena history migration
  belum dibaseline.
- Google Apps Script tidak perlu dideploy untuk aplikasi Supabase ini.

## Pemeriksaan cepat

Jalankan dari root repository:

```powershell
node supabase-clone/tools/production-smoke.mjs
```

Pemeriksaan ini tidak menulis data produksi. Ia hanya memastikan domain utama,
aset penting, versi cache, form bukti sakit, dan larangan fallback data contoh.
