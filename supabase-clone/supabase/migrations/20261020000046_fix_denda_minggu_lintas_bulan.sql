-- ============================================================================
-- 20261020000046 — Denda memakai tanggal kejadian, bukan bulan awal minggu ISO
-- ============================================================================
-- Bug nyata September 2026:
--   6x telat @ Rp10.000 + SP2 Rp50.000 seharusnya Rp110.000, tetapi terbaca
--   Rp90.000. Telat tanggal 2 dan 4 September berada di minggu 2026-W36 yang
--   dimulai 31 Agustus. Fungsi lama mengubah kode minggu ke bulan berdasarkan
--   hari Senin, sehingga dua telat tersebut keliru dianggap milik Agustus.
--
-- Prinsip permanen:
--   * angka BULANAN selalu bersumber dari attendance_details.tanggal;
--   * attendance_weekly hanya ringkasan tampilan/status mingguan;
--   * satu helper ledger dipakai rekap, payroll, dan snapshot slip supaya rumus
--     denda tidak berbeda lagi antarhalaman.
-- ============================================================================

begin;

-- Sumber tunggal total denda bulanan. Fungsi internal ini sengaja tidak dapat
-- dipanggil langsung oleh pengguna aplikasi.
create or replace function public._total_denda_bulan_ledger(p_user_id uuid, p_bulan_key text)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(d.nilai, 0)), 0)::integer
    from public.attendance_details d
   where d.user_id = p_user_id
     and d.tanggal >= (p_bulan_key || '-01')::date
     and d.tanggal <  (p_bulan_key || '-01')::date + interval '1 month'
     and d.tipe in ('TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL');
$$;

revoke execute on function public._total_denda_bulan_ledger(uuid, text) from public, anon, authenticated;
grant execute on function public._total_denda_bulan_ledger(uuid, text) to service_role;

-- RPC publik tetap menjaga privasi, tetapi hitungannya memakai ledger harian.
create or replace function public.get_total_denda_bulan(p_user_id uuid, p_bulan_key text)
returns integer
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if coalesce(p_user_id, auth.uid()) <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya boleh melihat data denda sendiri' using errcode = '42501';
  end if;
  return public._total_denda_bulan_ledger(p_user_id, p_bulan_key);
end;
$$;

revoke execute on function public.get_total_denda_bulan(uuid, text) from public, anon;
grant execute on function public.get_total_denda_bulan(uuid, text) to authenticated, service_role;

-- Fungsi dasar Catatan Kehadiran. Ringkasan dan rincian minggu yang menyentuh
-- dua bulan dibatasi lagi memakai tanggal kejadian sebenarnya.
create or replace function public.get_absensi_rekap_base(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_result jsonb;
  v_bulan_ini text;
begin
  if auth.uid() is null then raise exception 'Harus login' using errcode='28000'; end if;
  if p_user_id <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then
    return jsonb_build_object('bulanIni',to_char(now() at time zone 'Asia/Jakarta','YYYY-MM'),'liburBulanIni','[]'::jsonb,'data','[]'::jsonb);
  end if;

  with months as (
    select distinct to_char(tanggal,'YYYY-MM') bulan
      from public.attendance_details where user_id=p_user_id
  )
  select coalesce(max(bulan),to_char(now() at time zone 'Asia/Jakarta','YYYY-MM'))
    into v_bulan_ini from months;

  with months as (
    select distinct to_char(tanggal,'YYYY-MM') bulan
      from public.attendance_details where user_id=p_user_id
  ), month_rows as (
    select m.bulan,
      (select count(*) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=m.bulan and d.tipe='HADIR')::integer total_hadir,
      (select count(*) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=m.bulan and d.tipe='TELAT')::integer total_telat,
      (select count(*) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=m.bulan and d.tipe='ABSEN')::integer total_absen,
      (select count(*) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=m.bulan and d.tipe='LEMBUR_MINGGU')::integer lembur_minggu,
      (select count(*) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=m.bulan and d.tipe='LEMBUR_LIBUR')::integer lembur_libur
    from months m
  ), payload as (
    select mr.*,
      public._total_denda_bulan_ledger(p_user_id, mr.bulan) total_denda,
      (select coalesce(sum(d.nilai),0)::integer from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=mr.bulan and d.tipe in ('LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','REWARD_MANUAL')) total_reward,
      (select s.bonus_kerajinan from public.profiles p cross join lateral public.get_effective_salary_setting(p.id,mr.bulan,p.gaji_bulanan,150000) s where p.id=p_user_id) bonus_setting,
      (select s.gaji_bulanan from public.profiles p cross join lateral public.get_effective_salary_setting(p.id,mr.bulan,p.gaji_bulanan,150000) s where p.id=p_user_id) gaji_setting
    from month_rows mr
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bulan',p.bulan,
    'label',(array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[split_part(p.bulan,'-',2)::integer] || ' ' || split_part(p.bulan,'-',1),
    'totalHadir',p.total_hadir,'totalTelat',p.total_telat,'totalAbsen',p.total_absen,
    'lemburMinggu',p.lembur_minggu,'lemburLibur',p.lembur_libur,
    'totalDenda',p.total_denda,'totalRewardLembur',p.total_reward,
    'bonusKerajinan',case when p.total_absen=0 then coalesce(p.bonus_setting,150000) else 0 end,
    'gajiBulanan',coalesce(p.gaji_setting,0),
    'detailLemburPulang',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_PULANG'),'[]'::jsonb),
    'detailLemburMinggu',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_MINGGU'),'[]'::jsonb),
    'detailLemburLibur',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_LIBUR'),'[]'::jsonb),
    'detailAbsen',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='ABSEN'),'[]'::jsonb),
    'detailDendaSP',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe in ('DENDA_SP','DENDA_ANOMALI')),'[]'::jsonb),
    'detailDendaManual',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='DENDA_MANUAL'),'[]'::jsonb),
    'detailRewardManual',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='REWARD_MANUAL'),'[]'::jsonb),
    'mingguList',coalesce((
      select jsonb_agg(jsonb_build_object(
        'minggu',w.minggu,'hadir',w.hadir,'telat',w.telat,'absen',w.absen,
        'lemburMinggu',w.lembur_minggu,'lemburLibur',w.lembur_libur,'denda',w.denda,
        'status',public.calc_status_mingguan(w.absen,w.telat),'libur','[]'::jsonb,
        'detail',jsonb_build_object(
          'hadir',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='HADIR'),'[]'::jsonb),
          'telat',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='TELAT'),'[]'::jsonb),
          'absen',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI')) order by d.tanggal) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='ABSEN'),'[]'::jsonb)
        )
      ) order by w.minggu)
      from (
        select d.minggu,
          count(*) filter(where d.tipe='HADIR')::integer hadir,
          count(*) filter(where d.tipe='TELAT')::integer telat,
          count(*) filter(where d.tipe='ABSEN')::integer absen,
          count(*) filter(where d.tipe='LEMBUR_MINGGU')::integer lembur_minggu,
          count(*) filter(where d.tipe='LEMBUR_LIBUR')::integer lembur_libur,
          coalesce(sum(d.nilai) filter(where d.tipe in ('TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')),0)::integer denda
        from public.attendance_details d
        where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan
        group by d.minggu
      ) w
    ),'[]'::jsonb)
  ) order by p.bulan desc),'[]'::jsonb) into v_result from payload p;

  return jsonb_build_object(
    'bulanIni',v_bulan_ini,
    'liburBulanIni',coalesce((select jsonb_agg(nama order by tanggal) from public.holidays where to_char(tanggal,'YYYY-MM')=v_bulan_ini),'[]'::jsonb),
    'data',v_result
  );
end;
$$;

revoke execute on function public.get_absensi_rekap_base(uuid) from public, anon, authenticated;
grant execute on function public.get_absensi_rekap_base(uuid) to service_role;

-- Snapshot slip memakai sumber tunggal yang sama. Selisih setelah denda SP/manual
-- adalah murni denda keterlambatan harian.
create or replace function public._snapshot_payroll_items(p_detail_id uuid, p_user_id uuid, p_bulan_key text, p_bonus_kerajinan integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_gaji integer;
  v_denda_total integer;
  v_denda_item integer;
  v_hari_telat integer;
begin
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
    where d.user_id = p_user_id
      and d.tanggal >= (p_bulan_key || '-01')::date
      and d.tanggal <  (p_bulan_key || '-01')::date + interval '1 month'
      and d.tipe in ('DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL','REWARD_MANUAL','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN');

  if p_bonus_kerajinan > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
      values (p_detail_id, 'BONUS_KERAJINAN', null, 'Bonus kerajinan bulan ' || p_bulan_key, p_bonus_kerajinan);
  end if;

  v_denda_total := public._total_denda_bulan_ledger(p_user_id, p_bulan_key);
  v_hari_telat := coalesce((select count(*) from public.attendance_details d
    where d.user_id = p_user_id
      and d.tanggal >= (p_bulan_key || '-01')::date
      and d.tanggal <  (p_bulan_key || '-01')::date + interval '1 month'
      and d.tipe = 'TELAT'), 0);

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

grant execute on function public._snapshot_payroll_items(uuid, uuid, text, integer) to authenticated, service_role;

comment on function public._total_denda_bulan_ledger(uuid, text) is
  'Sumber tunggal denda bulanan berdasarkan attendance_details.tanggal. Jangan memakai bulan dari awal minggu ISO untuk angka bulanan.';

notify pgrst, 'reload schema';

commit;
