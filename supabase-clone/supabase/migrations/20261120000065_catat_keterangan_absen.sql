-- ============================================================================
-- Catatan alasan saat absensi (pilihan "Izin" pada popup shift)
-- 20 Nov 2026
--
-- Karyawan yang jam masuknya tidak cocok dengan shift bisa memilih "Izin" dan
-- menuliskan alasannya. Alasan disimpan pada catatan event absen MASUK hari itu
-- dan dicatat di audit log.
--
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create or replace function public.catat_keterangan_absen(p_tanggal date, p_catatan text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_catatan text := nullif(btrim(coalesce(p_catatan, '')), '');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_tanggal is null then
    raise exception 'Tanggal tidak valid' using errcode = '22023';
  end if;
  if v_catatan is null then
    raise exception 'Alasan wajib diisi' using errcode = '22023';
  end if;
  if length(v_catatan) > 300 then
    v_catatan := left(v_catatan, 300);
  end if;

  select e.id into v_id
    from public.attendance_events e
   where e.user_id = v_uid
     and e.tanggal = p_tanggal
     and e.tipe = 'MASUK'
   order by e.created_at desc
   limit 1;

  if v_id is null then
    raise exception 'Belum ada absen masuk pada tanggal itu' using errcode = 'P0002';
  end if;

  update public.attendance_events
     set catatan = case
                    when coalesce(catatan, '') = '' then 'Keterangan karyawan: ' || v_catatan
                    else catatan || ' | Keterangan karyawan: ' || v_catatan
                  end
   where id = v_id;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (v_uid, 'CATAT_KETERANGAN_ABSEN', v_uid::text,
          jsonb_build_object('tanggal', p_tanggal, 'catatan', v_catatan),
          'Karyawan mencatat alasan absensi: ' || v_catatan);

  return jsonb_build_object('success', true, 'tanggal', p_tanggal, 'catatan', v_catatan);
end;
$$;

comment on function public.catat_keterangan_absen(date, text) is
  'Menyimpan alasan karyawan pada absen masuk hari itu (dipakai pilihan "Izin" pada popup shift).';

revoke execute on function public.catat_keterangan_absen(date, text) from public, anon;
grant execute on function public.catat_keterangan_absen(date, text) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
