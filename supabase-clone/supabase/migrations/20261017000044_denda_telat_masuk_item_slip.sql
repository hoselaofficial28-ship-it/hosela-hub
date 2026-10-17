-- ============================================================================
-- 20261017000044 — Denda keterlambatan masuk ke item detail slip
-- ============================================================================
-- Masalah yang dilaporkan Ko (2026-10-17):
--   Di slip adi September 2026, komponen "Denda" = Rp 90.000, tetapi ITEM DETAIL
--   hanya memuat "Denda SP" Rp 50.000. Selisih Rp 40.000 (denda keterlambatan)
--   tidak pernah muncul sebagai item, jadi daftar item tidak cocok dengan total.
--
-- Sebabnya (bukan tebakan, dari kode):
--   get_total_denda_bulan() = Σ attendance_weekly.total_denda (denda telat per minggu)
--                             + Σ attendance_details (DENDA_SP, DENDA_ANOMALI, DENDA_MANUAL)
--   _snapshot_payroll_items() hanya menyalin baris attendance_details dengan tipe
--   DENDA_SP / DENDA_ANOMALI / DENDA_MANUAL.  Baris TELAT (yang nilainya masuk ke
--   attendance_weekly.total_denda) tidak pernah disalin -> tidak ada itemnya.
--
-- Perbaikan:
--   1) Tipe item baru 'DENDA_TELAT' diizinkan di payroll_items.
--   2) _snapshot_payroll_items() menambah SATU item 'DENDA_TELAT' sebesar selisih
--      antara total denda resmi dan denda yang sudah ter-item. Rumus denda TIDAK
--      diubah, jadi angka total tetap sama; yang berubah hanya kelengkapan item.
-- ============================================================================

begin;

-- 1) Izinkan tipe DENDA_TELAT. Constraint lama dicari dulu supaya tidak gagal
--    kalau namanya berbeda di database.
do $$
declare r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.payroll_items'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%DENDA_SP%'
  loop
    execute format('alter table public.payroll_items drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.payroll_items add constraint payroll_items_tipe_check check (tipe in (
  'BONUS_KERAJINAN','DENDA_SP','DENDA_TELAT','DENDA_MANUAL','REWARD_MANUAL',
  'LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN',
  'ADJUSTMENT_PLUS','ADJUSTMENT_MINUS'
));

-- 2) Snapshot item slip: lembur pakai gaji harian Alur Gaji (dari 00043) + item denda telat.
create or replace function public._snapshot_payroll_items(p_detail_id uuid, p_user_id uuid, p_bulan_key text, p_bonus_kerajinan integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_gaji integer;
  v_denda_total integer;
  v_denda_item integer;
  v_hari_telat integer;
begin
  -- Gaji diambil dari Alur Gaji (salary_settings) supaya lembur Minggu/libur tidak 0.
  v_gaji := coalesce((select gaji_bulanan from public.get_effective_salary_setting(p_user_id, p_bulan_key, 0, 150000)), 0);

  insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
    select p_detail_id,
      case when d.tipe in ('DENDA_SP','DENDA_ANOMALI') then 'DENDA_SP' else d.tipe end,
      d.tanggal, d.keterangan,
      case
        when d.tipe in ('LEMBUR_MINGGU','LEMBUR_LIBUR') and coalesce(d.nilai, 0) <= 0
          then public.calc_gaji_harian(v_gaji, public.calc_hari_kerja_efektif(p_bulan_key))
        else coalesce(d.nilai, 0)
      end
    from public.attendance_details d
    where d.user_id = p_user_id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
      and d.tipe in ('DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL','REWARD_MANUAL','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN');

  if p_bonus_kerajinan > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
      values (p_detail_id, 'BONUS_KERAJINAN', null, 'Bonus kerajinan bulan ' || p_bulan_key, p_bonus_kerajinan);
  end if;

  -- Selisih denda = denda resmi (weekly + detail SP/anomali/manual) minus denda yang
  -- sudah ter-item. Selisih itulah denda keterlambatan (baris TELAT per hari).
  v_denda_total :=
    coalesce((select sum(w.total_denda) from public.attendance_weekly w
       where w.user_id = p_user_id and public._minggu_ke_bulan(w.minggu) = p_bulan_key), 0)
    + coalesce((select sum(d.nilai) from public.attendance_details d
       where d.user_id = p_user_id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
         and d.tipe in ('DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')), 0);

  v_hari_telat := coalesce((select count(*) from public.attendance_details d
     where d.user_id = p_user_id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
       and d.tipe = 'TELAT'), 0);

  -- Item denda lama dibuang supaya tidak dobel bila fungsi ini dijalankan ulang.
  delete from public.payroll_items
   where payroll_detail_id = p_detail_id and tipe = 'DENDA_TELAT';

  v_denda_item := coalesce((select sum(pi.nominal) from public.payroll_items pi
     where pi.payroll_detail_id = p_detail_id
       and pi.tipe in ('DENDA_SP','DENDA_MANUAL')), 0);

  if v_denda_total - v_denda_item > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
      values (p_detail_id, 'DENDA_TELAT', null,
        'Denda keterlambatan (' || v_hari_telat || 'x telat) bulan ' || p_bulan_key,
        v_denda_total - v_denda_item);
  end if;
end;
$$;

grant execute on function public._snapshot_payroll_items(uuid, uuid, text, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
