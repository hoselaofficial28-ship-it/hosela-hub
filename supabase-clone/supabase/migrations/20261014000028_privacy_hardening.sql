-- ============================================================================
-- Hosela Hub — Pengetatan privasi data karyawan (permintaan Ko, 14 Okt 2026)
-- ============================================================================
-- ATURAN YANG DIMINTA KO:
--   Satu karyawan HANYA boleh melihat datanya sendiri. Tidak boleh saling lihat
--   absensi, izin, denda, bintang, apalagi gaji/slip.
--   Owner & Finance tetap melihat semua (memang tugasnya: menyetujui izin,
--   memproses absensi, dan payroll).
--
-- HASIL PEMERIKSAAN (dibuktikan dengan memanggil REST API Supabase memakai anon
-- key publik yang memang tertanam di aplikasi, TANPA login sama sekali):
--   - get_effective_salary_setting -> MENGEMBALIKAN GAJI ASLI karyawan
--     (contoh nyata: Rp 2.600.000 + bonus kerajinan Rp 200.000).
--   - get_total_denda_bulan, hitung_bintang -> bisa dipanggil untuk karyawan lain.
--   - get_papan_peringkat -> daftar nama/jabatan/skor karyawan tanpa login.
--   - _tambah_denda_absen (fungsi internal) -> bisa dipanggil dari luar.
--   - get_payroll_detail / get_payroll_employee_slip / ..._detail / get_absensi_rekap
--     -> penjagaan memakai pola "p_user_id <> auth.uid()". Saat BELUM login,
--     auth.uid() = NULL sehingga perbandingannya NULL dan penjagaan tidak aktif.
--
-- YANG SUDAH BENAR (tidak diubah): RLS tabel (profiles, attendance_*, leave_requests,
-- kpi_reports, notifications, salary_settings, payroll_*) sudah membatasi karyawan
-- hanya ke barisnya sendiri; get_all_users, get_salary_users, get_rekap_bulanan_semua,
-- get_absensi_rekap, update_absensi_matrix_day, get_owner_jobdesks sudah menolak
-- non-admin.
--
-- Migrasi ini AMAN dijalankan berulang (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tambal penjagaan "harus login" yang bocor NULL
-- ---------------------------------------------------------------------------

-- get_payroll_detail: hanya menambah penjagaan login, isi fungsi tidak diubah.
create or replace function public.get_payroll_detail(p_payroll_detail_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_detail record;
  v_run public.payroll_runs%rowtype;
  v_eff record;
  v_items jsonb;
  v_detail_json jsonb;
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  select pd.* into v_detail from public.payroll_details pd where pd.id = p_payroll_detail_id;
  if v_detail.id is null then
    return jsonb_build_object('success', false, 'msg', 'Detail payroll tidak ditemukan');
  end if;
  select * into v_run from public.payroll_runs where id = v_detail.payroll_run_id;

  if not public.is_payroll_admin() and v_detail.user_id <> auth.uid() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  select * into v_eff from public.calc_effective_payroll_bonus(
    v_detail.bonus_kerajinan,
    (select s.bonus_kerajinan from public.get_effective_salary_setting(v_detail.user_id, v_run.bulan, v_detail.gaji_pokok, v_detail.bonus_kerajinan) s),
    v_detail.adjustment_plus
  );

  v_detail_json := jsonb_build_object(
    'id', v_detail.id, 'payrollRunId', v_detail.payroll_run_id, 'userId', v_detail.user_id,
    'nama', v_detail.nama, 'bagian', v_detail.bagian, 'jabatan', v_detail.jabatan,
    'gajiPokok', v_detail.gaji_pokok, 'hariKerja', v_detail.hari_kerja,
    'hadir', v_detail.hadir, 'absen', v_detail.absen, 'telat', v_detail.telat,
    'lemburPulang', v_detail.lembur_pulang, 'lemburMinggu', v_detail.lembur_minggu, 'lemburLibur', v_detail.lembur_libur,
    'totalReward', v_detail.total_reward, 'totalDenda', v_detail.total_denda,
    'bonusKerajinanAwal', v_detail.bonus_kerajinan, 'bonusKerajinan', v_eff.effective_bonus,
    'adjustmentPlusAwal', v_detail.adjustment_plus, 'adjustmentPlus', v_eff.effective_adjustment_plus,
    'adjustmentMinus', v_detail.adjustment_minus, 'catatanAdjustment', v_detail.catatan_adjustment,
    'kerajinanAdjustmentAbsorbed', v_eff.absorbed, 'kerajinanAdjustmentAbsorbedAmount', v_eff.absorbed_amount,
    'totalGaji', public.calc_payroll_total(v_detail.gaji_pokok, v_detail.total_reward, v_eff.effective_bonus, v_eff.effective_adjustment_plus, v_detail.total_denda, v_detail.adjustment_minus),
    'statusSlip', coalesce(v_detail.status_slip, v_run.status), 'bulan', v_run.bulan, 'dipublishPada', v_run.dipublish_pada
  );

  select coalesce(jsonb_agg(row_to_json(i)), '[]'::jsonb) into v_items
    from (select id, tipe, tanggal, keterangan, nominal from public.payroll_items where payroll_detail_id = p_payroll_detail_id) i;

  return jsonb_build_object('success', true, 'detail', v_detail_json, 'items', v_items);
end;
$$;

-- get_payroll_employee_slip: hanya menambah penjagaan login, isi fungsi tidak diubah.
create or replace function public.get_payroll_employee_slip(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user_id, auth.uid()); v_data jsonb;
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_uid <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_to_json(x) order by x."bulan" desc), '[]'::jsonb) into v_data
  from (
    select pr.id as "payrollRunId", pr.bulan as "bulan", pr.dipublish_pada as "dipublishPada",
      pd.id as "id",
      eff.effective_bonus as "bonusKerajinan", pd.total_reward as "totalReward", pd.total_denda as "totalDenda",
      public.calc_payroll_total(pd.gaji_pokok, pd.total_reward, eff.effective_bonus, eff.effective_adjustment_plus, pd.total_denda, pd.adjustment_minus) as "totalGaji"
    from public.payroll_details pd
    join public.payroll_runs pr on pr.id = pd.payroll_run_id and pr.status = 'PUBLISHED'
    cross join lateral public.calc_effective_payroll_bonus(
      pd.bonus_kerajinan,
      (select s.bonus_kerajinan from public.get_effective_salary_setting(pd.user_id, pr.bulan, pd.gaji_pokok, pd.bonus_kerajinan) s),
      pd.adjustment_plus
    ) eff
    where pd.user_id = v_uid
  ) x;

  return jsonb_build_object('success', true, 'data', v_data);
end;
$$;

-- get_payroll_employee_slip_detail: hanya menambah penjagaan login, isi fungsi tidak diubah.
create or replace function public.get_payroll_employee_slip_detail(p_user_id uuid, p_payroll_run_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user_id, auth.uid()); v_status text; v_detail_id uuid;
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if v_uid <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  select status into v_status from public.payroll_runs where id = p_payroll_run_id;
  if v_status is distinct from 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip belum tersedia');
  end if;

  select id into v_detail_id from public.payroll_details where payroll_run_id = p_payroll_run_id and user_id = v_uid;
  if v_detail_id is null then
    return jsonb_build_object('success', false, 'msg', 'Slip tidak ditemukan');
  end if;

  return public.get_payroll_detail(v_detail_id);
end;
$$;

-- get_papan_peringkat: hanya menambah penjagaan login, isi fungsi tidak diubah.
create or replace function public.get_papan_peringkat()
returns table(
  id uuid, nama text, jabatan text, bagian text,
  bintang smallint, skor smallint, final_score smallint,
  ranking bigint, is_ranking1 boolean, apresiasi text
)
language plpgsql stable security definer set search_path = public as $$
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  return query
select
    p.id, p.nama, p.jabatan, p.bagian, p.bintang, p.skor, p.final_score,
    row_number() over (order by p.final_score desc) as ranking,
    row_number() over (order by p.final_score desc) = 1 as is_ranking1,
    case
      when p.bintang >= 5 then '🏆 Bintang Utama — Kamu kebanggaan tim!'
      when p.bintang >= 4 then '🥇 Luar Biasa — Pertahankan semangatmu!'
      when p.bintang >= 3 then '💪 Solid — Terus tingkatkan kinerjamu!'
      when p.bintang >= 2 then '📈 Berkembang — Masih ada ruang untuk tumbuh'
      else '🔔 Perlu Perhatian — Yuk bangkit bulan ini!'
    end as apresiasi
  from public.profiles p
  where p.status = 'AKTIF' and p.bagian not in ('Owner', 'Finance')
  order by p.final_score desc;
end;
$$;

-- get_ide: hanya menambah penjagaan login, isi fungsi tidak diubah.
create or replace function public.get_ide()
returns table(id uuid, judul text, deskripsi text, tgl timestamptz, status text, feedback text, nama text, bagian text)
language plpgsql stable security definer set search_path = public as $$
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  return query
select t.id, t.judul, t.deskripsi, t.created_at, t.status, t.feedback, p.nama, p.bagian
  from public.team_ideas t
  join public.profiles p on p.id = t.user_id
  order by t.created_at desc;
end;
$$;

-- hitung_bintang: hanya boleh untuk diri sendiri (atau Owner/Finance).
create or replace function public.hitung_bintang(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bulan_absensi text;
  v_bulan_kpi text;
  v_total_item integer;
  v_total_selesai integer;
  v_pct_kpi integer;
  v_absen_fisik integer;
  v_total_telat integer;
  v_total_lembur integer;
  v_total_sakit integer;
  v_total_izin integer;
  v_absen_murni integer;
  v_skor_attendance integer;
  v_skor_akhir integer;
  v_bintang integer;
  v_final_score integer;
begin
  -- Ko 2026-10-14: wajib login. Tanpa ini, `<> auth.uid()` bernilai NULL saat
  -- belum login sehingga penjagaan di bawahnya tidak pernah aktif (lubang keamanan).
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  -- Hanya boleh untuk dirimu sendiri; Owner/Finance boleh semua (tugas payroll).
  if coalesce(p_user_id, auth.uid()) <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya boleh melihat data sendiri' using errcode = '42501';
  end if;
  select max(to_char(tanggal,'YYYY-MM')) into v_bulan_absensi
    from public.attendance_details
    where user_id = p_user_id and tipe in ('ABSEN','TELAT','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','HADIR');
  if v_bulan_absensi is null then
    v_bulan_absensi := to_char((now() at time zone 'Asia/Jakarta'), 'YYYY-MM');
  end if;

  select max(public._minggu_ke_bulan(minggu)) into v_bulan_kpi
    from public.kpi_reports where user_id = p_user_id;
  if v_bulan_kpi is null then v_bulan_kpi := v_bulan_absensi; end if;

  select count(*), count(*) filter (where selesai)
    into v_total_item, v_total_selesai
    from public.kpi_reports
    where user_id = p_user_id and public._minggu_ke_bulan(minggu) = v_bulan_kpi;
  v_pct_kpi := case when v_total_item > 0 then round(v_total_selesai::numeric / v_total_item * 100) else 0 end;

  select
    count(*) filter (where tipe = 'ABSEN'),
    count(*) filter (where tipe = 'TELAT'),
    count(*) filter (where tipe in ('LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR'))
    into v_absen_fisik, v_total_telat, v_total_lembur
    from public.attendance_details
    where user_id = p_user_id and to_char(tanggal,'YYYY-MM') = v_bulan_absensi;

  select
    count(*) filter (where jenis = 'SAKIT'),
    count(*) filter (where jenis <> 'SAKIT')
    into v_total_sakit, v_total_izin
    from public.leave_requests
    where user_id = p_user_id and status = 'DISETUJUI' and to_char(tanggal,'YYYY-MM') = v_bulan_absensi;

  v_absen_murni := public.calc_absen_murni(v_absen_fisik, v_total_sakit, v_total_izin);
  v_skor_attendance := public.calc_skor_attendance(v_absen_murni, v_total_izin, v_total_sakit, v_total_telat, v_total_lembur);
  v_skor_akhir := public.calc_skor_akhir(v_pct_kpi, v_skor_attendance);
  v_bintang := public.calc_bintang(v_skor_akhir, v_absen_murni);
  v_final_score := public.calc_final_score_ranking(v_skor_akhir, v_absen_murni);

  update public.profiles set
    bintang = v_bintang, skor = v_skor_akhir, skor_kpi = v_pct_kpi, final_score = v_final_score, updated_at = now()
    where id = p_user_id;

  return jsonb_build_object('bintang', v_bintang, 'skorAkhir', v_skor_akhir, 'skorKPI', v_pct_kpi, 'finalScore', v_final_score);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Gaji & denda: hanya diri sendiri atau Owner/Finance
--    (dua fungsi ini semula berbentuk SQL tanpa penjagaan sama sekali)
-- ---------------------------------------------------------------------------
create or replace function public.get_effective_salary_setting(
  p_user_id uuid, p_bulan_key text, p_fallback_gaji integer default 0, p_fallback_kerajinan integer default 150000
) returns table(gaji_bulanan integer, bonus_kerajinan integer, bulan_setting text, catatan text)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if coalesce(p_user_id, auth.uid()) <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya boleh melihat data gaji sendiri' using errcode = '42501';
  end if;
  return query
  select
    coalesce(s.gaji_bulanan, greatest(0, p_fallback_gaji)),
    coalesce(s.bonus_kerajinan, greatest(0, p_fallback_kerajinan)),
    s.bulan,
    s.catatan
  from (select 1) dummy
  left join lateral (
    select gaji_bulanan, bonus_kerajinan, bulan, catatan
    from public.salary_settings
    where user_id = p_user_id and bulan <= p_bulan_key
    order by bulan desc, created_at desc
    limit 1
  ) s on true;
end;
$$;

create or replace function public.get_total_denda_bulan(p_user_id uuid, p_bulan_key text)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare v_hasil integer;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if coalesce(p_user_id, auth.uid()) <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya boleh melihat data denda sendiri' using errcode = '42501';
  end if;
  select
    coalesce((select sum(w.total_denda) from public.attendance_weekly w
      where w.user_id = p_user_id and public._minggu_ke_bulan(w.minggu) = p_bulan_key), 0)
    + coalesce((select sum(d.nilai) from public.attendance_details d
      where d.user_id = p_user_id and d.tipe in ('DENDA_SP','DENDA_ANOMALI')
      and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0)
    + coalesce((select sum(d.nilai) from public.attendance_details d
      where d.user_id = p_user_id and d.tipe = 'DENDA_MANUAL'
      and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0)
  into v_hasil;
  return v_hasil;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Cabut izin panggil dari anon/PUBLIC.
--    Sebelum ini SEMUA fungsi bisa dipanggil tanpa login (hak bawaan PostgreSQL),
--    termasuk fungsi gaji di atas. Setelah ini: hanya fungsi yang memang dipakai
--    aplikasi SETELAH login yang diberi izin ke role authenticated, dan
--    service_role tetap diberi izin (dipakai server/Edge Function bila ada).
--    Pengecualian yang tetap terbuka sebelum login: resolve_login_email dan
--    get_daftar_options (memang dibutuhkan halaman login & pendaftaran).
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname as nama
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    if r.nama in ('resolve_login_email', 'get_daftar_options') then
      continue;
    end if;
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Beri izin (khusus sudah login) untuk fungsi yang MEMANG dipakai aplikasi.
--    Diberi penjagaan to_regprocedure(): kalau fungsinya belum ada di database
--    (mis. fungsi foto dari migrasi lain yang belum dijalankan), perintah itu
--    DILEWATI dengan aman — bukan membuat seluruh migrasi gagal.
-- ---------------------------------------------------------------------------
do $$
declare
  daftar text[] := array[
      'public.add_libur(date,text)',
      'public.add_pengumuman(text,text,text,text)',
      'public.add_sanksi_manual(uuid,text,integer,text)',
      'public.approve_izin(uuid,text)',
      'public.approve_registrasi(uuid)',
      'public.attach_absensi_photo(uuid,text,text,text,integer,text,text,timestamptz)',
      'public.batal_sanksi_manual(uuid)',
      'public.calc_hari_kerja_efektif(text)',
      'public.confirm_payroll(uuid)',
      'public.create_payroll_draft(text)',
      'public.deactivate_salary_user(uuid)',
      'public.get_absensi_rekap(uuid)',
      'public.get_all_absensi_rekap()',
      'public.get_all_users()',
      'public.get_anomali_pending()',
      'public.get_daftar_options()',
      'public.get_ide()',
      'public.get_izin_pending()',
      'public.get_my_jobdesk()',
      'public.get_my_profile()',
      'public.get_office_settings()',
      'public.get_owner_accounts()',
      'public.get_owner_jobdesks()',
      'public.get_papan_peringkat()',
      'public.get_payroll_detail(uuid)',
      'public.get_payroll_employee_slip(uuid)',
      'public.get_payroll_employee_slip_detail(uuid,uuid)',
      'public.get_payroll_preview(text)',
      'public.get_registrasi_pending()',
      'public.get_rekap_bulanan_semua(text)',
      'public.get_salary_users(text)',
      'public.get_sanksi_manual()',
      'public.hapus_libur(uuid)',
      'public.hapus_notifikasi(uuid)',
      'public.hapus_semua_notifikasi()',
      'public.import_attendance_legacy_to_events(text)',
      'public.konfirmasi_anomali(uuid,text)',
      'public.mark_absensi_photo_failed(uuid,text)',
      'public.process_absensi_app_to_rekap(text)',
      'public.publish_payroll(uuid)',
      'public.resolve_login_email(text)',
      'public.save_rule(uuid,text,text)',
      'public.set_office_settings(numeric,numeric,integer)',
      'public.set_user_access(uuid,boolean)',
      'public.submit_absensi_camera(text,numeric,numeric,integer)',
      'public.submit_izin(date,text,text,text)',
      'public.submit_kpi_laporan(text,jsonb)',
      'public.tandai_dibaca(uuid)',
      'public.tandai_menu_dibaca(text)',
      'public.tolak_registrasi(uuid)',
      'public.trigger_notif_peraturan(text)',
      'public.update_absensi_matrix_day(uuid,date,text,text,text)',
      'public.update_payroll_adjustment(uuid,integer,integer,text)',
      'public.update_salary_users_batch(text,jsonb)',
      'public.update_user_salary(uuid,integer,text,text,integer)',
      'public.upsert_jobdesk_link(text,text,text)',
      'public.calc_hari_kerja_efektif(text)',
      'X_SELESAI'
  ];
  nama text;
begin
  foreach nama in array daftar loop
    if nama = 'X_SELESAI' then
      continue;
    end if;
    if to_regprocedure(nama) is not null then
      execute format('grant execute on function %s to authenticated', nama);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) PENTING: fungsi pembantu yang dipakai DI DALAM policy RLS harus tetap bisa
--    dipanggil oleh pengguna yang login. Kalau tidak, SEMUA query ke tabel
--    ber-RLS gagal ("permission denied for function current_bagian") dan
--    aplikasi tidak bisa dipakai. Fungsi ini hanya membaca identitas pemanggil
--    sendiri, bukan data karyawan lain.
--    (Kesalahan ini sempat terjadi — lihat migrasi 20261014000029.)
-- ---------------------------------------------------------------------------
grant execute on function public.current_bagian() to public, anon, authenticated, service_role;
grant execute on function public.is_owner() to public, anon, authenticated, service_role;
grant execute on function public.is_finance() to public, anon, authenticated, service_role;
grant execute on function public.is_payroll_admin() to public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Segarkan cache izin di server API supaya perubahan langsung berlaku.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 7) Verifikasi cepat (jalankan manual bila perlu):
--    select proname, proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and proname in
--      ('get_effective_salary_setting','get_total_denda_bulan','hitung_bintang',
--       'get_papan_peringkat','_tambah_denda_absen','current_bagian','is_payroll_admin');
-- ---------------------------------------------------------------------------
