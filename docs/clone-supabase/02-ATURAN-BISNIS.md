# Aturan Bisnis yang Harus Dipertahankan

Dokumen ini adalah ringkasan. Untuk detail urutan dan edge case, baca fungsi terkait di `gas/Code.gs` dan buat golden test sebelum porting.

## Waktu dan periode

- Zona waktu bisnis: `Asia/Jakarta`.
- Kunci bulan: `YYYY-MM`.
- Hari kerja efektif = jumlah hari kalender − hari Minggu − hari libur aktif.
- Jadwal normal: masuk `08:00`, pulang `18:00`, kecuali rentang `JADWAL_KHUSUS`.

## Absensi

- Jam masuk melewati jadwal berarti telat.
- Denda telat = `ceil(menitTelat / 10) × Rp10.000`.
- Tap masuk setelah pukul 12:00 diperlakukan sebagai anomali sesuai kondisi tap.
- Tidak ada tap masuk pada hari kerja berarti absen.
- Hari Minggu/libur dengan tap masuk dihitung lembur, bukan hadir biasa.
- Lembur pulang mulai dihitung setelah minimal 60 menit dari jam pulang wajib.
- Durasi lembur dibulatkan turun per 30 menit.
- Reward lembur pulang = `jumlah blok 30 menit × Rp10.000`.
- Reward kerja Minggu/libur = satu gaji harian.
- Data kamera/manual yang diterima mengungguli data lama pada tampilan matriks.
- Edit manual dan pemrosesan ulang harus memiliki audit log dan tidak boleh menghasilkan duplikasi detail.
- Foto, lokasi, akurasi, jarak, status diterima/ditolak, dan alasan wajib dipertahankan.

## Status mingguan dan SP

- Status rekap dari jumlah `absen + telat`: 0 `BAIK`, 1–2 `KUNING`, 3–4 `ORANGE`, ≥5 `MERAH`.
- SP1 mingguan: telat ≥3 atau absen ≥2 dalam minggu tersebut.
- SP2 bulanan dapat dipicu telat ≥5 atau absen **efektif** 3–4; denda Rp50.000 sesuai logika aktif.
- SP3 dipicu bila absen **efektif** bulanan ≥5, atau karyawan mendapat SP2 bulan sebelumnya lalu kembali memenuhi pemicu telat bulanan. Denda SP3 Rp100.000 pada alur aktif.
- **Satu jenjang, bukan menumpuk** (keputusan Ko 14 Okt 2026, migrasi 0037): absen efektif ≥5 hanya menagih SP3 Rp100.000 — denda SP2 jalur absen dibatalkan. Denda warisan aplikasi lama (`_tambah_denda_absen`, Rp50.000 dobel di kolom denda mingguan) **dihapus**; fungsi lamanya dibiarkan ada di database tapi tidak dipanggil lagi.
- **Denda SP dan denda SB tidak menumpuk**: dalam satu bulan total denda = yang **terbesar** antara denda SP dan denda SB (`_terapkan_max_denda_sp_sb`), bukan jumlah keduanya. Contoh: absen 5 hari bulan ke-1 → SP3 Rp100.000 saja (SB1 Rp50.000 tidak ditambahkan); telat 5× bulan ke-2 → SB2 Rp100.000 menggantikan SP2 Rp50.000.
- Izin disetujui tidak menghapus fakta absensi fisik. Izin mengurangi absen efektif untuk penilaian/SP dan dapat membatalkan atau menurunkan SP serta denda terkait.
- Perubahan keputusan izin wajib menghitung ulang efek SP, denda, bintang, notifikasi, dan cache/read model.

## KPI, skor, dan bintang

- KPI mingguan mengganti laporan user untuk minggu yang sama, bukan menambah duplikat.
- `skorKPI = round(itemSelesai / totalItem × 100)`; bila tidak ada item, 0.
- `absenMurni = max(0, absenFisik − sakitDisetujui − izinDisetujui)`.
- Bonus lembur skor = `min(10, totalLembur × 3)`.
- Skor attendance = `100 − absenMurni×12 − izin×4 − sakit×2 − telat×3 + bonusLembur`, dibatasi 0–100.
- Skor akhir = rata-rata skor KPI dan attendance, dibulatkan dan dibatasi 0–100.
- Bintang dasar: ≥85 = 5, ≥75 = 4, ≥65 = 3, ≥50 = 2, selain itu = 1.
- Gate absen: absen murni ≥3 maksimal 2 bintang; absen murni ≥2 maksimal 3 bintang.
- Skor ranking = `max(0, skorAkhir − absenMurni×5)`.

## Gaji dan uang kerajinan

- Gaji dan uang kerajinan adalah setting efektif per user mulai bulan berlaku hingga ada setting baru.
- Default historis uang kerajinan adalah Rp150.000 bila belum ada setting lain.
- Setting dapat diubah massal untuk beberapa karyawan lalu disimpan sekali.
- Hak penerima uang kerajinan mengikuti logika lama: pada preview, bonus diberikan bila absen memenuhi syarat lama (`absen === 0`). Jangan mengubah syarat ini.
- Draft payroll yang belum publish boleh diperbarui oleh setting bulan yang sama.
- **Hari tidak masuk tidak dapat upah** (keputusan Ko 14 Okt 2026): `gajiPokok = gajiBulanan − (gajiHarian × jumlah hari tidak masuk)`, dengan `gajiHarian = gajiBulanan ÷ hariKerjaEfektif`. Hari sakit/izin yang **disetujui** juga tidak dibayar (memang tidak bekerja), tetapi tetap **tidak** menghilangkan uang kerajinan.
- **Denda absen & SP absen hanya untuk absen TANPA izin** (keputusan Ko 14 Okt 2026): perhitungan SP memakai `absenEfektif = absenFisik − izin/sakit DISETUJUI` untuk SP1 mingguan (≥2/minggu), SP2 (3–4/bulan), SP3 (≥5/bulan), dan denda absen SP2. Hari sakit/izin yang disetujui tetap dihitung sebagai hari tidak masuk untuk pemotongan upah, tapi tidak memicu denda.
- Ringkasnya (keputusan Ko 14 Okt 2026): absen 1–2 hari tanpa izin → hanya upah hari itu hilang + kerajinan hilang; absen 3–4 hari → + SP2 Rp50.000; absen ≥5 hari → + SP3 Rp100.000 (itu saja); absen dengan izin disetujui → hanya upah hari itu yang hilang, kerajinan tetap, denda nol.
- Payroll `PUBLISHED` harus tetap menjadi snapshot yang dapat diaudit. Bila UI menampilkan setting efektif terbaru untuk slip historis, perilaku penyesuaian saat ini harus direplikasi dan diuji agar tidak menggandakan nominal.
- Jika delta bonus lama ke baru sama dengan adjustment plus lama, adjustment tersebut diserap agar tidak muncul atau dihitung dua kali.
- Total gaji = `gajiPokok + totalReward + bonusKerajinan + adjustmentPlus − totalDenda − adjustmentMinus`, minimum 0.
- Alur payroll: `DRAFT → CONFIRMED → PUBLISHED`.
- Karyawan hanya boleh membaca slip miliknya; Finance/Owner mengikuti hak akses aplikasi aktif.

## Notifikasi

- Notifikasi memiliki user tujuan, judul, isi, tipe, status baca, waktu, dan menu tujuan.
- Badge dihitung per menu dan juga dijumlahkan ke menu Notifikasi.
- Membuka menu terkait menandai notifikasi menu tersebut sebagai dibaca.
- Approval izin, SP, anomali, peraturan, dan proses penting menghasilkan notifikasi sesuai perilaku lama.

## Prinsip transaksi

Operasi yang mengubah beberapa data sekaligus—proses absensi, approval izin, hitung SP, create/confirm/publish payroll—harus dijalankan dalam transaksi database atau fungsi server atomik. Kegagalan sebagian tidak boleh meninggalkan data setengah jadi.
