-- Samakan bonus kerajinan pada detail Catatan Kehadiran dengan rekap bulanan.
-- Fungsi lama tetap dipertahankan sebagai pembentuk payload, lalu nilai
-- bonusKerajinan setiap bulan dihitung ulang memakai aturan efektif terbaru.

do $migration$
begin
  if to_regprocedure('public.get_absensi_rekap_base(uuid)') is null then
    alter function public.get_absensi_rekap(uuid) rename to get_absensi_rekap_base;
  end if;
end
$migration$;

revoke execute on function public.get_absensi_rekap_base(uuid) from public, anon, authenticated;

create or replace function public.get_absensi_rekap(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
  v_data jsonb := '[]'::jsonb;
  v_item jsonb;
  v_bonus_setting integer;
  v_bonus_efektif integer;
begin
  v_result := public.get_absensi_rekap_base(p_user_id);

  for v_item in
    select value from jsonb_array_elements(coalesce(v_result->'data', '[]'::jsonb))
  loop
    select s.bonus_kerajinan
      into v_bonus_setting
      from public.profiles p
      cross join lateral public.get_effective_salary_setting(
        p.id,
        v_item->>'bulan',
        p.gaji_bulanan,
        150000
      ) s
     where p.id = p_user_id;

    v_bonus_efektif := public.bonus_kerajinan_efektif(
      p_user_id,
      v_item->>'bulan',
      coalesce((v_item->>'totalAbsen')::integer, 0),
      coalesce(v_bonus_setting, 150000)
    );

    v_data := v_data || jsonb_build_array(
      jsonb_set(v_item, '{bonusKerajinan}', to_jsonb(v_bonus_efektif), true)
    );
  end loop;

  return jsonb_set(v_result, '{data}', v_data, true);
end;
$$;

grant execute on function public.get_absensi_rekap(uuid) to authenticated;

comment on function public.get_absensi_rekap(uuid) is
  'Detail rekap absensi dengan bonus kerajinan efektif: izin/sakit disetujui ditoleransi dan Sanksi Berulang tingkat 2+ menghilangkan bonus.';

notify pgrst, 'reload schema';
