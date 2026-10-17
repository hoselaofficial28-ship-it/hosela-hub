import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const payroll = readFileSync(new URL('../app/js/payroll.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const mock = readFileSync(new URL('../app/js/mock-backend.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261017000040_cancel_published_payroll.sql', import.meta.url), 'utf8');

const backButtons = html.match(/class="back-btn"[^>]*onclick="goBack\(\)"/g) || [];
assert.ok(backButtons.length >= 20, 'semua tombol kembali halaman harus memakai goBack()');
assert.doesNotMatch(html, /class="back-btn"[^>]*onclick="goTo\(/, 'tombol kembali tidak boleh diarahkan ke halaman tetap');
assert.match(app, /function goBack\(\)/);
assert.match(app, /var _isBackNavigation = false;/);
assert.match(app, /aria-label', 'Kembali ke halaman sebelumnya'/);

assert.match(payroll, /Batalkan Terbit/);
assert.match(payroll, /function cancelPayrollUI\(payrollRunId, bulanKey, button\)/);
assert.match(payroll, /Data tidak dihapus dan dapat diterbitkan lagi/);
assert.match(payroll, /currentUser\.bagian !== 'Owner'/);
assert.match(css, /\.btn-danger-soft\{/);
assert.match(css, /min-height:44px/);

assert.match(backend, /cancelPayroll: async function \(args\)/);
assert.match(backend, /rpc\('cancel_published_payroll'/);
assert.match(mock, /cancelPayroll: function \(args\)/);
assert.match(app, /cancelPayroll: \['getPayrollPreview'/);

assert.match(migration, /create or replace function public\.cancel_published_payroll\(p_payroll_run_id uuid\)/);
assert.match(migration, /if not public\.is_owner\(\) then/);
assert.match(migration, /set status = 'CONFIRMED'/);
assert.match(migration, /set status_slip = 'DRAFT'/);
assert.match(migration, /CANCEL_PUBLISHED_PAYROLL/);
assert.match(migration, /grant execute on function public\.cancel_published_payroll\(uuid\) to authenticated, service_role;/);

console.log('payroll cancel + navigation tests: OK');
