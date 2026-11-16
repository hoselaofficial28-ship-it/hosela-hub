# Rencana Migrasi Data Hosela Hub Lama (GAS + Google Sheets) → Hosela Hub Baru (Supabase)

Tanggal analisis: **16 November 2026**.
Sumber: Spreadsheet `1jf0voXGD5E9TUoO9616GzsjjCpacVnfB5_HZyzF27po`
(terbaca publik lewat ekspor XLSX 531 KB — **tidak ada data yang diubah** di Spreadsheet).

## 0. Keputusan Ko (16 Nov 2026)

1. **Data uji boleh dibersihkan** (setelah backup). Profil uji tidak dihapus, hanya dinonaktifkan.
2. **Akun login hanya untuk karyawan AKTIF**; password awal **`hosela`** (bukan acak, bukan PIN lama).
   Catatan teknis: riwayat absen/slip milik mantan karyawan (Arif, Muamar, Rafa) tetap butuh
   pemilik data, jadi akunnya dibuat **status NONAKTIF** (tidak muncul di papan peringkat).
3. **Payroll yang belum ada datanya akan disusulkan Ko sendiri** — sistem hanya perlu
   menyediakan jalan untuk membuat + mengisi payroll bulan mana pun (lihat bagian 8).

## 0b. Alat yang sudah dibuat

| Berkas | Isi |
|---|---|
| `supabase/migrations/20261116000050_import_legacy_gas.sql` | alat impor (belum mengubah data) |
| `supabase-clone/tools/import-legacy-gas.mjs` | skrip impor + laporan, bawaan **dry-run** |
| `supabase-clone/tests/migrasi-data-lama.test.mjs` | 33 uji statis (lulus) |
| `Temp/ekspor-sheet-ke-json.mjs` | ekspor Spreadsheet → JSON (`Temp/hosela-hub-lama.json`) |

---

## 1. Isi data lama (hasil baca sungguhan, bukan perkiraan)

| Sheet | Baris | Isi | Tujuan di Supabase |
|---|---|---|---|
| `USERS` | 10 (1 baris kosong) | karyawan + PIN + gaji + bintang/skor | `profiles` + akun login |
| `SALARY_HISTORY` | 26 | riwayat gaji (baseline) | `salary_settings` |
| `GAJI_HISTORY` | 24 | riwayat gaji + kerajinan (Agu & Sep 2026) | `salary_settings` |
| `ABSENSI_APP` | 1546 | tap kamera 2026-05-01 → 2026-11-16 | `attendance_events` |
| `ABSENSI_DETAIL` | 1081 | HADIR/TELAT/ABSEN/LEMBUR/denda 2026-03-02 → 2026-11-13 | `attendance_details` |
| `ABSENSI_REKAP` | 173 | rekap mingguan 2026-W09 → 2026-W46 | `attendance_weekly` |
| `ABSENSI_RAW` | 189 | finger print mentah 2026-03-02 → 2026-04-30 | `attendance_legacy_raw` |
| `ANOMALI` | 27 | tap tidak wajar 2026-03 → 2026-05 | `attendance_anomalies` |
| `SP_HISTORY` | 106 | SP1/SP2/SP3 Mar–Agu 2026 | `warning_history` |
| `IZIN` | 1 | pengajuan izin | `leave_requests` |
| `IZIN_TELAT` | 61 | review telat/izin khusus | `late_reviews` |
| `PAYROLL_RUN` | 24 | hanya 4 bulan unik: 2026-04, 05, 07, 08 | `payroll_runs` |
| `PAYROLL_DETAIL` | 135 | slip per karyawan | `payroll_details` |
| `PAYROLL_ITEM` | 721 | rincian slip (denda, lembur, kerajinan…) | `payroll_items` |
| `KPI_LAPORAN` | 720 | checklist KPI mulai 2026-W17 | `kpi_reports` |
| `KPI_TEMPLATE` | 44 | 5 jabatan | `kpi_templates` |
| `JOBDESK` | 6 | tautan dokumen per jabatan | `jobdesks` |
| `PERATURAN` | 42 | 7 kategori aturan | `rules` |
| `KALENDER_LIBUR` | 6 | libur 2026 (Idul Fitri 4 hari, Adha, 17-an) | `holidays` |
| `JADWAL_KHUSUS` | 0 | kosong (Ramadan sudah lewat) | `work_schedules` (kosong) |
| `PENGUMUMAN` | 4 | pengingat KPI otomatis | `announcements` |
| `NOTIFIKASI` | 320 | 10 karyawan | `notifications` |
| `AUDIT_LOG` | 102 | jejak aksi | `audit_logs` |
| `IDE_TIM` / `REWARD` | 0 / 0 | kosong | `team_ideas` / `featured_rewards` |
| `PENGATURAN` | 5 | lokasi kantor, link panduan, folder foto | `app_settings` |
| `ABSENSI_UPLOAD` | 17 | format finger print lama (sel gabungan, bukan data) | **tidak dimigrasi** |

**Temuan penting:**

1. **Payroll lama = 1 run untuk 1 karyawan** (24 run → hanya 4 bulan). Di Supabase slip dikelompokkan per bulan, jadi importer wajib **menggabungkan** run per bulan (ambil status tertinggi: PUBLISHED > CONFIRMED > DRAFT). Status yang ada: Apr & Mei & Agu = PUBLISHED, Jul = CONFIRMED.
2. **Tidak ada payroll untuk Jun, Sep, Okt, Nov 2026** — dibiarkan kosong.
3. **Lokasi kantor tersimpan tanpa desimal**: `OFFICE_LAT = -62374781`, `OFFICE_LNG = 1065273101` → harus dibagi 100.000.000 menjadi `-6.2374781` / `106.5273101`. Radius 500 m.
4. **5 karyawan tanpa email** (Desi, Sanjaya, Muamar, Rafa, Reyfan) → tidak bisa dibuat akun login tanpa email.
5. **PIN lama berupa teks biasa** → tidak boleh disalin sebagai password (aturan keamanan), dan `profiles` tidak punya kolom PIN.
6. **Tanggal di Sheets campur**: angka seri (45915) dan teks (`2026-07`). Importer wajib menangani dua-duanya (epoch Google = 1899-12-30).
7. **Foto absensi lama** berupa tautan Google Drive; foto baru disimpan privat di Supabase Storage. Tautan lama diimpor apa adanya (tidak diunggah ulang — 1546 foto).
8. Di database baru **sekarang masih ada data uji**: 2 profil (adi + Sanjaya), 90 tap, 56 detail, 1 payroll run, 2 izin, 3 SP, 2 SB. Data ini akan **mengganggu** papan peringkat & rekap kalau tidak dibersihkan lebih dulu.

---

## 2. Keadaan database baru (dicek langsung 16 Nov 2026)

| Tabel | Isi sekarang | Target setelah migrasi |
|---|---|---|
| `profiles` | 2 | 10 (+1 akun Owner yang sudah ada) |
| `salary_settings` | 6 | ± 50 baris (gabungan 2 sheet, tanpa duplikat) |
| `attendance_events` | 90 | 1546 |
| `attendance_details` | 56 | 1081 |
| `attendance_weekly` | 7 | 173 |
| `warning_history` | 3 | 106 |
| `payroll_runs` | 1 | 4 (per bulan, digabung) |
| `payroll_details` | 1 | 135 |
| `payroll_items` | 8 | 721 |
| `kpi_reports` | 0 | 720 |
| `notifications` | 2 | 320 |
| `late_reviews` | 0 | 61 |

Semua tabel tujuan **sudah punya kolom `legacy_id`** — jadi ID lama (`USR-001`, `APP-e2e5c55a`, `PAY-d8b9374d`, dst.) bisa disimpan sebagai jejak dan impor bisa diulang tanpa membuat data ganda.

---

## 3. Urutan migrasi (wajib berurutan karena saling terkait)

### Tahap 0 — Persiapan (aman, bisa dibatalkan)
1. Backup database baru (Supabase → Database → Backups) **dan** salin Spreadsheet lama (File → Buat salinan).
2. Simpan ekspor XLSX sebagai arsip: `Temp/hosela-hub-lama.xlsx`.
3. **Bersihkan data uji** (adi + absensi/payroll/SP uji) setelah backup — *butuh persetujuan Ko*.

### Tahap 1 — Akun & karyawan (`USERS` → `profiles` + Auth)
- Buat 10 akun login: email dari sheet; yang kosong dibuat `nama@hoselaofficial.com`.
- Password awal = **sementara** (dibuat acak, diberikan Ko ke karyawan), bukan PIN lama. PIN lama **tidak** diimpor.
- Isi `profiles`: nama, bagian, jabatan, status, bintang, skor, skor_kpi, gaji_bulanan, final_score, `legacy_id = USR-00x`.
- Owner (USR-006 Sanjaya) disambungkan ke akun Owner yang sudah ada.

### Tahap 2 — Master data (kecil, cepat)
`jobdesks`, `kpi_templates`, `rules`, `holidays`, `announcements`, `app_settings`, `salary_settings`, `featured_rewards`, `team_ideas`, `work_schedules`.

Aturan khusus:
- `holidays`: tanggal seri → `YYYY-MM-DD`; `Difasilitasi YA` → boolean.
- `app_settings`: `OFFICE_LAT`/`OFFICE_LNG` dibagi 100.000.000; `LINK_PANDUAN` apa adanya; `ABSENSI_PHOTO_FOLDER_ID` disimpan sebagai catatan lama.
- `salary_settings`: gabung `SALARY_HISTORY` + `GAJI_HISTORY`, kunci unik (karyawan, bulan), ambil yang paling baru. `bulan` seri → `YYYY-MM`.

### Tahap 3 — Absensi (data terbesar)
Urutan: `attendance_legacy_raw` → `attendance_events` → `attendance_details` → `attendance_weekly` → `attendance_anomalies`.

Aturan khusus:
- `ABSENSI_APP`: `Jam` pecahan hari (0,5491) → jam `13:11`; `Tipe` ABSEN/MASUK/PULANG; `Status` DITERIMA/DITOLAK; `Foto_URL` ke kolom `drive_web_view_url` (bukan bucket baru).
- `ABSENSI_DETAIL`: `Minggu` (`2026-W10`) disalin apa adanya; `Nilai` = nominal integer.
- `ABSENSI_REKAP`: `Status_Peringatan` BAIK/KUNING/ORANGE/MERAH → `status`; kolom pertama tanpa judul = `legacy_id` (`RKP-…`).
- Rekap **diimpor apa adanya** (jangan dihitung ulang), supaya riwayat bulan lalu tidak berubah.

### Tahap 4 — Izin, SP, notifikasi
- `IZIN` → `leave_requests` (1 baris, status MENUNGGU).
- `IZIN_TELAT` → `late_reviews` (61 baris, status `IZIN_TELAT_KHUSUS` / `MENUNGGU`).
- `SP_HISTORY` → `warning_history` (`bulan` seri → `YYYY-MM`).
- `NOTIFIKASI` → `notifications` (status BELUM/SUDAH; kolom menu `s-notifikasi`).
- `sanksi_berulang` **tidak diimpor** (aturan baru, belum ada di data lama) — dihitung mulai bulan berjalan.

### Tahap 5 — Payroll historis (paling sensitif)
- Gabungkan 24 run → **5 run bulanan** (2026-03 hasil simpulan, 04, 05, 07, 08) dengan status tertinggi.
- **24 dari 135 slip** menunjuk `payroll run` yang sudah tidak ada di sheet (total
  **Rp 73.709.444**). Bulannya disimpulkan dari tanggal rincian slip, lalu dibuat run
  susulan; semua kasus dicatat di laporan impor supaya bisa diperiksa.
- `PAYROLL_DETAIL` & `PAYROLL_ITEM` diimpor **apa adanya** (snapshot), tidak dihitung ulang, karena slip PUBLISHED adalah bukti yang sudah dibayar.
- Nominal dibulatkan ke integer rupiah.

### Tahap 6 — KPI & audit
`KPI_LAPORAN` (720) → `kpi_reports` (cocokkan `ID_KPI` dengan template + user), `AUDIT_LOG` (102) → `audit_logs`.

---

## 4. Cara teknis impor (tanpa menyimpan kunci berbahaya)

1. Migrasi baru `050_import_legacy_gas.sql`:
   - tabel `legacy_import_batches` (log tiap batch: tabel, jumlah, waktu, pelaku),
   - fungsi `import_legacy_rows(p_tabel text, p_rows jsonb)` — hanya untuk Owner, **upsert berdasarkan `legacy_id`** (aman diulang, tidak menggandakan data),
   - fungsi `legacy_import_summary()` untuk laporan rekonsiliasi.
2. Skrip lokal `supabase-clone/tools/import-legacy-gas.mjs`:
   - membaca `Temp/hosela-hub-lama.xlsx`,
   - mengubah tanggal/jam/angka sesuai aturan di atas,
   - mengirim per batch 200 baris, berhenti kalau ada error (tidak menelan error),
   - mencetak laporan sebelum & sesudah.
3. Tidak memakai service-role key di browser dan tidak menyimpan kunci di repo (dibaca dari environment saat dijalankan).

---

## 5. Rekonsiliasi (bukti migrasi benar)

| Pemeriksaan | Target |
|---|---|
| Jumlah baris per sheet vs tabel | sama persis (1546, 1081, 173, 106, 320, 720, 721, …) |
| Total gaji pokok per bulan (Apr/Mei/Jul/Agu) | sama dengan `PAYROLL_DETAIL.totalGaji` |
| Total denda & kerajinan per bulan | sama |
| 5 slip diacak (termasuk Apr & Mei PUBLISHED) | angka identik dengan sheet |
| Papan peringkat | urutan bintang/skor sama dengan aplikasi lama |
| Absensi 5 hari diacak per karyawan | tanggal, tipe, jam sama |
| Halaman KPI | `2026-W17` dst. muncul sama |
| Login 10 karyawan | bisa masuk, data pribadi masing-masing tampil |

Kalau ada selisih: **dicatat, tidak diperbaiki diam-diam**, lalu dilaporkan ke Ko.

---

## 6. Rollback

- Selama migrasi hanya **tambah data** (upsert by `legacy_id`), aplikasi lama tetap berjalan.
- Rollback = hapus baris yang punya `legacy_id` (satu perintah SQL, disiapkan di migrasi 050) lalu pulihkan backup.
- Spreadsheet lama **tidak dihapus** dan tetap dipakai sampai satu siklus payroll berjalan tanpa selisih.

---

## 7. Yang belum bisa disamakan (perlu keputusan)

| Hal | Alasan |
|---|---|
| PIN lama | tidak bisa dipakai sebagai password login Supabase (keamanan). Dipakai `hosela` sesuai keputusan Ko |
| Foto absensi lama | masih tautan Google Drive; tidak diunggah ulang (1546 foto) |
| Sanksi Berulang (SB) | aturan baru, tidak ada di data lama |
| Payroll Jun/Sep/Okt/Nov 2026 | di aplikasi lama memang tidak ada → disusulkan Ko (bagian 8) |
| `ABSENSI_UPLOAD` | format finger print lama berupa sel gabungan, bukan baris data |

## 8. Menyusulkan payroll bulan yang kosong (alur untuk Ko)

1. Buka aplikasi → menu **Payroll**.
2. Pilih bulan yang kosong (mis. Juni 2026), lalu buat **Draf** penggajian.
3. Isi/cek angka per karyawan: gaji pokok, hari kerja, hadir/telat/absen, lembur,
   denda, kerajinan, penyesuaian.
4. Kalau ingin otomatis dari Catatan Kehadiran, gunakan **Sinkronkan dengan Catatan Kehadiran**
   (mengisi ulang dari data absensi bulan itu), lalu periksa sebelum dikonfirmasi.
5. Konfirmasi → Publish setelah angkanya benar.

Daftar bulan yang perlu disusulkan bisa dilihat dari fungsi `legacy_missing_payroll()`
(mengembalikan bulan yang sudah punya data absensi tetapi belum punya payroll run).

## 9. Perintah menjalankan

```powershell
# 1) Ko jalankan migrasi 050 di Supabase SQL Editor (hanya membuat alat, tidak mengubah data)

# 2) laporan saja (tidak menulis apa pun)
$env:HUB_OWNER_NAMA='sanjaya'; $env:HUB_OWNER_SANDI='<sandi Owner>'
node supabase-clone/tools/import-legacy-gas.mjs --dry-run

# 3) impor sungguhan (data uji dibersihkan lebih dulu, akun dibuat, data masuk)
node supabase-clone/tools/import-legacy-gas.mjs --apply
```

## 10. Hasil migrasi — SELESAI 16 November 2026

| Data | Dari sheet | Masuk Supabase | Catatan |
|---|---|---|---|
| Karyawan | 10 | 10 profil | akun login dibuat (sandi `hosela`); 3 mantan karyawan status NONAKTIF |
| Tap kamera | 1546 | 1546 | foto tetap tautan Google Drive lama |
| Detail absensi | 1081 | 1081 | semua tipe terbawa |
| Rekap mingguan | 173 | 173 | status BAIK/KUNING/ORANGE/MERAH utuh |
| Finger print mentah | 189 | 189 | arsip |
| Anomali tap | 27 | 27 | |
| SP1/SP2/SP3 | 106 | 106 | |
| Review telat | 61 | 61 | status lama `MENUNGGU` → `TELAT_NORMAL`, status asli disimpan di `catatan` |
| Izin | 1 | 1 | |
| Notifikasi | 320 | 320 | |
| Payroll run | 24 run | 5 run bulanan | 2026-03 (simpulan), 04, 05, 07, 08 |
| Slip gaji | 135 | 24 slip | **111 draf berulang dilewati** (1 slip per karyawan per bulan: PUBLISHED > CONFIRMED > draf terbaru) |
| Rincian slip | 721 | 124 | 597 ikut dilewati karena mengikuti draf yang tidak dipakai |
| KPI laporan | 720 | 720 | |
| Template KPI / jobdesk / peraturan / libur / pengumuman | 44 / 6 / 42 / 6 / 4 | sama | |
| Pengaturan | 5 | 5 | koordinat kantor `-6.2374781 / 106.5273101`, radius 500 m |
| Audit log | 102 | 102 | |

**Temuan yang sudah diperbaiki saat impor**

1. **5 slip** menunjuk payroll run yang sudah hilang; bulannya disimpulkan dari tanggal rinciannya (total **Rp 15.556.364**) → masuk ke run **2026-03** (status DRAFT).
2. **Koordinat kantor** di sheet tersimpan tanpa desimal (`-62374781`); pembaginya **10.000.000** (bukan 100.000.000).
3. **Tipe item `POTONGAN_ABSEN`** (71 baris) sementara disimpan sebagai `ABSEN` karena batasan skema belum mengizinkannya. Setelah Ko menjalankan migrasi **053**, jalankan ulang impor dengan `HUB_ITEM_POTONGAN=1` agar label slip kembali "Potongan absen".
4. **Payroll yang perlu disusulkan Ko**: **2026-06, 2026-09, 2026-10, 2026-11** (sudah ada absensinya, belum ada payroll).

**Verifikasi setelah impor (langsung ke database)**

- Login karyawan aktif berfungsi, papan peringkat menampilkan 5 karyawan aktif dengan bintang/skor asli.
- `get_absensi_rekap`, `get_rekap_bulanan_semua`, `get_papan_peringkat`, `get_absensi_photo_stats` mengembalikan data.
- Slip April 2026 (Adhe) terbaca: hadir 24, absen 2, telat 1, total Rp 3.220.770 — sama dengan sheet.
- Angka rumah tangga: 33/33 test lulus; rekonsiliasi `legacy_import_summary` tanpa selisih.


