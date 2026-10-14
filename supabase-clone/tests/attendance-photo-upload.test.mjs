import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
const storageSrc = readFileSync(new URL('../app/js/photo-storage.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261014000027_attendance_photo_storage.sql', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Uji fungsi murni modul penyimpanan (tanpa browser, tanpa jaringan)
// ---------------------------------------------------------------------------
const fakeWindow = { crypto: undefined };
const mod = new Function(
  'window', 'fetch', 'Blob', 'atob',
  storageSrc + '\nreturn { photoStoragePath, photoStorageErrorText, photoStorageConfigured, photoStorageDataUrlToBytes, PHOTO_STORAGE_CONFIG, PHOTO_STORAGE_MAX_BYTES };'
)(
  fakeWindow,
  function () {},
  class {},
  function (b64) { return Buffer.from(b64, 'base64').toString('binary'); }
);

// Config masih kosong di repo (menunggu diisi dari Firebase Console) -> modul
// harus melaporkan "belum siap", bukan error yang membingungkan.
assert.equal(mod.photoStorageConfigured(), false);
assert.equal(mod.PHOTO_STORAGE_CONFIG.apiKey, '');
assert.equal(mod.PHOTO_STORAGE_CONFIG.storageBucket, '');
assert.equal(mod.PHOTO_STORAGE_MAX_BYTES, 800 * 1024);

// Path foto: dikelompokkan per bulan, tidak bisa keluar dari folder "absensi"
// walau userId/tipe berisi karakter aneh (cegah path traversal).
const path = mod.photoStoragePath('11111111-2222-3333-4444-555555555555', 'MASUK', '2026-10-14T01:30:12.000Z');
assert.match(path, /^absensi\/\d{4}-\d{2}\/\d{8}-\d{6}_MASUK_11111111-2222-3333-4444-555555555555\.jpg$/);
const nakal = mod.photoStoragePath('../../etc/passwd', 'MASUK<script>', 'bukan-tanggal');
assert.match(nakal, /^absensi\/\d{4}-\d{2}\//);
assert.ok(nakal.indexOf('..') === -1, 'path tidak boleh mengandung ..');
assert.ok(nakal.indexOf('<') === -1, 'path tidak boleh mengandung karakter HTML');
assert.ok(!/\s/.test(nakal), 'path tidak boleh mengandung spasi');

// Data URL -> bytes
assert.equal(mod.photoStorageDataUrlToBytes('bukan-data-url'), null);
assert.equal(mod.photoStorageDataUrlToBytes('data:text/plain;base64,YWJj'), null);
const parsed = mod.photoStorageDataUrlToBytes('data:image/jpeg;base64,' + Buffer.from('abc').toString('base64'));
assert.equal(parsed.mime, 'image/jpeg');
assert.equal(parsed.bytes.length, 3);

// Pesan error memuat kode asli (Ko: jangan samarkan penyebab sebenarnya)
assert.match(mod.photoStorageErrorText(400, { error: { message: 'OPERATION_NOT_ALLOWED' } }), /Anonymous/);
assert.match(mod.photoStorageErrorText(400, { error: { message: 'OPERATION_NOT_ALLOWED' } }), /OPERATION_NOT_ALLOWED/);
assert.match(mod.photoStorageErrorText(403, { error: { message: 'STORAGE_UNAUTHORIZED' } }), /Storage Rules/);
assert.match(mod.photoStorageErrorText(404, null), /bucket/);
assert.match(mod.photoStorageErrorText(500, null), /HTTP 500/);

// ---------------------------------------------------------------------------
// 2) Modul dimuat aplikasi tanpa SDK Firebase (aplikasi harus tetap ringan)
// ---------------------------------------------------------------------------
assert.match(html, /<script src="js\/photo-storage\.js\?v=20261014o"><\/script>/);
assert.doesNotMatch(html, /firebasejs|firebase-app|firebase-storage/i);
assert.match(storageSrc, /identitytoolkit\.googleapis\.com\/v1\/accounts:signUp/);
assert.match(storageSrc, /firebasestorage\.googleapis\.com\/v0\/b\//);
assert.match(sw, /'\.\/js\/photo-storage\.js'/);

// ---------------------------------------------------------------------------
// 3) Alur di aplikasi: tap dulu -> foto diunggah -> metadata dicatat -> bisa retry
// ---------------------------------------------------------------------------
assert.match(html, /id="attendance-photo-status"/);
// base64 foto TIDAK boleh dikirim ke database (database hanya simpan metadata)
assert.match(app, /gasCall\('submitAbsensiCamera', \[currentUser\.id, currentUser\.nama, tipe, '', _attendanceLocation\.lat/);
assert.match(app, /function sendAttendancePhoto\(\)/);
assert.match(app, /photoStorageUpload\(\{ userId: currentUser\.id, tipe: p\.tipe, dataUrl: p\.dataUrl, takenAt: p\.takenAt \}/);
assert.match(app, /gasCall\('attachAbsensiPhoto', \[p\.eventId, up\.path, up\.url, up\.mime, up\.size, up\.sha256, 'FIREBASE', p\.takenAt\]/);
assert.match(app, /function markAttendancePhotoFailed\(message\)/);
assert.match(app, /'Foto GAGAL disimpan: ' \+ pesan/);
assert.match(app, /gasCall\('markAbsensiPhotoFailed', \[p\.eventId, pesan\.slice\(0, 500\)\]/);
assert.match(app, /function retryAttendancePhoto\(eventId\)/);
assert.match(app, /Kirim Ulang Foto/);
assert.match(app, /Foto sudah tidak ada di perangkat ini, tidak bisa dikirim ulang/);
assert.match(app, /_pendingAttendancePhoto = _attendancePhotoData \? \{/);
assert.match(app, /photoStorageConfigured\(\)/);
assert.match(app, /Lihat Foto Absensi/);

// ---------------------------------------------------------------------------
// 4) Backend: RPC baru dipanggil, kolom foto ikut dibaca
// ---------------------------------------------------------------------------
assert.match(backend, /attachAbsensiPhoto: async function \(args\)/);
assert.match(backend, /window\.sb\.rpc\('attach_absensi_photo'/);
assert.match(backend, /markAbsensiPhotoFailed: async function \(args\)/);
assert.match(backend, /window\.sb\.rpc\('mark_absensi_photo_failed'/);
assert.match(backend, /select\('id,tanggal,jam,tipe,status,jarak_kantor_meter,catatan,photo_url,photo_path,upload_status,upload_error,photo_provider'\)/);
assert.match(backend, /fotoUrl: row\.photo_url/);

// ---------------------------------------------------------------------------
// 5) Migration: kolom + RPC dengan pemeriksaan hak akses
// ---------------------------------------------------------------------------
assert.match(migration, /alter table public\.attendance_events[\s\S]*?add column if not exists photo_provider text/);
assert.match(migration, /add column if not exists photo_path text/);
assert.match(migration, /add column if not exists photo_url text/);
assert.match(migration, /add column if not exists captured_at timestamptz/);
assert.match(migration, /add column if not exists uploaded_at timestamptz/);
assert.match(migration, /create or replace function public\.attach_absensi_photo\(/);
assert.match(migration, /v_row\.user_id <> v_uid/);
assert.match(migration, /v_row\.upload_status = 'UPLOADED'/);
assert.match(migration, /v_row\.status <> 'DITERIMA'/);
assert.match(migration, /p_url !~ '\^https:\/\/firebasestorage\\\.googleapis\\\.com\/'/);
assert.match(migration, /grant execute on function public\.attach_absensi_photo\(uuid, text, text, text, integer, text, text, timestamptz\) to authenticated/);
assert.match(migration, /create or replace function public\.mark_absensi_photo_failed\(/);
assert.match(migration, /grant execute on function public\.mark_absensi_photo_failed\(uuid, text\) to authenticated/);
// Foto TIDAK disimpan sebagai berkas di database (hanya metadata + tautan)
assert.doesNotMatch(migration, /bytea/);
assert.match(migration, /Foto TIDAK disimpan di PostgreSQL/);
assert.match(migration, /photo_url\s+= p_url/);

// ---------------------------------------------------------------------------
// 6) Versi cache naik serentak (HP tidak boleh memakai file lama)
// ---------------------------------------------------------------------------
assert.match(html, /css\/style\.css\?v=20261014o/);
assert.match(html, /js\/app\.js\?v=20261014o/);
assert.match(app, /APP_VERSION = '20261014o'/);
assert.match(sw, /APP_VERSION = '20261014o'/);

console.log('penyimpanan foto absensi (Firebase Storage): ok');
