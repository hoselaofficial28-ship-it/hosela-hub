-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin SP (Surat Peringatan)
-- ============================================================================
-- Mengasumsikan attendance_details (HADIR/TELAT/ABSEN/LEMBUR_*) untuk bulan
-- berjalan SUDAH ada (diisi proses harian terpisah, menyusul). Migration ini
-- khusus evaluasi SP bulanan — bagian paling berisiko di seluruh audit.
--
-- REPLIKASI SENGAJA bug "SP2 denda dobel" (DECISION-LOG 2026-10-05, keputusan
-- Ko: "Tiru bug ini juga di clone"). Sitasi asli: gas/Code.gs:1442-1489,
-- gas/Code.gs:2225-2282 (getRekapBulananSemua, totalDenda = kolom REKAP +
-- baris DENDA_SP dijumlah bareng).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Pengganti tambahDendaAbsen() lama (gas/Code.gs:4872-4881): nambah denda
-- LANGSUNG ke kolom attendance_weekly.total_denda milik minggu TERAKHIR
-- user+bulan itu, TANPA sentuh attendance_details. Inilah sumber bug dobel
-- saat dipanggil bareng dgn catat_sp_denda yg insert ke attendance_details.
-- ---------------------------------------------------------------------------
create or replace function public._tambah_denda_absen(p_user_id uuid, p_bulan_key text, p_denda integer)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.attendance_weekly
  where user_id = p_user_id and minggu like p_bulan_key || '%'
  order by minggu desc limit 1;
  if v_id is not null then
    update public.attendance_weekly set total_denda = coalesce(total_denda,0) + p_denda, updated_at = now()
    where id = v_id;
  end if;
end;
$$;
comment on function public._tambah_denda_absen is 'BUG REPLICATED ON PURPOSE (Ko keputusan 2026-10-05) — JANGAN diperbaiki sepihak. Dipanggil tanpa syarat tiap absen>=3, independen dari apakah SP2 sudah tercatat via telat.';

-- ---------------------------------------------------------------------------
-- Pengganti catatSP() lama (gas/Code.gs:4665-4669): insert warning_history.
-- ---------------------------------------------------------------------------
create or replace function public._catat_sp(p_user_id uuid, p_bulan_key text, p_tipe_sp text, p_alasan text)
returns void
language sql security definer set search_path = public as $$
  insert into public.warning_history (user_id, bulan, tipe_sp, alasan) values (p_user_id, p_bulan_key, p_tipe_sp, p_alasan);
$$;

-- ---------------------------------------------------------------------------
-- Pengganti baris denda SP di ABSENSI_DETAIL (gas/Code.gs:1473-1489) —
-- is_generated=false supaya TIDAK ikut terhapus saat proses bulan diulang
-- (meniru pengecualian generatedTypes lama).
-- ---------------------------------------------------------------------------
create or replace function public._catat_denda_sp_detail(p_user_id uuid, p_bulan_key text, p_tipe_sp text, p_alasan text, p_denda integer)
returns void
language plpgsql security definer set search_path = public as $$
declare v_minggu text; v_tgl date;
begin
  if p_denda <= 0 then return; end if;
  v_tgl := (p_bulan_key || '-01')::date + interval '1 month' - interval '1 day';
  select minggu into v_minggu from public.attendance_weekly
  where user_id = p_user_id and minggu like p_bulan_key || '%' order by minggu desc limit 1;
  insert into public.attendance_details (user_id, minggu, tanggal, tipe, keterangan, nilai, is_generated)
  values (p_user_id, coalesce(v_minggu, p_bulan_key || '-W99'), v_tgl, 'DENDA_SP', p_tipe_sp || ': ' || p_alasan, p_denda, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Total denda bulan (dipakai payroll) — REPLIKASI PERSIS getRekapBulananSemua
-- (gas/Code.gs:2280): jumlah kolom REKAP + jumlah baris DETAIL DENDA_SP/
-- DENDA_ANOMALI. Inilah titik dimana bug dobel benar-benar kena ke gaji.
-- ---------------------------------------------------------------------------
create or replace function public.get_total_denda_bulan(p_user_id uuid, p_bulan_key text)
returns integer
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(total_denda) from public.attendance_weekly
              where user_id = p_user_id and minggu like p_bulan_key || '%'), 0)
    +
    coalesce((select sum(nilai) from public.attendance_details
              where user_id = p_user_id and tipe in ('DENDA_SP','DENDA_ANOMALI')
              and to_char(tanggal,'YYYY-MM') = p_bulan_key), 0)
    +
    coalesce((select sum(nilai) from public.attendance_details
              where user_id = p_user_id and tipe = 'DENDA_MANUAL'
              and to_char(tanggal,'YYYY-MM') = p_bulan_key), 0);
$$;

-- ---------------------------------------------------------------------------
-- Evaluasi SP bulanan — pengganti blok SP1/SP2/SP3 di processAbsensiUpload
-- (gas/Code.gs:1426-1489). Dipanggil per-bulan, meng-cover SEMUA user aktif
-- (bukan Owner/Finance, meniru pengecualian yg sama dgn payroll — SP hanya
-- relevan utk karyawan biasa).
-- ---------------------------------------------------------------------------
create or replace function public.process_sp_for_month(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_sp2_triggered boolean;
  v_alasan text;
  v_sp3_alasan text;
  v_ada_sp2_bulan_lalu boolean;
  v_bulan_lalu text;
  v_count_sp integer := 0;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses SP' using errcode = '42501';
  end if;

  v_bulan_lalu := to_char((p_bulan_key || '-01')::date - interval '1 month', 'YYYY-MM');

  for r in
    select p.id as user_id,
      coalesce((select count(*) from public.attendance_details d where d.user_id = p.id and d.tipe = 'TELAT' and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0) as total_telat,
      coalesce((select count(*) from public.attendance_details d where d.user_id = p.id and d.tipe = 'ABSEN' and to_char(d.tanggal,'YYYY-MM') = p_bulan_key), 0) as total_absen
    from public.profiles p
    where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
  loop
    v_sp2_triggered := false;

    -- SP1 mingguan: telat>=3 ATAU absen>=2 DALAM minggu yang sama.
    -- (disederhanakan jadi cek per-minggu dari attendance_weekly langsung,
    -- bukan hitung ulang dari attendance_details, krn attendance_weekly
    -- sudah agregat per minggu — hasilnya sama.)
    for v_alasan in
      select case when w.telat >= 3 then 'Telat '||w.telat||'x dalam minggu '||w.minggu
                  else 'Absen '||w.absen||'x dalam minggu '||w.minggu end
      from public.attendance_weekly w
      where w.user_id = r.user_id and w.minggu like p_bulan_key || '%'
        and (w.telat >= 3 or w.absen >= 2)
    loop
      perform public._catat_sp(r.user_id, p_bulan_key, 'SP1', v_alasan);
      v_count_sp := v_count_sp + 1;
    end loop;

    -- SP2 via telat>=5
    if r.total_telat >= 5 then
      v_sp2_triggered := true;
      v_alasan := 'Telat '||r.total_telat||'x dalam bulan '||p_bulan_key||'. Denda Rp 50.000 dikenakan.';
      perform public._catat_sp(r.user_id, p_bulan_key, 'SP2', v_alasan);
      perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP2', v_alasan, 50000);
      v_count_sp := v_count_sp + 1;
    end if;

    -- SP2 via absen>=3 (BUG REPLICATED: _tambah_denda_absen jalan TANPA
    -- syarat sp2Triggered, persis seperti gas/Code.gs:1457)
    if r.total_absen >= 3 then
      v_alasan := 'Absen '||r.total_absen||'x dalam bulan '||p_bulan_key||'. Denda Rp 50.000 dikenakan.';
      if not v_sp2_triggered then
        perform public._catat_sp(r.user_id, p_bulan_key, 'SP2', v_alasan);
        perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP2', v_alasan, 50000);
        v_count_sp := v_count_sp + 1;
      end if;
      perform public._tambah_denda_absen(r.user_id, p_bulan_key, 50000); -- <- bug: selalu jalan
    end if;

    -- SP3: absen bulanan>=5, ATAU (SP2 trigger via telat SKRG + SP2 bulan lalu)
    v_sp3_alasan := null;
    if r.total_absen >= 5 then
      v_sp3_alasan := 'Absen '||r.total_absen||'x dalam bulan '||p_bulan_key;
    elsif v_sp2_triggered then
      select exists(select 1 from public.warning_history where user_id = r.user_id and bulan = v_bulan_lalu and tipe_sp = 'SP2') into v_ada_sp2_bulan_lalu;
      if v_ada_sp2_bulan_lalu then
        v_sp3_alasan := 'SP2 bulan lalu + telat '||r.total_telat||'x bulan ini';
      end if;
    end if;
    if v_sp3_alasan is not null then
      perform public._catat_sp(r.user_id, p_bulan_key, 'SP3', v_sp3_alasan);
      perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP3', v_sp3_alasan, 100000);
      v_count_sp := v_count_sp + 1;
    end if;
  end loop;

  insert into public.audit_logs (actor, action, target, catatan)
    values (auth.uid(), 'PROCESS_SP_MONTH', p_bulan_key, 'Evaluasi SP bulanan, '||v_count_sp||' entri SP dibuat');

  return jsonb_build_object('success', true, 'bulan', p_bulan_key, 'sp_entries', v_count_sp);
end;
$$;
grant execute on function public.process_sp_for_month(text) to authenticated;

comment on function public.process_sp_for_month(text) is 'DISENGAJA mereplikasi bug SP2 denda dobel (lihat _tambah_denda_absen) sesuai keputusan Ko 2026-10-05. Golden test WAJIB mengasersi Rp100.000 (bukan Rp50.000) untuk kasus telat>=5 DAN absen>=3 bersamaan.';
