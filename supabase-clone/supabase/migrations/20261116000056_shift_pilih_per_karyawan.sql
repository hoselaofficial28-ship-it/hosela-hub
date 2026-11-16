-- ============================================================================
-- Shift fleksibel — bagian 2 (16 Nov 2026)
--
-- Keputusan Ko: TIDAK semua karyawan boleh memilih shift sendiri.
--   Owner/Finance yang menentukan karyawan mana yang boleh (satu saklar per
--   karyawan, bawaan MATI). Karyawan yang dinyalakan melihat kartu "Shift Saya"
--   di layar Absen Kamera; selain itu tidak melihat apa pun.
--
-- Aman dijalankan berulang. Tidak menghapus data.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Saklar per karyawan
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists boleh_pilih_shift boolean not null default false;

comment on column public.profiles.boleh_pilih_shift is
  'Kalau true, karyawan boleh memilih shift sendiri (Pagi/Siang) dari layar Absen Kamera. Diatur Owner/Finance.';

-- ---------------------------------------------------------------------------
-- 2) get_shift_saya: hanya karyawan yang diizinkan
-- ---------------------------------------------------------------------------
create or replace function public.get_shift_saya()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_tgl date := (now() at time zone 'Asia/Jakarta')::date;
  v_hari smallint := extract(isodow from (now() at time zone 'Asia/Jakarta')::date)::smallint;
  v_nama text; v_masuk time; v_pulang time; v_sumber text;
  v_boleh boolean := false;
  v_sudah_masuk boolean := false;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;

  select j.shift_name, j.jam_masuk, j.jam_pulang, j.sumber
    into v_nama, v_masuk, v_pulang, v_sumber
    from public.get_jadwal_karyawan(v_uid, v_tgl) j
   limit 1;

  select (p.status = 'AKTIF' and p.bagian not in ('Owner','Finance') and p.boleh_pilih_shift)
    into v_boleh
    from public.profiles p where p.id = v_uid;

  select exists(
    select 1 from public.attendance_events e
     where e.user_id = v_uid and e.tanggal = v_tgl
       and e.tipe = 'MASUK' and e.status = 'DITERIMA'
  ) into v_sudah_masuk;

  return jsonb_build_object(
    'success', true,
    'tanggal', v_tgl,
    'hari', v_hari,
    'bolehGanti', coalesce(v_boleh, false),
    'terkunci', coalesce(v_sudah_masuk, false),
    'shift', jsonb_build_object(
      'nama', coalesce(v_nama, '-'),
      'jamMasuk', to_char(v_masuk, 'HH24:MI'),
      'jamPulang', to_char(v_pulang, 'HH24:MI'),
      'sumber', coalesce(v_sumber, '-')
    ),
    'pilihan', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'kode', s.kode,
               'nama', s.nama,
               'jamMasuk', to_char(coalesce(d.jam_masuk, s.jam_masuk), 'HH24:MI'),
               'jamPulang', to_char(coalesce(d.jam_pulang, s.jam_pulang), 'HH24:MI'),
               'khususHariIni', d.id is not null
             ) order by s.urutan), '[]'::jsonb)
        from public.work_shift_templates s
        left join public.work_shift_day_rules d on d.shift_id = s.id and d.hari = v_hari
       where s.aktif
    )
  );
end;
$$;

revoke execute on function public.get_shift_saya() from public, anon;
grant execute on function public.get_shift_saya() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) pilih_shift_saya: wajib diizinkan Owner lewat saklar
-- ---------------------------------------------------------------------------
create or replace function public.pilih_shift_saya(p_kode text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_tgl date := (now() at time zone 'Asia/Jakarta')::date;
  v_prof record;
  v_tpl record;
  v_sudah_masuk boolean := false;
  v_berlaku date;
  v_lama text;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;

  select p.id, p.bagian, p.status, p.boleh_pilih_shift into v_prof
    from public.profiles p where p.id = v_uid;
  if v_prof.id is null then
    raise exception 'Profil tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_prof.bagian in ('Owner','Finance') then
    raise exception 'Owner/Finance tidak memakai pilihan shift sendiri; atur lewat Pengaturan Shift' using errcode = '42501';
  end if;
  if v_prof.status <> 'AKTIF' then
    raise exception 'Akun belum aktif' using errcode = '42501';
  end if;
  if not coalesce(v_prof.boleh_pilih_shift, false) then
    raise exception 'Kamu belum diizinkan memilih shift sendiri. Hubungi Owner/Finance.' using errcode = '42501';
  end if;

  select s.id, s.kode, s.nama, s.jam_masuk, s.jam_pulang
    into v_tpl
    from public.work_shift_templates s
   where upper(s.kode) = upper(btrim(coalesce(p_kode, ''))) and s.aktif
   limit 1;
  if v_tpl.id is null then
    raise exception 'Shift "%" tidak ada. Pilihan: PAGI atau SIANG', coalesce(p_kode, '') using errcode = '22023';
  end if;

  select exists(
    select 1 from public.attendance_events e
     where e.user_id = v_uid and e.tanggal = v_tgl
       and e.tipe = 'MASUK' and e.status = 'DITERIMA'
  ) into v_sudah_masuk;

  v_berlaku := case when v_sudah_masuk then v_tgl + 1 else v_tgl end;

  select a.shift_name into v_lama
    from public.employee_shift_assignments a
   where a.user_id = v_uid and (a.berlaku_sampai is null or a.berlaku_sampai >= v_berlaku)
   order by a.berlaku_mulai desc, a.created_at desc
   limit 1;

  update public.employee_shift_assignments a
     set berlaku_sampai = v_berlaku - 1, updated_at = now()
   where a.user_id = v_uid
     and a.berlaku_mulai < v_berlaku
     and (a.berlaku_sampai is null or a.berlaku_sampai >= v_berlaku);

  insert into public.employee_shift_assignments(
    user_id, shift_id, shift_name, jam_masuk, jam_pulang, berlaku_mulai, catatan, created_by
  ) values (
    v_uid, v_tpl.id, v_tpl.nama, v_tpl.jam_masuk, v_tpl.jam_pulang, v_berlaku,
    'Dipilih sendiri oleh karyawan', v_uid
  )
  on conflict (user_id, berlaku_mulai) do update
     set shift_id = excluded.shift_id,
         shift_name = excluded.shift_name,
         jam_masuk = excluded.jam_masuk,
         jam_pulang = excluded.jam_pulang,
         catatan = excluded.catatan,
         updated_at = now();

  delete from public.employee_shift_overrides o
   where o.user_id = v_uid and o.tanggal = v_berlaku;

  insert into public.audit_logs(actor, action, target, before_data, after_data, catatan)
  values (v_uid, 'PILIH_SHIFT_SENDIRI', v_uid::text,
          jsonb_build_object('shift', v_lama),
          jsonb_build_object('shift', v_tpl.nama, 'berlaku_mulai', v_berlaku, 'terkunci', v_sudah_masuk),
          'Karyawan memilih shift sendiri');

  return jsonb_build_object(
    'success', true,
    'shift', v_tpl.nama,
    'kode', v_tpl.kode,
    'berlakuMulai', v_berlaku,
    'berlakuHariIni', not v_sudah_masuk,
    'terkunci', v_sudah_masuk
  );
end;
$$;

revoke execute on function public.pilih_shift_saya(text) from public, anon;
grant execute on function public.pilih_shift_saya(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Owner/Finance: daftar karyawan + nyalakan/matikan saklar
-- ---------------------------------------------------------------------------
create or replace function public.get_karyawan_pilih_shift()
returns table(
  user_id uuid,
  nama text,
  bagian text,
  jabatan text,
  boleh_pilih_shift boolean,
  shift_hari_ini text,
  jam_hari_ini text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tgl date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengatur izin pilih shift' using errcode = '42501';
  end if;

  return query
    select p.id, p.nama, p.bagian, p.jabatan, p.boleh_pilih_shift,
           j.shift_name,
           case when j.jam_masuk is null then null
                else to_char(j.jam_masuk, 'HH24:MI') || ' - ' || to_char(j.jam_pulang, 'HH24:MI') end
      from public.profiles p
      left join lateral public.get_jadwal_karyawan(p.id, v_tgl) j on true
     where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
     order by p.nama;
end;
$$;

revoke execute on function public.get_karyawan_pilih_shift() from public, anon;
grant execute on function public.get_karyawan_pilih_shift() to authenticated, service_role;

create or replace function public.set_boleh_pilih_shift(p_user_id uuid, p_boleh boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_nama text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengubah izin pilih shift' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Karyawan belum dipilih' using errcode = '22023';
  end if;

  select p.nama into v_nama from public.profiles p where p.id = p_user_id;
  if v_nama is null then
    raise exception 'Karyawan tidak ditemukan' using errcode = 'P0002';
  end if;

  update public.profiles
     set boleh_pilih_shift = coalesce(p_boleh, false), updated_at = now()
   where id = p_user_id;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (auth.uid(), 'SET_BOLEH_PILIH_SHIFT', p_user_id::text,
          jsonb_build_object('boleh_pilih_shift', coalesce(p_boleh, false)),
          'Izin memilih shift sendiri: ' || v_nama);

  return jsonb_build_object('success', true, 'user_id', p_user_id,
                            'nama', v_nama, 'boleh_pilih_shift', coalesce(p_boleh, false));
end;
$$;

revoke execute on function public.set_boleh_pilih_shift(uuid, boolean) from public, anon;
grant execute on function public.set_boleh_pilih_shift(uuid, boolean) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
