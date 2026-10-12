import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261012000023_auto_activate_owner_account_management.sql', import.meta.url), 'utf8');
const realBackend = fs.readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');

assert.match(migration, /where status = 'PENDING'/i, 'akun pending lama harus diaktifkan');
assert.match(migration, /'AKTIF'\s*\)\s*on conflict/i, 'pendaftaran baru harus langsung aktif');
assert.match(migration, /create or replace function public\.get_owner_accounts/i);
assert.match(migration, /create or replace function public\.set_user_access/i);
assert.match(migration, /p_user_id = auth\.uid\(\)/i, 'akun Owner aktif harus terlindungi');
assert.match(migration, /v_bagian = 'Owner'/i, 'semua akun Owner harus terlindungi');
assert.match(migration, /status = 'AKTIF'/i, 'role akun nonaktif harus dicabut');
assert.match(realBackend, /getOwnerAccounts: async function/);
assert.match(realBackend, /setUserAccess: async function/);
assert.match(realBackend, /Akun langsung aktif/i);
assert.match(app, /Pendaftar & Akses/);
assert.doesNotMatch(app, /Menunggu Persetujuan \(/, 'antrean persetujuan tidak boleh muncul lagi');

console.log('owner-account-management tests: OK');
