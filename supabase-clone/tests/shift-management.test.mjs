import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('app/index.html', root), 'utf8');
const app = readFileSync(new URL('app/js/app.js', root), 'utf8');
const backend = readFileSync(new URL('app/js/real-backend.js', root), 'utf8');
const css = readFileSync(new URL('app/css/style.css', root), 'utf8');
const sql = readFileSync(new URL('supabase/migrations/20261026000049_employee_shift_management.sql', root), 'utf8');

test('menu shift menyediakan alur bulk yang mudah dipakai', () => {
  assert.match(html, /id="s-shift-settings"/);
  assert.match(html, /id="shift-select-all" type="checkbox"/);
  assert.match(html, /Terapkan ke Karyawan Terpilih/);
  assert.match(html, /Pengecualian satu hari/);
  assert.match(app, /function loadShiftSettings/);
  assert.match(app, /function toggleAllVisibleShiftEmployees/);
  assert.match(app, /function applySelectedShift/);
  assert.match(css, /\.shift-employee-row/);
  assert.match(css, /min-height:46px/);
});

test('backend shift terhubung ke Supabase dan matrix kehadiran', () => {
  assert.match(backend, /get_shift_management_data/);
  assert.match(backend, /bulk_assign_employee_shift/);
  assert.match(backend, /save_employee_shift_override/);
  assert.match(backend, /get_employee_schedule_month/);
  assert.match(backend, /employeeScheduleMap\[u\.id \+ '\|' \+ dateKey\]/);
});

test('resolver shift dipakai seluruh kalkulasi utama', () => {
  assert.match(sql, /create or replace function public\.get_jadwal_karyawan/);
  assert.match(sql, /'PAGI', 'Shift Pagi', '08:00', '18:00'/);
  assert.match(sql, /'SIANG', 'Shift Siang', '14:00', '22:00'/);
  assert.match(sql, /assign_default_shift_after_profile/);
  assert.match(sql, /process_absensi_app_to_rekap/);
  assert.match(sql, /update_absensi_matrix_day/);
  assert.match(sql, /get_late_reviews/);
  assert.match(sql, /get_jadwal_karyawan\(a\.user_id, a\.tanggal\)/);
  assert.match(sql, /PENGECUALIAN/);
  assert.match(sql, /PENEMPATAN/);
  assert.match(sql, /DEFAULT/);
});

test('riwayat jadwal memakai snapshot agar payroll lama tidak berubah', () => {
  assert.match(sql, /employee_shift_assignments[\s\S]*shift_name text not null[\s\S]*jam_masuk time not null[\s\S]*jam_pulang time not null/);
  assert.match(sql, /Perubahan template hanya berlaku pada penempatan baru/);
});
