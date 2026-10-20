import assert from 'node:assert/strict';
import fs from 'node:fs';

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

console.log('slip gaji grouped list tests: OK');
