-- ============================================================================
-- Hosela Hub — Supabase Clone — Schema Awal
-- ============================================================================
-- Diturunkan dari docs/clone-supabase/07-DATA-DICTIONARY.md (hasil audit
-- gas/Code.gs). Setiap tabel dikomentari dengan sheet lama yang digantikan.
--
-- CATATAN PENTING:
-- - Semua nominal uang = integer rupiah (tanpa desimal), sesuai CLAUDE.md.
-- - Kolom `bulan`/`minggu` sengaja TEXT (format 'YYYY-MM' / 'YYYY-Www'),
--   BUKAN kolom date yang diturunkan otomatis — ini meniru desain sengaja
--   di kode lama (hitungBintang pakai deteksi bulan string-based "no
--   timezone" supaya tidak meleset zona waktu). Jangan diubah ke kalkulasi
--   tanggal otomatis tanpa alasan kuat.
-- - `legacy_id` menyimpan ID lama dari Google Sheets (mis. 'USR-014') untuk
--   rekonsiliasi saat migrasi data nanti. Boleh NULL untuk data baru yang
--   dibuat setelah clone ini aktif.
-- - RLS BELUM diaktifkan di file ini — menyusul di migration terpisah
--   (20261005000002_rls.sql) supaya tabel tidak kebuka publik di masa
--   antara create-table dan pasang-RLS.
-- - Fungsi RPC/Edge Function (logika bisnis: hitung telat, SP, payroll, dst)
--   menyusul di migration terpisah setelah schema ini stabil.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================== IDENTITAS ==================================

-- Pengganti USERS. id = auth.users.id (Supabase Auth), BUKAN lagi password
-- plaintext di tabel ini — password dikelola Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legacy_id text unique,
  nama text not null,
  bagian text not null,
  jabatan text not null,
  email text,
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  bintang smallint not null default 0 check (bintang between 0 and 5),
  skor smallint not null default 0 check (skor between 0 and 100),
  skor_kpi smallint not null default 0 check (skor_kpi between 0 and 100),
  gaji_bulanan integer not null default 0,
  final_score smallint not null default 0,
  nonaktif_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Pengganti sheet USERS. Password TIDAK disimpan di sini (lihat auth.users).';

-- Pengganti alur daftarAkun (self-registration), salah satu dari 9 endpoint
-- yang dulu GAP. Hanya untuk jalur daftar-sendiri; addKaryawanBaru (oleh
-- Owner) langsung insert ke profiles tanpa lewat sini.
create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  bagian text not null,
  jabatan text not null,
  email text,
  password_hash text not null,
  status text not null default 'PENDING' check (status in ('PENDING','AKTIF','DITOLAK')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);
comment on table public.registration_requests is 'Pengganti alur daftarAkun/approveRegistrasi/tolakRegistrasi (dulu GAP). Status DITOLAK disimpan sbg riwayat, tidak dihapus (keputusan Ko 2026-10-05).';

-- ============================== KONTEN / MASTER DATA ========================

create table public.jobdesks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  bagian text,
  jabatan text not null,
  link text,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  judul text not null,
  isi text not null,
  kategori text not null default 'UMUM' check (kategori in ('PENTING','INFO','UMUM')),
  target_bagian text not null default 'ALL',
  dibuat_oleh uuid references public.profiles(id),
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  created_at timestamptz not null default now()
);

create table public.team_ideas (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  judul text not null,
  deskripsi text,
  status text not null default 'BARU' check (status in ('BARU','DITINJAU','DITERIMA','DITOLAK')),
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  no_urut integer,
  kategori text,
  isi text not null,
  updated_at timestamptz not null default now()
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  tanggal date not null,
  nama text not null,
  difasilitasi boolean not null default true,
  dibuat_oleh uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Pengganti JADWAL_KHUSUS. PENTING: aturan "baris pertama yang cocok
-- menang" (bukan rentang tersempit/terbaru) direplikasi di fungsi RPC,
-- BUKAN di tabel ini — lihat migration fungsi nanti.
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  urutan integer not null,
  dari date not null,
  sampai date not null,
  jam_masuk time not null default '08:00',
  jam_pulang time not null default '18:00',
  created_at timestamptz not null default now()
);

-- Konten slider "Bintang Bulan Ini" di Beranda — pengganti sheet literal
-- REWARD (yang di app lama cuma dibaca, diedit manual di Sheets, TIDAK
-- sama dengan fitur "Penghargaan & Denda" — lihat manual_adjustments
-- lewat attendance_details di bawah).
create table public.featured_rewards (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  bulan text not null,
  user_id uuid references public.profiles(id),
  alasan text,
  pesan text,
  status text not null default 'AKTIF' check (status in ('AKTIF','NONAKTIF')),
  created_at timestamptz not null default now()
);

-- ============================== KPI =========================================

create table public.kpi_templates (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  jabatan text not null,
  no_urut integer,
  indikator text not null,
  keterangan text
);

create table public.kpi_reports (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  minggu text not null,
  kpi_template_id uuid references public.kpi_templates(id),
  indikator text not null,
  selesai boolean not null default false,
  catatan text not null default '',
  submitted_at timestamptz not null default now()
);
comment on table public.kpi_reports is 'submitKPILaporan lama: HAPUS semua baris user+minggu ini lalu insert ulang (replace, bukan append) — replikasikan di RPC.';

-- ============================== ABSENSI =====================================

-- Pengganti ABSENSI_APP (tap kamera real-time) + kolom foto Google Drive
-- sesuai 03-ARSITEKTUR-DATA.md.
create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  tanggal date not null,
  jam time not null,
  tipe text not null check (tipe in ('MASUK','PULANG','ABSEN')),
  latitude numeric,
  longitude numeric,
  akurasi_meter integer,
  jarak_kantor_meter integer,
  status text not null check (status in ('DITERIMA','DITOLAK')),
  source text not null default 'CAMERA' check (source in ('CAMERA','MANUAL','IMPORT')),
  -- Metadata foto Google Drive (foto fisik TETAP di Drive, bukan di Postgres)
  drive_file_id text,
  drive_web_view_url text,
  mime_type text,
  file_size integer,
  sha256 text,
  upload_status text check (upload_status in ('PENDING','UPLOADED','FAILED')),
  upload_error text,
  catatan text,
  created_at timestamptz not null default now()
);

-- Pengganti ABSENSI_RAW (staging import fingerprint lama). Dipertahankan
-- untuk rekonsiliasi migrasi data historis, bukan jalur aktif baru.
create table public.attendance_legacy_raw (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  nama_text text not null,
  tanggal date,
  jam_masuk time,
  jam_pulang time,
  minggu text,
  uploaded_at timestamptz
);

-- Pengganti ABSENSI_DETAIL — ledger detail (hadir/telat/absen/lembur/denda/
-- reward), satu baris per kejadian.
create table public.attendance_details (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  minggu text not null,
  tanggal date not null,
  waktu time,
  tipe text not null check (tipe in (
    'HADIR','TELAT','ABSEN','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR',
    'ANOMALI_PENDING','DENDA_SP','DENDA_ANOMALI','DENDA_MANUAL','REWARD_MANUAL'
  )),
  keterangan text,
  nilai integer not null default 0,
  is_generated boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.attendance_details is 'is_generated=true artinya baris ini aman dihapus-generate-ulang saat proses bulan diulang (meniru generatedTypes lama). Baris DENDA_SP/DENDA_MANUAL/REWARD_MANUAL harus is_generated=false supaya tidak ikut terhapus.';

-- Pengganti ABSENSI_REKAP — ringkasan per minggu.
-- PERHATIAN: total_denda di sini adalah tempat bug "SP2 dobel" lama hidup
-- (lihat DECISION-LOG.md baris "SP2 denda dobel") — replikasikan PERSIS
-- di fungsi RPC sesuai keputusan Ko, jangan diam-diam diperbaiki di sini.
create table public.attendance_weekly (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  minggu text not null,
  hadir integer not null default 0,
  telat integer not null default 0,
  absen integer not null default 0,
  lembur_minggu integer not null default 0,
  lembur_libur integer not null default 0,
  status text check (status in ('BAIK','KUNING','ORANGE','MERAH')),
  total_denda integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, minggu)
);

create table public.attendance_anomalies (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  tanggal date not null,
  jam time,
  tipe text check (tipe in ('HANYA_1_TAP_SORE','LUPA_TAP_PULANG','TAP_MASUK_SORE')),
  status text not null default 'MENUNGGU' check (status in ('MENUNGGU','NORMAL','DENDA')),
  created_at timestamptz not null default now(),
  deadline timestamptz
);

-- ============================== IZIN / SP / NOTIFIKASI ======================

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  tanggal date not null,
  jenis text not null check (jenis in ('SAKIT','IZIN')),
  keterangan text,
  status text not null default 'MENUNGGU' check (status in ('MENUNGGU','DISETUJUI','DITOLAK')),
  link_foto text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);

create table public.warning_history (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  bulan text not null,
  tipe_sp text not null check (tipe_sp in ('SP1','SP2','SP3')),
  alasan text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  judul text not null,
  isi text,
  tipe text check (tipe in ('INFO','PERINGATAN','SP1','SP2','SP3')),
  status text not null default 'BELUM' check (status in ('BELUM','SUDAH')),
  menu text not null default 's-notifikasi',
  created_at timestamptz not null default now()
);

-- ============================== GAJI / PAYROLL ===============================

-- Pengganti GAJI_HISTORY (sheet) + SALARY_SETTING (PropertiesService) —
-- DIKONSOLIDASI jadi satu tabel (dua sumber lama disatukan saat migrasi
-- data, lihat DECISION-LOG). Ini perubahan cara SIMPAN, bukan perubahan
-- hasil/nilai efektif — nilai yang keluar tetap mengikuti aturan "bulan
-- terbesar menang" yang sama.
create table public.salary_settings (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid not null references public.profiles(id),
  bulan text not null,
  gaji_bulanan integer not null,
  bonus_kerajinan integer not null default 150000,
  catatan text,
  dibuat_oleh uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  migrated_source text check (migrated_source in ('SHEET','PROPERTIES'))
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  bulan text not null unique,
  periode_mulai date,
  periode_akhir date,
  status text not null default 'DRAFT' check (status in ('DRAFT','CONFIRMED','PUBLISHED')),
  dibuat_oleh uuid references public.profiles(id),
  dibuat_pada timestamptz not null default now(),
  dikonfirmasi_oleh uuid references public.profiles(id),
  dikonfirmasi_pada timestamptz,
  dipublish_oleh uuid references public.profiles(id),
  dipublish_pada timestamptz
);

create table public.payroll_details (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  nama text, bagian text, jabatan text,
  gaji_pokok integer not null default 0,
  hari_kerja integer not null default 0,
  hadir integer not null default 0,
  absen integer not null default 0,
  telat integer not null default 0,
  lembur_pulang integer not null default 0,
  lembur_minggu integer not null default 0,
  lembur_libur integer not null default 0,
  total_reward integer not null default 0,
  total_denda integer not null default 0,
  bonus_kerajinan integer not null default 0,
  adjustment_plus integer not null default 0,
  adjustment_minus integer not null default 0,
  catatan_adjustment text not null default '',
  total_gaji integer not null default 0,
  status_slip text not null default 'DRAFT' check (status_slip in ('DRAFT','PUBLISHED')),
  unique (payroll_run_id, user_id)
);
comment on table public.payroll_details is 'bonus_kerajinan & adjustment_plus di sini adalah SNAPSHOT saat draft dibuat. Tampilan efektif (anti-dobel bonus kerajinan) dihitung ulang di RPC baca slip, meniru applyEffectivePayrollBonus_ lama — jangan overwrite kolom ini langsung dari hasil tampilan.';

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  payroll_detail_id uuid not null references public.payroll_details(id) on delete cascade,
  tipe text not null check (tipe in (
    'BONUS_KERAJINAN','DENDA_SP','DENDA_MANUAL','REWARD_MANUAL',
    'LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','ABSEN',
    'ADJUSTMENT_PLUS','ADJUSTMENT_MINUS'
  )),
  tanggal date,
  keterangan text,
  nominal integer not null default 0
);

-- ============================== SISTEM ======================================

create table public.app_settings (
  key text primary key,
  value text
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  waktu timestamptz not null default now(),
  actor uuid references public.profiles(id),
  action text not null,
  target text,
  before_data jsonb,
  after_data jsonb,
  catatan text
);
comment on table public.audit_logs is 'WAJIB diisi untuk semua operasi sensitif (payroll, gaji, approval) — app lama TIDAK mengisi ini untuk payroll sama sekali (temuan audit), ini perbaikan yang diwajibkan CLAUDE.md, bukan perubahan hasil bisnis.';

-- Index dasar yang jelas dibutuhkan (query per user+bulan/minggu sangat sering)
create index on public.attendance_details (user_id, minggu);
create index on public.attendance_details (tanggal);
create index on public.attendance_weekly (user_id);
create index on public.notifications (user_id, status);
create index on public.salary_settings (user_id, bulan);
create index on public.payroll_details (user_id);
create index on public.leave_requests (user_id, status);
create index on public.warning_history (user_id, bulan);
