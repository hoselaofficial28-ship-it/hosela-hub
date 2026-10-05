-- ============================================================================
-- Hosela Hub — Supabase Clone — Mesin Izin (Sakit/Cuti) + Efek SP
-- ============================================================================
-- Replikasi submitIzin, getIzinPending, approveIzin, evaluasiSPSetelahIzin
-- (gas/Code.gs:4356-4604). Foto bukti (surat dokter) BELUM disambung ke
-- Google Drive -- link_foto diterima apa adanya (url eksternal/kosong),
-- sama seperti pola absensi kamera.
--
-- Sitasi audit: "Tidak ada validasi tanggal 'harus hari yang sama' di
-- server" (07-DATA-DICTIONARY.md §IZIN) -- itu teks UI saja, tidak
-- direplikasi di sini juga (sengaja, bukan lupa).
--
-- CATATAN AUDIT (transparansi, bukan bug baru dari clone): kalau SP2 pernah
-- dipicu lewat jalur absen (_tambah_denda_absen, migration 0005 -- nambah
-- LANGSUNG ke attendance_weekly.total_denda di LUAR attendance_details),
-- lalu izin disetujui dan menurunkan status SP, fungsi di bawah ini HANYA
-- menghapus baris DENDA_SP di attendance_details -- TIDAK PERNAH mengurangi
-- balik nilai yang sudah menempel di attendance_weekly.total_denda lewat
-- jalur itu. Kode lama (gas/Code.gs, hapusDendaSP) punya keterbatasan yang
-- SAMA PERSIS (tidak pernah sentuh kolom J ABSENSI_REKAP). Dicatat di
-- DECISION-LOG.md, belum ada keputusan Ko soal ini.
-- ============================================================================

create or replace function public._fmt_tanggal_id(p_tanggal date)
returns text
language sql immutable as $$
  select extract(day from p_tanggal)::text || ' ' ||
    (array['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'])[extract(month from p_tanggal)::int] || ' ' ||
    extract(year from p_tanggal)::text;
$$;

create or replace function public._hapus_sp(p_user_id uuid, p_bulan_key text, p_tipe_sp text)
returns void
language sql security definer set search_path = public as $$
  delete from public.warning_history
  where user_id = p_user_id and bulan = p_bulan_key and tipe_sp = p_tipe_sp;
$$;

create or replace function public._hapus_denda_sp(p_user_id uuid, p_bulan_key text)
returns void
language sql security definer set search_path = public as $$
  delete from public.attendance_details
  where user_id = p_user_id and tipe = 'DENDA_SP' and to_char(tanggal, 'YYYY-MM') = p_bulan_key;
$$;

create or replace function public._update_bintang_dari_skor(p_user_id uuid, p_max_bintang smallint)
returns void
language plpgsql security definer set search_path = public as $$
declare v_skor smallint; v_bintang smallint;
begin
  select skor into v_skor from public.profiles where id = p_user_id;
  v_bintang := case
    when coalesce(v_skor, 0) >= 85 then 5
    when coalesce(v_skor, 0) >= 75 then 4
    when coalesce(v_skor, 0) >= 65 then 3
    when coalesce(v_skor, 0) >= 50 then 2
    else 1
  end;
  if v_bintang > p_max_bintang then v_bintang := p_max_bintang; end if;
  update public.profiles set bintang = v_bintang, updated_at = now() where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Evaluasi ulang SP setelah izin disetujui. Sitasi: evaluasiSPSetelahIzin
-- gas/Code.gs:4477-4604. SP1 TIDAK PERNAH dibuat di sini (cuma SP2/SP3 yang
-- bisa diturunkan/dihapus) -- sama seperti aslinya. "Hari absen TIDAK
-- dikurangi" (komentar asli gas/Code.gs:4451) -- izin hanya mempengaruhi
-- SP & denda SP, bukan attendance_details/attendance_weekly.absen itu sendiri.
-- ---------------------------------------------------------------------------
create or replace function public._evaluasi_sp_setelah_izin(p_user_id uuid, p_tanggal date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_bulan text := to_char(p_tanggal, 'YYYY-MM');
  v_total_absen_fisik integer;
  v_total_izin_disetujui integer;
  v_absen_efektif integer;
  v_ada_sp2 boolean;
  v_alasan_sp2 text;
begin
  select count(*) into v_total_absen_fisik from public.attendance_details
    where user_id = p_user_id and tipe = 'ABSEN' and to_char(tanggal, 'YYYY-MM') = v_bulan;

  select count(*) into v_total_izin_disetujui from public.leave_requests
    where user_id = p_user_id and status = 'DISETUJUI' and to_char(tanggal, 'YYYY-MM') = v_bulan;

  v_absen_efektif := greatest(0, v_total_absen_fisik - v_total_izin_disetujui);

  if v_absen_efektif >= 5 then
    null; -- SP3 tetap berlaku, tidak ada perubahan

  elsif v_absen_efektif >= 3 then
    -- SP3 -> SP2
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    perform public._hapus_denda_sp(p_user_id, v_bulan);
    select exists(
      select 1 from public.warning_history where user_id = p_user_id and bulan = v_bulan and tipe_sp = 'SP2'
    ) into v_ada_sp2;
    v_alasan_sp2 := 'Absen efektif ' || v_absen_efektif || 'x setelah izin disetujui. Denda Rp 50.000 dikenakan.';
    if not v_ada_sp2 then
      perform public._catat_sp(p_user_id, v_bulan, 'SP2', v_alasan_sp2);
      insert into public.notifications(user_id, judul, isi, tipe, menu)
        values (p_user_id, '⬇️ SP3 → SP2', 'SP3 dibatalkan. Absen efektif ' || v_absen_efektif || 'x → SP2 dikenakan. Denda Rp 50.000.', 'PERINGATAN', 's-notifikasi');
    end if;
    perform public._catat_denda_sp_detail(p_user_id, v_bulan, 'SP2', v_alasan_sp2, 50000);
    perform public._update_bintang_dari_skor(p_user_id, 2);

  elsif v_absen_efektif >= 2 then
    -- Turun ke SP1 -- hapus SP2 dan SP3, bebaskan lock bintang
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP2');
    perform public._hapus_denda_sp(p_user_id, v_bulan);
    perform public._update_bintang_dari_skor(p_user_id, 5);
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (p_user_id, '⬇️ SP Diturunkan ke SP1', 'Izin kamu disetujui. Absen efektif ' || v_absen_efektif || 'x → SP2/SP3 dibatalkan. Hanya SP1 yang berlaku. Tidak ada denda.', 'INFO', 's-izin');

  else
    -- Absen efektif < 2 -- semua SP dihapus
    perform public._hapus_sp(p_user_id, v_bulan, 'SP3');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP2');
    perform public._hapus_sp(p_user_id, v_bulan, 'SP1');
    perform public._hapus_denda_sp(p_user_id, v_bulan);
    perform public._update_bintang_dari_skor(p_user_id, 5);
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (p_user_id, '✅ Semua SP Dibatalkan', 'Izin kamu disetujui. Absen efektif ' || v_absen_efektif || 'x → tidak memenuhi syarat SP apapun. Semua denda dihapus.', 'INFO', 's-izin');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajukan izin. Sitasi: submitIzin gas/Code.gs:4356-4383. Notif email ke
-- Finance/Owner TIDAK direplikasi (belum ada pengiriman email di clone),
-- notif in-app ke semua Finance+Owner aktif tetap ada.
-- ---------------------------------------------------------------------------
create or replace function public.submit_izin(p_tanggal date, p_jenis text, p_keterangan text, p_link_foto text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_nama text;
  r record;
begin
  if v_user_id is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if p_jenis not in ('SAKIT', 'IZIN') then
    return jsonb_build_object('success', false, 'msg', 'Jenis izin tidak valid.');
  end if;

  select nama into v_nama from public.profiles where id = v_user_id;

  insert into public.leave_requests(user_id, tanggal, jenis, keterangan, status, link_foto)
    values (v_user_id, p_tanggal, p_jenis, p_keterangan, 'MENUNGGU', p_link_foto);

  for r in select id from public.profiles where status = 'AKTIF' and bagian in ('Owner', 'Finance') loop
    insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (r.id, '📋 Pengajuan ' || p_jenis || ' Baru',
        coalesce(v_nama, 'Karyawan') || ' mengajukan ' || lower(p_jenis) || ' untuk ' || public._fmt_tanggal_id(p_tanggal) || '. Segera cek Kelola Izin.',
        'INFO', 's-kelola-izin');
  end loop;

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.submit_izin(date, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Daftar izin MENUNGGU persetujuan. Sitasi: getIzinPending gas/Code.gs:
-- 4424-4439. Kode lama TIDAK ada pengecekan role -- clone WAJIB (CLAUDE.md).
-- ---------------------------------------------------------------------------
create or replace function public.get_izin_pending()
returns table(id uuid, user_id uuid, nama text, tanggal date, jenis text, keterangan text, link_foto text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh melihat pengajuan izin' using errcode = '42501';
  end if;
  return query
    select l.id, l.user_id, p.nama, l.tanggal, l.jenis, l.keterangan, l.link_foto
    from public.leave_requests l
    join public.profiles p on p.id = l.user_id
    where l.status = 'MENUNGGU'
    order by l.submitted_at asc;
end;
$$;
grant execute on function public.get_izin_pending() to authenticated;

-- ---------------------------------------------------------------------------
-- Setujui/tolak izin. Sitasi: approveIzin gas/Code.gs:4441-4461. Efek
-- berantai ke SP hanya saat DISETUJUI (bukan saat DITOLAK).
-- ---------------------------------------------------------------------------
create or replace function public.approve_izin(p_izin_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_jenis text;
  v_tanggal date;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses izin' using errcode = '42501';
  end if;
  if p_status not in ('DISETUJUI', 'DITOLAK') then
    return jsonb_build_object('success', false, 'msg', 'Status tidak valid.');
  end if;

  select user_id, jenis, tanggal into v_user_id, v_jenis, v_tanggal
    from public.leave_requests where id = p_izin_id and status = 'MENUNGGU';
  if v_user_id is null then
    return jsonb_build_object('success', false, 'msg', 'Pengajuan tidak ditemukan atau sudah diproses.');
  end if;

  update public.leave_requests set status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_izin_id;

  if p_status = 'DISETUJUI' then
    perform public._evaluasi_sp_setelah_izin(v_user_id, v_tanggal);
  end if;

  insert into public.notifications(user_id, judul, isi, tipe, menu)
    values (v_user_id,
      (case when p_status = 'DISETUJUI' then '✅' else '❌' end) || ' Pengajuan ' || v_jenis || ' ' || (case when p_status = 'DISETUJUI' then 'Disetujui' else 'Ditolak' end),
      'Pengajuan ' || lower(v_jenis) || ' kamu untuk ' || public._fmt_tanggal_id(v_tanggal) || ' telah ' ||
        (case when p_status = 'DISETUJUI' then 'disetujui. Tidak dihitung absen.' else 'ditolak. Tetap dihitung absen biasa.' end),
      (case when p_status = 'DISETUJUI' then 'INFO' else 'PERINGATAN' end), 's-izin');

  insert into public.audit_logs(actor, action, target, after_data)
    values (auth.uid(), 'APPROVE_IZIN', p_izin_id::text, jsonb_build_object('status', p_status));

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.approve_izin(uuid, text) to authenticated;
