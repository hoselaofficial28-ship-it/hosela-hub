# Arsitektur Supabase dan Google Drive

## Alur sistem

```text
Browser/PWA
  ├─ Supabase Auth
  ├─ Query aman melalui RLS
  └─ RPC / Edge Functions untuk operasi sensitif
          ├─ PostgreSQL Supabase
          ├─ Google Drive API untuk foto
          └─ Email/notifikasi terjadwal
```

## Tabel minimum

| Tabel | Pengganti data lama | Tujuan |
|---|---|---|
| `profiles` | `USERS` | identitas, bagian, jabatan, status, email, skor, bintang, gaji dasar |
| `registration_requests` | alur daftar/approval | akun baru menunggu persetujuan |
| `jobdesks` | `JOBDESK` | link dan tanggung jawab jabatan/bagian |
| `announcements` | `PENGUMUMAN` | pengumuman bertarget |
| `team_ideas` | `IDE_TIM` | ide karyawan |
| `rules` | `PERATURAN` | peraturan aktif |
| `holidays` | `KALENDER_LIBUR` | hari libur aktif |
| `work_schedules` | `JADWAL_KHUSUS` | jadwal efektif berdasarkan rentang tanggal |
| `kpi_templates` | `KPI_TEMPLATE` | indikator per jabatan |
| `kpi_reports` | `KPI_LAPORAN` | checklist mingguan per user |
| `attendance_events` | `ABSENSI_APP`, `ABSENSI_RAW` | setiap tap masuk/pulang, sumber, lokasi, foto, status |
| `attendance_daily` | matriks/read model | masuk pertama, pulang terakhir, jadwal, status harian |
| `attendance_details` | `ABSENSI_DETAIL` | hadir/telat/absen/lembur/denda/reward terurai |
| `attendance_weekly` | `ABSENSI_REKAP` | ringkasan per minggu |
| `attendance_anomalies` | `ANOMALI` | tap tidak wajar dan keputusan |
| `leave_requests` | `IZIN` | izin/sakit dan approval |
| `manual_adjustments` | `REWARD` + sanksi manual | reward/denda manual |
| `warning_history` | `SP_HISTORY` | SP1/SP2/SP3 dan alasan |
| `salary_settings` | `GAJI_HISTORY`/`SALARY_SETTING` | gaji dan kerajinan efektif sejak bulan tertentu |
| `payroll_runs` | `PAYROLL_RUN` | status payroll bulanan |
| `payroll_details` | `PAYROLL_DETAIL` | snapshot slip per karyawan |
| `payroll_items` | `PAYROLL_ITEM` | rincian komponen slip |
| `notifications` | `NOTIFIKASI` | notifikasi dan badge |
| `app_settings` | `PENGATURAN` | koordinat kantor, radius, folder Drive, konfigurasi |
| `audit_logs` | `AUDIT_LOG` | siapa mengubah apa, sebelum/sesudah, kapan |

Gunakan UUID sebagai primary key baru dan simpan `legacy_id` unik agar rekonsiliasi dengan Spreadsheet dapat dilakukan.

## Kolom penting foto Drive

Pada `attendance_events` dan tabel bukti izin bila diperlukan:

- `drive_file_id`
- `drive_web_view_url`
- `mime_type`
- `file_size`
- `sha256`
- `captured_at`
- `uploaded_at`
- `owner_user_id`
- `upload_status`
- `upload_error`

Jangan menyimpan base64 foto di PostgreSQL setelah upload berhasil.

## Upload foto yang aman

1. Browser mengambil foto dan lokasi.
2. Browser mengirim blob + metadata + JWT ke Edge Function.
3. Edge Function memverifikasi user aktif, tipe tap, timestamp, koordinat, radius, mime type, dan batas ukuran.
4. Edge Function mengunggah file ke folder Google Drive menggunakan secret server.
5. Edge Function menyimpan event dan metadata Drive dalam satu alur terkontrol.
6. Jika upload Drive gagal, tampilkan penyebab sebenarnya dan status dapat dicoba ulang. Jangan mencatat absensi seolah foto sudah aman bila upload belum berhasil.

Rekomendasi akses Drive: service account khusus, lalu folder foto dibagikan ke email service account. Simpan private key di Supabase secrets, bukan `.env` frontend.

## Keamanan/RLS minimum

- Karyawan: baca profil sendiri, absensi sendiri, izin sendiri, notifikasi sendiri, KPI sendiri, slip sendiri.
- Finance: akses operasional absensi, izin, gaji, payroll, adjustment, dan review sesuai aplikasi aktif.
- Owner: akses administrasi dan laporan seluruh tim.
- Mutasi lintas user dan operasi finansial hanya melalui RPC/Edge Function dengan pengecekan role server-side.
- Audit log tidak boleh bisa diubah atau dihapus dari browser.
- Published payroll tidak boleh di-update langsung oleh client. Perilaku aplikasi aktif yang menerapkan setting kerajinan efektif pada tampilan slip historis harus dimodelkan sebagai koreksi/audit yang jelas, bukan mutasi tersembunyi.

## Kredensial

File `.env` lokal minimal berisi nama variabel berikut dan harus di-ignore:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server/Edge Function only
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=      # Supabase secret only
```

Jangan pernah menaruh nilai asli pada dokumentasi atau commit.
