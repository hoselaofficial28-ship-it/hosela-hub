import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const sql = fs.readFileSync(new URL('supabase/migrations/20261017000041_payroll_attendance_sync.sql', root), 'utf8');
const payroll = fs.readFileSync(new URL('app/js/payroll.js', root), 'utf8');
const backend = fs.readFileSync(new URL('app/js/real-backend.js', root), 'utf8');
const app = fs.readFileSync(new URL('app/js/app.js', root), 'utf8');

assert.match(sql, /add column if not exists attendance_source_hash text/i);
assert.match(sql, /create or replace function public\.payroll_source_hash\(p_bulan_key text\)/i);
assert.match(sql, /create or replace function public\.refresh_payroll_from_attendance\(p_payroll_run_id uuid\)/i);
assert.match(sql, /d\.tipe = 'LEMBUR_PULANG'/);
assert.match(sql, /lembur_pulang = v_lembur_pulang/);
assert.match(sql, /r\.hadir, r\.absen, r\.telat, v_lembur_pulang, r\.lembur_minggu, r\.lembur_libur/);
assert.match(sql, /total_reward = r\.total_reward/);
assert.match(sql, /total_denda = r\.total_denda/);
assert.match(sql, /perform public\.refresh_payroll_from_attendance\(p_payroll_run_id\)/);
assert.match(sql, /attendance_source_hash is distinct from public\.payroll_source_hash\(v_run\.bulan\)/);
assert.match(sql, /Catatan kehadiran berubah setelah konfirmasi/);
assert.match(sql, /and tipe not in \('ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS'\)/);

assert.match(backend, /syncPayrollAttendance:[\s\S]*refresh_payroll_from_attendance/);
assert.match(app, /syncPayrollAttendance: \['getPayrollPreview','getPayrollDetail'/);
assert.match(payroll, /function syncPayrollAttendanceUI\(/);
assert.match(payroll, /Sinkronkan Kehadiran/);
assert.match(payroll, /Sinkronkan Ulang/);
assert.match(payroll, /res\.sourceStale === true/);
assert.match(payroll, /Sistem akan menyinkronkan Catatan Kehadiran terbaru terlebih dahulu/);
assert.match(payroll, /if \(!res \|\| res\.success === false\)/);

console.log('payroll attendance sync tests passed');
