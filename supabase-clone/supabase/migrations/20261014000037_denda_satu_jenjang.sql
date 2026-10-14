-- ============================================================================
-- Keputusan Ko 14 Okt 2026 (lanjutan migrasi 036) — DENDA SATU JENJANG:
--
--   1) NAIK JENJANG, BUKAN MENUMPUK (jalur absen):
--        absen tanpa izin 3-4 hari -> SP2 + denda Rp50.000
--        absen tanpa izin >=5 hari -> SP3 + denda Rp100.000 SAJA
--      (SP2 jalur absen tidak ditagih lagi kalau sudah SP3)
--
--   2) DENDA WARISAN DIHAPUS. process_sp_for_month tidak lagi memanggil
--      _tambah_denda_absen (bug aplikasi lama gas/Code.gs:1457 yang selalu
--      menambah Rp50.000 sehingga denda absen jadi dobel). Keputusan Ko
--      2026-10-05 yang memilih mereplikasi bug itu DIBATALKAN oleh Ko
--      2026-10-14 karena sudah digantikan oleh Sanksi Berulang (SB).
--
--   3) SP dan SB TIDAK MENUMPUK. Dalam satu bulan, denda SP/SB = YANG
--      TERBESAR, bukan jumlah keduanya:
--        absen 5 hari bulan ke-1 -> SP3 Rp100.000 (SB1 Rp50.000 tidak ditambah)
--        telat 5x bulan ke-1     -> Rp50.000  (SP2 dan SB1 sama besar)
--        telat 5x bulan ke-2     -> SB2 Rp100.000 (SP2 Rp50.000 digantikan)
--
--   4) Bulan yang sudah diperbaiki (mis. izin disetujui lalu bulan diproses
--      ulang) juga membersihkan SB bulan itu, bukan hanya SP-nya.
--
-- Aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper: dalam 1 bulan, denda SP dan denda SB tidak boleh menumpuk.
--    Yang lebih besar menang; baris denda yang lebih kecil dihapus.
--    Hanya dipakai fungsi internal (security definer), sengaja TIDAK
--    diberikan ke authenticated supaya tidak bisa dipanggil karyawan.
-- ---------------------------------------------------------------------------
create or replace function public._terapkan_max_denda_sp_sb(p_user_id uuid, p_bulan_key text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_sp integer;
  v_sb integer;
begin
  select coalesce(sum(d.nilai), 0) into v_sp
    from public.attendance_details d
   where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
     and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
     and (d.keterangan like 'SP2%' or d.keterangan like 'SP3%');

  select coalesce(sum(d.nilai), 0) into v_sb
    from public.attendance_details d
   where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
     and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
     and d.keterangan like 'SB%';

  if v_sp > 0 and v_sb > 0 then
    if v_sb > v_sp then
      delete from public.attendance_details d
       where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
         and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
         and (d.keterangan like 'SP2%' or d.keterangan like 'SP3%');
      v_sp := 0;
    else
      delete from public.attendance_details d
       where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
         and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
         and d.keterangan like 'SB%';
      v_sb := 0;
    end if;
  end if;

  return greatest(v_sp, v_sb);
end;
$$;

comment on function public._terapkan_max_denda_sp_sb(uuid, text) is
  'Keputusan Ko 14 Okt 2026: denda SP dan denda SB tidak menumpuk dalam satu bulan — yang terbesar menang. Mengembalikan total denda SP/SB bulan itu.';

revoke execute on function public._terapkan_max_denda_sp_sb(uuid, text) from public, anon, authenticated;
grant execute on function public._terapkan_max_denda_sp_sb(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2) SP: SP3 menggantikan SP2 jalur absen; denda warisan dihapus
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

    -- SP2 via absen EFEKTIF 3-4x. Mulai 14 Okt 2026 absen>=5 TIDAK lagi
    -- menagih SP2 — sudah naik ke SP3 (satu jenjang, bukan menumpuk).
    if v_absen_efektif >= 3 and v_absen_efektif < 5 then
      v_alasan := 'Absen ' || v_absen_efektif || 'x (setelah dikurangi izin/sakit disetujui) dalam bulan ' || p_bulan_key || '. Denda Rp 50.000 dikenakan.';
      if not v_sp2_triggered then
        perform public._catat_sp(r.user_id, p_bulan_key, 'SP2', v_alasan);
        perform public._catat_denda_sp_detail(r.user_id, p_bulan_key, 'SP2', v_alasan, 50000);
        v_count_sp := v_count_sp + 1;
      end if;
      -- CATATAN: dulu di sini ada perform public._tambah_denda_absen(..., 50000)
      -- = bug dobel aplikasi lama (gas/Code.gs:1457). DIHAPUS sesuai keputusan
      -- Ko 14 Okt 2026. Fungsi _tambah_denda_absen sengaja dibiarkan ada di
      -- database tapi tidak lagi dipanggil dari mana pun.
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
  'SP1 mingguan + SP2/SP3 bulanan. Absen dihitung EFEKTIF (absen fisik - izin/sakit DISETUJUI). 14 Okt 2026: absen 3-4x -> SP2 Rp50.000; absen >=5x -> SP3 Rp100.000 saja (naik jenjang, tidak menumpuk); denda warisan _tambah_denda_absen dihapus.';

-- ---------------------------------------------------------------------------
-- 3) Sanksi Berulang: tidak menumpuk dengan SP + bulan yang sudah membaik
--    membersihkan SB bulan itu juga
-- ---------------------------------------------------------------------------
create or replace function public.evaluasi_sanksi_berulang(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bulan_lalu text;
  v_hari_terakhir date;
  v_minggu text;
  v_ada_data boolean;
  v_telat integer;
  v_absen_fisik integer;
  v_izin integer;
  v_absen_efektif integer;
  v_bermasalah boolean;
  v_tingkat integer;
  v_tingkat_lalu integer;
  v_denda integer;
  v_alasan text;
  v_vonis integer := 0;
  v_membaik integer := 0;
  v_dibatalkan integer := 0;
  v_tidak_ditarik integer := 0;
  v_published boolean;
  r record;
  x record;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menghitung sanksi berulang' using errcode = '42501';
  end if;
  if p_bulan_key is null or p_bulan_key !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('success', false, 'msg', 'Bulan tidak valid (harus YYYY-MM).');
  end if;

  v_bulan_lalu := to_char((p_bulan_key || '-01')::date - interval '1 month', 'YYYY-MM');
  v_hari_terakhir := ((p_bulan_key || '-01')::date + interval '1 month - 1 day')::date;
  v_minggu := to_char(v_hari_terakhir, 'IYYY-"W"IW');

  for r in
    select p.id, p.nama from public.profiles p
     where p.status = 'AKTIF' and p.bagian not in ('Owner','Finance')
  loop
    -- Lewati karyawan yang belum punya data absensi sama sekali di bulan itu.
    select exists(select 1 from public.attendance_details d
                   where d.user_id = r.id and to_char(d.tanggal,'YYYY-MM') = p_bulan_key) into v_ada_data;
    if not v_ada_data then
      continue;
    end if;

    select count(*) into v_telat from public.attendance_details d
     where d.user_id = r.id and d.tipe = 'TELAT' and to_char(d.tanggal,'YYYY-MM') = p_bulan_key;
    select count(*) into v_absen_fisik from public.attendance_details d
     where d.user_id = r.id and d.tipe = 'ABSEN' and to_char(d.tanggal,'YYYY-MM') = p_bulan_key;
    select count(*) into v_izin from public.leave_requests lr
     where lr.user_id = r.id and lr.status = 'DISETUJUI' and to_char(lr.tanggal,'YYYY-MM') = p_bulan_key;
    v_absen_efektif := greatest(0, coalesce(v_absen_fisik, 0) - coalesce(v_izin, 0));
    v_bermasalah := (coalesce(v_telat, 0) >= 5) or (v_absen_efektif >= 3);

    if v_bermasalah then
      v_tingkat := 1;
      select s.tingkat into v_tingkat_lalu from public.sanksi_berulang s
       where s.user_id = r.id and s.bulan = v_bulan_lalu and s.status = 'AKTIF';
      if found then
        v_tingkat := coalesce(v_tingkat_lalu, 0) + 1;
      end if;
      v_denda := 50000 * v_tingkat;

      v_alasan := 'SB' || v_tingkat || ' – Sanksi Berulang bulan ke-' || v_tingkat ||
                  ': telat ' || coalesce(v_telat, 0) || 'x, absen efektif ' || v_absen_efektif || 'x pada ' || p_bulan_key ||
                  case when v_tingkat >= 2
                       then '. Denda Rp ' || to_char(v_denda, 'FM999G999G999') || ', uang kerajinan tidak dibayarkan.'
                       else '. Denda Rp ' || to_char(v_denda, 'FM999G999G999') || '.' end;

      insert into public.sanksi_berulang(user_id, bulan, tingkat, denda, kerajinan_hilang, telat, absen_efektif, alasan, status)
      values (r.id, p_bulan_key, v_tingkat, v_denda, v_tingkat >= 2, coalesce(v_telat, 0), v_absen_efektif, v_alasan, 'AKTIF')
      on conflict (user_id, bulan) do update
         set tingkat = excluded.tingkat,
             denda = excluded.denda,
             kerajinan_hilang = excluded.kerajinan_hilang,
             telat = excluded.telat,
             absen_efektif = excluded.absen_efektif,
             alasan = excluded.alasan,
             status = 'AKTIF';

      -- Tulis ulang HANYA baris denda SB bulan itu (idempotent kalau tombol
      -- proses ditekan ulang). Baris SP2/SP3 dibiarkan supaya helper di bawah
      -- bisa membandingkan mana yang lebih besar.
      delete from public.attendance_details d
       where d.user_id = r.id and d.tipe = 'DENDA_SP'
         and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
         and d.keterangan like 'SB%';
      insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
      values (r.id, v_minggu, v_hari_terakhir, null, 'DENDA_SP',
              'SB' || v_tingkat || ' – Sanksi Berulang bulan ke-' || v_tingkat ||
              ': telat ' || coalesce(v_telat, 0) || 'x, absen efektif ' || v_absen_efektif || 'x',
              v_denda, false);

      -- Denda SP dan SB tidak menumpuk: yang terbesar menang.
      perform public._terapkan_max_denda_sp_sb(r.id, p_bulan_key);

      v_vonis := v_vonis + 1;

      if v_tingkat >= 2 then
        insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (r.id, '⚠️ SB' || v_tingkat || ' – Sanksi Berulang', v_alasan, 'PERINGATAN', 's-notifikasi');
      end if;
    else
      -- Bulan membaik: batalkan denda tumpukan yang BELUM dibayar
      v_membaik := v_membaik + 1;

      -- Bulan INI sendiri juga dibersihkan kalau sebelumnya sempat ada SB
      -- (mis. izin disetujui lalu bulan diproses ulang).
      select exists(select 1 from public.payroll_runs pr
                     where pr.bulan = p_bulan_key and pr.status = 'PUBLISHED') into v_published;
      if not v_published then
        delete from public.attendance_details d
         where d.user_id = r.id and d.tipe = 'DENDA_SP'
           and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
           and d.keterangan like 'SB%';
        update public.sanksi_berulang set status = 'DIBATALKAN'
         where user_id = r.id and bulan = p_bulan_key and status = 'AKTIF';
        if found then
          v_dibatalkan := v_dibatalkan + 1;
          insert into public.notifications(user_id, judul, isi, tipe, menu)
          values (r.id, '✅ Sanksi Berulang Bulan Ini Dibatalkan',
                  'Bulan ' || p_bulan_key || ' tidak lagi bermasalah (telat ' || coalesce(v_telat, 0) || 'x, absen efektif ' ||
                  v_absen_efektif || 'x). Denda sanksi berulang bulan ini dibatalkan.',
                  'INFO', 's-notifikasi');
        end if;
      end if;

      for x in
        select s.id, s.bulan from public.sanksi_berulang s
         where s.user_id = r.id and s.bulan < p_bulan_key and s.status = 'AKTIF'
         order by s.bulan
      loop
        select exists(select 1 from public.payroll_runs pr
                       where pr.bulan = x.bulan and pr.status = 'PUBLISHED') into v_published;
        if v_published then
          v_tidak_ditarik := v_tidak_ditarik + 1;
        else
          delete from public.attendance_details d
           where d.user_id = r.id and d.tipe = 'DENDA_SP'
             and to_char(d.tanggal,'YYYY-MM') = x.bulan
             and d.keterangan like 'SB%';
          update public.sanksi_berulang set status = 'DIBATALKAN' where id = x.id;
          v_dibatalkan := v_dibatalkan + 1;
        end if;
      end loop;

      if v_dibatalkan > 0 then
        insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (r.id, '✅ Sanksi Berulang Dibatalkan',
                'Bulan ' || p_bulan_key || ' membaik (telat ' || coalesce(v_telat, 0) || 'x, absen efektif ' || v_absen_efektif ||
                'x). Denda sanksi berulang yang belum dibayar dibatalkan dan uang kerajinan kembali dibayarkan.',
                'INFO', 's-notifikasi');
      end if;
    end if;
  end loop;

  insert into public.audit_logs(actor, action, target, catatan)
  values (auth.uid(), 'EVALUASI_SANKSI_BERULANG', p_bulan_key,
          'Sanksi berulang: ' || v_vonis || ' sanksi dibuat, ' || v_dibatalkan || ' dibatalkan, ' ||
          v_tidak_ditarik || ' sudah dibayar (tidak ditarik)');

  return jsonb_build_object(
    'success', true,
    'bulan', p_bulan_key,
    'sanksi', v_vonis,
    'bulanMembaik', v_membaik,
    'dibatalkan', v_dibatalkan,
    'sudahDibayarTidakDitarik', v_tidak_ditarik
  );
end;
$$;

comment on function public.evaluasi_sanksi_berulang(text) is
  'Sanksi Berulang (SB) — keputusan Ko 2026-10-14: bulan bermasalah berturut-turut (telat>=5x atau absen efektif>=3x) dikenai denda 50rb x tingkat; kerajinan hilang sejak tingkat 2; bulan membaik membatalkan denda tumpukan yang belum dibayar. Sejak migrasi 0037 denda SB TIDAK menumpuk dengan denda SP (yang terbesar menang).';

revoke execute on function public.evaluasi_sanksi_berulang(text) from public, anon;
grant execute on function public.evaluasi_sanksi_berulang(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Izin disetujui: tetap turunkan/naikkan jenjang SP, tapi jangan
--    menumpuk SP2+SP3 dan jangan menghapus denda SB yang masih berlaku
-- ---------------------------------------------------------------------------
create or replace function public._evaluasi_sp_setelah_izin(p_user_id uuid, p_tanggal date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_bulan text := to_char(p_tanggal, 'YYYY-MM');
  v_total_absen_fisik integer;
  v_total_izin_disetujui integer;
  v_absen_efektif integer;
  v_ada_sp2 boolean;
  v_alasan_sp2 text;
begin
  select count(*) into v_total_absen_fisik from public.attendance_details
    where user_id = p_user_id and tipe = 'ABSEN' and to_char(tanggal, 'YYYY-MM') = v_bulan;

  select count(*) into v_total_izin_disetujui from public.leave_requests
    where user_id = p_user_id and status = 'DISETUJUI' and to_char(tanggal, 'YYYY-MM') = v_bulan;

  v_absen_efektif := greatest(0, v_total_absen_fisik - v_total_izin_disetujui);

  if v_absen_efektif >= 5 then
    -- SP3 tetap berlaku. Denda SP2 jalur absen dihapus supaya tidak menumpuk
    -- (keputusan Ko 14 Okt 2026: naik jenjang, bukan menumpuk).
    delete from public.attendance_details d
     where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
       and to_char(d.tanggal, 'YYYY-MM') = v_bulan
       and d.keterangan like 'SP2%' and d.keterangan like '%Absen%';

  elsif v_absen_efektif >= 3 then
    -- SP3 -> SP2
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    delete from public.attendance_details d
     where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
       and to_char(d.tanggal, 'YYYY-MM') = v_bulan
       and (d.keterangan like 'SP2%' or d.keterangan like 'SP3%');
    select exists(
      select 1 from public.warning_history where user_id = p_user_id and bulan = v_bulan and tipe_sp = 'SP2'
    ) into v_ada_sp2;
    v_alasan_sp2 := 'Absen efektif ' || v_absen_efektif || 'x setelah izin disetujui. Denda Rp 50.000 dikenakan.';
    if not v_ada_sp2 then
      perform public._catat_sp(p_user_id, v_bulan, 'SP2', v_alasan_sp2);
      insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (p_user_id, '⬇️ SP3 → SP2', 'SP3 dibatalkan. Absen efektif ' || v_absen_efektif || 'x → SP2 dikenakan. Denda Rp 50.000.', 'PERINGATAN', 's-notifikasi');
    end if;
    perform public._catat_denda_sp_detail(p_user_id, v_bulan, 'SP2', v_alasan_sp2, 50000);
    perform public._update_bintang_dari_skor(p_user_id, 2);

  elsif v_absen_efektif >= 2 then
    -- Turun ke SP1 -- hapus SP2 dan SP3, bebaskan lock bintang
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP2');
    delete from public.attendance_details d
     where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
       and to_char(d.tanggal, 'YYYY-MM') = v_bulan
       and (d.keterangan like 'SP2%' or d.keterangan like 'SP3%');
    perform public._update_bintang_dari_skor(p_user_id, 5);
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (p_user_id, '⬇️ SP Diturunkan ke SP1', 'Izin kamu disetujui. Absen efektif ' || v_absen_efektif || 'x → SP2/SP3 dibatalkan. Hanya SP1 yang berlaku. Tidak ada denda.', 'INFO', 's-izin');

  else
    -- Absen efektif < 2 -- semua SP dihapus
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP2');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP1');
    delete from public.attendance_details d
     where d.user_id = p_user_id and d.tipe = 'DENDA_SP'
       and to_char(d.tanggal, 'YYYY-MM') = v_bulan
       and (d.keterangan like 'SP2%' or d.keterangan like 'SP3%');
    perform public._update_bintang_dari_skor(p_user_id, 5);
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (p_user_id, '✅ Semua SP Dibatalkan', 'Izin kamu disetujui. Absen efektif ' || v_absen_efektif || 'x → tidak memenuhi syarat SP apapun. Semua denda SP dihapus.', 'INFO', 's-izin');
  end if;

  -- Denda SP dan SB tidak menumpuk: yang terbesar menang.
  perform public._terapkan_max_denda_sp_sb(p_user_id, v_bulan);
end;
$$;

comment on function public._evaluasi_sp_setelah_izin(uuid, date) is
  'Evaluasi ulang SP setelah izin disetujui (gas/Code.gs:4477-4604). Sejak migrasi 0037: denda SB tidak ikut terhapus (hanya denda SP), dan denda SP vs SB diambil yang terbesar.';
