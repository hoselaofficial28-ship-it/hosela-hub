-- Hosela Hub — pencatatan notifikasi Telegram untuk absensi kamera.
-- Token bot TIDAK disimpan di database atau aplikasi browser. Token dan chat ID
-- wajib dipasang sebagai Supabase Edge Function secrets.

create table if not exists public.attendance_telegram_notifications (
  event_id uuid primary key references public.attendance_events(id) on delete cascade,
  status text not null default 'SENDING'
    check (status in ('SENDING', 'SENT', 'FAILED')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.attendance_telegram_notifications is
  'Status pengiriman Telegram per attendance event. Primary key event_id mencegah notifikasi ganda.';

alter table public.attendance_telegram_notifications enable row level security;

-- Tabel ini hanya diakses Edge Function memakai service_role. Browser tidak
-- perlu dan tidak boleh membaca status/informasi kegagalan integrasi Telegram.
revoke all on table public.attendance_telegram_notifications from public, anon, authenticated;
grant all on table public.attendance_telegram_notifications to service_role;

create index if not exists attendance_telegram_notifications_status_idx
  on public.attendance_telegram_notifications(status, updated_at);

notify pgrst, 'reload schema';
