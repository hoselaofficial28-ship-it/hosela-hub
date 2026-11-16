import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const payroll = fs.readFileSync(new URL('app/js/payroll.js', root), 'utf8');
const css = fs.readFileSync(new URL('app/css/style.css', root), 'utf8');
const backend = fs.readFileSync(new URL('app/js/real-backend.js', root), 'utf8');
const sql = fs.readFileSync(new URL('supabase/migrations/20261017000042_grouped_payroll_slips.sql', root), 'utf8');
const html = fs.readFileSync(new URL('app/index.html', root), 'utf8');
const appjs = fs.readFileSync(new URL('app/js/app.js', root), 'utf8');

// ---------------------------------------------------------------------------
// 1) Struktur fungsi tetap ada (fungsi UI lama tidak dihapus)
// ---------------------------------------------------------------------------
assert.match(payroll, /function renderGroupedSlipList\(/);
assert.match(payroll, /function changeSlipMonthFilter\(/);
assert.match(payroll, /function changeSlipSort\(/);
assert.match(payroll, /Semua bulan/);
assert.match(payroll, /getPublishedPayrollSlips/);
assert.match(backend, /getPublishedPayrollSlips:[\s\S]*get_published_payroll_slips/);
assert.match(sql, /create or replace function public\.get_published_payroll_slips\(\)/i);
assert.match(sql, /pr\.status = 'PUBLISHED'/);
assert.match(sql, /public\.is_payroll_admin\(\)/);

// ---------------------------------------------------------------------------
// 2) Tampilan rapat (16 Nov 2026): 1 baris = 1 slip, bulan bisa dilipat
// ---------------------------------------------------------------------------
assert.match(payroll, /class="slip-compact"/);
assert.match(payroll, /class="slip-pill/);
assert.match(payroll, /bulanIndex === 0 \? ' open' : ''/);
assert.match(payroll, /<table class="slip-table">/);
assert.match(payroll, /Karyawan<\/th><th>Gaji pokok<\/th><th>Pemberian<\/th><th>Denda<\/th><th>Gaji bersih<\/th>/);
assert.match(payroll, /class="c-num c-net"/);
assert.match(payroll, /class="c-act"/);
assert.match(payroll, /slip-act slip-act-primary/);
// label per-baris yang lama (mubazir) tidak boleh kembali
assert.doesNotMatch(payroll, /slip-list-row/, 'markup lama (kotak besar per karyawan) sudah diganti');

// CSS baru harus ada, dan label kolom hanya sekali per bulan
assert.match(css, /\.slip-compact\{/);
assert.match(css, /\.slip-month\>summary\{/);
assert.match(css, /\.slip-table\{width:100%;border-collapse:collapse;table-layout:auto\}/);
assert.match(css, /\.slip-table thead th\.th-act\{width:1%;white-space:nowrap\}/);
assert.match(css, /@media \(max-width:700px\)\{[\s\S]{0,900}\.slip-table \.c-pokok,\.slip-table \.c-plus,\.slip-table \.c-minus\{display:none\}/);

// ---------------------------------------------------------------------------
// 3) Render nyata dengan data contoh: bulan terbaru terbuka, sisanya terlipat
// ---------------------------------------------------------------------------
const slipContent = { innerHTML: '' };
const context = {
  console,
  document: { getElementById: id => id === 'slip-gaji-content' ? slipContent : null },
  currentUser: { id: 'owner', bagian: 'Owner' }
};
vm.createContext(context);
vm.runInContext(payroll, context);
context.renderAdminSlipList([
  { id: 'd1', payrollRunId: 'r1', userId: 'u1', nama: 'Adi', bagian: 'Gudang', jabatan: 'Picker', bulan: '2026-09', totalGaji: 2750000, gajiPokok: 2600000, totalReward: 40000, bonusKerajinan: 200000, totalDenda: 90000 },
  { id: 'd2', payrollRunId: 'r2', userId: 'u1', nama: 'Adi', bagian: 'Gudang', jabatan: 'Picker', bulan: '2026-08', totalGaji: 2600000, gajiPokok: 2600000 }
]);
const hasil = slipContent.innerHTML;
assert.match(hasil, /September 2026/);
assert.match(hasil, /Agustus 2026/);
assert.ok(hasil.indexOf('September 2026') < hasil.indexOf('Agustus 2026'), 'bulan terbaru tampil lebih dulu');

// bulan pertama terbuka, bulan kedua terlipat
assert.match(hasil, /<details class="slip-month" open>/);
assert.match(hasil, /<details class="slip-month">/);

// angka: pokok, pemberian (reward + kerajinan), denda, gaji bersih
assert.match(hasil, /Rp 2\.600\.000/, 'gaji pokok tampil');
assert.match(hasil, /\+Rp 240\.000/, 'pemberian = reward + kerajinan');
assert.match(hasil, /-Rp 90\.000/, 'denda bertanda minus');
assert.match(hasil, /Rp 2\.750\.000/, 'gaji bersih tampil');
assert.match(hasil, /Rp 2\.600\.000<\/td>[\s\S]*?Rp 0[\s\S]*?Rp 2\.600\.000/, 'slip tanpa reward/denda tetap tampil 0');

// filter bulan tetap bekerja setelah desain baru (pil bulan tetap tampil semua,
// yang hilang hanya bagian tabel bulan tersebut)
context.changeSlipMonthFilter('2026-08');
assert.match(slipContent.innerHTML, /id="slip-month-2026-08"/);
assert.doesNotMatch(slipContent.innerHTML, /id="slip-month-2026-09"/);
assert.match(slipContent.innerHTML, /1 slip/);

// ---------------------------------------------------------------------------
// 4) Versi cache dinaikkan supaya browser memuat CSS/JS baru
// ---------------------------------------------------------------------------
const versi = /var APP_VERSION = '([^']+)';/.exec(appjs)[1];
assert.match(html, new RegExp('style\\.css\\?v=' + versi));
assert.match(html, new RegExp('js/payroll\\.js\\?v=' + versi));

console.log('slip gaji grouped list tests: OK');
