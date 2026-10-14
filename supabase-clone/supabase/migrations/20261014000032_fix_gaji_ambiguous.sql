-- ============================================================================
-- PERBAIKAN PENTING (14 Okt 2026) — fungsi gaji error karena "ambiguous column"
-- ============================================================================
-- GEJALA: menu/menu terkait gaji gagal dengan pesan
--   ERROR 42702: column reference "gaji_bulanan" is ambiguous
--   (Pengaturan Gaji, Pratinjau Penggajian, Slip, Rekap Bulanan)
--
-- PENYEBAB (kesalahan saya di migrasi 20261014000028):
--   Fungsi get_effective_salary_setting diubah dari bahasa SQL ke PL/pgSQL untuk
--   menambah penjagaan hak akses. Fungsi ini punya OUT parameter bernama
--   gaji_bulanan / bonus_kerajinan / bulan_setting / catatan. Di PL/pgSQL, nama
--   tersebut menjadi VARIABEL, sehingga penyebutan kolom `gaji_bulanan` di dalam
--   query jadi rancu (variabel atau kolom?) dan Postgres menolak.
--
-- PERBAIKAN: seluruh kolom di dalam query ditulis dengan awalan tabel (ss.…)
--   sehingga tidak ada lagi kerancuan. Tanda pagar di bawah memaksa Postgres
--   memilih kolom saat tetap ada nama yang sama, sebagai pengaman tambahan.
--
-- Aman dijalankan berulang.
-- ============================================================================

create or replace function public.get_effective_salary_setting(
  p_user_id uuid, p_bulan_key text, p_fallback_gaji integer default 0, p_fallback_kerajinan integer default 150000
) returns table(gaji_bulanan integer, bonus_kerajinan integer, bulan_setting text, catatan text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if coalesce(p_user_id, auth.uid()) <> auth.uid() and not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya boleh melihat data gaji sendiri' using errcode = '42501';
  end if;
  return query
  select
    coalesce(ss.gaji_bulanan, greatest(0, p_fallback_gaji)),
    coalesce(ss.bonus_kerajinan, greatest(0, p_fallback_kerajinan)),
    ss.bulan,
    ss.catatan
  from (select 1) dummy
  left join lateral (
    select s.gaji_bulanan, s.bonus_kerajinan, s.bulan, s.catatan
    from public.salary_settings s
    where s.user_id = p_user_id and s.bulan <= p_bulan_key
    order by s.bulan desc, s.created_at desc
    limit 1
  ) ss on true;
end;
$$;

comment on function public.get_effective_salary_setting(uuid, text, integer, integer) is
  'Setelan gaji efektif (bulan terbesar menang). 14 Okt 2026: kolom ditulis dengan awalan tabel + #variable_conflict use_column untuk memperbaiki error "column reference gaji_bulanan is ambiguous".';

-- Fungsi ini hanya dipakai dari dalam fungsi lain (bukan dipanggil langsung aplikasi),
-- jadi izinnya tetap tertutup untuk pengguna biasa.
revoke execute on function public.get_effective_salary_setting(uuid, text, integer, integer) from public, anon;
grant execute on function public.get_effective_salary_setting(uuid, text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Perbaikan kecil: proses absensi lengkap harus MELAPORKAN kegagalan langkah
-- rekaps, bukan mengaku sukses saat tidak ada data absensi sama sekali.
-- ---------------------------------------------------------------------------
create or replace function public.process_absensi_lengkap(p_bulan_key text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rekap jsonb;
  v_sp jsonb;
  v_sebelum text[];
  r record;
  v_baru boolean;
begin
  if auth.uid() is null then
    raise exception 'Harus login' using errcode = '28000';
  end if;
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh memproses absensi' using errcode = '42501';
  end if;
  if p_bulan_key is null or p_bulan_key !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('success', false, 'msg', 'Bulan tidak valid (harus YYYY-MM).');
  end if;

  -- 0) Reset rekap mingguan bulan ini (meniru gas/Code.gs:1167) supaya proses
  --    ulang tidak menumpuk hadir/telat/absen/denda.
  delete from public.attendance_weekly
   where public._minggu_ke_bulan(minggu) = p_bulan_key;

  -- 1) Rekap absensi. Kalau data absensi bulan ini kosong, hentikan di sini dan
  --    sampaikan pesan aslinya (jangan lanjut menghitung SP).
  v_rekap := public.process_absensi_app_to_rekap(p_bulan_key);
  if coalesce((v_rekap->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'msg', coalesce(v_rekap->>'msg', 'Rekap absensi gagal diproses.'));
  end if;

  select coalesce(array_agg(w.tipe_sp || '|' || coalesce(w.alasan, '')), array[]::text[])
    into v_sebelum
    from public.warning_history w
   where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3');

  -- 2) Bersihkan SP + denda SP bulan itu, lalu hitung ulang dari nol (anti-dobel)
  delete from public.warning_history
   where bulan = p_bulan_key and tipe_sp in ('SP1', 'SP2', 'SP3');
  delete from public.attendance_details
   where tipe = 'DENDA_SP' and to_char(tanggal, 'YYYY-MM') = p_bulan_key;

  v_sp := public.process_sp_for_month(p_bulan_key);

  -- 3) Notifikasi hanya untuk SP yang benar-benar baru
  for r in
    select w.user_id, w.tipe_sp, w.alasan,
           coalesce((select sum(d.nilai) from public.attendance_details d
                      where d.user_id = w.user_id and d.tipe = 'DENDA_SP'
                        and to_char(d.tanggal, 'YYYY-MM') = p_bulan_key
                        and d.keterangan like w.tipe_sp || '%'), 0) as denda
      from public.warning_history w
     where w.bulan = p_bulan_key and w.tipe_sp in ('SP1', 'SP2', 'SP3')
  loop
    v_baru := not (v_sebelum @> array[r.tipe_sp || '|' || coalesce(r.alasan, '')]);
    if v_baru then
      insert into public.notifications(user_id, judul, isi, tipe, menu)
      values (r.user_id,
              '⚠️ ' || r.tipe_sp || ' Dikenakan',
              r.alasan || case when coalesce(r.denda, 0) > 0
                               then ' Denda Rp ' || to_char(r.denda, 'FM999G999G999') || '.' else '' end,
              case when r.tipe_sp = 'SP1' then 'PERINGATAN' else 'SP' || right(r.tipe_sp, 1) end,
              's-notifikasi');
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'bulan', p_bulan_key,
    'rekapRows', coalesce(v_rekap->>'rekapRows', '0')::integer,
    'detailRows', coalesce(v_rekap->>'detailRows', '0')::integer,
    'spEntries', coalesce(v_sp->>'sp_entries', '0')::integer
  );
end;
$$;

revoke execute on function public.process_absensi_lengkap(text) from public, anon;
grant execute on function public.process_absensi_lengkap(text) to authenticated, service_role;

notify pgrst, 'reload schema';
