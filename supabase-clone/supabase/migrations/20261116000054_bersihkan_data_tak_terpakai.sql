-- ============================================================================
-- Bersihkan data yang TIDAK DIPAKAI setelah migrasi data lama — 16 Nov 2026
--
-- Tujuan: tampilan tetap sama dengan aplikasi lama, tetapi data sampah
-- (tidak pernah dibaca layar mana pun) dibuang supaya ringan.
--
-- Yang dibuang (dengan alasan):
--   1) attendance_legacy_raw  -> finger print mentah era aplikasi lama
--      (Mar-Apr 2026). Tidak ada satu layar pun yang membacanya.
--   2) payroll_items nominal 0 -> penanda "Tidak masuk - tanggal" tanpa uang.
--      Jumlah hadir/absen pada slip sudah mewakili; angka slip tidak berubah.
--   3) app_settings ABSENSI_PHOTO_FOLDER_ID -> folder Google Drive lama;
--      foto absensi sekarang disimpan di Supabase Storage.
--   4) legacy_import_batches -> log teknis proses impor (hanya untuk audit
--      pekerjaan migrasi, bukan data bisnis).
--   5) Profil akun uji (tanpa legacy_id, NONAKTIF, bukan Owner) + shift-nya.
--
-- Yang TIDAK dibuang (dipakai layar aplikasi):
--   attendance_events, attendance_details, attendance_weekly,
--   attendance_anomalies, warning_history, leave_requests, late_reviews,
--   notifications, payroll_runs/details/items, kpi_reports, kpi_templates,
--   jobdesks, rules, holidays, announcements, salary_settings, profiles,
--   audit_logs.
--
-- Semua data masih bisa dipulihkan: sumbernya tetap ada di Spreadsheet lama
-- dan di ekspor Temp/hosela-hub-lama.json.
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.bersihkan_data_tak_terpakai()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hasil jsonb := '{}'::jsonb;
  v_n integer;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_email <> 'hoselaofficial28@gmail.com' then
    raise exception 'Akses ditolak: hanya Owner yang boleh membersihkan data' using errcode = '42501';
  end if;

  -- 1) finger print mentah (tidak ada layar yang memakainya)
  delete from public.attendance_legacy_raw where true;
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('attendance_legacy_raw', v_n);

  -- 2) rincian slip bernilai 0 (penanda absen tanpa uang)
  delete from public.payroll_items where nominal = 0;
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('payroll_items_nol', v_n);

  -- 3) pengaturan folder Drive lama (foto sekarang di Supabase Storage)
  delete from public.app_settings where key = 'ABSENSI_PHOTO_FOLDER_ID';
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('app_settings_folder_drive', v_n);

  -- 4) log teknis impor
  delete from public.legacy_import_batches where true;
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('legacy_import_batches', v_n);

  -- 5) profil akun uji + shift-nya (riwayat absensi/gaji milik data lama aman)
  delete from public.employee_shift_assignments
   where user_id in (select id from public.profiles
                      where legacy_id is null and status = 'NONAKTIF' and bagian <> 'Owner');
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('shift_assignment_uji', v_n);

  delete from public.employee_shift_overrides
   where user_id in (select id from public.profiles
                      where legacy_id is null and status = 'NONAKTIF' and bagian <> 'Owner');
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('shift_override_uji', v_n);

  delete from public.profiles
   where legacy_id is null and status = 'NONAKTIF' and bagian <> 'Owner';
  get diagnostics v_n = row_count;
  v_hasil := v_hasil || jsonb_build_object('profil_uji', v_n);

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'BERSIHKAN_DATA_TAK_TERPAKAI', 'beberapa tabel',
          'Bersih-bersih data yang tidak dipakai layar aplikasi: ' || v_hasil::text);

  return jsonb_build_object('success', true, 'dihapus', v_hasil);
end;
$$;

comment on function public.bersihkan_data_tak_terpakai() is
  'Buang data yang tidak dibaca layar mana pun (finger print mentah, item slip bernilai 0, folder Drive lama, log impor, profil akun uji). Owner saja. 16 Nov 2026.';

revoke execute on function public.bersihkan_data_tak_terpakai() from public, anon;
grant execute on function public.bersihkan_data_tak_terpakai() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Laporan: berapa baris yang ada sekarang per tabel yang dipakai layar
-- ---------------------------------------------------------------------------
create or replace function public.ringkasan_data_hub()
returns table(tabel text, jumlah bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_email <> 'hoselaofficial28@gmail.com' then
    raise exception 'Akses ditolak: hanya Owner' using errcode = '42501';
  end if;
  return query execute $q$
    select 'profiles'::text, count(*) from public.profiles
    union all select 'attendance_events', count(*) from public.attendance_events
    union all select 'attendance_details', count(*) from public.attendance_details
    union all select 'attendance_weekly', count(*) from public.attendance_weekly
    union all select 'attendance_anomalies', count(*) from public.attendance_anomalies
    union all select 'attendance_legacy_raw', count(*) from public.attendance_legacy_raw
    union all select 'warning_history', count(*) from public.warning_history
    union all select 'leave_requests', count(*) from public.leave_requests
    union all select 'late_reviews', count(*) from public.late_reviews
    union all select 'notifications', count(*) from public.notifications
    union all select 'payroll_runs', count(*) from public.payroll_runs
    union all select 'payroll_details', count(*) from public.payroll_details
    union all select 'payroll_items', count(*) from public.payroll_items
    union all select 'kpi_reports', count(*) from public.kpi_reports
    union all select 'kpi_templates', count(*) from public.kpi_templates
    union all select 'jobdesks', count(*) from public.jobdesks
    union all select 'rules', count(*) from public.rules
    union all select 'holidays', count(*) from public.holidays
    union all select 'announcements', count(*) from public.announcements
    union all select 'salary_settings', count(*) from public.salary_settings
    union all select 'audit_logs', count(*) from public.audit_logs
    union all select 'legacy_import_batches', count(*) from public.legacy_import_batches
    order by 1
  $q$;
end;
$$;

comment on function public.ringkasan_data_hub() is
  'Jumlah baris per tabel Hosela Hub untuk memeriksa hasil bersih-bersih. Owner saja.';

revoke execute on function public.ringkasan_data_hub() from public, anon;
grant execute on function public.ringkasan_data_hub() to authenticated, service_role;
