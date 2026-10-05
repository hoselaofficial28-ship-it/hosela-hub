-- ============================================================================
-- Hosela Hub — Supabase Clone — Perbaikan tipe parameter _update_bintang_dari_skor
-- ============================================================================
-- Ditemukan saat uji approve_izin: fungsi didefinisikan dengan parameter
-- p_max_bintang SMALLINT (migration 0009), tapi SEMUA pemanggilnya
-- (_evaluasi_sp_setelah_izin) memberi literal angka biasa (2, 5) yang
-- dianggap INTEGER oleh PL/pgSQL -- PostgreSQL tidak match overload
-- integer->smallint secara implisit, jadi approve_izin SELALU gagal dengan
-- "function does not exist" begitu sampai ke update bintang. Diperbaiki
-- dengan mengubah parameter jadi INTEGER (tidak ada alasan harus smallint
-- di sini). Tidak mengubah hasil angka apapun.
-- ============================================================================

create or replace function public._update_bintang_dari_skor(p_user_id uuid, p_max_bintang integer)
returns void
language plpgsql security definer set search_path = public as $$
declare v_skor smallint; v_bintang integer;
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
