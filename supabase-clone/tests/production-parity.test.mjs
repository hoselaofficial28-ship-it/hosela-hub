import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const payroll = readFileSync(new URL('../app/js/payroll.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');

const calledActions = new Set(
  [...app.matchAll(/gasCall\('([^']+)'/g), ...payroll.matchAll(/gasCall\('([^']+)'/g)]
    .map((match) => match[1]),
);
const realHandlers = new Set(
  [...backend.matchAll(/^\s{4}([A-Za-z0-9_]+):\s*(?:async\s+)?function/gm)]
    .map((match) => match[1]),
);
const missingHandlers = [...calledActions].filter((action) => !realHandlers.has(action)).sort();

assert.equal(calledActions.size, 80, 'Jumlah aksi frontend berubah; audit handler Supabase wajib diperbarui');
assert.deepEqual(missingHandlers, [], `Aksi frontend tanpa handler Supabase: ${missingHandlers.join(', ')}`);

const expectedScreens = [
  's-login', 's-daftar', 's-home', 's-jobdesk', 's-staff', 's-detail',
  's-pengumuman', 's-ide', 's-peraturan', 's-kalender',
  's-manage-users', 's-tambah-karyawan', 's-absensi-upload', 's-laporan-absensi',
  's-kpi-check', 's-papan-peringkat', 's-ganti-pin', 's-paksa-ganti-pin',
  's-absensi-camera', 's-izin', 's-kelola-izin', 's-notifikasi', 's-sanksi-manual',
  's-review-telat', 's-catatan-kehadiran', 's-setting-gaji', 's-payroll', 's-slip-gaji',
];

const screenIds = [...html.matchAll(/<div class="screen" id="([^"]+)"/g)].map((match) => match[1]);
const duplicates = screenIds.filter((id, index) => screenIds.indexOf(id) !== index);
assert.deepEqual(duplicates, [], `ID layar duplikat: ${duplicates.join(', ')}`);
assert.deepEqual(expectedScreens.filter((id) => !screenIds.includes(id)), [], 'Ada layar wajib yang hilang');
assert.equal(expectedScreens.length, 28);
assert.match(html, /id="announcement-owner-panel"/, 'Panel Owner untuk membuat pengumuman langsung tidak ditemukan');

assert.match(app, /if \(!localDemo\) \{[\s\S]*Fitur "' \+ action \+ '" belum tersambung ke layanan produksi\./);
assert.match(app, /window\.realBackendHandles && window\.realBackendHandles\(action\)/);

console.log(`production parity: ${expectedScreens.length} layar, ${calledActions.size} aksi, 0 handler hilang`);
