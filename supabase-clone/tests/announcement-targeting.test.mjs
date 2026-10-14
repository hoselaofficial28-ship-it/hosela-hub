import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261014000025_targeted_announcements.sql', import.meta.url), 'utf8');

assert.match(html, /id="announcement-owner-panel"/);
assert.match(html, /name="peng-target-mode" value="ALL"/);
assert.match(html, /name="peng-target-mode" value="BAGIAN"/);
assert.match(html, /name="peng-target-mode" value="USER"/);
assert.match(html, /id="peng-target-user"/);
assert.doesNotMatch(html, /id="s-tambah-pengumuman"/);
assert.match(html, /class="login-card-shell"/);

assert.match(app, /function loadPengumumanComposer\(\)/);
assert.match(app, /target = 'USER:' \+ document\.getElementById\('peng-target-user'\)\.value/);
assert.match(app, /currentUser && currentUser\.bagian === 'Owner'/);
assert.doesNotMatch(app, /menus\.push\(\{id:'s-tambah-pengumuman'/);
assert.match(backend, /target_bagian,dibuat_oleh,created_at/);
assert.match(backend, /targetBagian: row\.target_bagian/);

assert.match(sql, /target_bagian = 'USER:' \|\| auth\.uid\(\)::text/);
assert.match(sql, /target_bagian = 'Gudang' and public\.current_bagian\(\) = 'Packing'/);
assert.match(sql, /Akun penerima tidak aktif atau tidak ditemukan/);
assert.match(css, /#s-login \.login-card-shell/);
assert.match(css, /\.announcement-target-options/);
assert.match(css, /#pengumuman-list\{display:grid/);

console.log('announcement targeting and compact login tests: OK');
