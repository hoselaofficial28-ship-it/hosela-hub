-- ============================================================================
-- Perbaikan kecil: resolve_login_email jangan filter status=AKTIF, supaya
-- alur login bisa sampai ke pengecekan status (PENDING/DITOLAK/NONAKTIF) dan
-- menampilkan pesan yang jujur sesuai alasannya -- bukan "sandi salah" yang
-- menyesatkan untuk akun yang sebenarnya menunggu approval.
-- Keamanan tetap terjaga: password SALAH tetap ditolak Supabase Auth duluan
-- sebelum status sempat dicek, jadi tidak ada celah baru.
-- ============================================================================
create or replace function public.resolve_login_email(p_nama text)
returns text
language sql security definer stable set search_path = public as $$
  select email from public.profiles
  where lower(trim(nama)) = lower(trim(p_nama)) and email is not null
  limit 1;
$$;
