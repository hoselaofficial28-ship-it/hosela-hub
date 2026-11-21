# Izin datang terlambat — 21 November 2026

Target: aplikasi `supabase-clone/app`, database Supabase. GAS tidak diubah.

## Cara menggunakan

1. Buka **Catatan Kehadiran**, pilih bulan dan tanggal karyawan.
2. Tekan **Atur Izin Kedatangan**. Jika belum ada rekap, jalankan **Proses ke Rekap Resmi** dahulu.
3. Pilih **Izin datang terlambat**, periksa durasi/potongan otomatis, isi alasan, lalu **Simpan Keputusan**.
4. Untuk membatalkan, buka tanggal yang sama dan pilih **Telat biasa**.
5. Daftar seluruh keputusan tetap tersedia di **Review Telat**. Pilih **Semua Status** untuk melihat yang sudah diputuskan.

Owner dan Finance dapat mengelola. Karyawan membaca hasil sendiri; otorisasi diperiksa oleh server.

## Perhitungan

`potongan = round(gaji pokok bulanan / hari kerja terjadwal bulan itu / menit shift tanggal itu × menit izin)`

- Hari kerja: Senin–Sabtu dengan jadwal yang valid, dikurangi hari libur aktif. Hari Minggu yang juga libur tidak dikurangi dua kali.
- Menggunakan resolver shift karyawan, termasuk pengecualian tanggal dan aturan Sabtu.
- Durasi diambil dari jam masuk asli dikurangi jadwal; tidak dibulatkan naik ke jam. Maksimum satu shift.
- Pembulatan rupiah hanya pada hasil akhir. Jam masuk asli tidak diubah.
- Contoh gaji Rp3.400.000, 26 hari, shift 600 menit, izin 88 menit: **Rp19.179**.
- Jika hari kerja 22: **Rp22.667**. Jika shift 480 menit dan hari kerja 26: **Rp23.974**.

Keputusan baru memakai `attendance_details.tipe = IZIN_TELAT`. Jumlah telat/SP/SB tidak memasukkannya. Kehadiran tetap tercatat HADIR. Potongan masuk total pengurang payroll melalui ledger yang sama dan diuraikan sebagai `POTONGAN_IZIN`, terpisah dari `DENDA_TELAT`, termasuk PDF.

Keputusan menyimpan dasar hitungan dan pelaku yang terautentikasi. Saat rekap dibangun ulang, keputusan diterapkan kembali. Sinkronisasi draf menghitung ulang nominal jika gaji/jadwal berubah. Slip PUBLISHED harus dibatalkan terlebih dahulu; review dan refresh menolak perubahan pada slip terbit.

Keputusan review lama tanpa `basis_izin` tidak diubah massal. Tinjau ulang tanggal yang ingin diberlakukan dengan aturan baru. Opsi Bebas Potongan mempertahankan perilaku lama: nominal nol, kejadian tetap telat.

## Penerapan

Status 21 November 2026: **SQL produksi berhasil diterapkan** di project `lhiepqldpiaqcctmqjss`. Verifikasi read-only menghasilkan 19179 untuk contoh 88 menit dan 10 definisi cadangan di `migration_66_backup`. Frontend menunggu deployment; percobaan CLI ditolak `Not authorized`, dilanjutkan melalui GitHub.

1. Pastikan dashboard mengarah ke project `lhiepqldpiaqcctmqjss`.
2. Simpan definisi fungsi terdampak sebelum SQL dijalankan. Jangan menjalankan ulang seluruh migrasi historis; riwayat CLI belum dibaseline.
3. Jalankan **hanya** `supabase-clone/supabase/migrations/20261121000066_izin_datang_terlambat.sql`.
4. Migrasi satu transaksi, dapat dijalankan ulang, tanpa backfill data karyawan. Patch fungsi berhenti dengan error jika pola fungsi prasyarat berbeda.
5. Deploy folder **supabase-clone/app** ke project Vercel **hosela-hub** yang sudah ada, kemudian periksa cache versi **20261121a**.
6. Verifikasi read-only form, role, dan preview di produksi. Jangan menandai izin karyawan nyata atau menerbitkan slip sebagai tes tanpa keputusan Owner.

Tidak ada deploy Apps Script atau perubahan Firebase.

## Bukti pengujian lokal

- 35 berkas test regresi lulus.
- `tests/izin-kedatangan.integration.mjs`: 43 assertion PostgreSQL lokal (PGlite), termasuk migrasi ulang, rumus, bulan/shift, libur Minggu, approval, pembatalan, sanksi, snapshot payroll, refresh gaji, dan penolakan akses karyawan.
- `tests/izin-kedatangan.browser.mjs`: fixture browser 375 dan 1440 px; tidak ada overflow horizontal, validasi alasan, simpan, Escape. Semua jaringan diblokir pada fixture ini.
- PGlite merupakan alat uji sementara yang disetujui Owner, dipasang di luar repository. Tidak menjadi dependency web app.
- Runtime auth Supabase diwakili schema fixture lokal; migration Storage/Telegram/import cleanup tidak dijalankan dalam tes payroll. Fungsi historis yang tidak relevan dimuat dengan `check_function_bodies=off`; migrasi baru divalidasi dengan `on` dan fungsi terkait dijalankan nyata.

Jalankan integration dengan `PGLITE_MODULE` menunjuk `dist/index.js` instalasi PGlite. Browser test memakai `PLAYWRIGHT_MODULE` menunjuk Playwright yang sudah terpasang. Data fixture semuanya buatan dan berakhir saat database dalam memori ditutup.

## Pemulihan

Backup frontend sebelum edit ada di `Temp/backup-izin-jam-20261121` (lokal, tidak di-commit). Jika penerapan SQL gagal, transaksi rollback otomatis. Setelah keputusan IZIN_TELAT telah dipakai, jangan menghapus tipe/kolom baru atau mengembalikan trigger lama secara langsung; lakukan perbaikan maju agar riwayat dan slip tetap dapat dibaca. Deploy frontend sebelumnya hanya untuk pemulihan sementara, bukan rollback data keputusan.
