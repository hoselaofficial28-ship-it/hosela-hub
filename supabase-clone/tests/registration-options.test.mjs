import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appPath = new URL('../app/js/app.js', import.meta.url);
const appSource = fs.readFileSync(appPath, 'utf8');
const start = appSource.indexOf('var DAFTAR_BAGIAN_ORDER');
const end = appSource.indexOf('function setDaftarSelectOptions', start);

assert.notEqual(start, -1, 'konfigurasi bagian pendaftaran harus tersedia');
assert.notEqual(end, -1, 'batas kode opsi pendaftaran harus tersedia');

const context = {};
vm.createContext(context);
vm.runInContext(appSource.slice(start, end), context);

assert.equal(context.DAFTAR_BAGIAN_ORDER.length, 11);
assert.ok(context.DEFAULT_DAFTAR_OPTIONS.Gudang.includes('Admin Packing'));
assert.ok(context.DEFAULT_DAFTAR_OPTIONS['Live Streaming'].includes('Moderator Live'));
assert.ok(context.DEFAULT_DAFTAR_OPTIONS['Content Creator'].includes('Video Editor'));

const merged = context.mergeDaftarOptions({
  Packing: ['Staff Packing'],
  Live: ['Host Live'],
  Ecommerce: ['Admin Ecommerce'],
  Owner: ['Owner'],
  Finance: ['Finance']
});

assert.ok(merged.Gudang.includes('Staff Packing'));
assert.ok(merged['Live Streaming'].includes('Host Live'));
assert.ok(merged['Marketplace & Ecommerce'].includes('Admin Ecommerce'));
assert.equal(merged.Packing, undefined);
assert.equal(merged.Live, undefined);
assert.equal(merged.Ecommerce, undefined);
assert.equal(merged.Owner, undefined);
assert.equal(merged.Finance, undefined);

console.log('registration-options tests: OK');
