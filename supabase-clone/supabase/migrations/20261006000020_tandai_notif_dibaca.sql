-- ============================================================================
-- Hosela Hub — Supabase Clone — Tandai notifikasi sudah dibaca
-- ============================================================================
-- Sitasi: tandaiDibaca gas/Code.gs:4816-4827 (klik judul 1 notifikasi),
-- tandaiMenuDibaca gas/Code.gs:4801-4813 (dipanggil OTOMATIS di app.js
-- goTo() setiap pindah layar selain s-notifikasi -- lihat js/app.js:767-769
-- -- menandai semua notif user yang field 'menu'-nya cocok layar tujuan).
-- Keduanya terlewat dari migration 0018, baru ketahuan saat baca renderer
-- notifikasi (hapusNotif/bacaNotif) sewaktu uji browser layar Notifikasi.
-- getNotifCountByMenu (dispatcher baris 101) TIDAK dipanggil dari manapun
-- di js/app.js -- sengaja tidak direplikasi, sama seperti notifPeraturanBaru.
--
-- Pakai auth.uid() langsung di WHERE, BUKAN parameter p_user_id dari client
-- (beda kecil dari GAS yang percaya userId kiriman client apa adanya) --
-- supaya user tidak bisa menandai dibaca notifikasi milik user lain dengan
-- mengirim UID palsu. Tidak mengubah hasil bisnis: pemanggil asli (app.js)
-- selalu mengirim currentUser.id sendiri.
-- ============================================================================
create or replace function public.tandai_dibaca(p_notif_id uuid)
returns jsonb
language sql security definer set search_path = public as $$
  update public.notifications set status = 'SUDAH' where id = p_notif_id and user_id = auth.uid();
  select jsonb_build_object('success', true);
$$;
grant execute on function public.tandai_dibaca(uuid) to authenticated;

create or replace function public.tandai_menu_dibaca(p_menu text)
returns jsonb
language sql security definer set search_path = public as $$
  update public.notifications set status = 'SUDAH'
    where user_id = auth.uid() and coalesce(menu, 's-notifikasi') = p_menu and status = 'BELUM';
  select jsonb_build_object('success', true);
$$;
grant execute on function public.tandai_menu_dibaca(text) to authenticated;
