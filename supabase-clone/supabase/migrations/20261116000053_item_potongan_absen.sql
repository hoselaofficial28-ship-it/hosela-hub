-- ============================================================================
-- Tambahan 16 Nov 2026: izinkan tipe item slip "POTONGAN_ABSEN".
--
-- Sebab: slip gaji aplikasi lama mencatat potongan hari tidak masuk sebagai
-- item bertipe POTONGAN_ABSEN (71 baris di data lama). Batasan
-- payroll_items_tipe_check dari migrasi 044 belum memuat tipe itu, sehingga
-- impor data lama ditolak:
--   'new row for relation "payroll_items" violates check constraint
--    "payroll_items_tipe_check"' (kode 23514).
--
-- Tampilan aplikasi (js/payroll.js -> payrollItemLabel) SUDAH mengenal
-- "POTONGAN_ABSEN" sebagai "Potongan absen", jadi tipe ini memang dipakai UI.
--
-- Hanya mengubah batasan (constraint); tidak mengubah/menghapus data.
-- Aman dijalankan berulang.
-- ============================================================================

alter table public.payroll_items drop constraint if exists payroll_items_tipe_check;

alter table public.payroll_items add constraint payroll_items_tipe_check check (tipe in (
  'BONUS_KERAJINAN','DENDA_SP','DENDA_TELAT','DENDA_MANUAL','REWARD_MANUAL',
  'LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN','POTONGAN_ABSEN',
  'ADJUSTMENT_PLUS','ADJUSTMENT_MINUS'
));
