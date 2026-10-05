-- ============================================================================
-- Seed awal: opsi bagian/jabatan untuk dropdown form Daftar Akun mandiri.
-- SENGAJA tidak menyertakan Owner/Finance -- peran istimewa ini tidak boleh
-- dipilih sendiri lewat pendaftaran publik, cuma lewat "Tambah Karyawan"
-- oleh Owner. Daftar ini editable kapan saja lewat Table Editor Supabase
-- (tabel `jobdesks`) begitu Ko tahu daftar bagian/jabatan asli yang dipakai.
-- ============================================================================
insert into public.jobdesks (bagian, jabatan) values
  ('Packing', 'Staff Packing'),
  ('Packing', 'Kepala Gudang'),
  ('Live', 'Host Live'),
  ('Ecommerce', 'Admin Ecommerce')
on conflict do nothing;
