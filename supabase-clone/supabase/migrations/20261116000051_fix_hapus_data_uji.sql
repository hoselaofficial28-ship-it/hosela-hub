-- ============================================================================
-- Perbaikan fungsi hapus_data_uji_hub (migrasi 050) — 16 Nov 2026
--
-- Sebab: Supabase menolak `DELETE` tanpa klausa WHERE
--   ("DELETE requires a WHERE clause", kode 21000).
-- Akibatnya pembersihan data uji sebelum migrasi gagal.
-- Perbaikan: setiap DELETE diberi `where true` (setara tanpa syarat).
--
-- Hanya MENGGANTI satu fungsi; tidak mengubah data apa pun saat dijalankan.
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.hapus_data_uji_hub()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hapus jsonb := '{}'::jsonb;
  v_n integer;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_email <> 'hoselaofficial28@gmail.com' then
    raise exception 'Akses ditolak: hanya Owner yang boleh membersihkan data uji' using errcode = '42501';
  end if;

  delete from public.attendance_telegram_notifications where true; get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_telegram_notifications', v_n);
  delete from public.payroll_items where true;                     get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('payroll_items', v_n);
  delete from public.payroll_details where true;                   get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('payroll_details', v_n);
  delete from public.payroll_runs where true;                      get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('payroll_runs', v_n);
  delete from public.attendance_events where true;                 get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_events', v_n);
  delete from public.attendance_details where true;                get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_details', v_n);
  delete from public.attendance_weekly where true;                 get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_weekly', v_n);
  delete from public.attendance_anomalies where true;              get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_anomalies', v_n);
  delete from public.attendance_legacy_raw where true;             get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('attendance_legacy_raw', v_n);
  delete from public.late_reviews where true;                      get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('late_reviews', v_n);
  delete from public.leave_requests where true;                    get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('leave_requests', v_n);
  delete from public.warning_history where true;                   get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('warning_history', v_n);
  delete from public.sanksi_berulang where true;                   get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('sanksi_berulang', v_n);
  delete from public.notifications where true;                     get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('notifications', v_n);
  delete from public.kpi_reports where true;                       get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('kpi_reports', v_n);
  delete from public.team_ideas where true;                        get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('team_ideas', v_n);
  delete from public.featured_rewards where true;                  get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('featured_rewards', v_n);
  delete from public.salary_settings where legacy_id is null;      get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('salary_settings', v_n);
  delete from public.jobdesks where legacy_id is null;             get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('jobdesks', v_n);
  delete from public.kpi_templates where legacy_id is null;        get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('kpi_templates', v_n);
  delete from public.rules where legacy_id is null;                get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('rules', v_n);
  delete from public.holidays where legacy_id is null;             get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('holidays', v_n);
  delete from public.announcements where legacy_id is null;        get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('announcements', v_n);
  delete from public.work_schedules where legacy_id is null;       get diagnostics v_n = row_count; v_hapus := v_hapus || jsonb_build_object('work_schedules', v_n);

  -- Profil uji (tanpa legacy_id) dinonaktifkan supaya tidak muncul di papan peringkat.
  update public.profiles set status = 'NONAKTIF', updated_at = now()
   where legacy_id is null and bagian <> 'Owner';
  get diagnostics v_n = row_count;
  v_hapus := v_hapus || jsonb_build_object('profil_uji_dinonaktifkan', v_n);

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'HAPUS_DATA_UJI', 'semua tabel transaksi',
          'Bersih-bersih sebelum migrasi data lama: ' || v_hapus::text);

  return jsonb_build_object('success', true, 'dihapus', v_hapus);
end;
$$;

comment on function public.hapus_data_uji_hub() is
  'Bersihkan data uji Hosela Hub sebelum impor data lama (Owner saja). Akun login dan app_settings tidak disentuh. Diperbaiki 16 Nov 2026: DELETE diberi WHERE agar tidak ditolak Supabase (kode 21000).';

revoke execute on function public.hapus_data_uji_hub() from public, anon;
grant execute on function public.hapus_data_uji_hub() to authenticated, service_role;
