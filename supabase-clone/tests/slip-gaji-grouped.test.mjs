import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const payroll = fs.readFileSync(new URL('app/js/payroll.js', root), 'utf8');
const css = fs.readFileSync(new URL('app/css/style.css', root), 'utf8');
const backend = fs.readFileSync(new URL('app/js/real-backend.js', root), 'utf8');
const sql = fs.readFileSync(new URL('supabase/migrations/20261017000042_grouped_payroll_slips.sql', root), 'utf8');

assert.match(payroll, /function renderGroupedSlipList\(/);
assert.match(payroll, /function changeSlipMonthFilter\(/);
assert.match(payroll, /function changeSlipSort\(/);
assert.match(payroll, /Semua bulan/);
assert.match(payroll, /Terbaru dahulu/);
assert.match(payroll, /Terlama dahulu/);
assert.match(payroll, /slip-month-group/);
assert.match(payroll, /getPublishedPayrollSlips/);
assert.match(css, /\.slip-toolbar\{/);
assert.match(css, /\.slip-month-group\{/);
assert.match(css, /\.slip-list-row\{/);
assert.match(css, /@media \(max-width:599px\)[\s\S]*\.slip-filter-grid\{grid-template-columns:1fr\}/);
assert.match(backend, /getPublishedPayrollSlips:[\s\S]*get_published_payroll_slips/);
assert.match(sql, /create or replace function public\.get_published_payroll_slips\(\)/i);
assert.match(sql, /pr\.status = 'PUBLISHED'/);
assert.match(sql, /public\.is_payroll_admin\(\)/);

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
assert.match(slipContent.innerHTML, /September 2026/);
assert.match(slipContent.innerHTML, /Agustus 2026/);
assert.ok(slipContent.innerHTML.indexOf('September 2026') < slipContent.innerHTML.indexOf('Agustus 2026'));
context.changeSlipMonthFilter('2026-08');
assert.match(slipContent.innerHTML, /Agustus 2026/);
assert.doesNotMatch(slipContent.innerHTML, /<h3 id="slip-month-2026-09">September 2026<\/h3>/);

console.log('slip gaji grouped list tests: OK');
