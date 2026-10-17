-- Daftar seluruh slip terbit untuk Owner/Finance.
-- Dipakai halaman Slip Gaji agar riwayat dapat dikelompokkan dan difilter
-- berdasarkan semua bulan yang memang tersedia, tanpa batas 12 bulan.

create or replace function public.get_published_payroll_slips()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_data jsonb;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(x) order by x."bulan" desc, x."nama" asc), '[]'::jsonb)
  into v_data
  from (
    select
      pd.id as "id",
      pr.id as "payrollRunId",
      pd.user_id as "userId",
      pd.nama as "nama",
      pd.bagian as "bagian",
      pd.jabatan as "jabatan",
      pr.bulan as "bulan",
      pr.dipublish_pada as "dipublishPada",
      pd.gaji_pokok as "gajiPokok",
      pd.total_reward as "totalReward",
      eff.effective_bonus as "bonusKerajinan",
      pd.total_denda as "totalDenda",
      public.calc_payroll_total(
        pd.gaji_pokok,
        pd.total_reward,
        eff.effective_bonus,
        eff.effective_adjustment_plus,
        pd.total_denda,
        pd.adjustment_minus
      ) as "totalGaji"
    from public.payroll_details pd
    join public.payroll_runs pr
      on pr.id = pd.payroll_run_id
     and pr.status = 'PUBLISHED'
    cross join lateral public.calc_effective_payroll_bonus(
      pd.bonus_kerajinan,
      (select s.bonus_kerajinan
       from public.get_effective_salary_setting(pd.user_id, pr.bulan, pd.gaji_pokok, pd.bonus_kerajinan) s),
      pd.adjustment_plus
    ) eff
  ) x;

  return jsonb_build_object('success', true, 'data', v_data);
end;
$$;

grant execute on function public.get_published_payroll_slips() to authenticated;
