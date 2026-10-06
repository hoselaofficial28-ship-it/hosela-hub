-- ============================================================================
-- Hosela Hub — Supabase Clone — Pengumuman, Ide Tim, Kalender Libur, Notifikasi
-- ============================================================================
-- Peraturan (rules) dan sebagian besar operasi di sini TIDAK butuh RPC sama
-- sekali -- RLS (migration 0002) sudah dirancang cukup longgar (baca publik,
-- atau insert-sendiri untuk ide tim) sehingga query langsung dari client
-- aman, lihat real-backend.js. Migration ini CUMA berisi yang BENAR-BENAR
-- butuh privilege lebih (role check, atau JOIN yang kena RLS profiles).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Sitasi: getIde gas/Code.gs:987-1002. Butuh RPC (bukan query langsung)
-- karena JOIN ke profiles kena RLS "baca profil sendiri" -- karyawan lain
-- tidak akan kelihatan namanya lewat query client biasa.
-- ---------------------------------------------------------------------------
create or replace function public.get_ide()
returns table(id uuid, judul text, deskripsi text, tgl timestamptz, status text, feedback text, nama text, bagian text)
language sql stable security definer set search_path = public as $$
  select t.id, t.judul, t.deskripsi, t.created_at, t.status, t.feedback, p.nama, p.bagian
  from public.team_ideas t
  join public.profiles p on p.id = t.user_id
  order by t.created_at desc;
$$;
grant execute on function public.get_ide() to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: addPengumuman gas/Code.gs:978-984. Kode lama TANPA pengecekan role
-- -- clone WAJIB (CLAUDE.md). Email notifikasi TIDAK direplikasi (belum ada
-- pengiriman email di clone, sama seperti submit_izin).
-- ---------------------------------------------------------------------------
create or replace function public.add_pengumuman(p_judul text, p_isi text, p_kategori text, p_target_bagian text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh membuat pengumuman' using errcode = '42501';
  end if;
  if p_kategori not in ('PENTING', 'INFO', 'UMUM') then
    return jsonb_build_object('success', false, 'msg', 'Kategori tidak valid.');
  end if;

  insert into public.announcements(judul, isi, kategori, target_bagian, dibuat_oleh)
    values (p_judul, p_isi, p_kategori, coalesce(nullif(p_target_bagian, ''), 'ALL'), auth.uid());

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.add_pengumuman(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: addLibur gas/Code.gs:3913-3918. difasilitasi SELALU true -- kode
-- lama tidak pernah terima parameter itu, semua libur via form otomatis
-- "difasilitasi" (dihitung sbg hari libur resmi untuk payroll/absensi).
-- ---------------------------------------------------------------------------
create or replace function public.add_libur(p_tanggal date, p_nama text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menambah hari libur' using errcode = '42501';
  end if;
  if p_tanggal is null or coalesce(trim(p_nama), '') = '' then
    return jsonb_build_object('success', false, 'msg', 'Tanggal dan nama wajib diisi.');
  end if;

  insert into public.holidays(tanggal, nama, difasilitasi, dibuat_oleh)
    values (p_tanggal, p_nama, true, auth.uid());

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.add_libur(date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pengganti hapusLibur — GAP endpoint, kontrak direkonstruksi dari js/app.js
-- (docs/clone-supabase/07-DATA-DICTIONARY.md §Endpoint lama): "RPC
-- delete_holiday, Owner+Finance, cek payroll PUBLISHED sebelum hapus" --
-- menghindari ubah hari kerja efektif bulan yang slip gajinya sudah final.
-- ---------------------------------------------------------------------------
create or replace function public.hapus_libur(p_holiday_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_tanggal date; v_bulan text; v_published boolean;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menghapus hari libur' using errcode = '42501';
  end if;

  select tanggal into v_tanggal from public.holidays where id = p_holiday_id;
  if v_tanggal is null then
    return jsonb_build_object('success', false, 'msg', 'Hari libur tidak ditemukan.');
  end if;

  v_bulan := to_char(v_tanggal, 'YYYY-MM');
  select exists(select 1 from public.payroll_runs where bulan = v_bulan and status = 'PUBLISHED') into v_published;
  if v_published then
    return jsonb_build_object('success', false, 'msg', 'Tidak bisa dihapus: payroll bulan ' || v_bulan || ' sudah dipublish.');
  end if;

  delete from public.holidays where id = p_holiday_id;
  insert into public.audit_logs(actor, action, target) values (auth.uid(), 'HAPUS_LIBUR', p_holiday_id::text);

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.hapus_libur(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sitasi: hapusNotifikasi/hapusSemuaNotifikasi gas/Code.gs:4398-4413,4788-4798.
-- RLS notifications tidak ada grant delete langsung -- lewat RPC.
-- ---------------------------------------------------------------------------
create or replace function public.hapus_notifikasi(p_notif_id uuid)
returns jsonb
language sql security definer set search_path = public as $$
  delete from public.notifications where id = p_notif_id and user_id = auth.uid();
  select jsonb_build_object('success', true);
$$;
grant execute on function public.hapus_notifikasi(uuid) to authenticated;

create or replace function public.hapus_semua_notifikasi()
returns jsonb
language sql security definer set search_path = public as $$
  delete from public.notifications where user_id = auth.uid();
  select jsonb_build_object('success', true);
$$;
grant execute on function public.hapus_semua_notifikasi() to authenticated;
