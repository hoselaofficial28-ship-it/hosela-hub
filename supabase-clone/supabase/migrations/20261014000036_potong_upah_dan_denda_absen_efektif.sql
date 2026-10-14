-- ============================================================================
-- Keputusan Ko 14 Okt 2026 (lanjutan):
--   1) HARI TIDAK MASUK = TIDAK DAPAT UPAH.
--      Gaji pokok dipotong sebesar gaji harian x jumlah hari tidak masuk.
--      Termasuk hari sakit/izin yang DISETUJUI (memang tidak masuk), tetapi
--      uang kerajinan tetap dibayarkan untuk hari yang ada izinnya (migrasi 035).
--      Dasar: gaji harian = gaji bulanan / hari kerja efektif
--             (calc_gaji_harian, sama seperti yang dipakai reward lembur).
--
--   2) DENDA ABSEN (SP2 Rp50.000 / SP3 Rp100.000) HANYA UNTUK ABSEN TANPA IZIN.
--      Perhitungan SP memakai ABSEN EFEKTIF = absen fisik - izin/sakit DISETUJUI,
--      baik untuk SP1 mingguan (absen>=2 dalam 1 minggu) maupun SP2/SP3 bulanan
--      (absen>=3 / absen>=5). Jadi kalau 5 hari tidak masuk sudah ada izin sakit
--      yang disetujui: tidak ada SP absen & tidak ada denda absen, hanya upah
--      harinya yang tidak dibayar.
--
-- Aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: tanggal Senin dari kode minggu ISO ("2026-W41" -> 2026-10-05)
--    Dipakai untuk mencocokkan izin/sakit disetujui dengan minggu tertentu.
--    Pola konversi sama seperti _minggu_ke_bulan (migrasi 0010) yang sudah
--    terbukti jalan di database ini.
-- ---------------------------------------------------------------------------
create or replace function public._tanggal_awal_minggu(p_minggu text)
returns date
language sql immutable as $$
  select to_date(split_part(p_minggu, '-W', 1) || '-' || split_part(p_minggu, '-W', 2) || '-1', 'IYYY-IW-ID');
$$;

grant execute on function public._tanggal_awal_minggu(text) to authenticated, service_role;

comment on function public._tanggal_awal_minggu(text) is
  'Tanggal Senin dari kode minggu ISO, mis. 2026-W41 -> 2026-10-05. Dipakai untuk menghitung absen efektif per minggu.';

-- ---------------------------------------------------------------------------
-- 2) SP: pakai absen efektif (bulan & minggu)
-- ---------------------------------------------------------------------------
create or replace function public.process_sp_for_month(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  w record;
  v_sp2_triggered boolean;
  v_alasan text;
  v_sp3_alasan text;
  v_ada_sp2_bulan_lalu boolean;
  v_bulan_lalu text;
  v_count_sp integer := 0;
  v_absen_efektif integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses SP' using errcode = '42501';
  end if;

  v_bulan_lalu := to_char((p_bulan_key || '-01')::date - interval '1 month', 'YYYY-MM');

  for r in
    select p.id as user_id,
      coalesce((select count(*) from public.attendance_details d
                 where d.user_id = p.id and d.tipe = 'TELAT'
                   and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0) as total_telat,
      coalesce((select count(*) from public.attendance_details d
                 where d.user_id = p.id and d.tipe = 'ABSEN'
                   and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0) as total_absen_fisik,
      coalesce((select count(*) from public.leave_requests lr
                 where lr.user_id = p.id and lr.status = 'DISETUJUI'
                   and to_char(lr.tanggal,'YYYY-MM') = p_bulan_key), 0) as total_izin
    from public.profiles p
    where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
  loop
    v_sp2_triggered := false;
    v_absen_efektif := greatest(0, r.total_absen_fisik - r.total_izin);

    -- SP1 mingguan: telat>=3 ATAU absen EFEKTIF >=2 dalam minggu yang sama.
    for w in
      select wk.minggu, wk.telat,
             greatest(0, wk.absen - coalesce((
               select count(*) from public.leave_requests lr
                where lr.user_id = r.user_id and lr.status = 'DISETUJUI'
                  and lr.tanggal between public._tanggal_awal_minggu(wk.minggu)
                                    and public._tanggal_awal_minggu(wk.minggu) + 6
             ), 0)) as absen_efektif
        from public.attendance_weekly wk
       where wk.user_id = r.user_id and public._minggu_ke_bulan(wk.minggu) = p_bulan_key
    loop
      if w.telat >= 3 or w.absen_efektif >= 2 then
        v_alasan := case when w.telat >= 3
                         then 'Telat ' || w.telat || 'x dalam minggu ' || w.minggu
                         else 'Absen ' || w.absen_efektif || 'x (setelah dikurangi izin disetujui) dalam minggu ' || w.minggu end;
        perform public._catat_sp(r.user_id, p_bulan_key, 'SP1', v_alasan);
        v_count_sp := v_count_sp + 1;
      end if;
    end loop;

    -- SP2 via telat>=5
    if r.total_telat >= 5 then
      v_sp2_triggered := true;
      v_alasan := 'Telat ' || r.total_telat || 'x dalam bulan ' || p_bulan_key || '. Denda Rp 50.000 dikenakan.';
      perform public._catat_sp(r.user_id, p_bulan_key, 'SP2', v_alasan);
      perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP2', v_alasan, 50000);
      v_count_sp := v_count_sp + 1;
    end if;

    -- SP2 via absen EFEKTIF >=3 (dulu memakai absen fisik)
    if v_absen_efektif >= 3 then
      v_alasan := 'Absen ' || v_absen_efektif || 'x (setelah dikurangi izin/sakit disetujui) dalam bulan ' || p_bulan_key || '. Denda Rp 50.000 dikenakan.';
      if not v_sp2_triggered then
        perform public._catat_sp(r.user_id, p_bulan_key, 'SP2', v_alasan);
        perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP2', v_alasan, 50000);
        v_count_sp := v_count_sp + 1;
      end if;
      -- BUG WARISAN yang sengaja direplikasi (keputusan Ko 2026-10-05): jalur ini
      -- menambah denda TANPA syarat sp2Triggered, persis seperti gas/Code.gs:1457.
      perform public._tambah_denda_absen(r.user_id, p_bulan_key, 50000);
    end if;

    -- SP3: absen EFEKTIF bulanan>=5, ATAU (SP2 trigger via telat + SP2 bulan lalu)
    v_sp3_alasan := null;
    if v_absen_efektif >= 5 then
      v_sp3_alasan := 'Absen ' || v_absen_efektif || 'x (setelah dikurangi izin/sakit disetujui) dalam bulan ' || p_bulan_key;
    elsif v_sp2_triggered then
      select exists(select 1 from public.warning_history
                     where user_id = r.user_id and bulan = v_bulan_lalu and tipe_sp = 'SP2') into v_ada_sp2_bulan_lalu;
      if v_ada_sp2_bulan_lalu then
        v_sp3_alasan := 'SP2 bulan lalu + telat ' || r.total_telat || 'x bulan ini';
      end if;
    end if;
    if v_sp3_alasan is not null then
      perform public._catat_sp(r.user_id, p_bulan_key, 'SP3', v_sp3_alasan);
      perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP3', v_sp3_alasan, 100000);
      v_count_sp := v_count_sp + 1;
    end if;
  end loop;

  insert into public.audit_logs (actor, action, target, catatan)
    values (auth.uid(), 'PROCESS_SP_MONTH', p_bulan_key, 'Evaluasi SP bulanan (absen efektif), ' || v_count_sp || ' entri SP dibuat');

  return jsonb_build_object('success', true, 'bulan', p_bulan_key, 'sp_entries', v_count_sp);
end;
$$;

comment on function public.process_sp_for_month(text) is
  'SP1 mingguan + SP2/SP3 bulanan. 14 Okt 2026: absen dihitung EFEKTIF (absen fisik - izin/sakit DISETUJUI) sesuai keputusan Ko, jadi hari sakit yang disetujui tidak memicu SP/denda absen.';

-- ---------------------------------------------------------------------------
-- 3) Gaji pokok dipotong untuk hari tidak masuk (gaji harian x jumlah absen)
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
      public.bonus_kerajinan_efektif(p.id, p_bulan_key, coalesce(w_agg.absen, 0)::integer, s.bonus_kerajinan),
      -- KEPUTUSAN KO: hari tidak masuk tidak dapat upah.
      -- gaji pokok = gaji bulanan - (gaji harian x jumlah hari tidak masuk)
      greatest(0, s.gaji_bulanan - (public.calc_gaji_harian(s.gaji_bulanan, v_hari_kerja) * coalesce(w_agg.absen, 0)::integer)),
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

comment on function public.get_rekap_bulanan_semua(text) is
  'Rekap bulanan untuk payroll. 14 Okt 2026: gaji_pokok dikurangi upah hari tidak masuk (gaji harian x jumlah absen) sesuai keputusan Ko, dan kerajinan memakai bonus_kerajinan_efektif (toleransi izin/SB).';

notify pgrst, 'reload schema';
