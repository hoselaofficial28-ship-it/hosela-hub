-- ============================================================================
-- Hosela Hub — Supabase Clone — Notifikasi massal "Peraturan Diperbarui"
-- ============================================================================
-- Sitasi: triggerNotifPeraturan gas/Code.gs:4035-4047, dipanggil tombol
-- "Kirim Notif Peraturan Baru ke Tim" di layar Peraturan (js/app.js
-- kirimNotifPeraturan() -> gasCall('triggerNotifPeraturan', [ket])).
-- Terlewat dari migration 0018 (baru ketahuan saat uji browser layar
-- Peraturan). Kode lama TANPA pengecekan role -- clone WAJIB (CLAUDE.md).
-- notifPeraturanBaru (gas/Code.gs:4652) adalah fungsi kembar yang TIDAK
-- pernah dipanggil dari frontend manapun -- sengaja tidak direplikasi.
-- ============================================================================
create or replace function public.trigger_notif_peraturan(p_keterangan text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_isi text := coalesce(nullif(trim(p_keterangan), ''), 'Ada peraturan yang baru diperbarui. Mohon dibaca dan dipahami.');
begin
  if not public.is_payroll_admin() then
    raise exception 'Akses ditolak: hanya Owner/Finance yang boleh mengirim notifikasi peraturan' using errcode = '42501';
  end if;

  insert into public.notifications(user_id, judul, isi, tipe, status, menu)
    select id, '📋 Peraturan Diperbarui', v_isi, 'INFO', 'BELUM', 's-peraturan'
    from public.profiles
    where status = 'AKTIF' and bagian <> 'Owner';

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.trigger_notif_peraturan(text) to authenticated;
