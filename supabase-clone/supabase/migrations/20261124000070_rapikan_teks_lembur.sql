-- ============================================================================
-- Rapikan teks lembur (hilangkan angka desimal panjang) — 24 Nov 2026
--
-- Mesin rekap menulis keterangan "lembur 1.00000000000000000000 jam".
-- Sekarang ditulis rapi: "Pulang 19:00, lembur 60 menit".
-- Data pengajuan yang sudah ada ikut dibersihkan.
-- Aman dijalankan berulang.
-- ============================================================================

begin;

-- 1) bersihkan keterangan pengajuan yang sudah tersimpan
update public.overtime_requests
   set keterangan = regexp_replace(
         regexp_replace(coalesce(keterangan, ''), 'lembur\s+[0-9.]+\s*jam', 'lembur ' || (menit_lembur / 60) || ' jam', 'gi'),
         ',\s*$', '')
 where keterangan ~ 'lembur\s+[0-9.]+\s*jam';

-- 2) trigger menulis keterangan rapi
create or replace function public._lembur_perlu_persetujuan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nama text;
  v_menit integer;
  v_ket text;
begin
  if new.tipe <> 'LEMBUR_PULANG' then
    return new;
  end if;
  if coalesce(current_setting('app.lembur_disetujui', true), '0') = '1' then
    return new;
  end if;

  v_menit := greatest(0, (coalesce(new.nilai, 0) / 10000) * 30);
  v_ket := 'Pulang ' || to_char(coalesce(new.waktu, '18:00'::time), 'HH24:MI') ||
           ', lembur ' || v_menit || ' menit';

  insert into public.overtime_requests(user_id, tanggal, menit_lembur, reward, keterangan)
  values (new.user_id, new.tanggal, v_menit, coalesce(new.nilai, 0), v_ket)
  on conflict (user_id, tanggal) do update
    set menit_lembur = excluded.menit_lembur,
        reward = excluded.reward,
        keterangan = excluded.keterangan
    where public.overtime_requests.status = 'MENUNGGU';

  select p.nama into v_nama from public.profiles p where p.id = new.user_id;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
  select id, 'Pengajuan lembur pulang',
         coalesce(v_nama, 'Karyawan') || ' · ' || new.tanggal || ': ' || v_ket ||
         ' (Rp ' || to_char(coalesce(new.nilai,0), 'FM999G999G999') || ')',
         'INFO', 's-review-telat'
    from public.profiles
   where bagian = 'Owner' and status = 'AKTIF';

  return null;
end;
$$;

revoke all on function public._lembur_perlu_persetujuan() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';
