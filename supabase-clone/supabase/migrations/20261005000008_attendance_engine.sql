-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin Absensi Kamera
-- ============================================================================
-- Replikasi 2 fungsi inti dari app aktif:
--   1) submitAbsensiCamera   (gas/Code.gs:2418-2469) → submit_absensi_camera
--   2) processAbsensiAppToRekap (gas/Code.gs:3214-3451) → process_absensi_app_to_rekap
--
-- Foto fisik ke Google Drive BELUM disambung di sini (upload_status tetap
-- 'PENDING' saat tap diterima) — itu pekerjaan terpisah (Edge Function upload).
--
-- Beda sengaja dari kode lama (tidak mengubah hasil bisnis siapapun):
--  - userId diambil dari auth.uid() (sesi login), BUKAN dari parameter client
--    seperti kode lama — menutup celah "tap atas nama orang lain".
--  - process_absensi_app_to_rekap WAJIB role Owner/Finance/payroll_admin —
--    kode lama tidak punya pengecekan role sama sekali di sini (temuan audit,
--    lihat DECISION-LOG.md baris "Endpoint lama"), CLAUDE.md mewajibkan ini
--    ditambahkan di clone.
--
-- Catatan audit (tidak mengubah apapun, sekadar transparansi): tipe 'ABSEN'
-- manual di ABSENSI_APP lama (gas/Code.gs:3248-3251) ternyata TIDAK mengubah
-- hasil akhir sama sekali dibanding tidak ada baris sama sekali — dead code.
-- Query MIN/MAX di bawah sudah otomatis berperilaku setara tanpa kode khusus.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Jadwal hari: baris PERTAMA (urutan asc) dari work_schedules yang mencakup
-- tanggal tsb yang menang (bukan rentang tersempit/terbaru), fallback
-- 08:00/18:00. Sitasi: getJadwalHariApp_ gas/Code.gs:3009-3017.
-- ---------------------------------------------------------------------------
create or replace function public.get_jadwal_hari(p_tanggal date)
returns table(jam_masuk time, jam_pulang time)
language sql stable as $$
  select coalesce(w.jam_masuk, '08:00'::time), coalesce(w.jam_pulang, '18:00'::time)
  from (select 1) dummy
  left join lateral (
    select ws.jam_masuk, ws.jam_pulang
    from public.work_schedules ws
    where p_tanggal between ws.dari and ws.sampai
    order by ws.urutan asc
    limit 1
  ) w on true;
$$;

-- ---------------------------------------------------------------------------
-- Tap absensi kamera. Sitasi: submitAbsensiCamera gas/Code.gs:2418-2469.
-- Jarak = Haversine persis distanceMeters_ (gas/Code.gs:2375-2385), radius
-- bumi 6.371.000m. Maks 2 tap diterima/hari, tidak boleh 2x tipe yang sama.
-- ---------------------------------------------------------------------------
create or replace function public.submit_absensi_camera(
  p_tipe text, p_lat numeric, p_lng numeric, p_akurasi integer default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_office_lat numeric;
  v_office_lng numeric;
  v_radius integer;
  v_distance numeric;
  v_accepted boolean;
  v_tanggal date;
  v_jam time;
  v_tipe text := upper(coalesce(p_tipe, ''));
  v_accepted_count integer;
  v_same_type_count integer;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_tipe not in ('MASUK', 'PULANG') then v_tipe := 'MASUK'; end if;

  select nullif(value, '')::numeric into v_office_lat from public.app_settings where key = 'OFFICE_LAT';
  select nullif(value, '')::numeric into v_office_lng from public.app_settings where key = 'OFFICE_LNG';
  select coalesce(nullif(value, '')::integer, 120) into v_radius from public.app_settings where key = 'OFFICE_RADIUS_M';
  v_radius := coalesce(v_radius, 120);

  if v_office_lat is null or v_office_lng is null then
    return jsonb_build_object('success', false, 'msg', 'Lokasi kantor belum diset. Isi OFFICE_LAT dan OFFICE_LNG di Pengaturan.');
  end if;
  if p_lat is null or p_lng is null then
    return jsonb_build_object('success', false, 'msg', 'Lokasi tidak valid.');
  end if;

  v_distance := 6371000 * 2 * asin(least(1, sqrt(
    power(sin(radians(p_lat - v_office_lat) / 2), 2) +
    cos(radians(v_office_lat)) * cos(radians(p_lat)) *
    power(sin(radians(p_lng - v_office_lng) / 2), 2)
  )));
  v_accepted := v_distance <= v_radius;

  v_tanggal := (now() at time zone 'Asia/Jakarta')::date;
  v_jam := (now() at time zone 'Asia/Jakarta')::time;

  if v_accepted then
    select count(*), count(*) filter (where tipe = v_tipe)
      into v_accepted_count, v_same_type_count
      from public.attendance_events
      where user_id = v_user_id and tanggal = v_tanggal and status = 'DITERIMA';
    if v_accepted_count >= 2 then
      return jsonb_build_object('success', false, 'status', 'DITOLAK', 'code', 'MAX_TAP_HARIAN', 'msg', 'Absensi ditolak. Hari ini sudah ada 2 tap: masuk dan pulang.');
    end if;
    if v_same_type_count >= 1 then
      return jsonb_build_object('success', false, 'status', 'DITOLAK', 'code', 'DUPLICATE_TAP', 'msg', 'Absensi ' || lower(v_tipe) || ' hari ini sudah tercatat.');
    end if;
  end if;

  insert into public.attendance_events(
    user_id, tanggal, jam, tipe, latitude, longitude, akurasi_meter,
    jarak_kantor_meter, status, source, upload_status, catatan
  ) values (
    v_user_id, v_tanggal, v_jam, v_tipe, p_lat, p_lng, round(coalesce(p_akurasi, 0))::integer,
    round(v_distance)::integer, case when v_accepted then 'DITERIMA' else 'DITOLAK' end, 'CAMERA',
    case when v_accepted then 'PENDING' else null end,
    case when v_accepted then 'Dalam radius kantor; foto belum tersambung ke Drive' else 'Di luar radius kantor' end
  ) returning id into v_id;

  return jsonb_build_object(
    'success', v_accepted, 'id', v_id,
    'status', case when v_accepted then 'DITERIMA' else 'DITOLAK' end,
    'distance', round(v_distance)::integer, 'radius', v_radius,
    'msg', case when v_accepted then 'Absensi diterima' else 'Absensi ditolak karena di luar radius kantor.' end
  );
end;
$$;
grant execute on function public.submit_absensi_camera(text, numeric, numeric, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Proses bulanan: attendance_events (tap mentah) → attendance_details +
-- attendance_weekly (rekap). Sitasi: processAbsensiAppToRekap gas/Code.gs:
-- 3214-3451. Boleh dijalankan ULANG (idempotent) — baris is_generated=true
-- lama dihapus dulu, baris digenerate ulang dari nol.
--
-- PERHATIAN (diwarisi dari kode lama, bukan bug baru): kolom total_denda di
-- attendance_weekly di-REPLACE penuh tiap proses ini jalan. Kalau proses SP
-- bulanan (process_sp_for_month, migration 0005) sudah menambah denda SP ke
-- baris minggu yang sama SEBELUM fungsi ini dijalankan ulang, tambahan itu
-- akan ikut hilang/ter-reset. Kode lama punya risiko identik (ABSENSI_REKAP
-- kolom J di-overwrite penuh juga). Urutan operasional yang benar: proses
-- absensi dulu sampai final bulan itu, baru proses SP di akhir.
-- ---------------------------------------------------------------------------
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
    select p.id, p.gaji_bulanan
    from public.profiles p
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
grant execute on function public.process_absensi_app_to_rekap(text) to authenticated;
