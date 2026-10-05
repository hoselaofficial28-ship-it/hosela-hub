# Data Dictionary — Hasil Audit Mendalam

Disusun dari 5 audit mendalam (2026-10-05) atas `gas/Code.gs` (backend aktif), `js/app.js`, `js/payroll.js`, `index.html`, dan arsip `gas-backup/`, `gas-paste/`, `gas-split/`. Setiap klaim bersitasi `file:baris`. Laporan mentah lengkap (lebih detail dari ringkasan ini) ada di riwayat sesi — dokumen ini adalah versi resmi yang dipakai sebagai acuan skema Supabase.

Catatan metodologi: sebagian sheet punya fungsi pembuat header eksplisit (`ensureXxxSheet_()`) — kolomnya **dikonfirmasi**. Sheet lain (`USERS`, `ABSENSI_RAW`, `ABSENSI_DETAIL`, `ABSENSI_REKAP`, `JOBDESK`) tidak punya definisi header di kode — kolomnya **disimpulkan** dari pola baca/tulis yang konsisten di banyak lokasi, ditandai jelas di tabel.

---

## 1. Identitas

### `USERS` (14 kolom, A–N — disimpulkan, dikonfirmasi via `readSheetRows_(..., 14)` di `gas/Code.gs:481`)

| # | Kolom | Tipe | Enum/nilai | Sitasi kunci |
|---|---|---|---|---|
| A | `id` | string, bebas | — | `gas/Code.gs:129,141,162,174` |
| B | `nama` — **juga username login** (match case-insensitive+trim) | string | — | `gas/Code.gs:126` |
| C | `sandi` — **plaintext**, dibandingkan string langsung | string | default baru = `"hosela"` | `gas/Code.gs:127-128,142-143` |
| D | `bagian` — departemen, `Owner`/`Finance` dobel fungsi sebagai role akses | string | `Owner`, `Finance`, + bebas (`Packing`, dst) | `gas/Code.gs:129,181` |
| E | `jabatan` | string, divalidasi silang ke `JOBDESK` | contoh: `Kepala Gudang`, `Admin Ecommerce` | `gas/Code.gs:129` |
| F | `email` | string | boleh kosong | `gas/Code.gs:3946` |
| G | `status` | enum | `AKTIF`, `NONAKTIF` | `gas/Code.gs:126,163` |
| H | — | **TIDAK DITEMUKAN** (tak pernah dibaca/ditulis) | — | bukti negatif: `nonaktifkanUser` lompat G→I |
| I | tanggal nonaktif (asumsi) | date | hanya ditulis, tak pernah dibaca ulang | `gas/Code.gs:164` |
| J | `bintang` | number 1–5 | — | `gas/Code.gs:901,906` |
| K | `skor` (skor akhir gabungan) | number 0–100 | — | `gas/Code.gs:907` |
| L | `skorKPI` | number 0–100 | — | `gas/Code.gs:908` |
| M | `gajiBulanan` | integer rupiah | — | `gas/Code.gs:1026,307,310` |
| N | `finalScore` (dipakai ranking, BUKAN sama dengan `skor` yang tampil di profil) | number | — | `gas/Code.gs:909` |

Catatan penting:
- **Tidak ada `appendRow` ke `USERS` di manapun** — baris karyawan baru tidak pernah dibuat oleh kode (lihat §6, 9 endpoint gap).
- Login **stateless**, tanpa tabel sesi/token — klien hanya simpan `currentUser` di memori + `localStorage.hh_username` (`js/app.js:953`).
- `validatePIN(pin)` (`gas/Code.gs:135`) adalah **dead code** — selalu `{success:false}`, tidak dipanggil dispatcher maupun frontend. Dispatcher case `'validatePIN'` (`gas/Code.gs:38`) adalah alias legacy yang sebenarnya memanggil `validateLogin`, bukan fungsi `validatePIN` di atas — dua hal bernama sama yang **tidak saling terhubung**, jangan tertukar saat porting.
- Tidak ada pengecekan otorisasi server-side untuk `getAllUsers`/`nonaktifkanUser` — gating 100% dari UI.

### `PENGATURAN` (key-value, 2 kolom)

Key yang terbukti dipakai kode:

| Key | Arti | Sitasi |
|---|---|---|
| `OFFICE_LAT` / `OFFICE_LNG` | Koordinat kantor untuk validasi radius | `gas/Code.gs:2343-2344` |
| `OFFICE_RADIUS_M` | Radius toleransi (meter), default 120 | `gas/Code.gs:2345` |
| `ABSENSI_PHOTO_FOLDER_ID` | ID folder Google Drive foto absensi **yang sudah ada sekarang** | `gas/Code.gs:2346` |
| `LINK_PANDUAN` | Link dokumen panduan aplikasi | `js/app.js:2412` |

Tidak ada sheet/key apa pun terkait "registrasi" di backend aktif.

---

## 2. Konten & Master Data

### `JOBDESK` (4 kolom, read-only — tidak ada tambah/ubah/hapus)

| # | Kolom | Sitasi |
|---|---|---|
| A | TIDAK DITEMUKAN (tak pernah dibaca) | — |
| B | `bagian` (fallback match) | `gas/Code.gs:608` |
| C | `jabatan` (primary match) | `gas/Code.gs:606,608` |
| D | `link` (URL dokumen) | `gas/Code.gs:606,608` |

`getJobdeskList()`/`getStaffByBagian()` (meski di bawah komentar `JOBDESK`) sebenarnya membaca sheet **`USERS`**, bukan `JOBDESK` — jangan tertukar (`gas/Code.gs:585-601`).

### `PENGUMUMAN` (8 kolom, A–H)

| # | Kolom | Enum/nilai | Sitasi |
|---|---|---|---|
| A | `id` (`PNG-XXX`) | — | `gas/Code.gs:980` |
| B | `judul` | — | `gas/Code.gs:981` |
| C | `isi` | — | `gas/Code.gs:981` |
| D | `kategori` | `PENTING`/`INFO`/`UMUM` (UI saja, backend tak validasi) | `index.html:302` |
| E | `targetBagian` | `ALL`/`Live`/`Packing`/`Ecommerce`/`Finance` — matching **string equality bebas** | `gas/Code.gs:490,969` |
| F | `dibuatOleh` (expose sbg field `dibuat`) | — | `gas/Code.gs:972` |
| G | tanggal dibuat | — | `gas/Code.gs:981` |
| H | `status` | hanya pernah `AKTIF` | `gas/Code.gs:981` |

Tidak ada fungsi update/delete/nonaktifkan.

### `IDE_TIM` (7 kolom, A–G)

| # | Kolom | Enum/nilai | Sitasi |
|---|---|---|---|
| A | `id` (`IDE-XXX`) | — | `gas/Code.gs:1006` |
| B | `userId` (FK USERS) | — | `gas/Code.gs:1007` |
| C | `judul` | — | `gas/Code.gs:1007` |
| D | `deskripsi` | — | `gas/Code.gs:1007` |
| E | tanggal dibuat | — | `gas/Code.gs:1007` |
| F | `status` | UI kenal `BARU`/`DITINJAU`/`DITERIMA`/`DITOLAK`, **backend hanya pernah menulis `BARU`** | `gas/Code.gs:1007`; `js/app.js:1611` |
| G | `feedback` | default `''` | `gas/Code.gs:1007` |

Tidak ada fungsi ubah status/feedback — kemungkinan diedit manual di Sheets (sama seperti `PERATURAN`).

### `PERATURAN` (3 kolom, A–C, 100% read-only)

`no`, `kategori`, `isi` — dibaca `gas/Code.gs:3925`. **Dikonfirmasi diedit manual di Google Sheets** (komentar kode sendiri, `gas/Code.gs:4036`: *"Dipanggil Owner setelah update peraturan di Sheets"*).

### `KALENDER_LIBUR` (6 kolom, A–F)

| # | Kolom | Enum/nilai | Sitasi |
|---|---|---|---|
| A | `id` (`LBR-XXX`) | — | `gas/Code.gs:3915` |
| B | `tanggal` | — | `gas/Code.gs:3916` |
| C | `nama` | — | `gas/Code.gs:3916` |
| D | `difasilitasi` | hanya pernah `'YA'` | `gas/Code.gs:3916,1033` |
| E | `dibuatOleh` | tak pernah dibaca ulang | `gas/Code.gs:3916` |
| F | tanggal dibuat | tak pernah dibaca ulang | `gas/Code.gs:3916` |

Tidak ada fungsi update/delete (lihat §6 — `hapusLibur`).

### `JADWAL_KHUSUS` (4 kolom, A–D — tanpa API/UI, murni lookup internal)

`dari`, `sampai`, `jamMasuk` (default `08:00`), `jamPulang` (default `18:00`). **Match PERTAMA menang** (urutan baris di sheet, bukan rentang tersempit/terbaru) — `getJadwalHariApp_`, `gas/Code.gs:3009-3017`. Overlap antar baris: baris lebih atas selalu menang untuk tanggal yang sama.

---

## 3. KPI & Absensi

### `KPI_TEMPLATE` — header resmi `gas/Code.gs:4158`: `['ID_KPI','Posisi','No','Indikator','Keterangan']`. Hanya diseed untuk 5 jabatan (`Admin Packing`, `Kepala Gudang`, `Host Live`, `Admin Ecommerce`, `Finance`).

### `KPI_LAPORAN` — header resmi `gas/Code.gs:4200`: `['ID_Laporan','ID_User','Minggu','ID_KPI','Indikator','Selesai','Catatan','Tgl_Submit']`. `submitKPILaporan` **menghapus dulu semua baris milik user+minggu itu lalu insert ulang** (replace, bukan append) — `gas/Code.gs:651-655`.

### `ABSENSI_APP` — header resmi `gas/Code.gs:2325-2328`: `['ID','ID_User','Nama','Tanggal','Jam','Tipe','Latitude','Longitude','Akurasi_Meter','Jarak_Kantor_Meter','Status','Foto_URL','Catatan','Created_At']` (14 kolom). ID prefix beda per sumber: `APP-` (tap kamera), `APP-MANUAL-` (edit Finance/Owner), `APP-IMPORT-` (CSV fingerprint). Idempotensi: tolak tap kedua tipe sama (`DUPLICATE_TAP`) & maks 2 tap DITERIMA/hari (`gas/Code.gs:2446-2451`). Edit manual = **upsert** per (user,tanggal,tipe) — bisa menimpa baris tap kamera asli.

### `ABSENSI_RAW` (disimpulkan, khusus jalur fingerprint lama — kolom: ID, **Nama** [bukan userId], Tanggal, JamMasuk, JamPulang, Minggu, timestamp upload). Tidak ada kode jalur kamera yang menulis ke sini.

### `ABSENSI_DETAIL` (disimpulkan, 7 kolom: ID, userId, minggu, tanggal, tipe, keterangan, nilai). Enum tipe (11 nilai): `HADIR, TELAT, ABSEN, LEMBUR_PULANG, LEMBUR_MINGGU, LEMBUR_LIBUR, ANOMALI_PENDING, DENDA_SP, DENDA_ANOMALI, DENDA_MANUAL, REWARD_MANUAL`.

### `ABSENSI_REKAP` (disimpulkan, 10 kolom: ID, userId, minggu, hadir, telat, absen, lemburMinggu, lemburLibur, status, **totalDenda**). Status dari rumus `absen+telat` (lihat §4.9). **Tidak ada kolom lemburPulang** (hanya tersimpan sebagai baris `ABSENSI_DETAIL`). Update = upsert-by-key (userId,minggu), tidak pernah delete+insert.

### `ANOMALI` — header resmi `gas/Code.gs:3478`: `['ID','ID_User','Tanggal','Jam','Tipe','Status','Created_At','Deadline']`. Tipe: `HANYA_1_TAP_SORE`, `LUPA_TAP_PULANG`, `TAP_MASUK_SORE` (hanya dari jalur legacy). Status: `MENUNGGU`→`NORMAL`/`DENDA`. Deadline = created+3 hari.

---

## 4. Izin, SP, Notifikasi, Reward

### `IZIN` (8 kolom) — `appendRow` persis di `gas/Code.gs:4359`: `[id, userId, tanggal, jenis, keterangan, 'MENUNGGU', timestamp, linkFoto]`. `jenis` ∈ `SAKIT`/`IZIN`. `status`: `MENUNGGU`→`DISETUJUI`/`DITOLAK`. **Tidak ada validasi tanggal "harus hari yang sama" di server** — itu teks UI saja.

### `SP_HISTORY` (6 kolom) — `[id, userId, bulan, tipeSP, alasan, timestamp]` (`gas/Code.gs:4668`). `tipeSP` ∈ `SP1`/`SP2`/`SP3`.

### `NOTIFIKASI` (8 kolom) — `[id, userId, judul, isi, tipe, 'BELUM', timestamp, menu]` (`gas/Code.gs:4743`). `tipe` ∈ `INFO`/`PERINGATAN`/`SP1`/`SP2`/`SP3`. Status baca: `BELUM`→`SUDAH`.

### `REWARD` — **PERINGATAN SALAH-PETA**: sheet literal `REWARD` hanya dibaca (read-only, `gas/Code.gs:510`), tidak pernah ditulis — isinya kemungkinan diedit manual, dipakai HANYA untuk slider "Reward" di Beranda. Fitur "Penghargaan & Denda" yang asli (`s-sanksi-manual`) justru menulis ke **`ABSENSI_DETAIL`** dengan tipe `DENDA_MANUAL`/`REWARD_MANUAL` (`gas/Code.gs:3973`). Saat desain schema Supabase: `manual_adjustments` harus bersumber dari pola `ABSENSI_DETAIL` ini, BUKAN dari sheet `REWARD`.

---

## 5. Payroll & Gaji

### `GAJI_HISTORY` / alias `SALARY_SETTING` (sheet, 9 kolom) — header `gas/Code.gs:187`: `['id','userId','nama','bulan','gajiBulanan','catatan','dibuatOleh','dibuatPada','bonusKerajinan']`. Append-only (riwayat utuh, tidak pernah update baris lama).

### ⚠️ `SALARY_SETTING` via `PropertiesService` — SUMBER KEDUA (bukan sheet!)

Key: `SALARY_SETTING|<userId>|<bulan>` (`gas/Code.gs:231-247`). Setiap `updateUserSalary()` menulis **KEDUA sumber sekaligus** (`gas/Code.gs:352-353`). Resolusi (`getEffectiveSalarySetting_`, `gas/Code.gs:264-299`): **kalau sheet dan Properties sama-sama punya setting untuk bulan yang sama, Properties MENANG** (operator `>=`, bukan `>`). Sheet menang HANYA kalau bulannya strict lebih baru.

**Implikasi migrasi (kritis)**: skrip migrasi wajib membaca KEDUA sumber untuk tiap (userId, bulan), dan memberi prioritas ke Properties saat ada tabrakan bulan — jangan asumsikan sheet adalah sumber lengkap.

### `PAYROLL_RUN` (11 kolom) — header `gas/Code.gs:2303`. Status `DRAFT`→`CONFIRMED`→`PUBLISHED`. Hanya 1 run per bulan (`findPayrollRunByBulan`).

### `PAYROLL_DETAIL` (22 kolom) — header `gas/Code.gs:2304`. `statusSlip` hanya pernah `DRAFT`/`PUBLISHED` (tidak pernah `CONFIRMED` di level ini). `bonusKerajinan` adalah SNAPSHOT saat draft dibuat (lihat mekanisme anti-dobel di bawah).

### `PAYROLL_ITEM` (6 kolom) — header `gas/Code.gs:2305`. Enum `tipe` yang **terbukti ditulis**: `BONUS_KERAJINAN, DENDA_SP, DENDA_MANUAL, REWARD_MANUAL, LEMBUR_PULANG, LEMBUR_MINGGU, LEMBUR_LIBUR, ABSEN, ADJUSTMENT_PLUS, ADJUSTMENT_MINUS`. Frontend (`js/payroll.js:636-648`) juga mengenal label `DENDA_ANOMALI`/`POTONGAN_ABSEN` tapi **backend tidak pernah menulis keduanya** — kemungkinan sisa skema lama, jangan dianggap enum aktif.

### `AUDIT_LOG` (8 kolom) — header `gas/Code.gs:2986`. **TEMUAN KRITIS**: `appendAuditLog_()` **tidak pernah dipanggil dari fungsi payroll/gaji manapun** (hanya dipakai di 4 fungsi absensi). `updateUserSalary`, `createPayrollDraft`, `confirmPayroll`, `publishPayroll`, `updatePayrollAdjustment` — nol audit log. Clone **wajib** menambahkan ini (mandat CLAUDE.md, bukan perubahan perilaku bisnis).

### Mekanisme anti-dobel bonus kerajinan — `applyEffectivePayrollBonus_` (`gas/Code.gs:3727-3756`)

Dipanggil **setiap kali slip dibaca** (termasuk PUBLISHED) — transformasi di memori, sheet fisik tidak pernah ditulis ulang oleh fungsi ini:
```
originalBonus = snapshot di PAYROLL_DETAIL saat draft dibuat
effectiveBonus = setting kerajinan TERKINI (bisa sudah berubah)
bonusDelta = max(0, effectiveBonus − originalBonus)   // hanya hitung KENAIKAN
diserap = bonusDelta > 0 DAN adjustmentPlus_lama === bonusDelta   // harus PERSIS (===)
kalau diserap: adjustmentPlus dipaksa 0, baris item ADJUSTMENT_PLUS lama disembunyikan dari tampilan
totalGaji dihitung ulang pakai effectiveBonus + effectiveAdjustmentPlus (bukan nilai snapshot lama)
```
Contoh: kerajinan Rp150rb→Rp200rb (delta 50rb), adjustment lama persis Rp50rb → tampil "Bonus kerajinan Rp200rb" saja, baris adjustment hilang dari daftar. Kalau adjustment lama TIDAK pas sama (misal Rp60rb) → tidak diserap, kedua nilai dijumlah penuh (potensi dobel apa adanya — bukan diperbaiki, direplikasi sesuai keputusan Ko).

### Syarat bonus kerajinan — absen **FISIK**, bukan absen murni

Dua lokasi duplikat dengan rumus identik: `getRekapBulananSemua` (`gas/Code.gs:2282`: `r.absen===0 ? bonusKerajinan : 0`) dan `getAbsensiRekap`→`appendPayrollItemsFromAbsensi_` (`gas/Code.gs:2052`). Dikonfirmasi tegas: `approveIzin` punya komentar eksplisit *"Hari absen TIDAK dikurangi — izin hanya menghapus SP dan denda SP"* (`gas/Code.gs:4451`) — jadi absen yang "dimaafkan" izin **tetap menghilangkan bonus kerajinan**.

### Default Rp150.000 — 7 lokasi konsisten (`gas/Code.gs:284,290-292,307,2051,2277,326`), kecuali saat membaca slip lama (`applyEffectivePayrollBonus_`) fallback-nya adalah bonus yang SUDAH tersimpan di slip itu, bukan 150000 (`gas/Code.gs:3734`).

### DRAFT→CONFIRMED→PUBLISHED — **tidak ada validasi urutan maupun role server-side** (temuan kritis)

- `setPayrollStatus_` tidak pernah membaca status saat ini sebelum menimpanya — bisa publish langsung dari DRAFT, atau "confirm ulang" run yang sudah PUBLISHED (merusak tampilan status).
- `isPayrollAdmin_()` **tidak dipanggil** di `getPayrollPreview`, `createPayrollDraft`, `confirmPayroll`, `publishPayroll`, `getPayrollDetail`, `updatePayrollAdjustment` — hanya 4 fungsi setting gaji yang memvalidasi role. Proteksi akses 100% di client.
- `getPayrollDetail`/`getPayrollEmployeeSlipDetail` **tidak mengecek userId pemanggil** — "karyawan hanya baca slip sendiri" saat ini murni aturan UI, tidak ada pagar server.

Semua ini wajib ditutup di clone (RLS + RPC `SECURITY DEFINER` + cek status transisi) — sudah menjadi mandat CLAUDE.md, bukan keputusan baru.

### Owner/Finance dikecualikan TOTAL dari pipeline payroll

Dikonfirmasi di 2 level: `getSalaryUsers` (`gas/Code.gs:306`) DAN `getRekapBulananSemua` (`gas/Code.gs:2200`) sama-sama skip `bagian IN ('Owner','Finance')`. Akibatnya Owner/Finance **tidak pernah punya baris** di `PAYROLL_DETAIL` — bukan cuma tersembunyi di UI setting gaji, tapi benar-benar tidak masuk draft/confirm/publish/slip/notifikasi sama sekali. Gaji mereka diatur 100% di luar aplikasi ini. **Direplikasi apa adanya di clone** kecuali Ko bilang lain.

### PDF slip — 100% client-side

Tidak ada generate PDF di `gas/Code.gs` (grep `PDF|createPdf|getAsBlob`: nol hasil). PDF dibangun dari HTML (`js/payroll.js:119-142`) lalu `window.print()` (dialog "Save as PDF" browser) — bukan file PDF asli yang dibuat server.

---

## 6. Status 9 Endpoint Gap (semua terkonfirmasi TIDAK ADA di `gas/Code.gs` maupun seluruh arsip)

Detail lengkap (payload/response/UI/draft RPC) ada di laporan audit A, B, D. Ringkasan status final + keputusan Ko sudah tercatat di `DECISION-LOG.md`.

| Aksi | UI pemicu | Perilaku saat ini jika dipanggil | Keputusan |
|---|---|---|---|
| `getDaftarOptions` | `s-daftar` (dropdown bagian/jabatan) | Dropdown "Gagal memuat" | Bangun RPC publik, baca dari `JOBDESK`/tabel referensi |
| `daftarAkun` | `s-daftar` submit | Toast gagal generik | Edge Function, insert `registration_requests` status PENDING, hash password |
| `getRegistrasiPending` | `s-manage-users` | **Gagal total silent** — section pending tidak muncul, tanpa indikasi error | RPC Owner-only, baca `registration_requests` status PENDING |
| `approveRegistrasi` | tombol "✓ Setujui" | **Toast SUKSES PALSU** ("Berhasil disetujui") — tidak ada apapun terjadi | Edge Function: status→AKTIF, buat Supabase Auth user, **pakai sandi pilihan karyawan** (keputusan Ko) |
| `tolakRegistrasi` | tombol "✗ Tolak" | **Toast SUKSES PALSU** ("Pendaftaran ditolak") | RPC: status→DITOLAK, **simpan sebagai riwayat** (keputusan Ko, bukan hapus) |
| `addKaryawanBaru` | `s-tambah-karyawan` | Toast gagal generik, form tidak reset | Edge Function Owner-only, insert langsung AKTIF, password default "hosela" |
| `hapusLibur` | tombol "✕" di `s-kalender` | Toast **menyesatkan**: "Backend belum di-deploy versi baru" (padahal fungsinya memang tidak pernah ada) | RPC `delete_holiday`, Owner+Finance, cek payroll PUBLISHED sebelum hapus |
| `getIzinTelatReview` | `s-review-telat` | Tampil "Tidak ada review telat" (sama seperti kondisi kosong — tidak kelihatan error) | **Tidak ada perilaku lama untuk ditiru** — draft RPC baru, tabel `telat_review`, rumus potongan perlu keputusan Ko terpisah saat diimplementasikan |
| `reviewIzinTelat` | tombol "Simpan Keputusan" | Toast generik "Gagal menyimpan keputusan" | sama seperti di atas |

Catatan tambahan dari audit: menu "Kelola Tim" (pintu ke 5 dari 6 aksi registrasi) di-gate **Owner saja** di `js/app.js:1055-1057` — BEDA dari pola Owner+Finance di menu payroll/kalender. RLS/RPC clone untuk area ini harus Owner-only kecuali Ko minta diperluas ke Finance.

---

## 7. Temuan silang lain yang relevan untuk desain clone

- **Dua rumus status mingguan berbeda** untuk BAIK/KUNING/ORANGE/MERAH antar 2 layar (`gas/Code.gs:1317-1321` vs `gas/Code.gs:2141-2143`, yang kedua tanpa tingkat ORANGE) — warna bisa beda untuk kombinasi absen/telat yang sama persis di 2 layar berbeda. Perlu keputusan Ko saat implementasi RPC rekap mana yang jadi rumus tunggal di clone.
- **Deteksi anomali "tap>12:00" dan pembuatan SP baru keduanya dorman di jalur kamera aktif** (lihat DECISION-LOG — direplikasi dorman sesuai keputusan Ko).
- **`hitungBintang` tidak dipanggil dari jalur kamera** — bintang/skor hanya ter-refresh saat submit KPI mingguan, tanggal 10/bulan, atau trigger manual. Bisa "basi" di hari lain dalam bulan.
- **Badge notifikasi**: `counts['s-notifikasi']++` tanpa kondisi bisa menghitung dobel notif bertarget `s-notifikasi`. Frontend `updateAllMenuBadges` hanya mengenali 5 menu (`s-notifikasi`,`s-izin`,`s-papan-peringkat`,`s-peraturan`,`s-kelola-izin`) — badge untuk menu lain tidak pernah tampil meski backend menghitungnya.
- **Dead code** yang jangan ikut di-port: `validatePIN` (standalone, `gas/Code.gs:135`), `hapusAbsenDetail` (`gas/Code.gs:4463`, nol pemanggil).
- **Nama fungsi menyesatkan**: `kurangiAbsenDariIzin` dipanggil dari `konfirmasiAnomali` (bukan dari `approveIzin`) — jangan porting berdasar nama fungsi saja.
- **`gasCall` tidak pernah memeriksa field `.error`** di response sukses (`js/app.js:570-650`) — ini akar penyebab semua "toast sukses palsu"/"gagal generik" di atas. Clone harus memastikan client selalu cek `.success` secara eksplisit.
