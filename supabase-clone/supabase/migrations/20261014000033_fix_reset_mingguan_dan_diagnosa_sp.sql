-- ============================================================================
-- PERBAIKAN (14 Okt 2026) — rekap mingguan lintas bulan + diagnosa notifikasi SP
-- ============================================================================
-- TEMUAN SAAT UJI NYATA (akun Owner, skenario 5x telat):
--  1) Memproses ulang bulan yang sama MASIH menumpuk angka di attendance_weekly
--     untuk minggu yang melintasi batas bulan. Contoh nyata: minggu 2026-W40
--     (28 Sep - 4 Okt) berisi tanggal 1-3 Oktober; karena Senin minggu itu jatuh
--     di bulan September, `_minggu_ke_bulan('2026-W40') = '2026-09'` sehingga
--     minggu itu TIDAK ikut dibersihkan. Hasil uji: hadir minggu W40 membengkak
--     6 -> 9 -> 12 setiap kali proses diulang.
--     PERBAIKAN: bersihkan SEMUA minggu yang menyentuh bulan itu (bukan hanya
--     yang Senin-nya di bulan itu).
--  2) Notifikasi SP tidak terbentuk walau SP-nya baru. Untuk menelusuri, fungsi
--     ini sekarang mengembalikan nilai diagnosa: daftar SP sebelum proses,
--     jumlah baris SP yang diperiksa, dan jumlah notifikasi yang dikirim.
--
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.process_absensi_lengkap(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rekap jsonb;
  v_sp jsonb;
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

  -- 0) RESET semua minggu yang MENYENTUH bulan ini (termasuk minggu lintas bulan).
  --    Tanpa ini, menekan tombol proses dua kali menumpuk hadir/telat/absen/denda.
  delete from public.attendance_weekly
   where minggu in (
     select distinct to_char(d, 'IYYY-"W"IW')
       from generate_series(v_bulan_start, v_bulan_end, interval '1 day') d
   );

  -- 1) Rekap absensi. Kalau data absensi bulan ini kosong, hentikan dan sampaikan
  --    pesan aslinya (jangan lanjut menghitung SP).
  v_rekap := public.process_absensi_app_to_rekap(p_bulan_key);
  if coalesce((v_rekap->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'msg', coalesce(v_rekap->>'msg', 'Rekap absensi gagal diproses.'));
  end if;

  -- Daftar SP yang sudah ada SEBELUM dihitung ulang (untuk mencegah notifikasi ganda)
  select coalesce(array_agg(w.tipe_sp || '|' || coalesce(w.alasan, '')), array[]::text[])
    into v_sebelum
    from public.warning_history w
   where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3');

  -- 2) Bersihkan SP + denda SP bulan itu, lalu hitung ulang dari nol (anti-dobel)
  delete from public.warning_history
   where bulan = p_bulan_key and tipe_sp in ('SP1', 'SP2', 'SP3');
  delete from public.attendance_details
   where tipe = 'DENDA_SP' and to_char(tanggal, 'YYYY-MM') = p_bulan_key;

  v_sp := public.process_sp_for_month(p_bulan_key);

  -- 3) Notifikasi untuk SP yang benar-benar baru
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

  return jsonb_build_object(
    'success', true,
    'bulan', p_bulan_key,
    'rekapRows', coalesce(v_rekap->>'rekapRows', '0')::integer,
    'detailRows', coalesce(v_rekap->>'detailRows', '0')::integer,
    'spEntries', coalesce(v_sp->>'sp_entries', '0')::integer,
    -- diagnosa (untuk memastikan notifikasi & anti-dobel benar-benar jalan)
    'spDiperiksa', v_diperiksa,
    'notifDikirim', v_notif,
    'spSebelumnya', to_jsonb(coalesce(v_sebelum, array[]::text[]))
  );
end;
$$;

comment on function public.process_absensi_lengkap(text) is
  'Proses absensi + SP + denda SP + notifikasi SP dalam satu langkah (keputusan Ko 2026-10-14). 14 Okt: reset rekap mingguan diperbaiki agar minggu lintas bulan ikut dibersihkan (dulu menumpuk 6->9->12).';

revoke execute on function public.process_absensi_lengkap(text) from public, anon;
grant execute on function public.process_absensi_lengkap(text) to authenticated, service_role;

notify pgrst, 'reload schema';
