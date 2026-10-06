-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin Kelola Gaji (Owner/Finance)
-- ============================================================================
-- Replikasi getSalaryUsers/updateUserSalary/updateSalaryUsersBatch/
-- deactivateSalaryUser (gas/Code.gs:158-169,300-373). Sumber Properties
-- (SALARY_SETTING via PropertiesService) TIDAK direplikasi -- lihat catatan
-- di migration 0010 (write-through dgn sheet, satu-satunya jalur tulis,
-- tidak pernah punya data berbeda dari salary_settings).
--
-- Beda dari aslinya (bukan perubahan hasil bisnis): updateSalaryUsersBatch
-- dibungkus 1 transaksi -- kode lama GAS bisa partial-write kalau item
-- ke-N gagal (item 1..N-1 sudah tersimpan). CLAUDE.md: "operasi multi-baris
-- wajib transaksi."
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Sitasi: getSalaryUsers gas/Code.gs:300-320.
-- ---------------------------------------------------------------------------
create or replace function public.get_salary_users(p_bulan_key text default null)
returns table(
  id uuid, nama text, bagian text, jabatan text, status text,
  gaji_bulanan integer, gaji_bulan_berlaku integer, bonus_kerajinan integer,
  bulan_berlaku text, bulan_setting text, catatan_setting text
)
language plpgsql stable security definer set search_path = public as $$
declare v_bulan text := coalesce(p_bulan_key, to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM'));
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat data gaji' using errcode = '42501';
  end if;

  return query
    select
      p.id, p.nama, p.bagian, p.jabatan, p.status,
      p.gaji_bulanan, s.gaji_bulanan, s.bonus_kerajinan,
      coalesce(s.bulan_setting, v_bulan), s.bulan_setting, s.catatan
    from public.profiles p
    cross join lateral public.get_effective_salary_setting(p.id, v_bulan, p.gaji_bulanan, 150000) s
    where p.status = 'AKTIF' and p.bagian not in ('Owner', 'Finance')
    order by p.nama;
end;
$$;
grant execute on function public.get_salary_users(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: updateUserSalary gas/Code.gs:322-358. Append-only history (insert
-- baris baru, tidak pernah update baris lama).
-- ---------------------------------------------------------------------------
create or replace function public.update_user_salary(
  p_user_id uuid, p_salary integer, p_bulan_key text, p_note text, p_bonus_kerajinan integer
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bulan text := coalesce(p_bulan_key, to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM'));
  v_gaji integer := greatest(0, coalesce(p_salary, 0));
  v_kerajinan integer := greatest(0, coalesce(p_bonus_kerajinan, 150000));
  v_nama text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengubah gaji' using errcode = '42501';
  end if;
  if v_gaji <= 0 then
    return jsonb_build_object('success', false, 'msg', 'Gaji harus lebih dari 0');
  end if;

  select nama into v_nama from public.profiles where id = p_user_id;
  if v_nama is null then
    return jsonb_build_object('success', false, 'msg', 'Karyawan tidak ditemukan');
  end if;

  insert into public.salary_settings(user_id, bulan, gaji_bulanan, bonus_kerajinan, catatan, dibuat_oleh)
    values (p_user_id, v_bulan, v_gaji, v_kerajinan, coalesce(p_note, ''), auth.uid());

  insert into public.audit_logs(actor, action, target, after_data)
    values (auth.uid(), 'UPDATE_USER_SALARY', p_user_id::text,
      jsonb_build_object('bulan', v_bulan, 'gaji', v_gaji, 'bonusKerajinan', v_kerajinan));

  return jsonb_build_object('success', true, 'userId', p_user_id, 'nama', v_nama,
    'bulan', v_bulan, 'gajiBulanan', v_gaji, 'bonusKerajinan', v_kerajinan);
end;
$$;
grant execute on function public.update_user_salary(uuid, integer, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: updateSalaryUsersBatch gas/Code.gs:360-373. SATU transaksi -- kalau
-- satu item gagal (gaji<=0 atau user tidak ada), SEMUA batal (lihat komentar
-- atas, ini perbaikan dari kode lama yang bisa partial-write).
-- ---------------------------------------------------------------------------
create or replace function public.update_salary_users_batch(p_bulan_key text, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bulan text := coalesce(p_bulan_key, to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM'));
  item jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengubah gaji' using errcode = '42501';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('success', false, 'msg', 'Tidak ada data untuk disimpan');
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_result := public.update_user_salary(
      (item->>'userId')::uuid,
      (item->>'salary')::integer,
      coalesce(item->>'bulan', v_bulan),
      item->>'note',
      (item->>'bonusKerajinan')::integer
    );
    if not (v_result->>'success')::boolean then
      raise exception '%', coalesce(v_result->>'msg', 'Gagal simpan salah satu karyawan');
    end if;
    v_results := v_results || jsonb_build_array(v_result);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('success', true, 'bulan', v_bulan, 'saved', v_count, 'results', v_results);
end;
$$;
grant execute on function public.update_salary_users_batch(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: deactivateSalaryUser + nonaktifkanUser gas/Code.gs:158-169,423-426.
-- ---------------------------------------------------------------------------
create or replace function public.deactivate_salary_user(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nama text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menonaktifkan karyawan' using errcode = '42501';
  end if;

  update public.profiles set status = 'NONAKTIF', nonaktif_at = now(), updated_at = now()
    where id = p_user_id
    returning nama into v_nama;
  if v_nama is null then
    return jsonb_build_object('success', false, 'msg', 'Karyawan tidak ditemukan');
  end if;

  insert into public.audit_logs(actor, action, target) values (auth.uid(), 'DEACTIVATE_USER', p_user_id::text);

  return jsonb_build_object('success', true, 'nama', v_nama);
end;
$$;
grant execute on function public.deactivate_salary_user(uuid) to authenticated;
