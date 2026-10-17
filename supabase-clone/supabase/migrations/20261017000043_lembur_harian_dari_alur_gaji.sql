-- 20261017000043_lembur_harian_dari_alur_gaji.sql
-- PERBAIKAN: lembur hari Minggu & hari libur selalu bernilai Rp 0.
--
-- Sebab: mesin absensi membaca gaji dari public.profiles.gaji_bulanan, padahal kolom itu
-- tidak pernah diisi (gaji karyawan disimpan di public.salary_settings / menu Alur Gaji).
-- Akibatnya gaji harian = 0, dan nilai 0 itu ikut dibekukan ke attendance_details.nilai.
-- Rumus tidak berubah: lembur Minggu/libur = 1 x gaji harian
-- (gaji bulanan / hari kerja efektif), sama seperti aplikasi GAS lama (gas/Code.gs:1233,1240).
--
-- Isi migrasi:
--   1) process_absensi_app_to_rekap  -> gaji dibaca dari Alur Gaji.
--   2) get_rekap_bulanan_semua       -> lembur Minggu/libur yang masih 0 dihitung ulang
--                                       saat rekap/bayroll dibentuk (tanpa proses ulang absensi).
--   3) _snapshot_payroll_items       -> rincian slip (payroll_items) ikut benar.
-- Aman dijalankan berkali-kali (create or replace).

begin;

create or replace function public.process_absensi_app_to_rekap(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_year integer;
  v_month integer;
  v_bulan_start date;
  v_bulan_end date;
  v_total_hari integer;
  v_jumlah_minggu integer;
  v_holiday_count integer;
  v_hari_kerja_efektif integer;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_is_current_month boolean;
  v_cutoff_day integer;
  v_detail_count integer := 0;
  v_rekap_count integer := 0;
  v_accepted_rows integer;
  r_user record;
  v_day integer;
  v_tanggal date;
  v_minggu text;
  v_is_sunday boolean;
  v_is_holiday boolean;
  v_masuk time;
  v_pulang time;
  v_gaji_harian integer;
  v_jadwal record;
  v_menit_masuk integer;
  v_menit_wajib integer;
  v_menit_telat integer;
  v_denda integer;
  v_menit_pulang integer;
  v_menit_normal integer;
  v_selisih integer;
  v_lembur record;
  v_has_pending_anomaly boolean;
begin
  if not (public.is_owner() or public.is_finance() or public.is_payroll_admin()) then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses rekap absensi' using errcode = '42501';
  end if;

  if p_bulan_key !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('success', false, 'msg', 'Bulan tidak valid.');
  end if;
  v_year := split_part(p_bulan_key, '-', 1)::integer;
  v_month := split_part(p_bulan_key, '-', 2)::integer;
  v_bulan_start := make_date(v_year, v_month, 1);
  v_bulan_end := (v_bulan_start + interval '1 month - 1 day')::date;
  v_total_hari := extract(day from v_bulan_end)::integer;

  select count(*) into v_accepted_rows from public.attendance_events
    where status = 'DITERIMA' and tanggal between v_bulan_start and v_bulan_end;
  if v_accepted_rows = 0 then
    return jsonb_build_object('success', false, 'msg', 'Belum ada data absensi kamera diterima untuk bulan ini.');
  end if;

  select count(*) into v_jumlah_minggu from generate_series(v_bulan_start, v_bulan_end, interval '1 day') d
    where extract(dow from d) = 0;

  select count(*) into v_holiday_count from public.holidays
    where difasilitasi = true and tanggal between v_bulan_start and v_bulan_end;

  v_hari_kerja_efektif := greatest(1, v_total_hari - v_jumlah_minggu - v_holiday_count);

  v_is_current_month := to_char(v_today, 'YYYY-MM') = p_bulan_key;
  v_cutoff_day := case when v_is_current_month then extract(day from v_today)::integer else v_total_hari end;

  delete from public.attendance_details
    where is_generated = true and tanggal between v_bulan_start and v_bulan_end;

  create temporary table if not exists _touched_weeks (
    user_id uuid, minggu text, primary key (user_id, minggu)
  ) on commit drop;
  delete from _touched_weeks where true;

  for r_user in
    select p.id, coalesce(s.gaji_bulanan, p.gaji_bulanan, 0) as gaji_bulanan
   from public.profiles p
   cross join lateral public.get_effective_salary_setting(p.id, p_bulan_key, coalesce(p.gaji_bulanan, 0), 150000) s
   where p.status = 'AKTIF' and p.bagian not in ('Owner', 'Finance')
  loop
    for v_day in 1..v_cutoff_day loop
      v_tanggal := make_date(v_year, v_month, v_day);
      v_minggu := to_char(v_tanggal, 'IYYY-"W"IW');
      v_is_sunday := extract(dow from v_tanggal) = 0;
      v_is_holiday := exists(select 1 from public.holidays where difasilitasi = true and tanggal = v_tanggal);
      v_gaji_harian := public.calc_gaji_harian(r_user.gaji_bulanan, v_hari_kerja_efektif);

      insert into public.attendance_weekly(user_id, minggu, status)
        values (r_user.id, v_minggu, 'BAIK')
        on conflict (user_id, minggu) do nothing;
      insert into _touched_weeks values (r_user.id, v_minggu) on conflict do nothing;

      select min(jam) filter (where tipe = 'MASUK'), max(jam) filter (where tipe = 'PULANG')
        into v_masuk, v_pulang
        from public.attendance_events
        where user_id = r_user.id and tanggal = v_tanggal and status = 'DITERIMA';

      if v_is_sunday or v_is_holiday then
        if v_masuk is not null then
          insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai)
            values (r_user.id, v_minggu, v_tanggal, v_masuk,
              case when v_is_sunday then 'LEMBUR_MINGGU' else 'LEMBUR_LIBUR' end,
              'Masuk hari ' || (case when v_is_sunday then 'Minggu' else 'libur' end), v_gaji_harian);
          v_detail_count := v_detail_count + 1;
          update public.attendance_weekly set
            lembur_minggu = lembur_minggu + (case when v_is_sunday then 1 else 0 end),
            lembur_libur = lembur_libur + (case when v_is_sunday then 0 else 1 end),
            updated_at = now()
            where user_id = r_user.id and minggu = v_minggu;
        end if;
        continue;
      end if;

      if v_masuk is null then
        v_has_pending_anomaly := exists(
          select 1 from public.attendance_anomalies
          where user_id = r_user.id and tanggal = v_tanggal and status = 'MENUNGGU' and tanggal < v_today
        );
        if v_has_pending_anomaly then
          insert into public.attendance_details(user_id, minggu, tanggal, tipe, keterangan, nilai)
            values (r_user.id, v_minggu, v_tanggal, 'ANOMALI_PENDING', 'Menunggu konfirmasi tap anomali', 0);
          v_detail_count := v_detail_count + 1;
          continue;
        end if;
        if not v_is_current_month or v_day < v_cutoff_day then
          insert into public.attendance_details(user_id, minggu, tanggal, tipe, keterangan, nilai)
            values (r_user.id, v_minggu, v_tanggal, 'ABSEN', 'Tidak ada tap masuk', 0);
          v_detail_count := v_detail_count + 1;
          update public.attendance_weekly set absen = absen + 1, updated_at = now()
            where user_id = r_user.id and minggu = v_minggu;
        end if;
        continue;
      end if;

      insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai)
        values (r_user.id, v_minggu, v_tanggal, v_masuk, 'HADIR', 'Hadir, masuk ' || v_masuk::text, 0);
      v_detail_count := v_detail_count + 1;
      update public.attendance_weekly set hadir = hadir + 1, updated_at = now()
        where user_id = r_user.id and minggu = v_minggu;

      select * into v_jadwal from public.get_jadwal_hari(v_tanggal);
      v_menit_masuk := extract(hour from v_masuk)::integer * 60 + extract(minute from v_masuk)::integer;
      v_menit_wajib := extract(hour from v_jadwal.jam_masuk)::integer * 60 + extract(minute from v_jadwal.jam_masuk)::integer;
      if v_menit_masuk > v_menit_wajib then
        v_menit_telat := v_menit_masuk - v_menit_wajib;
        v_denda := public.calc_denda_telat(v_menit_telat);
        insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai)
          values (r_user.id, v_minggu, v_tanggal, v_masuk, 'TELAT', 'Masuk ' || v_masuk::text || ', telat ' || v_menit_telat || ' menit', v_denda);
        v_detail_count := v_detail_count + 1;
        update public.attendance_weekly set telat = telat + 1, total_denda = total_denda + v_denda, updated_at = now()
          where user_id = r_user.id and minggu = v_minggu;
      end if;

      if v_pulang is not null then
        v_menit_pulang := extract(hour from v_pulang)::integer * 60 + extract(minute from v_pulang)::integer;
        v_menit_normal := extract(hour from v_jadwal.jam_pulang)::integer * 60 + extract(minute from v_jadwal.jam_pulang)::integer;
        v_selisih := v_menit_pulang - v_menit_normal;
        select * into v_lembur from public.calc_lembur_pulang(v_selisih);
        if v_lembur.reward > 0 then
          insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai)
            values (r_user.id, v_minggu, v_tanggal, v_pulang, 'LEMBUR_PULANG',
              'Pulang ' || v_pulang::text || ', lembur ' || (v_lembur.lembur_menit / 60.0) || ' jam', v_lembur.reward);
          v_detail_count := v_detail_count + 1;
        end if;
      end if;
    end loop;
  end loop;

  update public.attendance_weekly w set status = public.calc_status_mingguan(w.absen, w.telat)
    from _touched_weeks t
    where w.user_id = t.user_id and w.minggu = t.minggu;
  select count(*) into v_rekap_count from _touched_weeks;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
    values (auth.uid(), 'PROCESS_ABSENSI_APP_TO_REKAP', p_bulan_key,
      jsonb_build_object('detail', v_detail_count, 'rekap', v_rekap_count),
      'Sumber attendance_events (CAMERA)');

  return jsonb_build_object('success', true, 'bulan', p_bulan_key, 'acceptedRows', v_accepted_rows,
    'detailRows', v_detail_count, 'rekapRows', v_rekap_count, 'msg', 'Rekap absensi kamera berhasil diproses.');
end;
$$;

create or replace function public.get_rekap_bulanan_semua(p_bulan_key text)
returns table(
  user_id uuid, nama text, bagian text, jabatan text,
  hadir integer, telat integer, absen integer, lembur_minggu integer, lembur_libur integer,
  bintang smallint, skor smallint,
  total_denda integer, total_reward integer, bonus_kerajinan integer,
  gaji_pokok integer, gaji_harian integer
)
language plpgsql stable security definer set search_path = public as $$
declare v_hari_kerja integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat rekap payroll' using errcode = '42501';
  end if;
  v_hari_kerja := public.calc_hari_kerja_efektif(p_bulan_key);

  return query
    select
      p.id, p.nama, p.bagian, p.jabatan,
      coalesce(w_agg.hadir, 0)::integer, coalesce(w_agg.telat, 0)::integer, coalesce(w_agg.absen, 0)::integer,
      coalesce(w_agg.lembur_minggu, 0)::integer, coalesce(w_agg.lembur_libur, 0)::integer,
      p.bintang, p.skor,
      public.get_total_denda_bulan(p.id, p_bulan_key),
      coalesce(d_agg.total_reward, 0)::integer,
      public.bonus_kerajinan_efektif(p.id, p_bulan_key, coalesce(w_agg.absen, 0)::integer, s.bonus_kerajinan),
      -- KEPUTUSAN KO: hari tidak masuk tidak dapat upah.
      -- gaji pokok = gaji bulanan - (gaji harian x jumlah hari tidak masuk)
      greatest(0, s.gaji_bulanan - (public.calc_gaji_harian(s.gaji_bulanan, v_hari_kerja) * coalesce(w_agg.absen, 0)::integer)),
      public.calc_gaji_harian(s.gaji_bulanan, v_hari_kerja)
    from public.profiles p
    cross join lateral public.get_effective_salary_setting(p.id, p_bulan_key, p.gaji_bulanan, 150000) s
    left join lateral (
      select
        count(*) filter (where d.tipe = 'HADIR') as hadir,
        count(*) filter (where d.tipe = 'TELAT') as telat,
        count(*) filter (where d.tipe = 'ABSEN') as absen,
        count(*) filter (where d.tipe = 'LEMBUR_MINGGU') as lembur_minggu,
        count(*) filter (where d.tipe = 'LEMBUR_LIBUR') as lembur_libur
      from public.attendance_details d
      where d.user_id = p.id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
    ) w_agg on true
    left join lateral (
      select sum(
       case
         when d.tipe in ('LEMBUR_MINGGU','LEMBUR_LIBUR') and coalesce(d.nilai, 0) <= 0
           then public.calc_gaji_harian(s.gaji_bulanan, v_hari_kerja)
         else coalesce(d.nilai, 0)
       end
     ) as total_reward
   from public.attendance_details d
   where d.user_id = p.id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
   and d.tipe in ('LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','REWARD_MANUAL')
    ) d_agg on true
    where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
    order by p.nama;
end;
$$;

create or replace function public._snapshot_payroll_items(p_detail_id uuid, p_user_id uuid, p_bulan_key text, p_bonus_kerajinan integer)
returns void
language plpgsql security definer set search_path = public as $$
declare
 v_gaji integer;
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
end;
$$;

grant execute on function public.process_absensi_app_to_rekap(text) to authenticated;
grant execute on function public.get_rekap_bulanan_semua(text) to authenticated;
grant execute on function public._snapshot_payroll_items(uuid, uuid, text, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
