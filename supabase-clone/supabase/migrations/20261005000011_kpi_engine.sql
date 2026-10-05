-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin KPI + Skor/Bintang + Papan Peringkat
-- ============================================================================
-- Replikasi submitKPILaporan, hitungBintang, getPapanPeringkat (gas/Code.gs:
-- 644-674, 754-913, 930-961). get_kpi_template dan daftar laporan KPI milik
-- sendiri TIDAK butuh RPC terpisah -- RLS sudah izinkan baca langsung
-- (kpi_templates: semua boleh baca; kpi_reports: baca punya sendiri), lihat
-- real-backend.js.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- hitungBintang() -- orkestrasi penuh (gas/Code.gs:754-913), bukan cuma
-- formula murni (yang sudah ada sejak migration 0003). INTERNAL ONLY, tidak
-- di-grant ke authenticated -- selalu dipanggil lewat submit_kpi_laporan
-- (meniru 1 satunya jalur pemicu di kode lama: submitKPILaporan). Lebih
-- ketat dari aslinya (yang menerima userId apapun dari client tanpa validasi)
-- tanpa mengubah angka yang dihasilkan.
--
-- PENTING (persis aslinya, bukan simplifikasi): "bulan" yang dipakai BUKAN
-- bulan kalender berjalan, tapi bulan TERBARU yang punya data (absensi
-- terpisah dari KPI, masing-masing dicari sendiri, lihat gas/Code.gs:757-790).
-- ---------------------------------------------------------------------------
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
-- Submit laporan KPI mingguan: replace (hapus lalu insert) baris user+minggu
-- ini, lalu recompute skor/bintang. Sitasi: submitKPILaporan gas/Code.gs:
-- 644-674.
-- ---------------------------------------------------------------------------
create or replace function public.submit_kpi_laporan(p_minggu text, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  item jsonb;
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;

  delete from public.kpi_reports where user_id = v_user_id and minggu = p_minggu;

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into public.kpi_reports(user_id, minggu, kpi_template_id, indikator, selesai, catatan)
      values (
        v_user_id, p_minggu,
        nullif(item->>'kpiId', '')::uuid,
        coalesce(item->>'indikator', ''),
        coalesce((item->>'selesai')::boolean, false),
        coalesce(item->>'catatan', '')
      );
  end loop;

  perform public.hitung_bintang(v_user_id);

  update public.notifications set status = 'SUDAH'
    where user_id = v_user_id and judul = 'Reminder KPI Checklist ' || p_minggu and status = 'BELUM';

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.submit_kpi_laporan(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Papan peringkat -- dibaca SEMUA karyawan aktif, bukan cuma Owner/Finance,
-- jadi harus bypass RLS profiles (yang membatasi baca ke milik sendiri) lewat
-- SECURITY DEFINER + daftar kolom TERBATAS (bukan select * profiles -- tidak
-- expose email/gaji/dll). Sitasi: getPapanPeringkat gas/Code.gs:930-961.
-- ---------------------------------------------------------------------------
create or replace function public.get_papan_peringkat()
returns table(
  id uuid, nama text, jabatan text, bagian text,
  bintang smallint, skor smallint, final_score smallint,
  ranking bigint, is_ranking1 boolean, apresiasi text
)
language sql stable security definer set search_path = public as $$
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
$$;
grant execute on function public.get_papan_peringkat() to authenticated;
