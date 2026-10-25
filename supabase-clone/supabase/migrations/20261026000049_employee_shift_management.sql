-- ============================================================================
-- 20261026000049 — Pengaturan shift karyawan yang terhubung ke absensi
-- ============================================================================
-- Shift dipilih oleh Owner/Finance, bukan oleh karyawan. Riwayat jam disimpan
-- sebagai snapshot pada penempatan supaya perubahan template di masa depan
-- tidak mengubah perhitungan bulan lama.

begin;

create table if not exists public.work_shift_templates (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  jam_masuk time not null,
  jam_pulang time not null,
  aktif boolean not null default true,
  urutan integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jam_pulang > jam_masuk)
);

create table if not exists public.employee_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.work_shift_templates(id),
  shift_name text not null,
  jam_masuk time not null,
  jam_pulang time not null,
  berlaku_mulai date not null,
  berlaku_sampai date,
  catatan text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, berlaku_mulai),
  check (berlaku_sampai is null or berlaku_sampai >= berlaku_mulai),
  check (jam_pulang > jam_masuk)
);

create index if not exists employee_shift_assignments_lookup_idx
  on public.employee_shift_assignments(user_id, berlaku_mulai desc, berlaku_sampai);

create table if not exists public.employee_shift_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.work_shift_templates(id),
  shift_name text not null,
  jam_masuk time not null,
  jam_pulang time not null,
  tanggal date not null,
  catatan text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tanggal),
  check (jam_pulang > jam_masuk)
);

alter table public.work_shift_templates enable row level security;
alter table public.employee_shift_assignments enable row level security;
alter table public.employee_shift_overrides enable row level security;

revoke all on table public.work_shift_templates from public, anon, authenticated;
revoke all on table public.employee_shift_assignments from public, anon, authenticated;
revoke all on table public.employee_shift_overrides from public, anon, authenticated;
grant all on table public.work_shift_templates to service_role;
grant all on table public.employee_shift_assignments to service_role;
grant all on table public.employee_shift_overrides to service_role;

insert into public.work_shift_templates(kode, nama, jam_masuk, jam_pulang, aktif, urutan)
values
  ('PAGI', 'Shift Pagi', '08:00', '18:00', true, 10),
  ('SIANG', 'Shift Siang', '14:00', '22:00', true, 20)
on conflict (kode) do update set
  nama = excluded.nama,
  jam_masuk = excluded.jam_masuk,
  jam_pulang = excluded.jam_pulang,
  aktif = true,
  urutan = excluded.urutan,
  updated_at = now();

-- Karyawan yang sudah ada langsung mendapat snapshot Shift Pagi. Dengan ini,
-- mengubah jam template nanti tidak mengubah riwayat absensi mereka.
insert into public.employee_shift_assignments(
  user_id, shift_id, shift_name, jam_masuk, jam_pulang, berlaku_mulai, catatan
)
select p.id, s.id, s.nama, s.jam_masuk, s.jam_pulang,
  least(p.created_at::date, current_date), 'Penempatan awal otomatis'
from public.profiles p
cross join public.work_shift_templates s
where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance') and s.kode = 'PAGI'
  and not exists(select 1 from public.employee_shift_assignments a where a.user_id = p.id)
on conflict (user_id, berlaku_mulai) do nothing;

create or replace function public.assign_default_shift_to_new_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_shift public.work_shift_templates%rowtype;
begin
  if new.bagian in ('Owner','Finance') then return new; end if;
  select * into v_shift from public.work_shift_templates where kode='PAGI' and aktif=true limit 1;
  if v_shift.id is not null then
    insert into public.employee_shift_assignments(
      user_id, shift_id, shift_name, jam_masuk, jam_pulang, berlaku_mulai, catatan
    ) values (
      new.id, v_shift.id, v_shift.nama, v_shift.jam_masuk, v_shift.jam_pulang,
      coalesce(new.created_at::date,current_date), 'Penempatan awal otomatis'
    ) on conflict (user_id, berlaku_mulai) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_default_shift_after_profile on public.profiles;
create trigger assign_default_shift_after_profile
after insert on public.profiles
for each row execute function public.assign_default_shift_to_new_profile();

-- Jadwal efektif seorang karyawan pada satu tanggal.
-- Prioritas: pengecualian 1 hari > penempatan berkala > Shift Pagi bawaan.
create or replace function public.get_jadwal_karyawan(p_user_id uuid, p_tanggal date)
returns table(
  shift_id uuid,
  shift_name text,
  jam_masuk time,
  jam_pulang time,
  sumber text
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select o.shift_id, o.shift_name, o.jam_masuk, o.jam_pulang, 'PENGECUALIAN'::text
    from public.employee_shift_overrides o
    where o.user_id = p_user_id and o.tanggal = p_tanggal
    limit 1;
  if found then return; end if;

  return query
    select a.shift_id, a.shift_name, a.jam_masuk, a.jam_pulang, 'PENEMPATAN'::text
    from public.employee_shift_assignments a
    where a.user_id = p_user_id
      and a.berlaku_mulai <= p_tanggal
      and (a.berlaku_sampai is null or a.berlaku_sampai >= p_tanggal)
    order by a.berlaku_mulai desc, a.created_at desc
    limit 1;
  if found then return; end if;

  return query
    select s.id, s.nama, s.jam_masuk, s.jam_pulang, 'DEFAULT'::text
    from public.work_shift_templates s
    where s.kode = 'PAGI' and s.aktif = true
    limit 1;
  if found then return; end if;

  return query select null::uuid, 'Shift Pagi'::text, '08:00'::time, '18:00'::time, 'DEFAULT'::text;
end;
$$;

create or replace function public.get_shift_management_data(p_tanggal date default current_date)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengelola shift' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'tanggal', p_tanggal,
    'shifts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'kode', s.kode, 'nama', s.nama,
        'jamMasuk', to_char(s.jam_masuk, 'HH24:MI'),
        'jamPulang', to_char(s.jam_pulang, 'HH24:MI'),
        'aktif', s.aktif
      ) order by s.urutan, s.nama)
      from public.work_shift_templates s
    ), '[]'::jsonb),
    'employees', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nama', p.nama, 'bagian', p.bagian, 'jabatan', p.jabatan,
        'shiftId', j.shift_id, 'shiftName', j.shift_name,
        'jamMasuk', to_char(j.jam_masuk, 'HH24:MI'),
        'jamPulang', to_char(j.jam_pulang, 'HH24:MI'),
        'sumber', j.sumber
      ) order by p.bagian, p.nama)
      from public.profiles p
      cross join lateral public.get_jadwal_karyawan(p.id, p_tanggal) j
      where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.save_shift_template(
  p_shift_id uuid,
  p_nama text,
  p_jam_masuk time,
  p_jam_pulang time
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_shift public.work_shift_templates%rowtype;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengelola shift' using errcode = '42501';
  end if;
  if p_shift_id is null or trim(coalesce(p_nama,'')) = '' then
    return jsonb_build_object('success', false, 'msg', 'Nama shift wajib diisi.');
  end if;
  if p_jam_masuk is null or p_jam_pulang is null or p_jam_pulang <= p_jam_masuk then
    return jsonb_build_object('success', false, 'msg', 'Jam pulang harus lebih besar daripada jam masuk.');
  end if;

  update public.work_shift_templates
  set nama = trim(p_nama), jam_masuk = p_jam_masuk, jam_pulang = p_jam_pulang, updated_at = now()
  where id = p_shift_id
  returning * into v_shift;
  if v_shift.id is null then
    return jsonb_build_object('success', false, 'msg', 'Shift tidak ditemukan.');
  end if;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (auth.uid(), 'UPDATE_SHIFT_TEMPLATE', v_shift.id::text,
    jsonb_build_object('nama', v_shift.nama, 'jamMasuk', v_shift.jam_masuk, 'jamPulang', v_shift.jam_pulang),
    'Perubahan template hanya berlaku pada penempatan baru; riwayat lama memakai snapshot.');
  return jsonb_build_object('success', true, 'msg', 'Jam shift berhasil diperbarui.');
end;
$$;

create or replace function public.bulk_assign_employee_shift(
  p_user_ids uuid[],
  p_shift_id uuid,
  p_berlaku_mulai date,
  p_catatan text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_shift public.work_shift_templates%rowtype;
  v_user_id uuid;
  v_count integer := 0;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengelola shift' using errcode = '42501';
  end if;
  if p_berlaku_mulai is null then
    return jsonb_build_object('success', false, 'msg', 'Tanggal mulai wajib dipilih.');
  end if;
  if coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', false, 'msg', 'Pilih minimal satu karyawan.');
  end if;
  select * into v_shift from public.work_shift_templates where id = p_shift_id and aktif = true;
  if v_shift.id is null then
    return jsonb_build_object('success', false, 'msg', 'Shift tidak ditemukan atau sudah nonaktif.');
  end if;

  foreach v_user_id in array p_user_ids loop
    if exists(select 1 from public.profiles where id = v_user_id and status = 'AKTIF' and bagian not in ('Owner','Finance')) then
      update public.employee_shift_assignments
      set berlaku_sampai = p_berlaku_mulai - 1, updated_at = now()
      where user_id = v_user_id
        and berlaku_mulai < p_berlaku_mulai
        and (berlaku_sampai is null or berlaku_sampai >= p_berlaku_mulai);

      insert into public.employee_shift_assignments(
        user_id, shift_id, shift_name, jam_masuk, jam_pulang,
        berlaku_mulai, catatan, created_by
      ) values (
        v_user_id, v_shift.id, v_shift.nama, v_shift.jam_masuk, v_shift.jam_pulang,
        p_berlaku_mulai, nullif(trim(coalesce(p_catatan,'')),''), auth.uid()
      )
      on conflict (user_id, berlaku_mulai) do update set
        shift_id = excluded.shift_id,
        shift_name = excluded.shift_name,
        jam_masuk = excluded.jam_masuk,
        jam_pulang = excluded.jam_pulang,
        catatan = excluded.catatan,
        created_by = auth.uid(),
        updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (auth.uid(), 'BULK_ASSIGN_SHIFT', v_shift.id::text,
    jsonb_build_object('jumlahKaryawan', v_count, 'shift', v_shift.nama, 'berlakuMulai', p_berlaku_mulai),
    nullif(trim(coalesce(p_catatan,'')),''));

  return jsonb_build_object(
    'success', true,
    'count', v_count,
    'msg', v_count || ' karyawan berhasil dipindahkan ke ' || v_shift.nama || '.',
    'reprocessMonth', case when p_berlaku_mulai <= current_date then to_char(p_berlaku_mulai,'YYYY-MM') else null end
  );
end;
$$;

create or replace function public.save_employee_shift_override(
  p_user_id uuid,
  p_shift_id uuid,
  p_tanggal date,
  p_catatan text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_shift public.work_shift_templates%rowtype;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengelola shift' using errcode = '42501';
  end if;
  if p_tanggal is null then return jsonb_build_object('success', false, 'msg', 'Tanggal wajib dipilih.'); end if;
  if not exists(select 1 from public.profiles where id = p_user_id and status = 'AKTIF' and bagian not in ('Owner','Finance')) then
    return jsonb_build_object('success', false, 'msg', 'Karyawan tidak ditemukan.');
  end if;
  select * into v_shift from public.work_shift_templates where id = p_shift_id and aktif = true;
  if v_shift.id is null then return jsonb_build_object('success', false, 'msg', 'Shift tidak ditemukan.'); end if;

  insert into public.employee_shift_overrides(
    user_id, shift_id, shift_name, jam_masuk, jam_pulang, tanggal, catatan, created_by
  ) values (
    p_user_id, v_shift.id, v_shift.nama, v_shift.jam_masuk, v_shift.jam_pulang,
    p_tanggal, nullif(trim(coalesce(p_catatan,'')),''), auth.uid()
  ) on conflict (user_id, tanggal) do update set
    shift_id = excluded.shift_id, shift_name = excluded.shift_name,
    jam_masuk = excluded.jam_masuk, jam_pulang = excluded.jam_pulang,
    catatan = excluded.catatan, created_by = auth.uid(), updated_at = now();

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (auth.uid(), 'SAVE_SHIFT_OVERRIDE', p_user_id::text,
    jsonb_build_object('tanggal', p_tanggal, 'shift', v_shift.nama), nullif(trim(coalesce(p_catatan,'')),''));
  return jsonb_build_object('success', true, 'msg', 'Pengecualian shift berhasil disimpan.',
    'reprocessMonth', case when p_tanggal <= current_date then to_char(p_tanggal,'YYYY-MM') else null end);
end;
$$;

create or replace function public.get_employee_schedule_month(p_bulan text, p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_start date; v_end date; v_result jsonb;
begin
  if p_bulan !~ '^\d{4}-\d{2}$' then raise exception 'Bulan tidak valid'; end if;
  if auth.uid() is null then raise exception 'Harus login' using errcode = '28000'; end if;
  if p_user_id is not null and p_user_id <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses jadwal ditolak' using errcode = '42501';
  end if;
  if p_user_id is null and not public.is_payroll_admin() then
    raise exception 'Akses jadwal tim ditolak' using errcode = '42501';
  end if;
  v_start := (p_bulan || '-01')::date;
  v_end := (v_start + interval '1 month - 1 day')::date;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', p.id, 'tanggal', d.tanggal,
    'shiftId', j.shift_id, 'shiftName', j.shift_name,
    'jamMasuk', to_char(j.jam_masuk,'HH24:MI'),
    'jamPulang', to_char(j.jam_pulang,'HH24:MI'), 'sumber', j.sumber
  ) order by p.id, d.tanggal), '[]'::jsonb)
  into v_result
  from public.profiles p
  cross join generate_series(v_start, v_end, interval '1 day') d(tanggal)
  cross join lateral public.get_jadwal_karyawan(p.id, d.tanggal::date) j
  where p.status = 'AKTIF'
    and ((p_user_id is null and p.bagian not in ('Owner','Finance')) or p.id = p_user_id);
  return v_result;
end;
$$;

-- Terapkan resolver shift ke fungsi perhitungan yang sudah aktif tanpa
-- menggandakan ratusan baris logika payroll di migration ini.
do $patch$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('public.process_absensi_app_to_rekap(text)'::regprocedure) into v_def;
  v_new := replace(v_def, 'public.get_jadwal_hari(v_tanggal)', 'public.get_jadwal_karyawan(r_user.id, v_tanggal)');
  if v_new = v_def then raise exception 'Patch process_absensi_app_to_rekap gagal: pola jadwal tidak ditemukan'; end if;
  execute v_new;

  select pg_get_functiondef('public.update_absensi_matrix_day(uuid,date,text,text,text)'::regprocedure) into v_def;
  v_new := replace(v_def, 'public.get_jadwal_hari(p_tanggal)', 'public.get_jadwal_karyawan(p_user_id, p_tanggal)');
  if v_new = v_def then raise exception 'Patch update_absensi_matrix_day gagal: pola jadwal tidak ditemukan'; end if;
  execute v_new;

  select pg_get_functiondef('public.get_late_reviews(text,text)'::regprocedure) into v_def;
  v_new := replace(v_def, 'public.get_jadwal_hari(d.tanggal)', 'public.get_jadwal_karyawan(d.user_id, d.tanggal)');
  if v_new = v_def then raise exception 'Patch get_late_reviews gagal: pola jadwal tidak ditemukan'; end if;
  execute v_new;
end;
$patch$;

-- Versi shift-aware untuk normalisasi tap anomali sore.
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
  if auth.uid() is null then raise exception 'Harus login' using errcode = '28000'; end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengonfirmasi tap anomali' using errcode = '42501';
  end if;
  if v_status not in ('NORMAL', 'DENDA') then
    return jsonb_build_object('success', false, 'msg', 'Pilihan konfirmasi tidak valid.');
  end if;
  select * into a from public.attendance_anomalies where id = p_anom_id for update;
  if not found then return jsonb_build_object('success', false, 'msg', 'Data anomali tidak ditemukan.'); end if;
  if a.status <> 'MENUNGGU' then return jsonb_build_object('success', false, 'msg', 'Tap anomali ini sudah diproses sebelumnya.'); end if;

  v_tgl := to_char(a.tanggal, 'DD Mon YYYY');
  v_bulan := to_char(a.tanggal, 'YYYY-MM');
  update public.attendance_anomalies set status = v_status where id = a.id;

  if v_status = 'NORMAL' then
    if a.tipe in ('HANYA_1_TAP_SORE', 'TAP_MASUK_SORE') then
      select j.jam_masuk into v_jadwal from public.get_jadwal_karyawan(a.user_id, a.tanggal) j;
      perform public.update_absensi_matrix_day(a.user_id, a.tanggal,
        to_char(coalesce(v_jadwal, '08:00'::time), 'HH24:MI'), null,
        'Normalisasi tap anomali: ' || coalesce(a.tipe, '-'));
    else
      perform public.process_absensi_app_to_rekap(v_bulan);
    end if;
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (a.user_id, 'Tap Anomali Dikonfirmasi Normal',
      'Finance mengonfirmasi tap ' || v_tgl || ' sebagai normal. Tidak ada denda.', 'INFO', 's-notifikasi');
  else
    select count(*) into v_jumlah from public.attendance_details d
    where d.user_id = a.user_id and d.tipe = 'DENDA_ANOMALI' and to_char(d.tanggal, 'YYYY-MM') = v_bulan;
    v_denda := case when coalesce(v_jumlah,0)=0 then 10000 when v_jumlah=1 then 20000 else 50000 end;
    insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
    values (a.user_id, to_char(a.tanggal,'IYYY-"W"IW'), a.tanggal,
      (now() at time zone 'Asia/Jakarta')::time, 'DENDA_ANOMALI',
      'Denda tap anomali: ' || coalesce(a.tipe,'-'), v_denda, false);
    insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (a.user_id, 'Denda Tap Fingerprint',
      'Tap anomali ' || v_tgl || ' dikenakan denda Rp ' || to_char(v_denda,'FM999G999G999') || '.',
      'PERINGATAN', 's-notifikasi');
    v_total := coalesce(v_jumlah,0)+1;
    if v_total >= 4 then
      for r in select id from public.profiles where status='AKTIF' and bagian in ('Owner','Finance') loop
        insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (r.id, 'Tap Anomali Berulang',
          'Karyawan sudah ' || v_total || 'x tap anomali pada bulan ' || v_bulan || '.',
          'PERINGATAN', 's-notifikasi');
      end loop;
    end if;
  end if;
  return jsonb_build_object('success', true, 'status', v_status);
end;
$$;

revoke execute on function public.get_jadwal_karyawan(uuid,date) from public, anon;
revoke execute on function public.get_shift_management_data(date) from public, anon;
revoke execute on function public.save_shift_template(uuid,text,time,time) from public, anon;
revoke execute on function public.bulk_assign_employee_shift(uuid[],uuid,date,text) from public, anon;
revoke execute on function public.save_employee_shift_override(uuid,uuid,date,text) from public, anon;
revoke execute on function public.get_employee_schedule_month(text,uuid) from public, anon;

grant execute on function public.get_jadwal_karyawan(uuid,date) to authenticated, service_role;
grant execute on function public.get_shift_management_data(date) to authenticated, service_role;
grant execute on function public.save_shift_template(uuid,text,time,time) to authenticated, service_role;
grant execute on function public.bulk_assign_employee_shift(uuid[],uuid,date,text) to authenticated, service_role;
grant execute on function public.save_employee_shift_override(uuid,uuid,date,text) to authenticated, service_role;
grant execute on function public.get_employee_schedule_month(text,uuid) to authenticated, service_role;
grant execute on function public.konfirmasi_anomali(uuid,text) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
