import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const mock = readFileSync(new URL('../app/js/mock-backend.js', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Halaman utama TIDAK boleh lagi memakai data contoh (mock) untuk data nyata.
// ---------------------------------------------------------------------------
assert.match(backend, /getHomeData: async function \(args\)/, 'getHomeData belum ada di real-backend');
assert.match(backend, /getIzinPendingCount: async function \(\)/, 'getIzinPendingCount belum ada');

// Sumber data harus dari tabel Supabase, bukan data contoh
for (const sumber of [
  ".from('announcements')",
  ".from('notifications')",
  ".from('profiles')",
  ".from('attendance_anomalies')",
  ".from('leave_requests')",
  "rpc('get_papan_peringkat')"
]) {
  assert.ok(backend.indexOf(sumber) !== -1, 'sumber data tidak dipakai: ' + sumber);
}

// Bentuk hasil harus tetap sama seperti yang dipakai app.js (kalau tidak, halaman utama rusak)
for (const kunci of ['pengumuman', 'rewards', 'notifCountByMenu', 'profile', 'anomaliPending']) {
  assert.ok(new RegExp(kunci + ':').test(backend), 'kunci hasil hilang: ' + kunci);
}
assert.match(backend, /var bulanKeySekarang = |function bulanKeySekarang\(\)/);
assert.match(backend, /hasil\.profile = \{ bintang: r\[2\]\.data\.bintang/, 'profil sendiri tidak diisi');
assert.match(backend, /notifCountByMenu\['s-notifikasi'\]/, 'badge notifikasi tidak dihitung');

// app.js tetap membaca struktur yang sama
assert.match(app, /if \(d\.pengumuman && d\.pengumuman\.length > 0\)/);
assert.match(app, /var rwdList = \(d\.rewards && d\.rewards\.length > 0\)/);
assert.match(app, /if \(d\.notifCountByMenu\) updateAllMenuBadges\(d\.notifCountByMenu\)/);
assert.match(app, /if \(d\.anomaliPending && d\.anomaliPending\.length > 0\)/);

// Data contoh hanya boleh dipakai untuk aksi yang BELUM ada versi aslinya
assert.match(mock, /getHomeData: function \(args\)/, 'mock getHomeData dihapus padahal masih dipakai sebagai fallback');

// Setelah absensi/izin berubah, cache home harus dibuang supaya angka tidak basi
assert.match(app, /submitAbsensiCamera: \['getAbsensiCameraToday','getAbsensiMatrix','getAbsensiMatrixUser','getHomeData'\]/);
assert.match(app, /submitIzin: \['getIzinKaryawan','getIzinPending','getIzinPendingCount','getHomeData','getNotifikasi'\]/);

console.log('halaman utama memakai data asli (bukan contoh): ok');
