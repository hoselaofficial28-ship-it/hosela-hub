var GAS_URL = 'https://script.google.com/macros/s/AKfycbw6q_5ZaIGrekeBwZ5TKh6X1GpWkFHsa5i6whdwacQkTEa-vvNezHlxFMEQFKZkmm5ffQ/exec';
var APP_VERSION = '20261023a';
var currentUser = null;
var currentBagian = null;
var pinBuffer = '';
var currentLang = localStorage.getItem('hh_lang') || 'id';
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
 ,clock:'M12 21a9 9 0 100-18 9 9 0 000 18zm0-13v5l3 2'
 ,trend:'M4 17l6-6 4 4 6-7m-5 0h5v5'
 ,star:'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3z'
 ,close:'M6 6l12 12M18 6L6 18'
};

function uiIcon(name, cls) {
 var path = ICONS[name] || ICONS.file;
 return '<svg class="svg-icon '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"></path></svg>';
}

var I18N = {
 id: {
  searchMenu:'Cari menu',
  dashboard:'Dasbor',
  jobdesk:'Jobdesk',
  announcements:'Pengumuman',
  ideas:'Ide Tim',
  desktopHeroKicker:'Ringkasan Operasional',
  desktopHeroTitle:'Hosela Dashboard',
  desktopHeroSub:'Pantau absensi, KPI, payroll, pengumuman, dan aktivitas tim dalam satu layar kerja.',
  metricAttendance:'Absensi',
  metricAttendanceSub:'Riwayat tim',
  metricKpi:'KPI',
  metricKpiSub:'Checklist',
  metricPayroll:'Payroll',
  metricPayrollSub:'Slip gaji',
  categoriesTitle:'Kategori Menu',
  categoriesSub:'Pilih area kerja yang ingin dibuka',
  backCategory:'Kembali ke kategori',
  catAttendance:'Kehadiran & Personal',
  catAttendanceSub:'Absensi, riwayat, izin, gaji',
  catWork:'Kerja & Produktivitas',
  catWorkSub:'Tugas, KPI, aturan kerja',
  catComms:'Komunikasi Tim',
  catCommsSub:'Info, ide, dan notifikasi',
  catFinance:'Finance & Owner',
  catFinanceSub:'Kontrol data dan payroll',
  catAccount:'Akun',
  catAccountSub:'Pengaturan akses'
 },
 en: {
  searchMenu:'Search menu',
  dashboard:'Dashboard',
  jobdesk:'Jobdesk',
  announcements:'Announcements',
  ideas:'Team Ideas',
  desktopHeroKicker:'Operations Summary',
  desktopHeroTitle:'Hosela Dashboard',
  desktopHeroSub:'Track attendance, KPI, payroll, announcements, and team activity in one workspace.',
  metricAttendance:'Attendance',
  metricAttendanceSub:'Team history',
  metricKpi:'KPI',
  metricKpiSub:'Checklist',
  metricPayroll:'Payroll',
  metricPayrollSub:'Payslips',
  categoriesTitle:'Menu Categories',
  categoriesSub:'Choose the work area to open',
  backCategory:'Back to categories',
  catAttendance:'Attendance & Personal',
  catAttendanceSub:'Attendance, history, leave, payroll',
  catWork:'Work & Productivity',
  catWorkSub:'Tasks, KPI, work rules',
  catComms:'Team Communication',
  catCommsSub:'Updates, ideas, and notifications',
  catFinance:'Finance & Owner',
  catFinanceSub:'Data control and payroll',
  catAccount:'Account',
  catAccountSub:'Access settings'
 },
 zh: {
  searchMenu:'搜索菜单',
  dashboard:'仪表盘',
  jobdesk:'岗位职责',
  announcements:'公告',
  ideas:'团队想法',
  desktopHeroKicker:'运营摘要',
  desktopHeroTitle:'Hosela 仪表盘',
  desktopHeroSub:'在一个工作界面查看考勤、KPI、薪资、公告和团队动态。',
  metricAttendance:'考勤',
  metricAttendanceSub:'团队记录',
  metricKpi:'KPI',
  metricKpiSub:'检查清单',
  metricPayroll:'薪资',
  metricPayrollSub:'工资单',
  categoriesTitle:'菜单分类',
  categoriesSub:'选择要打开的工作区域',
  backCategory:'返回分类',
  catAttendance:'考勤与个人',
  catAttendanceSub:'考勤、记录、请假、薪资',
  catWork:'工作与效率',
  catWorkSub:'任务、KPI、工作规则',
  catComms:'团队沟通',
  catCommsSub:'公告、想法和通知',
  catFinance:'财务与老板',
  catFinanceSub:'数据控制和薪资',
  catAccount:'账户',
  catAccountSub:'访问设置'
 }
};

var MENU_I18N = {
 's-jobdesk': { en:['Jobdesk','Tasks & responsibilities'], zh:['岗位职责','任务与责任'] },
 's-pengumuman': { en:['Announcements','Owner updates'], zh:['公告','老板通知'] },
 's-ide': { en:['Team Ideas','Share your ideas'], zh:['团队想法','提交建议'] },
 's-papan-peringkat': { en:['Leaderboard','Team performance'], zh:['排行榜','团队表现'] },
 's-peraturan': { en:['Rules','Office regulations'], zh:['规章制度','办公室规则'] },
 's-notifikasi': { en:['Notifications','Alerts & updates'], zh:['通知','提醒与信息'] },
 's-absensi-camera': { en:['Camera Attendance','Photo & office location'], zh:['拍照考勤','照片与办公地点'] },
 's-catatan-kehadiran': { en:['Attendance Log','Check-in & check-out history'], zh:['考勤记录','上下班记录'] },
 's-izin': { en:['Leave / Sick','Submit absence request'], zh:['请假 / 病假','提交缺勤申请'] },
 's-slip-gaji': { en:['Payslip','Your salary history'], zh:['工资单','薪资记录'] },
 's-kalender': { en:['Holiday Calendar','Manage holidays'], zh:['假期日历','管理假期'] },
 's-setting-gaji': { en:['Salary Settings','Edit employee salary'], zh:['薪资设置','修改员工工资'] },
 's-kelola-izin': { en:['Leave Approval','Approve requests'], zh:['请假审批','批准申请'] },
 's-kpi-check': { en:['KPI Checklist','Update your KPI'], zh:['KPI清单','更新KPI'] },
 's-sanksi-manual': { en:['Rewards & Fines','Manual adjustments'], zh:['奖励与罚款','手动调整'] },
 's-review-telat': { en:['Late Review','Late tolerance'], zh:['迟到审核','迟到宽限'] },
 's-payroll': { en:['Payroll','Review and publish payslips'], zh:['薪资发放','审核并发布工资单'] },
 's-tambah-pengumuman': { en:['Create Announcement','New update'], zh:['新建公告','发布新信息'] },
 's-manage-users': { en:['Manage Team','Activate / deactivate'], zh:['团队管理','启用 / 停用'] },
 's-laporan-absensi': { en:['Attendance Report','Attendance recap'], zh:['考勤报告','考勤汇总'] },
 's-ganti-pin': { en:['Change Password','Update your login password'], zh:['修改密码','更新登录密码'] }
};

function tr(key) {
 return (I18N[currentLang] && I18N[currentLang][key]) || I18N.id[key] || key;
}

function menuLabel(m) {
 var hit = MENU_I18N[m.id] && MENU_I18N[m.id][currentLang];
 return hit ? hit[0] : m.label;
}

function menuSub(m) {
 var hit = MENU_I18N[m.id] && MENU_I18N[m.id][currentLang];
 return hit ? hit[1] : m.sub;
}

function categoryLabel(cat) {
 var key = {
  'Kehadiran & Personal':'catAttendance',
  'Kerja & Produktivitas':'catWork',
  'Komunikasi Tim':'catComms',
  'Finance & Owner':'catFinance',
  'Akun':'catAccount'
 }[cat];
 return key ? tr(key) : cat;
}

function categoryDesc(cat) {
 var key = {
  'Kehadiran & Personal':'catAttendanceSub',
  'Kerja & Produktivitas':'catWorkSub',
  'Komunikasi Tim':'catCommsSub',
  'Finance & Owner':'catFinanceSub',
  'Akun':'catAccountSub'
 }[cat];
 return key ? tr(key) : '';
}

function applyLanguageText() {
 document.querySelectorAll('[data-i18n]').forEach(function(el) {
  var key = el.getAttribute('data-i18n');
  el.textContent = tr(key);
 });
 var sel = document.getElementById('desktop-lang-select');
 if (sel) sel.value = currentLang;
 var input = document.getElementById('home-menu-search-input');
 if (input) input.placeholder = tr('searchMenu');
 var navText = [tr('dashboard'), tr('jobdesk'), tr('announcements'), tr('ideas')];
 document.querySelectorAll('.navbar').forEach(function(navbar) {
  navbar.querySelectorAll('.nav-label').forEach(function(el, index) {
   if (navText[index]) el.textContent = navText[index];
  });
 });
}

function setAppLanguage(lang) {
 currentLang = I18N[lang] ? lang : 'id';
 try { localStorage.setItem('hh_lang', currentLang); } catch(e) {}
 applyLanguageText();
 var el = document.getElementById('home-menu');
 if (el && window._homeMenuGroups) {
  el.innerHTML = isDesktopLayout() ? renderHomeMenuSectionList() : renderHomeCategoryIndex();
  applyLanguageText();
 }
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
 if (k.indexOf('hh_') === 0 && k !== key && k !== 'hh_username' && k !== 'hh_session' && k !== 'hh_pc_sidebar_width' && k.indexOf('hh_sb_session') !== 0) localStorage.removeItem(k);
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

// Simpan error terakhir apa adanya (dipakai laporan halaman utama + pemanggilan ulang
// lewat chrome://... console). Jangan disamarkan: pesan + stack asli ikut disimpan.
window._lastRuntimeError = null;
function catatRuntimeError(sumber, err) {
 var pesan = (err && err.message) ? err.message : String(err);
 var stack = (err && err.stack) ? String(err.stack) : '(tanpa stack)';
 window._lastRuntimeError = { sumber: sumber, pesan: pesan, stack: stack, waktu: new Date().toISOString() };
 console.error('[RUNTIME ' + sumber + '] ' + pesan + '\n' + stack);
 return window._lastRuntimeError;
}
window.addEventListener('unhandledrejection', function(e) {
 catatRuntimeError('promise', e.reason);
});

window.addEventListener('error', function(e) {
 catatRuntimeError('error', e.error || e.message);
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
 'getUserKPI','getKalenderLibur','getAllUsers','getOwnerAccounts','getPengumuman','getIde','getAbsensiRekap',
 'getRekapBulananSemua','getPayrollPreview','getPapanPeringkat','getKPILaporan',
 'getNotifikasi','getIzinKaryawan','getIzinPendingCount','getSanksiManual',
 'getAbsensiMatrix','getAbsensiMatrixUser','getAllAbsensiRekap','getKPITemplate','getIzinPending',
 'getAnomaliPending','getPengaturan','getAbsensiCameraToday','getPayrollDetail',
 'getIzinTelatReview'
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
 getOwnerAccounts: 2 * 60 * 1000,
 getJobdeskList: 30 * 60 * 1000,
 getStaffByBagian: 15 * 60 * 1000,
 getJobdeskByBagian: 30 * 60 * 1000,
 getJobdeskByJabatan: 30 * 60 * 1000,
 getPengumuman: 5 * 60 * 1000,
 getIde: 5 * 60 * 1000,
 getKalenderLibur: 30 * 60 * 1000,
 getPengaturan: 30 * 60 * 1000,
 getKPITemplate: 30 * 60 * 1000,
 getKPILaporan: 5 * 60 * 1000,
 getPapanPeringkat: 10 * 60 * 1000,
 getSanksiManual: 2 * 60 * 1000,
 getIzinTelatReview: 60 * 1000,
 getPayrollPreview: 5 * 60 * 1000,
 getPayrollDetail: 5 * 60 * 1000
};

function cacheTtlForAction(action) {
 return CACHE_TTL_BY_ACTION[action] || CACHE_TTL;
}

function invalidateReadCacheAfterMutation(action) {
 var affected = {
  addPengumuman: ['getHomeData','getPengumuman'],
  addIde: ['getIde'],
  addLibur: ['getKalenderLibur','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  hapusLibur: ['getKalenderLibur','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  nonaktifkanUser: ['getAllUsers','getStaffByBagian','getRekapBulananSemua'],
  setUserAccess: ['getOwnerAccounts','getAllUsers','getStaffByBagian','getRekapBulananSemua','getHomeData'],
  updateSalaryUsersBatch: ['getSalaryUsers','getAllUsers','getAbsensiRekap','getAllAbsensiRekap','getRekapBulananSemua','getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips'],
  updateUserSalary: ['getSalaryUsers','getAllUsers','getAbsensiRekap','getAllAbsensiRekap','getRekapBulananSemua','getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips'],
  deactivateSalaryUser: ['getSalaryUsers','getAllUsers','getStaffByBagian','getRekapBulananSemua','getPayrollPreview','getHomeData'],
  createPayrollDraft: ['getPayrollPreview','getPayrollDetail'],
  syncPayrollAttendance: ['getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips'],
  confirmPayroll: ['getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips'],
  publishPayroll: ['getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips','getNotifikasi','getHomeData'],
  cancelPayroll: ['getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips','getNotifikasi','getHomeData'],
  submitKPILaporan: ['getKPILaporan','getPapanPeringkat','getHomeData'],
  submitIzin: ['getIzinKaryawan','getIzinPending','getIzinPendingCount','getHomeData','getNotifikasi'],
  approveIzin: ['getIzinKaryawan','getIzinPending','getIzinPendingCount','getAbsensiRekap','getRekapBulananSemua','getHomeData','getNotifikasi'],
  konfirmasiAnomali: ['getAnomaliPending','getAbsensiMatrix','getAbsensiMatrixUser','getAbsensiRekap','getRekapBulananSemua','getHomeData','getNotifikasi'],
  addSanksiManual: ['getSanksiManual','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  batalSanksiManual: ['getSanksiManual','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview'],
  reviewIzinTelat: ['getIzinTelatReview','getAbsensiRekap','getRekapBulananSemua','getPayrollPreview','getPayrollDetail','getAbsensiMatrix','getAbsensiMatrixUser','getHomeData','getNotifikasi'],
  updatePayrollAdjustment: ['getPayrollPreview','getPayrollDetail','getPayrollEmployeeSlip','getPayrollEmployeeSlipDetail','getPublishedPayrollSlips'],
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

// Aksi yang sama tidak dijalankan dua kali bersamaan (prefetch + halaman sering meminta aksi
// yang sama pada pembukaan pertama sehingga Supabase kebanjiran request). Setiap permintaan
// juga diberi batas waktu supaya skeleton/loading tidak menggantung selamanya bila tidak ada
// balasan — kegagalan dilaporkan apa adanya, bukan didiamkan.
var _gasInFlight = {};
var GAS_TIMEOUT_MS = 25000;

function gasCall(action, args, success, failure) {
 var cacheKey = action + JSON.stringify(args || []);
 function applyCache(data) {
  if (CACHEABLE.indexOf(action) !== -1) cacheSet(cacheKey, data, cacheTtlForAction(action));
  else invalidateReadCacheAfterMutation(action);
 }
 // Cek cache dulu
 if (CACHEABLE.indexOf(action) !== -1) {
  var cached = cacheGet(cacheKey);
  if (cached) {
   // Balasan cache SELALU dikirim pada tick berikutnya, tidak sinkron. Pemanggil biasanya
   // baru menyiapkan variabel/fungsi setelah memanggil gasCall; balasan sinkron membuat
   // variabel itu belum siap -> "render is not a function" dan skeleton menggantung.
   setTimeout(function () {
    try { if (success) success(cached); } catch (e) { console.error('Callback error [' + action + ']:', e); }
   }, 0);
   return;
  }
 }
 // Gabungkan dengan permintaan yang masih berjalan untuk aksi+argumen yang sama
 var waiters = _gasInFlight[cacheKey];
 if (waiters) { waiters.push({ success: success, failure: failure }); return; }
 waiters = _gasInFlight[cacheKey] = [{ success: success, failure: failure }];

 var selesai = false;
 var jam = setTimeout(function () {
  tutup(false, new Error('Tidak ada balasan dalam ' + (GAS_TIMEOUT_MS / 1000) + ' detik untuk aksi "' + action + '". Periksa koneksi lalu muat ulang halaman.'));
 }, GAS_TIMEOUT_MS);

 function tutup(ok, payload) {
  if (selesai) return;
  selesai = true;
  clearTimeout(jam);
  delete _gasInFlight[cacheKey];
  if (ok) applyCache(payload);
  waiters.forEach(function (w) {
   try {
    if (ok) { if (w.success) w.success(payload); }
    else if (w.failure) w.failure(payload);
    else console.error('GAS Error [' + action + ']:', payload);
   } catch (e) {
    console.error('Callback error [' + action + ']:', e);
   }
  });
 }

 // ====== SUPABASE ASLI dulu (js/real-backend.js), baru fallback DEMO ======
 if (window.realBackendHandles && window.realBackendHandles(action)) {
  window.realBackend(action, args || []).then(function (result) {
   tutup(true, result);
  }).catch(function (err) {
   console.error('[REAL] error, action=' + action, err);
   tutup(false, err);
  });
  return;
 }
 // Belum tersambung ke Supabase asli untuk aksi ini — dialihkan ke data
 // contoh di js/mock-backend.js supaya tampilan & alur tetap bisa dicek.
 setTimeout(function () {
  try {
   if (typeof window.mockBackend !== 'function') throw new Error('mock-backend.js belum termuat');
   tutup(true, window.mockBackend(action, args || []));
  } catch (e) {
   console.error('[DEMO] mockBackend error, action=' + action, e);
   tutup(false, e);
  }
 }, 220 + Math.random() * 180);
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
 ['getNotifikasi', [u.id]]
 ];
 if (u.bagian !== 'Owner' && u.bagian !== 'Finance') {
 jobs.push(['getIzinKaryawan', [u.id]]);
 jobs.push(['getAbsensiMatrixUser', [u.id, bulanKey]]);
 jobs.push(['getPayrollEmployeeSlip', [u.id]]);
 }
 if (u.bagian === 'Owner' || u.bagian === 'Finance') {
 jobs.push(['getKalenderLibur', []]);
 jobs.push(['getIzinPendingCount', []]);
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
var _isBackNavigation = false;

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

function pcReadSidebarScrollTop(screen) {
 var list = screen && screen.querySelector ? screen.querySelector('.pc-nav-scroll') : null;
 return list ? list.scrollTop : null;
}

function pcRestoreSidebarScroll(screen, scrollTop, activeId) {
 if (scrollTop === null || scrollTop === undefined || !screen) return;
 var list = screen.querySelector('.pc-nav-scroll');
 if (!list) return;
 list.scrollTop = scrollTop;

 // Biasanya menu yang baru ditekan sudah berada di area yang terlihat sehingga
 // posisi tidak berubah sama sekali. Koreksi kecil hanya dilakukan bila tujuan
 // dibuka dari tombol lain dan menu aktif berada di luar viewport sidebar.
 var activeItem = activeId ? list.querySelector('.pc-nav-item[data-screen="' + activeId + '"]') : null;
 if (!activeItem) return;
 var itemTop = activeItem.offsetTop;
 var itemBottom = itemTop + activeItem.offsetHeight;
 if (itemTop < list.scrollTop) list.scrollTop = Math.max(0, itemTop - 8);
 else if (itemBottom > list.scrollTop + list.clientHeight) list.scrollTop = itemBottom - list.clientHeight + 8;
}

function goTo(id) {
  var prev = document.querySelector('.screen.active');
  var prevId = prev ? prev.id : null;
  var previousSidebarTop = pcReadSidebarScrollTop(prev);
  if (prevId === 's-absensi-camera' && id !== 's-absensi-camera') stopAttendanceCamera();
  if (id !== 's-home') _homeCategoryOpen = false;
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
 var el = document.getElementById(id);
 if (!el) return;
 el.classList.add('active');
 updateDesktopNavActive(id);
 pcRestoreSidebarScroll(el, previousSidebarTop, id);
 if (id === 's-home') loadDesktopReports(false);
 try {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
 } catch(e) {}
 var c = el.querySelector('.content');
 if (c) c.scrollTop = 0;
 if (prevId && prevId !== id) {
 var skipHistoryPush = false;
 if (_isBackNavigation) {
 skipHistoryPush = true;
 } else if (id === 's-home' && (prevId === 's-login' || prevId === 's-force-pin')) {
 _navHistory = [];
 skipHistoryPush = true;
 } else if (prevId === 's-login' || prevId === 's-force-pin') {
 _navHistory = [];
 skipHistoryPush = true;
 }
 if (!skipHistoryPush && _navHistory[_navHistory.length - 1] !== prevId) _navHistory.push(prevId);
 try {
  if (_isBackNavigation) history.replaceState({ screen: id }, '', '#' + id);
  else history.pushState({ screen: id }, '', '#' + id);
 } catch(e) {}
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
 if (id === 's-review-telat') loadReviewTelat();
 if (id === 's-catatan-kehadiran') loadAttendanceMatrix();
 if (id === 's-setting-gaji') loadSalarySettings();
 if (id === 's-payroll') loadPayroll();
 if (id === 's-slip-gaji') loadSlipGaji();
 if (id === 's-kelola-izin') { loadKelolaIzin(); }
 if (id === 's-home') loadHome();
 if (id === 's-daftar') loadDaftarOptions();
 } catch(routeErr) {
 console.error('Route error:', id, routeErr);
 showToast('Menu gagal dibuka. Coba lagi.');
 }
 if (id === 's-home') setTimeout(ensureHomeBackGuard, 50);
}

function goBack() {
 var target = _navHistory.length ? _navHistory.pop() : 's-home';
 if (!document.getElementById(target)) target = 's-home';
 _isBackNavigation = true;
 try {
  goTo(target);
 } finally {
  _isBackNavigation = false;
 }
}

document.querySelectorAll('.back-btn').forEach(function(button) {
 button.setAttribute('aria-label', 'Kembali ke halaman sebelumnya');
 button.setAttribute('title', 'Kembali');
});

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
 goBack();
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
 if (window.sb && window.sb.auth) window.sb.auth.signOut().catch(function(){});
 _prefetchStarted = false;
 _homeLoaded = false;
 _homeLoadedUserId = '';
 document.getElementById('login-username').value = '';
 document.getElementById('username-group').style.display = 'block';
 document.getElementById('login-username').focus();
}

var DAFTAR_BAGIAN_ORDER = [
 'Gudang',
 'Live Streaming',
 'Content Creator',
 'Marketplace & Ecommerce',
 'Digital Marketing',
 'Customer Service',
 'Purchasing & Inventory',
 'Operasional & Fulfillment',
 'Keuangan & Administrasi',
 'HR & General Affairs',
 'Product & Merchandising'
];

var DEFAULT_DAFTAR_OPTIONS = {
 'Gudang': [
  'Admin Gudang & Stok', 'Staff Inbound', 'Picker', 'Admin Packing',
  'Quality Control Packing', 'Kepala Gudang'
 ],
 'Live Streaming': [
  'Live Streamer', 'Moderator Live', 'Operator Live', 'Koordinator Live Streaming'
 ],
 'Content Creator': [
  'Content Creator', 'Scriptwriter / Copywriter', 'Video Editor',
  'Graphic Designer', 'Fotografer Produk', 'Content Lead'
 ],
 'Marketplace & Ecommerce': [
  'Admin Marketplace', 'Customer Service Marketplace', 'Listing Specialist',
  'Promo & Campaign Specialist', 'Marketplace Ads Specialist', 'Ecommerce Supervisor'
 ],
 'Digital Marketing': [
  'Social Media Specialist', 'Performance Ads Specialist',
  'Affiliate & KOL Specialist', 'CRM & Retention Specialist', 'Digital Marketing Lead'
 ],
 'Customer Service': [
  'Customer Service Chat', 'Customer Service Komplain & Retur',
  'Customer Experience Specialist', 'Customer Service Lead'
 ],
 'Purchasing & Inventory': [
  'Purchasing Staff', 'Supplier Coordinator', 'Inventory Control', 'Purchasing Supervisor'
 ],
 'Operasional & Fulfillment': [
  'Admin Pesanan', 'Fulfillment Staff', 'Staff Retur & Refund',
  'Koordinator Operasional', 'Operations Manager'
 ],
 'Keuangan & Administrasi': [
  'Admin Keuangan', 'Accounting Staff', 'Accounts Payable / Receivable',
  'Admin Pajak', 'Supervisor Keuangan'
 ],
 'HR & General Affairs': [
  'HR Admin', 'Recruitment & People Operations', 'General Affairs Staff', 'HRGA Supervisor'
 ],
 'Product & Merchandising': [
  'Product Research', 'Merchandiser', 'Product Development',
  'Catalog Specialist', 'Product Lead'
 ]
};

var DAFTAR_BAGIAN_ALIASES = {
 'packing': 'Gudang',
 'live': 'Live Streaming',
 'ecommerce': 'Marketplace & Ecommerce'
};

var _daftarOptions = null;

function mergeDaftarOptions(serverData) {
 var merged = {};
 DAFTAR_BAGIAN_ORDER.forEach(function(bagian) {
  merged[bagian] = (DEFAULT_DAFTAR_OPTIONS[bagian] || []).slice();
 });
 Object.keys(serverData || {}).forEach(function(bagian) {
  var cleanBagian = String(bagian || '').trim();
  var normalizedBagian = cleanBagian.toLowerCase();
  if (!cleanBagian || normalizedBagian === 'owner' || normalizedBagian === 'finance') return;
  cleanBagian = DAFTAR_BAGIAN_ALIASES[normalizedBagian] || cleanBagian;
  if (!merged[cleanBagian]) merged[cleanBagian] = [];
  var list = Array.isArray(serverData[bagian]) ? serverData[bagian] : [];
  list.forEach(function(jabatan) {
   jabatan = String(jabatan || '').trim();
   if (jabatan && merged[cleanBagian].indexOf(jabatan) === -1) merged[cleanBagian].push(jabatan);
  });
 });
 return merged;
}

function normalizeDaftarBagianName(bagian) {
 var clean = String(bagian || '').trim();
 return DAFTAR_BAGIAN_ALIASES[clean.toLowerCase()] || clean;
}

function getOrderedDaftarBagian(data) {
 var keys = Object.keys(data || {});
 keys.sort(function(a, b) {
  var ai = DAFTAR_BAGIAN_ORDER.indexOf(a), bi = DAFTAR_BAGIAN_ORDER.indexOf(b);
  if (ai === -1) ai = 999;
  if (bi === -1) bi = 999;
  return ai === bi ? a.localeCompare(b, 'id') : ai - bi;
 });
 return keys;
}

function setDaftarSelectOptions(selectEl, placeholder, values) {
 selectEl.innerHTML = '';
 var first = document.createElement('option');
 first.value = '';
 first.textContent = placeholder;
 selectEl.appendChild(first);
 (values || []).forEach(function(value) {
  var option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  selectEl.appendChild(option);
 });
}

function loadDaftarOptions() {
 var bagianEl = document.getElementById('daftar-bagian');
 var jabatanEl = document.getElementById('daftar-jabatan');
 if (!bagianEl || !jabatanEl) return;
 if (_daftarOptions) { populateDaftarBagian(_daftarOptions); return; }
 _daftarOptions = mergeDaftarOptions();
 populateDaftarBagian(_daftarOptions);
 jabatanEl.disabled = true;
 bagianEl.setAttribute('aria-busy', 'true');
 gasCall('getDaftarOptions', [], function(r) {
  if (r && r.success && r.data) _daftarOptions = mergeDaftarOptions(r.data);
  bagianEl.removeAttribute('aria-busy');
  populateDaftarBagian(_daftarOptions);
 }, function() {
  bagianEl.removeAttribute('aria-busy');
  populateDaftarBagian(_daftarOptions);
 });
}

function populateDaftarBagian(data) {
 var el = document.getElementById('daftar-bagian');
 if (!el) return;
 var current = el.value;
 var keys = getOrderedDaftarBagian(data);
 setDaftarSelectOptions(el, '-- Pilih Bagian --', keys);
 if (current && data[current]) el.value = current;
 onDaftarBagianChange();
}

function onDaftarBagianChange() {
 var bagian = document.getElementById('daftar-bagian').value;
 var jabEl = document.getElementById('daftar-jabatan');
 if (!bagian || !_daftarOptions || !_daftarOptions[bagian]) {
  setDaftarSelectOptions(jabEl, '-- Pilih Bagian dulu --', []);
  jabEl.disabled = true;
  return;
 }
 var jabatanList = _daftarOptions[bagian];
 setDaftarSelectOptions(jabEl, jabatanList.length ? '-- Pilih Jabatan --' : '-- Jabatan belum tersedia --', jabatanList);
 jabEl.disabled = !jabatanList.length;
}

function submitDaftarAkun() {
 var nama    = (document.getElementById('daftar-nama').value || '').trim();
 var email   = (document.getElementById('daftar-email').value || '').trim();
 var bagian  = (document.getElementById('daftar-bagian').value || '').trim();
 var jabatan = (document.getElementById('daftar-jabatan').value || '').trim();
 var sandi   = document.getElementById('daftar-sandi').value || '';
 var sandi2  = document.getElementById('daftar-sandi2').value || '';
 var errEl   = document.getElementById('daftar-error');
 var btn     = document.getElementById('daftar-btn');
 errEl.textContent = ''; errEl.style.color = '#dc2626';
 if (!nama)   { errEl.textContent = 'Nama lengkap wajib diisi'; return; }
 if (!email || email.indexOf('@') === -1) { errEl.textContent = 'Email valid wajib diisi'; return; }
 if (!bagian) { errEl.textContent = 'Silakan pilih bagian'; return; }
 if (!jabatan){ errEl.textContent = 'Silakan pilih jabatan'; return; }
 if (!sandi)  { errEl.textContent = 'Kata sandi tidak boleh kosong'; return; }
 if (sandi.length < 6) { errEl.textContent = 'Kata sandi minimal 6 karakter'; return; }
 if (sandi !== sandi2) { errEl.textContent = 'Konfirmasi kata sandi tidak cocok'; return; }
 btn.disabled = true;
 document.getElementById('daftar-spinner').style.display = 'flex';
 gasCall('daftarAkun', [nama, bagian, jabatan, sandi, email], function(r) {
  btn.disabled = false;
  document.getElementById('daftar-spinner').style.display = 'none';
  if (r && r.success) {
   errEl.style.color = '#16a34a';
   errEl.textContent = r.msg || 'Akun berhasil dibuat!';
   document.getElementById('daftar-nama').value = '';
   document.getElementById('daftar-email').value = '';
   document.getElementById('daftar-bagian').value = '';
   setDaftarSelectOptions(document.getElementById('daftar-jabatan'), '-- Pilih Bagian dulu --', []);
   document.getElementById('daftar-jabatan').disabled = true;
   document.getElementById('daftar-sandi').value = '';
   document.getElementById('daftar-sandi2').value = '';
   setTimeout(function() { goTo('s-login'); errEl.textContent = ''; }, 2500);
  } else {
   errEl.textContent = (r && r.msg) ? r.msg : 'Pendaftaran gagal, coba lagi.';
  }
 }, function() {
  btn.disabled = false;
  document.getElementById('daftar-spinner').style.display = 'none';
  errEl.textContent = 'Koneksi gagal. Periksa internet dan coba lagi.';
 });
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
 errEl.textContent = (r && r.msg) ? r.msg : 'Nama pengguna atau kata sandi salah.';
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
if (u.bagian !== 'Owner' && u.bagian !== 'Finance')
menus.push({id:'s-slip-gaji', icon:'receipt', bg:'#e0f2fe', label:'Slip Gaji', sub:'Riwayat gaji kamu'});
 if (u.bagian === 'Owner' || u.bagian === 'Finance')
 menus.push({id:'s-kalender', icon:'calendar', bg:'#fee2e2', label:'Kalender Libur', sub:'Atur hari libur'});
 if (u.bagian === 'Finance') {
 menus.push({id:'s-kelola-izin', icon:'check', bg:'#d1fae5', label:'Kelola Izin', sub:'Setujui pengajuan'});
 menus.push({id:'s-kpi-check', icon:'clipboard', bg:'#fef3c7', label:'KPI Checklist', sub:'Update KPI kamu'});
 menus.push({id:'s-sanksi-manual', icon:'scale', bg:'#fce7f3', label:'Penghargaan & Denda', sub:'Denda dan penghargaan manual'});
 menus.push({id:'s-review-telat', icon:'check', bg:'#fff7ed', label:'Review Telat', sub:'Toleransi izin telat'});
 menus.push({id:'s-payroll', icon:'card', bg:'#ede9fe', label:'Penggajian', sub:'Pratinjau dan terbitkan slip'});
 }
 if (u.bagian === 'Owner') {
 menus.push({id:'s-manage-users', icon:'users', bg:'#fef3c7', label:'Pendaftar & Akses', sub:'Pantau dan kelola akun'});
 // Owner sebelumnya TIDAK punya cara melihat/menyetujui pengajuan izin (menu itu
 // hanya ada untuk Finance). Ko minta bisa melihatnya sendiri.
 menus.push({id:'s-kelola-izin', icon:'check', bg:'#d1fae5', label:'Kelola Izin', sub:'Setujui pengajuan karyawan'});
 menus.push({id:'s-laporan-absensi', icon:'chart', bg:'#e0f2fe', label:'Laporan Absensi', sub:'Rekap kehadiran'});
 menus.push({id:'s-sanksi-manual', icon:'scale', bg:'#fce7f3', label:'Penghargaan & Denda', sub:'Denda dan penghargaan manual'});
 menus.push({id:'s-review-telat', icon:'check', bg:'#fff7ed', label:'Review Telat', sub:'Toleransi izin telat'});
 menus.push({id:'s-payroll', icon:'card', bg:'#ede9fe', label:'Penggajian', sub:'Tinjau gaji tim'});
 }
 menus.push({id:'s-ganti-pin', icon:'lock', bg:'#f1f5f9', label:'Ganti Sandi', sub:'Ubah PIN login kamu'});
 var prevBtn = document.querySelector('.preview-btn');
 if (prevBtn) prevBtn.style.display = (!isTouchDevice && (u.bagian === 'Owner' || u.bagian === 'Finance')) ? 'flex' : 'none';
 document.getElementById('home-menu').innerHTML = renderHomeMenuSections(menus);
 window._homeMenus = menus;
 applyDesktopNavigation();
 loadDesktopReports(true);
 applyLanguageText();
 setTimeout(prefetchCommonData, 450);

 // Reward dilengkapi saat data Home tiba; jangan bikin halaman awal terasa tertahan.
 var rewardSection = document.getElementById('reward-section');
 if (rewardSection && !rewardSection.querySelector('.reward-card')) rewardSection.innerHTML = renderRewardLoading();

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
 window._lastHomeData = d;
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
 '<div class="reward-label">BINTANG BULAN INI &middot; '+cleanDisplayText(r.bulan)+'</div>'+
 '<div class="reward-avatar-big">'+initials(r.nama)+'</div>'+
 '<div class="reward-name">'+cleanDisplayText(r.nama)+'</div>'+
 '<div class="reward-sub">'+cleanDisplayText(r.bagian)+'</div>'+
 '<div class="reward-alasan"><span class="reward-reason-icon">'+uiIcon('trend')+'</span><span>'+cleanDisplayText(r.alasan)+'</span></div>'+
 '<div class="reward-pesan">'+cleanDisplayText(r.pesan)+'</div>'+
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
 for (var si = 0; si < 5; si++) stars += '<span class="'+(si < bintang ? 'star-filled' : 'star-empty')+'">'+uiIcon('star', 'rating-star')+'</span>';
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
 if (!list || !currentUser) return;
 var isOwner = currentUser.bagian === 'Owner';
 var ownerPanel = document.getElementById('jobdesk-owner-panel');
 var subtitle = document.getElementById('jobdesk-subtitle');
 if (ownerPanel) ownerPanel.style.display = isOwner ? 'block' : 'none';
 if (subtitle) subtitle.textContent = isOwner ? 'Atur dokumen kerja setiap bagian dan jabatan' : 'Hanya jobdesk bagian dan jabatan Anda';
 list.innerHTML = skelCards(isOwner ? 4 : 1);

 if (isOwner) {
   loadOwnerJobdeskOptions(function(options) {
     gasCall('getOwnerJobdesks', [], function(res) {
       renderOwnerJobdeskList(res && (res.data || res.items) || [], options);
     }, function(){
       renderOwnerJobdeskList([], options);
       showToast('Link tersimpan belum dapat dimuat. Daftar jabatan tetap ditampilkan.');
     });
   });
   return;
 }

 gasCall('getMyJobdesk', [], function(res) {
   var jd = res && (res.data || res);
   var bagian = jobdeskSafe((jd && jd.bagian) || currentUser.bagian || '-');
   var jabatan = jobdeskSafe((jd && jd.jabatan) || currentUser.jabatan || '-');
   var link = jd && /^https?:\/\//i.test(String(jd.link || '')) ? String(jd.link) : '';
   list.innerHTML = '<section class="jobdesk-self-card">'+
     '<div class="jobdesk-self-icon">'+uiIcon('clipboard')+'</div>'+
     '<div class="eyebrow">JOBDESK ANDA</div><h2>'+jabatan+'</h2><p>'+bagian+'</p>'+
     (link
       ? '<a class="btn btn-primary jobdesk-open-link" href="'+jobdeskSafe(link)+'" target="_blank" rel="noopener noreferrer">Buka Dokumen Jobdesk</a>'
       : '<div class="form-alert form-alert-info"><strong>Dokumen belum tersedia</strong><span>Owner belum memasang link jobdesk untuk jabatan ini.</span></div>')+
     '</section>';
 }, function(){ list.innerHTML = '<div class="empty-state">Gagal memuat jobdesk Anda.</div>'; });
}

function jobdeskSafe(value) {
 return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
   return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
 });
}

function loadOwnerJobdeskOptions(done) {
 function applyOptions(serverOptions) {
   var options = mergeDaftarOptions(serverOptions || {});
   _daftarOptions = options;
   window._ownerJobdeskOptions = options;
   var bagianEl = document.getElementById('jobdesk-admin-bagian');
   if (bagianEl) {
     var selected = bagianEl.value;
     bagianEl.innerHTML = '<option value="">Pilih bagian</option>' + getOrderedDaftarBagian(options).map(function(b) {
       return '<option value="'+jobdeskSafe(b)+'">'+jobdeskSafe(b)+'</option>';
     }).join('');
     if (selected && options[selected]) bagianEl.value = selected;
     updateOwnerJobdeskRoles();
   }
   if (typeof done === 'function') done(options);
 }
 if (_daftarOptions) { applyOptions(_daftarOptions); return; }
 gasCall('getDaftarOptions', [], function(res) {
   applyOptions(res && (res.data || res) || {});
 }, function() { applyOptions({}); });
}

function updateOwnerJobdeskRoles() {
 var bagian = document.getElementById('jobdesk-admin-bagian').value;
 var jabatanEl = document.getElementById('jobdesk-admin-jabatan');
 var roles = (window._ownerJobdeskOptions && window._ownerJobdeskOptions[bagian]) || [];
 jabatanEl.innerHTML = '<option value="">'+(bagian ? 'Pilih jabatan' : 'Pilih bagian dahulu')+'</option>' + roles.map(function(j) {
   return '<option value="'+jobdeskSafe(j)+'">'+jobdeskSafe(j)+'</option>';
 }).join('');
}

function renderOwnerJobdeskList(items, options) {
 var list = document.getElementById('jobdesk-list');
 if (!list) return;
 options = options || window._ownerJobdeskOptions || mergeDaftarOptions({});
 var grouped = {};
 var saved = {};
 (items || []).forEach(function(item) {
   var bagian = normalizeDaftarBagianName(item.bagian);
   var jabatan = String(item.jabatan || '').trim();
   if (!bagian || !jabatan) return;
   saved[bagian+'\u0000'+jabatan] = item;
 });
 getOrderedDaftarBagian(options).forEach(function(bagian) {
   grouped[bagian] = (options[bagian] || []).map(function(jabatan) {
     return saved[bagian+'\u0000'+jabatan] || { bagian:bagian, jabatan:jabatan, link:'' };
   });
 });
 (items || []).forEach(function(item) {
   var bagian = normalizeDaftarBagianName(item.bagian);
   var jabatan = String(item.jabatan || '').trim();
   if (!bagian || !jabatan) return;
   if (!grouped[bagian]) grouped[bagian] = [];
   if (!grouped[bagian].some(function(row) { return row.jabatan === jabatan; })) {
     grouped[bagian].push({ bagian:bagian, jabatan:jabatan, link:item.link || '' });
   }
 });
 var bagianKeys = getOrderedDaftarBagian(grouped);
 var totalJabatan = 0, totalSiap = 0;
 bagianKeys.forEach(function(bagian) {
   totalJabatan += grouped[bagian].length;
   grouped[bagian].forEach(function(item) {
     if (/^https?:\/\//i.test(String(item.link || ''))) totalSiap++;
   });
 });
 var html = '<div class="jobdesk-list-head"><div><div class="eyebrow">DAFTAR JOBDESK</div><h2>Dokumen kerja semua tim</h2><p>Bagian dan jabatan mengikuti pilihan pada formulir pendaftaran akun.</p></div>'+
   '<div class="jobdesk-list-stats"><span class="status-pill status-pill-info">'+bagianKeys.length+' bagian</span><span class="status-pill status-pill-success">'+totalSiap+' / '+totalJabatan+' siap</span></div></div>'+
   '<div class="jobdesk-groups-grid">';
 bagianKeys.forEach(function(bagian) {
   html += '<section class="jobdesk-group"><div class="jobdesk-group-head"><h3>'+jobdeskSafe(bagian)+'</h3><span>'+grouped[bagian].length+' jabatan</span></div>';
   grouped[bagian].forEach(function(item) {
     var hasLink = /^https?:\/\//i.test(String(item.link || ''));
     html += '<div class="jobdesk-admin-row"><div class="jobdesk-admin-info"><strong>'+jobdeskSafe(item.jabatan)+'</strong><span>'+(hasLink ? 'Link Drive sudah terpasang' : 'Belum ada link dokumen')+'</span></div>'+
       '<span class="status-pill '+(hasLink?'status-pill-success':'status-pill-muted')+'">'+(hasLink?'Siap':'Kosong')+'</span>'+
       '<button class="btn btn-sm btn-secondary" data-bagian="'+encodeURIComponent(item.bagian)+'" data-jabatan="'+encodeURIComponent(item.jabatan)+'" data-link="'+encodeURIComponent(item.link || '')+'" onclick="editOwnerJobdeskFromButton(this)">'+(hasLink?'Ubah':'Isi Link')+'</button></div>';
   });
   html += '</section>';
 });
 list.innerHTML = html + '</div>';
}

function editOwnerJobdeskFromButton(btn) {
 editOwnerJobdesk(
   decodeURIComponent(btn.getAttribute('data-bagian') || ''),
   decodeURIComponent(btn.getAttribute('data-jabatan') || ''),
   decodeURIComponent(btn.getAttribute('data-link') || '')
 );
}

function editOwnerJobdesk(bagian, jabatan, link) {
 var bagianEl = document.getElementById('jobdesk-admin-bagian');
 bagianEl.value = bagian;
 updateOwnerJobdeskRoles();
 document.getElementById('jobdesk-admin-jabatan').value = jabatan;
 document.getElementById('jobdesk-admin-link').value = link || '';
 document.getElementById('jobdesk-owner-panel').scrollIntoView({ behavior:'smooth', block:'start' });
}

function saveOwnerJobdesk() {
 var bagian = document.getElementById('jobdesk-admin-bagian').value;
 var jabatan = document.getElementById('jobdesk-admin-jabatan').value;
 var link = document.getElementById('jobdesk-admin-link').value.trim();
 var btn = document.getElementById('jobdesk-save-btn');
 if (!bagian || !jabatan) { showToast('Pilih bagian dan jabatan'); return; }
 if (!/^https?:\/\//i.test(link)) { showToast('Masukkan link Google Drive yang valid'); return; }
 btn.disabled = true; btn.textContent = 'Menyimpan...';
 gasCall('saveOwnerJobdesk', [bagian, jabatan, link], function(res) {
   btn.disabled = false; btn.textContent = 'Simpan Jobdesk';
   if (!res || res.success === false) { showToast((res && res.msg) || 'Gagal menyimpan jobdesk'); return; }
   showToast('Link jobdesk berhasil disimpan');
   document.getElementById('jobdesk-admin-link').value = '';
   loadJobdeskList();
 }, function(){ btn.disabled = false; btn.textContent = 'Simpan Jobdesk'; showToast('Koneksi gagal'); });
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

 // Rekap kehadiran dipusatkan di menu Catatan Kehadiran agar Jobdesk tetap ringan.
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
 var requestedMonth = String(bulanKey || '');
 if (!res || !res.data || !res.data.length) {
 return '<div class="att-recap att-recap-muted">Rekap '+(requestedMonth ? labelBulanKey(requestedMonth) : 'kehadiran')+' belum tersedia.</div>';
 }
 var bulanList = res.data;
 var b = requestedMonth
 ? bulanList.find(function(x){ return x.bulan === requestedMonth; })
 : (bulanList.find(function(x){ return x.bulan === res.bulanIni; }) || bulanList[0]);
 if (requestedMonth && !b) {
 return '<div class="att-recap att-recap-muted">Rekap '+labelBulanKey(requestedMonth)+' belum tersedia.</div>';
 }
 var mingguList = b.mingguList || [];
 var dropId = 0;
 scopeId = scopeId || ('abs-' + Date.now());

 function money(n) { return (parseInt(n, 10) || 0).toLocaleString('id-ID'); }
 function detailLine(item, withMoney) {
 var text = cleanAbsensiText(item.keterangan || '');
 if (withMoney && item.nilai) text += ' &rarr; Rp ' + money(item.nilai);
 return text;
 }
 function dropdown(label, bgColor, textColor, items, total) {
 var id = scopeId + '-drp-' + (++dropId);
 var totalStr = total > 0 ? ' <span style="font-weight:800;color:'+textColor+'">Rp '+money(total)+'</span>' : '';
 var html = '<div style="margin-top:8px;background:'+bgColor+';border-radius:8px;overflow:hidden">';
 html += '<div onclick="toggleDropdown(\''+id+'\')" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer">';
 html += '<span style="font-size:12px;color:'+textColor+';font-weight:600">'+label+'</span>';
 html += '<span id="'+id+'-arr" style="font-size:11px;color:'+textColor+'">'+totalStr+' ▼</span></div>';
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
 html += '<div class="attendance-month-title">'+uiIcon('calendar', 'inline-icon')+'<span>'+(b.label || b.bulan)+'</span></div>';
 html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#22c55e">'+(b.totalHadir || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Hadir</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#ef4444">'+(b.totalAbsen || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Absen</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#f59e0b">'+(b.totalTelat || 0)+'</div><div style="font-size:10px;color:var(--text-muted)">Kali Telat</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--blue)">'+totalLemburDisplay+'</div><div style="font-size:10px;color:var(--text-muted)">Lembur</div></div>';
 html += '</div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Kehadiran: '+persen+'%</div>';
 html += '<div style="background:#e2e8f0;border-radius:4px;height:8px"><div style="background:'+barColor+';height:8px;border-radius:4px;width:'+persen+'%"></div></div>';

 var dendaItems = [];
 mingguList.forEach(function(w){ if (w.detail && w.detail.telat) w.detail.telat.forEach(function(d){ dendaItems.push(detailLine(d, true)); }); });
 if (b.detailPotonganAbsen) b.detailPotonganAbsen.forEach(function(d){ dendaItems.push('Potongan Absen: '+detailLine(d, true)); });
 if (b.detailDendaSP) b.detailDendaSP.forEach(function(d){ dendaItems.push('SP: '+detailLine(d, true)); });
 if (b.detailDendaManual && b.detailDendaManual.length) {
 dendaItems.push('Denda Manual');
 b.detailDendaManual.forEach(function(d){ dendaItems.push(formatTglJam(d.tanggal, d.jam)+detailLine(d, true)); });
 }
 if (b.totalDenda > 0) html += dropdown('Estimasi Denda Bulan Ini', '#fee2e2', '#991b1b', dendaItems, b.totalDenda);

 var rewardItems = [];
 if (b.detailLemburPulang) b.detailLemburPulang.forEach(function(d){ rewardItems.push('Lembur Pulang: '+detailLine(d, true)); });
 if (b.detailLemburMinggu) b.detailLemburMinggu.forEach(function(d){ rewardItems.push('Lembur Minggu: '+detailLine(d, true)); });
 if (b.detailLemburLibur) b.detailLemburLibur.forEach(function(d){ rewardItems.push('Lembur Hari Libur: '+detailLine(d, true)); });
 if (b.detailRewardManual && b.detailRewardManual.length) {
 rewardItems.push('Penghargaan Manual');
 b.detailRewardManual.forEach(function(d){ rewardItems.push(formatTglJam(d.tanggal, d.jam)+detailLine(d, true)); });
 }
 if (b.bonusKerajinan > 0) rewardItems.push('Bonus Kerajinan &rarr; Rp '+money(b.bonusKerajinan));
 var totalReward = (b.totalRewardLembur || 0) + (b.bonusKerajinan || 0);
 if (totalReward > 0) html += dropdown('Estimasi Penghargaan Bulan Ini', '#d1fae5', '#065f46', rewardItems, totalReward);

 var absenItems = [];
 if (b.detailAbsen && b.detailAbsen.length) b.detailAbsen.forEach(function(d){ absenItems.push(cleanAbsensiText(d.keterangan)); });
 else mingguList.forEach(function(w){ if (w.detail && w.detail.absen) w.detail.absen.forEach(function(d){ absenItems.push(cleanAbsensiText(d.keterangan)); }); });
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
 if (allTelat.length || (b.detailPotonganAbsen && b.detailPotonganAbsen.length)) {
 html += '<br><span style="color:#dc2626;font-weight:600">Denda: Rp '+money(b.totalDenda)+'</span>';
 allTelat.forEach(function(d){ html += '<br><span style="color:#dc2626;font-size:10px">&nbsp;&nbsp;&bull; '+cleanAbsensiText(d.keterangan)+'</span>'; });
 if (b.detailPotonganAbsen) b.detailPotonganAbsen.forEach(function(d){ html += '<br><span style="color:#dc2626;font-size:10px">&nbsp;&nbsp;&bull; '+cleanAbsensiText(d.keterangan)+' - Rp '+money(d.nilai)+'</span>'; });
 }
 allAbsen.forEach(function(d){ html += '<br><span style="color:#991b1b;font-size:10px">&nbsp;&nbsp;&bull; '+cleanAbsensiText(d.keterangan)+'</span>'; });
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
 if (['s-kelola-izin','s-payroll','s-setting-gaji','s-sanksi-manual','s-review-telat','s-laporan-absensi','s-kalender'].indexOf(m.id) !== -1) return 'Finance & Owner';
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
 _homeMenuLayoutDesktop = isDesktopLayout();
 return _homeMenuLayoutDesktop ? renderHomeMenuSectionList() : renderHomeCategoryIndex();
}

function renderRewardLoading() {
 return '<div class="reward-loading-card" aria-label="Memuat bintang bulan ini">'+
 '<div class="reward-loading-orbit"><span></span><span></span><span></span></div>'+
 '<div class="reward-loading-copy">'+
 '<div class="reward-loading-label">Menghubungkan table reward</div>'+
 '<div class="reward-loading-title">Menyiapkan Bintang Bulan Ini</div>'+
 '<div class="reward-loading-bars"><i></i><i></i><i></i></div>'+
 '</div>'+
 '</div>';
}

function isDesktopLayout() {
 return !!(window.matchMedia && window.matchMedia('(min-width: 900px)').matches && !document.body.classList.contains('phone-mode'));
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
 return '<section class="home-menu-section home-category-section">'+
 '<div class="home-section-head"><span></span><div><h2>'+tr('categoriesTitle')+'</h2><p>'+tr('categoriesSub')+'</p></div></div>'+
 '<div class="home-category-grid">'+order.map(function(cat) {
 var count = ((window._homeMenuGroups || {})[cat] || []).length;
 return '<button class="home-category-card" onclick="openHomeCategory(&quot;'+cat+'&quot;)">'+
 '<div class="home-category-icon">'+uiIcon(homeCategoryIcon(cat))+'</div>'+
 '<b>'+categoryLabel(cat)+'</b><small>'+categoryDesc(cat)+'</small><em>'+count+' menu</em></button>';
 }).join('')+'</div></section>';
}

function renderHomeMenuSectionList() {
 var order = window._homeMenuOrder || [];
 var groups = window._homeMenuGroups || {};
 var html = '<div class="home-menu-search"><span></span><input id="home-menu-search-input" placeholder="'+tr('searchMenu')+'" oninput="filterHomeMenus()"></div>';
 html += order.map(function(cat) {
 var menus = groups[cat] || [];
 return '<section class="home-menu-section" data-menu-section="'+cat.toLowerCase()+'">'+
 '<div class="home-section-head"><span></span><div><h2>'+categoryLabel(cat)+'</h2><p>'+categoryDesc(cat)+'</p></div></div>'+
 '<div class="home-menu-grid">'+menus.map(function(m) {
 return '<button class="menu-card" data-menu-search="'+(menuLabel(m)+' '+menuSub(m)+' '+categoryLabel(cat)).toLowerCase()+'" onclick="goTo(\''+m.id+'\')"><div class="menu-icon">'+uiIcon(m.icon)+'</div><h3>'+menuLabel(m)+'</h3><p>'+menuSub(m)+'</p></button>';
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
 var el = document.getElementById('home-menu');
 if (!el) return;
 _homeCategoryOpen = true;
 try { history.pushState({ screen: 's-home', category: cat }, '', '#home-category'); } catch(e) {}
 el.innerHTML = '<section class="home-menu-section home-menu-detail">'+
 '<button class="home-category-back" onclick="closeHomeCategory()">'+uiIcon('home')+' '+tr('backCategory')+'</button>'+
 '<div class="home-section-head"><span></span><div><h2>'+categoryLabel(cat)+'</h2><p>'+categoryDesc(cat)+'</p></div></div>'+
 '<div class="home-menu-grid">'+menus.map(function(m) {
 return '<button class="menu-card" onclick="goTo(\''+m.id+'\')"><div class="menu-icon">'+uiIcon(m.icon)+'</div><h3>'+menuLabel(m)+'</h3><p>'+menuSub(m)+'</p></button>';
 }).join('')+'</div></section>';
}

function closeHomeCategory(fromHistory) {
 var el = document.getElementById('home-menu');
 _homeCategoryOpen = false;
 if (el) el.innerHTML = isDesktopLayout() ? renderHomeMenuSectionList() : renderHomeCategoryIndex();
 if (!fromHistory) {
 try { history.replaceState({ screen: 's-home' }, '', '#s-home'); } catch(e) {}
 }
}

// ===== Tampilan PC: seluruh menu dipindah ke sidebar + laporan di halaman utama
var _pcNavApplied = false;
var _pcReportsLoading = false;
var _pcReportsLoadedAt = 0;
var _pcReportsStartedAt = 0;
var PC_SIDEBAR_WIDTH_KEY = 'hh_pc_sidebar_width';
var PC_SIDEBAR_DEFAULT_WIDTH = 256;
var PC_SIDEBAR_MIN_WIDTH = 228;

function pcSidebarMaxWidth() {
 return Math.max(PC_SIDEBAR_MIN_WIDTH, Math.min(380, Math.floor(window.innerWidth * 0.38)));
}

function pcClampSidebarWidth(value, maxWidth) {
 var max = Number(maxWidth) || pcSidebarMaxWidth();
 var width = (value === null || value === '') ? PC_SIDEBAR_DEFAULT_WIDTH : Number(value);
 if (!isFinite(width)) width = PC_SIDEBAR_DEFAULT_WIDTH;
 return Math.max(PC_SIDEBAR_MIN_WIDTH, Math.min(max, Math.round(width)));
}

function pcStoredSidebarWidth() {
 try { return pcClampSidebarWidth(localStorage.getItem(PC_SIDEBAR_WIDTH_KEY)); }
 catch (e) { return PC_SIDEBAR_DEFAULT_WIDTH; }
}

function pcApplySidebarWidth(value, persist) {
 var max = pcSidebarMaxWidth();
 var width = pcClampSidebarWidth(value, max);
 document.documentElement.style.setProperty('--pc-sidebar-width', width + 'px');
 document.documentElement.style.setProperty('--pc-sidebar-track', (width + 38) + 'px');
 document.querySelectorAll('.pc-sidebar-resizer').forEach(function (handle) {
  handle.setAttribute('aria-valuemin', String(PC_SIDEBAR_MIN_WIDTH));
  handle.setAttribute('aria-valuemax', String(max));
  handle.setAttribute('aria-valuenow', String(width));
  handle.setAttribute('aria-valuetext', width + ' piksel');
 });
 if (persist) {
  try { localStorage.setItem(PC_SIDEBAR_WIDTH_KEY, String(width)); } catch (e) {}
 }
 return width;
}

function pcAttachSidebarResizer(nav) {
 if (!nav || nav.querySelector('.pc-sidebar-resizer')) return;
 var handle = document.createElement('div');
 handle.className = 'pc-sidebar-resizer';
 handle.setAttribute('role', 'separator');
 handle.setAttribute('aria-orientation', 'vertical');
 handle.setAttribute('aria-label', 'Atur lebar sidebar');
 handle.setAttribute('tabindex', '0');
 handle.setAttribute('title', 'Tarik untuk mengubah lebar. Klik dua kali untuk kembali ke ukuran awal.');
 nav.appendChild(handle);
 pcApplySidebarWidth(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pc-sidebar-width')) || pcStoredSidebarWidth(), false);

 handle.addEventListener('pointerdown', function (event) {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  var startX = event.clientX;
  var startWidth = nav.getBoundingClientRect().width;
  document.body.classList.add('pc-sidebar-resizing');
  try { handle.setPointerCapture(event.pointerId); } catch (e) {}

  function onMove(moveEvent) {
   pcApplySidebarWidth(startWidth + moveEvent.clientX - startX, false);
  }
  function onEnd() {
   window.removeEventListener('pointermove', onMove);
   window.removeEventListener('pointerup', onEnd);
   window.removeEventListener('pointercancel', onEnd);
   document.body.classList.remove('pc-sidebar-resizing');
   pcApplySidebarWidth(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pc-sidebar-width')), true);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);
 });

 handle.addEventListener('keydown', function (event) {
  var current = pcStoredSidebarWidth();
  var next = current;
  if (event.key === 'ArrowLeft') next = current - 12;
  else if (event.key === 'ArrowRight') next = current + 12;
  else if (event.key === 'Home') next = PC_SIDEBAR_MIN_WIDTH;
  else if (event.key === 'End') next = pcSidebarMaxWidth();
  else return;
  event.preventDefault();
  pcApplySidebarWidth(next, true);
 });

 handle.addEventListener('dblclick', function () {
  pcApplySidebarWidth(PC_SIDEBAR_DEFAULT_WIDTH, true);
 });
}

// Layar yang memang tidak boleh punya sidebar (sebelum login / wajib ganti sandi).
var PC_SIDEBAR_SKIP = ['s-login', 's-daftar', 's-paksa-ganti-pin'];

function pcNavbarEls() {
 return Array.prototype.slice.call(document.querySelectorAll('.navbar'));
}

// Sebagian layar (Catatan Kehadiran, Payroll, dll) belum punya kartu navbar sama
// sekali sehingga sidebar-nya hilang saat dibuka. Di tampilan PC kita tambahkan
// navbar kosong di layar itu supaya sidebar tampil sama seperti di beranda.
function pcEnsureSidebars() {
 Array.prototype.slice.call(document.querySelectorAll('.screen')).forEach(function (s) {
  if (PC_SIDEBAR_SKIP.indexOf(s.id) !== -1) return;
  var punya = Array.prototype.some.call(s.children, function (c) {
   return c.classList && c.classList.contains('navbar');
  });
  if (punya) return;
  var nav = document.createElement('div');
  nav.className = 'navbar pc-nav-injected';
  nav.setAttribute('data-pc-sidebar', '1');
  s.appendChild(nav);
 });
}

function pcRemoveInjectedSidebars() {
 Array.prototype.slice.call(document.querySelectorAll('.navbar[data-pc-sidebar]')).forEach(function (nav) {
  if (nav.parentNode) nav.parentNode.removeChild(nav);
 });
}

function pcActiveScreenId() {
 var aktif = document.querySelector('.screen.active');
 return aktif ? aktif.id : 's-home';
}

function pcSidebarModel() {
 return {
  menus: window._homeMenus || [],
  activeId: pcActiveScreenId(),
  urutan: window._homeMenuOrder || [],
  kategoriDari: menuCategory,
  labelKategori: categoryLabel,
  beranda: { id: 's-home', label: 'Beranda', icon: 'home' }
 };
}

// Tempel daftar menu lengkap ke kartu sidebar (hanya tampilan PC). Saat kembali
// ke tampilan HP, navbar aslinya (4 menu bawah) dipulihkan apa adanya dan navbar
// tambahan dibuang supaya bar bawah HP tidak jadi kosong.
function applyDesktopNavigation() {
 if (!isDesktopLayout()) {
  pcRemoveInjectedSidebars();
  pcNavbarEls().forEach(function (nav) {
   if (nav.__pcOriginalHtml !== undefined) nav.innerHTML = nav.__pcOriginalHtml;
   nav.classList.remove('pc-nav-full');
  });
  _pcNavApplied = false;
  return;
 }
 if (!window._homeMenus || !window._homeMenus.length) return;
 pcEnsureSidebars();
 var navs = pcNavbarEls();
 if (!navs.length) return;
 navs.forEach(function (nav) {
  if (nav.__pcOriginalHtml === undefined && !nav.getAttribute('data-pc-sidebar')) {
   nav.__pcOriginalHtml = nav.innerHTML;
  }
 });
 var html = pcRenderSidebarNav(pcSidebarModel());
 pcApplySidebarWidth(pcStoredSidebarWidth(), false);
 navs.forEach(function (nav) {
  nav.innerHTML = html;
  nav.classList.add('pc-nav-full');
  pcAttachSidebarResizer(nav);
 });
 _pcNavApplied = true;
}

function updateDesktopNavActive(activeId) {
 if (!_pcNavApplied || !activeId) return;
 pcNavbarEls().forEach(function (nav) {
  nav.querySelectorAll('.pc-nav-item').forEach(function (btn) {
   btn.classList.toggle('active', btn.getAttribute('data-screen') === activeId);
  });
 });
}

function pcSetReportHead(kicker, judul, sub) {
 var k = document.getElementById('pc-reports-kicker');
 var t = document.getElementById('pc-reports-title');
 var s = document.getElementById('pc-reports-sub');
 if (k) k.textContent = kicker;
 if (t) t.textContent = judul;
 if (s) s.textContent = sub;
}

// Laporan halaman utama (tampilan PC saja). Owner/Finance melihat laporan tim,
// karyawan melihat ringkasan pribadi. Semua data diambil dari aksi yang sudah
// ada, jadi tidak ada query baru yang perlu dipasang di Supabase.
function loadDesktopReports(force) {
 var sec = document.getElementById('pc-reports');
 var grid = document.getElementById('pc-reports-grid');
 if (!sec || !grid) return;
 if (!isDesktopLayout() || !currentUser) { sec.hidden = true; return; }
 sec.hidden = false;
 if (_pcReportsLoading && (Date.now() - _pcReportsStartedAt) < 30000) return;
 if (!force && _pcReportsLoadedAt && (Date.now() - _pcReportsLoadedAt) < 60 * 1000) return;
 _pcReportsLoading = true;
 _pcReportsStartedAt = Date.now();

 var bulanKey = attendanceMonthKey(new Date());
 var todayKey = pcTodayKey(new Date());
 var jamSekarang = pcUpdatedText(new Date());
 var isTeam = currentUser.bagian === 'Owner' || currentUser.bagian === 'Finance';
 var judul = isTeam ? 'Ringkasan Tim Hari Ini' : 'Ringkasan Saya';
 var kicker = isTeam ? 'LAPORAN OPERASIONAL' : 'RINGKASAN SAYA';

 pcSetReportHead(kicker, judul, 'Memuat data...');
 grid.innerHTML = skelCards(3);

 var gagal = [];
 var selesai = 0;
 var target = isTeam ? 5 : 3;

 function langkah() {
  selesai++;
  if (selesai < target) return;
  _pcReportsLoading = false;
  _pcReportsLoadedAt = Date.now();
  if (gagal.length) {
   pcSetReportHead(kicker, judul, 'Diperbarui ' + jamSekarang + ' · Sebagian data gagal dimuat: ' + gagal.join(' | '));
  } else {
   pcSetReportHead(kicker, judul, 'Diperbarui pukul ' + jamSekarang + ' · ' + labelBulanKey(bulanKey));
  }
  try {
   render();
  } catch (e) {
   // Jangan biarkan skeleton menggantung: tampilkan sebab aslinya.
   var info = catatRuntimeError('laporan-utama', e);
   gagal.push('tampilan: ' + info.pesan);
   grid.innerHTML = '<div class="empty-state" role="alert"><strong>Laporan gagal ditampilkan</strong><br><small>' +
    jobdeskSafe(info.pesan) + '</small></div>';
   pcSetReportHead(kicker, judul, 'Diperbarui ' + jamSekarang + ' · gagal: ' + info.pesan);
  }
 }

 function ambil(nama, action, args, simpan) {
  gasCall(action, args, function (res) {
   try { simpan(res); } catch (e) { gagal.push(nama + ': ' + ((e && e.message) ? e.message : 'gagal dibaca')); }
   langkah();
  }, function (err) {
   gagal.push(nama + ': ' + ((err && err.message) ? err.message : 'koneksi gagal'));
   langkah();
  });
 }

 if (isTeam) {
  var bag = { matrix: null, rekap: null, izin: [], peng: [], libur: [] };
  ambil('kehadiran', 'getAbsensiMatrix', [bulanKey], function (r) {
   bag.matrix = r;
   if (r && r.success === false) gagal.push('kehadiran: ' + (r.msg || 'gagal dimuat'));
  });
  ambil('kinerja bulan ini', 'getRekapBulananSemua', [bulanKey], function (r) {
   bag.rekap = r;
   if (r && r.success === false) gagal.push('kinerja: ' + (r.msg || 'gagal dimuat'));
  });
  ambil('antrian izin', 'getIzinPending', [], function (r) { bag.izin = r || []; });
  ambil('pengumuman', 'getPengumuman', [currentUser.bagian], function (r) { bag.peng = r || []; });
  ambil('kalender libur', 'getKalenderLibur', [], function (r) { bag.libur = r || []; });

  var render = function () {
   var liburNama = pcLiburHariIni(bag.libur, todayKey);
   var sum = pcAttendanceSummary(bag.matrix, todayKey, { liburNama: liburNama });
   var perf = pcPerformanceSummary(bag.rekap);
   grid.innerHTML =
    pcAttendanceCardHtml(sum, { jamSekarang: jamSekarang }) +
    pcPerformanceCardHtml(perf, labelBulanKey(bulanKey)) +
    pcActionCardHtml({ izinPending: bag.izin, pengumuman: bag.peng });
  };
 } else {
  var sendiri = { matrix: null, izin: [], slip: [] };
  ambil('absensi saya', 'getAbsensiMatrixUser', [currentUser.id, bulanKey], function (r) {
   sendiri.matrix = r;
   if (r && r.success === false) gagal.push('absensi: ' + (r.msg || 'gagal dimuat'));
  });
  ambil('izin saya', 'getIzinKaryawan', [currentUser.id], function (r) { sendiri.izin = r || []; });
  ambil('slip gaji', 'getPayrollEmployeeSlip', [currentUser.id], function (r) {
   sendiri.slip = (r && r.data) ? r.data : [];
  });

  var render = function () {
   var sum = pcPersonalSummary(sendiri.matrix, todayKey);
   var prof = (window._lastHomeData && window._lastHomeData.profile) || {};
   var statusText = sum.masuk
    ? (sum.telat ? 'Masuk ' + sum.masuk + ' — terlambat dari jadwal ' + (sum.jadwal || '08:00') : 'Masuk ' + sum.masuk + ' — tepat waktu')
    : 'Belum ada absensi hari ini';
   grid.innerHTML = pcPersonalReportsHtml({
    attendance: { statusText: statusText, masuk: sum.masuk, pulang: sum.pulang, jadwal: sum.jadwal },
    performance: {
     skor: (prof.skor === undefined || prof.skor === null) ? null : prof.skor,
     bintang: prof.bintang || 0,
     hadir: sum.hadir, telat: sum.telatCount, absen: sum.absen
    },
    izin: sendiri.izin,
    slip: sendiri.slip
   });
  };
 }
}

var _homeMenuLayoutDesktop = null;
window.addEventListener('resize', function() {
 var el = document.getElementById('home-menu');
 if (!el || !window._homeMenuGroups) return;
 var nowDesktop = isDesktopLayout();
 if (_homeMenuLayoutDesktop === null) {
 _homeMenuLayoutDesktop = nowDesktop;
 return;
 }
 if (_homeMenuLayoutDesktop === nowDesktop) return;
 _homeMenuLayoutDesktop = nowDesktop;
 _homeCategoryOpen = false;
 el.innerHTML = nowDesktop ? renderHomeMenuSectionList() : renderHomeCategoryIndex();
 applyDesktopNavigation();
 loadDesktopReports(true);
});

function refreshHomeData() {
 var btn = document.querySelector('.home-refresh-btn');
 if (btn) btn.classList.add('loading');
 window.location.reload();
}

function showBulanPicker() {
 var picker = document.getElementById('bulan-picker');
 if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
}

var _announcementUsers = [];

function loadPengumumanComposer() {
 var panel = document.getElementById('announcement-owner-panel');
 var isOwner = currentUser && currentUser.bagian === 'Owner';
 if (panel) panel.style.display = isOwner ? 'block' : 'none';
 if (!isOwner) return;
 updatePengumumanTargetFields();
 gasCall('getAllUsers', [], function(data) {
  _announcementUsers = (data || []).filter(function(user) { return user.status === 'AKTIF'; });
  var bagianOptions = _daftarOptions || mergeDaftarOptions();
  var bagianList = getOrderedDaftarBagian(bagianOptions);
  var bagianEl = document.getElementById('peng-target-bagian');
  var userEl = document.getElementById('peng-target-user');
  setDaftarSelectOptions(bagianEl, 'Pilih bagian', bagianList);
  userEl.innerHTML = '<option value="">Pilih orang</option>';
  _announcementUsers.forEach(function(user) {
   if (user.bagian === 'Owner') return;
   var option = document.createElement('option');
   option.value = user.id;
   option.textContent = user.nama + ' — ' + normalizeDaftarBagianName(user.bagian) + ' / ' + user.jabatan;
   userEl.appendChild(option);
  });
 }, function() {
  var userEl = document.getElementById('peng-target-user');
  if (userEl) userEl.innerHTML = '<option value="">Daftar karyawan gagal dimuat</option>';
 });
}

function getPengumumanTargetMode() {
 var checked = document.querySelector('input[name="peng-target-mode"]:checked');
 return checked ? checked.value : 'ALL';
}

function updatePengumumanTargetFields() {
 var mode = getPengumumanTargetMode();
 var bagianGroup = document.getElementById('peng-target-bagian-group');
 var userGroup = document.getElementById('peng-target-user-group');
 var summary = document.getElementById('peng-target-summary');
 if (bagianGroup) bagianGroup.style.display = mode === 'BAGIAN' ? 'block' : 'none';
 if (userGroup) userGroup.style.display = mode === 'USER' ? 'block' : 'none';
 if (summary) summary.textContent = mode === 'ALL' ? 'Akan dikirim ke seluruh anggota tim.' : mode === 'BAGIAN' ? 'Hanya anggota pada bagian yang dipilih yang dapat melihat.' : 'Hanya orang yang dipilih yang dapat melihat.';
}

function formatAnnouncementTarget(target) {
 target = String(target || 'ALL');
 if (target === 'ALL') return 'Semua Tim';
 if (target.indexOf('USER:') === 0) {
  var id = target.slice(5);
  var user = _announcementUsers.find(function(item){ return item.id === id; });
  return user ? user.nama : 'Orang Tertentu';
 }
 return normalizeDaftarBagianName(target);
}

function loadPengumuman() {
 var list = document.getElementById('pengumuman-list');
 list.innerHTML = skelCards(3);
 loadPengumumanComposer();
 gasCall('getPengumuman', [currentUser ? currentUser.bagian : 'ALL'], function(data) {
 var totalEl = document.getElementById('announcement-total');
 var importantEl = document.getElementById('announcement-important');
 var feedStatus = document.getElementById('announcement-feed-status');
 var rows = data || [];
 if (totalEl) totalEl.textContent = rows.length;
 if (importantEl) importantEl.textContent = rows.filter(function(p){ return p.kategori === 'PENTING'; }).length;
 if (feedStatus) feedStatus.textContent = rows.length + ' pengumuman';
 if (!rows.length) { list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div><strong>Belum ada pengumuman</strong><br><small>Informasi terbaru dari Owner akan muncul di sini.</small></div>'; return; }
 var bdg = {PENTING:'badge-red', INFO:'badge-blue', UMUM:'badge-green'};
 list.innerHTML = rows.map(function(p) {
 var targetLabel = formatAnnouncementTarget(p.targetBagian);
 return '<article class="peng-card announcement-card"><div class="peng-header"><div class="announcement-card-badges"><span class="badge '+(bdg[p.kategori]||'badge-gray')+'">'+jobdeskSafe(p.kategori)+'</span><span class="announcement-target-badge">'+uiIcon('users')+' '+jobdeskSafe(targetLabel)+'</span></div><time class="peng-tgl">'+jobdeskSafe(p.tgl)+'</time></div>'+
 '<h3 class="peng-title">'+jobdeskSafe(p.judul)+'</h3><div class="peng-isi">'+jobdeskSafe(p.isi)+'</div></article>';
 }).join('');
 }, function(){ var feedStatus=document.getElementById('announcement-feed-status'); if(feedStatus) feedStatus.textContent='Gagal'; list.innerHTML = '<div class="empty-state">Gagal memuat pengumuman. Silakan coba lagi.</div>'; });
}

function submitPengumuman() {
 var judul = document.getElementById('peng-judul').value.trim();
 var isi = document.getElementById('peng-isi').value.trim();
 var kategori = document.getElementById('peng-kategori').value;
 var mode = getPengumumanTargetMode();
 var target = 'ALL';
 if (mode === 'BAGIAN') target = document.getElementById('peng-target-bagian').value;
 if (mode === 'USER') target = 'USER:' + document.getElementById('peng-target-user').value;
 if (!judul || !isi) { showToast('Judul dan isi wajib diisi'); return; }
 if ((mode === 'BAGIAN' && !target) || (mode === 'USER' && target === 'USER:')) { showToast('Pilih penerima pengumuman'); return; }
 var btn = document.getElementById('peng-submit-btn');
 btn.disabled = true; btn.textContent = 'Mengirim...';
 gasCall('addPengumuman', [judul, isi, kategori, target, currentUser.nama], function(res) {
 btn.disabled = false; btn.textContent = 'Kirim Pengumuman';
 if (!res || res.success === false) { showToast((res && res.msg) || 'Pengumuman gagal dikirim'); return; }
 document.getElementById('peng-judul').value = '';
 document.getElementById('peng-isi').value = '';
 showToast('Pengumuman berhasil dikirim');
 loadPengumuman();
 }, function(){ btn.disabled = false; btn.textContent = 'Kirim Pengumuman'; showToast('Gagal mengirim. Coba lagi.'); });
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
 var safeId = String(l.id || '').replace(/'/g, "\\'");
 var safeNama = String(l.nama || '').replace(/'/g, "\\'");
 var safeTgl = String(l.tanggal || '').replace(/'/g, "\\'");
 return '<div class="list-item" style="cursor:default">'+
 '<div class="list-icon" style="background:#fee2e2"></div>'+
 '<div class="list-info"><h4>'+l.nama+'</h4><p>'+l.tanggal+'</p></div>'+
 '<span class="badge badge-red" style="margin-right:6px">Difasilitasi</span>'+
 '<button class="btn btn-sm btn-danger icon-only-btn" title="Hapus" aria-label="Hapus hari libur" '+
 'onclick="hapusLibur(\''+safeId+'\',\''+safeNama+'\',\''+safeTgl+'\', this)">'+uiIcon('close')+'</button>'+
 '</div>';
 }).join('');
 }, function(){});
}

function submitLibur() {
 var tgl = document.getElementById('libur-tgl').value;
 var nama = document.getElementById('libur-nama').value.trim();
 var btn = document.getElementById('btn-add-libur');
 if (!tgl || !nama) { showToast('Tanggal dan nama wajib diisi'); return; }
 if (btn && btn.disabled) return; // sudah lagi proses, abaikan double click
 if (btn) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = 'Menambahkan...';
  btn.style.opacity = '0.6';
  btn.style.cursor = 'not-allowed';
 }
 function resetBtn() {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || 'Tambah';
  btn.style.opacity = '';
  btn.style.cursor = '';
 }
 gasCall('addLibur', [tgl, nama, currentUser.nama], function(res) {
  resetBtn();
  if (!res || res.success === false || res.error) {
   var errMsg = (res && (res.msg || res.error)) || 'Gagal menambah hari libur';
   if (String(errMsg).indexOf('Unknown action') !== -1) {
    errMsg = 'Backend Apps Script belum di-deploy versi baru. Buka Apps Script → Deploy → Manage deployments → New version.';
   }
   showToast(errMsg);
   return;
  }
  document.getElementById('libur-tgl').value = '';
  document.getElementById('libur-nama').value = '';
  showToast('Hari libur berhasil ditambahkan!');
  loadKalender();
 }, function() {
  resetBtn();
  showToast('Gagal. Coba lagi.');
 });
}

function hapusLibur(id, nama, tgl, btn) {
 if (!id) { showToast('ID libur tidak valid'); return; }
 if (!confirm('Hapus hari libur "'+nama+'" pada '+tgl+'?')) return;
 if (btn) {
  btn.disabled = true;
  btn.textContent = '...';
  btn.style.opacity = '0.6';
 }
 var actor = (currentUser && currentUser.nama) ? currentUser.nama : '';
 gasCall('hapusLibur', [id, actor], function(res) {
  // Perlakukan error / success:false / respon kosong sebagai gagal
  if (!res || res.success === false || res.error) {
   var errMsg = (res && (res.msg || res.error)) || 'Gagal menghapus hari libur';
   if (String(errMsg).indexOf('Unknown action') !== -1) {
    errMsg = 'Backend Apps Script belum di-deploy versi baru. Buka Apps Script → Deploy → Manage deployments → New version.';
   }
   showToast(errMsg);
   if (btn) { btn.disabled = false; btn.innerHTML = uiIcon('close'); btn.style.opacity = ''; }
   return;
  }
  showToast('Hari libur berhasil dihapus');
  loadKalender();
 }, function() {
  showToast('Gagal. Coba lagi.');
  if (btn) { btn.disabled = false; btn.innerHTML = uiIcon('close'); btn.style.opacity = ''; }
 });
}

var _ownerAccounts = [];

function loadUsers(force) {
 var list = document.getElementById('users-list');
 if (!list) return;
 if (!currentUser || currentUser.bagian !== 'Owner') {
  list.innerHTML = '<div class="empty-state">Menu ini khusus Owner.</div>';
  return;
 }
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Memuat akun terdaftar...</div>';
 if (force) cacheClear('getOwnerAccounts' + JSON.stringify([]));
 gasCall('getOwnerAccounts', [], function(data) {
  _ownerAccounts = Array.isArray(data) ? data : [];
  renderOwnerAccounts();
 }, function() {
  list.innerHTML = '<div class="empty-state">Gagal memuat akun. Periksa koneksi lalu coba lagi.</div>';
 });
}

function renderOwnerAccounts() {
 var list = document.getElementById('users-list');
 if (!list) return;
 var searchEl = document.getElementById('owner-user-search');
 var filterEl = document.getElementById('owner-user-filter');
 var query = String(searchEl ? searchEl.value : '').trim().toLowerCase();
 var filter = filterEl ? filterEl.value : 'ALL';
 var total = _ownerAccounts.length;
 var aktif = _ownerAccounts.filter(function(u){ return u.status === 'AKTIF'; }).length;
 var nonaktif = total - aktif;
 document.getElementById('owner-users-total').textContent = total;
 document.getElementById('owner-users-active').textContent = aktif;
 document.getElementById('owner-users-inactive').textContent = nonaktif;
 var shown = _ownerAccounts.filter(function(u) {
  if (filter !== 'ALL' && u.status !== filter) return false;
  if (!query) return true;
  return [u.nama,u.bagian,u.jabatan,u.email].join(' ').toLowerCase().indexOf(query) !== -1;
 });
 if (!shown.length) {
  list.innerHTML = '<div class="empty-state">Tidak ada akun yang cocok dengan pencarian atau filter.</div>';
  return;
 }
 list.innerHTML = shown.map(ownerAccountCard).join('');
}

function ownerAccountCard(u, i) {
 var ci = (i || 0) % AVT_BG.length;
 var nama = htmlEscape(cleanDisplayText(u.nama));
 var bagian = htmlEscape(cleanDisplayText(u.bagian));
 var jabatan = htmlEscape(cleanDisplayText(u.jabatan));
 var email = htmlEscape(cleanDisplayText(u.email || 'Email tidak tersedia'));
 var tanggal = htmlEscape(cleanDisplayText(u.createdAt || 'Tanggal tidak tersedia'));
 var isOwner = u.bagian === 'Owner';
 var statusBadge = u.status === 'AKTIF'
  ? '<span class="badge badge-green">Aktif</span>'
  : '<span class="badge badge-red">Nonaktif</span>';
 var action = '';
 var telegramAction = !isOwner && u.status === 'AKTIF'
  ? '<button class="btn btn-light btn-sm" aria-label="Uji laporan absensi Telegram '+nama+'" onclick="testEmployeeAttendanceTelegram(\''+u.id+'\',\''+esc(u.nama)+'\',this)">Uji Absensi Telegram</button>'
  : '';
 if (isOwner || (currentUser && u.id === currentUser.id)) {
  action = '<span class="badge badge-gray">Akun Owner</span>';
 } else if (u.status === 'AKTIF') {
  action = '<button class="btn btn-danger btn-sm" aria-label="Nonaktifkan '+nama+'" onclick="setUserAccess(\''+u.id+'\',false,\''+esc(u.nama)+'\')">Kick / Nonaktifkan</button>';
 } else {
  action = '<button class="btn btn-primary btn-sm" aria-label="Aktifkan kembali '+nama+'" onclick="setUserAccess(\''+u.id+'\',true,\''+esc(u.nama)+'\')">Aktifkan Kembali</button>';
 }
 return '<div class="list-item owner-user-card" style="cursor:default">'+
  '<div class="avatar" style="background:'+AVT_BG[ci]+';color:'+AVT_TXT[ci]+'">'+htmlEscape(initials(u.nama))+'</div>'+
  '<div class="list-info"><h4>'+nama+'</h4><p>'+jabatan+' · '+bagian+'</p>'+
  '<p class="owner-user-meta">'+email+' · Terdaftar '+tanggal+'</p></div>'+
  '<div class="owner-user-actions">'+statusBadge+telegramAction+action+'</div></div>';
}

function setUserAccess(userId, makeActive, nama) {
 var actionLabel = makeActive ? 'Aktifkan kembali' : 'Kick / nonaktifkan';
 var effect = makeActive ? 'Akun dapat login kembali.' : 'Akun tidak dapat login atau memakai fitur terlindungi, tetapi histori tetap tersimpan.';
 if (!confirm(actionLabel+' akses '+nama+'?\n'+effect)) return;
 gasCall('setUserAccess', [userId, makeActive], function(r) {
  if (!r || r.success === false) { showToast((r && r.msg) || 'Perubahan akses gagal'); return; }
  showToast(r.msg || (nama + (makeActive ? ' berhasil diaktifkan' : ' berhasil dinonaktifkan')));
  loadUsers(true);
 }, function(){ showToast('Gagal mengubah akses. Coba lagi.'); });
}

function userCard(u, i) { return ownerAccountCard(u, i); }
function tendang(userId, nama) { setUserAccess(userId, false, nama); }

function testAttendanceTelegram(btn) {
 if (!currentUser || currentUser.bagian !== 'Owner') { showToast('Menu ini khusus Owner'); return; }
 if (btn && btn.disabled) return;
 var originalText = btn ? btn.textContent : 'Uji Telegram';
 if (btn) { btn.disabled = true; btn.textContent = 'Mengirim tes...'; }
 gasCall('testAttendanceTelegram', [], function(res) {
  if (btn) { btn.disabled = false; btn.textContent = originalText; }
  if (!res || res.success === false) { showToast((res && res.msg) || 'Uji Telegram gagal'); return; }
  showToast('Pesan uji Telegram berhasil dikirim');
 }, function() {
  if (btn) { btn.disabled = false; btn.textContent = originalText; }
  showToast('Uji Telegram gagal. Periksa koneksi dan secret Supabase.');
 });
}

function testEmployeeAttendanceTelegram(userId, nama, btn) {
 if (!currentUser || currentUser.bagian !== 'Owner') { showToast('Menu ini khusus Owner'); return; }
 if (btn && btn.disabled) return;
 var originalText = btn ? btn.textContent : 'Uji Absensi Telegram';
 if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
 gasCall('testEmployeeAttendanceTelegram', [userId, 'MASUK'], function(res) {
  if (btn) { btn.disabled = false; btn.textContent = originalText; }
  if (!res || res.success === false) { showToast((res && res.msg) || 'Uji laporan absensi gagal'); return; }
  showToast('Contoh laporan absensi '+nama+' berhasil dikirim');
 }, function() {
  if (btn) { btn.disabled = false; btn.textContent = originalText; }
  showToast('Uji laporan absensi gagal. Periksa koneksi Telegram.');
 });
}

function submitTambahKaryawan() {
 var nama = (document.getElementById('tk-nama').value || '').trim();
 var bagian = (document.getElementById('tk-bagian').value || '').trim();
 var jabatan = (document.getElementById('tk-jabatan').value || '').trim();
 var email = (document.getElementById('tk-email').value || '').trim();
 var errEl = document.getElementById('tk-error');
 var btn = document.getElementById('tk-btn');
 errEl.textContent = '';
 if (!nama) { errEl.textContent = 'Nama wajib diisi'; return; }
 if (!bagian) { errEl.textContent = 'Bagian wajib diisi'; return; }
 if (!jabatan) { errEl.textContent = 'Jabatan wajib diisi'; return; }
 if (!email) { errEl.textContent = 'Email wajib diisi (dipakai untuk login)'; return; }
 btn.disabled = true; btn.textContent = 'Mendaftarkan...';
 gasCall('addKaryawanBaru', [nama, bagian, jabatan, email], function(res) {
  btn.disabled = false; btn.textContent = 'Daftarkan Karyawan';
  if (res && res.success) {
   document.getElementById('tk-nama').value = '';
   document.getElementById('tk-bagian').value = '';
   document.getElementById('tk-jabatan').value = '';
   document.getElementById('tk-email').value = '';
   cacheClear('getAllUsers' + JSON.stringify([]));
   showToast(nama + ' berhasil didaftarkan! Password: hosela');
   goTo('s-manage-users');
  } else {
   errEl.textContent = (res && res.msg) ? res.msg : 'Gagal mendaftarkan. Coba lagi.';
  }
 }, function() {
  btn.disabled = false; btn.textContent = 'Daftarkan Karyawan';
  errEl.textContent = 'Koneksi gagal. Coba lagi.';
 });
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
 '<div class="kpi-check-no"><span class="kpi-star-symbol">'+uiIcon('star', 'rating-star')+'</span><small>'+(i+1)+'</small></div>'+
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
 for (var si = 0; si < 5; si++) stars += '<span class="'+(si < d.bintang ? 'star-filled' : 'star-empty')+'">'+uiIcon('star', 'rating-star')+'</span>';
 var isSelf = d.id === currentUser.id;
 var apresiasiHtml = isSelf ? '<div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:3px">'+cleanDisplayText(d.apresiasi)+'</div>' : '';
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
 // Pakai tanggal lokal agar tidak bergeser sehari karena zona waktu UTC.
 var now = new Date();
 var today = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 document.getElementById('izin-tanggal').value = today;
 toggleFotoField(document.getElementById('izin-jenis').value);
 // Load riwayat
 var hist = document.getElementById('izin-history');
 hist.innerHTML = skelCards(3);
 gasCall('getIzinKaryawan', [currentUser.id], function(data) {
 if (!data || !data.length) { hist.innerHTML = '<div class="empty-state">Belum ada pengajuan</div>'; return; }
 hist.innerHTML = data.map(function(d) {
 var statusClass = d.status === 'DISETUJUI' ? 'success' : d.status === 'DITOLAK' ? 'danger' : 'warning';
 return '<article class="izin-history-item">'+
 '<div class="izin-history-main"><strong>'+jobdeskSafe(d.jenis)+' · '+jobdeskSafe(d.tanggal)+'</strong>'+
 '<p>'+jobdeskSafe(d.keterangan || '-')+'</p></div>'+
 '<span class="status-pill status-pill-'+statusClass+'">'+jobdeskSafe(d.status || 'MENUNGGU')+'</span></article>';
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
 var btn = document.querySelector('.izin-submit-btn');
 btn.textContent = 'Mengirim...'; btn.disabled = true;
 gasCall('submitIzin', [currentUser.id, tgl, jenis, ket, foto], function(r) {
 btn.textContent = 'Kirim Pengajuan'; btn.disabled = false;
 if (r.success) {
 document.getElementById('izin-keterangan').value = '';
 document.getElementById('izin-foto').value = '';
 showToast('Pengajuan berhasil dikirim! ');
 loadIzin();
 } else { showToast((r && r.msg) || 'Gagal mengirim. Coba lagi.'); }
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
 badge.style.cssText = 'position:absolute;top:-8px;right:-8px;z-index:30;background:#dc2626;color:#fff;border:2px solid #fff;border-radius:999px;min-width:22px;height:22px;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 8px 18px rgba(220,38,38,.28)';
 badge.textContent = count > 9 ? '9+' : count;
 card.style.position = 'relative';
 card.appendChild(badge);
 }
 }
 });
}

var PERATURAN_DRIVE_CATEGORY = 'DOKUMEN PERATURAN';

function getPeraturanDriveItem(data) {
 return (data || []).find(function(item) {
  return String(item.kategori || '').trim().toUpperCase() === PERATURAN_DRIVE_CATEGORY;
 }) || null;
}

function renderPeraturanDriveCard(item, isOwner) {
 var card = document.getElementById('peraturan-drive-card');
 if (!card) return;
 var link = item && /^https?:\/\//i.test(String(item.isi || '')) ? String(item.isi) : '';
 var editor = document.getElementById('peraturan-drive-link');
 if (editor) editor.value = link;
 card.className = 'peraturan-drive-card' + (link ? ' has-document' : ' is-empty');
 card.innerHTML = '<div class="peraturan-drive-icon">'+uiIcon('book')+'</div><div class="peraturan-drive-copy">'+
   '<div class="eyebrow">DOKUMEN RESMI</div><h2>Peraturan Kantor Hosela</h2><p>'+
   (link ? 'Buka dokumen Google Drive untuk membaca peraturan kantor versi terbaru.' : (isOwner ? 'Belum ada link dokumen. Masukkan link Google Drive pada panel Owner di bawah.' : 'Dokumen peraturan belum tersedia. Silakan hubungi Owner.'))+
   '</p></div>'+
   (link ? '<a class="btn btn-primary peraturan-open-btn" href="'+jobdeskSafe(link)+'" target="_blank" rel="noopener noreferrer">Buka Peraturan Kantor</a>' : '<span class="status-pill status-pill-muted">Belum tersedia</span>');
}

function loadPeraturan() {
 var el = document.getElementById('peraturan-content');
 el.innerHTML = skelCards(4);
 var isOwner = currentUser && currentUser.bagian === 'Owner';
 var notifBtn = document.getElementById('peraturan-notif-btn');
 var ownerTools = document.getElementById('peraturan-owner-tools');
 if (notifBtn) notifBtn.style.display = isOwner ? 'block' : 'none';
 if (ownerTools) ownerTools.style.display = isOwner ? 'grid' : 'none';
 gasCall('getPeraturan', [], function(data) {
 window._peraturanData = data || [];
 var driveItem = getPeraturanDriveItem(data);
 renderPeraturanDriveCard(driveItem, isOwner);
 var rules = (data || []).filter(function(item) { return item !== driveItem; });
 if (!rules.length) { el.innerHTML = '<div class="empty-state">Belum ada poin tata tertib ringkas.</div>'; return; }
 var grouped = {};
 var order = [];
 rules.forEach(function(p) {
 if (!grouped[p.kategori]) { grouped[p.kategori] = []; order.push(p.kategori); }
 grouped[p.kategori].push(p);
 });
 var html = '';
 order.forEach(function(kat, ki) {
 html += '<div class="section-label"'+(ki>0?' style="margin-top:12px"':'')+'>'+jobdeskSafe(kat)+'</div>';
 grouped[kat].forEach(function(p) {
 var num = String(p.no).padStart(2,'0');
 html += '<article class="peraturan-item"><div class="peraturan-num">'+num+'</div><div class="peraturan-text">'+jobdeskSafe(p.isi)+'</div>'+
   (isOwner ? '<button class="btn btn-sm btn-secondary peraturan-edit-btn" data-rule-id="'+jobdeskSafe(p.id || '')+'" onclick="editPeraturan(this.getAttribute(\'data-rule-id\'))">Edit</button>' : '')+'</article>';
 });
 });
 el.innerHTML = html;
 }, function(){ renderPeraturanDriveCard(null, isOwner); el.innerHTML = '<div class="empty-state">Gagal memuat peraturan</div>'; });
}

function savePeraturanDriveLink() {
 var input = document.getElementById('peraturan-drive-link');
 var link = (input && input.value || '').trim();
 var btn = document.getElementById('peraturan-drive-save-btn');
 var drivePattern = /^https:\/\/(drive|docs)\.google\.com\//i;
 if (!drivePattern.test(link)) { showToast('Masukkan link Google Drive yang valid'); return; }
 var existing = getPeraturanDriveItem(window._peraturanData || []);
 btn.disabled = true; btn.textContent = 'Menyimpan...';
 gasCall('savePeraturan', [existing && existing.id || null, PERATURAN_DRIVE_CATEGORY, link], function(res) {
  btn.disabled = false; btn.textContent = 'Simpan Link Drive';
  if (!res || res.success === false) { showToast((res && res.msg) || 'Gagal menyimpan link Drive'); return; }
  showToast('Link peraturan kantor berhasil disimpan');
  loadPeraturan();
 }, function() { btn.disabled = false; btn.textContent = 'Simpan Link Drive'; showToast('Koneksi gagal'); });
}

function editPeraturan(id) {
 var item = (window._peraturanData || []).find(function(p){ return String(p.id) === String(id); });
 if (!item) { showToast('Data peraturan tidak ditemukan'); return; }
 document.getElementById('peraturan-edit-id').value = item.id || '';
 document.getElementById('peraturan-kategori').value = item.kategori || '';
 document.getElementById('peraturan-isi').value = item.isi || '';
 document.getElementById('peraturan-cancel-btn').style.display = 'inline-flex';
 document.getElementById('peraturan-save-btn').textContent = 'Simpan Perubahan';
 document.getElementById('peraturan-owner-panel').scrollIntoView({ behavior:'smooth', block:'start' });
}

function cancelEditPeraturan() {
 document.getElementById('peraturan-edit-id').value = '';
 document.getElementById('peraturan-kategori').value = '';
 document.getElementById('peraturan-isi').value = '';
 document.getElementById('peraturan-cancel-btn').style.display = 'none';
 document.getElementById('peraturan-save-btn').textContent = 'Tambah Peraturan';
}

function savePeraturan() {
 var id = document.getElementById('peraturan-edit-id').value || null;
 var kategori = document.getElementById('peraturan-kategori').value.trim();
 var isi = document.getElementById('peraturan-isi').value.trim();
 var btn = document.getElementById('peraturan-save-btn');
 if (!kategori || !isi) { showToast('Kategori dan isi peraturan wajib diisi'); return; }
 btn.disabled = true; btn.textContent = 'Menyimpan...';
 gasCall('savePeraturan', [id, kategori, isi], function(res) {
   btn.disabled = false; btn.textContent = id ? 'Simpan Perubahan' : 'Tambah Peraturan';
   if (!res || res.success === false) { showToast((res && res.msg) || 'Gagal menyimpan peraturan'); return; }
   showToast(res.msg || 'Peraturan berhasil disimpan');
   cancelEditPeraturan();
   loadPeraturan();
 }, function(){ btn.disabled = false; btn.textContent = id ? 'Simpan Perubahan' : 'Tambah Peraturan'; showToast('Koneksi gagal'); });
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
 // Supabase mengirim tautan konfirmasi ke email baru; pesan dari server
 // ditampilkan apa adanya supaya tidak terkesan "langsung aktif".
 showToast(r.msg || 'Email berhasil disimpan ');
 } else { showToast(r.msg || 'Gagal simpan email'); }
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
 if (window.sb && window.sb.auth) window.sb.auth.signOut().catch(function(){});
 localStorage.removeItem('hh_username');
 goTo('s-login');
 document.getElementById('login-password').value = '';
}

// ─── REWARD & PENALTY MANUAL ─────────────────────
function fillSanksiMonthSelect() {
 var sel = document.getElementById('sanksi-bulan');
 if (!sel) return;
 var selected = sel.value || attendanceMonthKey(new Date());
 sel.innerHTML = '';
 var now = new Date();
 var names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 for (var i = 0; i < 8; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
 var opt = document.createElement('option');
 opt.value = key;
 opt.textContent = names[d.getMonth()] + ' ' + d.getFullYear();
 sel.appendChild(opt);
 }
 if ([].some.call(sel.options, function(o){ return o.value === selected; })) sel.value = selected;
}

function labelBulanKey(bulanKey) {
 var parts = String(bulanKey || '').split('-');
 var y = parseInt(parts[0], 10);
 var m = parseInt(parts[1], 10);
 var names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 if (!y || !m || m < 1 || m > 12) return bulanKey || '-';
 return names[m - 1] + ' ' + y;
}

function loadSanksiManual() {
 fillSanksiMonthSelect();
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
 var label = isDenda ? 'Denda' : 'Penghargaan';
 return '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:10px;margin-bottom:8px;border-left:3px solid '+(isDenda?'#dc2626':'#22c55e')+'">'+
 '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
 '<div><div style="font-size:11px;font-weight:700;color:'+color+'">'+label+' · '+s.nama+'</div>'+
 '<div style="font-size:10px;color:var(--text-muted)">'+s.tgl+' &middot; Berlaku: '+labelBulanKey(s.bulan || '')+'</div>'+
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
 var bulanKey = document.getElementById('sanksi-bulan') ? document.getElementById('sanksi-bulan').value : attendanceMonthKey(new Date());
 var ket = document.getElementById('sanksi-keterangan').value.trim();
 if (!userId) { showToast('Pilih karyawan dulu'); return; }
 if (!/^\d{4}-\d{2}$/.test(String(bulanKey || ''))) { showToast('Pilih bulan berlaku dulu'); return; }
 if (!nominal || parseInt(nominal) <= 0) { showToast('Nominal harus lebih dari 0'); return; }
 if (!ket) { showToast('Keterangan wajib diisi'); return; }
 var btn = event.target;
 btn.textContent = ' Memproses...'; btn.disabled = true;
 // Backend menyimpan tanggal transaksi ke bulan berlaku yang dipilih.
 gasCall('addSanksiManual', [currentUser.nama, userId, tipe, nominal, ket, bulanKey], function(r) {
 btn.textContent = 'Terapkan'; btn.disabled = false;
 if (r.success) {
 document.getElementById('sanksi-nominal').value = '';
 document.getElementById('sanksi-keterangan').value = '';
 document.getElementById('sanksi-user').value = '';
 showToast((tipe==='DENDA_MANUAL'?'Denda':'Penghargaan')+' '+labelBulanKey(bulanKey)+' berhasil diterapkan');
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

// Menu "Review Telat" BELUM tersambung ke Supabase: aturan bisnisnya belum
// diputuskan Ko (aplikasi lama tidak punya fungsi ini — lihat DECISION-LOG
// 2026-10-05). Selama saklar ini false, aplikasi menampilkan keterangan jujur
// "belum tersambung", bukan data contoh yang seolah-olah berhasil.
var REVIEW_TELAT_TERSAMBUNG = false;

function loadReviewTelat(force) {
 var list = document.getElementById('review-telat-list');
 if (!list) return;
 if (!REVIEW_TELAT_TERSAMBUNG) {
 fillReviewTelatMonthSelect();
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Menu Review Telat belum tersambung ke database.<br><span style="font-size:11px;color:var(--text-muted)">Aturannya masih menunggu keputusan Owner (lihat catatan pengembangan), jadi belum ada data yang bisa ditampilkan.</span></div>';
 return;
 }
 fillReviewTelatMonthSelect();
 var statusSel = document.getElementById('izin-telat-status');
 var bulanSel = document.getElementById('izin-telat-bulan');
 var status = statusSel ? statusSel.value : 'MENUNGGU';
 var bulanKey = bulanSel ? bulanSel.value : 'ALL';
 if (force) cacheClear('getIzinTelatReview' + JSON.stringify([status, bulanKey]));
 list.innerHTML = skelCards(3);
 gasCall('getIzinTelatReview', [status, bulanKey], function(data) {
 if (!data || !data.length) {
 list.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Tidak ada review telat</div>';
 return;
 }
 list.innerHTML = data.map(function(r) {
 var id = String(r.id || '');
 var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
 var pending = r.statusReview === 'MENUNGGU';
 var suggestedHour = Math.max(1, Math.ceil((parseInt(r.menitTelat || 0, 10) || 0) / 60));
 var searchText = [r.nama, r.userId, r.tanggal, r.bulan, r.statusReview, r.alasan, r.catatan].join(' ').toLowerCase();
 return '<div class="review-telat-card" data-search="'+esc(searchText)+'" style="border:1px solid var(--gray-border);border-radius:8px;padding:12px;margin-bottom:10px;background:#fff">'+
 '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">'+
 '<div><div style="font-size:14px;font-weight:800;color:var(--text-dark)">'+cleanDisplayText(r.nama || '-')+'</div>'+
 '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+(r.tanggal || '-')+' &middot; '+labelBulanKey(r.bulan || '')+' &middot; Masuk '+String(r.jamMasuk || '-').substring(0,5)+' dari jadwal '+String(r.jadwalMasuk || '-').substring(0,5)+'</div></div>'+
 '<span style="font-size:10px;border-radius:999px;padding:3px 8px;font-weight:800;background:'+(pending?'#fff7ed':'#e0f2fe')+';color:'+(pending?'#c2410c':'#0e4fa3')+'">'+cleanDisplayText(r.statusReview || 'MENUNGGU').replace(/_/g,' ')+'</span>'+
 '</div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">'+
 '<div style="background:#f8fafc;border-radius:8px;padding:8px;text-align:center"><b style="font-size:16px;color:#f59e0b">'+(r.menitTelat || 0)+'</b><div style="font-size:10px;color:var(--text-muted)">Menit Telat</div></div>'+
 '<div style="background:#fff7f7;border-radius:8px;padding:8px;text-align:center"><b style="font-size:16px;color:#dc2626">Rp '+parseInt(r.dendaNormal || 0, 10).toLocaleString('id-ID')+'</b><div style="font-size:10px;color:var(--text-muted)">Denda Normal</div></div>'+
 '<div style="background:#f0fdf4;border-radius:8px;padding:8px;text-align:center"><b style="font-size:16px;color:#16a34a">Rp '+parseInt(r.tarifPerJam || 0, 10).toLocaleString('id-ID')+'</b><div style="font-size:10px;color:var(--text-muted)">Tarif per Jam</div></div>'+
 '<div style="background:#eef2ff;border-radius:8px;padding:8px;text-align:center"><b style="font-size:16px;color:#0e4fa3">Rp '+parseInt(r.potonganFinal || 0, 10).toLocaleString('id-ID')+'</b><div style="font-size:10px;color:var(--text-muted)">Potongan Final</div></div>'+
 '</div>'+
 (pending ? '<div style="margin-top:10px">'+
 '<div class="form-group" style="margin-bottom:8px"><label class="form-label">Keputusan</label><select class="form-input" id="izin-telat-jenis-'+safeId+'"><option value="NORMAL">Telat Normal</option><option value="IZIN_KHUSUS">Izin Telat Khusus</option><option value="BEBAS">Bebas Potongan</option></select></div>'+
 '<div class="form-group" style="margin-bottom:8px"><label class="form-label">Sifat Telat</label><select class="form-input" id="izin-telat-sifat-'+safeId+'"><option value="Disiplin normal">Disiplin normal</option><option value="Kecelakaan / musibah perjalanan">Kecelakaan / musibah perjalanan</option><option value="Kendala perjalanan">Kendala perjalanan</option><option value="Kesehatan mendadak">Kesehatan mendadak</option><option value="Urusan keluarga darurat">Urusan keluarga darurat</option><option value="Lainnya">Lainnya</option></select></div>'+
 '<div class="form-group" style="margin-bottom:8px"><label class="form-label">Durasi Izin Khusus (jam)</label><input class="form-input" type="number" min="0" step="0.5" id="izin-telat-durasi-'+safeId+'" value="'+suggestedHour+'"></div>'+
 '<div class="form-group" style="margin-bottom:8px"><label class="form-label">Alasan</label><input class="form-input" id="izin-telat-alasan-'+safeId+'" placeholder="Contoh: kecelakaan motor"></div>'+
 '<div class="form-group" style="margin-bottom:8px"><label class="form-label">Catatan Finance/Owner</label><textarea class="form-input" rows="2" id="izin-telat-catatan-'+safeId+'" placeholder="Catatan keputusan..."></textarea></div>'+
 '<button class="btn btn-primary" style="width:100%" onclick="submitReviewTelat(\''+id+'\',\''+safeId+'\')">Simpan Keputusan</button>'+
 '</div>' : '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">'+cleanDisplayText(r.alasan || '')+(r.catatan ? ' &middot; '+cleanDisplayText(r.catatan) : '')+'</div>')+
 '</div>';
 }).join('');
 filterReviewTelatList();
 }, function() {
 list.innerHTML = '<div class="empty-state">Gagal memuat review telat</div>';
 });
}

function filterReviewTelatList() {
 var input = document.getElementById('izin-telat-search');
 var list = document.getElementById('review-telat-list');
 var q = input ? input.value.toLowerCase().trim() : '';
 var visible = 0;
 document.querySelectorAll('.review-telat-card').forEach(function(card) {
 var match = !q || (card.getAttribute('data-search') || '').indexOf(q) !== -1;
 card.style.display = match ? 'block' : 'none';
 if (match) visible++;
 });
 var empty = document.getElementById('review-telat-empty-filter');
 if (!empty && list) {
 empty = document.createElement('div');
 empty.id = 'review-telat-empty-filter';
 empty.className = 'empty-state';
 empty.textContent = 'Tidak ada data yang cocok dengan pencarian.';
 list.appendChild(empty);
 }
 if (empty) empty.style.display = q && visible === 0 ? 'block' : 'none';
}

function fillReviewTelatMonthSelect() {
 var sel = document.getElementById('izin-telat-bulan');
 if (!sel || sel.getAttribute('data-ready') === '1') return;
 var names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 sel.innerHTML = '<option value="ALL">Semua Bulan</option>';
 var now = new Date();
 for (var i = 0; i < 24; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
 var opt = document.createElement('option');
 opt.value = key;
 opt.textContent = names[d.getMonth()] + ' ' + d.getFullYear();
 sel.appendChild(opt);
 }
 sel.value = 'ALL';
 sel.setAttribute('data-ready', '1');
}

function submitReviewTelat(id, safeId) {
 if (!REVIEW_TELAT_TERSAMBUNG) {
 showToast('Menu Review Telat belum tersambung ke database');
 return;
 }
 var jenis = document.getElementById('izin-telat-jenis-' + safeId).value;
 var durasi = document.getElementById('izin-telat-durasi-' + safeId).value || 0;
 var sifatEl = document.getElementById('izin-telat-sifat-' + safeId);
 var sifat = sifatEl ? sifatEl.value : '';
 var alasan = document.getElementById('izin-telat-alasan-' + safeId).value.trim();
 var catatan = document.getElementById('izin-telat-catatan-' + safeId).value.trim();
 if (jenis === 'IZIN_KHUSUS' && (!durasi || parseFloat(durasi) <= 0)) { showToast('Durasi izin khusus wajib diisi'); return; }
 if (jenis !== 'NORMAL' && !alasan && sifat === 'Lainnya') { showToast('Alasan wajib diisi'); return; }
 var alasanFinal = sifat ? (sifat + (alasan ? ': ' + alasan : '')) : alasan;
 gasCall('reviewIzinTelat', [id, jenis, durasi, alasanFinal, catatan, currentUser ? currentUser.nama : 'Finance'], function(r) {
 if (r && r.success) {
 showToast('Keputusan telat disimpan');
 loadReviewTelat(true);
 } else {
 showToast((r && r.msg) || 'Gagal menyimpan keputusan');
 }
 }, function() { showToast('Koneksi gagal'); });
}

var _attendanceStream = null;
var _attendancePhotoData = '';
var _attendancePhotoTakenAt = '';
var _attendanceLocation = null;
var _attendanceSubmitting = false;
// Foto yang sudah diambil tapi belum berhasil tersimpan di penyimpanan. Disimpan
// di memori saja (bukan database) supaya tombol "Kirim Ulang Foto" bisa dipakai
// kalau unggahan gagal. Konsekuensinya: kalau halaman di-refresh, foto hilang.
var _pendingAttendancePhoto = null;
var _attendancePhotoUploading = false;

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
 var officeCard = document.getElementById('office-setting-card');
 var isOwner = currentUser && currentUser.bagian === 'Owner';
 if (officeCard) officeCard.style.display = isOwner ? 'block' : 'none';
 if (isOwner) loadOfficeSettings();
 updateAttendanceLocationStatus('Membaca lokasi...', '');
 updateAttendancePhotoStatus('', '');
 getAttendanceLocation();
 loadAttendanceToday();
}

function loadOfficeSettings() {
 var state = document.getElementById('office-setting-state');
 if (state) { state.className = 'status-pill status-pill-muted'; state.textContent = 'Memuat...'; }
 gasCall('getOfficeSettings', [], function(res) {
   var data = res && (res.data || res) || {};
   var lat = data.OFFICE_LAT || '';
   var lng = data.OFFICE_LNG || '';
   var radius = data.OFFICE_RADIUS_M || 120;
   document.getElementById('office-lat').value = lat;
   document.getElementById('office-lng').value = lng;
   document.getElementById('office-radius').value = radius;
   var ready = lat !== '' && lng !== '';
   if (state) {
     state.className = 'status-pill '+(ready ? 'status-pill-success' : 'status-pill-warning');
     state.textContent = ready ? 'Sudah diset' : 'Belum diset';
   }
   renderOfficeSummary(ready ? lat : '', ready ? lng : '', radius);
   setOfficeSettingsCollapsed(ready);
 }, function(){
   if (state) { state.className = 'status-pill status-pill-danger'; state.textContent = 'Gagal dimuat'; }
   renderOfficeSummary('', '', 120);
   setOfficeSettingsCollapsed(false);
 });
}

// Ringkasan singkat lokasi kantor yang tampil saat panel editor ditutup.
function renderOfficeSummary(lat, lng, radius) {
 var el = document.getElementById('office-summary');
 if (!el) return;
 el.textContent = '';
 var ready = lat !== '' && lat !== null && typeof lat !== 'undefined' && lng !== '' && lng !== null && typeof lng !== 'undefined';
 var item = document.createElement('span');
 item.className = 'office-summary-item';
 if (ready) {
   item.textContent = 'Titik kantor: ' + lat + ', ' + lng;
   var radiusItem = document.createElement('span');
   radiusItem.className = 'office-summary-item';
   radiusItem.textContent = 'Radius diterima: ' + (radius || 120) + ' m';
   el.appendChild(item);
   el.appendChild(radiusItem);
   return;
 }
 item.className = 'office-summary-item office-summary-empty';
 item.textContent = 'Lokasi kantor belum diset. Isi koordinat lalu tekan Simpan Lokasi Kantor.';
 el.appendChild(item);
}

// Panel pengaturan lokasi bisa ditutup supaya halaman absensi tetap ringkas.
function setOfficeSettingsCollapsed(collapsed) {
 var card = document.getElementById('office-setting-card');
 var body = document.getElementById('office-editor-body');
 var summary = document.getElementById('office-summary');
 var btn = document.getElementById('office-toggle-btn');
 if (!card || !body) return;
 var isCollapsed = !!collapsed;
 card.classList.toggle('is-collapsed', isCollapsed);
 body.hidden = isCollapsed;
 if (summary) summary.hidden = !isCollapsed;
 if (btn) {
   btn.textContent = isCollapsed ? 'Ubah' : 'Tutup';
   btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
 }
}

function toggleOfficeSettings() {
 var body = document.getElementById('office-editor-body');
 if (!body) return;
 setOfficeSettingsCollapsed(!body.hidden);
}

function useCurrentLocationForOffice() {
 if (!navigator.geolocation) { showToast('Browser tidak mendukung lokasi'); return; }
 showToast('Sedang membaca lokasi Owner...');
 navigator.geolocation.getCurrentPosition(function(pos) {
   var acc = Math.round(pos.coords.accuracy || 0);
   document.getElementById('office-lat').value = Number(pos.coords.latitude).toFixed(7);
   document.getElementById('office-lng').value = Number(pos.coords.longitude).toFixed(7);
   var hint = document.getElementById('office-location-hint');
   if (hint) {
     hint.textContent = acc > 0
       ? ('Akurasi bacaan: ±' + acc + ' meter' + (acc > 100 ? ' — terlalu kasar, coba lagi di luar ruangan atau pakai HP.' : ' — koordinat siap disimpan.'))
       : 'Akurasi bacaan tidak tersedia dari perangkat ini.';
   }
   showToast(acc > 100
     ? ('Akurasi ±' + acc + ' m (kurang teliti). Ulangi di tempat terbuka.')
     : ('Koordinat terisi (akurasi ±' + acc + ' m). Tekan Simpan Lokasi Kantor.'));
 }, function(){ showToast('Lokasi gagal dibaca. Pastikan GPS dan izin lokasi aktif.'); }, {
   enableHighAccuracy: true, timeout: 20000, maximumAge: 0
 });
}

function saveOfficeSettings() {
 var lat = parseFloat(document.getElementById('office-lat').value);
 var lng = parseFloat(document.getElementById('office-lng').value);
 var radius = parseInt(document.getElementById('office-radius').value, 10);
 var btn = document.getElementById('office-save-btn');
 if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
   showToast('Latitude atau longitude tidak valid'); return;
 }
 if (!Number.isFinite(radius) || radius < 20 || radius > 2000) { showToast('Radius harus 20–2000 meter'); return; }
 btn.disabled = true; btn.textContent = 'Menyimpan...';
 gasCall('setOfficeSettings', [lat, lng, radius], function(res) {
   btn.disabled = false; btn.textContent = 'Simpan Lokasi Kantor';
   if (!res || res.success === false) { showToast((res && res.msg) || 'Gagal menyimpan lokasi kantor'); return; }
   showToast('Lokasi kantor berhasil disimpan');
   loadOfficeSettings();
 }, function(){ btn.disabled = false; btn.textContent = 'Simpan Lokasi Kantor'; showToast('Koneksi gagal'); });
}

function getAttendanceLocation() {
 if (!navigator.geolocation) { updateAttendanceLocationStatus('Browser tidak mendukung lokasi.', 'bad'); return; }
 var triedFastFallback = false;
 var watchId = null;
 var done = false;
 function acceptPosition(pos) {
 if (!pos || !pos.coords) return;
 var acc = pos.coords.accuracy || 999;
 var newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: acc };
 // Simpan jika lebih akurat dari pembacaan sebelumnya (atau belum ada)
 if (!_attendanceLocation || acc < _attendanceLocation.accuracy) {
   _attendanceLocation = newLoc;
   var accLabel = acc <= 50 ? 'Sangat baik' : acc <= 150 ? 'Baik' : acc <= 300 ? 'Cukup' : 'Kurang baik';
   var accState = acc <= 150 ? 'ok' : '';
   updateAttendanceLocationStatus('Lokasi terbaca. Akurasi sekitar '+Math.round(acc)+' m ('+accLabel+').', accState);
   syncAttendanceSubmitState();
 }
 // Hentikan update hanya jika akurasi sudah cukup baik (≤ 50m)
 if (acc <= 50 && !done) {
   done = true;
   if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
 }
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
 // Lebar 640 px cukup untuk mengenali wajah, tetapi jauh lebih hemat daripada
 // menyimpan resolusi kamera asli. JPEG dikompres adaptif sampai sekitar
 // 40–110 KB; kualitas tidak diturunkan di bawah batas yang membuat wajah pecah.
 var scale = Math.min(1, 640 / video.videoWidth);
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
 _attendancePhotoData = encodeAttendancePhoto(canvas);
 _attendancePhotoTakenAt = new Date().toISOString();
 if (img) { img.src = _attendancePhotoData; img.style.display = 'block'; }
 video.style.display = 'none';
 stopAttendanceCamera();
 var ukuranKb = Math.round(attendanceDataUrlByteLength(_attendancePhotoData) / 1024);
 updateAttendancePhotoStatus('Foto siap dikirim (' + ukuranKb + ' KB).', 'ok');
 syncAttendanceSubmitState();
}

function attendanceDataUrlByteLength(dataUrl) {
 var base64 = String(dataUrl || '').split(',')[1] || '';
 if (!base64) return 0;
 var padding = base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0);
 return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
}

function encodeAttendancePhoto(sourceCanvas) {
 var targetBytes = 110 * 1024;
 var hardLimit = 180 * 1024;
 var quality = 0.66;
 var data = sourceCanvas.toDataURL('image/jpeg', quality);
 while (attendanceDataUrlByteLength(data) > targetBytes && quality > 0.42) {
  quality = Math.max(0.42, quality - 0.06);
  data = sourceCanvas.toDataURL('image/jpeg', quality);
 }
 // Foto dengan latar sangat ramai kadang masih besar. Kecilkan sedikit sekali
 // sebagai jaring pengaman, bukan langsung merusak kualitas JPEG.
 if (attendanceDataUrlByteLength(data) > hardLimit) {
  var compact = document.createElement('canvas');
  var compactScale = Math.min(1, 560 / sourceCanvas.width);
  compact.width = Math.round(sourceCanvas.width * compactScale);
  compact.height = Math.round(sourceCanvas.height * compactScale);
  compact.getContext('2d').drawImage(sourceCanvas, 0, 0, compact.width, compact.height);
  quality = 0.50;
  data = compact.toDataURL('image/jpeg', quality);
  while (attendanceDataUrlByteLength(data) > hardLimit && quality > 0.36) {
   quality = Math.max(0.36, quality - 0.05);
   data = compact.toDataURL('image/jpeg', quality);
  }
 }
 return data;
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
 gasCall('submitAbsensiCamera', [currentUser.id, currentUser.nama, tipe, '', _attendanceLocation.lat, _attendanceLocation.lng, _attendanceLocation.accuracy, new Date().toISOString()], function(res) {
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
 notifyAttendanceOwner(res.id || '');
 // Foto jangan dibuang: simpan di memori untuk diunggah ke penyimpanan. Kalau
 // unggahan gagal, tombol "Kirim Ulang Foto" memakai data ini.
 _pendingAttendancePhoto = _attendancePhotoData ? {
  eventId: res.id || '',
  tipe: tipe,
  dataUrl: _attendancePhotoData,
  takenAt: _attendancePhotoTakenAt || new Date().toISOString()
 } : null;
 _attendancePhotoData = '';
 _attendancePhotoTakenAt = '';
 syncAttendanceSubmitState();
 sendAttendancePhoto();
 loadAttendanceToday();
 refreshAttendanceMatrixIfOpen(currentUser.id, bulanKey);
 }
 setTimeout(doSubmitAttendance, 0);
}

// Notifikasi Owner tidak boleh menggagalkan atau memperlambat absensi karyawan.
// Edge Function melakukan validasi event + pencegahan kirim ganda. Bila layanan
// Telegram sedang bermasalah, absensi tetap sah dan kegagalan tercatat di server.
function notifyAttendanceOwner(eventId) {
 if (!eventId) {
  console.warn('Notifikasi Telegram dilewati: ID absensi tidak tersedia.');
  return;
 }
 gasCall('notifyAttendanceTelegram', [eventId], function(res) {
  if (!res || res.success === false) {
   console.warn('Notifikasi Telegram belum terkirim:', (res && res.msg) || 'balasan tidak valid');
  }
 }, function(err) {
  console.warn('Notifikasi Telegram gagal dipanggil:', err && err.message ? err.message : err);
 });
}

// ===== Unggah foto absensi ke penyimpanan (Supabase Storage) =================
// Alur: tap absensi diterima server -> foto diunggah ke penyimpanan
// (js/photo-storage.js) -> metadata + tautan dicatat lewat RPC attachAbsensiPhoto.
// Kalau gagal, penyebab ASLI ditampilkan dan foto bisa dikirim ulang selama
// halaman belum di-refresh (foto disimpan di memori, bukan database).
function updateAttendancePhotoStatus(text, state) {
 var el = document.getElementById('attendance-photo-status');
 if (!el) return;
 if (!text) {
  el.style.display = 'none';
  el.textContent = '';
  el.className = 'camera-status';
  return;
 }
 el.style.display = 'block';
 el.className = 'camera-status' + (state ? ' ' + state : '');
 el.textContent = text;
}

function sendAttendancePhoto() {
 var p = _pendingAttendancePhoto;
 if (!p || _attendancePhotoUploading) return;
 // Fitur belum diaktifkan Owner -> tidak ada unggahan dan tidak ada pesan,
 // supaya tampilan absensi karyawan tetap bersih.
 if (!photoStorageEnabled()) return;
 if (!p.eventId) {
  updateAttendancePhotoStatus('Foto belum bisa disimpan: server tidak mengirim ID absensi. Tarik layar untuk memuat ulang, lalu hubungi Owner.', 'bad');
  return;
 }
 if (!photoStorageConfigured()) {
  updateAttendancePhotoStatus('Foto belum tersimpan: koneksi Supabase Storage belum tersedia.', '');
  return;
 }
 _attendancePhotoUploading = true;
 updateAttendancePhotoStatus('Menyimpan foto ke penyimpanan... Mohon tunggu.', '');
 photoStorageUpload({ userId: currentUser.id, eventId: p.eventId, tipe: p.tipe, dataUrl: p.dataUrl, takenAt: p.takenAt }, function(err, up) {
  if (err) {
   _attendancePhotoUploading = false;
   markAttendancePhotoFailed(err.message);
   return;
  }
  gasCall('attachAbsensiPhoto', [p.eventId, up.path, up.url, up.mime, up.size, up.sha256, up.provider || 'SUPABASE', p.takenAt], function(r) {
   _attendancePhotoUploading = false;
   if (!r || r.success === false) {
    markAttendancePhotoFailed((r && r.msg) || 'Gagal mencatat tautan foto ke database.');
    return;
   }
   _pendingAttendancePhoto = null;
   updateAttendancePhotoStatus('Foto absensi tersimpan.', 'ok');
   showToast('Foto absensi tersimpan');
   loadAttendanceToday();
  }, function() {
   _attendancePhotoUploading = false;
   markAttendancePhotoFailed('Foto terkirim ke penyimpanan, tapi tautannya gagal dicatat ke database (koneksi ke server terputus).');
  });
 });
}

function markAttendancePhotoFailed(message) {
 var p = _pendingAttendancePhoto;
 var pesan = String(message || 'Penyebab tidak diketahui');
 updateAttendancePhotoStatus('Foto GAGAL disimpan: ' + pesan, 'bad');
 showToast('Foto absensi belum tersimpan');
 if (p && p.eventId) {
  gasCall('markAbsensiPhotoFailed', [p.eventId, pesan.slice(0, 500)], function() { loadAttendanceToday(); }, function() { loadAttendanceToday(); });
 }
}

function retryAttendancePhoto(eventId) {
 if (!_pendingAttendancePhoto) {
  showToast('Foto sudah tidak ada di perangkat ini, tidak bisa dikirim ulang');
  return;
 }
 if (eventId && _pendingAttendancePhoto.eventId && eventId !== _pendingAttendancePhoto.eventId) {
  showToast('Foto yang tersimpan di perangkat bukan untuk absensi ini');
  return;
 }
 sendAttendancePhoto();
}

function attendancePhotoAttr(url) {
 return String(url || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openAttendancePhoto(path) {
 var popup = null;
 try { popup = window.open('', '_blank'); } catch (e) { popup = null; }
 photoStorageCreateSignedUrl(path, function(err, signedUrl) {
  if (err || !signedUrl) {
   if (popup) popup.close();
   showToast((err && err.message) || 'Foto tidak dapat dibuka');
   return;
  }
  if (popup) {
   popup.opener = null;
   popup.location.replace(signedUrl);
  } else {
   window.location.href = signedUrl;
  }
 });
}

function attendancePhotoRowHtml(r) {
 if (!r || r.status !== 'DITERIMA') return '';
 if (r.provider === 'SUPABASE' && r.photoPath) {
  return '<div style="margin-top:4px"><button type="button" class="btn btn-secondary attendance-retry-btn" onclick="openAttendancePhoto(\'' + attendancePhotoAttr(r.photoPath) + '\')">Lihat Foto Absensi</button></div>';
 }
 if (r.fotoUrl) {
  return '<div style="margin-top:4px"><a href="' + attendancePhotoAttr(r.fotoUrl) + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--blue);font-weight:600">Lihat Foto Absensi</a></div>';
 }
 // Selama penyimpanan foto belum diaktifkan, jangan tampilkan status foto sama
 // sekali (biar tidak ada tulisan "belum tersimpan" di layar karyawan).
 if (!photoStorageEnabled()) return '';
 if (r.uploadStatus === 'EXPIRED') {
  return '<div style="margin-top:4px;font-size:11px;color:var(--text-muted);font-weight:600">Foto otomatis dihapus setelah 30 hari.</div>';
 }
 var bisaKirimUlang = !!(_pendingAttendancePhoto && r.id && _pendingAttendancePhoto.eventId === r.id);
 var teks = r.uploadStatus === 'FAILED'
  ? 'Foto belum tersimpan: ' + (r.uploadError || 'penyebab tidak dicatat')
  : 'Foto belum tersimpan (menunggu dikirim)';
 return '<div style="margin-top:4px;font-size:11px;color:#b42318;font-weight:600">' + attendancePhotoAttr(teks) + '</div>' +
  (bisaKirimUlang ? '<button type="button" class="btn btn-secondary attendance-retry-btn" onclick="retryAttendancePhoto(\'' + esc(r.id) + '\')">Kirim Ulang Foto</button>' : '');
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
 return '<div class="attendance-row"><div><b>'+r.tipe+'</b><div style="color:var(--text-muted);margin-top:2px">'+r.jam+'</div>'+attendancePhotoRowHtml(r)+'</div><span class="badge '+(r.status==='DITERIMA'?'badge-green':'badge-red')+'">'+r.status+'</span></div>';
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
 if (hasAbsensiRecapMonth(_ownerAbsensiCache[cacheKey], bulanKey)) {
 target.innerHTML = renderAbsensiDetailHtml(_ownerAbsensiCache[cacheKey], bulanKey, targetId);
 } else {
 target.innerHTML = renderAttendanceLiveDetailForUser(userId, bulanKey, targetId);
 }
 return;
 }

 target.innerHTML = skelCards(2);
 gasCall('getAbsensiRekap', [userId], function(res) {
 _ownerAbsensiCache[cacheKey] = res;
 if (hasAbsensiRecapMonth(res, bulanKey)) {
 target.innerHTML = renderAbsensiDetailHtml(res, bulanKey, targetId);
 } else {
 target.innerHTML = renderAttendanceLiveDetailForUser(userId, bulanKey, targetId);
 }
 }, function() {
 var liveHtml = renderAttendanceLiveDetailForUser(userId, bulanKey, targetId);
 target.innerHTML = liveHtml || '<div class="empty-state" style="padding:12px">Gagal memuat detail absensi</div>';
 });
}

var _attendanceMatrixCache = {};
var _attendanceRecapCache = {};
var _attendanceEmployeeRecapCache = {};

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
 delete _attendanceRecapCache[bulanKey];
 if (userId) delete _attendanceEmployeeRecapCache[String(userId)];
 cacheClear('getAbsensiMatrix' + JSON.stringify([bulanKey]));
 cacheClear('getRekapBulananSemua' + JSON.stringify([bulanKey]));
 if (userId) cacheClear('getAbsensiMatrixUser' + JSON.stringify([userId, bulanKey]));
 if (userId) cacheClear('getAbsensiRekap' + JSON.stringify([userId]));
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
 if (force) {
  clearAttendanceMatrixCache(_attendanceMatrixCanEdit ? null : currentUser.id, bulanKey);
 }
 if (!force && _attendanceMatrixCache[cacheKey]) {
 renderAttendanceMatrixWithRecap(_attendanceMatrixCache[cacheKey], bulanKey);
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
 renderAttendanceMatrixWithRecap(res, bulanKey);
 }, function() {
 el.innerHTML = '<div class="empty-state">Koneksi gagal saat memuat catatan</div>';
 });
}

function buildAttendanceRecapMap(res) {
 var map = {};
 ((res && res.data) || []).forEach(function(r) {
 var userId = r.id || r.userId || r.user_id || r.ID || '';
 if (userId) map[String(userId)] = r;
 });
 return map;
}

function renderAttendanceMatrixWithRecap(matrixRes, bulanKey) {
 if (!_attendanceMatrixCanEdit) {
 var employeeKey = currentUser ? String(currentUser.id) : '';
 if (!employeeKey) {
 renderAttendanceMatrix(matrixRes);
 return;
 }
 if (_attendanceEmployeeRecapCache[employeeKey]) {
 matrixRes.employeeAbsensiRekap = _attendanceEmployeeRecapCache[employeeKey];
 matrixRes.employeeRecapLoading = false;
 renderAttendanceMatrix(matrixRes);
 return;
 }
 matrixRes.employeeRecapLoading = true;
 renderAttendanceMatrix(matrixRes);
 gasCall('getAbsensiRekap', [employeeKey], function(res) {
 _attendanceEmployeeRecapCache[employeeKey] = res;
 matrixRes.employeeAbsensiRekap = res;
 matrixRes.employeeRecapLoading = false;
 var active = document.querySelector('.screen.active');
 var sel = document.getElementById('att-matrix-bulan');
 if (active && active.id === 's-catatan-kehadiran' && (!sel || sel.value === bulanKey)) {
 renderAttendanceMatrix(matrixRes);
 }
 }, function() {
 matrixRes.employeeRecapLoading = false;
 renderAttendanceMatrix(matrixRes);
 });
 return;
 }
 var cached = _attendanceRecapCache[bulanKey];
 if (cached) {
 matrixRes.rekapByUser = cached;
 matrixRes.rekapLoading = false;
 renderAttendanceMatrix(matrixRes);
 return;
 }
 matrixRes.rekapByUser = {};
 matrixRes.rekapLoading = true;
 renderAttendanceMatrix(matrixRes);
 gasCall('getRekapBulananSemua', [bulanKey], function(res) {
 _attendanceRecapCache[bulanKey] = buildAttendanceRecapMap(res);
 matrixRes.rekapByUser = _attendanceRecapCache[bulanKey];
 matrixRes.rekapLoading = false;
 var active = document.querySelector('.screen.active');
 var sel = document.getElementById('att-matrix-bulan');
 if (active && active.id === 's-catatan-kehadiran' && (!sel || sel.value === bulanKey)) {
 renderAttendanceMatrix(matrixRes);
 }
 }, function() {
 matrixRes.rekapLoading = false;
 renderAttendanceMatrix(matrixRes);
 });
}

function attendanceTimeToMinutes(value) {
 var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
 if (!match) return null;
 var hours = parseInt(match[1], 10);
 var minutes = parseInt(match[2], 10);
 if (isNaN(hours) || isNaN(minutes)) return null;
 return (hours * 60) + minutes;
}

function attendanceDayIsLate(item, dateObj) {
 if (!item) return false;
 if (item.telat === true || String(item.telat).toLowerCase() === 'true') return true;
 if (!item.masuk || (dateObj && dateObj.getDay() === 0)) return false;
 var actualMinutes = attendanceTimeToMinutes(item.masuk);
 var scheduleMinutes = attendanceTimeToMinutes(item.jadwalMasuk || '08:00');
 return actualMinutes !== null && scheduleMinutes !== null && actualMinutes > scheduleMinutes;
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
 (_attendanceMatrixCanEdit ? '<div class="attendance-action-row"><button class="btn btn-gold attendance-import-btn" onclick="importAttendanceUploadToApp()">Impor Fingerprint</button><button class="btn btn-primary attendance-process-btn" onclick="processAttendanceAppRecap()">Proses ke Rekap Resmi</button></div>' : '');
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
 function attendanceDayStatus(item, masuk, pulang, dateObj) {
 var hasTap = !!(masuk || pulang);
 if (item.anomali && !hasTap) return { cls:' anomaly', symbol:'!', title:'Tap anomali' };
 if (item.rejected && !hasTap) return { cls:' rejected', symbol:'&times;', title:'Ditolak' };
 if (item.absen && !hasTap) return { cls:' absent', symbol:'A', title:'Absen' };
 if (attendanceDayIsLate(item, dateObj)) return { cls:' filled late', symbol:'!', title:item.lembur ? 'Telat dan lembur' : 'Telat' };
 if (item.lembur) return { cls:' filled overtime', symbol:'+', title:'Lembur' };
 if (masuk && pulang) return { cls:' filled complete', symbol:uiIcon('check', 'attendance-state-icon'), title:'Lengkap' };
 if (masuk) return { cls:' filled partial', symbol:'&hellip;', title:'Belum pulang' };
 if (pulang) return { cls:' filled partial', symbol:'?', title:'Tanpa masuk' };
 return { cls:'', symbol:'&middot;', title:'Belum ada data' };
 }
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
 var hasTap = !!(masuk || pulang);
 var dateObj = new Date(year, month - 1, d);
 var status = attendanceDayStatus(item, masuk, pulang, dateObj);
 var statusClass = status.cls;
 var statusSymbol = status.symbol;
 var statusTitle = status.title;
 if (dateObj.getDay() === 0) statusClass += ' sunday';
 var click = _attendanceMatrixCanEdit ? ' onclick="openAttendanceEdit(&quot;'+u.id+'&quot;,&quot;'+esc(u.nama)+'&quot;,&quot;'+res.bulan+'&quot;,'+d+',&quot;'+esc(masuk)+'&quot;,&quot;'+esc(pulang)+'&quot;)"' : '';
 days += '<button class="att-day'+statusClass+'" title="'+statusTitle+'"'+click+(_attendanceMatrixCanEdit?'':' type="button"')+'>'+
 '<span>'+d+'</span><small>'+(masuk ? masuk.substring(0,5) : '-')+'</small><small>'+(pulang ? pulang.substring(0,5) : '-')+'</small><em>'+statusSymbol+'</em></button>';
 }
 return '<div class="card att-user-card" data-search="'+(u.nama+' '+u.bagian+' '+u.jabatan).toLowerCase()+'">'+
 '<div class="att-user-head"><div><b>'+u.nama+'</b><p>'+u.jabatan+' · '+u.bagian+'</p></div></div>'+
 '<div class="att-grid">'+days+'</div>'+
 renderAttendanceUserRecap(u, res)+
 '</div>';
 }).join('');
 if (_attendanceMatrixCanEdit) {
 el.innerHTML = '<div class="att-desktop-layout"><div class="att-desktop-main">'+html+'</div><aside class="att-desktop-side">'+renderAttendanceLegend()+'</aside></div>';
 } else {
 el.innerHTML = html;
 }
 filterAttendanceMatrix();
}

function estimateAttendanceScoreFromLiveRecap(liveRecap) {
 if (!liveRecap || !liveRecap.hasData) return null;
 var score = 100;
 score -= (parseInt(liveRecap.absen || 0, 10) || 0) * 15;
 score -= (parseInt(liveRecap.telat || 0, 10) || 0) * 2;
 return Math.max(0, Math.min(100, score));
}

function attendanceScoreLabel(r, liveRecap) {
 var raw = r && (r.skor != null && r.skor !== '' ? r.skor : (r.finalScore != null && r.finalScore !== '' ? r.finalScore : null));
 var score = parseInt(raw, 10);
 if (!isNaN(score) && score > 0) return score + '/100';
 var estimated = estimateAttendanceScoreFromLiveRecap(liveRecap);
 if (estimated != null) return estimated + '/100';
 return '-/100';
}

function renderAttendanceUserRecap(u, res) {
 if (!_attendanceMatrixCanEdit) {
 var employeeLiveRecap = buildAttendanceMatrixRecap(u, res);
 if (res.employeeRecapLoading && !employeeLiveRecap.hasData) return '<div class="att-recap att-recap-muted">Memuat rekap kehadiran...</div>';
 if (res.employeeAbsensiRekap && hasAbsensiRecapMonth(res.employeeAbsensiRekap, res.bulan)) {
 return '<div class="att-recap">'+renderAbsensiDetailHtml(res.employeeAbsensiRekap, res.bulan, 'att-personal-rekap')+'</div>';
 }
 if (employeeLiveRecap.hasData) return renderAttendanceLivePersonalRecap(u, res, employeeLiveRecap);
 return '<div class="att-recap att-recap-muted">Rekap '+labelBulanKey(res.bulan || '')+' belum tersedia.</div>';
 }
 var liveRecap = buildAttendanceMatrixRecap(u, res);
 if (res.rekapLoading && !liveRecap.hasData) return '<div class="att-recap att-recap-muted">Memuat ringkasan rekap...</div>';
 var r = res.rekapByUser && res.rekapByUser[String(u.id)];
 if (!r && !liveRecap.hasData) return '<div class="att-recap att-recap-muted">Rekap bulanan belum tersedia.</div>';
 if (!r) r = { nama: u.nama, jabatan: u.jabatan, bagian: u.bagian };
 var hadir = parseInt(r.hadir || 0, 10) || 0;
 var telat = parseInt(r.telat || 0, 10) || 0;
 var absen = parseInt(r.absen || 0, 10) || 0;
 var lembur = (parseInt(r.lemburPulang || 0, 10) || 0) + (parseInt(r.lemburMinggu || 0, 10) || 0) + (parseInt(r.lemburLibur || 0, 10) || 0);
 if (liveRecap.hasData) {
 hadir = Math.max(hadir, liveRecap.hadir);
 telat = Math.max(telat, liveRecap.telat);
 absen = Math.max(absen, liveRecap.absen);
 lembur = Math.max(lembur, liveRecap.lembur);
 }
 var denda = parseInt(r.totalDenda || 0, 10) || 0;
 var reward = (parseInt(r.totalReward || 0, 10) || 0) + (parseInt(r.bonusKerajinan || 0, 10) || 0);
 var skorLabel = attendanceScoreLabel(r, liveRecap);
 var userId = r.id || r.userId || r.user_id || r.ID || u.id || '';
 var safeId = String(userId || u.nama || '').replace(/[^a-zA-Z0-9_-]/g, '');
 var bulanKey = res.bulan || '';
 var safeMonth = String(bulanKey).replace(/[^a-zA-Z0-9_-]/g, '');
 var detailId = 'att-rekap-detail-' + safeId + '-' + safeMonth;
 var btnId = 'att-rekap-btn-' + safeId + '-' + safeMonth;
 return '<div class="att-recap">'+
 '<div class="att-recap-head"><div><b>'+cleanDisplayText(r.nama || u.nama || '')+'</b><p>'+cleanDisplayText(r.jabatan || u.jabatan || '')+' &middot; '+cleanDisplayText(r.bagian || u.bagian || '')+'</p></div><span>'+skorLabel+'</span></div>'+ 
 '<div class="att-recap-grid">'+
 '<div class="att-recap-metric att-recap-green"><b>'+hadir+'</b><span>Hadir</span></div>'+
 '<div class="att-recap-metric att-recap-yellow"><b>'+telat+'</b><span>Telat</span></div>'+
 '<div class="att-recap-metric att-recap-red"><b>'+absen+'</b><span>Absen</span></div>'+
 '<div class="att-recap-metric att-recap-purple"><b>'+lembur+'</b><span>Lembur</span></div>'+
 '</div>'+
 '<div class="att-recap-row att-recap-denda"><span>Estimasi Denda</span><b>- Rp '+denda.toLocaleString('id-ID')+'</b></div>'+
 '<div class="att-recap-row att-recap-reward"><span>Estimasi Penghargaan</span><b>+ Rp '+reward.toLocaleString('id-ID')+'</b></div>'+
 '<button id="'+btnId+'" class="btn btn-sm btn-primary att-recap-btn" onclick="toggleOwnerRekapDetail(\''+esc(userId)+'\',\''+esc(bulanKey)+'\',\''+detailId+'\',\''+btnId+'\')">Lihat Detail</button>'+
 '<div id="'+detailId+'" class="att-recap-detail" style="display:none"></div>'+
 '</div>';
}

function hasAbsensiRecapMonth(absensiRes, bulanKey) {
 var requestedMonth = String(bulanKey || '');
 if (!requestedMonth || !absensiRes || !absensiRes.data || !absensiRes.data.length) return false;
 return absensiRes.data.some(function(x){ return String(x.bulan || '') === requestedMonth; });
}

function renderAttendanceLivePersonalRecap(u, res, liveRecap) {
 var userId = u.id || (currentUser && currentUser.id) || '';
 var bulanKey = res.bulan || '';
 var safeId = String(userId || u.nama || '').replace(/[^a-zA-Z0-9_-]/g, '');
 var safeMonth = String(bulanKey).replace(/[^a-zA-Z0-9_-]/g, '');
 var detailId = 'att-live-detail-' + safeId + '-' + safeMonth;
 var btnId = 'att-live-btn-' + safeId + '-' + safeMonth;
 return '<div class="att-recap">'+
 '<div class="att-recap-head"><div><b>'+cleanDisplayText(u.nama || '')+'</b><p>'+cleanDisplayText(u.jabatan || '')+' &middot; '+cleanDisplayText(u.bagian || '')+'</p></div></div>'+
 '<div class="att-recap-grid">'+
 '<div class="att-recap-metric att-recap-green"><b>'+liveRecap.hadir+'</b><span>Hadir</span></div>'+
 '<div class="att-recap-metric att-recap-yellow"><b>'+liveRecap.telat+'</b><span>Telat</span></div>'+
 '<div class="att-recap-metric att-recap-red"><b>'+liveRecap.absen+'</b><span>Absen</span></div>'+
 '<div class="att-recap-metric att-recap-purple"><b>'+liveRecap.lembur+'</b><span>Lembur</span></div>'+
 '</div>'+
 '<button id="'+btnId+'" class="btn btn-sm btn-primary att-recap-btn" onclick="toggleLiveAttendanceDetail(\''+esc(userId)+'\',\''+esc(bulanKey)+'\',\''+detailId+'\',\''+btnId+'\')">Lihat Detail</button>'+
 '<div id="'+detailId+'" class="att-recap-detail" style="display:none"></div>'+
 '</div>';
}

function toggleLiveAttendanceDetail(userId, bulanKey, targetId, btnId) {
 var target = document.getElementById(targetId);
 var btn = document.getElementById(btnId);
 if (!target || !btn) return;
 if (target.style.display === 'block') {
 target.style.display = 'none';
 btn.textContent = 'Lihat Detail';
 return;
 }
 target.style.display = 'block';
 btn.textContent = 'Tutup Detail';
 target.innerHTML = renderAttendanceLiveDetailForUser(userId, bulanKey, targetId);
}

function getAttendanceMatrixUserFromCache(userId, bulanKey) {
 userId = String(userId || '');
 bulanKey = String(bulanKey || '');
 var cacheKeys = ['all:' + bulanKey, userId + ':' + bulanKey];
 for (var k = 0; k < cacheKeys.length; k++) {
 var matrix = _attendanceMatrixCache[cacheKeys[k]];
 var users = (matrix && matrix.users) || [];
 for (var i = 0; i < users.length; i++) {
 if (String(users[i].id || '') === userId) return { user: users[i], matrix: matrix };
 }
 }
 return null;
}

function renderAttendanceLiveDetailForUser(userId, bulanKey, scopeId) {
 var found = getAttendanceMatrixUserFromCache(userId, bulanKey);
 if (!found) return '<div class="att-recap att-recap-muted">Detail '+labelBulanKey(bulanKey)+' belum tersedia.</div>';
 return renderAttendanceLiveDetailHtml(found.user, found.matrix, scopeId);
}

function renderAttendanceLiveDetailHtml(u, res, scopeId) {
 var monthParts = String((res && res.bulan) || '').split('-');
 var year = parseInt(monthParts[0], 10);
 var month = parseInt(monthParts[1], 10);
 var totalDays = parseInt((res && res.days) || 0, 10) || 0;
 if (!year || !month || !totalDays || !u) return '<div class="att-recap att-recap-muted">Detail belum tersedia.</div>';
 var recap = buildAttendanceMatrixRecap(u, res);
 var rows = [];
 function rowStatus(item, dateObj) {
 var masuk = item.masuk || '';
 var pulang = item.pulang || '';
 var hasTap = !!(masuk || pulang);
 if (item.anomali && !hasTap) return ['Tap anomali', '#f59e0b'];
 if (item.rejected && !hasTap) return ['Ditolak', '#64748b'];
 if (item.absen && !hasTap) return ['Absen', '#ef4444'];
 if (attendanceDayIsLate(item, dateObj)) return [item.lembur ? 'Telat dan lembur' : 'Telat', '#be123c'];
 if (item.lembur) return ['Lembur', '#7c3aed'];
 if (masuk && pulang) return ['Hadir lengkap', '#16a34a'];
 if (masuk) return ['Belum pulang', '#0e4fa3'];
 if (pulang) return ['Tanpa masuk', '#f59e0b'];
 return ['', ''];
 }
 for (var d = 1; d <= totalDays; d++) {
 var item = (u.days && u.days[d]) || {};
 var dateObj = new Date(year, month - 1, d);
 var status = rowStatus(item, dateObj);
 if (!status[0]) continue;
 rows.push({ day:d, masuk:item.masuk || '-', pulang:item.pulang || '-', label:status[0], color:status[1] });
 }
 if (!rows.length) return '<div class="att-recap att-recap-muted">Belum ada detail untuk '+labelBulanKey(res.bulan || '')+'.</div>';
 var html = '<div style="background:var(--blue-light);border-radius:10px;padding:14px;margin:10px 0 12px">';
 html += '<div class="attendance-month-title">'+uiIcon('calendar', 'inline-icon')+'<span>'+labelBulanKey(res.bulan || '')+'</span></div>';
 html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#22c55e">'+recap.hadir+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Hadir</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#ef4444">'+recap.absen+'</div><div style="font-size:10px;color:var(--text-muted)">Hari Absen</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:#f59e0b">'+recap.telat+'</div><div style="font-size:10px;color:var(--text-muted)">Kali Telat</div></div>';
 html += '<div style="background:#fff;border-radius:8px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:800;color:var(--blue)">'+recap.lembur+'</div><div style="font-size:10px;color:var(--text-muted)">Lembur</div></div>';
 html += '</div></div>';
 html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:6px;letter-spacing:.05em">DETAIL HARIAN</div>';
 html += rows.map(function(r) {
 return '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid var(--gray-border);border-radius:8px;padding:9px 10px;margin-bottom:6px;background:#fff">'+
 '<div><div style="font-size:12px;font-weight:700;color:var(--text-dark)">Tanggal '+r.day+'</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">Masuk '+r.masuk.substring(0,5)+' &middot; Pulang '+r.pulang.substring(0,5)+'</div></div>'+
 '<span style="font-size:10px;background:'+r.color+'22;color:'+r.color+';padding:3px 8px;border-radius:999px;font-weight:800">'+r.label+'</span>'+
 '</div>';
 }).join('');
 return html;
}

function buildAttendanceMatrixRecap(u, res) {
 var out = { hadir: 0, telat: 0, absen: 0, lembur: 0, hasData: false };
 var monthParts = String(res.bulan || '').split('-');
 var year = parseInt(monthParts[0], 10);
 var month = parseInt(monthParts[1], 10);
 var totalDays = parseInt(res.days || 0, 10) || 0;
 if (!year || !month || !totalDays || !u || !u.days) return out;
 for (var d = 1; d <= totalDays; d++) {
 var item = u.days[d] || {};
 var masuk = item.masuk || '';
 var pulang = item.pulang || '';
 var hasTap = !!(masuk || pulang);
 var isSunday = new Date(year, month - 1, d).getDay() === 0;
 if (item.absen && !hasTap) {
 out.absen++;
 out.hasData = true;
 continue;
 }
 if (item.lembur) {
 out.lembur++;
 out.hasData = true;
 }
 if (masuk && !isSunday) {
 out.hadir++;
 out.hasData = true;
 if (attendanceDayIsLate(item, new Date(year, month - 1, d))) out.telat++;
 }
 }
 return out;
}

function renderAttendanceLegend() {
 var rows = [
 { cls:'filled complete', symbol:uiIcon('check', 'attendance-state-icon'), title:'Hadir lengkap', desc:'Ada jam masuk dan jam pulang.' },
 { cls:'filled late', symbol:'!', title:'Telat', desc:'Jam masuk melewati jadwal.' },
 { cls:'anomaly', symbol:'!', title:'Tap anomali', desc:'Perlu dicek atau dikonfirmasi Finance.' },
 { cls:'filled overtime', symbol:'+', title:'Lembur', desc:'Ada catatan lembur pada hari tersebut.' },
 { cls:'absent', symbol:'A', title:'Absen', desc:'Tidak masuk atau tidak ada tap masuk.' },
 { cls:'rejected', symbol:'&times;', title:'Ditolak', desc:'Absensi ditolak oleh sistem.' },
 { cls:'filled partial', symbol:'&hellip;', title:'Belum pulang', desc:'Sudah tap masuk, belum ada tap pulang.' },
 { cls:'filled partial', symbol:'?', title:'Tanpa masuk', desc:'Ada tap pulang, tapi tidak ada tap masuk.' },
 { cls:'', symbol:'&middot;', title:'Belum ada data', desc:'Belum ada catatan pada tanggal itu.' },
 { cls:'sunday', symbol:'Min', title:'Hari Minggu', desc:'Kotak oranye menandai hari Minggu.' }
 ];
 return '<div class="card att-legend-card">'+
 '<div class="card-title"><div class="card-dot"></div>Keterangan Simbol</div>'+
 '<div class="att-legend-list">'+rows.map(function(r) {
 return '<div class="att-legend-item">'+
 '<span class="att-day '+r.cls+'"><em>'+r.symbol+'</em></span>'+
 '<div><b>'+r.title+'</b><p>'+r.desc+'</p></div>'+
 '</div>';
 }).join('')+'</div>'+
 '</div>';
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
 if (btn) { btn.textContent = 'Impor Fingerprint'; btn.disabled = false; }
 if (!res || !res.success) { showToast((res && res.msg) || 'Import gagal'); return; }
 clearAttendanceMatrixCache(null, bulanKey);
 showToast(res.msg || 'Import fingerprint selesai');
 loadAttendanceMatrix(true);
 }, function() {
 if (btn) { btn.textContent = 'Impor Fingerprint'; btn.disabled = false; }
 showToast('Koneksi gagal saat import fingerprint');
 });
}

function processAttendanceAppRecap() {
 if (!currentUser || (currentUser.bagian !== 'Owner' && currentUser.bagian !== 'Finance')) return;
 var sel = document.getElementById('att-matrix-bulan');
 var bulanKey = sel ? sel.value : attendanceMonthKey(new Date());
 if (!confirm('Proses absensi kamera bulan '+bulanKey+' ke rekap resmi? Data bulan ini akan disinkronkan ulang, SEKALIGUS menghitung SP & denda SP.')) return;
 var btn = document.querySelector('.attendance-process-btn');
 if (btn) { btn.textContent = 'Memproses...'; btn.disabled = true; }
 gasCall('processAbsensiAppToRekap', [bulanKey, currentUser.nama], function(res) {
 if (btn) { btn.textContent = 'Proses ke Rekap Resmi'; btn.disabled = false; }
 if (!res || !res.success) { showToast((res && res.msg) || 'Gagal proses rekap'); return; }
 clearAttendanceMatrixCache(null, bulanKey);
 cacheClear('getRekapBulananSemua' + JSON.stringify([bulanKey]));
 showToast('Rekap diperbarui: '+(res.rekapRows || 0)+' minggu · SP: '+(res.spEntries || 0)+' · Sanksi Berulang: '+(res.sanksiBerulang || 0));
 loadAttendanceMatrix(true);
 }, function() {
 if (btn) { btn.textContent = 'Proses ke Rekap Resmi'; btn.disabled = false; }
 showToast('Koneksi gagal saat proses rekap');
 });
}

function initials(nama) { return (nama||'').split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase(); }
function esc(s) { return (s||'').replace(/'/g,"\\'"); }
function htmlEscape(s) {
 return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
 });
}
function formatTglShort(tglStr) {
 if (!tglStr) return '';
 var m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
 var parts = String(tglStr).split('-');
 if (parts.length >= 3) return parseInt(parts[2])+' '+m[parseInt(parts[1])-1];
 return tglStr;
}
function cleanDisplayText(text) {
 return String(text || '')
  .replace(new RegExp(['\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d','\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u0153','\u00e2\u20ac\u201d','\u00e2\u20ac\u201c'].join('|'), 'g'), ' - ')
  .replace(new RegExp(['\u00c3\u201a\u00c2\u00b7','\u00c2\u00b7'].join('|'), 'g'), ' · ')
  .replace(new RegExp(['\u00c3\u00b0\u00c5\u00b8\u00c2\u008f\u00e2\u20ac\u00a0','\u00c3\u00b0\u00c5\u00b8\u00c2\u00a5\u00e2\u20ac\u00a1','\u00c3\u00b0\u00c5\u00b8\u00e2\u20ac\u2122\u00c2\u00aa','\u00c3\u00b0\u00c5\u00b8\u00e2\u20ac\u0153\u00cb\u2020','\u00c3\u00b0\u00c5\u00b8\u00e2\u20ac\u009d\u00e2\u20ac\u009d'].join('|'), 'g'), '')
  .replace(new RegExp(['\u00f0\u0178\u008f\u2020','\u00f0\u0178\u00a5\u2021','\u00f0\u0178\u2019\u00aa','\u00f0\u0178\u201c\u02c6','\u00f0\u0178\u201d\u201d'].join('|'), 'g'), '')
  .replace(/[\p{Extended_Pictographic}\u2600-\u27BF]/gu, '')
  .replace(/[\uFE0E\uFE0F\u200D]/g, '')
  .replace(/\u00e2\u2013\u00bc/g, '▼')
  .replace(/\s+/g, ' ')
  .trim();
}
function formatJamText(text) {
 return String(text || '').replace(/(-?\d+(?:[.,]\d+)?)\s+jam\b/gi, function(match, rawValue) {
  var hours = Number(String(rawValue).replace(',', '.'));
  if (!Number.isFinite(hours)) return match;
  return hours.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' jam';
 });
}
function cleanAbsensiText(text) {
 return formatJamText(cleanDisplayText(text))
  .replace(/\[[A-Z_]*SYNC\]\s*/gi, '')
  .replace(/\bLEMBUR_PULANG\b/g, 'Lembur pulang')
  .replace(/\bLEMBUR_MINGGU\b/g, 'Lembur hari Minggu')
  .replace(/\bLEMBUR_LIBUR\b/g, 'Lembur hari libur')
  .replace(/\bDENDA_MANUAL\b/g, 'Denda manual')
  .replace(/\bREWARD_MANUAL\b/g, 'Penghargaan manual')
  .replace(/\bPOTONGAN_ABSEN\b/g, 'Potongan absen')
  .replace(/\bDENDA_SP\b/g, 'Denda SP')
  .replace(/\bDENDA_ANOMALI\b/g, 'Denda tap anomali')
  .replace(/\s+/g, ' ')
  .trim();
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

function openInitialLogin() {
 goTo('s-login');
 var savedUsername = localStorage.getItem('hh_username');
 if (savedUsername) {
  document.getElementById('login-username').value = savedUsername;
  document.getElementById('login-password').focus();
 }
}

function restoreVerifiedLogin(session) {
 currentUser = session.user;
 if (session.username) localStorage.setItem('hh_username', session.username);
 _navHistory = [];
 history.replaceState({ screen: 's-home' }, '', '#home');
 goTo('s-home');
}

window.onload = function() {
 setupPWAInstall();
 warmUpGAS();
 setTimeout(function() {
 document.getElementById('loading').style.display = 'none';
 var session = getLoginSession();
 if (session && session.user) {
 if (!window.sb || !window.sb.auth || !window.sb.auth.getSession) {
  clearLoginSession();
  openInitialLogin();
  return;
 }
 window.sb.auth.getSession().then(function(result) {
  if (result && !result.error && result.data && result.data.session) {
   restoreVerifiedLogin(session);
   return;
  }
  clearLoginSession();
  openInitialLogin();
  showToast('Sesi login berakhir. Silakan masuk kembali.');
 }).catch(function() {
  clearLoginSession();
  openInitialLogin();
 });
 return;
 }
 openInitialLogin();
 }, 450);

};
