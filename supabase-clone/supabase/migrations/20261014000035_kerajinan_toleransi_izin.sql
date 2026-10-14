-- ============================================================================
-- Kerajinan: hari SAKIT/IZIN yang DISETUJUI tidak menghilangkan uang kerajinan
-- ============================================================================
-- KEPUTUSAN KO (14 Okt 2026):
--   "Kalau dia izin sakit dan sudah disetujui Finance, maka dia tetap berhak
--    mendapat uang kerajinan (tidak hilang) — walaupun upah hari tidak masuknya
--    memang tidak ada karena kenyataannya tidak masuk. Toleransi kerajinannya
--    tetap ada, karena itu sakit."
--
-- Jadi syarat uang kerajinan berubah dari:
--   LAMA : absen FISIK harus 0 (aturan aplikasi lama, gas/Code.gs:2052)
--   BARU : absen EFEKTIF harus 0, yaitu absen fisik dikurangi izin/sakit yang
--          SUDAH DISETUJUI. Hari sakit yang suratnya disetujui tidak lagi
--          menghilangkan kerajinan; hari tidak masuk TANPA izin tetap menghilangkan.
--
-- Ditambah syarat Sanksi Berulang (migrasi 034): kerajinan hilang juga bila
-- karyawan kena SB tingkat 2 atau lebih pada bulan itu.
--
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.bonus_kerajinan_efektif(
  p_user_id uuid, p_bulan_key text, p_absen_fisik integer, p_bonus_setting integer
) returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  v_izin integer;
  v_absen_efektif integer;
begin
  -- Sanksi Berulang tingkat 2 ke atas: kerajinan tidak dibayarkan
  if exists (
    select 1 from public.sanksi_berulang s
     where s.user_id = p_user_id and s.bulan = p_bulan_key
       and s.status = 'AKTIF' and s.tingkat >= 2
  ) then
    return 0;
  end if;

  -- Hari tidak masuk yang SUDAH ada izin/sakit disetujui tidak dihitung absen
  select count(*) into v_izin
    from public.leave_requests lr
   where lr.user_id = p_user_id
     and lr.status = 'DISETUJUI'
     and to_char(lr.tanggal, 'YYYY-MM') = p_bulan_key;

  v_absen_efektif := greatest(0, coalesce(p_absen_fisik, 0) - coalesce(v_izin, 0));

  if v_absen_efektif > 0 then
    return 0;
  end if;
  return greatest(0, coalesce(p_bonus_setting, 0));
end;
$$;

comment on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) is
  'Uang kerajinan efektif (keputusan Ko 2026-10-14): dibayarkan bila absen EFEKTIF 0 (absen fisik dikurangi izin/sakit yang DISETUJUI) dan karyawan tidak kena Sanksi Berulang tingkat 2+. Berbeda dari aplikasi lama yang memakai absen fisik.';

revoke execute on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) from public, anon;
grant execute on function public.bonus_kerajinan_efektif(uuid, text, integer, integer) to service_role;

notify pgrst, 'reload schema';
