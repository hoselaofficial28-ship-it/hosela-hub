-- ============================================================================
-- Hosela Hub — Supabase Clone — Supabase Auth + Alur Registrasi
-- ============================================================================
-- DESAIN (revisi dari rencana awal di migration 0001): self-registration
-- TIDAK pakai tabel staging `registration_requests` terpisah (tabel itu
-- dibiarkan ada tapi menganggur) — sebagai gantinya pakai pola standar
-- Supabase: supabase.auth.signUp() langsung dari browser (password pilihan
-- sendiri tersimpan benar di Supabase Auth, bukan tabel biasa), lalu trigger
-- di bawah otomatis bikin baris `profiles` dengan status PENDING. Approve/
-- tolak tinggal UPDATE status — TIDAK perlu Admin API/Edge Function.
--
-- `addKaryawanBaru` (Owner bikin akun karyawan LANGSUNG dgn password default
-- "hosela", tanpa karyawan signUp sendiri) TETAP butuh Edge Function (Admin
-- API) — menyusul terpisah, tidak termasuk migration ini.
-- ============================================================================

-- profiles.status perlu 2 nilai baru: PENDING (baru daftar, nunggu approve)
-- dan DITOLAK (ditolak, disimpan sbg riwayat sesuai keputusan Ko).
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('AKTIF','NONAKTIF','PENDING','DITOLAK'));

-- ---------------------------------------------------------------------------
-- Dipanggil browser SEBELUM login (publik, anon) — nama -> email, supaya
-- form login tetap "Nama Pengguna" seperti sistem lama, bukan minta email.
-- Sengaja return NULL baik utk nama tak ditemukan MAUPUN status bukan AKTIF
-- (PENDING/DITOLAK/NONAKTIF) — supaya tidak membocorkan status akun orang
-- lain, meniru perilaku lama yg juga tidak membedakan pesan error.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_login_email(p_nama text)
returns text
language sql security definer stable set search_path = public as $$
  select email from public.profiles
  where lower(trim(nama)) = lower(trim(p_nama)) and status = 'AKTIF' and email is not null
  limit 1;
$$;
grant execute on function public.resolve_login_email(text) to anon;

-- ---------------------------------------------------------------------------
-- Trigger: begitu ada auth.users baru (dari signUp mandiri di layar daftar),
-- otomatis bikin profil berstatus PENDING. Data nama/bagian/jabatan diambil
-- dari user_metadata yg dikirim browser saat signUp.
-- ---------------------------------------------------------------------------
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
    'PENDING'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- getDaftarOptions pengganti — opsi bagian/jabatan utk form daftar. Publik.
-- ---------------------------------------------------------------------------
create or replace function public.get_daftar_options()
returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_object_agg(bagian, jabatan_list), '{}'::jsonb)
  from (
    select bagian, jsonb_agg(distinct jabatan order by jabatan) as jabatan_list
    from public.jobdesks
    where bagian is not null
    group by bagian
  ) t;
$$;
grant execute on function public.get_daftar_options() to anon;

-- ---------------------------------------------------------------------------
-- getRegistrasiPending pengganti — Owner-ONLY (bukan +Finance, sesuai temuan
-- audit js/app.js:1055-1057: menu "Kelola Tim" khusus Owner).
-- ---------------------------------------------------------------------------
create or replace function public.get_registrasi_pending()
returns table(id uuid, nama text, bagian text, jabatan text, tgl_daftar timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh melihat pendaftaran pending' using errcode = '42501';
  end if;
  return query
    select p.id, p.nama, p.bagian, p.jabatan, p.created_at
    from public.profiles p where p.status = 'PENDING'
    order by p.created_at asc;
end;
$$;
grant execute on function public.get_registrasi_pending() to authenticated;

-- ---------------------------------------------------------------------------
-- approveRegistrasi pengganti — Owner-only. Password TIDAK direset (sudah
-- benar sejak signUp, sesuai keputusan Ko "pakai sandi pilihan sendiri").
-- ---------------------------------------------------------------------------
create or replace function public.approve_registrasi(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nama text;
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh menyetujui pendaftaran' using errcode = '42501';
  end if;
  select nama into v_nama from public.profiles where id = p_user_id and status = 'PENDING';
  if v_nama is null then
    return jsonb_build_object('success', false, 'msg', 'Pendaftaran tidak ditemukan atau sudah diproses');
  end if;
  update public.profiles set status = 'AKTIF', updated_at = now() where id = p_user_id;
  insert into public.notifications (user_id, judul, isi, tipe, menu)
    values (p_user_id, 'Akun disetujui', 'Pendaftaran kamu sudah disetujui. Selamat bergabung!', 'INFO', 's-home');
  insert into public.audit_logs (actor, action, target, after_data, catatan)
    values (auth.uid(), 'APPROVE_REGISTRASI', p_user_id::text, jsonb_build_object('status','AKTIF'), 'Disetujui via approve_registrasi');
  return jsonb_build_object('success', true, 'msg', v_nama || ' disetujui, memakai sandi yang dipilih sendiri saat daftar');
end;
$$;
grant execute on function public.approve_registrasi(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- tolakRegistrasi pengganti — Owner-only. DISIMPAN sbg riwayat (status
-- DITOLAK), TIDAK dihapus, sesuai keputusan Ko (beda dari teks tombol lama
-- yang bilang "hapus").
-- ---------------------------------------------------------------------------
create or replace function public.tolak_registrasi(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nama text;
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak: hanya Owner yang boleh menolak pendaftaran' using errcode = '42501';
  end if;
  select nama into v_nama from public.profiles where id = p_user_id and status = 'PENDING';
  if v_nama is null then
    return jsonb_build_object('success', false, 'msg', 'Pendaftaran tidak ditemukan atau sudah diproses');
  end if;
  update public.profiles set status = 'DITOLAK', updated_at = now() where id = p_user_id;
  insert into public.audit_logs (actor, action, target, after_data, catatan)
    values (auth.uid(), 'TOLAK_REGISTRASI', p_user_id::text, jsonb_build_object('status','DITOLAK'), 'Ditolak via tolak_registrasi, disimpan sbg riwayat');
  return jsonb_build_object('success', true, 'msg', 'Pendaftaran ' || v_nama || ' ditolak & disimpan sebagai riwayat');
end;
$$;
grant execute on function public.tolak_registrasi(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Dipanggil browser setelah login sukses — cek status profil. Ini yg
-- menentukan apakah user PENDING/DITOLAK diblokir masuk app walau auth-nya
-- valid (auth user bisa saja berhasil login, tapi belum tentu boleh akses).
-- ---------------------------------------------------------------------------
create or replace function public.get_my_profile()
returns public.profiles
language sql security invoker stable set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;
grant execute on function public.get_my_profile() to authenticated;

comment on table public.registration_requests is 'TIDAK DIPAKAI lagi (lihat migration 0004) -- self-registration sekarang pakai auth.users + profiles.status=PENDING langsung. Tabel dibiarkan ada (bukan di-DROP) supaya tidak ada migration destruktif tanpa alasan kuat; aman diabaikan.';
