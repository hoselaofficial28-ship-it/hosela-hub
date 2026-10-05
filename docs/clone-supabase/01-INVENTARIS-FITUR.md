# Inventaris Fitur dan Parity

## Role dan menu

| Fitur | Karyawan | Finance | Owner |
|---|:---:|:---:|:---:|
| Beranda, jobdesk, pengumuman, ide, peraturan | Ya | Ya | Ya |
| Absensi kamera + lokasi + foto Drive | Ya | Ya | Ya |
| Catatan kehadiran | Data sendiri | Semua karyawan | Semua karyawan |
| Izin/sakit | Ajukan dan lihat sendiri | Ajukan + kelola | Ajukan + pemantauan |
| Notifikasi dan badge per menu | Ya | Ya | Ya |
| Papan peringkat | Ya | Ya | Ya |
| Slip gaji + unduh PDF | Slip sendiri | Slip sendiri | Slip sendiri |
| Kalender libur | Tidak | Ya | Ya |
| Pengaturan gaji/kerajinan | Tidak | Ya | Ya |
| Penggajian draft → konfirmasi → publish | Tidak | Ya | Ya |
| KPI checklist | Sesuai tampilan saat ini | Ya | Sesuai tampilan saat ini |
| Penghargaan/denda manual | Tidak | Ya | Ya |
| Review telat | Tidak | Ya | Ya |
| Kelola tim dan laporan absensi | Tidak | Tidak | Ya |
| Buat pengumuman | Tidak | Tidak | Ya |

Role harus diperiksa di backend/RLS, bukan hanya menyembunyikan menu.

## Layar yang wajib tersedia

`s-login`, `s-daftar`, `s-home`, `s-jobdesk`, `s-staff`, `s-detail`, `s-pengumuman`, `s-tambah-pengumuman`, `s-ide`, `s-peraturan`, `s-kalender`, `s-manage-users`, `s-tambah-karyawan`, `s-absensi-upload`, `s-laporan-absensi`, `s-kpi-check`, `s-papan-peringkat`, `s-ganti-pin`, `s-paksa-ganti-pin`, `s-absensi-camera`, `s-izin`, `s-kelola-izin`, `s-notifikasi`, `s-sanksi-manual`, `s-review-telat`, `s-catatan-kehadiran`, `s-setting-gaji`, `s-payroll`, `s-slip-gaji`.

## Kelompok kontrak backend

- Identitas/tim: login, ganti sandi, daftar akun, approval registrasi, daftar user, tambah/nonaktifkan user, update email.
- Konten: jobdesk, staff per bagian, pengumuman, ide, peraturan, kalender libur.
- KPI/ranking: template KPI, laporan mingguan, profil skor, bintang, papan peringkat.
- Absensi: kamera, lokasi, foto Drive, fingerprint import, matriks harian, edit manual, rekap resmi, anomali.
- Izin: pengajuan, daftar milik user, pending, approval/reject, efek ke SP/denda, notifikasi.
- Disiplin: review telat, sanksi/reward manual, SP history.
- Payroll: preview, salary setting efektif per bulan, draft, confirm, publish, adjustment, slip, detail, PDF.
- Notifikasi: daftar, count per menu, tandai baca, hapus satu/semua, broadcast peraturan.

## Celah yang wajib diselesaikan saat clone

Frontend saat ini memanggil sembilan aksi yang tidak ditemukan pada dispatcher `handleAPI` di `gas/Code.gs`:

1. `addKaryawanBaru`
2. `approveRegistrasi`
3. `daftarAkun`
4. `getDaftarOptions`
5. `getIzinTelatReview`
6. `getRegistrasiPending`
7. `hapusLibur`
8. `reviewIzinTelat`
9. `tolakRegistrasi`

Claude Code wajib menelusuri UI dan arsip GAS untuk menentukan perilaku yang dimaksud. Jangan menghilangkan menu karena endpoint lama tidak lengkap. Catat keputusan dan hasil penelusuran pada `DECISION-LOG.md`.

## Hal yang sering rusak dan wajib diuji

- Navigasi PC membuka layar putih karena route/error tidak tertangani.
- Status terlambat tidak boleh bergantung hanya pada flag; bandingkan jam masuk dengan jadwal efektif.
- Badge notifikasi harus berada di lapisan paling depan dan terlihat.
- Slip yang sudah dipublish harus terlihat oleh karyawan dan bisa diunduh PDF.
- Uang kerajinan harus mengikuti setting efektif bulan yang dipilih dan bulan berikutnya sampai ada perubahan baru.
- Kenaikan uang kerajinan tidak boleh muncul lagi sebagai adjustment tambahan yang menggandakan nilai.
- Reload/cache tidak boleh mengembalikan nilai lama.
