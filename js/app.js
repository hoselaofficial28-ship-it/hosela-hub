var GAS_URL = 'https://script.google.com/macros/s/AKfycbxDAHTGFbjG2RMjIPqUmdLbPO3TqKFfpPuEw9p5sdc4tEJXy6zsyyzhQ6pO65Pben4ywQ/exec';
var APP_VERSION = '20260524c';
var currentUser = null;
var currentBagian = null;
var pinBuffer = '';
var AVT_BG = ['#dbeafe','#d1fae5','#fef3c7','#ede9fe','#fce7f3','#fee2e2'];
var AVT_TXT = ['#1d4ed8','#065f46','#92400e','#5b21b6','#9d174d','#991b1b'];

var ICONS = {
 home:'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5z',
 clipboard:'M9 4h6l1 2h3v15H5V6h3l1-2zm0 5h6M9 13h6M9 17h4',
 megaphone:'M4 13h3l10 4V7L7 11H4v2zm3 0v5',
 idea:'M9 18h6M10 21h4M8 10a4 4 0 118 0c0 2-2 3-2 5h-4c0-2-2-3-2-5z',
 trophy:'M8 4h8v3a4 4 0 01-8 0V4zm0 1H4v2a4 4 0 004 4m8-6h4v2a4 4 0 01-4 4M12 15v4m-4 2h8',
 file:'M6 3h9l3 3v15H6V3zm9 0v4h4M9 12h6M9 16h6',
 bell:'M6 17h12l-1.5-2V10a4.5 4.5 0 00-9 0v5L6 17zm4 2a2 2 0 004 0',
 edit:'M4 20h4L19 9l-4-4L4 16v4zm11-15l4 4',
 receipt:'M6 3l2 1.5L10 3l2 1.5L14 3l2 1.5L18 3v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3zm3 6h6M9 13h6M9 17h4',
 calendar:'M7 3v4m10-4v4M4 8h16M5 5h14v16H5V5z',
 upload:'M12 16V5m-4 4l4-4 4 4M5 19h14',
 check:'M5 12l4 4L19 6',
 scale:'M12 3v18M6 7h12M6 7l-3 6h6L6 7zm12 0l-3 6h6l-3-6z',
 chart:'M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7',
 users:'M8 11a4 4 0 100-8 4 4 0 000 8zm8 2a3 3 0 100-6m-14 13a6 6 0 0112 0m2 0a5 5 0 00-3-4',
 card:'M3 6h18v12H3V6zm0 4h18M7 15h4',
 package:'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
 cart:'M6 6h15l-2 8H8L6 3H3m6 17h.01M18 20h.01',
 target:'M12 21a9 9 0 100-18 9 9 0 000 18zm0-4a5 5 0 100-10 5 5 0 000 10zm0-2a3 3 0 100-6 3 3 0 000 6z',
 camera:'M4 8h3l2-3h6l2 3h3v11H4V8zm8 8a4 4 0 100-8 4 4 0 000 8z',
 money:'M4 7h16v10H4V7zm4 5h.01M16 12h.01M12 15a3 3 0 100-6 3 3 0 000 6z',
 lock:'M7 10V7a5 5 0 0110 0v3M6 10h12v11H6V10z',
 book:'M5 4h11a3 3 0 013 3v13H8a3 3 0 00-3 3V4zm0 0v19',
 mail:'M4 6h16v12H4V6zm0 1l8 6 8-6',
 logout:'M10 17l5-5-5-5m5 5H3m8 8h8V4h-8',
 alert:'M12 3l10 18H2L12 3zm0 6v5m0 3h.01',
 user:'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
 building:'M4 21V7l8-4 8 4v14M8 21v-8h8v8M8 9h.01M12 9h.01M16 9h.01',
 trash:'M4 7h16M9 7V4h6v3m-8 0l1 14h8l1-14',
 doc:'M6 3h9l3 3v15H6V3zm9 0v4h4',
 refresh:'M20 6v6h-6M4 18v-6h6M19 12a7 7 0 00-12-5M5 12a7 7 0 0012 5'
};

function uiIcon(name, cls) {
 var path = ICONS[name] || ICONS.file;
 return '<svg class="svg-icon '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"></path></svg>';
}

// Cache sistem — simpan data di memori supaya tidak fetch ulang
var _cache = {};
var _cacheExpiry = {};
var CACHE_TTL = 5 * 60 * 1000;
var CACHE_PREFIX = 'hh_cache_';
var _prefetchStarted = false;
var CAMERA_UNMIRROR = true;
var SESSION_TTL = 10 * 24 * 60 * 60 * 1000;
var _sideMenuOpen = false;
var _deferredInstallPrompt = null;
var _homeCategoryOpen = false;
var _lastHomeBackAt = 0;
var _allowAppExit = false;
var _homeLoaded = false;
var _homeLoadedUserId = '';
var HOME_EXIT_TOAST = 'Tekan kembali sekali lagi untuk keluar dari Hosela Hub.';

function ensureFreshRuntime() {
 try {
 if (location.search.indexOf('reset=1') !== -1) {
 var resetDone = Promise.resolve();
 try { localStorage.clear(); } catch(e) {}
 if (window.caches && caches.keys) {
 resetDone = resetDone.then(function(){ return caches.keys().then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); }); });
 }
 if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
 resetDone = resetDone.then(function(){ return navigator.serviceWorker.getRegistrations().then(function(regs) { return Promise.all(regs.map(function(r) { return r.unregister(); })); }); });
 }
 resetDone.finally(function() {
 location.replace(location.pathname + '?v=' + APP_VERSION + '&clean=' + Date.now());
 });
 return;
 }
 var key = 'hh_app_version';
 var current = localStorage.getItem(key);
 if (current === APP_VERSION) return;
 localStorage.setItem(key, APP_VERSION);
 Object.keys(localStorage).forEach(function(k) {
 if (k.indexOf('hh_') === 0 && k !== key && k !== 'hh_username' && k !== 'hh_session') localStorage.removeItem(k);
 });
 if (window.caches && caches.keys) {
 caches.keys().then(function(keys) { keys.forEach(function(k) { caches.delete(k); }); });
 }
 if (location.hostname.indexOf('github.io') !== -1 && location.search.indexOf('v=' + APP_VERSION) === -1) {
 location.replace(location.pathname + '?v=' + APP_VERSION + '&t=' + Date.now());
 }
 } catch(e) {}
}
ensureFreshRuntime();

window.addEventListener('error', function(e) {
 console.error('App runtime error:', e.error || e.message);
 var loading = document.getElementById('loading');
 if (loading) loading.style.display = 'none';
 var active = document.querySelector('.screen.active');
 if (!active) {
 var login = document.getElementById('s-login');
 if (login) login.classList.add('active');
 }
 try { showToast('Terjadi error tampilan. Coba buka ulang menu.'); } catch(err) {}
});

function cacheGet(key) {
 if (_cache[key] && _cacheExpiry[key] > Date.now()) return _cache[key];
 try {
 var raw = localStorage.getItem(CACHE_PREFIX + key);
 if (!raw) return null;
 var parsed = JSON.parse(raw);
 if (!parsed || !parsed.expires || parsed.expires <= Date.now()) {
 localStorage.removeItem(CACHE_PREFIX + key);
 return null;
 }
 _cache[key] = parsed.value;
 _cacheExpiry[key] = parsed.expires;
 return parsed.value;
 } catch(e) {}
 return null;
}
function cacheSet(key, val, ttl) {
 var expires = Date.now() + (ttl || CACHE_TTL);
 _cache[key] = val;
 _cacheExpiry[key] = expires;
 try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ value: val, expires: expires })); } catch(e) {}
}
function cacheClear(key) {
 delete _cache[key];
 delete _cacheExpiry[key];
 try { localStorage.removeItem(CACHE_PREFIX + key); } catch(e) {}
}
function cacheClearAction(action) {
 var prefix = action + '[';
 Object.keys(_cache).forEach(function(key) {
  if (key === action || key.indexOf(prefix) === 0) cacheClear(key);
 });
 try {
  Object.keys(localStorage).forEach(function(storageKey) {
   if (storageKey.indexOf(CACHE_PREFIX + prefix) === 0 || storageKey === CACHE_PREFIX + action) {
    localStorage.removeItem(storageKey);
   }
  });
 } catch(e) {}
}

function saveLoginSession(user, username) {
 try {
 localStorage.setItem('hh_session', JSON.stringify({
 user: user,
 username: username,
 createdAt: Date.now(),
 expiresAt: Date.now() + SESSION_TTL
 }));
 } catch(e) {}
}

function getLoginSession() {
 try {
 var raw = localStorage.getItem('hh_session');
 if (!raw) return null;
 var s = JSON.parse(raw);
 if (!s || !s.user || !s.expiresAt || Date.now() > s.expiresAt) {
 localStorage.removeItem('hh_session');
 return null;
 }
 return s;
 } catch(e) {
 localStorage.removeItem('hh_session');
 return null;
 }
}

function clearLoginSession() {
 localStorage.removeItem('hh_session');
}

// Actions yang boleh di-cache (read-only)
var CACHEABLE = [
 'getHomeData','getJobdeskList','getStaffByBagian','getJobdeskByBagian','getJobdeskByJabatan',
 'getUserKPI','getKalenderLibur','getAllUsers','getPengumuman','getIde','getAbsensiRekap',
 'getRekapBulananSemua','getPayrollPreview','getPapanPeringkat','getPeraturan','getKPILaporan',
 'getNotifikasi','getIzinKaryawan','getIzinPendingCount','getSanksiManual','getPayrollEmployeeSlip',
 'getAbsensiMatrix','getAbsensiMatrixUser','getAllAbsensiRekap','getKPITemplate','getIzinPending',
 'getAnomaliPending','getPengaturan','getAbsensiCameraToday','getPayrollDetail',
 'getPayrollEmployeeSlipDetail'
];

var CACHE_TTL_BY_ACTION = {
 getHomeData: 2 * 60 * 1000,
 getNotifikasi: 60 * 1000,
 getIzinKaryawan: 2 * 60 * 1000,
 getIzinPendingCount: 60 * 1000,
 getIzinPending: 60 * 1000,
 getAnomaliPending: 60 * 1000,
 getAbsensiCameraToday: 45 * 1000,
 getAbsensiMatrix: 2 * 60 * 1000,
 getAbsensiMatrixUser: 2 * 60 * 1000,
 getAbsensiRekap: 10 * 60 * 1000,
 getRekapBulananSemua: 10 * 60 * 1000,
 getAllAbsensiRekap: 5 * 60 * 1000,
 getAllUsers: 15 * 60 * 1000,
 getJobdeskList: 30 * 60 * 1000,
 getStaffByBagian: 15 * 60 * 1000,
 getJobdeskByBagian: 30 * 60 * 1000,
 getJobdeskByJabatan: 30 * 60 * 1000,
 getPengumuman: 5 * 60 * 1000,
 getIde: 5 * 60 * 1000,
 getKalenderLibur: 30 * 60 * 1000,
 getPeraturan: 30 * 60 * 1000,
 getPengaturan: 30 * 60 * 1000,
 getKPITemplate: 30 * 60 * 1000,
 getKPILaporan: 5 * 60 * 1000,
 getPapanPeringkat: 10 * 60 * 1000,
 getSanksiManual: 2 * 60 * 1000,
 getPayrollPreview: 5 * 60 * 1000,
 getPayrollDetail: 5 * 60 * 1000,
 getPayrollEmployeeSlip: 5 * 60 * 1000,
 getPayrollEmployeeSlipDetail: 5 * 60 * 1000
};

function cacheTtlForAction(action) {
 return CACHE_TTL_BY_ACTION[action] || CACHE_TTL;
}

function invalidateReadCacheAfterMutation(action) {
 var affected = {
  addPengumuman: ['getHomeData','getPengumuman'],
  addIde: ['getIde'],
  addLibur: ['getKalenderLibur','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  nonaktifkanUser: ['getAllUsers','getStaffByBagian','getRekapBulananSemua'],
  submitKPILaporan: ['getKPILaporan','getPapanPeringkat','getHomeData'],
  submitIzin: ['getIzinKaryawan','getIzinPending','getIzinPendingCount','getHomeData','getNotifikasi'],
  approveIzin: ['getIzinKaryawan','getIzinPending','getIzinPendingCount','getAbsensiRekap','getRekapBulananSemua','getHomeData','getNotifikasi'],
  konfirmasiAnomali: ['getAnomaliPending','getAbsensiMatrix','getAbsensiMatrixUser','getAbsensiRekap','getRekapBulananSemua','getHomeData','getNotifikasi'],
  addSanksiManual: ['getSanksiManual','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  batalSanksiManual: ['getSanksiManual','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  gantiPIN: ['getHomeData'],
  updateEmail: ['getHomeData','getAllUsers'],
  hapusNotifikasi: ['getNotifikasi','getHomeData'],
  hapusSemuaNotifikasi: ['getNotifikasi','getHomeData'],
  tandaiDibaca: ['getNotifikasi','getHomeData'],
  tandaiMenuDibaca: ['getNotifikasi','getHomeData'],
  submitAbsensiCamera: ['getAbsensiCameraToday','getAbsensiMatrix','getAbsensiMatrixUser','getHomeData'],
  updateAbsensiMatrixDay: ['getAbsensiMatrix','getAbsensiMatrixUser','getAbsensiRekap','getRekapBulananSemua','getAllAbsensiRekap','getHomeData','getPayrollPreview'],
  importAbsensiUploadToApp: ['getAbsensiMatrix','getAbsensiMatrixUser'],
  processAttendanceAppRecap: ['getAbsensiMatrix','getAbsensiMatrixUser','getAbsensiRekap','getRekapBulananSemua','getAllAbsensiRekap','getHomeData','getPayrollPreview'],
  processAbsensiUpload: ['getAbsensiRekap','getRekapBulananSemua','getAllAbsensiRekap','getHomeData','getPayrollPreview']
 };
 (affected[action] || []).forEach(cacheClearAction);
}

function gasJsonp(action, args, success, failure) {
 var cbName = 'hh_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
 var script = document.createElement('script');
 var done = false;
 var cleanup = function() {
 done = true;
 if (script.parentNode) script.parentNode.removeChild(script);
 try { delete window[cbName]; } catch(e) { window[cbName] = undefined; }
 };
 window[cbName] = function(data) {
 cleanup();
 if (success) success(data);
 };
 script.onerror = function() {
 cleanup();
 if (failure) failure(new Error('JSONP request failed'));
 };
 var ts = CACHEABLE.indexOf(action) !== -1 ? '' : '&_t=' + Date.now();
 script.src = GAS_URL + '?action=' + encodeURIComponent(action) +
 '&args=' + encodeURIComponent(JSON.stringify(args || [])) +
 '&callback=' + encodeURIComponent(cbName) + ts;
 document.head.appendChild(script);
 setTimeout(function() {
 if (!done) {
 cleanup();
 if (failure) failure(new Error('JSONP timeout'));
 }
 }, 20000);
}

function gasFetchGet(action, args, success, failure) {
 var ts = CACHEABLE.indexOf(action) !== -1 ? '' : '&_t=' + Date.now();
 var url = GAS_URL + '?action=' + encodeURIComponent(action) + '&args=' + encodeURIComponent(JSON.stringify(args || [])) + ts;
 fetch(url, { redirect: 'follow', cache: 'no-store' })
 .then(function(r) {
 return r.text().then(function(text) {
 if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + text.slice(0, 160));
 try {
 return JSON.parse(text);
 } catch(e) {
 throw new Error('Response GAS bukan JSON: ' + text.slice(0, 160));
 }
 });
 })
 .then(function(data) {
 if (success) success(data);
 })
 .catch(function(err) {
 if (failure) failure(err);
 });
}

function gasFormPost(action, args, success, failure) {
 var iframeName = 'hh_post_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
 var iframe = document.createElement('iframe');
 var form = document.createElement('form');
 var finished = false;

 function addField(name, value) {
 var input = document.createElement('input');
 input.type = 'hidden';
 input.name = name;
 input.value = value;
 form.appendChild(input);
 }
 function cleanup() {
 setTimeout(function() {
 if (form.parentNode) form.parentNode.removeChild(form);
 if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
 }, 800);
 }
 function verifyAttendance(attempt) {
 if (finished) return;
 attempt = attempt || 1;
 gasFetchGet('getAbsensiCameraToday', [args && args[0]], function(res) {
 var latest = res && res.data && res.data[0];
 if (!latest) {
 if (attempt < 4) {
 setTimeout(function() { verifyAttendance(attempt + 1); }, 600);
 return;
 }
 finished = true;
 cleanup();
 if (failure) failure(new Error('Absensi belum tercatat'));
 return;
 }
 finished = true;
 cleanup();
 if (success) success({
 success: latest.status === 'DITERIMA',
 status: latest.status,
 distance: latest.distance || latest.jarak || 0,
 radius: latest.radius || 0,
 msg: latest.catatan || (latest.status === 'DITERIMA' ? 'Absensi diterima' : 'Absensi ditolak')
 });
 }, function(err) {
 if (attempt < 4) {
 setTimeout(function() { verifyAttendance(attempt + 1); }, 600);
 return;
 }
 finished = true;
 cleanup();
 if (failure) failure(err);
 });
 }

 iframe.name = iframeName;
 iframe.style.display = 'none';
 form.method = 'POST';
 form.action = GAS_URL;
 form.target = iframeName;
 form.style.display = 'none';
 addField('action', action);
 addField('args', JSON.stringify(args || []));
 document.body.appendChild(iframe);
 document.body.appendChild(form);
 iframe.onload = function() { setTimeout(function() { verifyAttendance(1); }, 2500); };
 form.submit();
 setTimeout(function() { verifyAttendance(1); }, 700);
 setTimeout(function() {
 if (finished) return;
 finished = true;
 cleanup();
 if (success) success({ success: true, status: 'TERKIRIM', distance: 0, msg: 'Absensi dikirim. Status akan tersinkron otomatis.' });
 }, 3500);
}

function gasCall(action, args, success, failure) {
 function retryableFailure(err, attempt, run) {
 if (attempt < 3) {
 setTimeout(function(){ run(attempt + 1); }, attempt * 900);
 return true;
 }
 if (failure) failure(err);
 return true;
 }
 var cacheKey = action + JSON.stringify(args || []);
 function finishSuccess(data) {
  if (CACHEABLE.indexOf(action) !== -1) cacheSet(cacheKey, data, cacheTtlForAction(action));
  else invalidateReadCacheAfterMutation(action);
  if (success) success(data);
 }
 // Cek cache dulu
 if (CACHEABLE.indexOf(action) !== -1) {
 var cached = cacheGet(cacheKey);
 if (cached) { if (success) success(cached); return; }
 }
 if (window.google && google.script && google.script.run) {
 var runner = google.script.run
 .withSuccessHandler(function(data) {
 finishSuccess(data);
 })
 .withFailureHandler(failure || function(e){ console.error('GAS Error:', e); });
 if (typeof runner.handleClientAPI === 'function') {
 runner.handleClientAPI(action, args || []);
 } else if (typeof runner[action] === 'function') {
 runner[action].apply(runner, args || []);
 } else {
 var err = new Error('GAS function not available: ' + action);
 if (failure) failure(err);
 else console.error(err);
 }
 return;
 }
 if (location.hostname.indexOf('github.io') !== -1) {
 if (action === 'submitAbsensiCamera') {
 gasFormPost(action, args, finishSuccess, failure || function(err){ console.error('GAS Error:', err); });
 return;
 }
 var runFetch = function(attempt) {
 gasFetchGet(action, args, function(data) {
 finishSuccess(data);
 }, function(err) {
 if ((attempt || 1) < 2) {
 setTimeout(function(){ runFetch((attempt || 1) + 1); }, 700);
 return;
 }
 console.warn('Fetch GAS gagal, mencoba JSONP:', err);
 runJsonp(1);
 });
 };
 var runJsonp = function(attempt) {
 gasJsonp(action, args, function(data) {
 finishSuccess(data);
 }, function(err) {
 retryableFailure(err, attempt || 1, runJsonp);
 });
 };
 runFetch(1);
 return;
 }
 // Tambah timestamp untuk bust browser cache pada action non-cacheable
 gasFetchGet(action, args, function(data) {
 finishSuccess(data);
 }, function(e) {
 console.warn('Fetch GAS gagal, mencoba JSONP:', e);
 gasJsonp(action, args, function(data) {
 finishSuccess(data);
 }, failure || function(err){ console.error('GAS Error:', err); });
 });
}

// Warm up GAS saat app dibuka — ping dulu supaya tidak cold start saat login
function prefetchCommonData() {
 if (_prefetchStarted || !currentUser) return;
 _prefetchStarted = true;
 var u = currentUser;
 var now = new Date();
 var bulanKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
 var jobs = [
 ['getPengumuman', [u.bagian]],
 ['getJobdeskList', []],
 ['getPeraturan', []],
 ['getPapanPeringkat', []],
 ['getNotifikasi', [u.id]],
 ['getAbsensiRekap', [u.id]]
 ];
 if (u.bagian !== 'Owner' && u.bagian !== 'Finance') {
 jobs.push(['getIzinKaryawan', [u.id]]);
 jobs.push(['getAbsensiMatrixUser', [u.id, bulanKey]]);
 jobs.push(['getPayrollEmployeeSlip', [u.id]]);
 }
 if (u.bagian === 'Owner' || u.bagian === 'Finance') {
 jobs.push(['getKalenderLibur', []]);
 jobs.push(['getIzinPendingCount', []]);
 jobs.push(['getRekapBulananSemua', [bulanKey]]);
 jobs.push(['getPayrollPreview', [bulanKey]]);
 jobs.push(['getAbsensiMatrix', [bulanKey]]);
 }
 jobs.forEach(function(job, idx) {
 setTimeout(function() { gasCall(job[0], job[1], function(){}, function(){}); }, 650 + idx * 220);
 });
}

function warmUpGAS() {
 if (window.google && google.script && google.script.run) {
 gasCall('ping', [], function(){}, function(){});
 return;
 }
 if (location.hostname.indexOf('github.io') !== -1) {
 gasJsonp('ping', [], function(){}, function(){});
 return;
 }
 fetch(GAS_URL + '?action=ping&args=[]', { redirect: 'follow' }).catch(function(){ gasJsonp('ping', [], function(){}, function(){}); });
}

function setupPWAInstall() {
 if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
 navigator.serviceWorker.register('sw.js?v=' + APP_VERSION).catch(function(err){ console.warn('Service worker gagal:', err); });
 }
 window.addEventListener('beforeinstallprompt', function(e) {
 e.preventDefault();
 _deferredInstallPrompt = e;
 var row = document.getElementById('install-app-row');
 if (row) row.style.display = 'flex';
 });
}

function installApp() {
 if (!_deferredInstallPrompt) {
 showToast('Gunakan menu browser lalu pilih Install app / Tambahkan ke layar utama');
 return;
 }
 _deferredInstallPrompt.prompt();
 _deferredInstallPrompt.userChoice.finally(function() {
 _deferredInstallPrompt = null;
 var row = document.getElementById('install-app-row');
 if (row) row.style.display = 'none';
 });
}

// Navigation history stack untuk swipe back
var _navHistory = [];

function activeScreenId() {
 var active = document.querySelector('.screen.active');
 return active ? active.id : '';
}

function ensureHomeBackGuard() {
 if (activeScreenId() !== 's-home') return;
 try {
 var state = history.state || {};
 if (state.appGuard) return;
 history.replaceState({ screen: 's-home', homeBase: true }, '', '#home');
 history.pushState({ screen: 's-home', appGuard: true }, '', '#home');
 } catch(e) {}
}

function goTo(id) {
  var prev = document.querySelector('.screen.active');
  var prevId = prev ? prev.id : null;
  if (prevId === 's-absensi-camera' && id !== 's-absensi-camera') stopAttendanceCamera();
  if (id !== 's-home') _homeCategoryOpen = false;
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
 var el = document.getElementById(id);
 if (!el) return;
 el.classList.add('active');
 var c = el.querySelector('.content');
 if (c) c.scrollTop = 0;
 if (prevId && prevId !== id) {
 var skipHistoryPush = false;
 if (id === 's-home' && (prevId === 's-login' || prevId === 's-force-pin')) {
 _navHistory = [];
 skipHistoryPush = true;
 } else if (prevId === 's-login' || prevId === 's-force-pin') {
 _navHistory = [];
 skipHistoryPush = true;
 }
 if (!skipHistoryPush && _navHistory[_navHistory.length - 1] !== prevId) _navHistory.push(prevId);
 history.pushState({ screen: id }, '', '#' + id);
 }
 // Hapus badge menu yang dibuka + tandai notif menu tsb sebagai dibaca
 if (currentUser && id !== 's-home') {
 document.querySelectorAll('.menu-card').forEach(function(card) {
 var onclick = card.getAttribute('onclick') || '';
 if (onclick.includes("'"+id+"'")) {
 var badge = card.querySelector('.menu-badge');
 if (badge) badge.remove();
 }
 });
 if (id !== 's-notifikasi') {
 gasCall('tandaiMenuDibaca', [currentUser.id, id], function(){});
 }
 }
 try {
 if (id === 's-pengumuman') loadPengumuman();
 if (id === 's-ide') loadIde();
 if (id === 's-jobdesk') loadJobdeskList();
 if (id === 's-kalender') loadKalender();
 if (id === 's-manage-users') loadUsers();
 if (id === 's-laporan-absensi') loadLaporanAbsensi();
 if (id === 's-peraturan') loadPeraturan();
 if (id === 's-kpi-check') loadKPICheck();
 if (id === 's-papan-peringkat') loadPapanPeringkat();
 if (id === 's-notifikasi') loadNotifikasi();
 if (id === 's-izin') loadIzin();
 if (id === 's-absensi-camera') loadAbsensiCamera();
 if (id === 's-sanksi-manual') loadSanksiManual();
 if (id === 's-rekap-bulanan') loadRekapBulanan();
 if (id === 's-catatan-kehadiran') loadAttendanceMatrix();
 if (id === 's-payroll') loadPayroll();
 if (id === 's-slip-gaji') loadSlipGaji();
 if (id === 's-kelola-izin') { loadKelolaIzin(); }
 if (id === 's-home') loadHome();
 } catch(routeErr) {
 console.error('Route error:', id, routeErr);
 showToast('Menu gagal dibuka. Coba lagi.');
 }
 if (id === 's-home') setTimeout(ensureHomeBackGuard, 50);
}

// Handle browser back button / swipe back
window.addEventListener('popstate', function(e) {
 if (_allowAppExit) return;
 if (_sideMenuOpen) {
 closeSideMenu(true);
 setTimeout(ensureHomeBackGuard, 20);
 return;
 }
 if (_homeCategoryOpen) {
 closeHomeCategory(true);
 setTimeout(ensureHomeBackGuard, 20);
 return;
 }
 var activeId = activeScreenId();
 if (activeId === 's-home') {
 var now = Date.now();
 if (now - _lastHomeBackAt < 2200) {
 _lastHomeBackAt = 0;
 _allowAppExit = true;
 setTimeout(function(){ history.back(); }, 0);
 return;
 }
 _lastHomeBackAt = now;
 showToast(HOME_EXIT_TOAST);
 ensureHomeBackGuard();
 return;
 }
 if (_navHistory.length > 0) {
 var prev = _navHistory.pop();
 document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
 var el = document.getElementById(prev);
 if (el) el.classList.add('active');
 } else {
 // Tidak ada history — push state lagi supaya tidak keluar app
 try { history.pushState({ screen: activeId || 's-home', appGuard: true }, '', location.href); } catch(err) {}
 }
});

// Deteksi touch device untuk preview button
var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function showPinLoading(loading) {
 var spinner = document.getElementById('pin-spinner');
 var btn = document.getElementById('login-btn');
 if (spinner) spinner.style.display = loading ? 'flex' : 'none';
 if (btn) { btn.textContent = loading ? 'Memverifikasi...' : 'Masuk'; btn.disabled = loading; }
}

function gantiAkun() {
 localStorage.removeItem('hh_username');
 clearLoginSession();
 _prefetchStarted = false;
 _homeLoaded = false;
 _homeLoadedUserId = '';
 document.getElementById('login-username').value = '';
 document.getElementById('username-group').style.display = 'block';
 document.getElementById('login-username').focus();
}

function doLogin() {
 var username = document.getElementById('login-username').value.trim();
 var password = document.getElementById('login-password').value;
 var errEl = document.getElementById('pin-error');
 if (!username) { errEl.textContent = 'Nama pengguna tidak boleh kosong'; return; }
 if (!password) { errEl.textContent = 'Kata sandi tidak boleh kosong'; return; }
 errEl.textContent = '';
 showPinLoading(true);
 gasCall('validateLogin', [username, password], function(r) {
 showPinLoading(false);
 if (r.success) {
 currentUser = r.user;
 // Simpan username di localStorage supaya tidak perlu ketik lagi
 localStorage.setItem('hh_username', username);
 document.getElementById('login-password').value = '';
 if (r.isDefaultPassword) {
 document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
 document.getElementById('s-paksa-ganti-pin').classList.add('active');
 return;
 }
 saveLoginSession(r.user, username);
 _navHistory = [];
 history.replaceState({ screen: 's-home' }, '', '#home');
 goTo('s-home');
 } else {
 errEl.textContent = 'Nama pengguna atau kata sandi salah.';
 document.getElementById('login-password').value = '';
 }
 }, function() {
 showPinLoading(false);
 document.getElementById('pin-error').textContent = 'Koneksi gagal. Coba lagi.';
 });
}

function loadHome(forceRefresh) {
 var u = currentUser;
 if (!u) return;
 if (!forceRefresh && _homeLoaded && _homeLoadedUserId === u.id) {
 startHomeClock();
 return;
 }
 _homeLoaded = true;
 _homeLoadedUserId = u.id;
 // GAS CacheService mengelola cache server-side — tidak perlu bust dari frontend

 // Kata-kata semangat rotasi harian
 var quotes = [
 'Kerja keras hari ini adalah fondasi sukses hari esok.',
 'Setiap paket yang dikirim adalah bukti kerja kerasmu.',
 'Tim yang solid dimulai dari dirimu sendiri.',
 'Fokus, konsisten, dan hasil terbaik akan mengikuti.',
 'Hari baru, semangat baru. Yuk tunjukkan yang terbaik!',
 'Keberhasilan tim adalah keberhasilan kita bersama.',
 'Kerjakan dengan hati, hasilnya pasti luar biasa.',
 'Setiap langkah kecilmu membawa Hosela makin maju.',
 'Pelanggan puas dimulai dari kamu yang bekerja sungguh-sungguh.',
 'Jadilah yang terbaik di posisimu hari ini.',
 'Semangat pagi! Mari berikan yang terbaik untuk tim.',
 'Konsistensi kecil setiap hari menghasilkan perubahan besar.',
 'Tugasmu hari ini adalah investasi terbaik untuk masa depanmu.',
 'Satu pekerjaan selesai dengan baik lebih berharga dari seribu rencana.',
 'Kamu adalah bagian penting dari kesuksesan Hosela.',
 'Lakukan yang terbaik hari ini, biarkan hasil berbicara sendiri.',
 'Semangat yang kamu bawa hari ini menular ke seluruh tim.',
 'Tidak ada kerja keras yang sia-sia, semuanya akan terbayar.',
 'Bangga dengan pekerjaanmu, karena kamu yang membuatnya berarti.',
 'Bersama kita bisa, bersama kita maju. Selamat bekerja!',
 ];
 var today = new Date();
 var dayIndex = today.getFullYear() * 365 + today.getMonth() * 31 + today.getDate();
 var quote = quotes[dayIndex % quotes.length];

 document.getElementById('home-name').textContent = u.nama;

 // Jabatan badge
 var jabatanConfig = {
 'Owner': { cls:'jab-owner', icon:'user' },
 'Finance': { cls:'jab-finance', icon:'card' },
 'Kepala Gudang': { cls:'jab-kepala', icon:'building' },
 'Admin Ecommerce': { cls:'jab-ecommerce',icon:'cart' },
 'Host Live': { cls:'jab-live', icon:'target' },
 'Admin Packing': { cls:'jab-packing', icon:'package' },
 };
 var jabConf = jabatanConfig[u.jabatan] || { cls:'jab-packing', icon:'user' };
 document.getElementById('home-jabatan-badge').innerHTML =
 '<span class="jabatan-badge '+jabConf.cls+'">'+uiIcon(jabConf.icon)+' '+u.jabatan.toUpperCase()+'</span>';

 // Quote motivasi
 document.getElementById('home-quote').textContent = '"'+quote+'"';
 startHomeClock();

 var menus = [
 {id:'s-jobdesk', icon:'clipboard', bg:'#dbeafe', label:'Jobdesk', sub:'Tugas & tanggung jawab'},
 {id:'s-pengumuman', icon:'megaphone', bg:'#fef3c7', label:'Pengumuman', sub:'Info dari owner'},
 {id:'s-ide', icon:'idea', bg:'#d1fae5', label:'Ide Tim', sub:'Sampaikan idemu'},
 {id:'s-papan-peringkat', icon:'trophy', bg:'#fef3c7', label:'Papan Peringkat', sub:'Kinerja tim'},
 {id:'s-peraturan', icon:'file', bg:'#ede9fe', label:'Peraturan', sub:'Tata tertib kantor'},
 ];
 menus.push({id:'s-notifikasi', icon:'bell', bg:'#fee2e2', label:'Notifikasi', sub:'Peringatan & info'});
 menus.push({id:'s-absensi-camera', icon:'camera', bg:'#e8f0ff', label:'Absensi Kamera', sub:'Foto & lokasi kantor'});
 menus.push({id:'s-catatan-kehadiran', icon:'calendar', bg:'#e8f0ff', label:'Catatan Kehadiran', sub:'Riwayat masuk & pulang'});
 menus.push({id:'s-izin', icon:'edit', bg:'#d1fae5', label:'Izin / Sakit', sub:'Ajukan ketidakhadiran'});
 menus.push({id:'s-slip-gaji', icon:'receipt', bg:'#e0f2fe', label:'Slip Gaji', sub:'Riwayat gaji kamu'});
 if (u.bagian === 'Owner' || u.bagian === 'Finance')
 menus.push({id:'s-kalender', icon:'calendar', bg:'#fee2e2', label:'Kalender Libur', sub:'Atur hari libur'});
 if (u.bagian === 'Finance') {
 menus.push({id:'s-kelola-izin', icon:'check', bg:'#d1fae5', label:'Kelola Izin', sub:'Approve pengajuan'});
 menus.push({id:'s-kpi-check', icon:'clipboard', bg:'#fef3c7', label:'KPI Checklist', sub:'Update KPI kamu'});
 menus.push({id:'s-sanksi-manual', icon:'scale', bg:'#fce7f3', label:'Reward & Penalty', sub:'Denda & reward manual'});
 menus.push({id:'s-rekap-bulanan', icon:'chart', bg:'#e0f2fe', label:'Rekap Bulanan', sub:'Ringkasan semua karyawan'});
 menus.push({id:'s-payroll', icon:'card', bg:'#ede9fe', label:'Payroll', sub:'Preview & publish slip'});
 }
 if (u.bagian === 'Owner') {
 menus.push({id:'s-tambah-pengumuman', icon:'edit', bg:'#f0fdf4', label:'Buat Pengumuman', sub:'Info baru'});
 menus.push({id:'s-manage-users', icon:'users', bg:'#fef3c7', label:'Kelola Tim', sub:'Aktif / Nonaktif'});
 menus.push({id:'s-laporan-absensi', icon:'chart', bg:'#e0f2fe', label:'Laporan Absensi', sub:'Rekap kehadiran'});
 menus.push({id:'s-sanksi-manual', icon:'scale', bg:'#fce7f3', label:'Reward & Penalty', sub:'Denda & reward manual'});
 menus.push({id:'s-rekap-bulanan', icon:'chart', bg:'#d1fae5', label:'Rekap Bulanan', sub:'Ringkasan semua karyawan'});
 menus.push({id:'s-payroll', icon:'card', bg:'#ede9fe', label:'Payroll', sub:'Review gaji tim'});
 }
 menus.push({id:'s-ganti-pin', icon:'lock', bg:'#f1f5f9', label:'Ganti Sandi', sub:'Ubah PIN login kamu'});
 var prevBtn = document.querySelector('.preview-btn');
 if (prevBtn) prevBtn.style.display = (!isTouchDevice && (u.bagian === 'Owner' || u.bagian === 'Finance')) ? 'flex' : 'none';
 document.getElementById('home-menu').innerHTML = renderHomeMenuSections(menus);
 setTimeout(prefetchCommonData, 450);

 // Reward dilengkapi saat data Home tiba; jangan bikin halaman awal terasa tertahan.
 var rewardSection = document.getElementById('reward-section');
 if (rewardSection && !rewardSection.querySelector('.reward-card')) rewardSection.innerHTML = '';

 // Spinner profile card hanya untuk karyawan biasa
 if (u.bagian !== 'Owner' && u.bagian !== 'Finance') {
 document.getElementById('profile-card').innerHTML =
 '<div style="background:#fff;border-radius:14px;border:1px solid var(--gray-border);padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:14px">'+
 '<div style="width:54px;height:54px;border-radius:50%;background:var(--blue-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
 '<div style="width:24px;height:24px;border:3px solid rgba(14,79,163,0.2);border-top:3px solid var(--blue);border-radius:50%;animation:spin .7s linear infinite"></div></div>'+
 '<div style="flex:1"><div class="skeleton" style="height:14px;width:60%;margin-bottom:8px"></div>'+
 '<div class="skeleton" style="height:10px;width:40%;margin-bottom:8px"></div>'+
 '<div class="skeleton" style="height:16px;width:80%"></div></div></div>';
 }

 gasCall('getHomeData', [u.id, u.bagian], function(d) {
 // Pengumuman — index 0 adalah terbaru (sudah di-reverse di GAS)
 if (d.pengumuman && d.pengumuman.length > 0) {
 var latestPeng = d.pengumuman[0];
 document.getElementById('home-ann-text').textContent = latestPeng.judul;
 document.getElementById('home-ann-banner').style.display = 'flex';
 }
 // Reward slider - hanya tampilkan karyawan ranking 1
 var rwdList = (d.rewards && d.rewards.length > 0) ? d.rewards : (d.reward ? [d.reward] : []);
 if (rwdList.length > 0) {
 var cards = rwdList.map(function(r, i) {
 return '<div style="min-width:100%;padding:0 2px">'+
 '<div class="reward-card" style="margin:0">'+
 '<div class="reward-label"> BINTANG BULAN INI · '+r.bulan+'</div>'+
 '<div class="reward-avatar-big">'+initials(r.nama)+'</div>'+
 '<div class="reward-name">'+r.nama+'</div>'+
 '<div class="reward-sub">'+r.bagian+'</div>'+
 '<div class="reward-alasan">"'+r.alasan+'"</div>'+
 '<div class="reward-pesan"> '+r.pesan+'</div>'+
 '</div></div>';
 }).join('');
 var dots = rwdList.length > 1
 ? '<div id="rwd-dots" style="display:flex;justify-content:center;gap:8px;margin-top:10px">' +
 rwdList.map(function(_,i){ return '<div onclick="showReward('+i+')" style="width:8px;height:8px;border-radius:50%;background:'+(i===0?'#0e4fa3':'#cbd5e1')+';cursor:pointer;transition:background .2s"></div>'; }).join('') + '</div>'
 : '';
 document.getElementById('reward-section').innerHTML =
 '<div style="overflow:hidden;border-radius:14px">'+
 '<div id="reward-track" style="display:flex;transition:transform .35s cubic-bezier(.4,0,.2,1);will-change:transform">'+
 cards+'</div></div>'+dots;
 window._rewardData = rwdList;
 window._rewardIdx = 0;
 var track = document.getElementById('reward-track');
 var _sx = 0;
 track.addEventListener('touchstart', function(e){ _sx = e.touches[0].clientX; }, {passive:true});
 track.addEventListener('touchend', function(e){
 if (!window._rewardData || window._rewardData.length <= 1) return;
 var diff = _sx - e.changedTouches[0].clientX;
 if (Math.abs(diff) > 40) {
 var next = (window._rewardIdx + (diff > 0 ? 1 : -1) + window._rewardData.length) % window._rewardData.length;
 showReward(next);
 }
 }, {passive:true});
 } else {
 // Tidak ada data reward — sembunyikan section
 document.getElementById('reward-section').innerHTML = '';
 }
 if (d.notifCountByMenu) updateAllMenuBadges(d.notifCountByMenu);
 // Badge Kelola Izin untuk Finance/Owner
 if (u.bagian === 'Finance' || u.bagian === 'Owner') {
 gasCall('getIzinPendingCount', [], function(res) {
 if (res && res.count > 0) {
 document.querySelectorAll('.menu-card').forEach(function(card) {
 if (card.textContent.includes('Kelola Izin')) {
 var existing = card.querySelector('.izin-badge');
 if (existing) existing.remove();
 var badge = document.createElement('div');
 badge.className = 'izin-badge';
 badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center';
 badge.textContent = res.count > 9 ? '9+' : res.count;
 card.style.position = 'relative';
 card.appendChild(badge);
 }
 });
 }
 });
 }

 // Profile card — hanya untuk staff biasa
 if (u.bagian !== 'Owner' && u.bagian !== 'Finance') {
 var p = d.profile || {};
 var bintang = p.bintang || 0;
 var stars = '';
 for (var si = 0; si < 5; si++) stars += '<span class="'+(si < bintang ? 'star-filled' : 'star-empty')+'">★</span>';
 document.getElementById('profile-card').innerHTML =
 '<div class="profile-card" onclick="goTo(\'s-kpi-check\')">'+
 '<div class="profile-avatar-lg">'+initials(u.nama)+'</div>'+
 '<div class="profile-info">'+
 '<div class="profile-name">'+u.nama+'</div>'+
 '<div class="profile-jabatan">'+u.jabatan+' · '+u.bagian+'</div>'+
 '<div class="profile-stars">'+stars+
 '<span class="profile-skor">'+(p.skor||0)+'/100</span></div>'+
 '<div style="font-size:11px;color:var(--blue);margin-top:4px;font-weight:600"> Isi KPI Checklist →</div>'+
 '</div></div>';
 }

 var financeNotif = document.getElementById('finance-notif');
 if (financeNotif) financeNotif.style.display = 'none';

 // Banner anomali tap
 if (d.anomaliPending && d.anomaliPending.length > 0) {
 var banner = document.getElementById('anomali-banner');
 var earliest = d.anomaliPending[0];
 document.getElementById('anomali-banner-title').textContent = ' '+d.anomaliPending.length+'x tap fingerprint perlu dikonfirmasi ke Finance!';
 document.getElementById('anomali-banner-sub').textContent = 'Batas waktu terdekat: '+earliest.deadline+' · Klik untuk lihat detail';
 banner.style.display = 'block';
 } else {
 document.getElementById('anomali-banner').style.display = 'none';
 }
 // Load pengaturan (link panduan dll)
 gasCall('getPengaturan', [], function(cfg){ window._cfg = cfg||{}; });
 // Load notifikasi badge
 gasCall('getNotifikasi', [u.id], function(notifs) {
 if (!notifs) return;
 var belumDibaca = notifs.filter(function(n){ return !n.dibaca; }).length;
 if (belumDibaca > 0) updateNotifBadge(belumDibaca);
 });
 }, function(){});
}

function updateAllMenuBadges(counts) {
 document.querySelectorAll('.menu-card').forEach(function(card) {
 var onclick = card.getAttribute('onclick') || '';
 var match = onclick.match(/goTo\('([^']+)'\)/);
 if (!match) return;
 var mid = match[1];
 var count = (counts && counts[mid]) || 0;
 var existing = card.querySelector('.menu-badge');
 if (existing) existing.remove();
 if (count > 0) {
 var badge = document.createElement('div');
 badge.className = 'menu-badge';
 badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;box-sizing:border-box';
 badge.textContent = count > 9 ? '9+' : count;
 card.style.position = 'relative';
 card.appendChild(badge);
 }
 });
}

function showReward(idx) {
 if (!window._rewardData) return;
 window._rewardIdx = idx;
 var track = document.getElementById('reward-track');
 if (track) track.style.transform = 'translateX(-' + (idx * 100) + '%)';
 var dotEls = document.querySelectorAll('#rwd-dots div');
 dotEls.forEach(function(d, i) {
 d.style.background = i === idx ? '#0e4fa3' : '#cbd5e1';
 });
}

// Swipe gesture untuk reward slider


function kpiRow(k) {
 var cls = k.status==='TERCAPAI'?'kpi-ok':k.status==='PERLU PERHATIAN'?'kpi-warn':'kpi-bad';
 var icon = k.status==='TERCAPAI'?'':k.status==='PERLU PERHATIAN'?'':'';
 var lbl = k.status==='TERCAPAI'?'Tercapai':k.status==='PERLU PERHATIAN'?'Perlu Perhatian':'Tidak Tercapai';
 return '<div class="kpi-row"><div class="kpi-label">'+k.indikator+'</div><div class="kpi-val '+cls+'">'+icon+' '+lbl+'</div></div>';
}

function skelCards(n) {
 var html = '';
 for (var i = 0; i < n; i++) {
 html += '<div class="card" style="margin-bottom:10px"><div class="skeleton skel-text"></div><div class="skeleton skel-text-sm"></div><div class="skeleton skel-text-sm" style="width:40%"></div></div>';
 }
 return html;
}

function loadJobdeskList() {
 var list = document.getElementById('jobdesk-list');
 list.innerHTML = skelCards(4);
 gasCall('getJobdeskList', [], function(data) {
 if (!data || !data.length) { list.innerHTML = '<div class="empty-state">Tidak ada data bagian</div>'; return; }
 var icons = {Live:'target', Packing:'package', Ecommerce:'cart', Finance:'card'};
 var colors = {Live:'#dbeafe', Packing:'#fce7f3', Ecommerce:'#d1fae5', Finance:'#fef3c7'};
 list.innerHTML = '<div class="section-label">Pilih Bagian</div>' + data.map(function(b) {
 return '<div class="list-item" onclick="openBagian(\''+b.bagian+'\')">'+
 '<div class="list-icon" style="background:'+(colors[b.bagian]||'#f3f4f6')+'">'+uiIcon(icons[b.bagian]||'building')+'</div>'+
 '<div class="list-info"><h4>'+b.bagian+'</h4><p>'+b.count+' anggota aktif</p></div>'+
 '<div class="list-arr">›</div></div>';
 }).join('');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function openBagian(bagian) {
 currentBagian = bagian;
 document.getElementById('staff-bagian-title').textContent = bagian;
 var list = document.getElementById('staff-list');
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Memuat...</div>';
 goTo('s-staff');
 gasCall('getStaffByBagian', [bagian], function(staff) {
 if (!staff || !staff.length) { list.innerHTML = '<div class="empty-state">Tidak ada anggota aktif</div>'; return; }
 var isPrivileged = currentUser.bagian === 'Owner' || currentUser.bagian === 'Finance';
 list.innerHTML = '<div class="section-label">Anggota Tim</div>' + staff.map(function(s,i) {
 var ci = i % AVT_BG.length;
 var isSelf = s.id === currentUser.id;
 var canOpen = isPrivileged || isSelf;
 var lockIcon = canOpen ? '<div class="list-arr">›</div>' : '<div style="font-size:16px"></div>';
 var onclick = canOpen
 ? 'onclick="openDetail(\''+s.id+'\',\''+esc(s.nama)+'\',\''+esc(s.jabatan)+'\',\''+bagian+'\')"'
 : 'onclick="showToast(\'Kamu hanya bisa melihat jobdesk milikmu sendiri\')"';
 return '<div class="list-item" '+onclick+' style="'+(canOpen?'':'opacity:0.7')+'">'+
 '<div class="avatar" style="background:'+AVT_BG[ci]+';color:'+AVT_TXT[ci]+'">'+initials(s.nama)+'</div>'+
 '<div class="list-info"><h4>'+s.nama+'</h4><p>'+s.jabatan+' · '+(isSelf?'<span style="color:var(--blue);font-weight:600">Kamu</span>':'Aktif')+'</p></div>'+
 lockIcon+'</div>';
 }).join('');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function openDetail(userId, nama, jabatan, bagian) {
 document.getElementById('detail-nama').textContent = nama;
 document.getElementById('detail-jabatan').textContent = jabatan;
 document.getElementById('detail-badges').innerHTML = '<span class="badge badge-blue">Aktif</span> <span class="badge badge-gold">'+bagian+'</span>';
 document.getElementById('detail-absensi-content').innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">Memuat...</div>';
 document.getElementById('detail-jobdesk-content').innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">Memuat...</div>';
 document.getElementById('detail-doc-link').style.display = 'none';
 goTo('s-detail');

 gasCall('getJobdeskByJabatan', [jabatan], function(jd) {
 var el = document.getElementById('detail-jobdesk-content');
 if (jd && jd.link) {
 el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">Klik tombol di bawah untuk buka jobdesk lengkap</div>';
 var link = document.getElementById('detail-doc-link');
 link.href = jd.link; link.style.display = 'block';
 } else {
 el.innerHTML = '<div class="empty-state" style="padding:10px"><div style="font-size:12px">Jobdesk belum ditambahkan.</div></div>';
 }
 });

 gasCall('getAbsensiRekap', [userId], function(res) {
 var el = document.getElementById('detail-absensi-content');
 if (!res || !res.data || !res.data.length) {
 el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px">Belum ada data kehadiran</div>';
 return;
 }

 // Tampilkan bulan berjalan dulu, fallback ke terbaru
 var bulanList = res.data;
 var target = bulanList.find(function(b){ return b.bulan === res.bulanIni; }) || bulanList[0];

 var _dropId = 0;
 function dropdown(label, bgColor, textColor, items, total) {
 var id = 'drp-'+(++_dropId);
 var totalStr = total > 0 ? ' <span style="font-weight:800;color:'+textColor+'">Rp '+total.toLocaleString('id-ID')+'</span>' : '';
 var html = '<div style="margin-top:8px;background:'+bgColor+';border-radius:8px;overflow:hidden">';
 html += '<div onclick="toggleDropdown(\''+id+'\')" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">';
 html += '<span style="font-size:12px;color:'+textColor+';font-weight:600">'+label+'</span>';
 html += '<span id="'+id+'-arr" style="font-size:11px;color:'+textColor+'">'+totalStr+' ▼</span></div>';
 html += '<div id="'+id+'" style="display:none;padding:0 12px 10px;border-top:1px solid rgba(0,0,0,0.05)">';
 if (items.length === 0) {
 html += '<div style="font-size:11px;color:'+textColor+';opacity:.7;padding-top:8px">Tidak ada</div>';
 } else {
 items.forEach(function(item) {
 html += '<div style="font-size:11px;color:'+textColor+';padding-top:6px">• '+item+'</div>';
 });
 }
 html += '</div></div>';
 return html;
 }

 function renderBulan(b) {
 _dropId = 0;
 var totalHariKerja = b.totalHadir + b.totalAbsen;
 var persen = totalHariKerja > 0 ? Math.round((b.totalHadir/totalHariKerja)*100) : 0;
 var barColor = persen >= 90 ? '#22c55e' : persen >= 75 ? '#f59e0b' : '#ef4444';

 // Summary bulanan
 var html = '<div style="background:var(--blue-light);border-radius:10px;padding:14px;margin-bottom:12px">';
 html += '<div style="font-size:13px;font-weight:700;color:var(--blue);margin-bottom:10px"> '+b.label+'</div>';
 html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#22c55e">'+b.totalHadir+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Hadir</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#ef4444">'+b.totalAbsen+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Absen</div></div>';
 var totalLemburDisplay = (b.lemburMinggu||0) + (b.lemburLibur||0) + (b.detailLemburPulang ? b.detailLemburPulang.length : 0);
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#f59e0b">'+b.totalTelat+'</div><div style="font-size:10px;color:var(--text-muted)">Kali Telat</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--blue)">'+totalLemburDisplay+'</div><div style="font-size:10px;color:var(--text-muted)">Lembur</div></div>';
 html += '</div>';

 // Progress bar
 html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Kehadiran: '+persen+'%</div>';
 html += '<div style="background:#e2e8f0;border-radius:4px;height:8px"><div style="background:'+barColor+';height:8px;border-radius:4px;width:'+persen+'%;transition:width .5s"></div></div>';

 // Denda dropdown — telat + SP + penalty manual (dari detailByBulan, bukan mingguList)
 var dendaItems = [];
 b.mingguList.forEach(function(w) {
 if (w.detail && w.detail.telat) {
 w.detail.telat.forEach(function(d){ dendaItems.push(d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')); });
 }
 });
 // SP dari detailByBulan (deduplicate)
 if (b.detailDendaSP && b.detailDendaSP.length > 0) {
 b.detailDendaSP.forEach(function(d){
 dendaItems.push(' '+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID'));
 });
 }
 // Penalty Manual dari detailByBulan (deduplicate)
 if (b.detailDendaManual && b.detailDendaManual.length > 0) {
 dendaItems.push('— Penalty Manual —');
 b.detailDendaManual.forEach(function(d){
 var prefix = formatTglJam(d.tanggal, d.jam);
 dendaItems.push(' '+prefix+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID'));
 });
 }
 if (b.totalDenda > 0) html += dropdown(' Estimasi Denda Bulan Ini', '#fee2e2', '#991b1b', dendaItems, b.totalDenda);

 // Reward dropdown — lembur + reward manual
 var rewardItems = [];
 if (b.detailLemburPulang && b.detailLemburPulang.length > 0) {
 rewardItems.push('— Lembur Pulang —');
 b.detailLemburPulang.forEach(function(d){ rewardItems.push(d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')); });
 }
 if (b.detailLemburMinggu && b.detailLemburMinggu.length > 0) {
 rewardItems.push('— Lembur Minggu —');
 b.detailLemburMinggu.forEach(function(d){ rewardItems.push(d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')); });
 }
 if (b.detailLemburLibur && b.detailLemburLibur.length > 0) {
 rewardItems.push('— Lembur Hari Libur —');
 b.detailLemburLibur.forEach(function(d){ rewardItems.push(d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')); });
 }
 if (b.detailRewardManual && b.detailRewardManual.length > 0) {
 rewardItems.push('— Reward Manual —');
 b.detailRewardManual.forEach(function(d){
 var prefix = formatTglJam(d.tanggal, d.jam);
 rewardItems.push(' '+prefix+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID'));
 });
 }
 if (b.bonusKerajinan > 0) rewardItems.push(' Bonus Kerajinan → Rp '+b.bonusKerajinan.toLocaleString('id-ID'));
 var totalReward = (b.totalRewardLembur||0) + (b.bonusKerajinan||0);
 if (totalReward > 0) html += dropdown(' Estimasi Reward Bulan Ini', '#d1fae5', '#065f46', rewardItems, totalReward);

 // Absen dropdown — HANYA dari detailByBulan
 var absenItems = [];
 if (b.detailAbsen && b.detailAbsen.length > 0) {
 b.detailAbsen.forEach(function(d){ absenItems.push(d.keterangan); });
 } else {
 // fallback ke mingguList kalau detailAbsen belum ada
 b.mingguList.forEach(function(w) {
 if (w.detail && w.detail.absen) {
 w.detail.absen.forEach(function(d){ absenItems.push(d.keterangan); });
 }
 });
 }
 if (b.totalAbsen > 0) html += dropdown(' Hari Absen ('+b.totalAbsen+' hari)', '#fff7f7', '#991b1b', absenItems, 0);

 // Libur resmi
 if (res.liburBulanIni && res.liburBulanIni.length > 0) {
 html += '<div style="margin-top:8px;font-size:11px;color:var(--blue)"> Libur resmi: '+res.liburBulanIni.join(', ')+'</div>';
 }
 html += '</div>';

 // Detail per minggu
 // ── DETAIL BULAN INI (gabungan semua hari, tidak terpatahkan minggu) ──
 var allTelat = [], allAbsen = [], allLemburM = [], allLemburL = [], allLemburP = [];
 // Kumpulkan dari detailByBulan via b.detail* fields
 if (b.detailLemburPulang) allLemburP = b.detailLemburPulang;
 if (b.detailLemburMinggu) allLemburM = b.detailLemburMinggu;
 if (b.detailLemburLibur) allLemburL = b.detailLemburLibur;
 if (b.detailAbsen) allAbsen = b.detailAbsen;
 // Telat dari mingguList (masih akurat per item)
 b.mingguList.forEach(function(w) {
 if (w.detail && w.detail.telat) allTelat = allTelat.concat(w.detail.telat);
 });

 // Hitung range tanggal aktual dari semua item
 var allTanggal = [];
 allTelat.concat(allAbsen).concat(allLemburP).concat(allLemburM).concat(allLemburL).forEach(function(d){
 if (d.tanggal) allTanggal.push(d.tanggal);
 });
 // Tambahkan dari mingguList hadir jika ada
 b.mingguList.forEach(function(w){
 if (w.detail && w.detail.hadir) w.detail.hadir.forEach(function(d){ if(d.tanggal) allTanggal.push(d.tanggal); });
 });
 allTanggal.sort();
 var mNm = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
 var bParts = b.bulan.split('-');
 var bYear = parseInt(bParts[0]), bMonth = parseInt(bParts[1]);
 // Cari tanggal terakhir yang ada datanya
 var lastDataDate = '';
 if (allTanggal.length > 0) {
 var dN = allTanggal[allTanggal.length-1];
 var pN = dN.split('-');
 lastDataDate = parseInt(pN[2])+' '+mNm[parseInt(pN[1])-1];
 }
 var rangeLabel = mNm[bMonth-1]+' '+bYear + (lastDataDate ? ' <span style="font-size:10px;color:var(--text-muted);font-weight:400">(data s/d '+lastDataDate+')</span>' : '');

 // Status berdasarkan total bulan
 var bStatus = 'BAIK', bIcon = '', bColor = '#22c55e';
 if (b.totalAbsen >= 3 || b.totalTelat >= 5) { bStatus='MERAH'; bIcon=''; bColor='#ef4444'; }
 else if (b.totalAbsen >= 2 || b.totalTelat >= 3) { bStatus='KUNING'; bIcon=''; bColor='#f59e0b'; }

 html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px;letter-spacing:.05em">DETAIL BULAN INI</div>';
 html += '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:10px;margin-bottom:8px">';
 html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
 html += '<div style="font-size:11px;font-weight:600;color:var(--text-dark)">'+rangeLabel+'</div>';
 html += '<span style="font-size:10px;background:'+bColor+'22;color:'+bColor+';padding:2px 8px;border-radius:10px;font-weight:700">'+bIcon+' '+bStatus+'</span></div>';
 html += '<div style="font-size:11px;color:var(--text-muted)">';
 html += ' Hadir '+b.totalHadir+' hari &nbsp;·&nbsp; Telat '+b.totalTelat+'x &nbsp;·&nbsp; Absen '+b.totalAbsen+'x';

 // Denda telat
 if (allTelat.length > 0) {
 html += '<br><span style="color:#dc2626;font-weight:600"> Denda: Rp '+b.totalDenda.toLocaleString('id-ID')+'</span>';
 allTelat.forEach(function(d){ html += '<br><span style="color:#dc2626;font-size:10px">&nbsp;&nbsp;• '+d.keterangan+'</span>'; });
 }
 // Hari absen
 if (allAbsen.length > 0) {
 allAbsen.forEach(function(d){ html += '<br><span style="color:#991b1b;font-size:10px">&nbsp;&nbsp;• '+d.keterangan+'</span>'; });
 }
 // Lembur
 if (allLemburM.length > 0) allLemburM.forEach(function(d){ html += '<br><span style="color:#065f46;font-size:10px"> '+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')+'</span>'; });
 if (allLemburL.length > 0) allLemburL.forEach(function(d){ html += '<br><span style="color:#065f46;font-size:10px"> '+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')+'</span>'; });
 if (allLemburP.length > 0) allLemburP.forEach(function(d){ html += '<br><span style="color:#065f46;font-size:10px"> '+d.keterangan+' → Rp '+d.nilai.toLocaleString('id-ID')+'</span>'; });
 html += '</div></div>';

 // Tombol ganti bulan
 if (bulanList.length > 1) {
 html += '<div style="font-size:11px;color:var(--blue);text-align:center;margin-top:4px;cursor:pointer" onclick="showBulanPicker()">Lihat bulan lain ›</div>';
 html += '<div id="bulan-picker" style="display:none;margin-top:8px">';
 bulanList.forEach(function(bl) {
 html += '<div onclick="renderAbsensi(\''+bl.bulan+'\')" style="padding:8px;border:1px solid var(--gray-border);border-radius:8px;margin-bottom:6px;font-size:12px;cursor:pointer;'+(bl.bulan===b.bulan?'background:var(--blue-light);font-weight:700':'')+'">'+bl.label+'</div>';
 });
 html += '</div>';
 }
 return html;
 }

 window._absensiRes = res;
 window._absensiRender = renderBulan;
 el.innerHTML = renderBulan(target);
 });
}

function toggleDropdown(id) {
 var el = document.getElementById(id);
 var arr = document.getElementById(id+'-arr');
 if (!el) return;
 var isOpen = el.style.display !== 'none';
 el.style.display = isOpen ? 'none' : 'block';
 if (arr) arr.innerHTML = arr.innerHTML.replace(isOpen ? '▲' : '▼', isOpen ? '▼' : '▲');
}

function renderAbsensiDetailHtml(res, bulanKey, scopeId) {
 if (!res || !res.data || !res.data.length) {
 return '<div class="empty-state" style="padding:12px">Belum ada data kehadiran</div>';
 }
 var bulanList = res.data;
 var b = bulanList.find(function(x){ return x.bulan === bulanKey; }) || bulanList.find(function(x){ return x.bulan === res.bulanIni; }) || bulanList[0];
 var mingguList = b.mingguList || [];
 var dropId = 0;
 scopeId = scopeId || ('abs-' + Date.now());

 function money(n) { return (parseInt(n, 10) || 0).toLocaleString('id-ID'); }
 function detailLine(item, withMoney) {
 var text = item.keterangan || '';
 if (withMoney && item.nilai) text += ' &rarr; Rp ' + money(item.nilai);
 return text;
 }
 function dropdown(label, bgColor, textColor, items, total) {
 var id = scopeId + '-drp-' + (++dropId);
 var totalStr = total > 0 ? ' <span style="font-weight:800;color:'+textColor+'">Rp '+money(total)+'</span>' : '';
 var html = '<div style="margin-top:8px;background:'+bgColor+';border-radius:8px;overflow:hidden">';
 html += '<div onclick="toggleDropdown(\''+id+'\')" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">';
 html += '<span style="font-size:12px;color:'+textColor+';font-weight:600">'+label+'</span>';
 html += '<span id="'+id+'-arr" style="font-size:11px;color:'+textColor+'">'+totalStr+' â–¼</span></div>';
 html += '<div id="'+id+'" style="display:none;padding:0 12px 10px;border-top:1px solid rgba(0,0,0,0.05)">';
 if (!items.length) html += '<div style="font-size:11px;color:'+textColor+';opacity:.7;padding-top:8px">Tidak ada</div>';
 else items.forEach(function(item){ html += '<div style="font-size:11px;color:'+textColor+';padding-top:6px">&bull; '+item+'</div>'; });
 html += '</div></div>';
 return html;
 }

 var totalHariKerja = (b.totalHadir || 0) + (b.totalAbsen || 0);
 var persen = totalHariKerja > 0 ? Math.round(((b.totalHadir || 0) / totalHariKerja) * 100) : 0;
 var barColor = persen >= 90 ? '#22c55e' : persen >= 75 ? '#f59e0b' : '#ef4444';
 var totalLemburDisplay = (b.lemburMinggu || 0) + (b.lemburLibur || 0) + (b.detailLemburPulang ? b.detailLemburPulang.length : 0);

 var html = '<div style="background:var(--blue-light);border-radius:10px;padding:14px;margin:10px 0 12px">';
 html += '<div style="font-size:13px;font-weight:700;color:var(--blue);margin-bottom:10px">&#128197; '+(b.label || b.bulan)+'</div>';
 html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#22c55e">'+(b.totalHadir || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Hadir</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#ef4444">'+(b.totalAbsen || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Absen</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#f59e0b">'+(b.totalTelat || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Kali Telat</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--blue)">'+totalLemburDisplay+'</div><div style="font-size:10px;color:var(--text-muted)">Lembur</div></div>';
 html += '</div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Kehadiran: '+persen+'%</div>';
 html += '<div style="background:#e2e8f0;border-radius:4px;height:8px"><div style="background:'+barColor+';height:8px;border-radius:4px;width:'+persen+'%"></div></div>';

 var dendaItems = [];
 mingguList.forEach(function(w){ if (w.detail && w.detail.telat) w.detail.telat.forEach(function(d){ dendaItems.push(detailLine(d, true)); }); });
 if (b.detailDendaSP) b.detailDendaSP.forEach(function(d){ dendaItems.push('SP: '+detailLine(d, true)); });
 if (b.detailDendaManual && b.detailDendaManual.length) {
 dendaItems.push('Penalty Manual');
 b.detailDendaManual.forEach(function(d){ dendaItems.push(formatTglJam(d.tanggal, d.jam)+detailLine(d, true)); });
 }
 if (b.totalDenda > 0) html += dropdown('Estimasi Denda Bulan Ini', '#fee2e2', '#991b1b', dendaItems, b.totalDenda);

 var rewardItems = [];
 if (b.detailLemburPulang) b.detailLemburPulang.forEach(function(d){ rewardItems.push('Lembur Pulang: '+detailLine(d, true)); });
 if (b.detailLemburMinggu) b.detailLemburMinggu.forEach(function(d){ rewardItems.push('Lembur Minggu: '+detailLine(d, true)); });
 if (b.detailLemburLibur) b.detailLemburLibur.forEach(function(d){ rewardItems.push('Lembur Hari Libur: '+detailLine(d, true)); });
 if (b.detailRewardManual && b.detailRewardManual.length) {
 rewardItems.push('Reward Manual');
 b.detailRewardManual.forEach(function(d){ rewardItems.push(formatTglJam(d.tanggal, d.jam)+detailLine(d, true)); });
 }
 if (b.bonusKerajinan > 0) rewardItems.push('Bonus Kerajinan &rarr; Rp '+money(b.bonusKerajinan));
 var totalReward = (b.totalRewardLembur || 0) + (b.bonusKerajinan || 0);
 if (totalReward > 0) html += dropdown('Estimasi Reward Bulan Ini', '#d1fae5', '#065f46', rewardItems, totalReward);

 var absenItems = [];
 if (b.detailAbsen && b.detailAbsen.length) b.detailAbsen.forEach(function(d){ absenItems.push(d.keterangan); });
 else mingguList.forEach(function(w){ if (w.detail && w.detail.absen) w.detail.absen.forEach(function(d){ absenItems.push(d.keterangan); }); });
 if (b.totalAbsen > 0) html += dropdown('Hari Absen ('+(b.totalAbsen || 0)+' hari)', '#fff7f7', '#991b1b', absenItems, 0);
 html += '</div>';

 var allTelat = [], allAbsen = b.detailAbsen || [], allLembur = [];
 mingguList.forEach(function(w){ if (w.detail && w.detail.telat) allTelat = allTelat.concat(w.detail.telat); });
 if (!allAbsen.length) mingguList.forEach(function(w){ if (w.detail && w.detail.absen) allAbsen = allAbsen.concat(w.detail.absen); });
 ['detailLemburPulang','detailLemburMinggu','detailLemburLibur'].forEach(function(k){ if (b[k]) allLembur = allLembur.concat(b[k]); });
 var bStatus = 'BAIK', bColor = '#22c55e';
 if ((b.totalAbsen || 0) >= 3 || (b.totalTelat || 0) >= 5) { bStatus = 'MERAH'; bColor = '#ef4444'; }
 else if ((b.totalAbsen || 0) >= 2 || (b.totalTelat || 0) >= 3) { bStatus = 'KUNING'; bColor = '#f59e0b'; }

 html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px;letter-spacing:.05em">DETAIL BULAN INI</div>';
 html += '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:10px;margin-bottom:8px;background:#fff">';
 html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-size:11px;font-weight:600;color:var(--text-dark)">'+(b.label || b.bulan)+'</div>';
 html += '<span style="font-size:10px;background:'+bColor+'22;color:'+bColor+';padding:2px 8px;border-radius:10px;font-weight:700">'+bStatus+'</span></div>';
 html += '<div style="font-size:11px;color:var(--text-muted)">Hadir '+(b.totalHadir || 0)+' hari &nbsp;&middot;&nbsp; Telat '+(b.totalTelat || 0)+'x &nbsp;&middot;&nbsp; Absen '+(b.totalAbsen || 0)+'x';
 if (allTelat.length) {
 html += '<br><span style="color:#dc2626;font-weight:600">Denda: Rp '+money(b.totalDenda)+'</span>';
 allTelat.forEach(function(d){ html += '<br><span style="color:#dc2626;font-size:10px">&nbsp;&nbsp;&bull; '+d.keterangan+'</span>'; });
 }
 allAbsen.forEach(function(d){ html += '<br><span style="color:#991b1b;font-size:10px">&nbsp;&nbsp;&bull; '+d.keterangan+'</span>'; });
 allLembur.forEach(function(d){ html += '<br><span style="color:#065f46;font-size:10px">Lembur: '+detailLine(d, true)+'</span>'; });
 html += '</div></div>';
 return html;
}

var _homeClockTimer = null;
function startHomeClock() {
 function tick() {
 var now = new Date();
 var timeEl = document.getElementById('home-clock-time');
 var dateEl = document.getElementById('home-clock-date');
 if (!timeEl || !dateEl) return;
 var dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
 var monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 timeEl.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
 dateEl.textContent = dayNames[now.getDay()] + ', ' + now.getDate() + ' ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
 }
 tick();
 if (_homeClockTimer) clearInterval(_homeClockTimer);
 _homeClockTimer = setInterval(tick, 1000);
}

function menuCategory(m) {
 if (['s-absensi-camera','s-catatan-kehadiran','s-izin','s-slip-gaji'].indexOf(m.id) !== -1) return 'Kehadiran & Personal';
 if (['s-kelola-izin','s-rekap-bulanan','s-payroll','s-sanksi-manual','s-laporan-absensi','s-kalender'].indexOf(m.id) !== -1) return 'Finance & Owner';
 if (['s-jobdesk','s-kpi-check','s-papan-peringkat','s-peraturan'].indexOf(m.id) !== -1) return 'Kerja & Produktivitas';
 if (['s-pengumuman','s-ide','s-notifikasi','s-tambah-pengumuman'].indexOf(m.id) !== -1) return 'Komunikasi Tim';
 return 'Akun';
}

function renderHomeMenuSections(menus) {
 var order = ['Kehadiran & Personal','Kerja & Produktivitas','Komunikasi Tim','Finance & Owner','Akun'];
 var desc = {
 'Kehadiran & Personal':'Absensi, riwayat, izin, gaji',
 'Kerja & Produktivitas':'Tugas, KPI, aturan kerja',
 'Komunikasi Tim':'Info, ide, dan notifikasi',
 'Finance & Owner':'Kontrol data dan payroll',
 'Akun':'Pengaturan akses'
 };
 var groups = {};
 menus.forEach(function(m) {
 var cat = menuCategory(m);
 if (!groups[cat]) groups[cat] = [];
 groups[cat].push(m);
 });
 window._homeMenuGroups = groups;
 window._homeMenuOrder = order.filter(function(cat){ return groups[cat] && groups[cat].length; });
 window._homeMenuDesc = desc;
 return renderHomeCategoryIndex();
}

function homeCategoryIcon(cat) {
 if (cat === 'Kehadiran & Personal') return 'camera';
 if (cat === 'Kerja & Produktivitas') return 'clipboard';
 if (cat === 'Komunikasi Tim') return 'megaphone';
 if (cat === 'Finance & Owner') return 'card';
 return 'user';
}

function renderHomeCategoryIndex() {
 var order = window._homeMenuOrder || [];
 var desc = window._homeMenuDesc || {};
 return '<section class="home-menu-section home-category-section">'+
 '<div class="home-section-head"><span></span><div><h2>Kategori Menu</h2><p>Pilih area kerja yang ingin dibuka</p></div></div>'+
 '<div class="home-category-grid">'+order.map(function(cat) {
 var count = ((window._homeMenuGroups || {})[cat] || []).length;
 return '<button class="home-category-card" onclick="openHomeCategory(&quot;'+cat+'&quot;)">'+
 '<div class="home-category-icon">'+uiIcon(homeCategoryIcon(cat))+'</div>'+
 '<b>'+cat+'</b><small>'+desc[cat]+'</small><em>'+count+' menu</em></button>';
 }).join('')+'</div></section>';
}

function renderHomeMenuSectionList() {
 var order = window._homeMenuOrder || [];
 var desc = window._homeMenuDesc || {};
 var groups = window._homeMenuGroups || {};
 var html = '<div class="home-menu-search"><span></span><input id="home-menu-search-input" placeholder="Cari menu..." oninput="filterHomeMenus()"></div>';
 html += order.map(function(cat) {
 var menus = groups[cat] || [];
 return '<section class="home-menu-section" data-menu-section="'+cat.toLowerCase()+'">'+
 '<div class="home-section-head"><span></span><div><h2>'+cat+'</h2><p>'+desc[cat]+'</p></div></div>'+
 '<div class="home-menu-grid">'+menus.map(function(m) {
 return '<button class="menu-card" data-menu-search="'+(m.label+' '+m.sub+' '+cat).toLowerCase()+'" onclick="goTo(\''+m.id+'\')"><div class="menu-icon">'+uiIcon(m.icon)+'</div><h3>'+m.label+'</h3><p>'+m.sub+'</p></button>';
 }).join('')+'</div></section>';
 }).join('');
 return html;
}

function filterHomeMenus() {
 var input = document.getElementById('home-menu-search-input');
 var q = input ? input.value.toLowerCase().trim() : '';
 document.querySelectorAll('.home-menu-section').forEach(function(section) {
 var visibleCount = 0;
 section.querySelectorAll('.menu-card').forEach(function(card) {
 var show = !q || (card.getAttribute('data-menu-search') || '').indexOf(q) !== -1;
 card.style.display = show ? 'flex' : 'none';
 if (show) visibleCount++;
 });
 section.style.display = visibleCount ? 'block' : 'none';
 });
}

function openHomeCategory(cat) {
 var groups = window._homeMenuGroups || {};
 var menus = groups[cat] || [];
 var desc = (window._homeMenuDesc || {})[cat] || '';
 var el = document.getElementById('home-menu');
 if (!el) return;
 _homeCategoryOpen = true;
 try { history.pushState({ screen: 's-home', category: cat }, '', '#home-category'); } catch(e) {}
 el.innerHTML = '<section class="home-menu-section home-menu-detail">'+
 '<button class="home-category-back" onclick="closeHomeCategory()">'+uiIcon('home')+' Kembali ke kategori</button>'+
 '<div class="home-section-head"><span></span><div><h2>'+cat+'</h2><p>'+desc+'</p></div></div>'+
 '<div class="home-menu-grid">'+menus.map(function(m) {
 return '<button class="menu-card" onclick="goTo(\''+m.id+'\')"><div class="menu-icon">'+uiIcon(m.icon)+'</div><h3>'+m.label+'</h3><p>'+m.sub+'</p></button>';
 }).join('')+'</div></section>';
}

function closeHomeCategory(fromHistory) {
 var el = document.getElementById('home-menu');
 _homeCategoryOpen = false;
 if (el) el.innerHTML = renderHomeCategoryIndex();
 if (!fromHistory) {
 try { history.replaceState({ screen: 's-home' }, '', '#s-home'); } catch(e) {}
 }
}

function refreshHomeData() {
 if (!currentUser) return;
 var btn = document.querySelector('.home-refresh-btn');
 if (btn) btn.classList.add('loading');
 cacheClear('getHomeData' + JSON.stringify([currentUser.id, currentUser.bagian]));
 _homeLoaded = false;
 loadHome(true);
 setTimeout(function(){ if (btn) btn.classList.remove('loading'); }, 900);
 showToast('Data diperbarui');
}

function showBulanPicker() {
 var picker = document.getElementById('bulan-picker');
 if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

function renderAbsensi(bulanKey) {
 if (!window._absensiRes || !window._absensiRender) return;
 var b = window._absensiRes.data.find(function(x){ return x.bulan === bulanKey; });
 if (b) document.getElementById('detail-absensi-content').innerHTML = window._absensiRender(b);
}

function loadPengumuman() {
 var list = document.getElementById('pengumuman-list');
 list.innerHTML = skelCards(3);
 gasCall('getPengumuman', [currentUser ? currentUser.bagian : 'ALL'], function(data) {
 if (!data || !data.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada pengumuman</div>'; return; }
 var bdg = {PENTING:'badge-red', INFO:'badge-blue', UMUM:'badge-green'};
 list.innerHTML = '<div class="section-label">Terbaru</div>' + data.map(function(p) {
 return '<div class="peng-card"><div class="peng-header"><span class="badge '+(bdg[p.kategori]||'badge-gray')+'">'+p.kategori+'</span><span class="peng-tgl">'+p.tgl+'</span></div>'+
 '<div class="peng-title">'+p.judul+'</div><div class="peng-isi">'+p.isi+'</div></div>';
 }).join('');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function submitPengumuman() {
 var judul = document.getElementById('peng-judul').value.trim();
 var isi = document.getElementById('peng-isi').value.trim();
 var kategori = document.getElementById('peng-kategori').value;
 var target = document.getElementById('peng-target').value;
 if (!judul || !isi) { showToast('Judul dan isi wajib diisi'); return; }
 gasCall('addPengumuman', [judul, isi, kategori, target, currentUser.nama], function() {
 document.getElementById('peng-judul').value = '';
 document.getElementById('peng-isi').value = '';
 showToast('Pengumuman berhasil dikirim!');
 goTo('s-pengumuman');
 }, function(){ showToast('Gagal. Coba lagi.'); });
}

function loadIde() {
 var list = document.getElementById('ide-list');
 list.innerHTML = skelCards(3);
 gasCall('getIde', [], function(data) {
 if (!data || !data.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada ide masuk</div>'; return; }
 var stMap = {BARU:['badge-blue','Baru'], DITINJAU:['badge-gold','Ditinjau'], DITERIMA:['badge-green','Diterima'], DITOLAK:['badge-red','Ditolak']};
 list.innerHTML = data.map(function(ide) {
 var sm = stMap[ide.status] || ['badge-gray', ide.status];
 return '<div class="ide-card">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">'+
 '<div class="ide-title" style="flex:1;margin-right:8px">'+ide.judul+'</div>'+
 '<span class="badge '+sm[0]+'">'+sm[1]+'</span></div>'+
 '<div class="ide-meta">'+ide.nama+' · '+ide.bagian+' · '+ide.tgl+'</div>'+
 (ide.feedback ? '<div style="font-size:11px;color:var(--blue);margin-top:6px;font-style:italic"> '+ide.feedback+'</div>' : '')+
 '</div>';
 }).join('');
 }, function(){});
}

function submitIde() {
 var judul = document.getElementById('ide-judul').value.trim();
 var desk = document.getElementById('ide-deskripsi').value.trim();
 if (!judul || !desk) { showToast('Judul dan deskripsi wajib diisi'); return; }
 var btn = event.target;
 btn.textContent = 'Mengirim...'; btn.disabled = true;
 gasCall('addIde', [currentUser.id, currentUser.nama, judul, desk], function() {
 btn.textContent = 'Kirim Ide'; btn.disabled = false;
 document.getElementById('ide-judul').value = '';
 document.getElementById('ide-deskripsi').value = '';
 showToast('Ide berhasil dikirim! ');
 loadIde();
 }, function(){
 btn.textContent = 'Kirim Ide'; btn.disabled = false;
 showToast('Gagal. Coba lagi.');
 });
}

function loadKalender() {
 var list = document.getElementById('kalender-list');
 gasCall('getKalenderLibur', [], function(data) {
 if (!data || !data.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada hari libur</div>'; return; }
 list.innerHTML = data.map(function(l) {
 return '<div class="list-item" style="cursor:default">'+
 '<div class="list-icon" style="background:#fee2e2"></div>'+
 '<div class="list-info"><h4>'+l.nama+'</h4><p>'+l.tanggal+'</p></div>'+
 '<span class="badge badge-red">Difasilitasi</span></div>';
 }).join('');
 }, function(){});
}

function submitLibur() {
 var tgl = document.getElementById('libur-tgl').value;
 var nama = document.getElementById('libur-nama').value.trim();
 if (!tgl || !nama) { showToast('Tanggal dan nama wajib diisi'); return; }
 gasCall('addLibur', [tgl, nama, currentUser.nama], function() {
 document.getElementById('libur-tgl').value = '';
 document.getElementById('libur-nama').value = '';
 showToast('Hari libur berhasil ditambahkan!');
 loadKalender();
 }, function(){ showToast('Gagal. Coba lagi.'); });
}

function loadUsers() {
 var list = document.getElementById('users-list');
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Memuat...</div>';
 gasCall('getAllUsers', [], function(data) {
 if (!data || !data.length) { list.innerHTML = '<div class="empty-state">Tidak ada data</div>'; return; }
 var aktif = data.filter(function(u){ return u.status === 'AKTIF'; });
 var nonaktif = data.filter(function(u){ return u.status !== 'AKTIF'; });
 list.innerHTML =
 (aktif.length ? '<div class="section-label">Aktif</div>' + aktif.map(userCard).join('') : '') +
 (nonaktif.length ? '<div class="section-label" style="margin-top:12px">Nonaktif</div>' + nonaktif.map(userCard).join('') : '');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function userCard(u, i) {
 var ci = (i||0) % AVT_BG.length;
 var aksi = u.status === 'AKTIF'
 ? '<button class="btn btn-danger btn-sm" onclick="tendang(\''+u.id+'\',\''+esc(u.nama)+'\')">Nonaktifkan</button>'
 : '<span class="badge badge-gray">Nonaktif</span>';
 return '<div class="list-item" style="cursor:default">'+
 '<div class="avatar" style="background:'+AVT_BG[ci]+';color:'+AVT_TXT[ci]+'">'+initials(u.nama)+'</div>'+
 '<div class="list-info"><h4>'+u.nama+'</h4><p>'+u.jabatan+' · '+u.bagian+'</p></div>'+
 aksi+'</div>';
}

function tendang(userId, nama) {
 if (!confirm('Nonaktifkan akses '+nama+'?\nMereka tidak bisa login lagi.')) return;
 gasCall('nonaktifkanUser', [userId], function(){ showToast(nama+' berhasil dinonaktifkan'); loadUsers(); },
 function(){ showToast('Gagal. Coba lagi.'); });
}

function prosesAbsensi() {
 var btn = document.getElementById('proses-btn');
 var resultEl = document.getElementById('upload-result');
 var titleEl = document.getElementById('upload-result-title');
 var msgEl = document.getElementById('upload-result-msg');
 btn.textContent = 'Memproses... Harap tunggu';
 btn.disabled = true;
 resultEl.style.display = 'none';
 gasCall('processAbsensiUpload', [], function(r) {
 btn.textContent = 'Proses Data Absensi';
 btn.disabled = false;
 resultEl.style.display = 'block';
 if (r.success) {
 resultEl.style.cssText = 'display:block;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px;margin-bottom:10px';
 titleEl.style.color = '#166534'; titleEl.textContent = ' Berhasil!';
 msgEl.style.color = '#166534'; msgEl.textContent = r.msg;
 var oldUploadNotif = document.getElementById('finance-notif');
 if (oldUploadNotif) oldUploadNotif.style.display = 'none';
 } else {
 resultEl.style.cssText = 'display:block;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin-bottom:10px';
 titleEl.style.color = '#c2410c'; titleEl.textContent = ' Gagal';
 msgEl.style.color = '#92400e'; msgEl.textContent = r.msg;
 }
 }, function() {
 btn.textContent = 'Proses Data Absensi';
 btn.disabled = false;
 resultEl.style.cssText = 'display:block;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;margin-bottom:10px';
 document.getElementById('upload-result-title').textContent = ' Error';
 document.getElementById('upload-result-msg').textContent = 'Koneksi gagal. Coba lagi.';
 });
}

function loadLaporanAbsensi() {
 var list = document.getElementById('laporan-list');
 if (!cacheGet('getAllAbsensiRekap' + JSON.stringify([]))) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Memuat...</div>';
 }
 gasCall('getAllAbsensiRekap', [], function(result) {
 if (!result.data || !result.data.length) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada data absensi</div>'; return;
 }
 document.getElementById('laporan-minggu-label').textContent = 'Minggu ' + result.minggu;
 var stCls = {BAIK:'badge-green', KUNING:'badge-gold', ORANGE:'badge-orange', MERAH:'badge-red'};
 var grouped = {};
 result.data.forEach(function(d){ if (!grouped[d.bagian]) grouped[d.bagian] = []; grouped[d.bagian].push(d); });
 var html = '';
 Object.keys(grouped).forEach(function(bag) {
 html += '<div class="section-label">'+bag+'</div>';
 grouped[bag].forEach(function(d) {
 var lembur = (d.lemburMinggu > 0 ? ' · Lembur Minggu '+d.lemburMinggu+'x' : '') + (d.lemburLibur > 0 ? ' · Lembur Libur '+d.lemburLibur+'x' : '');
 html += '<div class="card" style="margin-bottom:8px;padding:12px">'+
 '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
 '<div style="font-size:13px;font-weight:600;color:var(--text-dark)">'+d.nama+'</div>'+
 '<span class="badge '+(stCls[d.status]||'badge-gray')+'">'+d.status+'</span></div>'+
 '<div style="font-size:11px;color:var(--text-muted)">Hadir '+d.hadir+'h · Telat '+d.telat+'x · Absen '+d.absen+'x'+lembur+'</div></div>';
 });
 });
 list.innerHTML = html;
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat laporan</div>'; });
}

// ─── KPI CHECK ───────────────────────────────────
var _kpiItems = [];

function loadKPICheck() {
 var el = document.getElementById('kpi-check-content');
 el.innerHTML = skelCards(4);
 var now = new Date();
 var weekStr = getWeekStrJS(now);
 document.getElementById('kpi-check-minggu').textContent = weekStr;
 _kpiItems = [];

 gasCall('getKPITemplate', [currentUser.jabatan], function(tmpl) {
 if (!tmpl || !tmpl.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada KPI untuk jabatan ini.<br><small>Hubungi owner untuk setup KPI.</small></div>';
 return;
 }
 // Cek laporan minggu ini
 gasCall('getKPILaporan', [currentUser.id], function(laporan) {
 var thisWeek = {};
 if (laporan && laporan.length) {
 var thisWeekData = laporan.find(function(l){ return l.minggu === weekStr; });
 if (thisWeekData) {
 thisWeekData.items.forEach(function(it){ thisWeek[it.kpiId] = it; });
 }
 }
 tmpl.forEach(function(k){ _kpiItems.push({ kpiId: k.id, indikator: k.indikator, keterangan: k.keterangan, selesai: thisWeek[k.id] ? thisWeek[k.id].selesai : null, catatan: thisWeek[k.id] ? thisWeek[k.id].catatan : '' }); });

 var html = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Centang KPI yang sudah kamu jalankan dengan baik minggu ini:</div>';
 html += tmpl.map(function(k, i) {
 var existing = thisWeek[k.id];
 var selesai = existing ? existing.selesai : null;
 var catatan = existing ? (existing.catatan||'') : '';
 return '<div class="kpi-check-item" id="kpi-item-'+i+'">'+
 '<div class="kpi-check-header">'+
 '<div class="kpi-check-no"><span class="kpi-star-symbol">&#9733;</span><small>'+(i+1)+'</small></div>'+
 '<div><div class="kpi-check-title">'+k.indikator+'</div>'+
 '<div class="kpi-check-desc">'+k.keterangan+'</div></div></div>'+
 '<div class="kpi-toggle">'+
 '<button class="kpi-btn kpi-btn-ya'+(selesai===true?' active':'')+'" onclick="setKPI('+i+',true)"> Sudah Dikerjakan</button>'+
 '<button class="kpi-btn kpi-btn-tidak'+(selesai===false?' active':'')+'" onclick="setKPI('+i+',false)"> Belum</button>'+
 '</div>'+
 '<textarea class="kpi-catatan'+(selesai!==null?' show':'')+'" id="kpi-cat-'+i+'" placeholder="Catatan singkat (wajib diisi)...">'+catatan+'</textarea>'+
 '</div>';
 }).join('');

 var sudahAdaLaporan = Object.keys(thisWeek).length > 0;
 html += '<button class="btn btn-primary" style="margin-top:4px" onclick="submitKPI()">'+
 (sudahAdaLaporan ? ' Perbarui Laporan KPI' : ' Kirim Laporan KPI')+'</button>';
 if (sudahAdaLaporan) {
 var selesaiCount = Object.values(thisWeek).filter(function(it){ return it.selesai; }).length;
 html = '<div style="background:#d1fae5;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#065f46"><b> Kamu sudah submit '+selesaiCount+'/'+tmpl.length+' KPI minggu ini.</b> Bisa diperbarui di sini.</div>' + html;
 }
 el.innerHTML = html;
 });
 });
}

function setKPI(idx, val) {
 _kpiItems[idx].selesai = val;
 var item = document.getElementById('kpi-item-'+idx);
 item.querySelector('.kpi-btn-ya').classList.toggle('active', val === true);
 item.querySelector('.kpi-btn-tidak').classList.toggle('active', val === false);
 item.querySelector('.kpi-catatan').classList.add('show');
}

function submitKPI() {
 var allSet = _kpiItems.every(function(it){ return it.selesai !== null; });
 if (!allSet) { showToast('Semua KPI harus diisi dulu'); return; }
 var allHasCatatan = _kpiItems.every(function(it, i){
 var cat = document.getElementById('kpi-cat-'+i);
 return cat && cat.value.trim().length >= 3;
 });
 if (!allHasCatatan) { showToast('Wajib isi catatan untuk setiap KPI'); return; }

 _kpiItems.forEach(function(it, i){
 var cat = document.getElementById('kpi-cat-'+i);
 it.catatan = cat ? cat.value.trim() : '';
 });

 var weekStr = getWeekStrJS(new Date());
 var btn = event.target;
 btn.textContent = 'Mengirim...'; btn.disabled = true;
 gasCall('submitKPILaporan', [currentUser.id, weekStr, _kpiItems], function(r) {
 btn.disabled = false;
 if (r.success) {
 showToast('KPI berhasil dikirim! ');
 cacheClear('getHomeData'+JSON.stringify([currentUser.id, currentUser.bagian]));
 goTo('s-home');
 } else {
 btn.textContent = ' Kirim Laporan KPI';
 showToast('Gagal kirim. Coba lagi.');
 }
 }, function(){
 btn.disabled = false;
 btn.textContent = ' Kirim Laporan KPI';
 showToast('Koneksi gagal.');
 });
}

function getWeekStrJS(date) {
 var d = new Date(date);
 d.setHours(0,0,0,0);
 d.setDate(d.getDate()+3-(d.getDay()+6)%7);
 var w1 = new Date(d.getFullYear(),0,4);
 var wn = 1+Math.round(((d-w1)/86400000-3+(w1.getDay()+6)%7)/7);
 return d.getFullYear()+'-W'+String(wn).padStart(2,'0');
}

// ─── PAPAN PERINGKAT ─────────────────────────────
function loadPapanPeringkat() {
 var el = document.getElementById('papan-content');
 el.innerHTML = skelCards(5);
 gasCall('getPapanPeringkat', [], function(data) {
 if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada data penilaian</div>'; return; }
 var html = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Diperbarui setiap tanggal 10. Berdasarkan KPI + kehadiran bulan lalu.</div>';
 html += data.map(function(d, i) {
 var rank = d.ranking || i+1;
 var rankClass = rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-other';
 var rankIcon = rank===1?'':rank===2?'':rank===3?'':'#'+rank;
 var stars = '';
 for (var si = 0; si < 5; si++) stars += '<span style="color:'+(si<d.bintang?'#c9971f':'#e2e8f0')+';font-size:14px">★</span>';
 var isSelf = d.id === currentUser.id;
 var apresiasiHtml = isSelf ? '<div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:3px">'+d.apresiasi+'</div>' : '';
 return '<div class="rank-card"'+(isSelf?' style="border:2px solid var(--blue);background:#f0f7ff"':'')+'>'+
 '<div class="rank-num '+rankClass+'">'+rankIcon+'</div>'+
 '<div class="avatar" style="background:'+AVT_BG[i%AVT_BG.length]+';color:'+AVT_TXT[i%AVT_TXT.length]+'">'+initials(d.nama)+'</div>'+
 '<div style="flex:1">'+
 '<div style="font-size:13px;font-weight:600;color:var(--text-dark)">'+d.nama+(isSelf?' <span style="font-size:10px;color:var(--blue)">(Kamu)</span>':'')+' </div>'+
 '<div style="font-size:11px;color:var(--text-muted)">'+d.jabatan+'</div>'+
 '<div>'+stars+'<span style="font-size:11px;color:var(--text-muted);margin-left:4px">'+d.skor+'/100</span></div>'+
 apresiasiHtml+
 '</div></div>';
 }).join('');
 el.innerHTML = html;
 }, function(){ el.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

// ─── GANTI PIN ───────────────────────────────────
function submitGantiPIN() {
 var lama = document.getElementById('pin-lama').value.trim();
 var baru = document.getElementById('pin-baru').value.trim();
 var konfirm = document.getElementById('pin-konfirm').value.trim();
 if (!lama || !baru || !konfirm) { showToast('Semua kolom wajib diisi'); return; }
 if (!baru) { showToast('Kata sandi tidak boleh kosong'); return; }
 if (baru !== konfirm) { showToast('Konfirmasi PIN tidak cocok'); return; }
 if (baru === 'hosela') { showToast('Kata sandi tidak boleh \'hosela\' (default)'); return; }
 var btn = event.target;
 btn.textContent = 'Menyimpan...'; btn.disabled = true;
 gasCall('gantiPIN', [currentUser.id, lama, baru], function(r) {
 btn.textContent = 'Simpan PIN Baru'; btn.disabled = false;
 if (r.success) {
 document.getElementById('pin-lama').value = '';
 document.getElementById('pin-baru').value = '';
 document.getElementById('pin-konfirm').value = '';
 showToast('PIN berhasil diubah! ');
 goTo('s-home');
 } else { showToast(r.msg || 'PIN lama tidak cocok'); }
 }, function(){
 btn.textContent = 'Simpan PIN Baru'; btn.disabled = false;
 showToast('Koneksi gagal');
 });
}

function submitPaksaGantiPIN() {
 var baru = document.getElementById('paksa-pin-baru').value.trim();
 var konfirm = document.getElementById('paksa-pin-konfirm').value.trim();
 if (!baru || !konfirm) { showToast('Semua kolom wajib diisi'); return; }
 if (baru !== konfirm) { showToast('Konfirmasi PIN tidak cocok'); return; }
 if (baru === 'hosela') { showToast('Kata sandi tidak boleh \'hosela\' (default)'); return; }
 var btn = event.target;
 btn.textContent = 'Menyimpan...'; btn.disabled = true;
 gasCall('gantiPIN', [currentUser.id, 'hosela', baru], function(r) {
 btn.textContent = 'Simpan & Masuk'; btn.disabled = false;
 if (r.success) {
 showToast('PIN berhasil dibuat! Selamat datang ');
 _navHistory = [];
 history.replaceState({ screen: 's-home' }, '', '#home');
 goTo('s-home');
 } else { showToast('Gagal menyimpan PIN. Coba lagi.'); }
 }, function(){
 btn.textContent = 'Simpan & Masuk'; btn.disabled = false;
 showToast('Koneksi gagal');
 });
}

// ─── IZIN / SAKIT ────────────────────────────────
function loadIzin() {
 // Set default tanggal hari ini
 var today = new Date().toISOString().split('T')[0];
 document.getElementById('izin-tanggal').value = today;
 // Load riwayat
 var hist = document.getElementById('izin-history');
 hist.innerHTML = skelCards(3);
 gasCall('getIzinKaryawan', [currentUser.id], function(data) {
 if (!data || !data.length) { hist.innerHTML = '<div class="empty-state">Belum ada pengajuan</div>'; return; }
 var stMap = { MENUNGGU: ['#f59e0b','#fff7ed'], DISETUJUI: ['#16a34a','#f0fdf4'], DITOLAK: ['#dc2626','#fff7f7'] };
 hist.innerHTML = data.map(function(d) {
 var st = stMap[d.status] || ['#6b7280','#f9fafb'];
 return '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">'+
 '<div><div style="font-size:12px;font-weight:600;color:var(--text-dark)">'+d.jenis+' · '+d.tanggal+'</div>'+
 '<div style="font-size:11px;color:var(--text-muted)">'+d.keterangan+'</div></div>'+
 '<span style="font-size:10px;background:'+st[1]+';color:'+st[0]+';padding:3px 8px;border-radius:10px;font-weight:700;flex-shrink:0">'+d.status+'</span></div>';
 }).join('');
 });
}

function submitIzin() {
 var tgl = document.getElementById('izin-tanggal').value;
 var jenis = document.getElementById('izin-jenis').value;
 var ket = document.getElementById('izin-keterangan').value.trim();
 var foto = document.getElementById('izin-foto').value.trim();
 if (!tgl) { showToast('Pilih tanggal dulu'); return; }
 if (!ket) { showToast('Keterangan wajib diisi'); return; }
 if (jenis === 'SAKIT' && !foto) { showToast('Surat dokter wajib untuk izin SAKIT'); return; }
 var btn = event.target;
 btn.textContent = 'Mengirim...'; btn.disabled = true;
 gasCall('submitIzin', [currentUser.id, tgl, jenis, ket, foto], function(r) {
 btn.textContent = 'Kirim Pengajuan'; btn.disabled = false;
 if (r.success) {
 document.getElementById('izin-keterangan').value = '';
 document.getElementById('izin-foto').value = '';
 showToast('Pengajuan berhasil dikirim! ');
 loadIzin();
 } else { showToast('Gagal mengirim. Coba lagi.'); }
 }, function(){ btn.textContent = 'Kirim Pengajuan'; btn.disabled = false; showToast('Koneksi gagal'); });
}

function hapusSemuaNotif() {
 if (!confirm('Hapus semua notifikasi?')) return;
 gasCall('hapusSemuaNotifikasi', [currentUser.id], function(r) {
 if (r && r.success) {
 document.getElementById('notif-list').innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada notifikasi</div>';
 updateNotifBadge(0);
 showToast('Semua notifikasi dihapus');
 }
 });
}

function hapusSemuaNotif() {
 if (!confirm('Hapus semua notifikasi?')) return;
 gasCall('hapusSemuaNotifikasi', [currentUser.id], function(r) {
 if (r && r.success) {
 document.getElementById('notif-list').innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada notifikasi</div>';
 updateNotifBadge(0);
 updateAllMenuBadges({});
 } else { showToast('Gagal menghapus'); }
 });
}

function toggleFotoField(jenis) {
 var fg = document.getElementById('foto-group');
 if (fg) fg.style.display = jenis === 'SAKIT' ? 'block' : 'none';
}

function switchKelolaTab(tab) {
 document.getElementById('kelola-izin-list').style.display = tab === 'izin' ? 'block' : 'none';
 document.getElementById('kelola-anomali-list').style.display = tab === 'anomali' ? 'block' : 'none';
 document.getElementById('tab-izin').style.cssText = 'flex:1;padding:12px;text-align:center;font-size:12px;cursor:pointer;font-weight:'+(tab==='izin'?'700':'600')+';color:'+(tab==='izin'?'var(--blue)':'var(--text-muted)')+';border-bottom:'+(tab==='izin'?'2px solid var(--blue)':'none');
 document.getElementById('tab-anomali').style.cssText = 'flex:1;padding:12px;text-align:center;font-size:12px;cursor:pointer;font-weight:'+(tab==='anomali'?'700':'600')+';color:'+(tab==='anomali'?'var(--blue)':'var(--text-muted)')+';border-bottom:'+(tab==='anomali'?'2px solid var(--blue)':'none');
 if (tab === 'anomali') loadAnomaliPending();
 else loadKelolaIzin();
}

function loadKelolaIzin() {
 var list = document.getElementById('kelola-izin-list');
 list.innerHTML = skelCards(3);
 gasCall('getIzinPending', [], function(data) {
 if (!data || !data.length) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada pengajuan yang menunggu</div>';
 return;
 }
 list.innerHTML = data.map(function(d) {
 var fotoHtml = d.linkFoto ? '<a href="'+d.linkFoto+'" target="_blank" style="font-size:11px;color:var(--blue);font-weight:600"> Lihat Surat Dokter</a>' : '';
 return '<div class="card" style="margin-bottom:10px">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
 '<div><div style="font-size:13px;font-weight:700;color:var(--text-dark)">'+d.nama+'</div>'+
 '<div style="font-size:11px;color:var(--text-muted)">'+d.jenis+' · '+d.tanggal+'</div>'+
 '<div style="font-size:12px;color:var(--text-dark);margin-top:4px">'+d.keterangan+'</div>'+
 (fotoHtml?'<div style="margin-top:4px">'+fotoHtml+'</div>':'')+
 '</div>'+
 '<span style="font-size:10px;background:#fff7ed;color:#f59e0b;padding:3px 8px;border-radius:10px;font-weight:700;flex-shrink:0">MENUNGGU</span></div>'+
 '<div style="display:flex;gap:8px">'+
 '<button class="btn btn-primary" style="flex:1;padding:8px;font-size:12px" onclick="prosesIzin(\''+d.id+'\',\'DISETUJUI\')"> Setujui</button>'+
 '<button class="btn" style="flex:1;padding:8px;font-size:12px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-weight:600;cursor:pointer" onclick="prosesIzin(\''+d.id+'\',\'DITOLAK\')"> Tolak</button>'+
 '</div></div>';
 }).join('');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function loadAnomaliPending() {
 var list = document.getElementById('kelola-anomali-list');
 list.innerHTML = skelCards(3);
 gasCall('getAnomaliPending', [], function(data) {
 if (!data || !data.length) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada tap anomali yang menunggu konfirmasi</div>';
 return;
 }
 list.innerHTML = data.map(function(d) {
 return '<div class="card" style="margin-bottom:10px;border-left:3px solid #f59e0b">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'+
 '<div><div style="font-size:13px;font-weight:700;color:var(--text-dark)">'+d.nama+'</div>'+
 '<div style="font-size:11px;color:var(--text-muted)">'+d.tanggal+' · Jam '+d.jam+'</div>'+
 '<div style="font-size:12px;color:#92400e;margin-top:4px;font-weight:600">'+d.tipe+'</div>'+
 '<div style="font-size:10px;color:var(--text-muted);margin-top:2px"> Deadline konfirmasi: '+d.deadline+'</div></div>'+
 '<span style="font-size:10px;background:#fff7ed;color:#f59e0b;padding:3px 8px;border-radius:10px;font-weight:700;flex-shrink:0">MENUNGGU</span></div>'+
 '<div style="display:flex;gap:8px">'+
 '<button class="btn btn-primary" style="flex:1;padding:8px;font-size:12px" onclick="prosesAnomali(\''+d.id+'\',\'NORMAL\')"> Normal (Hadir)</button>'+
 '<button class="btn" style="flex:1;padding:8px;font-size:12px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-weight:600;cursor:pointer" onclick="prosesAnomali(\''+d.id+'\',\'DENDA\')"> Kenakan Denda</button>'+
 '</div></div>';
 }).join('');
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function prosesAnomali(anomId, status) {
 var btn = event.target;
 btn.textContent = 'Memproses...'; btn.disabled = true;
 gasCall('konfirmasiAnomali', [anomId, status], function(r) {
 btn.disabled = false;
 if (r.success) {
 showToast(status === 'NORMAL' ? 'Dikonfirmasi hadir ' : 'Denda dikenakan ');
 loadAnomaliPending();
 } else { btn.textContent = status === 'NORMAL' ? ' Normal (Hadir)' : ' Kenakan Denda'; showToast('Gagal. Coba lagi.'); }
 }, function(){ btn.disabled = false; showToast('Koneksi gagal'); });
}

function prosesIzin(izinId, status) {
 var btn = event.target;
 var originalText = btn.textContent;
 btn.textContent = ' Memproses...';
 btn.disabled = true;
 // Disable tombol pasangan juga
 var parentDiv = btn.parentElement;
 if (parentDiv) parentDiv.querySelectorAll('button').forEach(function(b){ b.disabled = true; });
 gasCall('approveIzin', [izinId, status, currentUser.nama], function(r) {
 btn.disabled = false;
 if (parentDiv) parentDiv.querySelectorAll('button').forEach(function(b){ b.disabled = false; });
 if (r.success) {
 showToast(status === 'DISETUJUI' ? 'Izin disetujui ' : 'Izin ditolak ');
 loadKelolaIzin();
 } else {
 btn.textContent = originalText;
 showToast('Gagal. Coba lagi.');
 }
 }, function(){
 btn.textContent = originalText;
 btn.disabled = false;
 if (parentDiv) parentDiv.querySelectorAll('button').forEach(function(b){ b.disabled = false; });
 showToast('Koneksi gagal');
 });
}

// ─── NOTIFIKASI ───────────────────────────────────
function loadNotifikasi() {
 var list = document.getElementById('notif-list');
 list.innerHTML = skelCards(3);
 gasCall('getNotifikasi', [currentUser.id], function(data) {
 if (!data || !data.length) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada notifikasi</div>';
 updateNotifBadge(0); return;
 }
 var tipeStyle = {
 SP3: ['#7f1d1d','#fee2e2',''],
 SP2: ['#dc2626','#fff7f7',''],
 SP1: ['#f59e0b','#fffbeb',''],
 PERINGATAN: ['#f59e0b','#fffbeb',''],
 INFO: ['#0e4fa3','#dbeafe','']
 };
 list.innerHTML = data.map(function(n) {
 var st = tipeStyle[n.tipe] || ['#6b7280','#f9fafb',''];
 var opacity = n.dibaca ? 'opacity:0.6' : '';
 return '<div id="notif-'+n.id+'" style="border-left:3px solid '+st[0]+';background:'+st[1]+';border-radius:0 8px 8px 0;padding:12px;margin-bottom:8px;'+opacity+'">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
 '<div style="font-size:12px;font-weight:700;color:'+st[0]+';flex:1"'+(!n.dibaca?' onclick="bacaNotif(\''+n.id+'\')"':'')+'>'+st[2]+' '+n.judul+'</div>'+
 '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
 (!n.dibaca?'<div style="width:8px;height:8px;border-radius:50%;background:'+st[0]+'"></div>':'')+
 '<button onclick="hapusNotif(\''+n.id+'\')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:0 2px;opacity:0.5"></button>'+
 '</div></div>'+
 '<div style="font-size:11px;color:var(--text-dark);margin-top:4px">'+n.isi+'</div>'+
 '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">'+n.tgl+'</div>'+
 '</div>';
 }).join('');
 var belumDibaca = data.filter(function(n){ return !n.dibaca; }).length;
 updateNotifBadge(belumDibaca);
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function hapusNotif(id) {
 var el = document.getElementById('notif-'+id);
 if (el) { el.style.opacity = '0.3'; }
 gasCall('hapusNotifikasi', [id], function(r) {
 if (r && r.success && el) el.remove();
 else if (el) el.style.opacity = '1';
 });
}

function bacaNotif(id) {
 var el = document.getElementById('notif-'+id);
 if (el) el.style.opacity = '0.6';
 gasCall('tandaiDibaca', [id], function(){});
}


function updateNotifBadge(count) {
 // Update badge notifikasi umum
 _updateMenuBadge('Notifikasi', count);
}

function updateAllMenuBadges(countByMenu) {
 if (!countByMenu) return;
 // Map menu id ke label menu card
 var menuMap = {
 's-notifikasi': 'Notifikasi',
 's-izin': 'Izin / Sakit',
 's-papan-peringkat': 'Papan Peringkat',
 's-peraturan': 'Peraturan',
 's-kelola-izin': 'Kelola Izin'
 };
 Object.keys(menuMap).forEach(function(menuId) {
 var count = countByMenu[menuId] || 0;
 _updateMenuBadge(menuMap[menuId], count);
 });
}

function _updateMenuBadge(menuLabel, count) {
 document.querySelectorAll('.menu-card').forEach(function(card) {
 if (card.textContent.trim().startsWith(menuLabel) || card.querySelector('h3') && card.querySelector('h3').textContent === menuLabel) {
 var existing = card.querySelector('.menu-badge');
 if (existing) existing.remove();
 if (count > 0) {
 var badge = document.createElement('div');
 badge.className = 'menu-badge';
 badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px';
 badge.textContent = count > 9 ? '9+' : count;
 card.style.position = 'relative';
 card.appendChild(badge);
 }
 }
 });
}

function loadPeraturan() {
 var el = document.getElementById('peraturan-content');
 el.innerHTML = skelCards(4);
 // Tampilkan tombol notif hanya untuk Owner
 var notifBtn = document.getElementById('peraturan-notif-btn');
 if (notifBtn) notifBtn.style.display = (currentUser && currentUser.bagian === 'Owner') ? 'block' : 'none';
 gasCall('getPeraturan', [], function(data) {
 if (!data || !data.length) { el.innerHTML = '<div class="empty-state">Belum ada peraturan</div>'; return; }
 var grouped = {};
 var order = [];
 data.forEach(function(p) {
 if (!grouped[p.kategori]) { grouped[p.kategori] = []; order.push(p.kategori); }
 grouped[p.kategori].push(p);
 });
 var html = '';
 order.forEach(function(kat, ki) {
 html += '<div class="section-label"'+(ki>0?' style="margin-top:12px"':'')+'>'+kat+'</div>';
 grouped[kat].forEach(function(p) {
 var num = String(p.no).padStart(2,'0');
 html += '<div class="peraturan-item"><div class="peraturan-num">'+num+'</div><div class="peraturan-text">'+p.isi+'</div></div>';
 });
 });
 el.innerHTML = html;
 }, function(){ el.innerHTML = '<div class="empty-state">Gagal memuat peraturan</div>'; });
}

function kirimNotifPeraturan() {
 var ket = prompt('Keterangan peraturan yang diperbarui (opsional):') || 'Ada peraturan baru yang perlu dibaca dan dipahami.';
 if (ket === null) return; // user cancel
 var btn = document.querySelector('#peraturan-notif-btn button');
 if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; }
 gasCall('triggerNotifPeraturan', [ket], function(r) {
 if (btn) { btn.textContent = ' Kirim Notif Peraturan Baru ke Tim'; btn.disabled = false; }
 if (r && r.success) showToast('Notifikasi berhasil dikirim ke tim ');
 else showToast('Gagal kirim notifikasi');
 });
}

function openSideMenu() {
 var menu = document.getElementById('side-menu');
 var overlay = document.getElementById('side-menu-overlay');
 if (_sideMenuOpen) return;
 _sideMenuOpen = true;
 try { history.pushState({ sideMenu: true }, '', location.href); } catch(e) {}
 overlay.style.zIndex = '9000';
 menu.style.zIndex = '9001';
 menu.style.display = 'flex';
 overlay.style.display = 'block';
 setTimeout(function(){ menu.style.transform = 'translateX(0)'; }, 10);
 // Isi data user
 if (currentUser) {
 document.getElementById('sm-nama').textContent = currentUser.nama || '—';
 document.getElementById('sm-jabatan').textContent = currentUser.jabatan + ' · ' + currentUser.bagian;
 // Load email dari USERS
 gasCall('getPengaturan', [], function(cfg){ /* panduan link */ window._cfg = cfg||{}; });
 }
}

function closeSideMenu(fromHistory) {
 var menu = document.getElementById('side-menu');
 var overlay = document.getElementById('side-menu-overlay');
 if (!_sideMenuOpen && (!menu || menu.style.display === 'none')) return;
 if (!fromHistory && _sideMenuOpen) {
 try { history.back(); } catch(e) {}
 return;
 }
 _sideMenuOpen = false;
 menu.style.transform = 'translateX(100%)';
 overlay.style.display = 'none';
 setTimeout(function(){ menu.style.display = 'none'; }, 280);
}

function openPanduan() {
 closeSideMenu();
 var link = (window._cfg && window._cfg['LINK_PANDUAN']) || '';
 if (link) { window.open(link, '_blank'); }
 else { showToast('Link panduan belum diset di sheet PENGATURAN'); }
}

function bukaEmailSettings() {
 var form = document.getElementById('sm-email-form');
 form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function simpanEmail() {
 var email = document.getElementById('sm-email-input').value.trim();
 if (!email || !email.includes('@')) { showToast('Email tidak valid'); return; }
 gasCall('updateEmail', [currentUser.id, email], function(r) {
 if (r.success) {
 document.getElementById('sm-email').textContent = email;
 document.getElementById('sm-email-form').style.display = 'none';
 showToast('Email berhasil disimpan ');
 } else { showToast('Gagal simpan email'); }
 });
}

function doLogout() {
 if (!confirm('Yakin ingin logout?')) return;
 closeSideMenu();
 currentUser = null;
 _homeLoaded = false;
 _homeLoadedUserId = '';
 _prefetchStarted = false;
 clearLoginSession();
 localStorage.removeItem('hh_username');
 goTo('s-login');
 document.getElementById('login-password').value = '';
}

// ─── REWARD & PENALTY MANUAL ─────────────────────
function loadSanksiManual() {
 // Load karyawan list
 var sel = document.getElementById('sanksi-user');
 sel.innerHTML = '<option value="">Pilih karyawan...</option>';
 gasCall('getAllUsers', [], function(users) {
 if (!users) return;
 users.filter(function(u){ return u.status === 'AKTIF' && u.bagian !== 'Owner' && u.bagian !== 'Finance'; })
 .forEach(function(u) {
 var opt = document.createElement('option');
 opt.value = u.id; opt.textContent = u.nama + ' (' + u.jabatan + ')';
 sel.appendChild(opt);
 });
 });
 // Load riwayat
 var hist = document.getElementById('sanksi-history');
 hist.innerHTML = skelCards(3);
 gasCall('getSanksiManual', [], function(data) {
 if (!data || !data.length) { hist.innerHTML = '<div class="empty-state">Belum ada data</div>'; return; }
 hist.innerHTML = data.map(function(s) {
 var isDenda = s.tipe === 'DENDA_MANUAL';
 var color = isDenda ? '#dc2626' : '#065f46';
 var label = isDenda ? ' Penalty' : ' Reward';
 return '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid '+(isDenda?'#dc2626':'#22c55e')+'">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
 '<div><div style="font-size:11px;font-weight:700;color:'+color+'">'+label+' · '+s.nama+'</div>'+
 '<div style="font-size:10px;color:var(--text-muted)">'+s.tgl+'</div>'+
 '<div style="font-size:11px;color:var(--text-dark);margin-top:2px">'+s.keterangan+'</div></div>'+
 '<div style="text-align:right;flex-shrink:0;margin-left:8px">'+
 '<div style="font-size:13px;font-weight:800;color:'+color+'">'+(isDenda?'-':'+')+'Rp '+parseInt(s.nominal).toLocaleString('id-ID')+'</div>'+
 '<button onclick="batalkanSanksi(\''+s.id+'\')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;margin-top:4px">Batalkan</button>'+
 '</div></div></div>';
 }).join('');
 }, function(){ hist.innerHTML = '<div class="empty-state">Gagal memuat</div>'; });
}

function submitSanksiManual() {
 var userId = document.getElementById('sanksi-user').value;
 var tipe = document.getElementById('sanksi-tipe').value;
 var nominal = document.getElementById('sanksi-nominal').value;
 var ket = document.getElementById('sanksi-keterangan').value.trim();
 if (!userId) { showToast('Pilih karyawan dulu'); return; }
 if (!nominal || parseInt(nominal) <= 0) { showToast('Nominal harus lebih dari 0'); return; }
 if (!ket) { showToast('Keterangan wajib diisi'); return; }
 var btn = event.target;
 btn.textContent = ' Memproses...'; btn.disabled = true;
 // Real-time: tidak ada tanggal manual — backend pakai timestamp sekarang
 gasCall('addSanksiManual', [currentUser.nama, userId, tipe, nominal, ket], function(r) {
 btn.textContent = 'Terapkan'; btn.disabled = false;
 if (r.success) {
 document.getElementById('sanksi-nominal').value = '';
 document.getElementById('sanksi-keterangan').value = '';
 document.getElementById('sanksi-user').value = '';
 showToast((tipe==='DENDA_MANUAL'?' Penalty':' Reward')+' berhasil diterapkan ');
 loadSanksiManual();
 } else { showToast('Gagal. Coba lagi.'); }
 }, function(){ btn.textContent = 'Terapkan'; btn.disabled = false; showToast('Koneksi gagal'); });
}

function batalkanSanksi(id) {
 if (!confirm('Batalkan ini?')) return;
 gasCall('batalSanksiManual', [id], function(r) {
 if (r.success) { showToast('Dibatalkan '); loadSanksiManual(); }
 else showToast(r.msg || 'Gagal membatalkan');
 });
}

// ─── REKAP BULANAN ───────────────────────────────
// Absensi kamera disimpan terpisah dulu agar tidak mengubah rekap fingerprint lama.
var _attendanceStream = null;
var _attendancePhotoData = '';
var _attendanceLocation = null;
var _attendanceSubmitting = false;

function loadAbsensiCamera() {
 _attendancePhotoData = '';
 _attendanceLocation = null;
 var video = document.getElementById('attendance-video');
 var img = document.getElementById('attendance-photo-preview');
 var placeholder = document.getElementById('attendance-camera-placeholder');
 var submitBtn = document.getElementById('attendance-submit-btn');
 var captureBtn = document.getElementById('camera-capture-btn');
 if (video) video.style.display = 'block';
 if (img) { img.style.display = 'none'; img.removeAttribute('src'); }
 if (placeholder) { placeholder.style.display = 'flex'; placeholder.textContent = 'Kamera belum aktif'; }
 if (submitBtn) submitBtn.disabled = true;
 if (captureBtn) captureBtn.disabled = true;
 updateAttendanceLocationStatus('Membaca lokasi...', '');
 getAttendanceLocation();
 loadAttendanceToday();
}

function getAttendanceLocation() {
 if (!navigator.geolocation) { updateAttendanceLocationStatus('Browser tidak mendukung lokasi.', 'bad'); return; }
 var triedFastFallback = false;
 var watchId = null;
 var done = false;
 function acceptPosition(pos) {
 if (done || !pos || !pos.coords) return;
 done = true;
 if (watchId !== null) navigator.geolocation.clearWatch(watchId);
 _attendanceLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy || 0 };
 updateAttendanceLocationStatus('Lokasi terbaca. Akurasi sekitar '+Math.round(_attendanceLocation.accuracy)+' meter.', 'ok');
 syncAttendanceSubmitState();
 }
 function locationErrorMessage(err) {
 if (err && err.code === 1) return 'Akses lokasi ditolak. Buka izin lokasi Chrome dan pilih Izinkan.';
 if (err && err.code === 2) return 'Sinyal lokasi belum tersedia. Aktifkan GPS dan coba lagi.';
 if (err && err.code === 3) return 'GPS terlalu lama merespons. Coba dekat jendela atau matikan-nyalakan lokasi.';
 return 'Gagal membaca lokasi. Pastikan GPS aktif dan izin lokasi Chrome sudah diizinkan.';
 }
 function failLocation(err) {
 if (!triedFastFallback) {
 triedFastFallback = true;
 updateAttendanceLocationStatus('GPS belum stabil, mencoba mode cepat...', '');
 navigator.geolocation.getCurrentPosition(acceptPosition, failLocation, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
 return;
 }
 if (watchId === null && !done) {
 updateAttendanceLocationStatus('Menunggu sinyal GPS...', '');
 watchId = navigator.geolocation.watchPosition(acceptPosition, function(watchErr) {
 if (!done) updateAttendanceLocationStatus(locationErrorMessage(watchErr), 'bad');
 }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
 setTimeout(function() {
 if (!done) {
 if (watchId !== null) navigator.geolocation.clearWatch(watchId);
 updateAttendanceLocationStatus(locationErrorMessage(err), 'bad');
 }
 }, 15000);
 return;
 }
 updateAttendanceLocationStatus(locationErrorMessage(err), 'bad');
 }
 navigator.geolocation.getCurrentPosition(acceptPosition, failLocation, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

function updateAttendanceLocationStatus(text, state) {
 var el = document.getElementById('attendance-location-status');
 if (!el) return;
 el.className = 'camera-status' + (state ? ' ' + state : '');
 el.textContent = text;
}

function startAttendanceCamera() {
 var video = document.getElementById('attendance-video');
 var placeholder = document.getElementById('attendance-camera-placeholder');
 if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
 if (placeholder) placeholder.textContent = 'Browser tidak mendukung kamera.';
 return;
 }
 navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 900 }, height: { ideal: 1200 } }, audio: false })
 .then(function(stream) {
 _attendanceStream = stream;
 if (video) { video.srcObject = stream; video.style.display = 'block'; }
 if (placeholder) placeholder.style.display = 'none';
 var captureBtn = document.getElementById('camera-capture-btn');
 if (captureBtn) captureBtn.disabled = false;
 })
 .catch(function() {
 if (placeholder) { placeholder.style.display = 'flex'; placeholder.textContent = 'Akses kamera ditolak.'; }
 });
}

function captureAttendancePhoto() {
 var video = document.getElementById('attendance-video');
 var canvas = document.getElementById('attendance-canvas');
 var img = document.getElementById('attendance-photo-preview');
 if (!video || !canvas || !video.videoWidth) { showToast('Kamera belum siap'); return; }
 var scale = Math.min(1, 720 / video.videoWidth);
 canvas.width = Math.round(video.videoWidth * scale);
 canvas.height = Math.round(video.videoHeight * scale);
 var ctx = canvas.getContext('2d');
 ctx.save();
 if (CAMERA_UNMIRROR) {
 ctx.translate(canvas.width, 0);
 ctx.scale(-1, 1);
 }
 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
 ctx.restore();
 _attendancePhotoData = canvas.toDataURL('image/jpeg', 0.58);
 if (img) { img.src = _attendancePhotoData; img.style.display = 'block'; }
 video.style.display = 'none';
 stopAttendanceCamera();
 syncAttendanceSubmitState();
}

function stopAttendanceCamera() {
 if (_attendanceStream) {
 _attendanceStream.getTracks().forEach(function(t){ t.stop(); });
 _attendanceStream = null;
 }
}

function syncAttendanceSubmitState() {
 var btn = document.getElementById('attendance-submit-btn');
 if (btn) btn.disabled = !(_attendancePhotoData && _attendanceLocation);
}

function submitAttendanceCamera() {
 if (_attendanceSubmitting) return;
 if (!_attendancePhotoData) { showToast('Ambil foto dulu'); return; }
 if (!_attendanceLocation) { showToast('Lokasi belum terbaca'); getAttendanceLocation(); return; }
 var btn = document.getElementById('attendance-submit-btn');
 var tipe = document.getElementById('attendance-type').value;
 _attendanceSubmitting = true;
 if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; btn.classList.add('btn-loading'); }
 updateAttendanceLocationStatus('Mengirim absensi '+tipe.toLowerCase()+'. Mohon tunggu...', '');
 showToast('Absensi sedang dikirim...');
 function resetAttendanceButton() {
 _attendanceSubmitting = false;
 if (btn) { btn.textContent = 'Kirim Absensi'; btn.disabled = false; btn.classList.remove('btn-loading'); }
 }
 function doSubmitAttendance() {
 if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; btn.classList.add('btn-loading'); }
 gasCall('submitAbsensiCamera', [currentUser.id, currentUser.nama, tipe, _attendancePhotoData, _attendanceLocation.lat, _attendanceLocation.lng, _attendanceLocation.accuracy, new Date().toISOString()], function(res) {
 finishAttendanceSubmit(res);
 }, function() {
 gasCall('getAbsensiCameraToday', [currentUser.id], function(check) {
 var latest = check && check.data && check.data[0];
 if (latest) {
 finishAttendanceSubmit({
 success: latest.status === 'DITERIMA',
 status: latest.status,
 distance: latest.distance || latest.jarak || 0,
 radius: latest.radius || 0,
 msg: latest.catatan || (latest.status === 'DITERIMA' ? 'Absensi diterima' : 'Absensi ditolak')
 });
 return;
 }
 resetAttendanceButton();
 updateAttendanceLocationStatus('Absensi dikirim. Status belum tersinkron, tarik layar untuk memuat ulang.', '');
 showToast('Absensi sedang diproses');
 loadAttendanceToday();
 }, function() {
 resetAttendanceButton();
 updateAttendanceLocationStatus('Absensi dikirim. Status belum tersinkron, tarik layar untuk memuat ulang.', '');
 showToast('Absensi sedang diproses');
 loadAttendanceToday();
 });
 });
 }
 function finishAttendanceSubmit(res) {
 resetAttendanceButton();
 if (!res || res.success === false) {
 updateAttendanceLocationStatus((res && res.msg) || 'Absensi ditolak.', 'bad');
 showToast((res && res.msg) || 'Absensi gagal');
 loadAttendanceToday();
 return;
 }
 updateAttendanceLocationStatus('Absensi diterima. Jarak kantor: '+Math.round(res.distance || 0)+' meter.', 'ok');
 var bulanKey = attendanceMonthKey(new Date());
 clearAttendanceMatrixCache(currentUser.id, bulanKey);
 showToast('Absensi diterima. Catatan kehadiran diperbarui.');
 _attendancePhotoData = '';
 syncAttendanceSubmitState();
 loadAttendanceToday();
 refreshAttendanceMatrixIfOpen(currentUser.id, bulanKey);
 }
 setTimeout(doSubmitAttendance, 0);
}

function loadAttendanceToday() {
 var el = document.getElementById('attendance-today');
 if (!el || !currentUser) return;
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Memuat...</div>';
 gasCall('getAbsensiCameraToday', [currentUser.id], function(res) {
 var data = (res && res.data) || [];
 if (!data.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada absensi kamera hari ini</div>';
 return;
 }
 el.innerHTML = data.map(function(r) {
 return '<div class="attendance-row"><div><b>'+r.tipe+'</b><div style="color:var(--text-muted);margin-top:2px">'+r.jam+'</div></div><span class="badge '+(r.status==='DITERIMA'?'badge-green':'badge-red')+'">'+r.status+'</span></div>';
 }).join('');
 }, function() { el.innerHTML = '<div class="empty-state">Gagal memuat status hari ini</div>'; });
}

var _ownerAbsensiCache = {};

function toggleOwnerRekapDetail(userId, bulanKey, targetId, btnId) {
 var target = document.getElementById(targetId);
 var btn = document.getElementById(btnId);
 if (!target || !btn) return;
 if (!userId) {
 showToast('ID karyawan tidak ditemukan di data rekap');
 return;
 }
 if (target.style.display === 'block') {
 target.style.display = 'none';
 btn.textContent = 'Lihat Detail';
 return;
 }
 target.style.display = 'block';
 btn.textContent = 'Tutup Detail';

 var cacheKey = userId;
 if (_ownerAbsensiCache[cacheKey]) {
 target.innerHTML = renderAbsensiDetailHtml(_ownerAbsensiCache[cacheKey], bulanKey, targetId);
 return;
 }

 target.innerHTML = skelCards(2);
 gasCall('getAbsensiRekap', [userId], function(res) {
 _ownerAbsensiCache[cacheKey] = res;
 target.innerHTML = renderAbsensiDetailHtml(res, bulanKey, targetId);
 }, function() {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Gagal memuat detail absensi</div>';
 });
}

function filterOwnerRekap() {
 var input = document.getElementById('rekap-search');
 var q = input ? input.value.trim().toLowerCase() : '';
 document.querySelectorAll('.owner-rekap-card').forEach(function(card) {
 card.style.display = !q || card.textContent.toLowerCase().indexOf(q) !== -1 ? 'block' : 'none';
 });
}

function loadRekapBulanan() {
 // Isi dropdown bulan kalau belum
 var sel = document.getElementById('rekap-bulan-sel');
 if (sel.options.length === 0) {
 var now = new Date();
 for (var i = 0; i < 6; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
 var bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 var label = bulanNames[d.getMonth()] + ' ' + d.getFullYear();
 var opt = document.createElement('option');
 opt.value = key; opt.textContent = label;
 if (i === 0) opt.selected = true;
 sel.appendChild(opt);
 }
 }
 var bulanKey = sel.value;
 var el = document.getElementById('rekap-bulanan-content');
 var cachedKey = 'getRekapBulananSemua' + JSON.stringify([bulanKey]);
 var hasCachedRekap = !!cacheGet(cachedKey);
 if (!hasCachedRekap) {
 el.innerHTML = skelCards(4);
 }

 gasCall('getRekapBulananSemua', [bulanKey], function(res) {
 if (!res || !res.data || !res.data.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada data bulan ini</div>';
 return;
 }
 var data = res.data;
 // Summary cards
 var totalHadir = data.reduce(function(s,r){ return s+r.hadir; }, 0);
 var totalAbsen = data.reduce(function(s,r){ return s+r.absen; }, 0);
 var totalDenda = data.reduce(function(s,r){ return s+r.totalDenda; }, 0);
 var totalReward = data.reduce(function(s,r){ return s+r.totalReward+r.bonusKerajinan; }, 0);

 var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
 html += '<div class="card" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--green)">'+totalHadir+'</div><div style="font-size:11px;color:var(--text-muted)">Total Hadir</div></div>';
 html += '<div class="card" style="padding:10px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--red)">'+totalAbsen+'</div><div style="font-size:11px;color:var(--text-muted)">Total Absen</div></div>';
 html += '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:800;color:#dc2626">Rp '+totalDenda.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Total Denda</div></div>';
 html += '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:800;color:#16a34a">Rp '+totalReward.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Total Reward</div></div>';
 html += '</div>';

 // Tabel per karyawan
 data.forEach(function(r) {
 var bintangStr = ''.repeat(Math.max(0, r.bintang||0));
 var netDenda = r.totalDenda;
 var netReward = r.totalReward + r.bonusKerajinan;
 var userId = r.id || r.userId || r.user_id || r.ID || '';
 var safeId = String(userId || r.nama || '').replace(/[^a-zA-Z0-9_-]/g, '');
 var detailId = 'owner-rekap-detail-' + safeId + '-' + bulanKey;
 var btnId = 'owner-rekap-btn-' + safeId + '-' + bulanKey;
 html += '<div class="card owner-rekap-card" style="margin-bottom:8px;padding:12px">';
 html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
 html += '<div><div style="font-weight:700;font-size:13px">'+r.nama+'</div><div style="font-size:11px;color:var(--text-muted)">'+r.jabatan+' · '+r.bagian+'</div></div>';
 html += '<div style="text-align:right"><div style="font-size:14px">'+bintangStr+'</div><div style="font-size:10px;color:var(--text-muted)">'+r.skor+'/100</div></div>';
 html += '</div>';
 html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">';
 html += '<div style="text-align:center;background:#f0fdf4;border-radius:6px;padding:6px"><div style="font-size:14px;font-weight:700;color:#16a34a">'+r.hadir+'</div><div style="font-size:9px;color:var(--text-muted)">Hadir</div></div>';
 html += '<div style="text-align:center;background:#fef3c7;border-radius:6px;padding:6px"><div style="font-size:14px;font-weight:700;color:#d97706">'+r.telat+'</div><div style="font-size:9px;color:var(--text-muted)">Telat</div></div>';
 html += '<div style="text-align:center;background:#fee2e2;border-radius:6px;padding:6px"><div style="font-size:14px;font-weight:700;color:#dc2626">'+r.absen+'</div><div style="font-size:9px;color:var(--text-muted)">Absen</div></div>';
 html += '<div style="text-align:center;background:#ede9fe;border-radius:6px;padding:6px"><div style="font-size:14px;font-weight:700;color:#7c3aed">'+(r.lemburMinggu+r.lemburLibur)+'</div><div style="font-size:9px;color:var(--text-muted)">Lembur</div></div>';
 html += '</div>';
 if (netDenda > 0) html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#dc2626;padding:4px 0;border-top:1px solid var(--gray-border)"><span> Estimasi Denda</span><span style="font-weight:700">- Rp '+netDenda.toLocaleString('id-ID')+'</span></div>';
 if (netReward > 0) html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#16a34a;padding:4px 0;border-top:1px solid var(--gray-border)"><span> Estimasi Reward</span><span style="font-weight:700">+ Rp '+netReward.toLocaleString('id-ID')+'</span></div>';
 html += '<button id="'+btnId+'" class="btn btn-sm btn-primary" style="margin-top:10px;width:100%;border-radius:9px" onclick="toggleOwnerRekapDetail(\''+userId+'\',\''+bulanKey+'\',\''+detailId+'\',\''+btnId+'\')">Lihat Detail</button>';
 html += '<div id="'+detailId+'" style="display:none"></div>';
 html += '</div>';
 });

 el.innerHTML = html;
 filterOwnerRekap();
 }, function() {
 el.innerHTML = '<div class="empty-state">Gagal memuat data</div>';
 });
}

var _attendanceMatrixCache = {};
var _attendanceMatrixCanEdit = false;

function attendanceMonthKey(dateObj) {
 dateObj = dateObj || new Date();
 return dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
}

function clearAttendanceMatrixCache(userId, bulanKey) {
 bulanKey = bulanKey || attendanceMonthKey(new Date());
 Object.keys(_attendanceMatrixCache).forEach(function(key) {
 if (key === 'all:' + bulanKey || key === String(userId) + ':' + bulanKey) delete _attendanceMatrixCache[key];
 });
 cacheClear('getAbsensiMatrix' + JSON.stringify([bulanKey]));
 if (userId) cacheClear('getAbsensiMatrixUser' + JSON.stringify([userId, bulanKey]));
}

function refreshAttendanceMatrixIfOpen(userId, bulanKey) {
 clearAttendanceMatrixCache(userId, bulanKey);
 var active = document.querySelector('.screen.active');
 if (active && active.id === 's-catatan-kehadiran') loadAttendanceMatrix(true);
}

function fillAttendanceMonthSelect() {
 var sel = document.getElementById('att-matrix-bulan');
 if (!sel || sel.options.length) return;
 var now = new Date();
 var names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 for (var i = 0; i < 6; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
 var opt = document.createElement('option');
 opt.value = key;
 opt.textContent = names[d.getMonth()] + ' ' + d.getFullYear();
 sel.appendChild(opt);
 }
}

function loadAttendanceMatrix(force) {
 if (!currentUser) return;
 fillAttendanceMonthSelect();
 var sel = document.getElementById('att-matrix-bulan');
 var bulanKey = sel ? sel.value : '';
 var el = document.getElementById('att-matrix-content');
 var summary = document.getElementById('att-matrix-summary');
 _attendanceMatrixCanEdit = currentUser.bagian === 'Owner' || currentUser.bagian === 'Finance';
 if (!el) return;
 if (summary) summary.innerHTML = '';
 var cacheKey = (_attendanceMatrixCanEdit ? 'all' : currentUser.id) + ':' + bulanKey;
 if (!force && _attendanceMatrixCache[cacheKey]) {
 renderAttendanceMatrix(_attendanceMatrixCache[cacheKey]);
 return;
 }
 el.innerHTML = skelCards(5);
 var action = _attendanceMatrixCanEdit ? 'getAbsensiMatrix' : 'getAbsensiMatrixUser';
 var args = _attendanceMatrixCanEdit ? [bulanKey] : [currentUser.id, bulanKey];
 gasCall(action, args, function(res) {
 if (!res || !res.success) {
 var msg = res && (res.msg || res.error) ? (res.msg || res.error) : 'Gagal memuat catatan kehadiran';
 if (msg.indexOf('Unknown action') !== -1) msg = 'Endpoint Catatan Kehadiran belum ada di GAS. Paste dan deploy Code.gs terbaru dulu.';
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>'+msg+'</div>';
 return;
 }
 _attendanceMatrixCache[cacheKey] = res;
 renderAttendanceMatrix(res);
 }, function() {
 el.innerHTML = '<div class="empty-state">Koneksi gagal saat memuat catatan</div>';
 });
}

function renderAttendanceMatrix(res) {
 var el = document.getElementById('att-matrix-content');
 var summary = document.getElementById('att-matrix-summary');
 if (!el) return;
 var users = res.users || [];
 if (summary) {
 summary.innerHTML =
 '<div class="attendance-summary-grid">'+
 '<div class="card"><b>'+users.length+'</b><span>Karyawan</span></div>'+
 '<div class="card"><b>'+((res.totalMasuk||0)+(res.totalPulang||0))+'</b><span>Total Tap</span></div>'+
 '</div>'+
 (_attendanceMatrixCanEdit ? '<div class="attendance-action-row"><button class="btn btn-gold attendance-import-btn" onclick="importAttendanceUploadToApp()">Import Fingerprint</button><button class="btn btn-primary attendance-process-btn" onclick="processAttendanceAppRecap()">Proses ke Rekap Resmi</button></div>' : '');
 }
 if (!users.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada data absensi bulan ini</div>';
 return;
 }
 var monthParts = String(res.bulan || '').split('-');
 var year = parseInt(monthParts[0], 10);
 var month = parseInt(monthParts[1], 10);
 var firstDay = new Date(year, month - 1, 1).getDay();
 var leadingBlank = (firstDay + 6) % 7; // Monday-first calendar
 var dayNames = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
 var html = users.map(function(u) {
 var days = '';
 dayNames.forEach(function(name) {
 days += '<div class="att-weekday">'+name+'</div>';
 });
 for (var b = 0; b < leadingBlank; b++) {
 days += '<div class="att-day att-blank"></div>';
 }
 for (var d = 1; d <= res.days; d++) {
 var item = (u.days && u.days[d]) || {};
 var masuk = item.masuk || '';
 var pulang = item.pulang || '';
 var statusClass = '';
 var statusSymbol = '&middot;';
 var statusTitle = 'Belum ada data';
 if (item.anomali) {
 statusClass = ' anomaly';
 statusSymbol = '!';
 statusTitle = 'Tap anomali';
 } else if (item.rejected) {
 statusClass = ' rejected';
 statusSymbol = '&times;';
 statusTitle = 'Ditolak';
 } else if (item.absen) {
 statusClass = ' absent';
 statusSymbol = 'A';
 statusTitle = 'Absen';
 } else if (item.lembur) {
 statusClass = ' filled overtime';
 statusSymbol = '+';
 statusTitle = 'Lembur';
 } else if (masuk && pulang) {
 statusClass = item.telat ? ' filled late' : ' filled complete';
 statusSymbol = item.telat ? '!' : '&#10003;';
 statusTitle = item.telat ? 'Telat' : 'Lengkap';
 } else if (masuk) {
 statusClass = ' filled partial';
 statusSymbol = '&hellip;';
 statusTitle = 'Belum pulang';
 } else if (pulang) {
 statusClass = ' filled partial';
 statusSymbol = '?';
 statusTitle = 'Tanpa masuk';
 }
 var dateObj = new Date(year, month - 1, d);
 if (dateObj.getDay() === 0) statusClass += ' sunday';
 var click = _attendanceMatrixCanEdit ? ' onclick="openAttendanceEdit(&quot;'+u.id+'&quot;,&quot;'+esc(u.nama)+'&quot;,&quot;'+res.bulan+'&quot;,'+d+',&quot;'+esc(masuk)+'&quot;,&quot;'+esc(pulang)+'&quot;)"' : '';
 days += '<button class="att-day'+statusClass+'" title="'+statusTitle+'"'+click+(_attendanceMatrixCanEdit?'':' type="button"')+'>'+
 '<span>'+d+'</span><small>'+(masuk ? masuk.substring(0,5) : '-')+'</small><small>'+(pulang ? pulang.substring(0,5) : '-')+'</small><em>'+statusSymbol+'</em></button>';
 }
 return '<div class="card att-user-card" data-search="'+(u.nama+' '+u.bagian+' '+u.jabatan).toLowerCase()+'">'+
 '<div class="att-user-head"><div><b>'+u.nama+'</b><p>'+u.jabatan+' · '+u.bagian+'</p></div><span>'+u.id+'</span></div>'+
 '<div class="att-grid">'+days+'</div>'+
 '</div>';
 }).join('');
 el.innerHTML = html;
 filterAttendanceMatrix();
}

function filterAttendanceMatrix() {
 var input = document.getElementById('att-matrix-search');
 var q = input ? input.value.toLowerCase().trim() : '';
 document.querySelectorAll('.att-user-card').forEach(function(card) {
 card.style.display = !q || (card.getAttribute('data-search') || '').indexOf(q) !== -1 ? 'block' : 'none';
 });
}

function openAttendanceEdit(userId, nama, bulanKey, day, masuk, pulang) {
 if (!_attendanceMatrixCanEdit) return;
 var tanggal = bulanKey + '-' + String(day).padStart(2,'0');
 var html =
 '<div class="att-modal-backdrop" id="att-edit-modal">'+
 '<div class="att-modal">'+
 '<h3>Edit Kehadiran</h3>'+
 '<p>'+nama+' · '+tanggal+'</p>'+
 '<label>Jam Masuk</label><input class="form-input" id="att-edit-masuk" type="time" value="'+(masuk ? masuk.substring(0,5) : '')+'">'+
 '<label>Jam Pulang</label><input class="form-input" id="att-edit-pulang" type="time" value="'+(pulang ? pulang.substring(0,5) : '')+'">'+
 '<label>Catatan</label><input class="form-input" id="att-edit-note" placeholder="Contoh: koreksi manual Finance">'+
 '<div style="display:flex;gap:8px;margin-top:14px">'+
 '<button class="btn" id="att-edit-cancel" style="background:#eef2f6;color:#344054" onclick="closeAttendanceEdit()">Batal</button>'+
 '<button class="btn btn-primary" id="att-edit-save" onclick="saveAttendanceEdit(&quot;'+userId+'&quot;,&quot;'+tanggal+'&quot;)">Simpan</button>'+
 '<div id="att-edit-status" style="display:none;width:100%;font-size:12px;color:var(--text-muted);margin-top:2px;text-align:center">Menyimpan koreksi...</div>'+
 '</div></div></div>';
 document.body.insertAdjacentHTML('beforeend', html);
}

function closeAttendanceEdit() {
 var m = document.getElementById('att-edit-modal');
 if (m) m.remove();
}

function saveAttendanceEdit(userId, tanggal) {
 var masuk = document.getElementById('att-edit-masuk').value;
 var pulang = document.getElementById('att-edit-pulang').value;
 var note = document.getElementById('att-edit-note').value || '';
 var saveBtn = document.getElementById('att-edit-save');
 var cancelBtn = document.getElementById('att-edit-cancel');
 var statusEl = document.getElementById('att-edit-status');
 if (saveBtn) { saveBtn.textContent = 'Menyimpan...'; saveBtn.disabled = true; saveBtn.classList.add('btn-loading'); }
 if (cancelBtn) cancelBtn.disabled = true;
 if (statusEl) statusEl.style.display = 'block';
 gasCall('updateAbsensiMatrixDay', [userId, tanggal, masuk, pulang, note, currentUser ? currentUser.nama : '', true], function(res) {
 if (!res || !res.success) {
 if (saveBtn) { saveBtn.textContent = 'Simpan'; saveBtn.disabled = false; saveBtn.classList.remove('btn-loading'); }
 if (cancelBtn) cancelBtn.disabled = false;
 if (statusEl) statusEl.style.display = 'none';
 showToast(res && res.msg ? res.msg : 'Gagal menyimpan');
 return;
 }
 closeAttendanceEdit();
 var sel = document.getElementById('att-matrix-bulan');
 var bulanKey = sel ? sel.value : tanggal.substring(0, 7);
 clearAttendanceMatrixCache(userId, bulanKey);
 cacheClear('getAbsensiCameraToday'+JSON.stringify([userId]));
 cacheClearAction('getAbsensiRekap');
 cacheClearAction('getRekapBulananSemua');
 cacheClearAction('getPayrollPreview');
 cacheClearAction('getHomeData');
 showToast('Catatan kehadiran disimpan');
 loadAttendanceMatrix(true);
 }, function() {
 if (saveBtn) { saveBtn.textContent = 'Simpan'; saveBtn.disabled = false; saveBtn.classList.remove('btn-loading'); }
 if (cancelBtn) cancelBtn.disabled = false;
 if (statusEl) statusEl.style.display = 'none';
 showToast('Koneksi gagal saat menyimpan');
 });
}

function importAttendanceUploadToApp() {
 var sel = document.getElementById('att-matrix-bulan');
 var bulanKey = sel ? sel.value : '';
 if (!bulanKey) return;
 if (!confirm('Import data fingerprint dari sheet ABSENSI_UPLOAD ke absensi app bulan '+bulanKey+'? Data yang sudah ada akan dilewati agar tidak dobel.')) return;
 var btn = document.querySelector('.attendance-import-btn');
 if (btn) { btn.textContent = 'Mengimpor...'; btn.disabled = true; }
 gasCall('importAbsensiUploadToApp', [bulanKey, currentUser ? currentUser.nama : ''], function(res) {
 if (btn) { btn.textContent = 'Import Fingerprint'; btn.disabled = false; }
 if (!res || !res.success) { showToast((res && res.msg) || 'Import gagal'); return; }
 clearAttendanceMatrixCache(null, bulanKey);
 showToast(res.msg || 'Import fingerprint selesai');
 loadAttendanceMatrix(true);
 }, function() {
 if (btn) { btn.textContent = 'Import Fingerprint'; btn.disabled = false; }
 showToast('Koneksi gagal saat import fingerprint');
 });
}

function processAttendanceAppRecap() {
 if (!currentUser || (currentUser.bagian !== 'Owner' && currentUser.bagian !== 'Finance')) return;
 var sel = document.getElementById('att-matrix-bulan');
 var bulanKey = sel ? sel.value : attendanceMonthKey(new Date());
 if (!confirm('Proses absensi kamera bulan '+bulanKey+' ke rekap resmi? Data [APP_SYNC] bulan ini akan dibuat ulang.')) return;
 var btn = document.querySelector('.attendance-process-btn');
 if (btn) { btn.textContent = 'Memproses...'; btn.disabled = true; }
 gasCall('processAbsensiAppToRekap', [bulanKey, currentUser.nama], function(res) {
 if (btn) { btn.textContent = 'Proses ke Rekap Resmi'; btn.disabled = false; }
 if (!res || !res.success) { showToast((res && res.msg) || 'Gagal proses rekap'); return; }
 clearAttendanceMatrixCache(null, bulanKey);
 cacheClear('getRekapBulananSemua' + JSON.stringify([bulanKey]));
 showToast('Rekap resmi diperbarui: '+(res.rekapRows || 0)+' minggu');
 loadAttendanceMatrix(true);
 }, function() {
 if (btn) { btn.textContent = 'Proses ke Rekap Resmi'; btn.disabled = false; }
 showToast('Koneksi gagal saat proses rekap');
 });
}

function initials(nama) { return (nama||'').split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase(); }
function esc(s) { return (s||'').replace(/'/g,"\\'"); }
function formatTglShort(tglStr) {
 if (!tglStr) return '';
 var m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
 var parts = String(tglStr).split('-');
 if (parts.length >= 3) return parseInt(parts[2])+' '+m[parseInt(parts[1])-1];
 return tglStr;
}
function formatTglJam(tglStr, jamStr) {
 // "2026-04-09" + "17:35" → "09 Apr 17:35 · "
 var tgl = formatTglShort(tglStr);
 var jam = jamStr || '';
 if (!tgl && !jam) return '';
 return (tgl + (jam ? ' '+jam : '') + ' · ');
}
function showToast(msg) {
 var t = document.getElementById('toast');
 t.textContent = msg; t.classList.add('show');
 setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

window.onload = function() {
 setupPWAInstall();
 warmUpGAS();
 setTimeout(function() {
 document.getElementById('loading').style.display = 'none';
 var session = getLoginSession();
 if (session && session.user) {
 currentUser = session.user;
 if (session.username) localStorage.setItem('hh_username', session.username);
 _navHistory = [];
 history.replaceState({ screen: 's-home' }, '', '#home');
 goTo('s-home');
 return;
 }
 goTo('s-login');
 var savedUsername = localStorage.getItem('hh_username');
 if (savedUsername) {
 document.getElementById('login-username').value = savedUsername;
 document.getElementById('login-password').focus();
 }
 }, 450);

};
