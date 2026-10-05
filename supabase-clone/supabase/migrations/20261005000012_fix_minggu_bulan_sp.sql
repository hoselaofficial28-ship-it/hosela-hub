-- ============================================================================
-- Hosela Hub — Supabase Clone — Perbaikan bug pencocokan minggu-ISO vs bulan
-- ============================================================================
-- Ditemukan saat uji integrasi penuh (Izin+Payroll+KPI, 2026-10-05): migration
-- 0005 (SP engine) punya pola `minggu like p_bulan_key || '%'` di 4 tempat.
-- Kolom `minggu` berformat ISO "2026-W37" (lihat migration 0008), sedangkan
-- p_bulan_key berformat "2026-09" -- pattern 'YYYY-MM%' TIDAK PERNAH cocok
-- dengan string berawalan 'YYYY-W...' (karakter ke-6 digit vs huruf 'W').
-- Satu titik (get_total_denda_bulan) sudah diperbaiki lewat migration 0010.
-- Migration ini memperbaiki 3 titik SISANYA yang baru ketahuan lewat uji coba
-- nyata: _tambah_denda_absen (bug SP2-dobel jadi TIDAK PERNAH nempel ke
-- attendance_weekly), _catat_denda_sp_detail (selalu fallback ke minggu
-- placeholder "-W99"), dan process_sp_for_month bagian SP1 mingguan (SP1
-- TIDAK PERNAH tercatat sama sekali -- 0 baris ditemukan, bukan cuma salah
-- hitung). Perbaikan PAKAI _minggu_ke_bulan() (migration 0010), TIDAK
-- mengubah ambang batas/urutan/hasil bisnis apapun selain mengembalikan
-- fungsi ke perilaku yang DIMAKSUDKAN semula.
-- ============================================================================

create or replace function public._tambah_denda_absen(p_user_id uuid, p_bulan_key text, p_denda integer)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.attendance_weekly
  where user_id = p_user_id and public._minggu_ke_bulan(minggu) = p_bulan_key
  order by minggu desc limit 1;
  if v_id is not null then
    update public.attendance_weekly set total_denda = coalesce(total_denda,0) + p_denda, updated_at = now()
    where id = v_id;
  end if;
end;
$$;
comment on function public._tambah_denda_absen is 'BUG REPLICATED ON PURPOSE (Ko keputusan 2026-10-05) -- JANGAN diperbaiki sepihak. Dipanggil tanpa syarat tiap absen>=3, independen dari apakah SP2 sudah tercatat via telat. (Perbaikan 2026-10-05: pencocokan minggu->bulan, lihat komentar migration 0012 -- ini BUKAN bagian dari bug yang sengaja ditiru, cuma typo pattern SQL.)';

create or replace function public._catat_denda_sp_detail(p_user_id uuid, p_bulan_key text, p_tipe_sp text, p_alasan text, p_denda integer)
returns void
language plpgsql security definer set search_path = public as $$
declare v_minggu text; v_tgl date;
begin
  if p_denda <= 0 then return; end if;
  v_tgl := (p_bulan_key || '-01')::date + interval '1 month' - interval '1 day';
  select minggu into v_minggu from public.attendance_weekly
  where user_id = p_user_id and public._minggu_ke_bulan(minggu) = p_bulan_key order by minggu desc limit 1;
  insert into public.attendance_details (user_id, minggu, tanggal, tipe, keterangan, nilai, is_generated)
  values (p_user_id, coalesce(v_minggu, p_bulan_key || '-W99'), v_tgl, 'DENDA_SP', p_tipe_sp || ': ' || p_alasan, p_denda, false);
end;
$$;

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
    for v_alasan in
      select case when w.telat >= 3 then 'Telat '||w.telat||'x dalam minggu '||w.minggu
                  else 'Absen '||w.absen||'x dalam minggu '||w.minggu end
      from public.attendance_weekly w
      where w.user_id = r.user_id and public._minggu_ke_bulan(w.minggu) = p_bulan_key
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
comment on function public.process_sp_for_month is 'DISENGAJA mereplikasi bug SP2 denda dobel (lihat _tambah_denda_absen) sesuai keputusan Ko 2026-10-05. Golden test WAJIB mengasersi Rp100.000 (bukan Rp50.000) untuk kasus telat>=5 DAN absen>=3 bersamaan. (Perbaikan 2026-10-05: SP1 mingguan sempat 0 baris karena bug pencocokan minggu->bulan, lihat migration 0012.)';
