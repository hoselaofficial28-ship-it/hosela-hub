import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261012000024_owner_content_and_office_settings.sql', import.meta.url), 'utf8');

assert.match(html, /id="jobdesk-owner-panel"/);
assert.match(html, /id="peraturan-owner-panel"/);
assert.match(html, /id="office-setting-card"/);
assert.match(html, /class="content izin-page-content"/);
assert.match(html, /class="content slip-page-content"/);
assert.match(html, /content="width=device-width, initial-scale=1\.0"/);
assert.doesNotMatch(html, /MODE CAMPURAN|demo-mode-banner/);

assert.match(app, /gasCall\('getMyJobdesk'/);
assert.match(app, /gasCall\('saveOwnerJobdesk'/);
assert.match(app, /mergeDaftarOptions\(serverOptions \|\| \{\}\)/);
assert.match(app, /renderOwnerJobdeskList\(res && \(res\.data \|\| res\.items\) \|\| \[\], options\)/);
assert.match(app, /gasCall\('savePeraturan'/);
assert.match(app, /gasCall\('setOfficeSettings'/);
assert.match(app, /var isOwner = currentUser && currentUser\.bagian === 'Owner'/);

for (const handler of ['getMyJobdesk', 'getOwnerJobdesks', 'saveOwnerJobdesk', 'getOfficeSettings', 'setOfficeSettings', 'savePeraturan']) {
  assert.match(backend, new RegExp(handler + ': async function'));
}

for (const fn of ['get_my_jobdesk', 'get_owner_jobdesks', 'upsert_jobdesk_link', 'get_office_settings', 'set_office_settings', 'save_rule']) {
  assert.match(sql, new RegExp('function public\\.' + fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\('));
}
assert.match(sql, /current_bagian\(\).*<> 'owner'/s);
assert.match(css, /\.izin-layout\{display:grid/);
assert.match(css, /\.slip-card-head\{display:flex/);
assert.match(css, /@media \(min-width:900px\)/);
assert.match(css, /#s-jobdesk #jobdesk-list\{[\s\S]*max-width:none/);
assert.match(css, /\.jobdesk-groups-grid\{[\s\S]*display:grid/);

console.log('owner content, office settings, and responsive UI checks passed');
