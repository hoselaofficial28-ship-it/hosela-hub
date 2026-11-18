-- ============================================================================
-- Perbaikan fungsi simpan_shift_rentang (18 Nov 2026)
--
-- Bug pada versi pertama: penempatan yang MULAI setelah rentang (mis. Shift Pagi
-- mulai 17 Nov, berlaku_sampai kosong) ikut terhapus, padahal seharusnya tetap.
-- Perbaikan: hapus hanya penempatan yang benar-benar berada DI DALAM rentang.
--
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create or replace function public.simpan_shift_rentang(
  p_user_id uuid,
  p_mulai date,
  p_selesai date,
  p_shift_kode text,
  p_catatan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_tpl record;
  v_hari integer;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengatur shift' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Karyawan belum dipilih' using errcode = '22023';
  end if;
  if p_mulai is null or p_selesai is null then
    raise exception 'Tanggal mulai dan selesai wajib diisi' using errcode = '22023';
  end if;
  if p_selesai < p_mulai then
    raise exception 'Tanggal selesai harus sama atau setelah tanggal mulai' using errcode = '22023';
  end if;

  select p.nama into v_nama from public.profiles p where p.id = p_user_id;
  if v_nama is null then
    raise exception 'Karyawan tidak ditemukan' using errcode = 'P0002';
  end if;

  select s.id, s.kode, s.nama, s.jam_masuk, s.jam_pulang into v_tpl
    from public.work_shift_templates s
   where upper(s.kode) = upper(btrim(coalesce(p_shift_kode, ''))) and s.aktif
   limit 1;
  if v_tpl.id is null then
    raise exception 'Shift "%" tidak ada', coalesce(p_shift_kode, '') using errcode = '22023';
  end if;

  v_hari := (p_selesai - p_mulai) + 1;

  -- 1) simpan sisa KANAN dari penempatan yang menyeberang melewati rentang
  insert into public.employee_shift_assignments(
    user_id, shift_id, shift_name, jam_masuk, jam_pulang, berlaku_mulai, berlaku_sampai, catatan, created_by
  )
  select a.user_id, a.shift_id, a.shift_name, a.jam_masuk, a.jam_pulang,
         p_selesai + 1, a.berlaku_sampai, coalesce(a.catatan, ''), v_uid
    from public.employee_shift_assignments a
   where a.user_id = p_user_id
     and a.berlaku_mulai <= p_selesai
     and (a.berlaku_sampai is null or a.berlaku_sampai > p_selesai)
  on conflict (user_id, berlaku_mulai) do nothing;

  -- 2) potong sisa KIRI (yang mulai sebelum rentang)
  update public.employee_shift_assignments
     set berlaku_sampai = p_mulai - 1, updated_at = now()
   where user_id = p_user_id
     and berlaku_mulai < p_mulai
     and (berlaku_sampai is null or berlaku_sampai >= p_mulai);

  -- 3) hapus HANYA penempatan yang seluruhnya berada di dalam rentang
  delete from public.employee_shift_assignments
   where user_id = p_user_id
     and berlaku_mulai >= p_mulai
     and berlaku_mulai <= p_selesai
     and (berlaku_sampai is null or berlaku_sampai <= p_selesai);

  -- 4) pengecualian harian di dalam rentang dihapus agar rentang berlaku
  delete from public.employee_shift_overrides o
   where o.user_id = p_user_id and o.tanggal between p_mulai and p_selesai;

  -- 5) pasang rentang baru
  insert into public.employee_shift_assignments(
    user_id, shift_id, shift_name, jam_masuk, jam_pulang, berlaku_mulai, berlaku_sampai, catatan, created_by
  ) values (
    p_user_id, v_tpl.id, v_tpl.nama, v_tpl.jam_masuk, v_tpl.jam_pulang, p_mulai, p_selesai,
    coalesce(nullif(btrim(coalesce(p_catatan, '')), ''), 'Diatur Owner (rentang tanggal)'), v_uid
  )
  on conflict (user_id, berlaku_mulai) do update
     set shift_id = excluded.shift_id,
         shift_name = excluded.shift_name,
         jam_masuk = excluded.jam_masuk,
         jam_pulang = excluded.jam_pulang,
         berlaku_sampai = excluded.berlaku_sampai,
         catatan = excluded.catatan,
         updated_at = now();

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (v_uid, 'ATUR_SHIFT_RENTANG', p_user_id::text,
          jsonb_build_object('shift', v_tpl.nama, 'mulai', p_mulai, 'selesai', p_selesai, 'hari', v_hari),
          'Atur shift ' || v_nama || ' (' || v_tpl.nama || ') ' || p_mulai || ' s/d ' || p_selesai);

  return jsonb_build_object(
    'success', true, 'nama', v_nama, 'shift', v_tpl.nama,
    'mulai', p_mulai, 'selesai', p_selesai, 'hari', v_hari,
    'jamMasuk', to_char(v_tpl.jam_masuk, 'HH24:MI'), 'jamPulang', to_char(v_tpl.jam_pulang, 'HH24:MI')
  );
end;
$$;

revoke execute on function public.simpan_shift_rentang(uuid, date, date, text, text) from public, anon;
grant execute on function public.simpan_shift_rentang(uuid, date, date, text, text) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
