-- ============================================================================
-- Menu "Shift Saya": karyawan mengatur shift untuk kemarin / hari ini / besok
-- 18 Nov 2026
--
-- Sebelumnya pilihan shift hanya bisa untuk hari ini/besok dan tidak bisa
-- mengoreksi tanggal yang sudah lewat. Dengan fungsi ini karyawan bisa memilih
-- shift pada tanggal tertentu (maks. 7 hari ke belakang) dan mengosongkannya.
--
-- Aman dijalankan berulang.
-- ============================================================================

begin;

-- Efektif shift milik sendiri untuk rentang tanggal (dipakai layar Shift Saya).
create or replace function public.get_shift_saya_rentang(p_dari date, p_sampai date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_hasil jsonb;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then
    raise exception 'Rentang tanggal tidak valid' using errcode = '22023';
  end if;
  if p_sampai - p_dari > 40 then
    raise exception 'Rentang tanggal terlalu panjang' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'tanggal', d.tgl,
           'shiftId', j.shift_id,
           'shiftName', j.shift_name,
           'jamMasuk', to_char(j.jam_masuk, 'HH24:MI'),
           'jamPulang', to_char(j.jam_pulang, 'HH24:MI'),
           'sumber', j.sumber,
           'pengecualian', exists (
              select 1 from public.employee_shift_overrides o
               where o.user_id = v_uid and o.tanggal = d.tgl
           )
         ) order by d.tgl), '[]'::jsonb)
    into v_hasil
    from generate_series(p_dari, p_sampai, interval '1 day') d(tgl)
    cross join lateral public.get_jadwal_karyawan(v_uid, d.tgl::date) j;

  return v_hasil;
end;
$$;

-- Karyawan memilih shift untuk satu tanggal (kemarin/hari ini/besok/dll).
create or replace function public.pilih_shift_tanggal(p_tanggal date, p_kode text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_prof record;
  v_tpl record;
  v_kode text := nullif(btrim(coalesce(p_kode, '')), '');
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal belum dipilih' using errcode = '22023';
  end if;

  select p.id, p.bagian, p.status, p.boleh_pilih_shift into v_prof
    from public.profiles p where p.id = v_uid;
  if v_prof.id is null then
    raise exception 'Profil tidak ditemukan' using errcode = 'P0002';
  end if;
  if v_prof.status <> 'AKTIF' then
    raise exception 'Akun belum aktif' using errcode = '42501';
  end if;
  if not (v_prof.boleh_pilih_shift or public.is_payroll_admin()) then
    raise exception 'Kamu belum diizinkan memilih shift sendiri. Minta Owner mengaktifkan di Pengaturan Shift.' using errcode = '42501';
  end if;
  if p_tanggal < v_hari_ini - 7 then
    raise exception 'Tanggal terlalu lampau (maksimal 7 hari ke belakang)' using errcode = '22023';
  end if;
  if p_tanggal > v_hari_ini + 30 then
    raise exception 'Tanggal terlalu jauh (maksimal 30 hari ke depan)' using errcode = '22023';
  end if;

  if v_kode is null then
    delete from public.employee_shift_overrides o
     where o.user_id = v_uid and o.tanggal = p_tanggal;
    insert into public.audit_logs(actor, action, target, after_data, catatan)
    values (v_uid, 'HAPUS_SHIFT_TANGGAL', v_uid::text, jsonb_build_object('tanggal', p_tanggal),
            'Karyawan menghapus pengecualian shift tanggal ' || p_tanggal);
    return jsonb_build_object('success', true, 'tanggal', p_tanggal, 'kode', null,
                              'pesan', 'Tanggal dikembalikan mengikuti jadwal.');
  end if;

  select s.id, s.nama, s.jam_masuk, s.jam_pulang into v_tpl
    from public.work_shift_templates s
   where upper(s.kode) = upper(v_kode) and s.aktif
   limit 1;
  if v_tpl.id is null then
    raise exception 'Shift "%" tidak ada. Pilihan: PAGI atau SIANG', v_kode using errcode = '22023';
  end if;

  insert into public.employee_shift_overrides(
    user_id, shift_id, shift_name, jam_masuk, jam_pulang, tanggal, catatan, created_by
  ) values (
    v_uid, v_tpl.id, v_tpl.nama, v_tpl.jam_masuk, v_tpl.jam_pulang, p_tanggal,
    'Dipilih karyawan lewat menu Shift Saya', v_uid
  )
  on conflict (user_id, tanggal) do update
     set shift_id = excluded.shift_id,
         shift_name = excluded.shift_name,
         jam_masuk = excluded.jam_masuk,
         jam_pulang = excluded.jam_pulang,
         catatan = excluded.catatan,
         updated_at = now();

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (v_uid, 'PILIH_SHIFT_TANGGAL', v_uid::text,
          jsonb_build_object('tanggal', p_tanggal, 'shift', v_tpl.nama),
          'Karyawan memilih ' || v_tpl.nama || ' untuk ' || p_tanggal);

  return jsonb_build_object('success', true, 'tanggal', p_tanggal, 'kode', upper(v_kode),
                            'shift', v_tpl.nama, 'jamMasuk', to_char(v_tpl.jam_masuk, 'HH24:MI'),
                            'jamPulang', to_char(v_tpl.jam_pulang, 'HH24:MI'));
end;
$$;

comment on function public.pilih_shift_tanggal(date, text) is
  'Karyawan memilih shift untuk tanggal tertentu (kemarin/hari ini/besok). Kosongkan kode untuk kembali ke jadwal.';
comment on function public.get_shift_saya_rentang(date, date) is
  'Jadwal efektif milik karyawan sendiri per tanggal, termasuk penanda pengecualian.';

revoke execute on function public.pilih_shift_tanggal(date, text) from public, anon;
revoke execute on function public.get_shift_saya_rentang(date, date) from public, anon;
grant execute on function public.pilih_shift_tanggal(date, text) to authenticated, service_role;
grant execute on function public.get_shift_saya_rentang(date, date) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
