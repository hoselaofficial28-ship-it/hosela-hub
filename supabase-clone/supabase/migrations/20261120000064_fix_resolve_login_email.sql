-- ============================================================================
-- Perbaikan login: nama pengguna "muljanah" salah arah ke akun duplikat
-- 20 Nov 2026
--
-- Ada dua profil bernama "muljanah": akun asli (muljannah186@gmail.com) dan
-- akun sisa/duplikat (muljanah@hoselaofficial.com). resolve_login_email
-- mengembalikan email akun duplikat sehingga login "Nama atau sandi salah".
--
-- Perbaikan: fungsi diurutkan/difilter agar selalu memilih akun yang benar,
-- dan mengembalikan NULL bila nama tidak punya akun aktif.
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create or replace function public.resolve_login_email(p_nama text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.email
    from public.profiles p
   where lower(btrim(p.nama)) = lower(btrim(coalesce(p_nama, '')))
     and p.status = 'AKTIF'
     and p.email is not null
     and btrim(p.email) <> ''
   order by
     -- utamakan profil yang punya bagian/jabatan terisi (akun karyawan asli)
     (coalesce(btrim(p.bagian), '') = '') asc,
     (coalesce(btrim(p.jabatan), '') = '') asc,
     p.id
   limit 1;
$$;

comment on function public.resolve_login_email(text) is
  'Email akun AKTIF untuk nama pengguna tertentu; NULL bila tidak ada. Mengutamakan profil karyawan yang lengkap.';

revoke execute on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
