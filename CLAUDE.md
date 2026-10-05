# Instruksi Claude Code — Clone Hosela Hub ke Supabase

## Tujuan utama

Buat clone Hosela Hub yang mempertahankan seluruh tampilan, alur, hak akses, perhitungan, dan hasil bisnis aplikasi aktif. Ganti Google Apps Script/Spreadsheet dengan Supabase. Foto hasil kamera dan bukti foto tetap disimpan di Google Drive; Supabase hanya menyimpan metadata dan tautannya.

Akun Supabase tujuan dicatat di `supabase-clone/HANDOFF.local.md` pada komputer Ko. Baca file itu bila tersedia. Jangan menyalin alamat akun, password, access token, service-role key, refresh token Google, atau kredensial lain ke commit/repository publik.

## Aturan yang tidak boleh dilanggar

1. Baca seluruh dokumen dalam `docs/clone-supabase/` sesuai urutan nomor sebelum menulis kode.
2. Anggap `index.html`, `css/`, `js/app.js`, `js/payroll.js`, dan `gas/Code.gs` sebagai sumber perilaku aplikasi aktif.
3. Jangan menghapus, memindahkan, mengganti, atau menimpa aplikasi aktif dan folder arsip GAS.
4. Bangun clone secara berdampingan di folder `supabase-clone/` sampai seluruh acceptance test lulus.
5. Project aktif adalah web statis mobile-first. Jangan menambah React, Vite, webpack, atau framework/build tool tanpa persetujuan Ko Sanjaya.
6. Jangan mengubah rumus, ambang batas, status, role, urutan proses payroll, atau syarat penerima uang kerajinan karena dianggap lebih baik. Salin perilakunya terlebih dahulu.
7. Setiap layar, tombol, badge, notifikasi, deep link/hash, hak akses, loading, error, dan versi mobile/PC harus diuji.
8. Jangan menyentuh data produksi Spreadsheet atau Supabase tanpa izin Ko Sanjaya. Gunakan fixture/anonymized data untuk pengembangan.
9. Jangan menganggap migrasi selesai hanya karena UI sudah tampil. Selesai berarti hasil perhitungan lama dan baru sama untuk seluruh skenario uji.
10. Jika kode lama saling bertentangan, catat konflik di `docs/clone-supabase/DECISION-LOG.md` dan minta keputusan Ko sebelum mengubah perilaku bisnis.

## Urutan kerja wajib

1. Buat inventaris layar, aksi frontend, fungsi GAS, tabel/sheet, role, dan efek sampingnya.
2. Cocokkan 68 panggilan frontend dengan endpoint Supabase/Edge Function. Periksa juga 9 aksi frontend yang saat ini tidak terdaftar pada dispatcher GAS.
3. Buat schema, migration, RLS, Edge Functions, dan seed fixture.
4. Port logika bisnis menjadi fungsi murni yang bisa diuji.
5. Buat contract/golden tests yang membandingkan output GAS lama dengan implementasi Supabase untuk fixture yang sama.
6. Sambungkan frontend clone setelah lapisan data dan tes inti selesai.
7. Jalankan matriks acceptance test untuk role Owner, Finance, dan Karyawan pada mobile dan PC.
8. Siapkan migrasi data, dry-run, rekonsiliasi jumlah record dan total nominal, lalu cutover hanya setelah disetujui Ko.

## Arsitektur wajib

- Supabase Auth untuk identitas; password tidak boleh disimpan plaintext.
- PostgreSQL Supabase sebagai sumber data utama.
- RLS wajib aktif pada tabel data pengguna, absensi, izin, notifikasi, KPI, payroll, dan audit.
- Operasi sensitif seperti publish payroll, perubahan gaji, persetujuan izin, pemrosesan absensi, upload Drive, dan notifikasi massal dilakukan melalui Edge Function/RPC tervalidasi.
- Browser tidak boleh memegang Supabase service-role key atau kredensial Google Drive.
- Foto: browser → Edge Function tervalidasi → Google Drive → simpan `drive_file_id`, URL, mime type, ukuran, checksum, pemilik, dan waktu ke Supabase.
- Semua nominal uang disimpan sebagai integer rupiah; tanggal bisnis memakai zona `Asia/Jakarta`.
- Payroll yang sudah `PUBLISHED` adalah snapshot dan tidak boleh berubah diam-diam. Koreksi harus tercatat pada audit log.

## Definition of done

Clone belum selesai sebelum checklist pada `05-ACCEPTANCE-TEST.md` seluruhnya lulus dan laporan parity menunjukkan tidak ada fungsi penting yang hilang.
