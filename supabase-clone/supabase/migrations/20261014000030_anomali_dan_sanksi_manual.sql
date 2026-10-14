-- ============================================================================
-- Hosela Hub — Konfirmasi tap anomali + Penghargaan/Denda manual
-- ============================================================================
-- Menyambungkan 2 menu yang sebelumnya belum punya versi Supabase (hanya data
-- contoh): "Kelola Anomali" (konfirmasi tap fingerprint) dan
-- "Penghargaan & Denda" (denda/reward manual).
--
-- Perilaku meniru aplikasi lama, gas/Code.gs:
--   getAnomaliPending   :4205-4230
--   konfirmasiAnomali   :4232-4270
--   getSanksiManual     :4018-4033
--   addSanksiManual     :3954-3993
--   batalSanksiManual   :3995-4016
--
-- Semua fungsi di bawah hanya untuk Owner/Finance (menunya memang menu mereka).
-- Nominal uang integer rupiah. Tanggal bisnis memakai zona Asia/Jakarta.
--
-- Aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Daftar tap anomali yang masih MENUNGGU konfirmasi.
--    Sama seperti kode lama: hanya tanggal LAMPAU (hari ini belum perlu), dan
--    anomali yang harinya sudah lengkap (ada tap masuk + pulang DITERIMA)
--    otomatis dianggap NORMAL tanpa perlu dikonfirmasi manual.
-- ---------------------------------------------------------------------------
create or replace function public.get_anomali_pending()
returns table(id uuid, user_id uuid, nama text, tanggal text, jam text, tipe text, deadline text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat tap anomali' using errcode = '42501';
  end if;

  -- Auto-selesai: harinya sudah ada tap masuk DAN pulang (kode lama: autoResolveAnomaliForDay_)
  update public.attendance_anomalies a
     set status = 'NORMAL'
   where a.status = 'MENUNGGU'
     and a.tanggal < (now() at time zone 'Asia/Jakarta')::date
     and exists (select 1 from public.attendance_events e
                  where e.user_id = a.user_id and e.tanggal = a.tanggal
                    and e.tipe = 'MASUK' and e.status = 'DITERIMA')
     and exists (select 1 from public.attendance_events e
                  where e.user_id = a.user_id and e.tanggal = a.tanggal
                    and e.tipe = 'PULANG' and e.status = 'DITERIMA');

  return query
  select a.id, a.user_id, p.nama,
         to_char(a.tanggal, 'DD Mon YYYY'),
         coalesce(to_char(a.jam, 'HH24:MI'), '-'),
         case a.tipe
           when 'HANYA_1_TAP_SORE' then 'Hanya 1 tap (sore/malam)'
           when 'LUPA_TAP_PULANG' then 'Lupa tap pulang'
           when 'TAP_MASUK_SORE' then 'Tap masuk jam sore'
           else coalesce(a.tipe, '-')
         end,
         coalesce(to_char(a.deadline, 'DD Mon YYYY'), '-')
  from public.attendance_anomalies a
  join public.profiles p on p.id = a.user_id
  where a.status = 'MENUNGGU'
    and a.tanggal < (now() at time zone 'Asia/Jakarta')::date
  order by a.tanggal asc, a.created_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Konfirmasi satu tap anomali.
--    NORMAL : tap dianggap sah. Kalau tipenya tap sore, jam masuk dinormalkan
--             ke jadwal kantor; kalau tidak, bulan itu dihitung ulang.
--    DENDA  : denda bertingkat 1x=Rp10.000, 2x=Rp20.000, 3x ke atas=Rp50.000
--             (sama seperti kode lama), dicatat sebagai DENDA_ANOMALI.
-- ---------------------------------------------------------------------------
create or replace function public.konfirmasi_anomali(p_anom_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status text := upper(coalesce(p_status, ''));
  a public.attendance_anomalies;
  v_jadwal time;
  v_bulan text;
  v_jumlah integer;
  v_denda integer;
  v_total integer;
  v_tgl text;
  r record;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengonfirmasi tap anomali' using errcode = '42501';
  end if;
  if v_status not in ('NORMAL', 'DENDA') then
    return jsonb_build_object('success', false, 'msg', 'Pilihan konfirmasi tidak valid.');
  end if;

  select * into a from public.attendance_anomalies where id = p_anom_id for update;
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Data anomali tidak ditemukan.');
  end if;
  if a.status <> 'MENUNGGU' then
    return jsonb_build_object('success', false, 'msg', 'Tap anomali ini sudah diproses sebelumnya.');
  end if;

  v_tgl := to_char(a.tanggal, 'DD Mon YYYY');
  v_bulan := to_char(a.tanggal, 'YYYY-MM');

  update public.attendance_anomalies set status = v_status where id = a.id;

  if v_status = 'NORMAL' then
    if a.tipe in ('HANYA_1_TAP_SORE', 'TAP_MASUK_SORE') then
      select ws.jam_masuk into v_jadwal
        from public.work_schedules ws
       where a.tanggal between ws.dari and ws.sampai
       order by ws.urutan
       limit 1;
      perform public.update_absensi_matrix_day(
        a.user_id, a.tanggal, to_char(coalesce(v_jadwal, '08:00'::time), 'HH24:MI'), null,
        'Normalisasi tap anomali: ' || coalesce(a.tipe, '-'));
    else
      perform public.process_absensi_app_to_rekap(v_bulan);
    end if;
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (a.user_id, '✅ Tap Anomali Dikonfirmasi Normal',
            'Finance mengonfirmasi tap ' || v_tgl || ' sebagai normal. Tidak ada denda.',
            'INFO', 's-notifikasi');
  else
    select count(*) into v_jumlah from public.attendance_details d
     where d.user_id = a.user_id and d.tipe = 'DENDA_ANOMALI'
       and to_char(d.tanggal, 'YYYY-MM') = v_bulan;
    v_denda := case when coalesce(v_jumlah, 0) = 0 then 10000
                    when v_jumlah = 1 then 20000
                    else 50000 end;

    insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
    values (a.user_id, to_char(a.tanggal, 'IYYY-"W"IW'), a.tanggal,
            (now() at time zone 'Asia/Jakarta')::time, 'DENDA_ANOMALI',
            'Denda tap anomali: ' || coalesce(a.tipe, '-'), v_denda, false);

    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (a.user_id, '💸 Denda Tap Fingerprint',
            'Tap anomali ' || v_tgl || ' dikenakan denda Rp ' || to_char(v_denda, 'FM999G999G999') || '.',
            'PERINGATAN', 's-notifikasi');

    -- Kalau total anomali bulan itu sudah 4x atau lebih, Owner/Finance diberi tahu (kode lama)
    v_total := coalesce(v_jumlah, 0) + 1;
    if v_total >= 4 then
      for r in select id from public.profiles where status = 'AKTIF' and bagian in ('Owner', 'Finance') loop
        insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (r.id, '⚠️ Tap Anomali Berulang',
                'Karyawan dengan ID ' || a.user_id::text || ' sudah ' || v_total || 'x tap anomali pada bulan ' || v_bulan || '.',
                'PERINGATAN', 's-notifikasi');
      end loop;
    end if;
  end if;

  return jsonb_build_object('success', true, 'status', v_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Daftar penghargaan & denda manual terakhir (30 baris terbaru)
-- ---------------------------------------------------------------------------
create or replace function public.get_sanksi_manual()
returns table(id uuid, user_id uuid, nama text, tipe text, keterangan text, nominal integer, tgl text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat daftar penghargaan & denda' using errcode = '42501';
  end if;
  return query
  select d.id, d.user_id, p.nama, d.tipe, coalesce(d.keterangan, ''), d.nilai,
         to_char(d.tanggal, 'DD Mon YYYY') || ' ' || coalesce(to_char(d.waktu, 'HH24:MI'), '')
  from public.attendance_details d
  join public.profiles p on p.id = d.user_id
  where d.tipe in ('DENDA_MANUAL', 'REWARD_MANUAL')
  order by d.created_at desc
  limit 30;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Tambah penghargaan / denda manual
--    p_tipe: DENDA_MANUAL atau REWARD_MANUAL
-- ---------------------------------------------------------------------------
create or replace function public.add_sanksi_manual(
  p_target_user_id uuid, p_tipe text, p_nominal integer, p_keterangan text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tipe text := upper(coalesce(p_tipe, ''));
  v_nominal integer := greatest(0, coalesce(p_nominal, 0));
  v_oleh text;
  v_tanggal date;
  v_waktu time;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menambah penghargaan/denda' using errcode = '42501';
  end if;
  if v_tipe not in ('DENDA_MANUAL', 'REWARD_MANUAL') then
    return jsonb_build_object('success', false, 'msg', 'Jenis harus DENDA_MANUAL atau REWARD_MANUAL.');
  end if;
  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    return jsonb_build_object('success', false, 'msg', 'Karyawan tidak ditemukan.');
  end if;
  if v_nominal <= 0 then
    return jsonb_build_object('success', false, 'msg', 'Nominal harus lebih dari 0.');
  end if;

  select nama into v_oleh from public.profiles where id = auth.uid();
  v_tanggal := (now() at time zone 'Asia/Jakarta')::date;
  v_waktu := (now() at time zone 'Asia/Jakarta')::time;

  insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
  values (p_target_user_id, to_char(v_tanggal, 'IYYY-"W"IW'), v_tanggal, v_waktu, v_tipe,
          coalesce(p_keterangan, '') || ' (oleh ' || coalesce(v_oleh, 'Owner/Finance') || ')',
          v_nominal, false)
  returning id into v_id;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
  values (p_target_user_id,
          case when v_tipe = 'DENDA_MANUAL' then '💸 Penalty Manual Dikenakan' else '🎁 Reward Manual Ditambahkan' end,
          (case when v_tipe = 'DENDA_MANUAL' then '⚠️ Penalty' else '🎁 Reward' end) || ' Rp ' ||
          to_char(v_nominal, 'FM999G999G999') || ' pada ' || to_char(v_tanggal, 'DD Mon YYYY') || ' ' ||
          to_char(v_waktu, 'HH24:MI') || E'.\n📝 ' || coalesce(p_keterangan, ''),
          case when v_tipe = 'DENDA_MANUAL' then 'PERINGATAN' else 'INFO' end, 's-notifikasi');

  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Batalkan penghargaan / denda manual (baris dihapus)
-- ---------------------------------------------------------------------------
create or replace function public.batal_sanksi_manual(p_detail_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.attendance_details;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh membatalkan penghargaan/denda' using errcode = '42501';
  end if;

  select * into d from public.attendance_details
   where id = p_detail_id and tipe in ('DENDA_MANUAL', 'REWARD_MANUAL')
   for update;
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Data penghargaan/denda tidak ditemukan.');
  end if;

  delete from public.attendance_details where id = d.id;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
  values (d.user_id,
          case when d.tipe = 'DENDA_MANUAL' then '✅ Denda Manual Dibatalkan' else '✅ Reward Manual Dibatalkan' end,
          'Sanksi sebesar Rp ' || to_char(coalesce(d.nilai, 0), 'FM999G999G999') || ' telah dibatalkan.',
          'INFO', 's-notifikasi');

  return jsonb_build_object('success', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Izin panggil: hanya untuk pengguna yang sudah login (bukan anon/PUBLIC),
--    sejalan dengan pengetatan privasi di migrasi 20261014000028.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_anomali_pending() from public, anon;
revoke execute on function public.konfirmasi_anomali(uuid, text) from public, anon;
revoke execute on function public.get_sanksi_manual() from public, anon;
revoke execute on function public.add_sanksi_manual(uuid, text, integer, text) from public, anon;
revoke execute on function public.batal_sanksi_manual(uuid) from public, anon;

grant execute on function public.get_anomali_pending() to authenticated, service_role;
grant execute on function public.konfirmasi_anomali(uuid, text) to authenticated, service_role;
grant execute on function public.get_sanksi_manual() to authenticated, service_role;
grant execute on function public.add_sanksi_manual(uuid, text, integer, text) to authenticated, service_role;
grant execute on function public.batal_sanksi_manual(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
