import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20261023000048_review_telat.sql', import.meta.url), 'utf8');
const backend = fs.readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');

assert.match(migration, /create table if not exists public\.late_reviews/);
assert.match(migration, /unique \(user_id, tanggal\)/);
assert.match(migration, /before insert or update[\s\S]*public\.attendance_details/);
assert.match(migration, /v_potongan_final := v_denda_normal/);
assert.match(migration, /v_potongan_final := least\(v_denda_normal/);
assert.match(migration, /v_potongan_final := 0/);
assert.match(migration, /status = 'PUBLISHED'/);
assert.match(migration, /refresh_payroll_from_attendance/);
assert.match(backend, /getIzinTelatReview:[\s\S]*get_late_reviews/);
assert.match(backend, /reviewIzinTelat:[\s\S]*review_late_attendance/);
assert.match(app, /var REVIEW_TELAT_TERSAMBUNG = true/);

console.log('review-telat.test.mjs: OK');
