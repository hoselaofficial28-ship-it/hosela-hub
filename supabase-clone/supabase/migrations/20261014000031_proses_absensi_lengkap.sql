-- ============================================================================
-- Hosela Hub — Proses absensi LENGKAP: rekap + SP + denda SP (satu tombol)
-- ============================================================================
-- KEPUTUSAN KO (14 Okt 2026, pilihan A):
--   Tombol "Proses ke Rekap Resmi" di menu Laporan Absensi sekaligus menghitung
--   SP1/SP2/SP3 beserta dendanya, supaya aturan "telat 5x sebulan → SP2 +
--   denda Rp50.000" benar-benar berjalan (sebelumnya fungsi SP ada tetapi
--   TIDAK PERNAH dipanggil dari aplikasi sehingga SP tidak pernah muncul).
--
--   Notifikasi ke karyawan juga dikirim saat SP dikenakan (pilihan Ko).
--
-- URUTAN PENTING (sejalan catatan di migrasi 20261005000008):
--   1) rekap absensi bulan itu dulu (denda telat, hadir/telat/absen) — selesai,
--   2) baru hitung SP + denda SP.
--   Kalau dibalik, denda SP bisa ter-reset oleh proses rekap.
--
-- ANTI-DOBEL (penting, ini BEDA dari kode lama):
--   Fungsi SP lama menambah baris SP/denda TANPA membersihkan yang lama. Karena
--   sekarang SP ikut jalan setiap kali tombol proses ditekan, menjalankan ulang
--   akan menggandakan SP & denda. Fungsi di bawah MENGHAPUS dulu SP + denda SP
--   bulan itu, baru menghitung ulang — jadi tekan tombol berkali-kali hasilnya
--   tetap sama. Notifikasi hanya dikirim untuk SP yang BARU (tidak spam saat
--   diulang). Perubahan ini dicatat di DECISION-LOG.md.
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
  r record;
  v_baru boolean;
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

  -- 0) RESET rekap mingguan bulan ini dulu (meniru aplikasi lama, gas/Code.gs:1167
  --    "Hapus ABSENSI_REKAP minggu-minggu yang masuk bulan ini").
  --    Tanpa ini, menekan tombol proses dua kali akan MENUMPUK hadir/telat/absen
  --    dan denda di attendance_weekly (proses rekap hanya menambah, tidak
  --    mengosongkan) sehingga SP dan angka slip jadi salah.
  delete from public.attendance_weekly
   where public._minggu_ke_bulan(minggu) = p_bulan_key;

  -- 1) Rekap absensi (denda telat, hadir/telat/absen, rekap mingguan)
  v_rekap := public.process_absensi_app_to_rekap(p_bulan_key);

  -- Simpan daftar SP lama supaya notifikasi tidak dikirim ulang saat diulang
  select coalesce(array_agg(w.tipe_sp || '|' || coalesce(w.alasan, '')), array[]::text[])
    into v_sebelum
    from public.warning_history w
   where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3');

  -- 2) Bersihkan SP + denda SP bulan itu, lalu hitung ulang dari nol
  delete from public.warning_history
   where bulan = p_bulan_key and tipe_sp in ('SP1', 'SP2', 'SP3');
  delete from public.attendance_details
   where tipe = 'DENDA_SP' and to_char(tanggal, 'YYYY-MM') = p_bulan_key;

  v_sp := public.process_sp_for_month(p_bulan_key);

  -- 3) Notifikasi hanya untuk SP yang benar-benar baru
  for r in
    select w.user_id, w.tipe_sp, w.alasan,
           coalesce((select sum(d.nilai) from public.attendance_details d
                      where d.user_id = w.user_id and d.tipe = 'DENDA_SP'
                        and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
                        and d.keterangan like w.tipe_sp || '%'), 0) as denda
      from public.warning_history w
     where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3')
  loop
    v_baru := not (v_sebelum @> array[r.tipe_sp || '|' || coalesce(r.alasan, '')]);
    if v_baru then
      insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (r.user_id,
              '⚠️ ' || r.tipe_sp || ' Dikenakan',
              r.alasan || case when coalesce(r.denda, 0) > 0
                               then ' Denda Rp ' || to_char(r.denda, 'FM999G999G999') || '.' else '' end,
              case when r.tipe_sp = 'SP1' then 'PERINGATAN' else 'SP' || right(r.tipe_sp, 1) end,
              's-notifikasi');
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'bulan', p_bulan_key,
    'rekapRows', coalesce(v_rekap->>'rekapRows', '0')::integer,
    'detailRows', coalesce(v_rekap->>'detailRows', '0')::integer,
    'spEntries', coalesce(v_sp->>'sp_entries', '0')::integer
  );
end;
$$;

comment on function public.process_absensi_lengkap(text) is
  'Proses absensi + SP + denda SP dalam satu langkah (keputusan Ko 2026-10-14). Bersihkan SP lama dulu supaya tidak dobel saat tombol ditekan berulang.';

revoke execute on function public.process_absensi_lengkap(text) from public, anon;
grant execute on function public.process_absensi_lengkap(text) to authenticated, service_role;

notify pgrst, 'reload schema';
