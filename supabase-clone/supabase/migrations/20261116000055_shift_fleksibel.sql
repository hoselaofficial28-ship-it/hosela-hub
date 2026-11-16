-- ============================================================================
-- Shift fleksibel — 16 Nov 2026
--
-- Keputusan Ko:
--   1) Shift Siang hari SABTU = 12:00-20:00 (hari lain 14:00-22:00).
--      Shift Pagi tetap 08:00-18:00 setiap hari.
--   2) Karyawan boleh menentukan sendiri dia Shift Pagi atau Shift Siang.
--      Cukup dipilih SEKALI, lalu berlaku terus (tidak kembali ke default
--      besoknya). Kalau mau ganti, tinggal ganti lagi.
--   3) Pilihan dikunci untuk hari ini kalau karyawan sudah absen MASUK hari ini
--      (supaya jam tidak bisa diubah setelah terlambat) — gantinya berlaku besok.
--
-- Aman dijalankan berulang. Tidak menghapus data apa pun.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Aturan jam per hari (mis. Shift Siang khusus Sabtu)
--    hari: 1=Senin ... 7=Minggu (ISO)
-- ---------------------------------------------------------------------------
create table if not exists public.work_shift_day_rules (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.work_shift_templates(id) on delete cascade,
  hari smallint not null check (hari between 1 and 7),
  jam_masuk time not null,
  jam_pulang time not null,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, hari),
  check (jam_pulang > jam_masuk)
);

alter table public.work_shift_day_rules enable row level security;
revoke all on table public.work_shift_day_rules from public, anon, authenticated;
grant all on table public.work_shift_day_rules to service_role;

-- Shift Siang: Sabtu 12:00-20:00
insert into public.work_shift_day_rules(shift_id, hari, jam_masuk, jam_pulang, catatan)
select s.id, 6, '12:00', '20:00', 'Sabtu masuk lebih awal'
  from public.work_shift_templates s
 where s.kode = 'SIANG'
on conflict (shift_id, hari) do update
   set jam_masuk = excluded.jam_masuk,
       jam_pulang = excluded.jam_pulang,
       catatan = excluded.catatan,
       updated_at = now();

-- ---------------------------------------------------------------------------
-- 2) Jadwal karyawan: pengecualian > penempatan > bawaan, lalu aturan per hari
-- ---------------------------------------------------------------------------
create or replace function public.get_jadwal_karyawan(p_user_id uuid, p_tanggal date)
returns table(
  shift_id uuid,
  shift_name text,
  jam_masuk time,
  jam_pulang time,
  sumber text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hari smallint := extract(isodow from p_tanggal)::smallint;
  v_shift_id uuid;
  v_shift_name text;
  v_masuk time;
  v_pulang time;
  v_sumber text;
  v_rule_masuk time;
  v_rule_pulang time;
begin
  -- a) pengecualian satu hari (diatur Owner/Finance)
  select o.shift_id, o.shift_name, o.jam_masuk, o.jam_pulang, 'PENGECUALIAN'::text
    into v_shift_id, v_shift_name, v_masuk, v_pulang, v_sumber
    from public.employee_shift_overrides o
   where o.user_id = p_user_id and o.tanggal = p_tanggal
   order by o.created_at desc
   limit 1;

  -- b) penempatan berkala (termasuk pilihan karyawan sendiri)
  if v_shift_name is null then
    select a.shift_id, a.shift_name, a.jam_masuk, a.jam_pulang, 'PENEMPATAN'::text
      into v_shift_id, v_shift_name, v_masuk, v_pulang, v_sumber
      from public.employee_shift_assignments a
     where a.user_id = p_user_id
       and a.berlaku_mulai <= p_tanggal
       and (a.berlaku_sampai is null or a.berlaku_sampai >= p_tanggal)
     order by a.berlaku_mulai desc, a.created_at desc
     limit 1;
  end if;

  -- c) bawaan: Shift Pagi
  if v_shift_name is null then
    select s.id, s.nama, s.jam_masuk, s.jam_pulang, 'BAWAAN'::text
      into v_shift_id, v_shift_name, v_masuk, v_pulang, v_sumber
      from public.work_shift_templates s
     where s.kode = 'PAGI' and s.aktif
     limit 1;
  end if;

  if v_shift_name is null then
    return;
  end if;

  -- d) aturan jam khusus hari itu (mis. Shift Siang Sabtu 12:00-20:00)
  select d.jam_masuk, d.jam_pulang
    into v_rule_masuk, v_rule_pulang
    from public.work_shift_day_rules d
   where d.shift_id = v_shift_id and d.hari = v_hari;

  return query select v_shift_id, v_shift_name,
    coalesce(v_rule_masuk, v_masuk), coalesce(v_rule_pulang, v_pulang), v_sumber;
end;
$$;

comment on function public.get_jadwal_karyawan(uuid, date) is
  'Jadwal efektif karyawan pada satu tanggal: pengecualian > penempatan (termasuk pilihan karyawan) > bawaan Shift Pagi; lalu disesuaikan aturan jam per hari (mis. Shift Siang Sabtu 12:00-20:00).';

revoke execute on function public.get_jadwal_karyawan(uuid, date) from public, anon;
grant execute on function public.get_jadwal_karyawan(uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) get_shift_saya: data untuk kartu "Shift saya" di layar Absen Kamera
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

  select (p.status = 'AKTIF' and p.bagian not in ('Owner','Finance'))
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

comment on function public.get_shift_saya() is
  'Data kartu "Shift saya" untuk karyawan: shift efektif hari ini, boleh ganti atau tidak (terkunci setelah absen masuk), dan daftar pilihan shift.';

revoke execute on function public.get_shift_saya() from public, anon;
grant execute on function public.get_shift_saya() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) pilih_shift_saya: karyawan memilih Pagi/Siang, berlaku terus sampai diganti
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

  select p.id, p.bagian, p.status into v_prof from public.profiles p where p.id = v_uid;
  if v_prof.id is null then
    raise exception 'Profil tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_prof.bagian in ('Owner','Finance') then
    raise exception 'Owner/Finance tidak memakai pilihan shift sendiri; atur lewat Pengaturan Shift' using errcode = '42501';
  end if;
  if v_prof.status <> 'AKTIF' then
    raise exception 'Akun belum aktif' using errcode = '42501';
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

  -- Kalau sudah absen masuk hari ini, pilihan berlaku BESOK (jam hari ini tidak berubah).
  v_berlaku := case when v_sudah_masuk then v_tgl + 1 else v_tgl end;

  select a.shift_name into v_lama
    from public.employee_shift_assignments a
   where a.user_id = v_uid and (a.berlaku_sampai is null or a.berlaku_sampai >= v_berlaku)
   order by a.berlaku_mulai desc, a.created_at desc
   limit 1;

  -- tutup penempatan yang berjalan supaya tidak tumpang tindih
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

  -- pilihan karyawan mengalahkan pengecualian lama pada tanggal itu
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

comment on function public.pilih_shift_saya(text) is
  'Karyawan memilih shift sendiri (PAGI/SIANG). Berlaku terus sampai diganti; kalau hari ini sudah absen masuk, berlaku besok.';

revoke execute on function public.pilih_shift_saya(text) from public, anon;
grant execute on function public.pilih_shift_saya(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Owner/Finance: atur aturan jam per hari dari aplikasi
-- ---------------------------------------------------------------------------
create or replace function public.simpan_aturan_jam_shift(p_shift_kode text, p_hari smallint, p_masuk time, p_pulang time)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengatur jam shift' using errcode = '42501';
  end if;
  if p_hari < 1 or p_hari > 7 then
    raise exception 'Hari harus 1 (Senin) sampai 7 (Minggu)' using errcode = '22023';
  end if;
  if p_pulang <= p_masuk then
    raise exception 'Jam pulang harus lebih besar dari jam masuk' using errcode = '22023';
  end if;

  select id into v_id from public.work_shift_templates where upper(kode) = upper(p_shift_kode) limit 1;
  if v_id is null then
    raise exception 'Shift % tidak ada', p_shift_kode using errcode = '22023';
  end if;

  insert into public.work_shift_day_rules(shift_id, hari, jam_masuk, jam_pulang, catatan)
  values (v_id, p_hari, p_masuk, p_pulang, 'Diatur Owner')
  on conflict (shift_id, hari) do update
     set jam_masuk = excluded.jam_masuk, jam_pulang = excluded.jam_pulang, updated_at = now();

  return jsonb_build_object('success', true, 'shift', p_shift_kode, 'hari', p_hari,
                            'jamMasuk', to_char(p_masuk,'HH24:MI'), 'jamPulang', to_char(p_pulang,'HH24:MI'));
end;
$$;

revoke execute on function public.simpan_aturan_jam_shift(text, smallint, time, time) from public, anon;
grant execute on function public.simpan_aturan_jam_shift(text, smallint, time, time) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
