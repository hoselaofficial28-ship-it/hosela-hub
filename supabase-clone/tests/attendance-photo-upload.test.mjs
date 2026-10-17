import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../app/sw.js', import.meta.url), 'utf8');
const storageSrc = readFileSync(new URL('../app/js/photo-storage.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261014000038_supabase_attendance_photo_storage.sql', import.meta.url), 'utf8');
const cleanup = readFileSync(new URL('../supabase/functions/cleanup-attendance-photos/index.ts', import.meta.url), 'utf8');
const functionConfig = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');

// Fungsi murni modul penyimpanan, tanpa browser/jaringan.
const fakeWindow = { crypto: undefined, sb: { storage: {} } };
const mod = new Function(
  'window', 'Blob', 'atob',
  storageSrc + '\nreturn { photoStoragePath, photoStorageErrorText, photoStorageConfigured, photoStorageEnabled, photoStorageDataUrlToBytes, PHOTO_STORAGE_BUCKET, PHOTO_STORAGE_MAX_BYTES };'
)(
  fakeWindow,
  class {},
  function (b64) { return Buffer.from(b64, 'base64').toString('binary'); }
);

assert.equal(mod.photoStorageEnabled(), true);
assert.equal(mod.photoStorageConfigured(), true);
assert.equal(mod.PHOTO_STORAGE_BUCKET, 'attendance-photos');
assert.equal(mod.PHOTO_STORAGE_MAX_BYTES, 180 * 1024);
assert.match(storageSrc, /var PHOTO_STORAGE_ENABLED = true;/);

const path = mod.photoStoragePath(
  '11111111-2222-3333-4444-555555555555',
  'MASUK',
  '2026-10-14T01:30:12.000Z',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);
assert.match(path, /^11111111-2222-3333-4444-555555555555\/\d{4}-\d{2}\/\d{8}-\d{6}-\d{3}_MASUK_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\.jpg$/);
const nakal = mod.photoStoragePath('../../etc/passwd', 'MASUK<script>', 'bukan-tanggal');
assert.match(nakal, /^[a-f0-9-]+\/\d{4}-\d{2}\//);
assert.ok(!nakal.includes('..'));
assert.ok(!nakal.includes('<'));
assert.ok(!/\s/.test(nakal));

assert.equal(mod.photoStorageDataUrlToBytes('bukan-data-url'), null);
assert.equal(mod.photoStorageDataUrlToBytes('data:text/plain;base64,YWJj'), null);
const parsed = mod.photoStorageDataUrlToBytes('data:image/jpeg;base64,' + Buffer.from('abc').toString('base64'));
assert.equal(parsed.mime, 'image/jpeg');
assert.equal(parsed.bytes.length, 3);

assert.match(mod.photoStorageErrorText({ message: 'new row violates row-level security policy' }), /policy/);
assert.match(mod.photoStorageErrorText({ message: 'Bucket not found' }), /Bucket/);
assert.match(mod.photoStorageErrorText({ message: 'Payload too large 413' }), /180 KB/);

// Memakai klien Supabase yang sudah ada; tidak menambah Firebase SDK/library.
assert.match(html, /<script src="js\/photo-storage\.js\?v=20261015e"><\/script>/);
assert.doesNotMatch(html, /firebasejs|firebase-app|firebase-storage/i);
assert.match(storageSrc, /window\.sb\.storage\.from\(PHOTO_STORAGE_BUCKET\)\.upload/);
assert.match(storageSrc, /createSignedUrl\(safePath, 120\)/);
assert.match(sw, /'\.\/js\/photo-storage\.js'/);

// Tap disimpan dahulu, lalu foto, metadata, dan retry.
assert.match(html, /id="attendance-photo-status"/);
assert.match(app, /gasCall\('submitAbsensiCamera', \[currentUser\.id, currentUser\.nama, tipe, '', _attendanceLocation\.lat/);
assert.match(app, /function sendAttendancePhoto\(\)/);
assert.match(app, /eventId: p\.eventId/);
assert.match(app, /up\.provider \|\| 'SUPABASE'/);
assert.match(app, /function encodeAttendancePhoto\(sourceCanvas\)/);
assert.match(app, /var targetBytes = 110 \* 1024/);
assert.match(app, /var hardLimit = 180 \* 1024/);
assert.match(app, /function openAttendancePhoto\(path\)/);
assert.match(app, /function retryAttendancePhoto\(eventId\)/);
assert.match(app, /Kirim Ulang Foto/);

// Backend tetap mencatat metadata lewat RPC dan membaca kolom foto.
assert.match(backend, /attachAbsensiPhoto: async function \(args\)/);
assert.match(backend, /window\.sb\.rpc\('attach_absensi_photo'/);
assert.match(backend, /p_provider: args\[6\] \|\| 'SUPABASE'/);
assert.match(backend, /markAbsensiPhotoFailed: async function \(args\)/);
assert.match(backend, /photo_url,photo_path,upload_status,upload_error,photo_provider/);

// Bucket privat, batas ukuran, policy kepemilikan, dan URL non-permanen.
assert.match(migration, /'attendance-photos', 'attendance-photos', false, 184320/);
assert.match(migration, /create policy "attendance photo upload sendiri"/);
assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
assert.match(migration, /create policy "attendance photo baca sesuai akses"/);
assert.match(migration, /or public\.is_payroll_admin\(\)/);
assert.match(migration, /create or replace function public\.attach_absensi_photo\(/);
assert.match(migration, /v_row\.user_id <> v_uid/);
assert.match(migration, /v_provider = 'SUPABASE'/);
assert.match(migration, /split_part\(btrim\(p_path\), '\/', 1\) <> v_uid::text/);
assert.match(migration, /Foto privat tidak boleh menyimpan URL permanen/);
assert.doesNotMatch(migration, /bytea/);

// Pembersih menghapus lewat Storage API dan menandai metadata EXPIRED.
assert.match(cleanup, /30 \* 24 \* 60 \* 60 \* 1000/);
assert.match(cleanup, /bucket\.remove\(batch\)/);
assert.match(cleanup, /upload_status: 'EXPIRED'/);
assert.match(cleanup, /req\.headers\.get\('apikey'\)/);
assert.match(cleanup, /SUPABASE_SECRET_KEYS/);
assert.match(cleanup, /configuredSecretKeys\(\)\.has\(apiKey\)/);
assert.match(cleanup, /profile\.bagian !== 'Owner'/);
assert.match(functionConfig, /\[functions\.cleanup-attendance-photos\]/);
assert.match(functionConfig, /verify_jwt = false/);

// Versi cache serentak agar HP tidak mempertahankan kode Firebase lama.
assert.match(html, /css\/style\.css\?v=20261017c/);
assert.match(html, /js\/app\.js\?v=20261017c/);
assert.match(app, /APP_VERSION = '20261017c'/);
assert.match(sw, /APP_VERSION = '20261017c'/);

console.log('penyimpanan foto absensi (Supabase Storage): ok');
