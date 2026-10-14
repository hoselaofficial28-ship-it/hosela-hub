# 08 — Setup Penyimpanan Foto Absensi (Firebase Storage)

> **ARSIP / TIDAK DIPAKAI.** Pada 14 Oktober 2026 keputusan diubah ke Supabase
> Storage agar tidak perlu billing Firebase. Panduan aktif ada di
> `09-SETUP-SUPABASE-FOTO.md`.

Panduan untuk Ko. Ikuti urutannya; semua langkah di bawah dilakukan **sekali saja**,
setelah itu sistem menyimpan foto sendiri terus-menerus (tidak ada izin Google yang
kedaluwarsa, tidak ada login tambahan untuk karyawan).

## Kenapa Firebase, bukan Google Drive

Rencana awal memakai *service account* Google + Google Drive. Setelah diperiksa,
service account **tidak punya kuota penyimpanan** di Drive pribadi (Gmail), sehingga
unggahan ke folder Drive bisa ditolak error `403 storageQuotaExceeded`. Solusi resmi
Google (Shared Drive) hanya ada di Google Workspace, bukan Gmail pribadi.
Karena itu Ko memilih Firebase Storage (keputusan 2026-10-14, tercatat di
`DECISION-LOG.md`).

## Alur penyimpanan foto (setelah setup selesai)

```
HP karyawan
  1. Ambil foto + baca lokasi
  2. Kirim absensi  ─────────────► Supabase RPC submit_absensi_camera
                                     (validasi radius, simpan tap, status PENDING)
  3. Foto (JPEG ± 70 KB) ────────► Firebase Storage  absensi/<bulan>/<stempel>_<TIPE>_<userId>.jpg
  4. Metadata + tautan foto ─────► Supabase RPC attach_absensi_photo
                                     (cek pemilik baris, status tap, isi photo_url)
```

Database **tidak pernah menyimpan foto** (bukan base64) — hanya tautan, ukuran,
mime type, dan checksum SHA-256.

---

## Langkah A — Buat project Firebase

1. Buka https://console.firebase.google.com → **Create a project**.
2. Nama project: **`hosela-hub`** (bebas, yang penting mudah dikenali).
3. Google Analytics: boleh **dimatikan** (tidak dipakai aplikasi ini).
4. Setelah project jadi, buka **⚙ (ikon gerigi) → Usage and billing → Details & settings** →
   **Modify plan** → pilih **Blaze (Pay as you go)** dan tambahkan metode pembayaran.
   > **Wajib.** Sejak September 2024, project Firebase baru tidak bisa memakai Cloud
   > Storage di paket gratis (Spark). Pemakaian di bawah kuota gratis **tidak
   > ditagih** — lihat bagian "Biaya" di bawah.

## Langkah B — Aktifkan Storage

1. Menu kiri → **Build → Storage** → **Get started**.
2. Pilih lokasi: **`asia-southeast2` (Jakarta)** kalau tersedia; kalau tidak, pilih
   `asia-southeast1` (Singapore). **Lokasi tidak bisa diubah lagi** setelah dibuat.
3. Pilih **Production mode** (jangan test mode) — aturan aksesnya kita isi di langkah C.
4. Catat **nama bucket** yang muncul di bagian atas (bentuknya
   `hosela-hub.firebasestorage.app` atau `hosela-hub.appspot.com`) — nilai ini
   dipakai aplikasi.

## Langkah C — Tempel aturan akses (Storage Rules)

Menu **Storage → Rules**, hapus isinya, tempel ini, lalu **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /absensi/{bulan}/{file} {
      // hanya bisa dibaca/ditulis oleh pengguna yang sudah "masuk" (aplikasi
      // melakukan anonymous sign-in otomatis dari perangkat karyawan)
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.resource.size < 800 * 1024
                   && request.resource.contentType.matches('image/(jpeg|png)');
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Artinya: foto hanya boleh masuk ke folder `absensi/`, maksimal 800 KB, dan hanya
berkas gambar. Semua folder lain tertutup total.

## Langkah D — Aktifkan masuk anonim (tanpa akun)

1. Menu kiri → **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → **Anonymous** → **Enable** → **Save**.

Karyawan **tidak** akan melihat layar login Google/Firebase. Aplikasi memakai
identitas anonim otomatis hanya untuk izin menulis ke Storage.

## Langkah E — Daftarkan Web app + kirim konfigurasi ke saya

1. **⚙ Project settings → General** → scroll ke **Your apps** → klik ikon **`</>`** (Web).
2. Nickname: `hosela-hub-web` (Analytics tidak perlu) → **Register app**.
3. Akan muncul blok `const firebaseConfig = { apiKey: "...", ... }`.
4. **Kirim 5 nilai ini ke saya** (semuanya nilai publik, bukan rahasia):
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket` ← pastikan sama dengan nama bucket di Langkah B
   - `appId`

Setelah saya terima, saya isi ke `app/js/photo-storage.js` lalu naikkan versi cache
dan deploy. Sebelum itu, aplikasi tetap jalan normal (foto belum dikirim, statusnya
ditulis apa adanya di layar absensi).

## Langkah F — Jalankan SQL di Supabase

Buka **Supabase → SQL Editor → New query**, tempel **seluruh isi** file ini, lalu **Run**:

```
supabase-clone/supabase/migrations/20261014000027_attendance_photo_storage.sql
```

File ini menambah kolom foto (`photo_path`, `photo_url`, `captured_at`, `uploaded_at`)
dan 3 fungsi: `attach_absensi_photo`, `mark_absensi_photo_failed`,
`get_absensi_photo_stats`.

## Langkah G — Hapus foto otomatis setelah 30 hari

Pakai **Object Lifecycle Management** pada bucket, bukan timer di HP karyawan.
Aturan siap pakai tersimpan di:

```
docs/clone-supabase/firebase-storage-lifecycle-30-days.json
```

Aturan itu hanya menyentuh objek dengan awalan `absensi/`, lalu menghapusnya saat
umur objek mencapai 30 hari. Folder lain di bucket tidak ikut terhapus.

Cara menerapkan dari Google Cloud Console:

1. Buka **Cloud Storage → Buckets** lalu pilih bucket Firebase yang digunakan.
2. Buka tab **Lifecycle** → **Add a rule**.
3. Action: **Delete object**.
4. Condition: **Age = 30 days** dan **Name matches prefix = `absensi/`**.
5. Simpan, lalu pastikan ringkasan aturan hanya menyebut prefix `absensi/`.

Perubahan aturan dapat memerlukan waktu sampai 24 jam. Penghapusan juga berjalan
asinkron, jadi foto mungkin tidak hilang tepat pada detik umur 30 hari. Jika soft
delete bucket aktif (umumnya 7 hari), foto yang dihapus tidak lagi tampil normal,
tetapi masih dapat dipulihkan selama masa soft delete.

---

## Cara memastikan sudah jalan

1. Di HP: buka aplikasi → menu **Absensi Kamera** → absensi seperti biasa.
2. Setelah "Absensi diterima", muncul baris status **"Menyimpan foto ke penyimpanan..."**
   lalu **"Foto absensi tersimpan."**
3. Buka **Firebase Console → Storage → Files** → folder `absensi/<tahun-bulan>/`
   harus muncul berkas `.jpg` baru.
4. Di aplikasi, kartu **Status Hari Ini** menampilkan tautan **"Lihat Foto Absensi"**.
5. Rekap cepat (jalankan di Supabase SQL Editor):
   ```sql
   select public.get_absensi_photo_stats(to_char(now() at time zone 'Asia/Jakarta','YYYY-MM'));
   ```
   Hasilnya: `total_tap_kamera`, `foto_tersimpan`, `foto_tertunda`, `foto_gagal`.

## Kalau muncul pesan gagal (artinya apa)

| Pesan di aplikasi | Artinya | Tindakan |
|---|---|---|
| `Masuk anonim (Anonymous) belum diaktifkan...` | Langkah D belum selesai | Aktifkan Anonymous di Authentication |
| `Akses penyimpanan ditolak — Storage Rules belum mengizinkan unggah.` | Rules belum di-publish / salah folder | Ulangi Langkah C, pastikan folder `absensi/` |
| `Alamat penyimpanan tidak ditemukan (nama bucket kemungkinan salah).` | `storageBucket` salah | Cek `storageBucket` di Langkah E |
| `API key Firebase tidak valid` | `apiKey` salah/tercampur | Kirim ulang config ke saya |
| `Foto terlalu besar: ... KB, maksimal 800 KB` | Ukuran foto melebihi batas | Kabari saya, ukuran tangkapan perlu diturunkan |
| `Foto GAGAL disimpan: ...` + tombol **Kirim Ulang Foto** | Unggahan gagal, foto masih ada di HP | Tekan **Kirim Ulang Foto** selama halaman belum di-refresh |

Semua pesan gagal ditampilkan **apa adanya** (termasuk kode aslinya) dan ikut
tercatat di kolom `upload_error` supaya bisa ditelusuri.

## Biaya dan kuota

- Sejak 3 Februari 2026, Cloud Storage for Firebase **wajib memakai paket Blaze**.
- Bucket baru `*.firebasestorage.app` mengikuti harga Google Cloud Storage. Kuota
  Always Free hanya tersedia di `us-central1`, `us-east1`, dan `us-west1`; bucket
  Jakarta/Singapura tetap sangat murah, tetapi jangan dianggap otomatis gratis.
- Ukuran nyata: 1 foto ± 70 KB. 15 karyawan × 2 tap/hari ≈ 2,1 MB/hari ≈ **63 MB**
  untuk retensi 30 hari.
- Batas terburuk aplikasi adalah 800 KB/foto: 15 karyawan × 2 tap × 30 hari ≈
  **720 MB**. Jadi kapasitas penyimpanan tetap sangat cukup.
- Harga Standard Storage Jakarta saat panduan diperbarui sekitar **US$0,022/GiB/bulan**,
  belum termasuk operasi dan transfer data. Pada 63 MB, biaya penyimpanannya hanya
  sekitar US$0,0014/bulan; operasi unggahnya juga hanya pecahan sen untuk skala ini.
- Saran: di **Google Cloud Console → Billing → Budgets & alerts**, pasang peringatan
  anggaran **$1** supaya Ko dapat email kalau ada pemakaian tidak wajar.

## Batas keamanan (jujur, perlu Ko tahu)

Cara ini memakai **anonymous sign-in**: siapa pun yang membaca kode halaman bisa
mendapat izin menulis ke folder `absensi/`. Yang membatasi hanya aturan di Langkah C
(harus gambar, maksimal 800 KB, hanya folder `absensi/`), bukan verifikasi karyawan.

Ini sengaja dipilih supaya setup sederhana dan tidak ada kredensial rahasia di server.
Kalau nanti perlu lebih ketat (hanya karyawan terdaftar yang boleh menulis), jalur
upgrade-nya: unggahan dipindahkan ke **Supabase Edge Function + service account**
(config tetap sama, tinggal pindah jalur unggah). Sampaikan kalau Ko mau dinaikkan
ke versi ketat itu.
