import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const appPath = new URL('../app/js/app.js', import.meta.url);
const app = fs.readFileSync(appPath, 'utf8');
const functionSource = app.match(/function formatJamText\(text\) \{[\s\S]*?\n\}/)?.[0];

assert.ok(functionSource, 'Helper formatJamText harus tersedia');

const sandbox = {};
vm.runInNewContext(`${functionSource}; result = [
  formatJamText('Pulang 19:00:00, lembur 1.00000000000000000000 jam'),
  formatJamText('lembur 1.50000000000000000000 jam'),
  formatJamText('lembur 0.16666666666666666667 jam')
];`, sandbox);

assert.deepEqual(
  Array.from(sandbox.result),
  [
    'Pulang 19:00:00, lembur 1 jam',
    'lembur 1,5 jam',
    'lembur 0,17 jam'
  ]
);

assert.match(app, /formatJamText\(cleanDisplayText\(text\)\)/);
console.log('overtime duration format tests passed');
