-- ============================================================================
-- Hosela Hub — Foto absensi di Supabase Storage privat
-- ============================================================================
-- Jalankan setelah migrasi 00027. Aman dijalankan berulang.
-- Foto maksimal 180 KB, JPEG, dan path wajib diawali UUID pemilik.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendance-photos', 'attendance-photos', false, 184320, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Produksi dapat belum pernah menjalankan migrasi foto Firebase 00027. Kolom
-- metadata ini karena itu dibuat juga di sini agar migrasi Supabase mandiri.
alter table public.attendance_events
  add column if not exists photo_provider text,
  add column if not exists photo_path text,
  add column if not exists photo_url text,
  add column if not exists captured_at timestamptz,
  add column if not exists uploaded_at timestamptz;

drop policy if exists "attendance photo upload sendiri" on storage.objects;
create policy "attendance photo upload sendiri"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'attendance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg')
);

drop policy if exists "attendance photo retry sendiri" on storage.objects;
create policy "attendance photo retry sendiri"
on storage.objects for update to authenticated
using (
  bucket_id = 'attendance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'attendance-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg')
);

drop policy if exists "attendance photo baca sesuai akses" on storage.objects;
create policy "attendance photo baca sesuai akses"
on storage.objects for select to authenticated
using (
  bucket_id = 'attendance-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_payroll_admin()
  )
);

-- UPDATE hanya untuk retry file pada folder sendiri. Tidak ada policy DELETE
-- untuk browser; penghapusan sesuai masa retensi hanya dilakukan Edge Function dengan
-- service_role yang tidak pernah dikirim ke HP.

alter table public.attendance_events
  drop constraint if exists attendance_events_upload_status_check;
alter table public.attendance_events
  add constraint attendance_events_upload_status_check
  check (upload_status in ('PENDING','UPLOADED','FAILED','EXPIRED'));

comment on column public.attendance_events.photo_provider is
  'Asal file: SUPABASE (aktif), FIREBASE/DRIVE hanya kompatibilitas arsip lama.';
comment on column public.attendance_events.photo_path is
  'Path privat di bucket attendance-photos; tautan baca dibuat sementara saat dibuka.';
comment on column public.attendance_events.photo_url is
  'Tautan lama. Foto Supabase privat tidak menyimpan URL permanen.';

create or replace function public.attach_absensi_photo(
  p_event_id uuid,
  p_path text,
  p_url text default null,
  p_mime text default 'image/jpeg',
  p_size integer default null,
  p_sha256 text default null,
  p_provider text default 'SUPABASE',
  p_captured_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.attendance_events;
  v_provider text := upper(coalesce(nullif(btrim(p_provider), ''), 'SUPABASE'));
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_event_id is null then
    return jsonb_build_object('success', false, 'msg', 'ID absensi tidak dikirim.');
  end if;

  select * into v_row from public.attendance_events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Data absensi tidak ditemukan.');
  end if;
  if v_row.user_id <> v_uid then
    return jsonb_build_object('success', false, 'msg', 'Data absensi ini bukan milik pengguna yang login.');
  end if;
  if v_row.upload_status = 'UPLOADED' then
    return jsonb_build_object('success', true, 'msg', 'Foto absensi sudah tersimpan sebelumnya.',
      'url', v_row.photo_url, 'path', v_row.photo_path);
  end if;
  if v_row.status <> 'DITERIMA' then
    return jsonb_build_object('success', false, 'msg', 'Absensi ini ditolak, foto tidak disimpan.');
  end if;
  if p_path is null or length(btrim(p_path)) < 5 then
    return jsonb_build_object('success', false, 'msg', 'Lokasi file foto tidak valid.');
  end if;
  if v_provider not in ('SUPABASE','FIREBASE','DRIVE') then
    return jsonb_build_object('success', false, 'msg', 'Penyedia penyimpanan tidak dikenali.');
  end if;
  if v_provider = 'SUPABASE' and split_part(btrim(p_path), '/', 1) <> v_uid::text then
    return jsonb_build_object('success', false, 'msg', 'Folder foto tidak sesuai pemilik absensi.');
  end if;
  if v_provider = 'SUPABASE' and p_url is not null and btrim(p_url) <> '' then
    return jsonb_build_object('success', false, 'msg', 'Foto privat tidak boleh menyimpan URL permanen.');
  end if;
  if v_provider = 'FIREBASE' and p_url is not null
     and p_url !~ '^https://firebasestorage\.googleapis\.com/' then
    return jsonb_build_object('success', false, 'msg', 'Tautan Firebase tidak dikenali.');
  end if;
  if coalesce(p_size, 0) > 184320 then
    return jsonb_build_object('success', false, 'msg', 'Ukuran foto melebihi 180 KB.');
  end if;

  update public.attendance_events
     set photo_provider = v_provider,
         photo_path     = btrim(p_path),
         photo_url      = nullif(btrim(coalesce(p_url, '')), ''),
         mime_type      = coalesce(nullif(btrim(coalesce(p_mime, '')), ''), 'image/jpeg'),
         file_size      = p_size,
         sha256         = p_sha256,
         captured_at    = coalesce(p_captured_at, captured_at),
         uploaded_at    = now(),
         upload_status  = 'UPLOADED',
         upload_error   = null,
         catatan        = btrim(coalesce(catatan, '') || ' | foto tersimpan di Supabase')
   where id = p_event_id;

  return jsonb_build_object('success', true, 'msg', 'Foto absensi tersimpan.',
    'url', null, 'path', p_path, 'provider', v_provider);
end;
$$;

grant execute on function public.attach_absensi_photo(uuid, text, text, text, integer, text, text, timestamptz)
  to authenticated, service_role;

create or replace function public.mark_absensi_photo_failed(
  p_event_id uuid,
  p_error text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.attendance_events;
begin
  if v_uid is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_event_id is null then
    return jsonb_build_object('success', false, 'msg', 'ID absensi tidak dikirim.');
  end if;

  select * into v_row from public.attendance_events where id = p_event_id for update;
  if not found then
    return jsonb_build_object('success', false, 'msg', 'Data absensi tidak ditemukan.');
  end if;
  if v_row.user_id <> v_uid then
    return jsonb_build_object('success', false, 'msg', 'Data absensi ini bukan milik pengguna yang login.');
  end if;
  if v_row.upload_status = 'UPLOADED' then
    return jsonb_build_object('success', true, 'msg', 'Foto sudah tersimpan, status gagal diabaikan.');
  end if;

  update public.attendance_events
     set upload_status = 'FAILED',
         upload_error = left(coalesce(nullif(btrim(coalesce(p_error, '')), ''), 'Penyebab tidak diketahui'), 500)
   where id = p_event_id;

  return jsonb_build_object('success', true, 'msg', 'Kegagalan foto dicatat.');
end;
$$;

grant execute on function public.mark_absensi_photo_failed(uuid, text)
  to authenticated, service_role;

create or replace function public.get_absensi_photo_stats(p_bulan_key text default null)
returns jsonb
language sql stable security definer set search_path = public as $$
  with batas as (
    select case
      when p_bulan_key ~ '^\d{4}-\d{2}$' then to_date(p_bulan_key || '-01', 'YYYY-MM-DD')
      else date_trunc('month', (now() at time zone 'Asia/Jakarta')::date)::date
    end as awal
  )
  select jsonb_build_object(
    'bulan', to_char(b.awal, 'YYYY-MM'),
    'total_tap_kamera', count(*) filter (where e.source = 'CAMERA' and e.status = 'DITERIMA'),
    'foto_tersimpan', count(*) filter (where e.upload_status = 'UPLOADED'),
    'foto_tertunda', count(*) filter (where e.upload_status = 'PENDING'),
    'foto_gagal', count(*) filter (where e.upload_status = 'FAILED'),
    'foto_kedaluwarsa', count(*) filter (where e.upload_status = 'EXPIRED')
  )
  from batas b
  left join public.attendance_events e
    on e.tanggal >= b.awal and e.tanggal < (b.awal + interval '1 month')
   and (e.user_id = auth.uid() or public.is_payroll_admin())
  group by b.awal;
$$;

grant execute on function public.get_absensi_photo_stats(text) to authenticated, service_role;

notify pgrst, 'reload schema';
