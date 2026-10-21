# Aktivasi Telegram untuk Absensi Kamera

Status kode: aplikasi memanggil Edge Function `notify-attendance-telegram`
setelah absensi kamera berstatus `DITERIMA`.

## Komponen

- SQL: `supabase-clone/supabase/migrations/20261021000047_attendance_telegram_notifications.sql`
- Edge Function: `supabase-clone/supabase/functions/notify-attendance-telegram/index.ts`
- Pemanggil browser: `supabase-clone/app/js/real-backend.js`

## Secret yang wajib dipasang

Pasang melalui Supabase Dashboard → Edge Functions → Secrets. Jangan menaruh
nilainya di source code, Git, Vercel environment, atau percakapan.

- `TELEGRAM_BOT_TOKEN` — token baru dari BotFather.
- `TELEGRAM_CHAT_ID` — ID akun/grup Telegram tujuan.

Token lama yang pernah ditulis langsung di aplikasi lama harus di-`/revoke`
melalui BotFather sebelum fitur ini diaktifkan.

## Perilaku keamanan

- Hanya event milik pengguna yang sedang login yang dapat dikirim.
- Hanya sumber `CAMERA`, tipe `MASUK`/`PULANG`, dan status `DITERIMA`.
- `event_id` menjadi primary key sehingga satu absensi tidak dikirim berulang.
- Kegagalan Telegram tidak membatalkan absensi karyawan.
- Token hanya dibaca di server melalui Supabase Secret.

## Uji akhir

1. Deploy Edge Function `notify-attendance-telegram`.
2. Pastikan dua secret di atas tersedia.
3. Karyawan melakukan satu absensi datang yang valid.
4. Pastikan Telegram menerima nama, bagian/jabatan, tanggal, jam, dan jarak.
5. Karyawan melakukan absensi pulang yang valid dan cek notifikasi kedua.
6. Pastikan baris terkait di `attendance_telegram_notifications` berstatus `SENT`.
