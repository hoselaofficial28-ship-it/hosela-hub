import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');

assert.match(app, /host === 'localhost' \|\| host === '127\.0\.0\.1'/);
assert.match(app, /if \(!localDemo\)[\s\S]*belum tersambung ke layanan produksi/);
assert.match(app, /window\.mockBackend/);

console.log('production-no-mock-fallback.test.mjs: OK');
