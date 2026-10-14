-- ============================================================================
-- SANKSI BERULANG (SB) — keputusan Ko, 14 Oktober 2026
-- ============================================================================
-- ATURAN (disetujui Ko):
--   Bulan disebut "bermasalah" kalau karyawan:
--     - TELAT 5x atau lebih dalam bulan itu, ATAU
--     - ABSEN EFEKTIF 3x atau lebih
--       (absen efektif = absen fisik - izin/sakit yang sudah DISETUJUI; jadi
--        hari yang tidak masuk karena sakit & suratnya disetujui TIDAK dihitung)
--
--   Tangga sanksi untuk bulan bermasalah BERTURUT-TURUT:
--     bulan ke-1 (SB1) : denda Rp50.000   (aturan lama, kerajinan tetap dibayar)
--     bulan ke-2 (SB2) : denda Rp100.000  + UANG KERAJINAN HILANG
--     bulan ke-3 (SB3) : denda Rp150.000  + kerajinan hilang
--     bulan ke-4 (SB4) : denda Rp200.000  + kerajinan hilang
--     dst: denda = Rp50.000 x tingkat (jadi +Rp50.000 setiap bulan)
--
--   Kalau ada satu bulan yang MEMBAIK (telat <5x DAN absen efektif <3x):
--     - hitungan kembali ke SB1 (bulan bermasalah berikutnya mulai Rp50.000)
--     - uang kerajinan kembali dibayarkan
--     - denda tumpukan DIBATALKAN, tetapi HANYA yang belum dibayar
--       (slip yang sudah PUBLISHED tidak diubah — keputusan Ko)
--
-- CATATAN: ini aturan BARU, berbeda dari aplikasi lama (dulu denda telat 5x
-- hanya Rp50.000 datar setiap bulan). Tercatat di docs/clone-supabase/DECISION-LOG.md.
--
-- Aman dijalankan berulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabel riwayat sanksi berulang (tingkat per karyawan per bulan, bisa diaudit)
-- ---------------------------------------------------------------------------
create table if not exists public.sanksi_berulang (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  bulan text not null,
  tingkat integer not null,
  denda integer not null default 0,
  kerajinan_hilang boolean not null default false,
  telat integer not null default 0,
  absen_efektif integer not null default 0,
  alasan text,
  status text not null default 'AKTIF' check (status in ('AKTIF', 'DIBATALKAN')),
  created_at timestamptz not null default now(),
  unique (user_id, bulan)
);

comment on table public.sanksi_berulang is
  'Sanksi Berulang (SB): bulan bermasalah berturut-turut (telat>=5x atau absen efektif>=3x). Denda = 50000 x tingkat, uang kerajinan hilang sejak tingkat 2.';

alter table public.sanksi_berulang enable row level security;
drop policy if exists "baca sanksi berulang sendiri" on public.sanksi_berulang;
create policy "baca sanksi berulang sendiri" on public.sanksi_berulang for select
  using (user_id = auth.uid() or public.is_payroll_admin());

grant select on public.sanksi_berulang to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Uang kerajinan: 0 kalau bulan itu kena SB tingkat 2 atau lebih
--    (dipakai get_rekap_bulanan_semua — satu-satunya sumber angka kerajinan
--     yang dipakai slip & pratinjau penggajian)
-- ---------------------------------------------------------------------------
create or replace function public.bonus_kerajinan_efektif(
  p_user_id uuid, p_bulan_key text, p_absen_fisik integer, p_bonus_setting integer
) returns integer
language sql stable security definer set search_path = public as $$
  select case
    when exists (
      select 1 from public.sanksi_berulang s
       where s.user_id = p_user_id and s.bulan = p_bulan_key
         and s.status = 'AKTIF' and s.tingkat >= 2
    ) then 0
    else public.calc_bonus_kerajinan(p_absen_fisik, p_bonus_setting)
  end;
$$;

comment on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) is
  'Bonus kerajinan efektif: tetap memakai syarat lama (absen harus 0) TETAPI jadi 0 juga bila karyawan kena Sanksi Berulang tingkat 2 atau lebih pada bulan itu.';

revoke execute on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) from public, anon;
grant execute on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Rekap bulanan: kerajinan memakai aturan baru di atas
--    (satu baris yang diubah dari versi sebelumnya; sisanya identik)
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

-- ---------------------------------------------------------------------------
-- 4) Hitung sanksi berulang untuk satu bulan
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

      -- Tulis ulang baris denda bulan itu (idempotent kalau tombol proses ditekan ulang)
      delete from public.attendance_details d
       where d.user_id = r.id and d.tipe = 'DENDA_SP'
         and to_char(d.tanggal,'YYYY-MM') = p_bulan_key
         and (d.keterangan like 'SB%' or d.keterangan like 'SP2%');
      insert into public.attendance_details(user_id, minggu, tanggal, waktu, tipe, keterangan, nilai, is_generated)
      values (r.id, v_minggu, v_hari_terakhir, null, 'DENDA_SP',
              'SB' || v_tingkat || ' – Sanksi Berulang bulan ke-' || v_tingkat ||
              ': telat ' || coalesce(v_telat, 0) || 'x, absen efektif ' || v_absen_efektif || 'x',
              v_denda, false);
      v_vonis := v_vonis + 1;

      if v_tingkat >= 2 then
        insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (r.id, '⚠️ SB' || v_tingkat || ' – Sanksi Berulang', v_alasan, 'PERINGATAN', 's-notifikasi');
      end if;
    else
      -- Bulan membaik: batalkan denda tumpukan yang BELUM dibayar
      v_membaik := v_membaik + 1;
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
  'Sanksi Berulang (SB) — keputusan Ko 2026-10-14: bulan bermasalah berturut-turut (telat>=5x atau absen efektif>=3x) dikenai denda 50rb x tingkat; kerajinan hilang sejak tingkat 2; bulan membaik membatalkan denda tumpukan yang belum dibayar.';

revoke execute on function public.evaluasi_sanksi_berulang(text) from public, anon;
grant execute on function public.evaluasi_sanksi_berulang(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Tombol "Proses ke Rekap Resmi": rekap -> SP -> Sanksi Berulang
-- ---------------------------------------------------------------------------
create or replace function public.process_absensi_lengkap(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rekap jsonb;
  v_sp jsonb;
  v_sb jsonb;
  v_sebelum text[];
  v_bulan_start date;
  v_bulan_end date;
  r record;
  v_baru boolean;
  v_diperiksa integer := 0;
  v_notif integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses absensi' using errcode = '42501';
  end if;
  if p_bulan_key is null or p_bulan_key !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('success', false, 'msg', 'Bulan tidak valid (harus YYYY-MM).');
  end if;

  v_bulan_start := (p_bulan_key || '-01')::date;
  v_bulan_end := (v_bulan_start + interval '1 month - 1 day')::date;

  -- 0) Reset semua minggu yang menyentuh bulan ini (anti tumpuk saat diulang)
  delete from public.attendance_weekly
   where minggu in (
     select distinct to_char(d, 'IYYY-"W"IW')
       from generate_series(v_bulan_start, v_bulan_end, interval '1 day') d
   );

  -- 1) Rekap absensi
  v_rekap := public.process_absensi_app_to_rekap(p_bulan_key);
  if coalesce((v_rekap->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'msg', coalesce(v_rekap->>'msg', 'Rekap absensi gagal diproses.'));
  end if;

  select coalesce(array_agg(w.tipe_sp || '|' || coalesce(w.alasan, '')), array[]::text[])
    into v_sebelum
    from public.warning_history w
   where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3');

  -- 2) SP bulanan dihitung ulang dari nol
  delete from public.warning_history
   where bulan = p_bulan_key and tipe_sp in ('SP1', 'SP2', 'SP3');
  delete from public.attendance_details
   where tipe = 'DENDA_SP' and to_char(tanggal, 'YYYY-MM') = p_bulan_key;

  v_sp := public.process_sp_for_month(p_bulan_key);

  -- 3) Notifikasi SP hanya untuk SP baru
  for r in
    select w.user_id, w.tipe_sp, w.alasan,
           coalesce((select sum(d.nilai) from public.attendance_details d
                      where d.user_id = w.user_id and d.tipe = 'DENDA_SP'
                        and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
                        and d.keterangan like w.tipe_sp || '%'), 0) as denda
      from public.warning_history w
     where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3')
  loop
    v_diperiksa := v_diperiksa + 1;
    v_baru := not (coalesce(v_sebelum, array[]::text[]) @> array[r.tipe_sp || '|' || coalesce(r.alasan, '')]);
    if v_baru then
      insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (r.user_id,
              '⚠️ ' || r.tipe_sp || ' Dikenakan',
              r.alasan || case when coalesce(r.denda, 0) > 0
                               then ' Denda Rp ' || to_char(r.denda, 'FM999G999G999') || '.' else '' end,
              case when r.tipe_sp = 'SP1' then 'PERINGATAN' else 'SP' || right(r.tipe_sp, 1) end,
              's-notifikasi');
      v_notif := v_notif + 1;
    end if;
  end loop;

  -- 4) Sanksi Berulang (SB) — dihitung paling akhir supaya memakai angka SP/rekap final
  v_sb := public.evaluasi_sanksi_berulang(p_bulan_key);

  return jsonb_build_object(
    'success', true,
    'bulan', p_bulan_key,
    'rekapRows', coalesce(v_rekap->>'rekapRows', '0')::integer,
    'detailRows', coalesce(v_rekap->>'detailRows', '0')::integer,
    'spEntries', coalesce(v_sp->>'sp_entries', '0')::integer,
    'sanksiBerulang', coalesce(v_sb->>'sanksi', '0')::integer,
    'sbDibatalkan', coalesce(v_sb->>'dibatalkan', '0')::integer,
    -- diagnosa
    'spDiperiksa', v_diperiksa,
    'notifDikirim', v_notif,
    'spSebelumnya', to_jsonb(coalesce(v_sebelum, array[]::text[]))
  );
end;
$$;

comment on function public.process_absensi_lengkap(text) is
  'Proses absensi + SP + denda + notifikasi + Sanksi Berulang (SB) dalam satu langkah (keputusan Ko 2026-10-14).';

revoke execute on function public.process_absensi_lengkap(text) from public, anon;
grant execute on function public.process_absensi_lengkap(text) to authenticated, service_role;

notify pgrst, 'reload schema';
