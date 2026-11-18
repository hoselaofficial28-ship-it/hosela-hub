-- ============================================================================
-- Atur shift per tanggal lewat kalender (18 Nov 2026)
--
-- Owner memilih beberapa tanggal pada kalender, lalu menetapkan shift untuk
-- tanggal-tanggal itu saja (Pagi/Siang) atau mengosongkannya (ikut penempatan).
-- Disimpan sebagai pengecualian harian (employee_shift_overrides) sehingga tidak
-- merusak penempatan berkala.
--
-- Aman dijalankan berulang.
-- ============================================================================

begin;

create or replace function public.simpan_shift_harian(p_user_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_nama text;
  v_item jsonb;
  v_tgl date;
  v_kode text;
  v_tpl record;
  v_set integer := 0;
  v_hapus integer := 0;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengatur shift' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Karyawan belum dipilih' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Daftar tanggal tidak valid' using errcode = '22023';
  end if;

  select p.nama into v_nama from public.profiles p where p.id = p_user_id;
  if v_nama is null then
    raise exception 'Karyawan tidak ditemukan' using errcode = 'P0002';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tgl := nullif(v_item->>'tanggal', '')::date;
    v_kode := nullif(btrim(coalesce(v_item->>'kode', '')), '');
    continue when v_tgl is null;

    if v_kode is null then
      delete from public.employee_shift_overrides o
       where o.user_id = p_user_id and o.tanggal = v_tgl;
      v_hapus := v_hapus + 1;
    else
      select s.id, s.nama, s.jam_masuk, s.jam_pulang into v_tpl
        from public.work_shift_templates s
       where upper(s.kode) = upper(v_kode) and s.aktif
       limit 1;
      if v_tpl.id is null then
        raise exception 'Shift "%" tidak ada', v_kode using errcode = '22023';
      end if;

      insert into public.employee_shift_overrides(
        user_id, shift_id, shift_name, jam_masuk, jam_pulang, tanggal, catatan, created_by
      ) values (
        p_user_id, v_tpl.id, v_tpl.nama, v_tpl.jam_masuk, v_tpl.jam_pulang, v_tgl,
        'Diatur Owner lewat kalender shift', v_uid
      )
      on conflict (user_id, tanggal) do update
         set shift_id = excluded.shift_id,
             shift_name = excluded.shift_name,
             jam_masuk = excluded.jam_masuk,
             jam_pulang = excluded.jam_pulang,
             catatan = excluded.catatan,
             updated_at = now();
      v_set := v_set + 1;
    end if;
  end loop;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (v_uid, 'ATUR_SHIFT_HARIAN', p_user_id::text,
          jsonb_build_object('diatur', v_set, 'dikosongkan', v_hapus),
          'Atur shift harian ' || v_nama || ': ' || v_set || ' tanggal, ' || v_hapus || ' dikosongkan');

  return jsonb_build_object('success', true, 'nama', v_nama, 'diatur', v_set, 'dikosongkan', v_hapus);
end;
$$;

comment on function public.simpan_shift_harian(uuid, jsonb) is
  'Menyimpan shift untuk tanggal-tanggal tertentu (kalender) sebagai pengecualian harian. Kode kosong = hapus pengecualian.';

revoke execute on function public.simpan_shift_harian(uuid, jsonb) from public, anon;
grant execute on function public.simpan_shift_harian(uuid, jsonb) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
