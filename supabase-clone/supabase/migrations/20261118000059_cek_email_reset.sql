-- ============================================================================
-- Reset kata sandi: pastikan email benar-benar terdaftar (18 Nov 2026)
--
-- Tujuan: tombol "Lupa sandi?" hanya boleh mengirim tautan reset ke email yang
-- memang terdaftar pada profil karyawan AKTIF. Email sembarang harus ditolak.
--
-- Catatan: Supabase sengaja tidak memberi tahu apakah suatu email terdaftar
-- (agar tidak bisa dipakai menebak data). Karena perusahaan perlu memastikan
-- pengirimannya tepat, verifikasi dilakukan di database lewat fungsi ini.
--
-- Aman dijalankan berulang. Hanya 1 fungsi tambahan, tidak mengubah data.
-- ============================================================================

begin;

create or replace function public.email_terdaftar(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where lower(trim(coalesce(email, ''))) = lower(trim(coalesce(p_email, '')))
       and status = 'AKTIF'
  );
$$;

comment on function public.email_terdaftar(text) is
  'true bila email tersebut terdaftar pada profil karyawan berstatus AKTIF (dipakai untuk memverifikasi permintaan reset kata sandi).';

revoke execute on function public.email_terdaftar(text) from public;
grant execute on function public.email_terdaftar(text) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
