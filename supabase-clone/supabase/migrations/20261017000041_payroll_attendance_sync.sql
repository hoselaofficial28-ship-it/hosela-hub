begin;

-- Payroll yang belum terbit harus selalu dapat diselaraskan dengan sumber
-- kehadiran terbaru. Slip yang sudah PUBLISHED tetap menjadi snapshot tetap.
alter table public.payroll_runs
  add column if not exists attendance_synced_at timestamptz,
  add column if not exists attendance_source_hash text;

-- Sidik jari seluruh sumber yang memengaruhi payroll satu bulan. Penghapusan,
-- penambahan, atau perubahan absensi/izin/gaji/libur akan mengubah hash ini.
create or replace function public.payroll_source_hash(p_bulan_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select md5(
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.user_id, x.tanggal, x.tipe, x.id)::text
      from (
        select d.id, d.user_id, d.tanggal, d.waktu, d.tipe,
               coalesce(d.keterangan, '') as keterangan, d.nilai, d.is_generated
        from public.attendance_details d
        where to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
      ) x
    ), '[]') || '|' ||
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.user_id, x.tanggal, x.id)::text
      from (
        select l.id, l.user_id, l.tanggal, l.jenis, l.status,
               coalesce(l.keterangan, '') as keterangan
        from public.leave_requests l
        where to_char(l.tanggal, 'YYYY-MM') = p_bulan_key
      ) x
    ), '[]') || '|' ||
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.id)::text
      from (
        select p.id, p.nama, p.bagian, p.jabatan, p.status, p.gaji_bulanan
        from public.profiles p
        where p.bagian not in ('Owner', 'Finance')
      ) x
    ), '[]') || '|' ||
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.user_id, x.bulan, x.id)::text
      from (
        select s.id, s.user_id, s.bulan, s.gaji_bulanan, s.bonus_kerajinan,
               coalesce(s.catatan, '') as catatan
        from public.salary_settings s
        where s.bulan <= p_bulan_key
      ) x
    ), '[]') || '|' ||
    coalesce((
      select jsonb_agg(to_jsonb(x) order by x.tanggal, x.id)::text
      from (
        select h.id, h.tanggal, h.nama, h.difasilitasi
        from public.holidays h
        where to_char(h.tanggal, 'YYYY-MM') = p_bulan_key
      ) x
    ), '[]')
  );
$$;

revoke execute on function public.payroll_source_hash(text) from public, anon;
grant execute on function public.payroll_source_hash(text) to authenticated, service_role;

create or replace function public.refresh_payroll_from_attendance(p_payroll_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.payroll_runs%rowtype;
  v_detail_id uuid;
  v_adjustment_plus integer;
  v_adjustment_minus integer;
  v_catatan text;
  v_lembur_pulang integer;
  v_hari_kerja integer;
  r record;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menyinkronkan payroll' using errcode = '42501';
  end if;

  select * into v_run
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;

  if v_run.id is null then
    return jsonb_build_object('success', false, 'msg', 'Penggajian tidak ditemukan.');
  end if;
  if v_run.status = 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip sudah diterbitkan. Batalkan penerbitan sebelum menyinkronkan ulang.');
  end if;

  v_hari_kerja := public.calc_hari_kerja_efektif(v_run.bulan);

  for r in select * from public.get_rekap_bulanan_semua(v_run.bulan) loop
    select count(*)::integer into v_lembur_pulang
    from public.attendance_details d
    where d.user_id = r.user_id
      and to_char(d.tanggal, 'YYYY-MM') = v_run.bulan
      and d.tipe = 'LEMBUR_PULANG';

    v_detail_id := null;
    v_adjustment_plus := 0;
    v_adjustment_minus := 0;
    v_catatan := '';

    select pd.id, pd.adjustment_plus, pd.adjustment_minus, pd.catatan_adjustment
      into v_detail_id, v_adjustment_plus, v_adjustment_minus, v_catatan
    from public.payroll_details pd
    where pd.payroll_run_id = v_run.id and pd.user_id = r.user_id;

    if v_detail_id is null then
      insert into public.payroll_details(
        payroll_run_id, user_id, nama, bagian, jabatan, gaji_pokok, hari_kerja,
        hadir, absen, telat, lembur_pulang, lembur_minggu, lembur_libur,
        total_reward, total_denda, bonus_kerajinan, adjustment_plus, adjustment_minus,
        catatan_adjustment, total_gaji, status_slip
      ) values (
        v_run.id, r.user_id, r.nama, r.bagian, r.jabatan, r.gaji_pokok, v_hari_kerja,
        r.hadir, r.absen, r.telat, v_lembur_pulang, r.lembur_minggu, r.lembur_libur,
        r.total_reward, r.total_denda, r.bonus_kerajinan, 0, 0, '',
        public.calc_payroll_total(r.gaji_pokok, r.total_reward, r.bonus_kerajinan, 0, r.total_denda, 0),
        'DRAFT'
      ) returning id into v_detail_id;
    else
      update public.payroll_details
      set nama = r.nama,
          bagian = r.bagian,
          jabatan = r.jabatan,
          gaji_pokok = r.gaji_pokok,
          hari_kerja = v_hari_kerja,
          hadir = r.hadir,
          absen = r.absen,
          telat = r.telat,
          lembur_pulang = v_lembur_pulang,
          lembur_minggu = r.lembur_minggu,
          lembur_libur = r.lembur_libur,
          total_reward = r.total_reward,
          total_denda = r.total_denda,
          bonus_kerajinan = r.bonus_kerajinan,
          total_gaji = public.calc_payroll_total(
            r.gaji_pokok, r.total_reward, r.bonus_kerajinan,
            v_adjustment_plus, r.total_denda, v_adjustment_minus
          ),
          status_slip = 'DRAFT'
      where id = v_detail_id;
    end if;

    -- Item kehadiran dibangun ulang; adjustment manual Finance tetap dipertahankan.
    delete from public.payroll_items
    where payroll_detail_id = v_detail_id
      and tipe not in ('ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS');

    perform public._snapshot_payroll_items(v_detail_id, r.user_id, v_run.bulan, r.bonus_kerajinan);
  end loop;

  -- Karyawan yang sudah tidak aktif/tidak termasuk payroll tidak dibawa ke slip baru.
  delete from public.payroll_details pd
  where pd.payroll_run_id = v_run.id
    and not exists (
      select 1 from public.profiles p
      where p.id = pd.user_id and p.status = 'AKTIF' and p.bagian not in ('Owner', 'Finance')
    );

  update public.payroll_runs
  set status = 'DRAFT',
      dikonfirmasi_oleh = null,
      dikonfirmasi_pada = null,
      attendance_synced_at = clock_timestamp(),
      attendance_source_hash = public.payroll_source_hash(v_run.bulan)
  where id = v_run.id;

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'REFRESH_PAYROLL_ATTENDANCE', v_run.id::text,
          'Snapshot payroll disinkronkan ulang dari catatan kehadiran bulan ' || v_run.bulan);

  return public.get_payroll_run_payload(v_run.id);
end;
$$;

revoke execute on function public.refresh_payroll_from_attendance(uuid) from public, anon;
grant execute on function public.refresh_payroll_from_attendance(uuid) to authenticated, service_role;

-- Payload kini memberi tanda jika sumber kehadiran sudah berubah.
create or replace function public.get_payroll_run_payload(p_payroll_run_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_run public.payroll_runs%rowtype;
  v_data jsonb;
  v_total integer;
  v_source_stale boolean;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat payroll' using errcode = '42501';
  end if;

  select * into v_run from public.payroll_runs where id = p_payroll_run_id;
  if v_run.id is null then
    return jsonb_build_object('success', false, 'msg', 'Payroll tidak ditemukan');
  end if;

  v_source_stale := v_run.attendance_source_hash is distinct from public.payroll_source_hash(v_run.bulan);

  select coalesce(jsonb_agg(row_to_json(x) order by x."nama"), '[]'::jsonb), coalesce(sum(x."totalGaji"), 0)
    into v_data, v_total
  from (
    select
      pd.id as "id", pd.payroll_run_id as "payrollRunId", pd.user_id as "userId",
      pd.nama as "nama", pd.bagian as "bagian", pd.jabatan as "jabatan",
      pd.gaji_pokok as "gajiPokok", pd.hari_kerja as "hariKerja",
      pd.hadir as "hadir", pd.absen as "absen", pd.telat as "telat",
      pd.lembur_pulang as "lemburPulang", pd.lembur_minggu as "lemburMinggu", pd.lembur_libur as "lemburLibur",
      pd.total_reward as "totalReward", pd.total_denda as "totalDenda",
      eff.effective_bonus as "bonusKerajinan",
      eff.effective_adjustment_plus as "adjustmentPlus",
      pd.adjustment_minus as "adjustmentMinus", pd.catatan_adjustment as "catatanAdjustment",
      public.calc_payroll_total(pd.gaji_pokok, pd.total_reward, eff.effective_bonus, eff.effective_adjustment_plus, pd.total_denda, pd.adjustment_minus) as "totalGaji",
      coalesce(pd.status_slip, v_run.status) as "statusSlip"
    from public.payroll_details pd
    cross join lateral public.calc_effective_payroll_bonus(
      pd.bonus_kerajinan,
      (select s.bonus_kerajinan from public.get_effective_salary_setting(pd.user_id, v_run.bulan, pd.gaji_pokok, pd.bonus_kerajinan) s),
      pd.adjustment_plus
    ) eff
    where pd.payroll_run_id = p_payroll_run_id
  ) x;

  return jsonb_build_object(
    'success', true, 'id', v_run.id, 'bulan', v_run.bulan,
    'periodeMulai', v_run.periode_mulai, 'periodeAkhir', v_run.periode_akhir,
    'status', v_run.status, 'dibuatOleh', v_run.dibuat_oleh, 'dibuatPada', v_run.dibuat_pada,
    'dikonfirmasiOleh', v_run.dikonfirmasi_oleh, 'dikonfirmasiPada', v_run.dikonfirmasi_pada,
    'dipublishOleh', v_run.dipublish_oleh, 'dipublishPada', v_run.dipublish_pada,
    'attendanceSyncedAt', v_run.attendance_synced_at,
    'sourceStale', v_source_stale,
    'totalPayroll', v_total, 'data', v_data
  );
end;
$$;

-- Draf baru langsung dibangun melalui satu fungsi sinkronisasi yang sama.
create or replace function public.create_payroll_draft(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run_id uuid;
  v_status text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh membuat draft payroll' using errcode = '42501';
  end if;
  if p_bulan_key is null or p_bulan_key !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('success', false, 'msg', 'Bulan penggajian tidak valid.');
  end if;

  select id, status into v_run_id, v_status from public.payroll_runs where bulan = p_bulan_key;
  if v_run_id is not null then
    if v_status = 'PUBLISHED' then
      return public.get_payroll_run_payload(v_run_id);
    end if;
    return public.refresh_payroll_from_attendance(v_run_id);
  end if;

  insert into public.payroll_runs(bulan, periode_mulai, periode_akhir, status, dibuat_oleh, dibuat_pada)
  values (
    p_bulan_key,
    (p_bulan_key || '-01')::date,
    (date_trunc('month', (p_bulan_key || '-01')::date) + interval '1 month - 1 day')::date,
    'DRAFT', auth.uid(), now()
  ) returning id into v_run_id;

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'CREATE_PAYROLL_DRAFT', p_bulan_key, 'Draf payroll dibuat dari sumber kehadiran terbaru');

  return public.refresh_payroll_from_attendance(v_run_id);
end;
$$;

-- Konfirmasi selalu menyinkronkan ulang terlebih dahulu agar snapshot terkunci
-- dari data terbaru, bukan angka lama yang pernah tersimpan.
create or replace function public.confirm_payroll(p_payroll_run_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh konfirmasi payroll' using errcode = '42501';
  end if;

  select status into v_status from public.payroll_runs where id = p_payroll_run_id for update;
  if v_status is distinct from 'DRAFT' then
    return jsonb_build_object('success', false, 'msg', 'Payroll tidak ditemukan atau bukan status Draf.');
  end if;

  perform public.refresh_payroll_from_attendance(p_payroll_run_id);

  update public.payroll_runs
  set status = 'CONFIRMED', dikonfirmasi_oleh = auth.uid(), dikonfirmasi_pada = now()
  where id = p_payroll_run_id and status = 'DRAFT';

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'CONFIRM_PAYROLL', p_payroll_run_id::text,
          'Payroll dikonfirmasi setelah sinkronisasi kehadiran terbaru');

  return public.get_payroll_run_payload(p_payroll_run_id);
end;
$$;

-- Slip hanya boleh terbit bila sumber kehadiran masih sama dengan saat
-- konfirmasi. Jika berubah, Owner harus sinkronkan dan konfirmasi ulang.
create or replace function public.publish_payroll(p_payroll_run_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run public.payroll_runs%rowtype;
  r record;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh publish payroll' using errcode = '42501';
  end if;

  select * into v_run from public.payroll_runs where id = p_payroll_run_id for update;
  if v_run.id is null or v_run.status <> 'CONFIRMED' then
    return jsonb_build_object('success', false, 'msg', 'Payroll belum dikonfirmasi.');
  end if;
  if v_run.attendance_source_hash is distinct from public.payroll_source_hash(v_run.bulan) then
    return jsonb_build_object(
      'success', false,
      'msg', 'Catatan kehadiran berubah setelah konfirmasi. Sinkronkan ulang lalu konfirmasi kembali sebelum menerbitkan slip.'
    );
  end if;

  update public.payroll_runs
  set status = 'PUBLISHED', dipublish_oleh = auth.uid(), dipublish_pada = now()
  where id = p_payroll_run_id;

  update public.payroll_details set status_slip = 'PUBLISHED' where payroll_run_id = p_payroll_run_id;

  for r in select user_id from public.payroll_details where payroll_run_id = p_payroll_run_id loop
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (r.user_id, 'Slip gaji tersedia', 'Slip gaji sudah tersedia di menu Slip Gaji.', 'INFO', 's-slip-gaji');
  end loop;

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'PUBLISH_PAYROLL', p_payroll_run_id::text,
          'Slip diterbitkan dari snapshot kehadiran yang sudah terverifikasi');

  return public.get_payroll_run_payload(p_payroll_run_id);
end;
$$;

revoke execute on function public.create_payroll_draft(text) from public, anon;
revoke execute on function public.confirm_payroll(uuid) from public, anon;
revoke execute on function public.publish_payroll(uuid) from public, anon;
grant execute on function public.create_payroll_draft(text) to authenticated, service_role;
grant execute on function public.confirm_payroll(uuid) to authenticated, service_role;
grant execute on function public.publish_payroll(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
