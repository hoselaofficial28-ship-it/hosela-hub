-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin Payroll
-- ============================================================================
-- Replikasi getRekapBulananSemua, getPayrollPreview, createPayrollDraft,
-- confirmPayroll, publishPayroll, updatePayrollAdjustment, getPayrollDetail,
-- getPayrollEmployeeSlip(Detail), applyEffectivePayrollBonus_
-- (gas/Code.gs:2184-2317, 3564-3920).
--
-- PERBAIKAN BUG DI MIGRATION SAYA SENDIRI (migration 0005, belum pernah
-- dipanggil sebelumnya jadi belum pernah ketahuan): get_total_denda_bulan
-- lama membandingkan `attendance_weekly.minggu` (format ISO "2026-W32")
-- dengan `p_bulan_key || '%'` (format "2026-08%") -- pola ini TIDAK PERNAH
-- match apapun (karakter ke-6 digit vs huruf 'W'), jadi fungsi lama SELALU
-- mengembalikan 0 dari sisi attendance_weekly. Diperbaiki di sini dengan
-- _minggu_ke_bulan() yang mengonversi "2026-W32" -> tanggal Senin minggu itu
-- -> "YYYY-MM", PERSIS logika getMondayOfWeek() (gas/Code.gs:2230) yang
-- dipakai getRekapBulananSemua.
--
-- KEPUTUSAN (bukan dari Ko, diputuskan dari analisis kode -- lihat
-- DECISION-LOG.md): sumber gaji "PropertiesService SALARY_SETTING" di app
-- lama TIDAK direplikasi terpisah. Baca gas/Code.gs:235-247,353 — setiap
-- updateUserSalary() SELALU menulis ke SHEET GAJI_HISTORY dan Properties
-- BERSAMAAN dengan data yang SAMA PERSIS (write-through, satu-satunya jalur
-- tulis). Properties cuma cache baca lebih cepat, tidak pernah punya data
-- yang tidak ada di sheet. salary_settings (tabel ini, migrasi 0001) adalah
-- pengganti SHEET itu -- cukup sebagai satu-satunya sumber.
--
-- Fitur "Kelola Gaji" (updateUserSalary/batch, ubah gaji per bulan) BELUM
-- dibangun di iterasi ini -- payroll tetap jalan pakai fallback
-- profiles.gaji_bulanan kalau belum ada baris salary_settings sama sekali,
-- sama seperti kode lama (fallbackSalary).
-- ============================================================================

create or replace function public._minggu_ke_bulan(p_minggu text)
returns text
language sql immutable as $$
  select to_char(
    to_date(split_part(p_minggu, '-W', 1) || '-' || split_part(p_minggu, '-W', 2) || '-1', 'IYYY-IW-ID'),
    'YYYY-MM'
  );
$$;

create or replace function public.get_total_denda_bulan(p_user_id uuid, p_bulan_key text)
returns integer
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(w.total_denda) from public.attendance_weekly w
              where w.user_id = p_user_id and public._minggu_ke_bulan(w.minggu) = p_bulan_key), 0)
    +
    coalesce((select sum(d.nilai) from public.attendance_details d
              where d.user_id = p_user_id and d.tipe in ('DENDA_SP','DENDA_ANOMALI')
              and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0)
    +
    coalesce((select sum(d.nilai) from public.attendance_details d
              where d.user_id = p_user_id and d.tipe = 'DENDA_MANUAL'
              and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0);
$$;
comment on function public.get_total_denda_bulan is 'Diperbaiki 2026-10-05: versi migration 0005 salah match minggu-ISO vs bulan (selalu 0 dari attendance_weekly). Lihat komentar migration 0010.';

create or replace function public.calc_hari_kerja_efektif(p_bulan_key text)
returns integer
language sql stable as $$
  select greatest(1,
    extract(day from (date_trunc('month', (p_bulan_key || '-01')::date) + interval '1 month - 1 day'))::integer
    - (select count(*) from generate_series(
        date_trunc('month', (p_bulan_key || '-01')::date),
        date_trunc('month', (p_bulan_key || '-01')::date) + interval '1 month - 1 day',
        interval '1 day'
      ) d where extract(dow from d) = 0)
    - (select count(*) from public.holidays
        where difasilitasi = true
        and to_char(tanggal,'YYYY-MM') = p_bulan_key)
  )::integer;
$$;

-- ---------------------------------------------------------------------------
-- Setting gaji efektif per user/bulan. Sitasi: getEffectiveSalarySetting_
-- gas/Code.gs:264-299 (bagian sheet saja -- lihat catatan Properties di atas).
-- "Best match": baris bulan<=target PALING BESAR bulannya; kalau tidak ada
-- baris sama sekali, pakai fallback (gaji profil / 150000).
-- ---------------------------------------------------------------------------
create or replace function public.get_effective_salary_setting(
  p_user_id uuid, p_bulan_key text, p_fallback_gaji integer default 0, p_fallback_kerajinan integer default 150000
) returns table(gaji_bulanan integer, bonus_kerajinan integer, bulan_setting text)
language sql stable security definer set search_path = public as $$
  select
    coalesce(s.gaji_bulanan, greatest(0, p_fallback_gaji)),
    coalesce(s.bonus_kerajinan, greatest(0, p_fallback_kerajinan)),
    s.bulan
  from (select 1) dummy
  left join lateral (
    select gaji_bulanan, bonus_kerajinan, bulan
    from public.salary_settings
    where user_id = p_user_id and bulan <= p_bulan_key
    order by bulan desc, created_at desc
    limit 1
  ) s on true;
$$;

-- ---------------------------------------------------------------------------
-- Rekap agregat semua karyawan 1 bulan -- dasar preview/draft payroll.
-- Sitasi: getRekapBulananSemua gas/Code.gs:2184-2296. Kode lama TANPA
-- pengecekan role -- clone WAJIB tambahkan (CLAUDE.md).
-- ---------------------------------------------------------------------------
create or replace function public.get_rekap_bulanan_semua(p_bulan_key text)
returns table(
  user_id uuid, nama text, bagian text, jabatan text,
  hadir integer, telat integer, absen integer, lembur_minggu integer, lembur_libur integer,
  bintang smallint, skor smallint,
  total_denda integer, total_reward integer, bonus_kerajinan integer,
  gaji_pokok integer, gaji_harian integer
)
language plpgsql stable security definer set search_path = public as $$
declare v_hari_kerja integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat rekap payroll' using errcode = '42501';
  end if;
  v_hari_kerja := public.calc_hari_kerja_efektif(p_bulan_key);

  return query
    select
      p.id, p.nama, p.bagian, p.jabatan,
      coalesce(w_agg.hadir, 0)::integer, coalesce(w_agg.telat, 0)::integer, coalesce(w_agg.absen, 0)::integer,
      coalesce(w_agg.lembur_minggu, 0)::integer, coalesce(w_agg.lembur_libur, 0)::integer,
      p.bintang, p.skor,
      public.get_total_denda_bulan(p.id, p_bulan_key),
      coalesce(d_agg.total_reward, 0)::integer,
      public.calc_bonus_kerajinan(coalesce(w_agg.absen, 0)::integer, s.bonus_kerajinan),
      s.gaji_bulanan,
      public.calc_gaji_harian(s.gaji_bulanan, v_hari_kerja)
    from public.profiles p
    cross join lateral public.get_effective_salary_setting(p.id, p_bulan_key, p.gaji_bulanan, 150000) s
    left join lateral (
      select
        count(*) filter (where d.tipe = 'HADIR') as hadir,
        count(*) filter (where d.tipe = 'TELAT') as telat,
        count(*) filter (where d.tipe = 'ABSEN') as absen,
        count(*) filter (where d.tipe = 'LEMBUR_MINGGU') as lembur_minggu,
        count(*) filter (where d.tipe = 'LEMBUR_LIBUR') as lembur_libur
      from public.attendance_details d
      where d.user_id = p.id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
    ) w_agg on true
    left join lateral (
      select sum(d.nilai) as total_reward
      from public.attendance_details d
      where d.user_id = p.id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
        and d.tipe in ('LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','REWARD_MANUAL')
    ) d_agg on true
    where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
    order by p.nama;
end;
$$;
grant execute on function public.get_rekap_bulanan_semua(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Snapshot item rincian (pengganti appendPayrollItemsFromAbsensi_,
-- gas/Code.gs:3641-3656) -- dibangun LANGSUNG dari attendance_details bulan
-- itu, bukan replikasi getAbsensiRekap penuh. Item ini MURNI presentasi
-- (rincian), tidak mempengaruhi total_gaji yang tersimpan di payroll_details.
-- ---------------------------------------------------------------------------
create or replace function public._snapshot_payroll_items(p_detail_id uuid, p_user_id uuid, p_bulan_key text, p_bonus_kerajinan integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
    select p_detail_id,
      case when d.tipe in ('DENDA_SP','DENDA_ANOMALI') then 'DENDA_SP' else d.tipe end,
      d.tanggal, d.keterangan, d.nilai
    from public.attendance_details d
    where d.user_id = p_user_id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
      and d.tipe in ('DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL','REWARD_MANUAL','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN');

  if p_bonus_kerajinan > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, tanggal, keterangan, nominal)
      values (p_detail_id, 'BONUS_KERAJINAN', null, 'Bonus kerajinan bulan ' || p_bulan_key, p_bonus_kerajinan);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Buat draft payroll (idempotent -- kalau sudah ada run bulan itu, return
-- yang sudah ada, TIDAK dibuat ulang). Sitasi: createPayrollDraft
-- gas/Code.gs:3621-3639.
-- ---------------------------------------------------------------------------
create or replace function public.create_payroll_draft(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run_id uuid;
  v_exists uuid;
  r record;
  v_detail_id uuid;
  v_hari_kerja integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh membuat draft payroll' using errcode = '42501';
  end if;

  select id into v_exists from public.payroll_runs where bulan = p_bulan_key;
  if v_exists is not null then
    return public.get_payroll_run_payload(v_exists);
  end if;

  v_hari_kerja := public.calc_hari_kerja_efektif(p_bulan_key);
  insert into public.payroll_runs(bulan, periode_mulai, periode_akhir, status, dibuat_oleh, dibuat_pada)
    values (
      p_bulan_key,
      (p_bulan_key || '-01')::date,
      (date_trunc('month', (p_bulan_key || '-01')::date) + interval '1 month - 1 day')::date,
      'DRAFT', auth.uid(), now()
    )
    returning id into v_run_id;

  for r in select * from public.get_rekap_bulanan_semua(p_bulan_key) loop
    insert into public.payroll_details(
      payroll_run_id, user_id, nama, bagian, jabatan, gaji_pokok, hari_kerja,
      hadir, absen, telat, lembur_pulang, lembur_minggu, lembur_libur,
      total_reward, total_denda, bonus_kerajinan, adjustment_plus, adjustment_minus,
      catatan_adjustment, total_gaji, status_slip
    ) values (
      v_run_id, r.user_id, r.nama, r.bagian, r.jabatan, r.gaji_pokok, v_hari_kerja,
      r.hadir, r.absen, r.telat, 0, r.lembur_minggu, r.lembur_libur,
      r.total_reward, r.total_denda, r.bonus_kerajinan, 0, 0,
      '', public.calc_payroll_total(r.gaji_pokok, r.total_reward, r.bonus_kerajinan, 0, r.total_denda, 0), 'DRAFT'
    ) returning id into v_detail_id;

    perform public._snapshot_payroll_items(v_detail_id, r.user_id, p_bulan_key, r.bonus_kerajinan);
  end loop;

  insert into public.audit_logs(actor, action, target, catatan)
    values (auth.uid(), 'CREATE_PAYROLL_DRAFT', p_bulan_key, 'Draft payroll dibuat');

  return public.get_payroll_run_payload(v_run_id);
end;
$$;
grant execute on function public.create_payroll_draft(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Baca 1 payroll run + semua detailnya, dengan bonus kerajinan EFEKTIF
-- (setting terbaru, bukan yang dibekukan saat draft dibuat) diterapkan saat
-- baca -- PERSIS applyEffectivePayrollBonus_ (gas/Code.gs:3727-3756), dipakai
-- lewat calc_effective_payroll_bonus (migration 0003). total_gaji TERSIMPAN
-- tidak berubah; angka yang DITAMPILKAN yang disesuaikan.
-- ---------------------------------------------------------------------------
create or replace function public.get_payroll_run_payload(p_payroll_run_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_run public.payroll_runs%rowtype;
  v_data jsonb;
  v_total integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat payroll' using errcode = '42501';
  end if;

  select * into v_run from public.payroll_runs where id = p_payroll_run_id;
  if v_run.id is null then
    return jsonb_build_object('success', false, 'msg', 'Payroll tidak ditemukan');
  end if;

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
    'totalPayroll', v_total, 'data', v_data
  );
end;
$$;
grant execute on function public.get_payroll_run_payload(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Preview: kalau run bulan itu sudah ada, pakai itu; kalau belum, hitung
-- preview LANGSUNG dari rekap TANPA menyimpan apapun. Sitasi: getPayrollPreview
-- gas/Code.gs:3614-3619, buildPayrollPreviewFromRekap gas/Code.gs:3592-3612.
-- ---------------------------------------------------------------------------
create or replace function public.get_payroll_preview(p_bulan_key text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_run_id uuid;
  v_hari_kerja integer;
  v_data jsonb;
  v_total integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat payroll' using errcode = '42501';
  end if;

  select id into v_run_id from public.payroll_runs where bulan = p_bulan_key;
  if v_run_id is not null then
    return public.get_payroll_run_payload(v_run_id);
  end if;

  v_hari_kerja := public.calc_hari_kerja_efektif(p_bulan_key);
  select coalesce(jsonb_agg(row_to_json(x) order by x."nama"), '[]'::jsonb), coalesce(sum(x."totalGaji"), 0)
    into v_data, v_total
  from (
    select
      r.user_id as "userId", r.nama as "nama", r.bagian as "bagian", r.jabatan as "jabatan",
      r.gaji_pokok as "gajiPokok", v_hari_kerja as "hariKerja",
      r.hadir as "hadir", r.absen as "absen", r.telat as "telat",
      0 as "lemburPulang", r.lembur_minggu as "lemburMinggu", r.lembur_libur as "lemburLibur",
      r.total_reward as "totalReward", r.total_denda as "totalDenda", r.bonus_kerajinan as "bonusKerajinan",
      0 as "adjustmentPlus", 0 as "adjustmentMinus", '' as "catatanAdjustment",
      public.calc_payroll_total(r.gaji_pokok, r.total_reward, r.bonus_kerajinan, 0, r.total_denda, 0) as "totalGaji",
      'DRAFT' as "statusSlip"
    from public.get_rekap_bulanan_semua(p_bulan_key) r
  ) x;

  return jsonb_build_object('success', true, 'bulan', p_bulan_key, 'status', 'PREVIEW', 'hariKerja', v_hari_kerja, 'totalPayroll', v_total, 'data', v_data);
end;
$$;
grant execute on function public.get_payroll_preview(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Konfirmasi & publish. Sitasi: confirmPayroll/publishPayroll/setPayrollStatus_
-- gas/Code.gs:3681-3725.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_payroll(p_payroll_run_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh konfirmasi payroll' using errcode = '42501';
  end if;
  update public.payroll_runs set status = 'CONFIRMED', dikonfirmasi_oleh = auth.uid(), dikonfirmasi_pada = now()
    where id = p_payroll_run_id and status = 'DRAFT';
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Payroll tidak ditemukan atau bukan status DRAFT.');
  end if;
  insert into public.audit_logs(actor, action, target) values (auth.uid(), 'CONFIRM_PAYROLL', p_payroll_run_id::text);
  return public.get_payroll_run_payload(p_payroll_run_id);
end;
$$;
grant execute on function public.confirm_payroll(uuid) to authenticated;

create or replace function public.publish_payroll(p_payroll_run_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh publish payroll' using errcode = '42501';
  end if;
  update public.payroll_runs set status = 'PUBLISHED', dipublish_oleh = auth.uid(), dipublish_pada = now()
    where id = p_payroll_run_id and status = 'CONFIRMED';
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Payroll tidak ditemukan atau belum CONFIRMED.');
  end if;

  update public.payroll_details set status_slip = 'PUBLISHED' where payroll_run_id = p_payroll_run_id;

  for r in select user_id from public.payroll_details where payroll_run_id = p_payroll_run_id loop
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (r.user_id, 'Slip gaji tersedia', 'Slip gaji sudah tersedia di menu Slip Gaji.', 'INFO', 's-slip-gaji');
  end loop;

  insert into public.audit_logs(actor, action, target) values (auth.uid(), 'PUBLISH_PAYROLL', p_payroll_run_id::text);
  return public.get_payroll_run_payload(p_payroll_run_id);
end;
$$;
grant execute on function public.publish_payroll(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Adjustment manual (plus/minus) per slip. TOTAL YANG TERSIMPAN pakai nilai
-- ASLI (bukan effective) -- transform effective hanya terjadi saat baca,
-- sama seperti aslinya. Sitasi: updatePayrollAdjustment gas/Code.gs:3847-3884.
-- ---------------------------------------------------------------------------
create or replace function public.update_payroll_adjustment(p_payroll_detail_id uuid, p_adjustment_plus integer, p_adjustment_minus integer, p_catatan text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run_id uuid; v_status text; v_gaji_pokok integer; v_reward integer; v_denda integer; v_bonus integer;
  v_plus integer := greatest(0, coalesce(p_adjustment_plus, 0));
  v_minus integer := greatest(0, coalesce(p_adjustment_minus, 0));
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengubah adjustment' using errcode = '42501';
  end if;

  select payroll_run_id, gaji_pokok, total_reward, total_denda, bonus_kerajinan
    into v_run_id, v_gaji_pokok, v_reward, v_denda, v_bonus
    from public.payroll_details where id = p_payroll_detail_id;
  if v_run_id is null then
    return jsonb_build_object('success', false, 'msg', 'Detail payroll tidak ditemukan');
  end if;
  select status into v_status from public.payroll_runs where id = v_run_id;
  if v_status = 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip sudah dipublish dan tidak bisa diubah');
  end if;

  update public.payroll_details set
    adjustment_plus = v_plus, adjustment_minus = v_minus, catatan_adjustment = coalesce(p_catatan, ''),
    total_gaji = public.calc_payroll_total(v_gaji_pokok, v_reward, v_bonus, v_plus, v_denda, v_minus)
    where id = p_payroll_detail_id;

  delete from public.payroll_items where payroll_detail_id = p_payroll_detail_id and tipe in ('ADJUSTMENT_PLUS','ADJUSTMENT_MINUS');
  if v_plus > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, keterangan, nominal) values (p_payroll_detail_id, 'ADJUSTMENT_PLUS', coalesce(nullif(p_catatan,''),'Adjustment tambahan'), v_plus);
  end if;
  if v_minus > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, keterangan, nominal) values (p_payroll_detail_id, 'ADJUSTMENT_MINUS', coalesce(nullif(p_catatan,''),'Adjustment potongan'), v_minus);
  end if;

  insert into public.audit_logs(actor, action, target, after_data)
    values (auth.uid(), 'UPDATE_PAYROLL_ADJUSTMENT', p_payroll_detail_id::text, jsonb_build_object('plus', v_plus, 'minus', v_minus));

  return public.get_payroll_detail(p_payroll_detail_id);
end;
$$;
grant execute on function public.update_payroll_adjustment(uuid, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Detail 1 slip + item rincian (bonus efektif diterapkan). Sitasi:
-- getPayrollDetail gas/Code.gs:3808-3836.
-- ---------------------------------------------------------------------------
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
grant execute on function public.get_payroll_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Riwayat slip milik SATU karyawan (hanya run yang PUBLISHED). Sitasi:
-- getPayrollEmployeeSlip gas/Code.gs:3784-3806. Default ke diri sendiri;
-- admin boleh lihat milik orang lain.
-- ---------------------------------------------------------------------------
create or replace function public.get_payroll_employee_slip(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user_id, auth.uid()); v_data jsonb;
begin
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
grant execute on function public.get_payroll_employee_slip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Slip 1 bulan spesifik milik SATU karyawan, dicari via (user, run) bukan
-- detail_id langsung -- BEDA dari get_payroll_detail (admin, kapan saja):
-- di sini run WAJIB berstatus PUBLISHED, meniru getPayrollEmployeeSlipDetail
-- gas/Code.gs:3886-3900 (karyawan tidak boleh intip slip draft sendiri).
-- ---------------------------------------------------------------------------
create or replace function public.get_payroll_employee_slip_detail(p_user_id uuid, p_payroll_run_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_user_id, auth.uid()); v_status text; v_detail_id uuid;
begin
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
grant execute on function public.get_payroll_employee_slip_detail(uuid, uuid) to authenticated;
