-- ============================================================================
-- Hosela Hub — Supabase Clone — Perbaikan calc_effective_payroll_bonus
-- ============================================================================
-- Ditemukan saat uji update_payroll_adjustment: ketika originalBonus<=0
-- (karyawan absen bulan itu -- KASUS UMUM), effective_adjustment_plus SALAH
-- di-set ke 0, padahal adjustment_plus (misal bonus manual dari Owner) tidak
-- ada hubungannya sama sekali dengan bonus kerajinan.
--
-- Sitasi asli (gas/Code.gs:3729-3733):
--   if (originalBonus <= 0) { detail.bonusKerajinan = 0; return detail; }
-- Fungsi RETURN LANGSUNG begitu bonusKerajinan di-nolkan -- detail.adjustmentPlus
-- TIDAK PERNAH DISENTUH SAMA SEKALI (tetap nilai aslinya). Migration 0003
-- (saya sendiri) salah menerjemahkan "tidak disentuh" jadi "di-set ke 0" --
-- comment di fungsi itu sudah benar niatnya ("return detail apa adanya"),
-- implementasi SQL-nya yang keliru. Baris LAIN di fungsi ini tidak berubah.
-- ============================================================================

create or replace function public.calc_effective_payroll_bonus(
  original_bonus integer, effective_bonus_setting integer, original_adjustment_plus integer
) returns table(
  effective_bonus integer,
  effective_adjustment_plus integer,
  absorbed boolean,
  absorbed_amount integer
)
language sql immutable as $$
  with base as (
    select
      greatest(0, coalesce(original_bonus,0)) as ob,
      greatest(0, coalesce(effective_bonus_setting, original_bonus, 0)) as eb,
      greatest(0, coalesce(original_adjustment_plus,0)) as oap
  ), calc as (
    select ob, eb, oap, greatest(0, eb - ob) as delta from base
  )
  select
    case when ob <= 0 then 0 else eb end,
    case when ob <= 0 then oap
         when delta > 0 and oap = delta then 0
         else oap end,
    (ob > 0 and delta > 0 and oap = delta),
    case when ob > 0 and delta > 0 and oap = delta then delta else 0 end
  from calc;
$$;
comment on function public.calc_effective_payroll_bonus is 'Syarat "diserap" harus PERSIS (oap = delta), bukan >=. Kalau originalBonus<=0, adjustment_plus dikembalikan APA ADANYA (bukan di-nolkan -- diperbaiki 2026-10-05, lihat migration 0014), hanya bonusKerajinan yang jadi 0.';
