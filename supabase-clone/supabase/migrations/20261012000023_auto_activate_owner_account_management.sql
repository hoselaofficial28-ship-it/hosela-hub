-- ============================================================================
-- Hosela Hub — pendaftaran langsung aktif + pemantauan akun khusus Owner
-- "Kick" berarti mencabut akses (NONAKTIF), bukan menghapus histori karyawan.
-- ============================================================================

-- Akun lama yang masih menunggu persetujuan ikut diaktifkan sesuai kebijakan baru.
update public.profiles
set status = 'AKTIF', updated_at = now()
where status = 'PENDING';

-- Pendaftaran baru langsung aktif.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama, bagian, jabatan, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'bagian', ''),
    coalesce(new.raw_user_meta_data->>'jabatan', ''),
    new.email,
    'AKTIF'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Role dari akun NONAKTIF tidak lagi berlaku pada RLS/RPC terlindungi.
create or replace function public.current_bagian()
returns text
language sql security definer stable set search_path = public as $$
  select bagian from public.profiles
  where id = auth.uid() and status = 'AKTIF';
$$;

-- Daftar akun lengkap hanya untuk Owner.
create or replace function public.get_owner_accounts()
returns table(
  id uuid,
  nama text,
  bagian text,
  jabatan text,
  email text,
  status text,
  created_at timestamptz,
  nonaktif_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh memantau akun' using errcode = '42501';
  end if;

  return query
    select p.id, p.nama, p.bagian, p.jabatan, p.email, p.status, p.created_at, p.nonaktif_at
    from public.profiles p
    order by p.created_at desc, p.nama asc;
end;
$$;

grant execute on function public.get_owner_accounts() to authenticated;

-- Owner dapat menonaktifkan atau mengaktifkan kembali akun. Akun Owner,
-- termasuk akun sendiri, sengaja dilindungi agar tidak terkunci tanpa sengaja.
create or replace function public.set_user_access(p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_nama text;
  v_bagian text;
  v_status text;
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh mengubah akses akun' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('success', false, 'msg', 'Akun Owner yang sedang dipakai tidak dapat dinonaktifkan');
  end if;

  select p.nama, p.bagian into v_nama, v_bagian
  from public.profiles p where p.id = p_user_id;

  if v_nama is null then
    return jsonb_build_object('success', false, 'msg', 'Akun tidak ditemukan');
  end if;
  if v_bagian = 'Owner' then
    return jsonb_build_object('success', false, 'msg', 'Akun Owner dilindungi dan tidak dapat diubah dari menu ini');
  end if;

  v_status := case when p_active then 'AKTIF' else 'NONAKTIF' end;
  update public.profiles
  set status = v_status,
      nonaktif_at = case when p_active then null else now() end,
      updated_at = now()
  where id = p_user_id;

  insert into public.audit_logs(actor, action, target, after_data, catatan)
  values (
    auth.uid(),
    case when p_active then 'REACTIVATE_USER' else 'DEACTIVATE_USER' end,
    p_user_id::text,
    jsonb_build_object('status', v_status),
    case when p_active then 'Akun diaktifkan kembali oleh Owner' else 'Akses akun dicabut oleh Owner; histori dipertahankan' end
  );

  return jsonb_build_object(
    'success', true,
    'nama', v_nama,
    'status', v_status,
    'msg', v_nama || case when p_active then ' berhasil diaktifkan kembali' else ' berhasil dinonaktifkan' end
  );
end;
$$;

grant execute on function public.set_user_access(uuid, boolean) to authenticated;

