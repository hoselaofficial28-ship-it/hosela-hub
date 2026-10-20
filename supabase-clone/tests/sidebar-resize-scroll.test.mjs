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
assert.match(css, /\.navbar \.pc-nav-scroll\{[\s\S]*?scrollbar-width:none;[\s\S]*?-ms-overflow-style:none/);
assert.match(css, /\.navbar \.pc-nav-scroll::\-webkit-scrollbar\{[\s\S]*?display:none;[\s\S]*?width:0/);
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
assert.match(app, /function pcReadSidebarScrollTop\(screen\)/);
assert.match(app, /function pcRestoreSidebarScroll\(screen, scrollTop, activeId\)/);
assert.match(app, /var previousSidebarTop = pcReadSidebarScrollTop\(prev\)/);
assert.match(app, /updateDesktopNavActive\(id\);\r?\n pcRestoreSidebarScroll\(el, previousSidebarTop, id\);/);

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

const readScrollSource = app.match(/function pcReadSidebarScrollTop\(screen\) \{[\s\S]*?\n\}/)?.[0];
const restoreScrollSource = app.match(/function pcRestoreSidebarScroll\(screen, scrollTop, activeId\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(readScrollSource && restoreScrollSource, 'fungsi penjaga posisi scroll tersedia');
const activeItem = { offsetTop: 430, offsetHeight: 42 };
const navList = {
  scrollTop: 380,
  clientHeight: 200,
  querySelector() { return activeItem; }
};
const screen = { querySelector() { return navList; } };
const navSandbox = { Math };
vm.createContext(navSandbox);
vm.runInContext(`${readScrollSource}; ${restoreScrollSource}; this.readTop = pcReadSidebarScrollTop; this.restoreTop = pcRestoreSidebarScroll;`, navSandbox);
assert.equal(navSandbox.readTop(screen), 380);
navSandbox.restoreTop(screen, 380, 's-manage-users');
assert.equal(navList.scrollTop, 380, 'menu yang masih terlihat tidak boleh mengubah posisi sidebar');

activeItem.offsetTop = 620;
navSandbox.restoreTop(screen, 380, 's-manage-users');
assert.equal(navList.scrollTop, 470, 'menu di luar viewport digeser secukupnya agar terlihat');

console.log('sidebar desktop scroll + resize: ok');
