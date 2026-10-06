-- ============================================================================
-- Hosela Hub — Supabase Clone — Kelola Tim: daftar semua karyawan
-- ============================================================================
-- Sitasi: getAllUsers gas/Code.gs:150-156. Sengaja TANPA filter bagian
-- (termasuk Owner/Finance ikut muncul) -- persis aslinya, layar "Kelola
-- Tim" perlu lihat semua orang di sistem. Kode lama tanpa pengecekan role
-- -- clone WAJIB (CLAUDE.md). nonaktifkanUser di layar ini pakai RPC
-- deactivate_salary_user yang sudah ada (migration 0015) -- fungsinya sama
-- persis, tidak perlu RPC baru.
-- ============================================================================

create or replace function public.get_all_users()
returns table(id uuid, nama text, bagian text, jabatan text, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat daftar karyawan' using errcode = '42501';
  end if;
  return query select p.id, p.nama, p.bagian, p.jabatan, p.status from public.profiles p order by p.nama;
end;
$$;
grant execute on function public.get_all_users() to authenticated;
