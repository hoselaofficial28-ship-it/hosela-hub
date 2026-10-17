-- ============================================================================
-- 20261017000045 — Penyesuaian Finance MENUMPUK (keputusan Ko 2026-10-17)
-- ============================================================================
-- Masalah yang dilaporkan Ko:
--   Setelah menyimpan penyesuaian (mis. Tambahan Rp 200.000), kolom input masih
--   menampilkan angka lama. Saat Ko membersihkan kolom untuk membuat penyesuaian
--   lain, penyesuaian tambahan tadi ikut TERHAPUS.
--
-- Sebabnya: update_payroll_adjustment() MENIMPA (replace) nilai penyesuaian —
--   `adjustment_plus = input`, dan semua item ADJUSTMENT_* dihapus lalu ditulis
--   ulang. Kolom kosong dianggap 0, jadi penyesuaian lama hilang.
--
-- Perubahan (pilihan A dari Ko):
--   1) update_payroll_adjustment() sekarang MENUMPUK: setiap simpan menambah baris
--      item penyesuaian baru, penyesuaian lama tetap ada. Nominal 0 ditolak
--      (tidak boleh menghapus apa pun lewat tombol simpan).
--   2) Fungsi baru hapus_payroll_adjustment(p_item_id) untuk menghapus SATU baris
--      penyesuaian yang salah input, lalu total dihitung ulang.
--   Rumus total gaji tidak diubah: calc_payroll_total() tetap dipakai apa adanya.
-- ============================================================================

begin;

create or replace function public.update_payroll_adjustment(p_payroll_detail_id uuid, p_adjustment_plus integer, p_adjustment_minus integer, p_catatan text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_run_id uuid; v_status text; v_gaji_pokok integer; v_reward integer; v_denda integer; v_bonus integer;
  v_plus integer := greatest(0, coalesce(p_adjustment_plus, 0));
  v_minus integer := greatest(0, coalesce(p_adjustment_minus, 0));
  v_note text := nullif(btrim(coalesce(p_catatan, '')), '');
  v_plus_total integer;
  v_minus_total integer;
  v_catatan text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengubah adjustment' using errcode = '42501';
  end if;

  select payroll_run_id, gaji_pokok, total_reward, total_denda, bonus_kerajinan
    into v_run_id, v_gaji_pokok, v_reward, v_denda, v_bonus
    from public.payroll_details where id = p_payroll_detail_id;
  if v_run_id is null then
    return jsonb_build_object('success', false, 'msg', 'Detail payroll tidak ditemukan');
  end if;
  select status into v_status from public.payroll_runs where id = v_run_id;
  if v_status = 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip sudah dipublish dan tidak bisa diubah');
  end if;

  -- Nominal kosong TIDAK dipakai untuk menghapus. Penghapusan harus lewat tombol
  -- hapus per baris supaya penyesuaian lama tidak hilang tanpa sengaja.
  if v_plus = 0 and v_minus = 0 then
    return jsonb_build_object('success', false, 'msg', 'Isi nominal tambahan atau potongan dulu — nominal 0 tidak menyimpan apa pun.');
  end if;

  if v_plus > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, keterangan, nominal)
      values (p_payroll_detail_id, 'ADJUSTMENT_PLUS', coalesce(v_note, 'Adjustment tambahan'), v_plus);
  end if;
  if v_minus > 0 then
    insert into public.payroll_items(payroll_detail_id, tipe, keterangan, nominal)
      values (p_payroll_detail_id, 'ADJUSTMENT_MINUS', coalesce(v_note, 'Adjustment potongan'), v_minus);
  end if;

  select coalesce(sum(nominal) filter (where tipe = 'ADJUSTMENT_PLUS'), 0),
         coalesce(sum(nominal) filter (where tipe = 'ADJUSTMENT_MINUS'), 0)
    into v_plus_total, v_minus_total
    from public.payroll_items
   where payroll_detail_id = p_payroll_detail_id;

  select coalesce(string_agg(distinct nullif(btrim(keterangan), ''), ' · '), '')
    into v_catatan
    from public.payroll_items
   where payroll_detail_id = p_payroll_detail_id
     and tipe in ('ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS');

  update public.payroll_details set
    adjustment_plus = v_plus_total,
    adjustment_minus = v_minus_total,
    catatan_adjustment = v_catatan,
    total_gaji = public.calc_payroll_total(v_gaji_pokok, v_reward, v_bonus, v_plus_total, v_denda, v_minus_total)
    where id = p_payroll_detail_id;

  insert into public.audit_logs(actor, action, target, after_data)
    values (auth.uid(), 'UPDATE_PAYROLL_ADJUSTMENT', p_payroll_detail_id::text,
            jsonb_build_object('tambah', v_plus, 'potong', v_minus, 'totalTambah', v_plus_total, 'totalPotong', v_minus_total, 'catatan', v_note));

  return public.get_payroll_detail(p_payroll_detail_id);
end;
$$;

create or replace function public.hapus_payroll_adjustment(p_item_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_detail_id uuid;
  v_tipe text;
  v_run_id uuid; v_status text; v_gaji_pokok integer; v_reward integer; v_denda integer; v_bonus integer;
  v_plus_total integer;
  v_minus_total integer;
  v_catatan text;
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh menghapus adjustment' using errcode = '42501';
  end if;

  select payroll_detail_id, tipe into v_detail_id, v_tipe
    from public.payroll_items where id = p_item_id;
  if v_detail_id is null then
    return jsonb_build_object('success', false, 'msg', 'Item penyesuaian tidak ditemukan');
  end if;
  if v_tipe not in ('ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS') then
    return jsonb_build_object('success', false, 'msg', 'Hanya baris penyesuaian Finance yang bisa dihapus di sini.');
  end if;

  select payroll_run_id, gaji_pokok, total_reward, total_denda, bonus_kerajinan
    into v_run_id, v_gaji_pokok, v_reward, v_denda, v_bonus
    from public.payroll_details where id = v_detail_id;
  select status into v_status from public.payroll_runs where id = v_run_id;
  if v_status = 'PUBLISHED' then
    return jsonb_build_object('success', false, 'msg', 'Slip sudah dipublish dan tidak bisa diubah');
  end if;

  delete from public.payroll_items where id = p_item_id;

  select coalesce(sum(nominal) filter (where tipe = 'ADJUSTMENT_PLUS'), 0),
         coalesce(sum(nominal) filter (where tipe = 'ADJUSTMENT_MINUS'), 0)
    into v_plus_total, v_minus_total
    from public.payroll_items
   where payroll_detail_id = v_detail_id;

  select coalesce(string_agg(distinct nullif(btrim(keterangan), ''), ' · '), '')
    into v_catatan
    from public.payroll_items
   where payroll_detail_id = v_detail_id
     and tipe in ('ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS');

  update public.payroll_details set
    adjustment_plus = v_plus_total,
    adjustment_minus = v_minus_total,
    catatan_adjustment = v_catatan,
    total_gaji = public.calc_payroll_total(v_gaji_pokok, v_reward, v_bonus, v_plus_total, v_denda, v_minus_total)
    where id = v_detail_id;

  insert into public.audit_logs(actor, action, target, after_data)
    values (auth.uid(), 'HAPUS_PAYROLL_ADJUSTMENT', v_detail_id::text,
            jsonb_build_object('item', p_item_id, 'tipe', v_tipe, 'totalTambah', v_plus_total, 'totalPotong', v_minus_total));

  return public.get_payroll_detail(v_detail_id);
end;
$$;

revoke execute on function public.update_payroll_adjustment(uuid, integer, integer, text) from public, anon;
revoke execute on function public.hapus_payroll_adjustment(uuid) from public, anon;
grant execute on function public.update_payroll_adjustment(uuid, integer, integer, text) to authenticated, service_role;
grant execute on function public.hapus_payroll_adjustment(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
