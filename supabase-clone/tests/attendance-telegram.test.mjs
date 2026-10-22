import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const real = fs.readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const mock = fs.readFileSync(new URL('../app/js/mock-backend.js', import.meta.url), 'utf8');
const edge = fs.readFileSync(new URL('../supabase/functions/notify-attendance-telegram/index.ts', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20261021000047_attendance_telegram_notifications.sql', import.meta.url), 'utf8');

// Klien hanya memanggil notifikasi setelah submit absensi dinyatakan sukses.
assert.match(app, /notifyAttendanceOwner\(res\.id \|\| ''\)/);
assert.ok(app.indexOf("if (!res || res.success === false)") < app.indexOf("notifyAttendanceOwner(res.id || '')"));
assert.match(real, /functions\.invoke\('notify-attendance-telegram'/);
assert.match(real, /body: \{ eventId: eventId \}/);
assert.match(real, /body: \{ test: true \}/);
assert.match(mock, /notifyAttendanceTelegram/);
assert.match(mock, /testAttendanceTelegram/);

// Edge Function memegang semua pemeriksaan keamanan dan secret server-side.
assert.match(edge, /TELEGRAM_BOT_TOKEN/);
assert.match(edge, /TELEGRAM_CHAT_ID/);
assert.match(edge, /callerClient\.auth\.getUser\(\)/);
assert.match(edge, /body\?\.test === true/);
assert.match(edge, /ownerProfile\?\.bagian !== 'Owner'/);
assert.match(edge, /Uji Notifikasi Hosela Hub/);
assert.match(edge, /findLatestHumanPrivateChat/);
assert.match(edge, /chat\?\.type === 'private'/);
assert.match(edge, /message\?\.from\?\.is_bot !== true/);
assert.match(edge, /CHAT_ID_IS_BOT_NO_UPDATES/);
assert.match(edge, /event\.user_id !== callerData\.user\.id/);
assert.match(edge, /event\.status !== 'DITERIMA'/);
assert.match(edge, /event\.source !== 'CAMERA'/);
assert.match(edge, /\['MASUK', 'PULANG'\]\.includes\(event\.tipe\)/);
assert.match(edge, /api\.telegram\.org\/bot\$\{botToken\}\/sendMessage/);
assert.match(edge, /status: 'SENT'/);

// Deduplikasi dan privasi status integrasi.
assert.match(migration, /event_id uuid primary key references public\.attendance_events/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all .* authenticated/);
assert.match(config, /\[functions\.notify-attendance-telegram\][\s\S]*verify_jwt = false/);

// Token bot tidak boleh pernah di-hardcode di file aktif.
assert.doesNotMatch([app, real, mock, edge, config, migration].join('\n'), /\b\d{8,}:[A-Za-z0-9_-]{20,}/);

console.log('notifikasi Telegram absensi aman, tervalidasi, dan anti-duplikat: ok');
