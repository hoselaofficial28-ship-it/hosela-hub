-- ============================================================================
-- Hosela Hub — Supabase Clone — Perbaikan get_effective_salary_setting
-- ============================================================================
-- Ditemukan saat uji get_salary_users: fungsi ini (migration 0010) cuma
-- return 3 kolom (gaji_bulanan, bonus_kerajinan, bulan_setting), TIDAK
-- pernah return 'catatan' -- tapi get_salary_users (migration 0015)
-- mengasumsikan ada kolom itu. Diperbaiki dengan menambah kolom baru ke
-- fungsi dasar (posisi di akhir, aman untuk semua pemanggil lain yang
-- sudah ada -- get_rekap_bulanan_semua, get_payroll_run_payload,
-- get_payroll_detail, get_payroll_employee_slip -- karena semua itu pakai
-- scalar subquery 1 kolom spesifik atau tidak pernah pakai kolom ini sama
-- sekali, tidak bergantung pada jumlah/urutan kolom yang sudah ada).
-- ============================================================================

-- PostgreSQL tidak izinkan CREATE OR REPLACE mengubah kolom return type
-- (TABLE) -- harus drop dulu. Aman: fungsi ini SECURITY DEFINER, dipanggil
-- lewat RPC/fungsi lain, tidak ada grant langsung ke client yang terputus
-- sesaat.
drop function if exists public.get_effective_salary_setting(uuid, text, integer, integer);

create or replace function public.get_effective_salary_setting(
  p_user_id uuid, p_bulan_key text, p_fallback_gaji integer default 0, p_fallback_kerajinan integer default 150000
) returns table(gaji_bulanan integer, bonus_kerajinan integer, bulan_setting text, catatan text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(s.gaji_bulanan, greatest(0, p_fallback_gaji)),
    coalesce(s.bonus_kerajinan, greatest(0, p_fallback_kerajinan)),
    s.bulan,
    s.catatan
  from (select 1) dummy
  left join lateral (
    select gaji_bulanan, bonus_kerajinan, bulan, catatan
    from public.salary_settings
    where user_id = p_user_id and bulan <= p_bulan_key
    order by bulan desc, created_at desc
    limit 1
  ) s on true;
$$;
