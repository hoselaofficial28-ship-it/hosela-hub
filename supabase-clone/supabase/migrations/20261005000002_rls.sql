-- ============================================================================
-- Hosela Hub — Supabase Clone — RLS & Hak Akses
-- ============================================================================
-- Prinsip (sesuai CLAUDE.md wajib + temuan audit "GAS lama TIDAK pernah cek
-- role di server, cuma sembunyikan tombol di UI" — clone WAJIB lebih ketat):
--
-- 1. RLS AKTIF di semua tabel. Default: TERKUNCI, baru dibuka per kebutuhan.
-- 2. Baca (SELECT) diatur lewat RLS policy di sini, sesuai tabel role di
--    docs/clone-supabase/01-INVENTARIS-FITUR.md.
-- 3. Tulis (INSERT/UPDATE/DELETE) untuk operasi SENSITIF (payroll, approval,
--    SP, absensi, registrasi) TIDAK dibuka lewat RLS di sini — itu lewat
--    RPC/Edge Function (SECURITY DEFINER, bypass RLS, validasi role di
--    dalam fungsi), menyusul di migration berikutnya. Ini sesuai mandat
--    CLAUDE.md: "Operasi sensitif... dilakukan melalui Edge Function/RPC
--    tervalidasi."
-- 4. Hanya 2 pengecualian self-service INSERT langsung (leave_requests,
--    team_ideas) karena risikonya rendah (user cuma bisa buat pengajuan
--    atas nama sendiri, status dipaksa default) — selebihnya lewat RPC.
-- ============================================================================

-- ============================== HELPER FUNCTIONS ============================
-- SECURITY DEFINER supaya bisa baca profiles sendiri tanpa kena RLS circular.

create or replace function public.current_bagian()
returns text
language sql security definer stable set search_path = public as $$
  select bagian from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce(public.current_bagian() = 'Owner', false);
$$;

create or replace function public.is_finance()
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce(public.current_bagian() = 'Finance', false);
$$;

-- Meniru isPayrollAdmin_() lama (gas/Code.gs:179-182): Owner ATAU Finance.
create or replace function public.is_payroll_admin()
returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce(public.current_bagian() in ('Owner','Finance'), false);
$$;

comment on function public.is_payroll_admin() is 'Meniru isPayrollAdmin_() lama. CATATAN: menu "Kelola Tim/registrasi" di app lama Owner-ONLY (beda dari payroll yg Owner+Finance) — jangan pakai fungsi ini untuk gate registrasi, pakai is_owner().';

-- ============================== AKTIFKAN RLS ================================

alter table public.profiles enable row level security;
alter table public.registration_requests enable row level security;
alter table public.jobdesks enable row level security;
alter table public.announcements enable row level security;
alter table public.team_ideas enable row level security;
alter table public.rules enable row level security;
alter table public.holidays enable row level security;
alter table public.work_schedules enable row level security;
alter table public.featured_rewards enable row level security;
alter table public.kpi_templates enable row level security;
alter table public.kpi_reports enable row level security;
alter table public.attendance_events enable row level security;
alter table public.attendance_legacy_raw enable row level security;
alter table public.attendance_details enable row level security;
alter table public.attendance_weekly enable row level security;
alter table public.attendance_anomalies enable row level security;
alter table public.leave_requests enable row level security;
alter table public.warning_history enable row level security;
alter table public.notifications enable row level security;
alter table public.salary_settings enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_details enable row level security;
alter table public.payroll_items enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ============================== GRANT DASAR ==================================
-- service_role selalu full access (dipakai RPC/Edge Function, bypass RLS).
-- authenticated dapat grant luas di level SQL, dibatasi SUNGGUHAN oleh
-- policy RLS di bawah (grant tanpa policy = tetap tertutup).

grant usage on schema public to authenticated, service_role, anon;

grant select, insert, update, delete on all tables in schema public to service_role;
grant select on
  public.profiles, public.jobdesks, public.announcements, public.team_ideas,
  public.rules, public.holidays, public.work_schedules, public.featured_rewards,
  public.kpi_templates, public.kpi_reports, public.attendance_events,
  public.attendance_details, public.attendance_weekly, public.attendance_anomalies,
  public.leave_requests, public.warning_history, public.notifications,
  public.salary_settings, public.payroll_runs, public.payroll_details,
  public.payroll_items, public.app_settings
to authenticated;
grant insert on public.leave_requests, public.team_ideas to authenticated;
grant update on public.notifications to authenticated;
-- registration_requests: TIDAK ada grant langsung ke authenticated/anon.
-- Insert hanya lewat Edge Function (perlu hash password di server) — lihat
-- migration fungsi. audit_logs: baca lewat RPC tervalidasi, bukan grant
-- langsung (lihat policy di bawah, tanpa grant = tertutup total dari client).

-- ============================== PROFILES =====================================

create policy "baca profil sendiri" on public.profiles for select
  using (id = auth.uid());
create policy "owner finance baca semua profil" on public.profiles for select
  using (public.is_payroll_admin());

-- ============================== KONTEN (semua karyawan boleh baca) ==========

create policy "semua baca jobdesk" on public.jobdesks for select using (true);
create policy "semua baca peraturan" on public.rules for select using (true);
create policy "semua baca kalender libur" on public.holidays for select using (true);
create policy "semua baca jadwal khusus" on public.work_schedules for select using (true);
create policy "semua baca featured reward" on public.featured_rewards for select using (status = 'AKTIF');
create policy "semua baca kpi template" on public.kpi_templates for select using (true);
create policy "semua baca app settings" on public.app_settings for select using (true);

create policy "baca pengumuman untuk bagian sendiri atau ALL" on public.announcements for select
  using (status = 'AKTIF' and (target_bagian = 'ALL' or target_bagian = public.current_bagian() or public.is_payroll_admin()));

create policy "semua baca ide tim" on public.team_ideas for select using (true);
create policy "tambah ide sendiri" on public.team_ideas for insert
  with check (user_id = auth.uid() and status = 'BARU');

-- ============================== KPI ==========================================

create policy "baca kpi laporan sendiri" on public.kpi_reports for select
  using (user_id = auth.uid() or public.is_payroll_admin());
-- submitKPILaporan (hapus-lalu-insert ulang minggu yg sama) lewat RPC, bukan
-- insert langsung, supaya atomik (CLAUDE.md: operasi multi-baris wajib transaksi).

-- ============================== ABSENSI ======================================

create policy "baca attendance events sendiri" on public.attendance_events for select
  using (user_id = auth.uid() or public.is_payroll_admin());
create policy "baca attendance details sendiri" on public.attendance_details for select
  using (user_id = auth.uid() or public.is_payroll_admin());
create policy "baca attendance weekly sendiri" on public.attendance_weekly for select
  using (user_id = auth.uid() or public.is_payroll_admin());
create policy "baca anomali sendiri" on public.attendance_anomalies for select
  using (user_id = auth.uid() or public.is_payroll_admin());
-- submitAbsensiCamera, konfirmasiAnomali, updateAbsensiMatrixDay, dst — semua
-- lewat RPC/Edge Function (validasi radius, upload Drive, dedup tap, dsb).

-- ============================== IZIN / SP / NOTIFIKASI =======================

create policy "baca izin sendiri" on public.leave_requests for select
  using (user_id = auth.uid() or public.is_payroll_admin());
create policy "ajukan izin sendiri" on public.leave_requests for insert
  with check (user_id = auth.uid() and status = 'MENUNGGU');
-- approveIzin (efek berantai ke SP/denda/bintang) lewat RPC — bukan update langsung.

create policy "baca SP sendiri" on public.warning_history for select
  using (user_id = auth.uid() or public.is_payroll_admin());

create policy "baca notifikasi sendiri" on public.notifications for select
  using (user_id = auth.uid());
create policy "tandai notifikasi sendiri dibaca" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================== GAJI / PAYROLL (Owner+Finance saja) =========

create policy "payroll admin baca salary settings" on public.salary_settings for select
  using (public.is_payroll_admin());
create policy "payroll admin baca payroll runs" on public.payroll_runs for select
  using (public.is_payroll_admin());
create policy "payroll admin baca payroll details semua" on public.payroll_details for select
  using (public.is_payroll_admin());
create policy "karyawan baca slip sendiri yang published" on public.payroll_details for select
  using (user_id = auth.uid() and status_slip = 'PUBLISHED');
create policy "payroll admin baca payroll items semua" on public.payroll_items for select
  using (public.is_payroll_admin());
create policy "karyawan baca item slip sendiri yang published" on public.payroll_items for select
  using (exists (
    select 1 from public.payroll_details d
    where d.id = payroll_items.payroll_detail_id
      and d.user_id = auth.uid() and d.status_slip = 'PUBLISHED'
  ));
-- Semua tulis (set gaji, draft/confirm/publish, adjustment) lewat RPC —
-- ini area TEMUAN PALING KRITIS di audit (GAS lama nol validasi role &
-- urutan status di sini), jangan pernah dibuka langsung ke client.

-- ============================== REGISTRASI (Owner-only, lewat Edge Function) =

-- Tidak ada SELECT policy untuk authenticated biasa — hanya Owner, dan
-- hanya lewat RPC get_registrasi_pending (SECURITY DEFINER) di migration
-- fungsi, supaya konsisten dgn gate "Kelola Tim" Owner-only (bukan +Finance)
-- yang ditemukan di audit (js/app.js:1055-1057). Tabel ini sengaja TANPA
-- policy sama sekali di sini = tertutup total dari client langsung.

-- ============================== AUDIT LOG (tanpa akses client langsung) =====
-- Sengaja tanpa policy SELECT/INSERT untuk authenticated — audit log hanya
-- ditulis oleh RPC (SECURITY DEFINER) dan dibaca lewat RPC Owner-only kalau
-- nanti dibutuhkan layar riwayat audit. Tidak ada grant ke authenticated
-- sama sekali di atas untuk tabel ini (lihat bagian GRANT DASAR).
