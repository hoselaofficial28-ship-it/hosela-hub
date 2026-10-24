# Acceptance Test Wajib

> **Status 24 Oktober 2026:** 29 test regresi otomatis lulus. Checklist yang
> masih kosong di dokumen ini berarti verifikasi manual lintas perangkat/role
> belum dicatat lengkap, bukan otomatis berarti fiturnya belum dibuat.

## Identitas dan akses

- [ ] Login berhasil/gagal sesuai kredensial dan user nonaktif ditolak.
- [ ] Sandi default memaksa ganti sandi.
- [ ] Role Karyawan, Finance, dan Owner hanya dapat membuka serta mengubah data sesuai haknya.
- [ ] Manipulasi request langsung tetap ditolak oleh RLS/server.
- [ ] Alur daftar, approve, reject, tambah, dan nonaktifkan user berfungsi.

## Navigasi dan tampilan

- [ ] Seluruh 29 layar dapat dibuka di HP dan PC tanpa blank putih.
- [ ] Browser back/deep link/hash bekerja seperti aplikasi aktif.
- [ ] Search menu, badge, loading, toast, dan error tampil benar.
- [ ] Notifikasi/badge tidak tertutup kartu lain.
- [ ] Cache/PWA tidak mengembalikan data versi lama setelah perubahan.

## Absensi dan Supabase Storage

- [ ] Kamera, lokasi, radius, akurasi, preview, retake, dan submit bekerja.
- [ ] Foto benar-benar ada di bucket privat Supabase dan metadata cocok dengan event absensi/izin.
- [ ] Service-role dan secret Cron tidak terlihat di browser/network bundle.
- [ ] Retry upload tidak membuat tap atau file duplikat.
- [ ] Jam 08:12 pada jadwal 08:00 ditandai telat dan tampil merah dengan simbol, bukan biru.
- [ ] Jadwal khusus mengubah batas telat sesuai tanggal.
- [ ] Minggu/libur, absen, partial tap, tap sore, lupa pulang, anomali, reject, dan edit manual diuji.
- [ ] Proses ulang bulan yang sama idempotent.

## Rumus disiplin/KPI

- [ ] Denda telat tepat pada batas 1, 10, 11, 30, dan 31 menit.
- [ ] Lembur tepat pada 59, 60, 89, 90, dan 120 menit.
- [ ] Status BAIK/KUNING/ORANGE/MERAH tepat pada batas.
- [ ] Izin dan sakit menghitung absen efektif sesuai rumus.
- [ ] SP1/SP2/SP3, denda, pembatalan/penurunan setelah izin, serta notifikasi sama dengan sistem lama.
- [ ] KPI replace minggu yang sama, skor, gate bintang, dan ranking sama dengan golden result.

## Gaji, kerajinan, payroll, dan slip

- [ ] Setting gaji/kerajinan per bulan bertahan setelah refresh.
- [ ] Setting September berlaku mulai September dan bulan berikutnya sampai ada setting baru.
- [ ] Simpan massal beberapa karyawan atomik: seluruhnya berhasil atau seluruhnya gagal.
- [ ] Syarat penerima kerajinan tidak berubah.
- [ ] Kerajinan Rp150.000 → Rp200.000 muncul sebagai bonus Rp200.000, bukan bonus Rp200.000 plus adjustment Rp50.000.
- [ ] Total gaji mengikuti rumus dan tidak negatif.
- [ ] Draft, confirm, publish memiliki role check dan audit log.
- [ ] Slip published terlihat oleh karyawan yang benar saja.
- [ ] Owner, Finance, dan Karyawan dapat mengunduh PDF slip sesuai hak masing-masing.
- [ ] Published snapshot tidak berubah diam-diam setelah setting baru.

## Rekonsiliasi migrasi

- [ ] Row count tiap sheet lama cocok dengan tabel/staging tujuan atau memiliki alasan mismatch.
- [ ] Total gaji, bonus, reward, denda, adjustment, dan total diterima cocok per user/bulan.
- [ ] Jumlah hadir, telat, absen, lembur, izin, SP, dan notifikasi cocok.
- [ ] Semua record memiliki `legacy_id` atau pemetaan asal.
- [ ] Rollback ke aplikasi lama pernah diuji sebelum cutover.

## Bukti penyelesaian

Claude Code harus menghasilkan laporan berisi commit, migration yang dijalankan, hasil test, daftar mismatch nol/tersisa, screenshot mobile-PC, serta langkah rollback. Pernyataan “selesai” tanpa bukti tersebut tidak diterima.
