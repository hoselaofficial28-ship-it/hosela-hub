-- Hosela Hub — target Bagian mengikuti seluruh pilihan form pendaftaran.
-- Pengumuman boleh dibuat untuk Bagian yang belum memiliki akun aktif.

create or replace function public.add_pengumuman(
  p_judul text,
  p_isi text,
  p_kategori text,
  p_target_bagian text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_target text := coalesce(nullif(trim(p_target_bagian), ''), 'ALL');
  v_user_id uuid;
  v_allowed_targets text[] := array[
    'Gudang',
    'Live Streaming',
    'Content Creator',
    'Marketplace & Ecommerce',
    'Digital Marketing',
    'Customer Service',
    'Purchasing & Inventory',
    'Operasional & Fulfillment',
    'Keuangan & Administrasi',
    'HR & General Affairs',
    'Product & Merchandising'
  ];
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh membuat pengumuman' using errcode = '42501';
  end if;
  if trim(coalesce(p_judul, '')) = '' or trim(coalesce(p_isi, '')) = '' then
    return jsonb_build_object('success', false, 'msg', 'Judul dan isi wajib diisi.');
  end if;
  if p_kategori not in ('PENTING', 'INFO', 'UMUM') then
    return jsonb_build_object('success', false, 'msg', 'Kategori tidak valid.');
  end if;

  if v_target like 'USER:%' then
    begin
      v_user_id := substring(v_target from 6)::uuid;
    exception when others then
      return jsonb_build_object('success', false, 'msg', 'Penerima tidak valid.');
    end;
    if not exists (select 1 from public.profiles where id = v_user_id and status = 'AKTIF') then
      return jsonb_build_object('success', false, 'msg', 'Akun penerima tidak aktif atau tidak ditemukan.');
    end if;
  elsif v_target <> 'ALL' and not (v_target = any(v_allowed_targets)) then
    return jsonb_build_object('success', false, 'msg', 'Bagian penerima tidak valid.');
  end if;

  insert into public.announcements(judul, isi, kategori, target_bagian, dibuat_oleh)
    values (trim(p_judul), trim(p_isi), p_kategori, v_target, auth.uid());

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.add_pengumuman(text, text, text, text) to authenticated;
