import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const mig = readFileSync(new URL('../supabase/migrations/20261014000030_anomali_dan_sanksi_manual.sql', import.meta.url), 'utf8');
const mig028 = readFileSync(new URL('../supabase/migrations/20261014000028_privacy_hardening.sql', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1) Aksi yang sebelumnya memakai data contoh sekarang tersambung Supabase
// ---------------------------------------------------------------------------
const handlerBaru = [
  ['ping', /ping: async function \(\)/],
  ['getPengaturan', /getPengaturan: async function \(\)/],
  ['getStaffByBagian', /getStaffByBagian: async function \(args\)/],
  ['getJobdeskByJabatan', /getJobdeskByJabatan: async function \(args\)/],
  ['gantiPIN', /gantiPIN: async function \(args\)/],
  ['updateEmail', /updateEmail: async function \(args\)/],
  ['getAnomaliPending', /getAnomaliPending: async function \(\)/],
  ['konfirmasiAnomali', /konfirmasiAnomali: async function \(args\)/],
  ['getSanksiManual', /getSanksiManual: async function \(\)/],
  ['addSanksiManual', /addSanksiManual: async function \(args\)/],
  ['batalSanksiManual', /batalSanksiManual: async function \(args\)/],
  ['processAbsensiUpload', /processAbsensiUpload: async function \(args\)/]
];
for (const [nama, pola] of handlerBaru) {
  assert.match(backend, pola, 'handler belum ada: ' + nama);
}

// Sumber datanya benar (tabel/RPC), bukan data contoh
assert.match(backend, /\.from\('app_settings'\)\.select\('key,value'\)/);
assert.match(backend, /\.from\('profiles'\)\s*\n?\s*\.select\('id,nama,jabatan,bagian'\)\.eq\('bagian', bagian\)/);
assert.match(backend, /\.from\('jobdesks'\)\.select\('id,jabatan,link'\)\.eq\('jabatan', jabatan\)/);
for (const r of ['get_anomali_pending', 'konfirmasi_anomali', 'get_sanksi_manual', 'add_sanksi_manual', 'batal_sanksi_manual', 'import_attendance_legacy_to_events']) {
  assert.match(backend, new RegExp("rpc\\('" + r + "'"), 'RPC belum dipakai: ' + r);
}
// Ganti sandi & email memakai Supabase Auth (sandi lama diverifikasi, tidak dikirim ke tabel)
assert.match(backend, /window\.sb\.auth\.signInWithPassword\(\{ email: email, password: sandiLama \}\)/);
assert.match(backend, /window\.sb\.auth\.updateUser\(\{ password: sandiBaru \}\)/);
assert.match(backend, /window\.sb\.auth\.updateUser\(\{ email: email \}\)/);
// Email baru harus dikonfirmasi dulu -> pesannya jujur, bukan "langsung tersimpan"
assert.match(backend, /msg: 'Cek email baru untuk konfirmasi'/);
assert.match(app, /showToast\(r\.msg \|\| 'Email berhasil disimpan '\)/);

// ---------------------------------------------------------------------------
// 2) Menu Review Telat: jujur "belum tersambung", bukan data contoh
// ---------------------------------------------------------------------------
assert.match(app, /var REVIEW_TELAT_TERSAMBUNG = false;/);
assert.match(app, /if \(!REVIEW_TELAT_TERSAMBUNG\) \{\s*\n\s*fillReviewTelatMonthSelect\(\);\s*\n\s*list\.innerHTML = '[\s\S]{0,200}belum tersambung ke database/);
assert.match(app, /function submitReviewTelat\(id, safeId\) \{\s*\n\s*if \(!REVIEW_TELAT_TERSAMBUNG\) \{\s*\n\s*showToast\('Menu Review Telat belum tersambung ke database'\)/);

// ---------------------------------------------------------------------------
// 3) Migration 030: hak akses & penjagaan
// ---------------------------------------------------------------------------
for (const fn of ['get_anomali_pending', 'konfirmasi_anomali', 'get_sanksi_manual', 'add_sanksi_manual', 'batal_sanksi_manual']) {
  assert.match(mig, new RegExp('create or replace function public\\.' + fn + '\\('), 'fungsi hilang: ' + fn);
}
// semua fungsi wajib login + hanya Owner/Finance
const jumlahJaga = (mig.match(/if not public\.is_payroll_admin\(\) then/g) || []).length;
assert.ok(jumlahJaga >= 5, 'penjagaan Owner/Finance kurang: ' + jumlahJaga);
assert.equal((mig.match(/raise exception 'Harus login'/g) || []).length, 5, 'penjagaan login harus ada di 5 fungsi');
// denda bertingkat seperti kode lama
assert.match(mig, /when coalesce\(v_jumlah, 0\) = 0 then 10000/);
assert.match(mig, /when v_jumlah = 1 then 20000/);
assert.match(mig, /else 50000 end/);
// baris manual tidak boleh ikut terhapus saat proses bulan diulang
assert.match(mig, /'DENDA_ANOMALI',[\s\S]{0,120}v_denda, false\)/);
assert.match(mig, /v_nominal, false\)/);
// izin panggil: bukan anon/PUBLIC
assert.match(mig, /revoke execute on function public\.get_anomali_pending\(\) from public, anon;/);
assert.match(mig, /grant execute on function public\.konfirmasi_anomali\(uuid, text\) to authenticated, service_role;/);
assert.match(mig, /notify pgrst, 'reload schema'/);
// migrasi privasi juga harus mengizinkan RPC baru untuk pengguna yang login
for (const r of ['get_anomali_pending()', 'konfirmasi_anomali(uuid,text)', 'get_sanksi_manual()', 'add_sanksi_manual(uuid,text,integer,text)', 'batal_sanksi_manual(uuid)']) {
  assert.ok(mig028.indexOf("'public." + r + "'") !== -1, 'daftar izin 028 tidak memuat: ' + r);
}

console.log('aksi tersambung Supabase + anomali/sanksi manual: ok');
