# Rencana Migrasi Tanpa Menabrak Data

## Fase 1 — Bekukan kontrak perilaku

- Catat respons seluruh aksi GAS dengan fixture anonim.
- Buat daftar layar → aksi → tabel → role → efek samping.
- Dokumentasikan sembilan aksi frontend yang belum ada di dispatcher aktif.
- Buat golden test untuk rumus absensi, SP, KPI, gaji, kerajinan, dan payroll.

## Fase 2 — Bangun clone terpisah

- Buat `supabase-clone/` tanpa mengubah aplikasi aktif.
- Buat schema migration berurutan, RLS, RPC, Edge Functions, dan seed fixture.
- Port fungsi bisnis menjadi modul murni dan tes hasilnya.
- Implementasikan adapter data frontend agar UI dapat diuji dengan fixture.

## Fase 3 — Migrasi data dry-run

- Ekspor setiap sheet tanpa mengubah sumber.
- Import ke tabel staging dengan `legacy_id`.
- Normalisasi tanggal ke `Asia/Jakarta`, nominal menjadi integer rupiah, status menjadi enum/check constraint.
- Rekonsiliasi jumlah record per entitas dan total nominal per user/bulan.
- Simpan laporan mismatch; jangan memperbaiki data produksi diam-diam.

## Fase 4 — Parallel run

- Jalankan GAS lama dan Supabase clone untuk periode uji yang sama.
- Bandingkan absensi harian, rekap, denda/reward, skor, bintang, payroll, dan slip.
- Setiap selisih harus memiliki penjelasan dan persetujuan sebelum dianggap benar.

## Fase 5 — Cutover

- Buat backup final Spreadsheet dan catat checksum/row count.
- Hentikan write ke sistem lama hanya pada waktu yang disetujui Ko.
- Jalankan delta migration, rekonsiliasi final, lalu arahkan frontend ke Supabase.
- Simpan aplikasi GAS sebagai rollback sampai minimal satu siklus payroll selesai tanpa selisih.

## Larangan migrasi

- Jangan melakukan dual-write ke produksi sebelum idempotency dan rollback diuji.
- Jangan memakai service-role key di browser.
- Jangan memigrasikan password plaintext lama ke tabel biasa.
- Jangan menghapus Spreadsheet/foto Drive lama setelah cutover.
- Jangan publish payroll uji ke akun karyawan nyata.
