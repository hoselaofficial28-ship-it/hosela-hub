-- ============================================================================
-- PERBAIKAN PENTING — Izin fungsi pembantu RLS (14 Oktober 2026)
-- ============================================================================
-- APA YANG SALAH:
--   Migrasi 20261014000028 mencabut izin panggil dari PUBLIC untuk SEMUA fungsi
--   di schema public. Ternyata fungsi pembantu di bawah ini dipakai DI DALAM
--   policy RLS (tabel profiles, announcements, absensi, izin, KPI, dan lain-lain).
--
--   Policy RLS dievaluasi memakai hak akses pengguna yang SEDANG LOGIN. Karena
--   izin panggilnya ikut tercabut, setiap query ke tabel ber-RLS gagal dengan
--   pesan: permission denied for function current_bagian
--   Akibatnya aplikasi tidak bisa dipakai (gejala: tidak bisa login).
--
-- PERBAIKAN:
--   Kembalikan izin panggil untuk 4 fungsi pembantu itu. Fungsi ini hanya
--   membaca identitas pemanggil SENDIRI (nilai true/false, atau nama bagian dari
--   profilnya sendiri) — tidak membuka data karyawan lain, jadi aman diberikan
--   ke semua role termasuk anon (dibutuhkan agar halaman login tetap jalan).
--
-- Aman dijalankan berulang.
-- ============================================================================

grant execute on function public.current_bagian() to public, anon, authenticated, service_role;
grant execute on function public.is_owner() to public, anon, authenticated, service_role;
grant execute on function public.is_finance() to public, anon, authenticated, service_role;
grant execute on function public.is_payroll_admin() to public, anon, authenticated, service_role;

-- Segarkan cache izin di server API supaya langsung berlaku.
notify pgrst, 'reload schema';

-- Verifikasi (harus muncul daftar hak akses, tidak boleh kosong):
--   select proname, proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and proname in ('current_bagian','is_owner','is_finance','is_payroll_admin');
