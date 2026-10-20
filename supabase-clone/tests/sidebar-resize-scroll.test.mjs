import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const css = fs.readFileSync(new URL('../app/css/style.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');

// Sidebar harus benar-benar dibatasi setinggi viewport. Scroll ditempatkan pada
// daftar menu, bukan pada seluruh kartu, sehingga logo tidak ikut menghilang.
assert.match(css, /\.navbar\.pc-nav-full\{[\s\S]*?height:calc\(100dvh - 26px\)!important;[\s\S]*?min-height:0!important;[\s\S]*?overflow:hidden!important/);
assert.match(css, /\.screen\.active>\.navbar\.pc-nav-full\{[\s\S]*?width:var\(--pc-sidebar-width\)!important/);
assert.match(css, /\.navbar \.pc-nav-scroll\{[\s\S]*?min-height:0;[\s\S]*?overflow-y:auto;[\s\S]*?overscroll-behavior:contain/);
assert.match(css, /\.pc-sidebar-resizer\{[\s\S]*?cursor:col-resize;[\s\S]*?touch-action:none/);

// Lebar sidebar mengubah kartu dan track grid secara bersamaan, disimpan lokal,
// dan tetap bisa diatur tanpa mouse melalui keyboard.
assert.match(app, /var PC_SIDEBAR_WIDTH_KEY = 'hh_pc_sidebar_width'/);
assert.match(app, /setProperty\('--pc-sidebar-width', width \+ 'px'\)/);
assert.match(app, /setProperty\('--pc-sidebar-track', \(width \+ 38\) \+ 'px'\)/);
assert.match(app, /handle\.addEventListener\('pointerdown'/);
assert.match(app, /event\.key === 'ArrowLeft'/);
assert.match(app, /event\.key === 'ArrowRight'/);
assert.match(app, /handle\.addEventListener\('dblclick'/);
assert.match(app, /k !== 'hh_pc_sidebar_width'/);

const clampSource = app.match(/function pcClampSidebarWidth\(value, maxWidth\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(clampSource, 'fungsi pembatas lebar sidebar tersedia');
const sandbox = { PC_SIDEBAR_DEFAULT_WIDTH: 256, PC_SIDEBAR_MIN_WIDTH: 228, isFinite };
vm.createContext(sandbox);
vm.runInContext(`${clampSource}; this.clamp = pcClampSidebarWidth;`, sandbox);
assert.equal(sandbox.clamp(100, 380), 228);
assert.equal(sandbox.clamp(999, 380), 380);
assert.equal(sandbox.clamp(312, 380), 312);
assert.equal(sandbox.clamp(null, 380), 256);
assert.equal(sandbox.clamp('', 380), 256);

console.log('sidebar desktop scroll + resize: ok');
