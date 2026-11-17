-- ============================================================================
-- Peraturan Global Hosela Official - Versi 1.0  (17 Nov 2026)
--
-- Isi:
--   1) Pasal 1-42  : teks LAMA ditulis ulang dengan bahasa baku. Nomor, urutan,
--                    dan maksud setiap pasal DIPERTAHANKAN (tidak ada yang hilang).
--   2) Pasal 43-55 : USULAN pasal global baru (kerahasiaan data, keamanan akun,
--                    aset, konflik kepentingan, insiden, sanksi berjenjang).
--
-- Sifat: DRAFT. Belum dijalankan. Jalankan di Supabase SQL Editor HANYA setelah
--        Owner menyetujui isinya (lihat docs/peraturan/PERATURAN-GLOBAL-HOSELA-v1.md).
--
-- Catatan: baris "DOKUMEN PERATURAN" (link Google Drive) TIDAK disentuh karena
--          tidak memiliki no_urut.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Pasal 1-42: teks baku, nomor tetap
-- ---------------------------------------------------------------------------
update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Hari Kerja: Hari kerja Perusahaan ditetapkan dari hari Senin sampai dengan hari Sabtu.$t$, updated_at = now()
 where no_urut = 1;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Jam Kerja: Jam kerja berlaku pukul 08.00–18.00 WIB dengan waktu istirahat pukul 13.00–14.00 WIB.$t$, updated_at = now()
 where no_urut = 2;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Waktu Istirahat Hari Jumat: Khusus hari Jumat, waktu istirahat ditetapkan pukul 12.00–13.00 WIB.$t$, updated_at = now()
 where no_urut = 3;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Keterlambatan: Karyawan yang datang terlambat dikenakan denda sebesar Rp10.000 untuk keterlambatan 1–10 menit, Rp20.000 untuk keterlambatan 11–20 menit, dan demikian seterusnya untuk setiap penambahan 10 menit keterlambatan.$t$, updated_at = now()
 where no_urut = 4;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Izin Pulang Cepat: Karyawan yang meninggalkan pekerjaan lebih awal dari jam kerja yang ditetapkan dikenakan pemotongan upah sesuai ketentuan yang berlaku.$t$, updated_at = now()
 where no_urut = 5;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Ketidakhadiran Tanpa Pemberitahuan: Karyawan yang tidak masuk kerja tanpa pemberitahuan dikenakan sanksi berupa potongan gaji sebesar dua kali gaji harian.$t$, updated_at = now()
 where no_urut = 6;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Konsekuensi Ketidakhadiran: Karyawan yang tidak masuk kerja dengan alasan apa pun tidak berhak atas upah untuk hari yang bersangkutan.$t$, updated_at = now()
 where no_urut = 7;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Kerja pada Hari Libur: Karyawan yang ditugaskan masuk kerja pada hari Minggu dihitung telah melaksanakan hari kerja tambahan (hari kerja ke-7) dan berhak atas upah harian untuk hari tersebut.$t$, updated_at = now()
 where no_urut = 8;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Kewajiban Absensi: Setiap Karyawan wajib melakukan absensi kehadiran secara mandiri melalui Aplikasi pada saat masuk dan pulang kerja. Karyawan yang lupa melakukan absensi dan tidak menyampaikan konfirmasi kepada Pimpinan Area dikenakan sanksi.$t$, updated_at = now()
 where no_urut = 9;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Pelaporan Izin Tidak Masuk: Izin tidak masuk kerja wajib dilaporkan kepada Pimpinan Area dan Owner sebelum jam kerja dimulai.$t$, updated_at = now()
 where no_urut = 10;

update public.rules
   set kategori = $k$Waktu Kerja & Kehadiran$k$, isi = $t$Keterlambatan Berulang: Karyawan yang terlambat lebih dari 5 (lima) kali berturut-turut dalam 1 (satu) bulan tidak berhak atas uang kerajinan sebagai konsekuensi kedisiplinan.$t$, updated_at = now()
 where no_urut = 11;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Tugas Bersama: Sebelum memulai pekerjaan, seluruh Karyawan wajib menyapu dan mengepel area kerja bersama, serta bertanggung jawab menjaga kebersihan area umum yang meliputi ruang rapat, pantry, dan toilet.$t$, updated_at = now()
 where no_urut = 12;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Kerapian Pribadi: Setiap Karyawan wajib menjaga kebersihan meja kerja, memastikan meja bebas dari barang yang tidak berkepentingan, menyimpan barang pribadi pada tempat yang disediakan, dan merapikannya kembali setelah digunakan.$t$, updated_at = now()
 where no_urut = 13;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Tata Letak Perangkat: Kabel dan perangkat elektronik wajib ditata rapi agar tidak mengganggu ruang gerak, serta sampah wajib dibuang pada tempatnya.$t$, updated_at = now()
 where no_urut = 14;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Pengelolaan Dokumen: Dokumen Perusahaan wajib disusun rapi pada ruang penyimpanan. Dokumen yang tidak lagi diperlukan wajib dimusnahkan atau disimpan secara aman sesuai prosedur. Dokumen dan barang yang bersifat sensitif wajib dijaga kerahasiaannya dan disimpan di tempat yang aman.$t$, updated_at = now()
 where no_urut = 15;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Kerapian Akhir Hari Kerja: Setelah selesai bekerja, meja kerja wajib dirapikan kembali.$t$, updated_at = now()
 where no_urut = 16;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Barang Pribadi: Karyawan dilarang meninggalkan barang pribadi secara sembarangan di area kerja.$t$, updated_at = now()
 where no_urut = 17;

update public.rules
   set kategori = $k$Kebersihan & Kerapian$k$, isi = $t$Area Bersama: Area bersama wajib tetap bersih setelah digunakan.$t$, updated_at = now()
 where no_urut = 18;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Prosedur Pengajuan: Pengunduran diri diajukan secara resmi dan tertulis kepada atasan langsung.$t$, updated_at = now()
 where no_urut = 19;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Masa Pemberitahuan: Pengunduran diri wajib disampaikan paling lambat 30 (tiga puluh) hari sebelum tanggal efektif berhenti bekerja. Apabila masa pemberitahuan kurang dari ketentuan tersebut, Perusahaan berhak menahan Karyawan sampai diperoleh pengganti.$t$, updated_at = now()
 where no_urut = 20;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Pengunduran Diri Mendadak: Karyawan yang mengundurkan diri secara mendadak atau melepaskan tanggung jawab tidak berhak menerima gaji pada bulan yang bersangkutan.$t$, updated_at = now()
 where no_urut = 21;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Pengunduran Diri Kurang dari 14 Hari: Pengunduran diri yang diajukan kurang dari 14 (empat belas) hari sebelum tanggal efektif dikenakan pemotongan gaji sebesar 10 (sepuluh) hari kerja.$t$, updated_at = now()
 where no_urut = 22;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Pengunduran Diri Tanpa Jangka Waktu: Pengunduran diri yang diajukan tanpa jangka waktu sebagaimana ditetapkan dikenakan sanksi pemotongan gaji.$t$, updated_at = now()
 where no_urut = 23;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Hak Karyawan: Karyawan yang mengundurkan diri sesuai ketentuan berhak menerima gaji terakhir sesuai ketentuan yang berlaku. Apabila Karyawan memiliki utang atau pinjaman kepada Perusahaan, nominal tersebut diperhitungkan dalam gaji terakhir.$t$, updated_at = now()
 where no_urut = 24;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Pelanggaran Prosedur: Karyawan yang tidak mengikuti prosedur pengunduran diri, termasuk tidak menyelesaikan masa pemberitahuan, tidak berhak memperoleh surat keterangan kerja (paklaring) dan dapat dimasukkan dalam daftar hitam Perusahaan. Pengunduran diri mendadak disertai hilangnya kontak memberikan hak kepada Perusahaan untuk melakukan pemutusan hubungan kerja secara sepihak tanpa memenuhi hak Karyawan.$t$, updated_at = now()
 where no_urut = 25;

update public.rules
   set kategori = $k$Pengunduran Diri$k$, isi = $t$Ketentuan Perjanjian Kerja Khusus: Karyawan yang terikat perjanjian kerja khusus wajib memenuhi seluruh ketentuan perjanjian tersebut sebelum mengajukan pengunduran diri. Apabila dalam 28 (dua puluh delapan) hari sebelum berakhirnya masa kontrak tidak terdapat pengajuan pengunduran diri atau pemberitahuan, kontrak diperpanjang secara otomatis untuk 1 (satu) bulan.$t$, updated_at = now()
 where no_urut = 26;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penggunaan Telepon Seluler: Karyawan dilarang menggunakan telepon seluler untuk keperluan pribadi selama jam kerja. Dalam keadaan mendesak, Karyawan wajib meminta izin kepada Pimpinan Area.$t$, updated_at = now()
 where no_urut = 27;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Sikap dan Tutur Kata: Karyawan wajib menjaga sikap dan tutur kata yang baik terhadap sesama rekan kerja maupun pelanggan.$t$, updated_at = now()
 where no_urut = 28;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penyambutan Tamu: Karyawan wajib menyapa tamu yang berkunjung ke kantor dengan sopan.$t$, updated_at = now()
 where no_urut = 29;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Komunikasi Antar Karyawan: Karyawan wajib berkomunikasi secara sopan dan dilarang membentak atau merendahkan rekan kerja.$t$, updated_at = now()
 where no_urut = 30;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penyampaian Kritik: Kritik wajib disampaikan dengan cara yang baik dan berorientasi pada solusi.$t$, updated_at = now()
 where no_urut = 31;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penghormatan terhadap Fokus Kerja: Karyawan wajib menghormati rekan kerja yang sedang berkonsentrasi bekerja.$t$, updated_at = now()
 where no_urut = 32;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penggunaan Peralatan Kantor: Peralatan kantor wajib digunakan dengan hati-hati dan sesuai kebutuhan.$t$, updated_at = now()
 where no_urut = 33;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Pelaporan Kerusakan: Barang kantor yang rusak atau hilang wajib segera dilaporkan.$t$, updated_at = now()
 where no_urut = 34;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Penyelesaian Perselisihan: Setiap perselisihan antar Karyawan wajib diselesaikan secara profesional. Apabila tidak tercapai kesepakatan, perselisihan wajib dilaporkan kepada atasan untuk dimediasi dan dilarang dibahas di area kerja.$t$, updated_at = now()
 where no_urut = 35;

update public.rules
   set kategori = $k$Sikap & Perilaku$k$, isi = $t$Kawasan Tanpa Rokok: Karyawan dilarang merokok di area lingkungan kerja kantor.$t$, updated_at = now()
 where no_urut = 36;

update public.rules
   set kategori = $k$Rapat & Koordinasi$k$, isi = $t$Kehadiran Rapat: Karyawan wajib menghadiri rapat tepat waktu.$t$, updated_at = now()
 where no_urut = 37;

update public.rules
   set kategori = $k$Rapat & Koordinasi$k$, isi = $t$Fokus dalam Rapat: Selama rapat berlangsung, Karyawan wajib fokus dan dilarang bermain telepon seluler.$t$, updated_at = now()
 where no_urut = 38;

update public.rules
   set kategori = $k$Rapat & Koordinasi$k$, isi = $t$Pelaksanaan Hasil Rapat: Hasil rapat wajib dilaksanakan sesuai arahan yang ditetapkan.$t$, updated_at = now()
 where no_urut = 39;

update public.rules
   set kategori = $k$Ketentuan Lain$k$, isi = $t$Penyampaian Ide dan Masukan: Ide dan masukan disampaikan melalui fitur Ide Tim pada Aplikasi.$t$, updated_at = now()
 where no_urut = 40;

update public.rules
   set kategori = $k$Ketentuan Lain$k$, isi = $t$Pelanggaran Berulang: Pelanggaran yang dilakukan secara berulang diproses sesuai kebijakan Perusahaan.$t$, updated_at = now()
 where no_urut = 41;

update public.rules
   set kategori = $k$Ketentuan Lain$k$, isi = $t$Ketentuan Tambahan Pengunduran Diri: Setiap Karyawan yang bermaksud mengundurkan diri atas kemauan sendiri wajib mengajukan permohonan pengunduran diri secara tertulis kepada Perusahaan selambat-lambatnya 30 (tiga puluh) hari kalender sebelum tanggal mulai pengunduran diri (one month notice) serta tetap melaksanakan kewajibannya sampai tanggal efektif pengunduran diri. Apabila Karyawan mengundurkan diri secara mendadak atau tidak memenuhi ketentuan tenggang waktu pemberitahuan sebagaimana dimaksud pada pasal ini, Karyawan dianggap melakukan pelanggaran terhadap tata tertib Perusahaan dan mengakhiri hubungan kerja secara sepihak. Sebagai konsekuensi atas pengunduran diri mendadak tersebut, Perusahaan berhak untuk tidak membayarkan upah atas sisa hari kerja yang telah dijalani pada bulan berjalan sebelum tanggal efektif pengunduran diri, dan hak atas sisa upah tersebut dinyatakan hangus atau diperhitungkan sebagai ganti rugi atas kelalaian pelaksanaan serah terima pekerjaan (handover).$t$, updated_at = now()
 where no_urut = 42;

-- ---------------------------------------------------------------------------
-- 2) Pasal 43-55: pasal global baru
-- ---------------------------------------------------------------------------
insert into public.rules (no_urut, kategori, isi) values
  (43, $k$Kerahasiaan & Keamanan Data$k$, $t$Data yang Bersifat Rahasia: Data pelanggan, data pesanan, harga pokok, data pemasok, laporan keuangan, dan dokumen internal merupakan informasi rahasia Perusahaan yang wajib dijaga oleh setiap Karyawan.$t$),
  (44, $k$Kerahasiaan & Keamanan Data$k$, $t$Larangan Penyebaran Data: Karyawan dilarang menyalin, memfoto, merekam, mengirim, atau menyebarkan data rahasia Perusahaan kepada pihak lain, termasuk untuk keperluan pribadi, tanpa persetujuan tertulis dari Owner.$t$),
  (45, $k$Kerahasiaan & Keamanan Data$k$, $t$Keamanan Akun dan Kredensial: Kata sandi, kode OTP, dan akses akun resmi Perusahaan bersifat pribadi dan dilarang dipinjamkan, dibagikan, atau disimpan pada tempat yang dapat diakses orang lain.$t$),
  (46, $k$Kerahasiaan & Keamanan Data$k$, $t$Kewajiban Pelaporan Kebocoran Data: Karyawan yang mengetahui atau menduga telah terjadi kebocoran data wajib melaporkannya kepada atasan pada hari yang sama.$t$),
  (47, $k$Penggunaan Aset$k$, $t$Penggunaan Aset Perusahaan: Seluruh aset Perusahaan, termasuk peralatan kerja, kendaraan, perangkat elektronik, dan persediaan barang, hanya boleh digunakan untuk kepentingan pekerjaan.$t$),
  (48, $k$Penggunaan Aset$k$, $t$Larangan Membawa Barang Perusahaan: Karyawan dilarang membawa barang Perusahaan keluar dari area kerja tanpa surat izin atau persetujuan atasan. Perusahaan berhak melakukan pemeriksaan barang bawaan sesuai ketentuan yang berlaku.$t$),
  (49, $k$Penggunaan Aset$k$, $t$Tanggung Jawab atas Aset: Karyawan wajib menjaga aset yang dipercayakan kepadanya serta melaporkan setiap kerusakan atau kehilangan kepada atasan.$t$),
  (50, $k$Konflik Kepentingan$k$, $t$Konflik Kepentingan: Karyawan dilarang memiliki, mengelola, atau membantu usaha yang menjual produk sejenis dengan produk Perusahaan tanpa persetujuan tertulis dari Owner.$t$),
  (51, $k$Konflik Kepentingan$k$, $t$Larangan Gratifikasi: Karyawan dilarang menerima uang, hadiah, komisi, atau fasilitas pribadi dari pemasok, mitra, atau pihak ketiga yang berkaitan dengan pekerjaannya.$t$),
  (52, $k$Pelaporan Insiden$k$, $t$Pelaporan Insiden: Karyawan wajib melaporkan setiap kejadian yang berpotensi merugikan Perusahaan, termasuk kehilangan barang, kesalahan pengiriman, kerusakan aset, gangguan akun, dan keluhan pelanggan berskala besar, kepada atasan paling lambat 1x24 jam. Perbuatan menyembunyikan atau menutupi insiden dikategorikan sebagai pelanggaran berat.$t$),
  (53, $k$Sanksi & Tata Tertib$k$, $t$Tingkat Pelanggaran: Pelanggaran dikelompokkan menjadi pelanggaran ringan (antara lain keterlambatan, kerapian kerja, dan penggunaan telepon seluler untuk keperluan pribadi), pelanggaran sedang (antara lain tidak melaporkan izin, kelalaian kerja yang berulang, dan tidak melaksanakan arahan), serta pelanggaran berat (antara lain penyebaran data rahasia, peminjaman akun, membawa barang Perusahaan tanpa izin, menyembunyikan insiden, dan manipulasi data).$t$),
  (54, $k$Sanksi & Tata Tertib$k$, $t$Jenjang Sanksi: Pelanggaran ringan dikenakan teguran lisan disertai pencatatan; pelanggaran sedang dikenakan Surat Peringatan (SP1) sampai dengan SP2 disertai pemotongan sesuai ketentuan; pelanggaran berat dikenakan SP3 atau pemutusan hubungan kerja sesuai ketentuan peraturan perundang-undangan.$t$),
  (55, $k$Sanksi & Tata Tertib$k$, $t$Pencatatan Pelanggaran: Setiap pelanggaran dicatat oleh Perusahaan beserta bukti pendukung dan menjadi bagian dari penilaian kedisiplinan Karyawan.$t$)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3) Verifikasi: harus tampil 55 pasal dan 11 kategori
-- ---------------------------------------------------------------------------
select count(*) as jumlah_pasal, count(distinct kategori) as jumlah_kategori
  from public.rules where no_urut is not null;

-- Opsional: setelah peraturan versi baru berlaku, karyawan perlu konfirmasi ulang.
-- Hapus tanda komentar pada baris berikut bila Owner setuju konfirmasi di-reset.
-- delete from public.rule_acknowledgements;

commit;
