-- ============================================================================
-- Perbaikan import_legacy_rows (migrasi 050) — 16 Nov 2026
--
-- Sebab: banyak kolom di Supabase wajib terisi (NOT NULL) tetapi punya nilai
-- bawaan (mis. created_at default now()). Kalau data lama tidak punya nilai
-- untuk kolom itu, alat impor mengirim NULL sehingga ditolak:
--   "null value in column "created_at" of relation "jobdesks" violates
--    not-null constraint" (kode 23502).
--
-- Perbaikan: untuk kolom wajib yang punya nilai bawaan, NULL diganti nilai
-- bawaan kolom itu sendiri (coalesce). Jadi impor tidak lagi gagal hanya
-- karena tanggal kosong di Spreadsheet lama.
--
-- Hanya MENGGANTI satu fungsi; tidak mengubah data apa pun saat dijalankan.
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.import_legacy_rows(
  p_tabel text,
  p_rows jsonb,
  p_kunci text default 'legacy_id'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_kolom text;
  v_nilai text;
  v_set text;
  v_jumlah integer := 0;
  v_tabel_diizinkan text[] := array[
    'profiles','salary_settings','attendance_events','attendance_details','attendance_weekly',
    'attendance_anomalies','attendance_legacy_raw','warning_history','leave_requests','late_reviews',
    'notifications','payroll_runs','payroll_details','payroll_items','kpi_reports','kpi_templates',
    'jobdesks','rules','holidays','announcements','team_ideas','featured_rewards','work_schedules',
    'audit_logs','app_settings'
  ];
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_email <> 'hoselaofficial28@gmail.com' then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengimpor data lama' using errcode = '42501';
  end if;
  if not (p_tabel = any(v_tabel_diizinkan)) then
    raise exception 'Tabel % tidak diizinkan untuk impor', p_tabel using errcode = '22023';
  end if;
  if p_kunci not in ('legacy_id', 'id', 'key') then
    raise exception 'Kunci impor % tidak didukung', p_kunci using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows harus berupa array JSON' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('success', true, 'tabel', p_tabel, 'jumlah', 0);
  end if;
  if jsonb_array_length(p_rows) > 2000 then
    raise exception 'Maksimal 2000 baris per batch (dikirim % baris)', jsonb_array_length(p_rows) using errcode = '22023';
  end if;

  -- Kolom yang diisi (semua kolom, kecuali `id` — kecuali profiles yang memakai
  -- id dari auth.users — dan kecuali kolom generated).
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_kolom
    from information_schema.columns
   where table_schema = 'public'
     and table_name = p_tabel
     and column_name <> 'id'
     and is_generated = 'NEVER';

  -- Ekspresi nilai: kolom wajib yang punya nilai bawaan -> NULL diganti bawaan.
  select string_agg(
           case when is_nullable = 'NO' and column_default is not null
                then format('coalesce(%1$I, %2$s)', column_name, column_default)
                else quote_ident(column_name) end, ', ' order by ordinal_position)
    into v_nilai
    from information_schema.columns
   where table_schema = 'public'
     and table_name = p_tabel
     and column_name <> 'id'
     and is_generated = 'NEVER';

  -- Daftar kolom untuk UPDATE (semua kecuali kunci impor).
  select string_agg(
           case when is_nullable = 'NO' and column_default is not null
                then format('%1$I = coalesce(excluded.%1$I, %2$s)', column_name, column_default)
                else format('%1$I = excluded.%1$I', column_name) end, ', ' order by ordinal_position)
    into v_set
    from information_schema.columns
   where table_schema = 'public'
     and table_name = p_tabel
     and column_name <> 'id'
     and column_name <> p_kunci
     and is_generated = 'NEVER';

  if p_tabel = 'profiles' then
    v_kolom := 'id, ' || v_kolom;
    v_nilai := 'id, ' || v_nilai;
  end if;

  if v_set is null then
    v_set := quote_ident(p_kunci) || ' = excluded.' || quote_ident(p_kunci);
  end if;

  execute format(
    'insert into public.%1$I (%2$s) select %3$s from jsonb_populate_recordset(null::public.%1$I, $1) on conflict (%4$s) do update set %5$s',
    p_tabel, v_kolom, v_nilai, quote_ident(p_kunci), v_set
  ) using p_rows;

  get diagnostics v_jumlah = row_count;

  insert into public.legacy_import_batches(tabel, kunci, jumlah, aktor, catatan)
  values (p_tabel, p_kunci, v_jumlah, auth.uid(), 'import_legacy_rows');

  return jsonb_build_object('success', true, 'tabel', p_tabel, 'kunci', p_kunci, 'jumlah', v_jumlah);
end;
$$;

comment on function public.import_legacy_rows(text, jsonb, text) is
  'Impor batch data Hosela Hub lama (GAS/Sheets) ke tabel Supabase. Upsert berdasarkan legacy_id -> aman diulang. Nilai kosong pada kolom wajib memakai nilai bawaan kolom (perbaikan 16 Nov 2026). Hanya Owner.';

revoke execute on function public.import_legacy_rows(text, jsonb, text) from public, anon;
grant execute on function public.import_legacy_rows(text, jsonb, text) to authenticated, service_role;
