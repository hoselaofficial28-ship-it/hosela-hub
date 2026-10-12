-- ============================================================================
-- Hosela Hub — Kalender/Matrix Absensi + rekap personal
-- ============================================================================
-- Menutup fallback mock untuk:
--   getAbsensiMatrix / getAbsensiMatrixUser / updateAbsensiMatrixDay
--   getAbsensiRekap / getAllAbsensiRekap / importAbsensiUploadToApp
--
-- Pembacaan matrix dilakukan client lewat tabel yang sudah dilindungi RLS.
-- Mutation dan pembacaan rekap sensitif tetap melalui RPC tervalidasi.
-- ============================================================================

create or replace function public.update_absensi_matrix_day(
  p_user_id uuid,
  p_tanggal date,
  p_jam_masuk text default null,
  p_jam_pulang text default null,
  p_catatan text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_masuk time;
  v_pulang time;
  v_minggu text;
  v_is_sunday boolean;
  v_is_holiday boolean;
  v_jadwal record;
  v_gaji integer;
  v_hari_kerja integer;
  v_gaji_harian integer;
  v_menit_telat integer;
  v_denda integer;
  v_selisih integer;
  v_lembur record;
  v_note text;
  v_detail_count integer := 0;
  v_hadir integer := 0;
  v_telat integer := 0;
  v_absen integer := 0;
  v_lembur_minggu integer := 0;
  v_lembur_libur integer := 0;
  v_total_denda integer := 0;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengedit absensi' using errcode = '42501';
  end if;
  if not exists(select 1 from public.profiles where id = p_user_id and status = 'AKTIF') then
    return jsonb_build_object('success', false, 'msg', 'Karyawan tidak ditemukan atau sudah nonaktif.');
  end if;
  if p_tanggal is null then
    return jsonb_build_object('success', false, 'msg', 'Tanggal tidak valid.');
  end if;
  if nullif(trim(coalesce(p_jam_masuk, '')), '') is not null then
    if trim(p_jam_masuk) !~ '^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$' then
      return jsonb_build_object('success', false, 'msg', 'Jam masuk tidak valid.');
    end if;
    v_masuk := trim(p_jam_masuk)::time;
  end if;
  if nullif(trim(coalesce(p_jam_pulang, '')), '') is not null then
    if trim(p_jam_pulang) !~ '^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$' then
      return jsonb_build_object('success', false, 'msg', 'Jam pulang tidak valid.');
    end if;
    v_pulang := trim(p_jam_pulang)::time;
  end if;

  v_minggu := to_char(p_tanggal, 'IYYY-"W"IW');
  v_is_sunday := extract(dow from p_tanggal) = 0;
  v_is_holiday := exists(select 1 from public.holidays where tanggal = p_tanggal and difasilitasi = true);
  v_note := 'Edit manual oleh ' || coalesce((select nama from public.profiles where id = auth.uid()), 'Admin') ||
            case when trim(coalesce(p_catatan,'')) <> '' then ': ' || trim(p_catatan) else '' end;

  -- Jangan menimpa bukti kamera/import. Nonaktifkan hasil lama dan simpan baris
  -- MANUAL baru agar riwayat koreksi tetap dapat diaudit.
  update public.attendance_events
     set status = 'DITOLAK', catatan = concat_ws(' | ', nullif(catatan,''), v_note || ' - diganti koreksi manual')
   where user_id = p_user_id and tanggal = p_tanggal and status = 'DITERIMA'
     and tipe in ('MASUK','PULANG','ABSEN');

  if v_masuk is not null then
    insert into public.attendance_events(user_id,tanggal,jam,tipe,status,source,catatan)
    values (p_user_id,p_tanggal,v_masuk,'MASUK','DITERIMA','MANUAL',v_note);
  end if;
  if v_pulang is not null then
    insert into public.attendance_events(user_id,tanggal,jam,tipe,status,source,catatan)
    values (p_user_id,p_tanggal,v_pulang,'PULANG','DITERIMA','MANUAL',v_note);
  end if;
  if v_masuk is null and v_pulang is null then
    insert into public.attendance_events(user_id,tanggal,jam,tipe,status,source,catatan)
    values (p_user_id,p_tanggal,'00:00'::time,'ABSEN','DITERIMA','MANUAL',
      v_note || case when v_is_sunday then ' - hari Minggu dikosongkan' else ' - dijadikan absen manual' end);
  end if;

  if v_masuk is not null and v_pulang is not null then
    update public.attendance_anomalies set status = 'NORMAL'
     where user_id = p_user_id and tanggal = p_tanggal and status = 'MENUNGGU';
  end if;

  -- Sinkronkan ledger hari ini saja supaya kartu rekap berubah langsung tanpa
  -- memproses ulang satu bulan dan tanpa menyentuh denda/reward manual.
  delete from public.attendance_details
   where user_id = p_user_id and tanggal = p_tanggal and is_generated = true
     and tipe in ('HADIR','TELAT','ABSEN','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ANOMALI_PENDING');

  select gaji_bulanan into v_gaji from public.profiles where id = p_user_id;
  v_hari_kerja := public.calc_hari_kerja_efektif(to_char(p_tanggal,'YYYY-MM'));
  v_gaji_harian := public.calc_gaji_harian(coalesce(v_gaji,0), v_hari_kerja);
  select * into v_jadwal from public.get_jadwal_hari(p_tanggal);

  if v_masuk is null and v_pulang is null then
    if not v_is_sunday and not v_is_holiday then
      insert into public.attendance_details(user_id,minggu,tanggal,tipe,keterangan,nilai,is_generated)
      values (p_user_id,v_minggu,p_tanggal,'ABSEN','[MANUAL_SYNC] Tidak ada jam masuk/pulang',0,true);
      v_detail_count := v_detail_count + 1;
    end if;
  elsif v_is_sunday or v_is_holiday then
    insert into public.attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai,is_generated)
    values (p_user_id,v_minggu,p_tanggal,coalesce(v_masuk,v_pulang),
      case when v_is_sunday then 'LEMBUR_MINGGU' else 'LEMBUR_LIBUR' end,
      '[MANUAL_SYNC] Masuk hari ' || case when v_is_sunday then 'Minggu' else 'libur' end,
      v_gaji_harian,true);
    v_detail_count := v_detail_count + 1;
  elsif v_masuk is not null then
    insert into public.attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai,is_generated)
    values (p_user_id,v_minggu,p_tanggal,v_masuk,'HADIR','[MANUAL_SYNC] Hadir',0,true);
    v_detail_count := v_detail_count + 1;

    v_menit_telat := (extract(hour from v_masuk)::integer * 60 + extract(minute from v_masuk)::integer) -
                      (extract(hour from v_jadwal.jam_masuk)::integer * 60 + extract(minute from v_jadwal.jam_masuk)::integer);
    if v_menit_telat > 0 then
      v_denda := public.calc_denda_telat(v_menit_telat);
      insert into public.attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai,is_generated)
      values (p_user_id,v_minggu,p_tanggal,v_masuk,'TELAT',
        '[MANUAL_SYNC] Masuk ' || to_char(v_masuk,'HH24:MI') || ', telat ' || v_menit_telat || ' menit',v_denda,true);
      v_detail_count := v_detail_count + 1;
    end if;
    if v_pulang is not null then
      v_selisih := (extract(hour from v_pulang)::integer * 60 + extract(minute from v_pulang)::integer) -
                   (extract(hour from v_jadwal.jam_pulang)::integer * 60 + extract(minute from v_jadwal.jam_pulang)::integer);
      select * into v_lembur from public.calc_lembur_pulang(v_selisih);
      if v_lembur.reward > 0 then
        insert into public.attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai,is_generated)
        values (p_user_id,v_minggu,p_tanggal,v_pulang,'LEMBUR_PULANG',
          '[MANUAL_SYNC] Pulang ' || to_char(v_pulang,'HH24:MI') || ', lembur ' || (v_lembur.lembur_menit / 60.0) || ' jam',v_lembur.reward,true);
        v_detail_count := v_detail_count + 1;
      end if;
    end if;
  else
    insert into public.attendance_details(user_id,minggu,tanggal,waktu,tipe,keterangan,nilai,is_generated)
    values (p_user_id,v_minggu,p_tanggal,v_pulang,'ANOMALI_PENDING','[MANUAL_SYNC] Ada jam pulang tanpa jam masuk',0,true);
    v_detail_count := v_detail_count + 1;
  end if;

  select
    count(*) filter(where tipe='HADIR'), count(*) filter(where tipe='TELAT'),
    count(*) filter(where tipe='ABSEN'), count(*) filter(where tipe='LEMBUR_MINGGU'),
    count(*) filter(where tipe='LEMBUR_LIBUR'),
    coalesce(sum(nilai) filter(where tipe in ('TELAT','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')),0)
  into v_hadir,v_telat,v_absen,v_lembur_minggu,v_lembur_libur,v_total_denda
  from public.attendance_details where user_id=p_user_id and minggu=v_minggu;

  insert into public.attendance_weekly(user_id,minggu,hadir,telat,absen,lembur_minggu,lembur_libur,status,total_denda)
  values (p_user_id,v_minggu,v_hadir,v_telat,v_absen,v_lembur_minggu,v_lembur_libur,
    public.calc_status_mingguan(v_absen,v_telat),v_total_denda)
  on conflict(user_id,minggu) do update set
    hadir=excluded.hadir,telat=excluded.telat,absen=excluded.absen,
    lembur_minggu=excluded.lembur_minggu,lembur_libur=excluded.lembur_libur,
    status=excluded.status,total_denda=excluded.total_denda,updated_at=now();

  insert into public.audit_logs(actor,action,target,after_data,catatan)
  values (auth.uid(),'UPDATE_ABSENSI_MATRIX_DAY',p_user_id::text || '|' || p_tanggal::text,
    jsonb_build_object('masuk',coalesce(to_char(v_masuk,'HH24:MI'),''),'pulang',coalesce(to_char(v_pulang,'HH24:MI'),''),'detailRows',v_detail_count),v_note);

  return jsonb_build_object('success',true,'manualSync',jsonb_build_object('success',true,'week',v_minggu,'detailRows',v_detail_count));
end;
$$;
grant execute on function public.update_absensi_matrix_day(uuid,date,text,text,text) to authenticated;

create or replace function public.get_absensi_rekap(p_user_id uuid)
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
    select distinct to_char(tanggal,'YYYY-MM') bulan from public.attendance_details where user_id=p_user_id
  ) select coalesce(max(bulan),to_char(now() at time zone 'Asia/Jakarta','YYYY-MM')) into v_bulan_ini from months;

  with months as (
    select distinct to_char(tanggal,'YYYY-MM') bulan from public.attendance_details where user_id=p_user_id
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
      (select coalesce(sum(w.total_denda),0)::integer from public.attendance_weekly w where w.user_id=p_user_id and public._minggu_ke_bulan(w.minggu)=mr.bulan) +
      (select coalesce(sum(d.nilai),0)::integer from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=mr.bulan and d.tipe in ('DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL')) total_denda,
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
    'detailLemburPulang',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_PULANG'),'[]'::jsonb),
    'detailLemburMinggu',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_MINGGU'),'[]'::jsonb),
    'detailLemburLibur',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='LEMBUR_LIBUR'),'[]'::jsonb),
    'detailAbsen',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='ABSEN'),'[]'::jsonb),
    'detailDendaSP',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe in ('DENDA_SP','DENDA_ANOMALI')),'[]'::jsonb),
    'detailDendaManual',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='DENDA_MANUAL'),'[]'::jsonb),
    'detailRewardManual',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and to_char(d.tanggal,'YYYY-MM')=p.bulan and d.tipe='REWARD_MANUAL'),'[]'::jsonb),
    'mingguList',coalesce((
      select jsonb_agg(jsonb_build_object(
        'minggu',w.minggu,'hadir',w.hadir,'telat',w.telat,'absen',w.absen,
        'lemburMinggu',w.lembur_minggu,'lemburLibur',w.lembur_libur,'denda',w.total_denda,'status',w.status,'libur','[]'::jsonb,
        'detail',jsonb_build_object(
          'hadir',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and d.tipe='HADIR'),'[]'::jsonb),
          'telat',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and d.tipe='TELAT'),'[]'::jsonb),
          'absen',coalesce((select jsonb_agg(jsonb_build_object('keterangan',d.keterangan,'nilai',d.nilai,'tanggal',d.tanggal,'jam',to_char(d.waktu,'HH24:MI'))) from public.attendance_details d where d.user_id=p_user_id and d.minggu=w.minggu and d.tipe='ABSEN'),'[]'::jsonb)
        )
      ) order by w.minggu)
      from public.attendance_weekly w where w.user_id=p_user_id and public._minggu_ke_bulan(w.minggu)=p.bulan
    ),'[]'::jsonb)
  ) order by p.bulan desc),'[]'::jsonb) into v_result from payload p;

  return jsonb_build_object(
    'bulanIni',v_bulan_ini,
    'liburBulanIni',coalesce((select jsonb_agg(nama order by tanggal) from public.holidays where to_char(tanggal,'YYYY-MM')=v_bulan_ini),'[]'::jsonb),
    'data',coalesce(v_result,'[]'::jsonb)
  );
end;
$$;
grant execute on function public.get_absensi_rekap(uuid) to authenticated;

create or replace function public.get_all_absensi_rekap()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_bulan text; v_last_date date; v_data jsonb;
begin
  if not public.is_payroll_admin() then raise exception 'Akses ditolak' using errcode='42501'; end if;
  select max(to_char(tanggal,'YYYY-MM')), max(tanggal) into v_bulan,v_last_date
  from public.attendance_details where tipe in ('HADIR','ABSEN','TELAT','LEMBUR_MINGGU','LEMBUR_LIBUR','LEMBUR_PULANG');
  if v_bulan is null then return jsonb_build_object('minggu','','data','[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'nama',p.nama,'bagian',p.bagian,
    'hadir',coalesce(a.hadir,0),'telat',coalesce(a.telat,0),'absen',coalesce(a.absen,0),
    'lemburMinggu',coalesce(a.lembur_minggu,0),'lemburLibur',coalesce(a.lembur_libur,0),
    'status',case when coalesce(a.absen,0)>=3 or coalesce(a.telat,0)>=5 then 'MERAH' when coalesce(a.absen,0)>=2 or coalesce(a.telat,0)>=3 then 'KUNING' else 'BAIK' end
  ) order by p.nama),'[]'::jsonb) into v_data
  from public.profiles p
  join lateral (
    select count(*) filter(where tipe='HADIR')::integer hadir,
           count(*) filter(where tipe='TELAT')::integer telat,
           count(*) filter(where tipe='ABSEN')::integer absen,
           count(*) filter(where tipe='LEMBUR_MINGGU')::integer lembur_minggu,
           count(*) filter(where tipe='LEMBUR_LIBUR')::integer lembur_libur
    from public.attendance_details d where d.user_id=p.id and to_char(d.tanggal,'YYYY-MM')=v_bulan
  ) a on (a.hadir+a.telat+a.absen+a.lembur_minggu+a.lembur_libur)>0
  where p.status='AKTIF' and p.bagian not in ('Owner','Finance');
  return jsonb_build_object('minggu',
    (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[split_part(v_bulan,'-',2)::integer] || ' ' || split_part(v_bulan,'-',1) ||
    case when v_last_date is not null then ' (s/d ' || extract(day from v_last_date)::integer || ' ' || (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from v_last_date)::integer] || ')' else '' end,
    'data',coalesce(v_data,'[]'::jsonb));
end;
$$;
grant execute on function public.get_all_absensi_rekap() to authenticated;

create or replace function public.import_attendance_legacy_to_events(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; v_user_id uuid; v_imported integer:=0; v_skipped integer:=0; v_unknown integer:=0; v_sync jsonb;
begin
  if not public.is_payroll_admin() then raise exception 'Akses ditolak' using errcode='42501'; end if;
  if p_bulan_key !~ '^\d{4}-\d{2}$' then return jsonb_build_object('success',false,'msg','Bulan tidak valid.'); end if;
  for r in select * from public.attendance_legacy_raw where to_char(tanggal,'YYYY-MM')=p_bulan_key loop
    select id into v_user_id from public.profiles where status='AKTIF' and lower(trim(nama))=lower(trim(r.nama_text)) limit 1;
    if v_user_id is null then v_unknown:=v_unknown+1; continue; end if;
    if r.jam_masuk is not null then
      if exists(select 1 from public.attendance_events where user_id=v_user_id and tanggal=r.tanggal and tipe='MASUK' and status='DITERIMA') then v_skipped:=v_skipped+1;
      else insert into public.attendance_events(user_id,tanggal,jam,tipe,status,source,catatan) values(v_user_id,r.tanggal,r.jam_masuk,'MASUK','DITERIMA','IMPORT','[FINGERPRINT_IMPORT]'); v_imported:=v_imported+1; end if;
    end if;
    if r.jam_pulang is not null then
      if exists(select 1 from public.attendance_events where user_id=v_user_id and tanggal=r.tanggal and tipe='PULANG' and status='DITERIMA') then v_skipped:=v_skipped+1;
      else insert into public.attendance_events(user_id,tanggal,jam,tipe,status,source,catatan) values(v_user_id,r.tanggal,r.jam_pulang,'PULANG','DITERIMA','IMPORT','[FINGERPRINT_IMPORT]'); v_imported:=v_imported+1; end if;
    end if;
  end loop;
  if v_imported=0 and v_skipped=0 and v_unknown=0 then return jsonb_build_object('success',false,'msg','Belum ada data fingerprint untuk bulan ini.'); end if;
  v_sync:=public.process_absensi_app_to_rekap(p_bulan_key);
  insert into public.audit_logs(actor,action,target,after_data,catatan) values(auth.uid(),'IMPORT_ATTENDANCE_LEGACY_TO_EVENTS',p_bulan_key,jsonb_build_object('imported',v_imported,'skipped',v_skipped,'unknown',v_unknown),'Sumber attendance_legacy_raw');
  return jsonb_build_object('success',coalesce((v_sync->>'success')::boolean,false),'bulan',p_bulan_key,'importedRows',v_imported,'skippedRows',v_skipped,'unknownEmployees',v_unknown,'sync',v_sync,
    'msg','Import selesai: '||v_imported||' tap ditambahkan, '||v_skipped||' duplikat dilewati.');
end;
$$;
grant execute on function public.import_attendance_legacy_to_events(text) to authenticated;

