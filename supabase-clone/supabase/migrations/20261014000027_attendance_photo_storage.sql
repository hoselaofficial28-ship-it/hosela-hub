-- ============================================================================
-- Hosela Hub — Supabase Clone — Penyimpanan Foto Absensi Kamera
-- ============================================================================
-- Foto TIDAK disimpan di PostgreSQL (aturan 03-ARSITEKTUR-DATA.md: jangan simpan
-- base64 di database). Yang disimpan hanya metadata + tautan file.
--
-- Keputusan Ko 2026-10-14: foto disimpan di Firebase Storage (bucket baru),
-- bukan Google Drive — alasannya service account tidak punya kuota di Drive
-- pribadi (403 storageQuotaExceeded). Catatan lengkap: DECISION-LOG.md dan
-- docs/clone-supabase/08-SETUP-FIREBASE-FOTO.md.
--
-- RPC di bawah WAJIB dipakai (bukan update langsung dari browser), karena:
--   1) karyawan tidak punya hak update pada attendance_events (RLS);
--   2) pemilik baris, status tap, dan status unggah diperiksa di server;
--   3) retry tidak boleh menimpa foto yang sudah tersimpan.
-- Kolom drive_* yang lama dibiarkan utuh supaya bisa dipakai lagi kalau suatu
-- saat foto dipindahkan ke Google Drive.
-- ============================================================================

alter table public.attendance_events
  add column if not exists photo_provider text,
  add column if not exists photo_path text,
  add column if not exists photo_url text,
  add column if not exists captured_at timestamptz,
  add column if not exists uploaded_at timestamptz;

comment on column public.attendance_events.photo_provider is 'Asal penyimpanan file: FIREBASE (aktif) atau DRIVE (cadangan).';
comment on column public.attendance_events.photo_path is 'Lokasi file di dalam bucket, mis. absensi/2026-10/20261014-083012_MASUK_<uuid>.jpg';
comment on column public.attendance_events.photo_url is 'Tautan unduh foto (dipakai aplikasi untuk menampilkan bukti).';
comment on column public.attendance_events.captured_at is 'Waktu foto diambil di perangkat karyawan.';
comment on column public.attendance_events.uploaded_at is 'Waktu file foto berhasil tersimpan di penyimpanan.';

-- ---------------------------------------------------------------------------
-- Simpan metadata foto setelah unggahan berhasil.
-- Dipanggil dengan token karyawan sendiri (auth.uid()), jadi hanya boleh
-- menyentuh baris absensi miliknya, hanya untuk tap DITERIMA, dan tidak boleh
-- menimpa foto yang sudah UPLOADED (retry aman / idempotent).
-- ---------------------------------------------------------------------------
create or replace function public.attach_absensi_photo(
  p_event_id uuid,
  p_path text,
  p_url text,
  p_mime text default 'image/jpeg',
  p_size integer default null,
  p_sha256 text default null,
  p_provider text default 'FIREBASE',
  p_captured_at timestamptz default null
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
    return jsonb_build_object('success', true, 'msg', 'Foto absensi sudah tersimpan sebelumnya.',
      'url', v_row.photo_url, 'path', v_row.photo_path);
  end if;
  if v_row.status <> 'DITERIMA' then
    return jsonb_build_object('success', false, 'msg', 'Absensi ini ditolak, foto tidak disimpan.');
  end if;
  if p_path is null or length(btrim(p_path)) < 5 then
    return jsonb_build_object('success', false, 'msg', 'Lokasi file foto tidak valid.');
  end if;
  if p_url is not null and p_url !~ '^https://firebasestorage\.googleapis\.com/' then
    return jsonb_build_object('success', false, 'msg', 'Tautan foto tidak dikenali.');
  end if;

  update public.attendance_events
     set photo_provider = coalesce(nullif(btrim(coalesce(p_provider, '')), ''), 'FIREBASE'),
         photo_path     = btrim(p_path),
         photo_url      = p_url,
         mime_type      = coalesce(nullif(btrim(coalesce(p_mime, '')), ''), 'image/jpeg'),
         file_size      = p_size,
         sha256         = p_sha256,
         captured_at    = coalesce(p_captured_at, captured_at),
         uploaded_at    = now(),
         upload_status  = 'UPLOADED',
         upload_error   = null,
         catatan        = btrim(coalesce(catatan, '') || ' | foto tersimpan di penyimpanan')
   where id = p_event_id;

  return jsonb_build_object('success', true, 'msg', 'Foto absensi tersimpan.', 'url', p_url, 'path', p_path);
end;
$$;
grant execute on function public.attach_absensi_photo(uuid, text, text, text, integer, text, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Catat kegagalan unggah apa adanya (pesan asli dari penyimpanan) supaya bisa
-- ditampilkan di aplikasi dan ditelusuri, bukan gagal diam-diam.
-- ---------------------------------------------------------------------------
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
         upload_error  = left(coalesce(nullif(btrim(coalesce(p_error, '')), ''), 'Penyebab tidak diketahui'), 500)
   where id = p_event_id;

  return jsonb_build_object('success', true, 'msg', 'Kegagalan foto dicatat.');
end;
$$;
grant execute on function public.mark_absensi_photo_failed(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Ringkasan untuk Owner/Finance: berapa tap yang fotonya belum tersimpan.
-- RLS attendance_events sudah membatasi: karyawan hanya melihat dirinya,
-- Owner/Finance melihat semua.
-- ---------------------------------------------------------------------------
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
    'foto_gagal', count(*) filter (where e.upload_status = 'FAILED')
  )
  from batas b
  left join public.attendance_events e
    on e.tanggal >= b.awal and e.tanggal < (b.awal + interval '1 month')
   and (e.user_id = auth.uid() or public.is_payroll_admin());
$$;
grant execute on function public.get_absensi_photo_stats(text) to authenticated;
