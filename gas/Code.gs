// ================================================
// HOSELA HUB — Code.gs (Server Side) — FULL VERSION
// ================================================

function doGet(e) {
  if (e && e.parameter && e.parameter.action) return handleAPI(e);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Hosela Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function doPost(e) { return handleAPI(e); }

function handleClientAPI(action, args) {
  const output = handleAPI({
    parameter: {
      action: action,
      args: JSON.stringify(args || [])
    }
  });
  return JSON.parse(output.getContent());
}

function handleAPI(e) {
  var result;
  try {
    var action = '', args = [];
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      if (e.parameter.args) args = JSON.parse(e.parameter.args);
    } else if (e.postData && e.postData.contents) {
      var d = JSON.parse(e.postData.contents);
      action = d.action; args = d.args || [];
    }
    switch (action) {
      case 'validateLogin':        result = validateLogin(args[0], args[1]); break;
      case 'validatePIN':          result = validateLogin(args[0], args[1]); break; // legacy
      case 'getHomeData':          result = getHomeData(args[0], args[1]); break;
      case 'getJobdeskList':       result = getJobdeskList(); break;
      case 'getStaffByBagian':     result = getStaffByBagian(args[0]); break;
      case 'getJobdeskByBagian':   result = getJobdeskByBagian(args[0]); break;
      case 'getJobdeskByJabatan':  result = getJobdeskByJabatan(args[0]); break;
      case 'getUserKPI':           result = getUserKPI(args[0]); break;
      case 'getPengumuman':        result = getPengumuman(args[0]); break;
      case 'addPengumuman':        result = addPengumuman(args[0],args[1],args[2],args[3],args[4]); break;
      case 'getIde':               result = getIde(); break;
      case 'addIde':               result = addIde(args[0],args[1],args[2],args[3]); break;
      case 'getAbsensiRekap':      result = getAbsensiRekap(args[0]); break;
      case 'getAllAbsensiRekap':   result = getAllAbsensiRekap(); break;
      case 'getRekapBulananSemua': result = getRekapBulananSemua(args[0]); break;
      case 'getPayrollPreview':    result = getPayrollPreview(args[0]); break;
      case 'createPayrollDraft':   result = createPayrollDraft(args[0], args[1]); break;
      case 'confirmPayroll':       result = confirmPayroll(args[0], args[1]); break;
      case 'publishPayroll':       result = publishPayroll(args[0], args[1]); break;
      case 'getPayrollDetail':     result = getPayrollDetail(args[0]); break;
      case 'updatePayrollAdjustment': result = updatePayrollAdjustment(args[0], args[1], args[2], args[3]); break;
      case 'getPayrollEmployeeSlip': result = getPayrollEmployeeSlip(args[0]); break;
      case 'getPayrollEmployeeSlipDetail': result = getPayrollEmployeeSlipDetail(args[0], args[1]); break;
      case 'submitAbsensiCamera': result = submitAbsensiCamera(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]); break;
      case 'getAbsensiCameraToday': result = getAbsensiCameraToday(args[0]); break;
      case 'getAbsensiMatrix': result = getAbsensiMatrix(args[0], args[1]); break;
      case 'getAbsensiMatrixUser': result = getAbsensiMatrix(args[1], args[0]); break;
      case 'updateAbsensiMatrixDay': result = updateAbsensiMatrixDay(args[0], args[1], args[2], args[3], args[4], args[5], args[6]); break;
      case 'processAbsensiAppToRekap': result = processAbsensiAppToRekap(args[0], args[1]); break;
      case 'importAbsensiUploadToApp': result = importAbsensiUploadToApp(args[0], args[1]); break;
      case 'debugAbsensiDay': result = debugAbsensiDay(args[0], args[1]); break;
      case 'getAbsensiDebugConfig': result = getAbsensiDebugConfig(); break;
      case 'processAbsensiUpload': result = processAbsensiUpload(); break;
      case 'getKalenderLibur':     result = getKalenderLibur(); break;
      case 'addLibur':             result = addLibur(args[0],args[1],args[2]); break;
      case 'getAllUsers':           result = getAllUsers(); break;
      case 'getSalaryUsers':        result = getSalaryUsers(args[0], args[1]); break;
      case 'updateUserSalary':      result = updateUserSalary(args[0], args[1], args[2], args[3], args[4], args[5]); break;
      case 'deactivateSalaryUser':  result = deactivateSalaryUser(args[0], args[1]); break;
      case 'nonaktifkanUser':      result = nonaktifkanUser(args[0]); break;
      case 'getPeraturan':         result = getPeraturan(); break;
      case 'getPengaturan':        result = getPengaturan(); break;
      case 'updateEmail':          result = updateEmail(args[0], args[1]); break;
      case 'addSanksiManual':      result = addSanksiManual(args[0],args[1],args[2],args[3],args[4]); break;
      case 'batalSanksiManual':    result = batalSanksiManual(args[0]); break;
      case 'getSanksiManual':      result = getSanksiManual(); break;
      case 'getKPITemplate':       result = getKPITemplate(args[0]); break;
      case 'submitKPILaporan':     result = submitKPILaporan(args[0],args[1],args[2]); break;
      case 'getKPILaporan':        result = getKPILaporan(args[0]); break;
      case 'getPapanPeringkat':    result = getPapanPeringkat(); break;
      case 'getUserProfile':       result = getUserProfile(args[0]); break;
      case 'hitungBintang':        result = hitungBintang(args[0]); break;
      case 'ping':                 result = { ok: true }; break;
      case 'gantiPIN':             result = gantiPIN(args[0], args[1], args[2]); break;
      case 'submitIzin':           result = submitIzin(args[0],args[1],args[2],args[3],args[4]); break;
      case 'getIzinKaryawan':      result = getIzinKaryawan(args[0]); break;
      case 'getIzinPending':       result = getIzinPending(); break;
      case 'approveIzin':          result = approveIzin(args[0],args[1],args[2]); break;
      case 'getSPHistory':         result = getSPHistory(args[0]); break;
      case 'getNotifikasi':        result = getNotifikasi(args[0]); break;
      case 'tandaiDibaca':         result = tandaiDibaca(args[0]); break;
      case 'hapusNotifikasi':      result = hapusNotifikasi(args[0]); break;
      case 'hapusSemuaNotifikasi': result = hapusSemuaNotifikasi(args[0]); break;
      case 'getNotifCountByMenu':  result = getNotifCountByMenu(args[0]); break;
      case 'tandaiMenuDibaca':     result = tandaiMenuDibaca(args[0], args[1]); break;
      case 'notifPeraturanBaru':   result = notifPeraturanBaru(args[0]); break;
      case 'triggerNotifPeraturan': result = triggerNotifPeraturan(args[0]); break;
      case 'getAnomaliPending':    result = getAnomaliPending(); break;
      case 'konfirmasiAnomali':    result = konfirmasiAnomali(args[0], args[1]); break;
      case 'getIzinPendingCount':  result = getIzinPendingCount(); break;
      default: result = { error: 'Unknown action: ' + action };
    }
  } catch (err) { result = { error: err.message }; }
  const json = JSON.stringify(result);
  if (e.parameter && e.parameter.callback) {
    const cb = String(e.parameter.callback).replace(/[^\w.$]/g, '');
    return ContentService
      .createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ─── USERS ───────────────────────────────────────
function validateLogin(username, password) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase().trim() === String(username).toLowerCase().trim() && row[6] === 'AKTIF') {
      if (String(row[2]) !== String(password)) return { success: false };
      const isDefaultPassword = String(password) === 'hosela';
      return { success: true, isDefaultPassword, user: { id: row[0], nama: row[1], bagian: row[3], jabatan: row[4] } };
    }
  }
  return { success: false };
}

function validatePIN(pin) { return { success: false }; }

function gantiPIN(userId, sandiLama, sandiBaru) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      if (String(data[i][2]) !== String(sandiLama)) return { success: false, msg: 'Kata sandi lama tidak cocok' };
      sheet.getRange(i+1, 3).setValue(sandiBaru);
      return { success: true };
    }
  }
  return { success: false, msg: 'User tidak ditemukan' };
}

function getAllUsers() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++)
    result.push({ id: data[i][0], nama: data[i][1], bagian: data[i][3], jabatan: data[i][4], status: data[i][6] });
  return result;
}

function nonaktifkanUser(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.getRange(i+1,7).setValue('NONAKTIF');
      sheet.getRange(i+1,9).setValue(new Date());
      return { success: true };
    }
  }
  return { success: false };
}

function getUserRole_(userId) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) return { id: data[i][0], nama: data[i][1], bagian: data[i][3], jabatan: data[i][4], status: data[i][6] };
  }
  return null;
}

function isPayrollAdmin_(userId) {
  const u = getUserRole_(userId);
  return !!(u && u.status === 'AKTIF' && (u.bagian === 'Owner' || u.bagian === 'Finance'));
}

function ensureSalarySettingSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('SALARY_SETTING');
  const header = ['id','userId','bulan','gajiBulanan','bonusKerajinan','catatan','updatedBy','updatedAt'];
  if (!sheet) sheet = ss.insertSheet('SALARY_SETTING');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getEffectiveSalarySetting_(userId, bulanKey, fallbackSalary, fallbackKerajinan) {
  const sheet = ensureSalarySettingSheet_();
  const data = sheet.getDataRange().getValues();
  const targetMonth = String(bulanKey || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM'));
  let best = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) !== String(userId)) continue;
    const rowMonth = String(data[i][2] || '');
    if (!rowMonth || rowMonth > targetMonth) continue;
    if (!best || rowMonth > String(best[2] || '')) best = data[i];
  }
  const salary = best ? (parseInt(best[3] || 0, 10) || 0) : (parseInt(fallbackSalary || 0, 10) || 0);
  const kerajinanFallback = fallbackKerajinan == null ? 150000 : (parseInt(fallbackKerajinan || 0, 10) || 0);
  const kerajinan = best ? Math.max(0, parseInt(best[4] || 0, 10) || 0) : kerajinanFallback;
  return {
    gajiBulanan: salary,
    bonusKerajinan: kerajinan,
    bulanSetting: best ? best[2] : '',
    catatan: best ? (best[5] || '') : ''
  };
}

function getSalaryUsers(actorId, bulanKey) {
  if (!isPayrollAdmin_(actorId)) return { success: false, msg: 'Akses ditolak' };
  bulanKey = String(bulanKey || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM'));
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] !== 'AKTIF' || data[i][3] === 'Owner' || data[i][3] === 'Finance') continue;
    const setting = getEffectiveSalarySetting_(data[i][0], bulanKey, data[i][12] || 0, 150000);
    result.push({
      id: data[i][0], nama: data[i][1], bagian: data[i][3], jabatan: data[i][4], status: data[i][6],
      gajiBulanan: data[i][12] || 0,
      gajiBulanBerlaku: setting.gajiBulanan,
      bonusKerajinan: setting.bonusKerajinan,
      bulanSetting: setting.bulanSetting,
      catatanSetting: setting.catatan
    });
  }
  result.sort(function(a,b){ return String(a.nama || '').localeCompare(String(b.nama || '')); });
  return { success: true, bulan: bulanKey, data: result };
}

function updateUserSalary(actorId, userId, salary, bulanKey, note, bonusKerajinan) {
  if (!isPayrollAdmin_(actorId)) return { success: false, msg: 'Akses ditolak' };
  bulanKey = String(bulanKey || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM'));
  const gaji = Math.max(0, parseInt(salary || 0, 10) || 0);
  const kerajinan = Math.max(0, parseInt(bonusKerajinan == null ? 150000 : bonusKerajinan, 10) || 0);
  if (!userId) return { success: false, msg: 'User tidak valid' };
  if (gaji <= 0) return { success: false, msg: 'Gaji harus lebih dari 0' };

  const sheet = ensureSalarySettingSheet_();
  const data = sheet.getDataRange().getValues();
  const actor = getUserRole_(actorId);
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId) && String(data[i][2]) === bulanKey) {
      sheet.getRange(i + 1, 4, 1, 5).setValues([[gaji, kerajinan, note || '', actor ? actor.nama : actorId, now]]);
      clearSalaryPayrollCache_(userId, bulanKey);
      return { success: true, id: data[i][0], userId, bulan: bulanKey, gajiBulanan: gaji, bonusKerajinan: kerajinan };
    }
  }
  const id = 'SAL-' + Utilities.getUuid().substring(0, 8);
  sheet.appendRow([id, userId, bulanKey, gaji, kerajinan, note || '', actor ? actor.nama : actorId, now]);
  clearSalaryPayrollCache_(userId, bulanKey);
  return { success: true, id, userId, bulan: bulanKey, gajiBulanan: gaji, bonusKerajinan: kerajinan };
}

function clearSalaryPayrollCache_(userId, bulanKey) {
  try {
    CacheService.getScriptCache().removeAll([
      'rekap_' + userId,
      'dashboard_' + userId,
      'ranking',
      'all_absensi_rekap',
      'rekap_bulanan_semua_' + bulanKey,
      'payroll_preview_' + bulanKey
    ]);
  } catch(e) {}
}

function deactivateSalaryUser(actorId, userId) {
  if (!isPayrollAdmin_(actorId)) return { success: false, msg: 'Akses ditolak' };
  return nonaktifkanUser(userId);
}
// ─── HOME DATA ───────────────────────────────────
function readSheetRows_(sheet, columns) {
  const lastRow = sheet ? sheet.getLastRow() : 0;
  return lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, columns).getValues() : [];
}

function profileFromUserRow_(r) {
  return {
    bintang: r ? (r[9] || 0) : 0,
    skor: r ? (r[10] || 0) : 0,
    skorKPI: r ? (r[11] || 0) : 0,
    nama: r ? r[1] : '',
    jabatan: r ? r[4] : '',
    bagian: r ? r[3] : ''
  };
}

function getPapanPeringkatFromUsers_(usersData) {
  const result = [];
  for (let i = 0; i < usersData.length; i++) {
    const r = usersData[i];
    if (r[6] === 'AKTIF' && r[3] !== 'Owner' && r[3] !== 'Finance') {
      result.push({
        id: r[0], nama: r[1], jabatan: r[4], bagian: r[3],
        bintang: r[9] || 0,
        skor: r[10] || 0,
        finalScore: r[13] || 0
      });
    }
  }
  const sorted = result.sort(function(a,b){ return b.finalScore - a.finalScore; });
  sorted.forEach(function(k, idx) {
    k.ranking = idx + 1;
    k.isRanking1 = idx === 0;
    if (k.bintang >= 5) k.apresiasi = 'ðŸ† Bintang Utama â€” Kamu kebanggaan tim!';
    else if (k.bintang >= 4) k.apresiasi = 'ðŸ¥‡ Luar Biasa â€” Pertahankan semangatmu!';
    else if (k.bintang >= 3) k.apresiasi = 'ðŸ’ª Solid â€” Terus tingkatkan kinerjamu!';
    else if (k.bintang >= 2) k.apresiasi = 'ðŸ“ˆ Berkembang â€” Masih ada ruang untuk tumbuh';
    else k.apresiasi = 'ðŸ”” Perlu Perhatian â€” Yuk bangkit bulan ini!';
  });
  return sorted;
}

function getHomeData(userId, bagian) {
  // Cache 3 menit per user
  const cacheKey = 'dashboard_' + userId;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  const usersData = readSheetRows_(ss.getSheetByName('USERS'), 14);
  const usersById = {};
  for (let i = 0; i < usersData.length; i++) usersById[String(usersData[i][0]).trim()] = usersData[i];

  // Pengumuman
  const pengData = readSheetRows_(ss.getSheetByName('PENGUMUMAN'), 8);
  const pengumuman = [];
  for (let i = 0; i < pengData.length; i++) {
    const r = pengData[i];
    if (r[7] === 'AKTIF' && (r[4] === 'ALL' || r[4] === bagian))
      pengumuman.push({ id: r[0], judul: r[1], isi: r[2], kategori: r[3] });
  }
  result.pengumuman = pengumuman.reverse().slice(0,3);

  // Rewards (semua AKTIF untuk slider)
  result.reward = null; result.rewards = [];
  try {
    const peringkat = getPapanPeringkatFromUsers_(usersData);
    const ranking1 = peringkat.length > 0 ? peringkat[0] : null;
    if (ranking1) {
      const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const now2 = new Date();
      const bulanLabel = bln[now2.getMonth()] + ' ' + now2.getFullYear();
      const rObj = { bulan: bulanLabel, nama: ranking1.nama, bagian: ranking1.bagian, alasan: ranking1.apresiasi.replace(/^[^\s]+\s/,''), pesan: 'Semangat tim! Jadikan ini motivasi untuk terus berkembang.' };
      result.rewards.push(rObj);
      result.reward = rObj;
    }
  } catch(e) { Logger.log('getPapanPeringkat error: '+e); }
  // Tambah reward dari tab REWARD kalau ada (slide ke-2, dst)
  const rewardData = readSheetRows_(ss.getSheetByName('REWARD'), 6);
  for (let i = 0; i < rewardData.length; i++) {
    const r = rewardData[i];
    if (String(r[5]).trim() === 'AKTIF') {
      let nama = '', bag = '';
      const rewardUser = usersById[String(r[2]).trim()];
      if (rewardUser) { nama = rewardUser[1]; bag = rewardUser[3]; }
      result.rewards.push({ bulan: r[1], nama, bagian: bag, alasan: r[3], pesan: r[4] });
    }
  }

  // KPI bulan ini (sheet KPI lama — skip kalau tidak ada)
  const now = new Date();
  const bulan = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  result.kpi = [];
  const kpiSheet = ss.getSheetByName('KPI');
  if (kpiSheet) {
    const kpiData = readSheetRows_(kpiSheet, 7);
    for (let i = 0; i < kpiData.length; i++) {
      const r = kpiData[i];
      if (r[1] === userId && r[2] === bulan)
        result.kpi.push({ indikator: r[3], target: r[4], realisasi: r[5], status: r[6] });
    }
  }

  // Profile user (bintang) — baca dari USERS langsung, tidak hitung ulang
  // hitungBintang hanya dipanggil saat data berubah (processAbsensiUpload, submitKPILaporan)
  result.profile = profileFromUserRow_(usersById[String(userId).trim()]);

  // Notif absensi Finance
  // Upload fingerprint sudah diganti absensi kamera realtime, jadi reminder upload dimatikan.
  result.needsAbsensiUpdate = false;

  // Cek anomali tap yang masih MENUNGGU untuk karyawan ini
  result.anomaliPending = [];
  if (bagian !== 'Owner' && bagian !== 'Finance') {
    const anomaliSheet = ss.getSheetByName('ANOMALI');
    if (anomaliSheet) {
      const anomData = readSheetRows_(anomaliSheet, 8);
      const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      for (let i = 0; i < anomData.length; i++) {
      if (String(anomData[i][1]) === String(userId) && anomData[i][5] === 'MENUNGGU') {
          const dateKey = extractDateStr(anomData[i][2]);
          if (!isPastDateKey_(dateKey)) continue;
          if (hasCompleteAttendanceForDay_(ss, userId, dateKey)) {
            autoResolveAnomaliForDay_(userId, dateKey, 'System');
            continue;
          }
          let tglStr = '', deadlineStr = '';
          try { const t = new Date(anomData[i][2]); tglStr = t.getDate()+' '+mNames[t.getMonth()]; } catch(e) {}
          try { const d = new Date(anomData[i][7]); deadlineStr = d.getDate()+' '+mNames[d.getMonth()]+' '+d.getFullYear(); } catch(e) {}
          result.anomaliPending.push({ id: anomData[i][0], tanggal: tglStr, deadline: deadlineStr });
        }
      }
    }
  }

  // Notif count per menu untuk badge
  result.notifCountByMenu = getNotifCountByMenu(userId);

  // Simpan ke cache 3 menit
  try { cache.put(cacheKey, JSON.stringify(result), 180); } catch(e) {}
  return result;
}

function checkAbsensiUpdateNeeded() {
  if (new Date().getDay() !== 1) return false;
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ABSENSI_RAW').getDataRange().getValues();
  const lastMonday = new Date(); lastMonday.setDate(lastMonday.getDate()-7);
  const weekStr = getWeekString(lastMonday);
  for (let i = 1; i < data.length; i++) if (data[i][5] === weekStr) return false;
  return true;
}

// ─── JOBDESK ─────────────────────────────────────
function getJobdeskList() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[6] === 'AKTIF' && r[3] !== 'Owner' && r[3] !== 'Finance') map[r[3]] = (map[r[3]]||0)+1;
  }
  return Object.entries(map).map(function(e){ return { bagian: e[0], count: e[1] }; });
}

function getStaffByBagian(bagian) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const staff = [];
  for (let i = 1; i < data.length; i++)
    if (data[i][3] === bagian && data[i][6] === 'AKTIF') staff.push({ id: data[i][0], nama: data[i][1], jabatan: data[i][4] });
  return staff;
}

function getJobdeskByJabatan(jabatan) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('JOBDESK').getDataRange().getValues();
  // Cari match jabatan dulu
  for (let i = 1; i < data.length; i++) if (data[i][2] === jabatan) return { link: data[i][3], jabatan: data[i][2] };
  // Fallback ke bagian kalau tidak ada per jabatan
  for (let i = 1; i < data.length; i++) if (data[i][1] === jabatan) return { link: data[i][3], jabatan: data[i][2] };
  return null;
}

// Legacy
function getJobdeskByBagian(bagian) {
  return getJobdeskByJabatan(bagian);
}

// ─── KPI LAMA ────────────────────────────────────
function getUserKPI(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KPI');
  if (!sheet) return { kpi: [], bulan: '' };
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const bulan = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const kpi = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[1] === userId && r[2] === bulan)
      kpi.push({ indikator: r[3], target: r[4], realisasi: r[5], status: r[6], catatan: r[7] });
  }
  return { kpi, bulan };
}

// ─── KPI TEMPLATE & LAPORAN ──────────────────────
function getKPITemplate(jabatan) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KPI_TEMPLATE').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[1] === jabatan) result.push({ id: r[0], no: r[2], indikator: r[3], keterangan: r[4] });
  }
  return result;
}

function submitKPILaporan(userId, minggu, items) {
  // items = [{kpiId, indikator, selesai (true/false), catatan}]
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('KPI_LAPORAN');

  // Hapus laporan minggu ini dari user ini dulu (replace)
  const data = sheet.getDataRange().getValues();
  const toDelete = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(userId) && data[i][2] === minggu) toDelete.push(i+1);
  }
  toDelete.forEach(function(r){ sheet.deleteRow(r); });

  // Tambah data baru — paksa selesai jadi boolean murni
  const now = new Date();
  items.forEach(function(item) {
    const id = 'KL-' + Utilities.getUuid().substring(0,8);
    const selesaiBool = (item.selesai === true || item.selesai === 'true' || item.selesai === 1);
    sheet.appendRow([id, userId, minggu, item.kpiId, item.indikator, selesaiBool, item.catatan, now]);
  });

  // Hitung skor dan update penilaian
  hitungBintang(userId);
  clearKPIReminderAfterSubmit_(userId, minggu);
  // Invalidate cache
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['dashboard_'+userId, 'rekap_'+userId, 'ranking']);
  } catch(e) {}
  return { success: true };
}

function getKPILaporan(userId) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KPI_LAPORAN').getDataRange().getValues();
  const weeks = {};
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[1]) === String(userId)) {
      if (!weeks[r[2]]) weeks[r[2]] = { minggu: r[2], items: [], selesai: 0, total: 0 };
      weeks[r[2]].items.push({ kpiId: r[3], indikator: r[4], selesai: r[5], catatan: r[6] });
      weeks[r[2]].total++;
      if (r[5]) weeks[r[2]].selesai++;
    }
  }
  return Object.values(weeks).sort(function(a,b){ return b.minggu.localeCompare(a.minggu); }).slice(0,4);
}

function clearKPIReminderAfterSubmit_(userId, minggu) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const title = 'Reminder KPI Checklist ' + minggu;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && String(data[i][2]) === title && data[i][5] === 'BELUM') {
        sheet.getRange(i + 1, 6).setValue('SUDAH');
      }
    }
    clearNotifCache_(userId);
  } catch(e) { Logger.log('clearKPIReminderAfterSubmit_ error: ' + e); }
}

function hitungSemuaBintang() {
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    const bagian = usersData[i][3];
    if (usersData[i][6] !== 'AKTIF' || bagian === 'Owner' || bagian === 'Finance') continue;
    const userId = usersData[i][0];
    try {
      const result = hitungBintang(userId);
      Logger.log(userId+' → skor='+result.skorAkhir+' bintang='+result.bintang+' finalScore='+result.finalScore);
    } catch(e) {
      Logger.log(userId+' ERROR: '+e);
    }
  }
  Logger.log('Selesai hitung semua bintang');
}
function testHitungBintang() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userId = 'USR-002'; // USR-002

  // Cek ABSENSI_DETAIL
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const detailRows = detailSheet ? detailSheet.getLastRow() - 1 : 0;
  Logger.log('ABSENSI_DETAIL total rows: ' + detailRows);

  if (detailSheet && detailRows > 0) {
    const detailData = detailSheet.getDataRange().getValues();
    let found = 0;
    for (let i = 1; i < detailData.length; i++) {
      if (String(detailData[i][1]) === String(userId)) {
        Logger.log('DETAIL row ' + i + ': tipe=' + detailData[i][4] + ' tgl=' + detailData[i][3] + ' ket=' + detailData[i][5]);
        found++;
        if (found >= 10) break;
      }
    }
    if (found === 0) Logger.log('TIDAK ADA data ABSENSI_DETAIL untuk userId=' + userId);
  }

  // Cek KPI_LAPORAN
  const kpiSheet = ss.getSheetByName('KPI_LAPORAN');
  const kpiRows = kpiSheet ? kpiSheet.getLastRow() - 1 : 0;
  Logger.log('KPI_LAPORAN total rows: ' + kpiRows);

  // Jalankan hitungBintang
  const result = hitungBintang(userId);
  Logger.log('RESULT: ' + JSON.stringify(result));
}

// ─── SISTEM BINTANG ──────────────────────────────
function hitungBintang(userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Deteksi bulan dari ABSENSI_DETAIL (hanya tipe absensi, bukan denda) ──
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  let bulanAbsensi = '';
  if (detailSheet && detailSheet.getLastRow() > 1) {
    const detailDataAll = detailSheet.getDataRange().getValues();
    const bulanSet = new Set();
    const tipeAbsensi = ['ABSEN','TELAT','LEMBUR_PULANG','LEMBUR_MINGGU','LEMBUR_LIBUR','HADIR'];
    for (let i = 1; i < detailDataAll.length; i++) {
      if (String(detailDataAll[i][1]) !== String(userId)) continue;
      if (tipeAbsensi.indexOf(detailDataAll[i][4]) === -1) continue;
      const bk = extractMonthKey(detailDataAll[i][3]); // string-based, no timezone
      if (bk && bk.length === 7) bulanSet.add(bk);
    }
    if (bulanSet.size > 0) bulanAbsensi = Array.from(bulanSet).sort().reverse()[0];
  }
  if (!bulanAbsensi) {
    bulanAbsensi = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
  }

  // ── Deteksi bulan dari KPI_LAPORAN (untuk komponen KPI) ──
  const kpiLaporan = ss.getSheetByName('KPI_LAPORAN');
  let bulanKPI = '';
  if (kpiLaporan && kpiLaporan.getLastRow() > 1) {
    const kpiAllRows = kpiLaporan.getDataRange().getValues();
    const kpiBulanSet = new Set();
    for (let i = 1; i < kpiAllRows.length; i++) {
      if (String(kpiAllRows[i][1]).trim() !== String(userId).trim()) continue;
      const monday = getMondayOfWeek(String(kpiAllRows[i][2]));
      if (!monday || isNaN(monday)) continue;
      kpiBulanSet.add(monday.getFullYear()+'-'+String(monday.getMonth()+1).padStart(2,'0'));
    }
    if (kpiBulanSet.size > 0) bulanKPI = Array.from(kpiBulanSet).sort().reverse()[0];
  }
  if (!bulanKPI) bulanKPI = bulanAbsensi; // fallback

  // Gunakan bulanAbsensi untuk attendance, bulanKPI untuk KPI
  const bulanStr = bulanAbsensi; // untuk log
  Logger.log('hitungBintang userId='+userId+' bulanAbsensi='+bulanAbsensi+' bulanKPI='+bulanKPI);

  // ── KPI Score (0–100) ──
  let totalItem = 0, totalSelesai = 0;
  if (kpiLaporan && kpiLaporan.getLastRow() > 1) {
    const kpiData = kpiLaporan.getDataRange().getValues();
    Logger.log('KPI filter: userId='+userId+' bulanKPI='+bulanKPI+' rows='+(kpiData.length-1));
    for (let i = 1; i < kpiData.length; i++) {
      const r = kpiData[i];
      if (String(r[1]).trim() !== String(userId).trim()) continue;
      const workMonday = getMondayOfWeek(String(r[2]));
      if (!workMonday || isNaN(workMonday)) continue;
      const workBulan = workMonday.getFullYear()+'-'+String(workMonday.getMonth()+1).padStart(2,'0');
      if (workBulan !== bulanKPI) continue;
      totalItem++;
      const selesai = r[5] === true || String(r[5]).toUpperCase() === 'TRUE' || r[5] === 1;
      if (selesai) totalSelesai++;
    }
  }
  const pctKPI = totalItem > 0 ? Math.round((totalSelesai / totalItem) * 100) : 0;
  Logger.log('KPI FINAL: totalItem='+totalItem+' selesai='+totalSelesai+' pctKPI='+pctKPI+'%');

  // ── Hitung komponen absensi dari ABSENSI_DETAIL ──
  let absenFisik = 0, totalTelat = 0, totalLembur = 0;
  if (detailSheet && detailSheet.getLastRow() > 1) {
    const detailData = detailSheet.getDataRange().getValues();
    for (let i = 1; i < detailData.length; i++) {
      const r = detailData[i];
      if (String(r[1]) !== String(userId)) continue;
      let tglDet = null;
      try { tglDet = new Date(r[3]); } catch(e) {}
      if (!tglDet || isNaN(tglDet)) continue;
      const bk = tglDet.getFullYear()+'-'+String(tglDet.getMonth()+1).padStart(2,'0');
      if (bk !== bulanStr) continue;
      if (r[4] === 'ABSEN') absenFisik++;
      else if (r[4] === 'TELAT') totalTelat++;
      else if (r[4] === 'LEMBUR_PULANG' || r[4] === 'LEMBUR_MINGGU' || r[4] === 'LEMBUR_LIBUR') totalLembur++;
    }
  }

  // ── Hitung izin: pisahkan SAKIT vs IZIN ──
  let totalSakit = 0, totalIzin = 0;
  const izinSheet = ss.getSheetByName('IZIN');
  if (izinSheet) {
    const izinData = izinSheet.getDataRange().getValues();
    for (let i = 1; i < izinData.length; i++) {
      if (String(izinData[i][1]) !== String(userId)) continue;
      if (izinData[i][5] !== 'DISETUJUI') continue;
      let tglIzin = null;
      try { tglIzin = new Date(izinData[i][2]); } catch(e) {}
      if (!tglIzin || isNaN(tglIzin)) continue;
      const bk = tglIzin.getFullYear()+'-'+String(tglIzin.getMonth()+1).padStart(2,'0');
      if (bk !== bulanStr) continue;
      const jenis = String(izinData[i][3]).toUpperCase();
      if (jenis === 'SAKIT') totalSakit++;
      else totalIzin++;
    }
  }

  // Absen murni = absen fisik - semua izin disetujui
  const absenMurni = Math.max(0, absenFisik - totalSakit - totalIzin);

  // ── Attendance Score (0–100) ──
  const lemburBonus = Math.min(10, totalLembur * 3);
  let skorAttendance = 100
    - (absenMurni * 12)
    - (totalIzin  * 4)
    - (totalSakit * 2)
    - (totalTelat * 3)
    + lemburBonus;
  skorAttendance = Math.max(0, Math.min(100, skorAttendance));

  // ── Final Score ──
  let skorAkhir = Math.round((pctKPI + skorAttendance) / 2);
  skorAkhir = Math.max(0, Math.min(100, skorAkhir));

  // ── Konversi ke bintang (base dari skor) ──
  let bintang;
  if (skorAkhir >= 85) bintang = 5;
  else if (skorAkhir >= 75) bintang = 4;
  else if (skorAkhir >= 65) bintang = 3;
  else if (skorAkhir >= 50) bintang = 2;
  else bintang = 1;
  const baseStar = bintang; // simpan sebelum gate

  // ── Gate rules — cap bintang berdasarkan absen murni ──
  let gateCap = 5;
  if (absenMurni >= 3) gateCap = 2;
  else if (absenMurni >= 2) gateCap = 3;
  bintang = Math.min(bintang, gateCap);

  // ── Runtime validation log ──
  Logger.log('=== RUNTIME VALIDATION ===');
  Logger.log('score='+skorAkhir+' | baseStar='+baseStar+' | absenMurni='+absenMurni+' | gateCap='+gateCap+' | finalStar='+bintang);
  Logger.log('Execution: score→baseStar→gate→finalStar→save→UI');
  Logger.log('==========================');

  Logger.log('hitungBintang '+userId+': bulan='+bulanStr+' KPI='+pctKPI+'% attendance='+skorAttendance
    +' absenMurni='+absenMurni+' izin='+totalIzin+' sakit='+totalSakit+' telat='+totalTelat+' lembur='+totalLembur
    +' → final='+skorAkhir+' bintang='+bintang);

  // ── FinalScore untuk ranking (score tidak berubah) ──
  // FinalScore = skorAkhir - (absenMurni × 5)
  const finalScore = Math.max(0, skorAkhir - (absenMurni * 5));
  Logger.log('FinalScore='+finalScore+' (skorAkhir='+skorAkhir+' - absenMurni='+absenMurni+'×5)');

  // ── Simpan ke USERS ──
  // Kolom J=Bintang K=Skor L=SkorKPI M=Gaji N=FinalScore
  const usersSheet = ss.getSheetByName('USERS');
  const usersData = usersSheet.getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) {
      usersSheet.getRange(i+1, 10).setValue(bintang);    // J = Bintang
      usersSheet.getRange(i+1, 11).setValue(skorAkhir);  // K = Skor (tidak berubah)
      usersSheet.getRange(i+1, 12).setValue(pctKPI);     // L = SkorKPI
      usersSheet.getRange(i+1, 14).setValue(finalScore); // N = FinalScore (ranking)
      break;
    }
  }
  return { bintang, skorAkhir, skorKPI: pctKPI, finalScore };
}

function getUserProfile(userId) {
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    const r = usersData[i];
    if (String(r[0]) === String(userId)) {
      const bintang = r[9] || 0;
      const skor = r[10] || 0;
      const skorKPI = r[11] || 0;
      return { bintang, skor, skorKPI, nama: r[1], jabatan: r[4], bagian: r[3] };
    }
  }
  return { bintang: 0, skor: 0, skorKPI: 0 };
}

function getPapanPeringkat() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('ranking');
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < usersData.length; i++) {
    const r = usersData[i];
    if (r[6] === 'AKTIF' && r[3] !== 'Owner' && r[3] !== 'Finance') {
      result.push({
        id: r[0], nama: r[1], jabatan: r[4], bagian: r[3],
        bintang: r[9]||0,
        skor: r[10]||0,       // score asli — ditampilkan apa adanya
        finalScore: r[13]||0  // FinalScore kolom N — untuk ranking saja
      });
    }
  }
  // Sort by FinalScore descending (bukan skor asli)
  const sorted = result.sort(function(a,b){ return b.finalScore - a.finalScore; });
  sorted.forEach(function(k, idx) {
    k.ranking = idx + 1;
    k.isRanking1 = idx === 0;
    if (k.bintang >= 5) k.apresiasi = '🏆 Bintang Utama — Kamu kebanggaan tim!';
    else if (k.bintang >= 4) k.apresiasi = '🥇 Luar Biasa — Pertahankan semangatmu!';
    else if (k.bintang >= 3) k.apresiasi = '💪 Solid — Terus tingkatkan kinerjamu!';
    else if (k.bintang >= 2) k.apresiasi = '📈 Berkembang — Masih ada ruang untuk tumbuh';
    else k.apresiasi = '🔔 Perlu Perhatian — Yuk bangkit bulan ini!';
  });
  try { cache.put('ranking', JSON.stringify(sorted), 300); } catch(e) {}
  return sorted;
}

// ─── PENGUMUMAN ───────────────────────────────────
function getPengumuman(bagian) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PENGUMUMAN').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[7] === 'AKTIF' && (r[4] === 'ALL' || r[4] === bagian)) {
      let tgl = '';
      try { tgl = Utilities.formatDate(new Date(r[6]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(r[6]); }
      result.push({ id: r[0], judul: r[1], isi: r[2], kategori: r[3], dibuat: r[5], tgl });
    }
  }
  return result.reverse();
}

function addPengumuman(judul, isi, kategori, targetBagian, dibuatOleh) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PENGUMUMAN');
  const id = 'PNG-' + String(sheet.getLastRow()).padStart(3,'0');
  sheet.appendRow([id, judul, isi, kategori, targetBagian, dibuatOleh, new Date(), 'AKTIF']);
  try { kirimEmailPengumuman(judul, isi, kategori, targetBagian); } catch(e) { Logger.log(e); }
  return { success: true };
}

// ─── IDE TIM ──────────────────────────────────────
function getIde() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ideData = ss.getSheetByName('IDE_TIM').getDataRange().getValues();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = { nama: usersData[i][1], bagian: usersData[i][3] };
  const result = [];
  for (let i = 1; i < ideData.length; i++) {
    const r = ideData[i];
    const u = userMap[r[1]] || { nama: '-', bagian: '-' };
    let tgl = '';
    try { tgl = Utilities.formatDate(new Date(r[4]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(r[4]); }
    result.push({ id: r[0], judul: r[2], deskripsi: r[3], tgl, status: r[5], feedback: r[6], nama: u.nama, bagian: u.bagian });
  }
  return result.reverse();
}

function addIde(userId, nama, judul, deskripsi) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('IDE_TIM');
  const id = 'IDE-' + String(sheet.getLastRow()).padStart(3,'0');
  sheet.appendRow([id, userId, judul, deskripsi, new Date(), 'BARU', '']);
  return { success: true };
}

// ─── ABSENSI ─────────────────────────────────────
function processAbsensiUpload() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uploadSheet = ss.getSheetByName('ABSENSI_UPLOAD');
  if (!uploadSheet) return { success: false, msg: 'Sheet ABSENSI_UPLOAD tidak ditemukan.' };
  const data = uploadSheet.getDataRange().getValues();
  if (data.length < 5) return { success: false, msg: 'Sheet masih kosong.' };

  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    const bagian = usersData[i][3];
    if (bagian === 'Owner' || bagian === 'Finance') continue; // skip owner & finance
    userMap[String(usersData[i][1]).toLowerCase().trim()] = {
      id: usersData[i][0], nama: usersData[i][1], bagian,
      jabatan: usersData[i][4], gajiBulanan: usersData[i][12] || 0 // kolom M
    };
  }

  const kalData = ss.getSheetByName('KALENDER_LIBUR').getDataRange().getValues();
  const holidaySet = new Set();
  for (let i = 1; i < kalData.length; i++)
    if (String(kalData[i][3]).toUpperCase() === 'YA' && kalData[i][1]) holidaySet.add(fmtDate(new Date(kalData[i][1])));

  // Baca jadwal khusus
  const jadwalSheet = ss.getSheetByName('JADWAL_KHUSUS');
  const jadwalData = jadwalSheet ? jadwalSheet.getDataRange().getValues() : [];
  const jadwalKhusus = [];
  for (let i = 1; i < jadwalData.length; i++) {
    if (jadwalData[i][0] && jadwalData[i][1]) {
      jadwalKhusus.push({
        dari: new Date(jadwalData[i][0]),
        sampai: new Date(jadwalData[i][1]),
        jamMasuk: String(jadwalData[i][2]||'08:00').trim(),
        jamPulang: String(jadwalData[i][3]||'18:00').trim()
      });
    }
  }

  function getJadwalHari(tgl) {
    for (let j = 0; j < jadwalKhusus.length; j++) {
      const dari = new Date(jadwalKhusus[j].dari); dari.setHours(0,0,0,0);
      const sampai = new Date(jadwalKhusus[j].sampai); sampai.setHours(23,59,59,0);
      const cek = new Date(tgl); cek.setHours(12,0,0,0);
      if (cek >= dari && cek <= sampai) return jadwalKhusus[j];
    }
    return { jamMasuk: '08:00', jamPulang: '18:00' };
  }

  let year = new Date().getFullYear(), month = new Date().getMonth()+1;
  let startDay = 1;
  // endDay = tanggal upload - 1 (hari ini belum ada tap pulang, skip)
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  let endDay = yesterday.getDate();

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const joined = data[i].join('|');
    // Tangkap range: 2026-04-01~2026-04-11
    const mRange = joined.match(/(\d{4})-(\d{2})-(\d{2})~\d{4}-\d{2}-(\d{2})/);
    if (mRange) {
      year = parseInt(mRange[1]);
      month = parseInt(mRange[2]);
      startDay = parseInt(mRange[3]);
      const fileEndDay = parseInt(mRange[4]);

      // endDay = min(file_endDay, yesterday) — tapi hanya kalau yesterday masih bulan yang sama
      // Kalau upload tgl 1 bulan baru, yesterday = akhir bulan lalu → cukup pakai fileEndDay
      const yesterdaySameMonth = (yesterday.getMonth()+1 === month && yesterday.getFullYear() === year);
      endDay = yesterdaySameMonth ? Math.min(fileEndDay, yesterday.getDate()) : fileEndDay;

      // Kalau upload tgl 1 bulan yang sama dengan file → tidak ada yang bisa diproses
      if (today.getDate() === 1 && (today.getMonth()+1) === month && today.getFullYear() === year) {
        Logger.log('Upload hari pertama bulan ini — tidak ada data yang bisa diproses');
        return { success: false, msg: 'Upload terlalu awal. Tidak ada hari kemarin di bulan ini yang bisa diproses.' };
      }

      Logger.log('File range: '+year+'-'+month+' hari '+startDay+'~'+fileEndDay+' → proses s/d hari '+endDay);
      break;
    }
    // Fallback: hanya satu tanggal di file
    const mSingle = joined.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (mSingle) {
      year = parseInt(mSingle[1]);
      month = parseInt(mSingle[2]);
      // endDay tetap = yesterday.getDate() — tapi perlu cek bulan
      const yesterdaySameMonth = (yesterday.getMonth()+1 === month && yesterday.getFullYear() === year);
      if (!yesterdaySameMonth) endDay = new Date(year, month, 0).getDate(); // last day of file month
    }
  }

  const employees = [];
  for (let i = 0; i < data.length-2; i++) {
    const row = data[i];
    let empName = null;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).trim();
      const inlineName = cell.match(/^Nama\s*[:：]\s*(.+)$/i);
      if (inlineName && inlineName[1]) { empName = String(inlineName[1]).toLowerCase().trim(); break; }
      if (/^Nama\s*[:：]?$/.test(cell) || cell === 'Namaï¼š' || cell === 'Nama:') {
        for (let k = j + 1; k < row.length; k++) {
          const nextCell = String(row[k]).trim();
          if (nextCell) { empName = nextCell.toLowerCase().trim(); break; }
        }
        if (empName) break;
      }
    }
    if (empName) {
      // Cari offset kolom — temukan di mana angka 1 ada di baris day numbers
      var dayNumberRow = data[i+1] || [];
      var dayOffset = 0; // default: kolom A = hari ke-1
      for (var col = 0; col < dayNumberRow.length; col++) {
        var val = dayNumberRow[col];
        if (val === 1 || val === '1' || parseInt(val) === 1) { dayOffset = col; break; }
      }
      employees.push({ name: empName, attRow: data[i+2], dayOffset: dayOffset });
    }
  }
  if (employees.length === 0) return { success: false, msg: 'Tidak ada data karyawan.' };

  const rawSheet = ss.getSheetByName('ABSENSI_RAW');
  const rekapSheet = ss.getSheetByName('ABSENSI_REKAP');
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const uploadDate = new Date();
  const weeklyData = {};
  let processedCount = 0;

  // ── CLEANUP: hapus semua data bulan ini sebelum proses ulang ──
  const bulanKey = String(year) + '-' + String(month).padStart(2,'0');

  // Hapus ABSENSI_RAW bulan ini
  if (rawSheet && rawSheet.getLastRow() > 1) {
    const rawRows = rawSheet.getDataRange().getValues();
    for (let i = rawRows.length - 1; i >= 1; i--) {
      let tglRaw = null;
      try { tglRaw = new Date(rawRows[i][2]); } catch(e) {}
      if (tglRaw && !isNaN(tglRaw)) {
        const bk = tglRaw.getFullYear() + '-' + String(tglRaw.getMonth()+1).padStart(2,'0');
        if (bk === bulanKey) rawSheet.deleteRow(i+1);
      }
    }
  }

  // Hapus ABSENSI_DETAIL bulan ini (semua tipe termasuk DENDA_SP)
  if (detailSheet && detailSheet.getLastRow() > 1) {
    const detRows = detailSheet.getDataRange().getValues();
    for (let i = detRows.length - 1; i >= 1; i--) {
      let tglDet = null;
      try { tglDet = new Date(detRows[i][3]); } catch(e) {}
      if (tglDet && !isNaN(tglDet)) {
        const bk = tglDet.getFullYear() + '-' + String(tglDet.getMonth()+1).padStart(2,'0');
        if (bk === bulanKey) detailSheet.deleteRow(i+1);
      }
    }
  }

  // Hapus ABSENSI_REKAP minggu-minggu yang masuk bulan ini
  if (rekapSheet && rekapSheet.getLastRow() > 1) {
    const rekapRows = rekapSheet.getDataRange().getValues();
    for (let i = rekapRows.length - 1; i >= 1; i--) {
      const monday = getMondayOfWeek(rekapRows[i][2]);
      if (monday) {
        const bk = monday.getFullYear() + '-' + String(monday.getMonth()+1).padStart(2,'0');
        if (bk === bulanKey) rekapSheet.deleteRow(i+1);
      }
    }
  }

  Logger.log('Cleanup selesai untuk bulan: ' + bulanKey);
  // ── END CLEANUP ──

  const rekapData = rekapSheet.getDataRange().getValues();

  // Hitung hari kerja efektif bulan ini (untuk gaji harian)
  const hariLiburNasional = new Set();
  for (let i = 1; i < kalData.length; i++) {
    if (kalData[i][1]) {
      const tgl = new Date(kalData[i][1]);
      if (tgl.getFullYear() === year && tgl.getMonth()+1 === month) {
        hariLiburNasional.add(tgl.getDate());
      }
    }
  }
  let totalHariBulan = new Date(year, month, 0).getDate();
  let jumlahMinggu = 0;
  for (let d = 1; d <= totalHariBulan; d++) {
    if (new Date(year, month-1, d).getDay() === 0) jumlahMinggu++;
  }
  const hariKerjaEfektif = totalHariBulan - jumlahMinggu - hariLiburNasional.size;
  Logger.log('Hari kerja efektif: '+hariKerjaEfektif);

  employees.forEach(function(emp) {
    const user = userMap[emp.name];
    if (!user) return;
    const isLive = user.bagian === 'Live';
    for (let day = startDay; day <= endDay; day++) {
      const dateObj = new Date(year, month-1, day);
      if (dateObj.getMonth() !== month-1) continue;
      const dateStr = fmtDate(dateObj);
      const dow = dateObj.getDay();
      const isSunday = dow === 0;
      const isHoliday = holidaySet.has(dateStr);
      const cellVal = String(emp.attRow[emp.dayOffset + (day-1)]||'').trim();
      const hasData = cellVal !== '' && cellVal !== 'undefined' && cellVal !== 'null' && cellVal !== 'NaN';
      let checkIn = null, checkOut = null;
      if (hasData) {
        const times = cellVal.split('\n').map(function(t){ return t.trim(); }).filter(function(t){ return /^\d{2}:\d{2}/.test(t); });
        if (times.length >= 1) checkIn = times[0];
        if (times.length >= 2) checkOut = times[times.length-1];
      }
      const weekStr = getWeekString(dateObj);
      if (!weeklyData[user.id]) weeklyData[user.id] = {};
      if (!weeklyData[user.id]) weeklyData[user.id] = { gajiBulanan: user.gajiBulanan, hariKerja: hariKerjaEfektif };
      if (!weeklyData[user.id][weekStr]) weeklyData[user.id][weekStr] = {
        userId: user.id, hadir:0, telat:0, absen:0,
        lemburMinggu:0, lemburLibur:0, lemburPulang:0,
        totalDenda:0, telatMenit:[], totalRewardLembur:0,
        detailTelat:[], detailAbsen:[], detailLemburPulang:[], detailLemburMinggu:[], detailLemburLibur:[],
        detailHadir:[] // tracking hadir per tanggal aktual — untuk rekap bulanan
      };
      const wd = weeklyData[user.id][weekStr];
      const gajiBulanan = user.gajiBulanan || 0;
      const gajiHarian = hariKerjaEfektif > 0 ? Math.round(gajiBulanan / hariKerjaEfektif) : 0;

      if (hasData && checkIn) rawSheet.appendRow(['RAW-'+Utilities.getUuid().substring(0,8), emp.name, dateObj, checkIn, checkOut||'', weekStr, uploadDate]);

      if (isSunday) {
        if (hasData && checkIn) {
          wd.lemburMinggu++;
          wd.totalRewardLembur = (wd.totalRewardLembur||0) + gajiHarian;
          wd.detailLemburMinggu.push({ tanggal: dateStr, gajiHarian });
        }
      } else if (isHoliday) {
        if (hasData && checkIn) {
          wd.lemburLibur++;
          wd.totalRewardLembur = (wd.totalRewardLembur||0) + gajiHarian;
          wd.detailLemburLibur.push({ tanggal: dateStr, gajiHarian });
        }
      } else {
        if (!hasData || !checkIn) {
          wd.absen++;
          wd.detailAbsen.push({ tanggal: dateStr });
        } else {
          const p = checkIn.split(':');
          const menitMasuk = parseInt(p[0])*60+parseInt(p[1]);
          const jadwal = getJadwalHari(dateObj);
          const jm = jadwal.jamMasuk.split(':');
          const jp = jadwal.jamPulang.split(':');
          const menitWajib = parseInt(jm[0])*60+parseInt(jm[1]);
          const menitPulangNormal = parseInt(jp[0])*60+parseInt(jp[1]);

          if (menitMasuk > 12*60) {
            if (!wd.anomali) wd.anomali = [];
            wd.anomali.push({ tanggal: dateStr, jam: checkIn, tipe: !checkOut ? 'HANYA_1_TAP_SORE' : 'TAP_MASUK_SORE' });
            wd.hadir++;
            wd.detailHadir.push({ tanggal: dateStr });
          } else {
            wd.hadir++;
            wd.detailHadir.push({ tanggal: dateStr });
            if (menitMasuk > menitWajib) {
              wd.telat++;
              const menitTelat = menitMasuk - menitWajib;
              const denda = Math.ceil(menitTelat / 10) * 10000;
              wd.totalDenda += denda;
              wd.telatMenit.push(menitTelat);
              wd.detailTelat.push({ tanggal: dateStr, jamMasuk: checkIn, menitTelat, denda });
            }
            if (!checkOut) {
              if (!wd.anomali) wd.anomali = [];
              wd.anomali.push({ tanggal: dateStr, jam: checkIn, tipe: 'LUPA_TAP_PULANG' });
            }
          }

          // Lembur pulang — min 1 jam setelah jam normal
          if (checkOut) {
            const po = checkOut.split(':');
            const menitPulang = parseInt(po[0])*60 + parseInt(po[1]);
            const selisih = menitPulang - menitPulangNormal;
            if (selisih >= 60) { // minimal 1 jam
              const lemburMenit = Math.floor(selisih / 30) * 30; // bulatkan per 30 menit ke bawah
              const lemburJam = lemburMenit / 60;
              wd.lemburPulang += lemburJam;
              const rewardPulang = Math.floor(lemburJam * 2) * 10000; // per 30 menit = Rp 10.000
              wd.totalRewardLembur = (wd.totalRewardLembur||0) + rewardPulang;
              wd.detailLemburPulang.push({ tanggal: dateStr, jamPulang: checkOut, lemburJam, reward: rewardPulang });
            }
          }
        }
      }
    }
    processedCount++;
  });

  const telatBulanIni = {};
  const absenBulanIni = {};
  const bulanProses = String(year) + '-' + String(month).padStart(2,'0');
  const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const hariNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  Object.keys(weeklyData).forEach(function(userId) {
    const userWeeks = weeklyData[userId];
    Object.keys(userWeeks).forEach(function(weekStr) {
      if (weekStr === 'gajiBulanan' || weekStr === 'hariKerja') return;
      const d = userWeeks[weekStr];
      if (!d || !d.userId) return;

      const masalah = d.absen + d.telat;
      let status = 'BAIK';
      if (masalah >= 5) status = 'MERAH';
      else if (masalah >= 3) status = 'ORANGE';
      else if (masalah >= 1) status = 'KUNING';

      if (!telatBulanIni[userId]) telatBulanIni[userId] = 0;
      telatBulanIni[userId] += (d.telat || 0);
      if (!absenBulanIni[userId]) absenBulanIni[userId] = 0;
      absenBulanIni[userId] += (d.absen || 0);

      // Simpan detail ke ABSENSI_DETAIL
      if (detailSheet) {
        // HADIR — tanggal aktual untuk rekap bulanan yang akurat (tidak terpengaruh lintas bulan)
        (d.detailHadir||[]).forEach(function(dh) {
          const tgl = new Date(dh.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' ('+hariNames[tgl.getDay()]+')'; 
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, dh.tanggal, 'HADIR', 'Hadir - '+tglLabel, 0]);
        });
        (d.detailTelat||[]).forEach(function(dt) {
          const tgl = new Date(dt.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' ('+hariNames[tgl.getDay()]+')';
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, dt.tanggal, 'TELAT', 'Masuk '+dt.jamMasuk+', telat '+dt.menitTelat+' menit - '+tglLabel, dt.denda]);
        });
        (d.detailAbsen||[]).forEach(function(da) {
          const tgl = new Date(da.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' ('+hariNames[tgl.getDay()]+')';
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, da.tanggal, 'ABSEN', (da.keterangan||'Tidak masuk')+' - '+tglLabel, 0]);
        });
        (d.detailLemburPulang||[]).forEach(function(dl) {
          const tgl = new Date(dl.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' ('+hariNames[tgl.getDay()]+')';
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, dl.tanggal, 'LEMBUR_PULANG', 'Pulang '+dl.jamPulang+', lembur '+dl.lemburJam+' jam - '+tglLabel, dl.reward]);
        });
        (d.detailLemburMinggu||[]).forEach(function(dl) {
          const tgl = new Date(dl.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' (Minggu)';
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, dl.tanggal, 'LEMBUR_MINGGU', 'Masuk hari Minggu - '+tglLabel, dl.gajiHarian]);
        });
        (d.detailLemburLibur||[]).forEach(function(dl) {
          const tgl = new Date(dl.tanggal); tgl.setHours(12,0,0,0);
          const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()]+' (Libur)';
          detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, dl.tanggal, 'LEMBUR_LIBUR', 'Masuk hari libur - '+tglLabel, dl.gajiHarian]);
        });
      }

      let found = false;
      for (let i = 1; i < rekapData.length; i++) {
        if (String(rekapData[i][1]) === String(userId) && rekapData[i][2] === weekStr) {
          rekapSheet.getRange(i+1,4,1,7).setValues([[d.hadir, d.telat, d.absen, d.lemburMinggu, d.lemburLibur, status, d.totalDenda||0]]);
          found = true; break;
        }
      }
      if (!found) rekapSheet.appendRow(['RKP-'+Utilities.getUuid().substring(0,8), userId, weekStr, d.hadir, d.telat, d.absen, d.lemburMinggu, d.lemburLibur, status, d.totalDenda||0]);

      if (d.telat > 0) {
        try { notifTelatKaryawan(userId, weekStr, d.telat, d.totalDenda||0, ss); } catch(e) { Logger.log(e); }
      }
    });
  });

  // Kumpulkan semua anomali tap untuk dikirim ke Finance dalam 1 email
  // Simpan anomali ke tab ANOMALI dan notif
  const semuaAnomali = [];
  const anomaliSheet = ss.getSheetByName('ANOMALI');
  const tglDeadline = new Date(uploadDate); tglDeadline.setDate(tglDeadline.getDate() + 3);
  const usersDataForAnomali = ss.getSheetByName('USERS').getDataRange().getValues();
  const userIdMap = {}; // nama → {id, email, nama}
  for (let i = 1; i < usersDataForAnomali.length; i++) {
    userIdMap[String(usersDataForAnomali[i][0])] = { id: usersDataForAnomali[i][0], email: usersDataForAnomali[i][5], nama: usersDataForAnomali[i][1] };
  }

  Object.keys(weeklyData).forEach(function(uid) {
    Object.keys(weeklyData[uid]).forEach(function(wk) {
      if (wk === 'gajiBulanan' || wk === 'hariKerja') return;
      const d = weeklyData[uid][wk];
      if (!d || !d.anomali || !d.anomali.length) return;
      const u = userIdMap[uid] || { nama: uid, email: '' };
      d.anomali.forEach(function(a) {
        semuaAnomali.push({ userId: uid, nama: u.nama, tanggal: a.tanggal, jam: a.jam, tipe: a.tipe });
        // Simpan ke ANOMALI sheet
        if (anomaliSheet) {
          const anomId = 'ANM-'+Utilities.getUuid().substring(0,8);
          anomaliSheet.appendRow([anomId, uid, a.tanggal, a.jam, a.tipe, 'MENUNGGU', uploadDate, tglDeadline]);
        }
        // Notif karyawan di app
        const tipeLabel = { HANYA_1_TAP_SORE: 'Hanya 1 tap jam '+a.jam+' (sore/malam)', LUPA_TAP_PULANG: 'Tap masuk jam '+a.jam+' tapi tidak ada tap pulang', TAP_MASUK_SORE: 'Tap masuk jam '+a.jam+' (terlalu sore)' };
        const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const tgl = new Date(a.tanggal); tgl.setHours(12,0,0,0);
        const tglLabel = tgl.getDate()+' '+mNames[tgl.getMonth()];
        addNotifikasi(uid, '⚠️ Tap Fingerprint Tidak Wajar', 'Tanggal '+tglLabel+': '+(tipeLabel[a.tipe]||a.tipe)+'. Segera menghadap Finance sebelum '+Utilities.formatDate(tglDeadline,'Asia/Jakarta','dd MMM yyyy')+' atau dikenakan denda!', 'PERINGATAN');
        // Email ke karyawan
        if (u.email) {
          try {
            MailApp.sendEmail({ to: String(u.email).trim(), subject: '⚠️ Tap Fingerprint Perlu Konfirmasi — Hosela Hub',
              htmlBody: '<div style="font-family:sans-serif;max-width:480px"><div style="background:#f59e0b;padding:16px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">⚠️ Tap Fingerprint Tidak Wajar</h2></div>'+
              '<div style="background:#fffbeb;padding:16px;border-radius:0 0 8px 8px;border:1px solid #fde68a">'+
              '<p>Halo <b>'+u.nama+'</b>,</p>'+
              '<p>Ditemukan tap fingerprint tidak wajar pada <b>'+tglLabel+'</b>: <b>'+(tipeLabel[a.tipe]||a.tipe)+'</b>.</p>'+
              '<p style="color:#92400e;font-weight:600">Segera menghadap Finance untuk konfirmasi sebelum <b>'+Utilities.formatDate(tglDeadline,'Asia/Jakarta','dd MMM yyyy')+'</b>.</p>'+
              '<p>Jika tidak dikonfirmasi, akan dikenakan denda otomatis.</p>'+
              '</div></div>'
            });
          } catch(e) { Logger.log(e); }
        }
      });
    });
  });

  // Kumpulkan semua SP yang akan diterbitkan
  const semuaSP = [];

  // Cek SP1 per minggu
  Object.keys(weeklyData).forEach(function(userId) {
    Object.keys(weeklyData[userId]).forEach(function(weekStr) {
      const d = weeklyData[userId][weekStr];
      if (d.telat >= 3 || d.absen >= 2) {
        const alasan = d.telat >= 3 ? 'Telat '+d.telat+'x dalam minggu '+weekStr : 'Absen '+d.absen+'x dalam minggu '+weekStr;
        try { catatSP(userId, bulanProses, 'SP1', alasan, ss); } catch(e) { Logger.log(e); }
        semuaSP.push({ userId, tipe: 'SP1', alasan, denda: 0 });
      }
    });
  });

  // Cek SP2 dan SP3
  Object.keys(telatBulanIni).forEach(function(userId) {
    const totalTelat = telatBulanIni[userId] || 0;
    const totalAbsen = absenBulanIni[userId] || 0;
    let sp2Triggered = false;

    if (totalTelat >= 5) {
      sp2Triggered = true;
      const alasan = 'Telat '+totalTelat+'x dalam bulan '+bulanProses+'. Denda Rp 50.000 dikenakan.';
      try { catatSP(userId, bulanProses, 'SP2', alasan, ss); } catch(e) { Logger.log(e); }
      semuaSP.push({ userId, tipe: 'SP2', alasan, denda: 50000 });
      // Bintang dikelola oleh hitungBintang — tidak di-override di sini
    }
    if (totalAbsen >= 3) {
      const alasanAbsen = 'Absen '+totalAbsen+'x dalam bulan '+bulanProses+'. Denda Rp 50.000 dikenakan.';
      if (!sp2Triggered) { try { catatSP(userId, bulanProses, 'SP2', alasanAbsen, ss); } catch(e) { Logger.log(e); } semuaSP.push({ userId, tipe: 'SP2', alasan: alasanAbsen, denda: 50000 }); }
      try { tambahDendaAbsen(userId, bulanProses, 50000, ss); } catch(e) { Logger.log(e); }
    }

    let sp3Alasan = '';
    if (totalAbsen >= 5) sp3Alasan = 'Absen '+totalAbsen+'x dalam bulan '+bulanProses;
    else if (sp2Triggered && cekSP3BulanSebelumnya(userId, bulanProses, ss)) sp3Alasan = 'SP2 bulan lalu + telat '+totalTelat+'x bulan ini';
    if (sp3Alasan) {
      try { catatSP(userId, bulanProses, 'SP3', sp3Alasan, ss); } catch(e) { Logger.log(e); }
      semuaSP.push({ userId, tipe: 'SP3', alasan: sp3Alasan, denda: 100000 });
      // Bintang dikelola oleh hitungBintang — tidak di-override di sini
    }
  });

  // Kirim 1 email SP bundled ke Owner
  if (semuaSP.length > 0) {
    try { kirimEmailSPBundled(semuaSP, ss); } catch(e) { Logger.log(e); }
    // Simpan denda SP ke ABSENSI_DETAIL supaya muncul di rekap karyawan
    const detailSheetSP = ss.getSheetByName('ABSENSI_DETAIL');
    semuaSP.forEach(function(sp) {
      if (sp.denda > 0 && detailSheetSP) {
        try {
          // Pakai minggu terakhir bulan proses sebagai referensi
          const tglAkhir = new Date(parseInt(bulanProses.split('-')[0]), parseInt(bulanProses.split('-')[1]), 0);
          const weekStr = getWeekString(tglAkhir);
          detailSheetSP.appendRow([
            'DET-'+Utilities.getUuid().substring(0,8),
            sp.userId, weekStr, tglAkhir,
            'DENDA_SP', sp.tipe+': '+sp.alasan, sp.denda
          ]);
        } catch(e) { Logger.log(e); }
      }
      try { notifSP(sp.userId, sp.tipe, sp.alasan, sp.denda, ss); } catch(e) { Logger.log(e); }
    });
  }

  // Kirim 1 email anomali tap ke Finance
  if (semuaAnomali.length > 0) {
    try { kirimEmailAnomali(semuaAnomali, ss); } catch(e) { Logger.log(e); }
  }

  uploadSheet.clearContents();
  try { notifOwnerAbsensiMerah(); } catch(e) { Logger.log(e); }

  // Update bintang semua karyawan yang diproses
  Object.keys(weeklyData).forEach(function(uid) {
    try { hitungBintang(uid); } catch(e) { Logger.log('hitungBintang error uid='+uid+': '+e); }
  });

  // Invalidate cache setelah proses absensi
  try {
    const cache = CacheService.getScriptCache();
    const keys = Object.keys(weeklyData).map(function(uid){ return 'rekap_'+uid; });
    keys.push('ranking', 'all_absensi_rekap', 'rekap_bulanan_semua_' + year + '-' + String(month).padStart(2,'0'));
    Object.keys(weeklyData).forEach(function(uid){ keys.push('dashboard_'+uid); });
    cache.removeAll(keys);
  } catch(e) { Logger.log(e); }

  const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][month-1];
  return { success: true, msg: 'Berhasil memproses '+processedCount+' karyawan · '+bln+' '+year };
}

function normalizeUploadText_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/[：﹕꞉]/g, ':')
    .replace(/\s+/g, ' ')
    .trim();
}

function findEmployeeNameInUploadRow_(row, userMap) {
  const names = Object.keys(userMap || {});
  for (let j = 0; j < row.length; j++) {
    const cell = normalizeUploadText_(row[j]);
    if (!cell) continue;
    const inlineName = cell.match(/^nama\s*:?\s*(.+)$/i);
    if (inlineName && inlineName[1]) {
      const candidate = normalizeUploadText_(inlineName[1]);
      if (userMap[candidate]) return candidate;
    }
    if (/^nama\s*:?\s*$/.test(cell)) {
      for (let k = j + 1; k < row.length; k++) {
        const nextCell = normalizeUploadText_(row[k]);
        if (nextCell && userMap[nextCell]) return nextCell;
        if (nextCell) break;
      }
    }
    if (userMap[cell]) return cell;
  }
  const joined = normalizeUploadText_(row.join(' | '));
  for (let n = 0; n < names.length; n++) {
    const name = names[n];
    if (!name) continue;
    if (joined.indexOf('nama : ' + name) !== -1 || joined.indexOf('nama: ' + name) !== -1 || joined.indexOf('| ' + name + ' |') !== -1) return name;
  }
  return '';
}

function extractUploadTimes_(value) {
  if (!value && value !== 0) return [];
  if (value instanceof Date && !isNaN(value)) {
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    if (hh === '00' && mm === '00') return [];
    return [hh + ':' + mm];
  }
  if (typeof value === 'number') {
    const fraction = value - Math.floor(value);
    if (fraction <= 0) return [];
    const totalMinutes = Math.round(fraction * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return [hh + ':' + mm];
  }
  const text = String(value || '').trim();
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return [];
  const matches = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || [];
  return matches.map(function(t){ return extractAttendanceTime_(t).substring(0, 5); }).filter(function(t){ return /^\d{1,2}:\d{2}$/.test(t); });
}

function isPastDateKey_(dateKey) {
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(dateKey || '') < todayKey;
}

function importAbsensiUploadToApp(bulanKey, actor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uploadSheet = ss.getSheetByName('ABSENSI_UPLOAD');
  if (!uploadSheet) return { success: false, msg: 'Sheet ABSENSI_UPLOAD tidak ditemukan.' };
  const data = uploadSheet.getDataRange().getValues();
  if (data.length < 5) return { success: false, msg: 'Sheet ABSENSI_UPLOAD masih kosong.' };

  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    const bagian = usersData[i][3];
    if (bagian === 'Owner' || bagian === 'Finance') continue;
    userMap[normalizeUploadText_(usersData[i][1])] = {
      id: String(usersData[i][0]),
      nama: usersData[i][1],
      bagian: bagian,
      jabatan: usersData[i][4]
    };
  }

  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let startDay = 1;
  let endDay = new Date(year, month, 0).getDate();
  for (let i = 0; i < Math.min(12, data.length); i++) {
    const joined = data[i].join('|');
    const mRange = joined.match(/(\d{4})-(\d{2})-(\d{2})~\d{4}-\d{2}-(\d{2})/);
    if (mRange) {
      year = parseInt(mRange[1], 10);
      month = parseInt(mRange[2], 10);
      startDay = parseInt(mRange[3], 10);
      endDay = parseInt(mRange[4], 10);
      break;
    }
    const mSingle = joined.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (mSingle) {
      year = parseInt(mSingle[1], 10);
      month = parseInt(mSingle[2], 10);
      startDay = parseInt(mSingle[3], 10);
      endDay = new Date(year, month, 0).getDate();
    }
  }

  const detectedBulan = String(year) + '-' + String(month).padStart(2, '0');
  bulanKey = String(bulanKey || detectedBulan);
  if (bulanKey !== detectedBulan) {
    return { success: false, msg: 'Data upload terdeteksi bulan ' + detectedBulan + ', bukan ' + bulanKey + '.' };
  }

  const employees = [];
  for (let i = 0; i < data.length - 2; i++) {
    const row = data[i];
    let empName = null;
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).trim();
      const inlineName = cell.match(/^Nama\s*[:：]\s*(.+)$/i);
      if (inlineName && inlineName[1]) { empName = String(inlineName[1]).toLowerCase().trim(); break; }
      if (/^Nama\s*[:：]?$/.test(cell) || cell === 'Namaï¼š' || cell === 'Nama:') {
        for (let k = j + 1; k < row.length; k++) {
          const nextCell = String(row[k]).trim();
          if (nextCell) { empName = nextCell.toLowerCase().trim(); break; }
        }
        if (empName) break;
      }
    }
    if (!empName) empName = findEmployeeNameInUploadRow_(row, userMap);
    if (empName) {
      const dayNumberRow = data[i + 1] || [];
      let dayOffset = 0;
      for (let col = 0; col < dayNumberRow.length; col++) {
        const val = dayNumberRow[col];
        if (val === 1 || val === '1' || parseInt(val, 10) === 1) { dayOffset = col; break; }
      }
      employees.push({ name: empName, attRow: data[i + 2], dayOffset: dayOffset });
    }
  }
  if (employees.length === 0) return { success: false, msg: 'Tidak ada data karyawan di ABSENSI_UPLOAD.' };

  const appSheet = ensureAbsensiAppSheet_();
  const appData = appSheet.getDataRange().getValues();
  const acceptedKeys = {};
  for (let i = 1; i < appData.length; i++) {
    if (String(appData[i][10]).toUpperCase() !== 'DITERIMA') continue;
    const uid = String(appData[i][1]);
    const tgl = extractDateStr(appData[i][3]);
    const tipe = String(appData[i][5] || '').toUpperCase();
    if (uid && tgl && tipe) acceptedKeys[uid + '|' + tgl + '|' + tipe] = true;
  }

  const rows = [];
  let imported = 0, skipped = 0, unknown = 0, corrected = 0;
  const now = new Date();
  employees.forEach(function(emp) {
    const user = userMap[emp.name];
    if (!user) { unknown++; return; }
    for (let day = startDay; day <= endDay; day++) {
      const dateObj = new Date(year, month - 1, day);
      if (dateObj.getMonth() !== month - 1) continue;
      const tanggal = fmtDate(dateObj);
      const rawCellVal = emp.attRow[emp.dayOffset + (day - 1)];
      const times = extractUploadTimes_(rawCellVal);
      if (times.length < 1) continue;
      let masuk = extractAttendanceTime_(times[0]);
      let pulang = times.length >= 2 ? extractAttendanceTime_(times[times.length - 1]) : '';
      if (times.length === 1) {
        const onlyMinutes = timeToMinutes_(masuk);
        const shouldFlagAnomaly = isPastDateKey_(tanggal);
        if (onlyMinutes >= 12 * 60) {
          pulang = masuk;
          masuk = '';
          if (shouldFlagAnomaly) {
            corrected += rejectImportedMasukForSingleEvening_(appSheet, user.id, tanggal, pulang, actor || 'System');
            upsertAnomaliTap_(user.id, tanggal, pulang, 'HANYA_1_TAP_SORE', actor || 'System');
          }
        } else if (shouldFlagAnomaly) {
          upsertAnomaliTap_(user.id, tanggal, masuk, 'LUPA_TAP_PULANG', actor || 'System');
        }
      }
      [['MASUK', masuk], ['PULANG', pulang]].forEach(function(pair) {
        const tipe = pair[0], jam = pair[1];
        if (!jam) return;
        const key = user.id + '|' + tanggal + '|' + tipe;
        if (acceptedKeys[key]) { skipped++; return; }
        acceptedKeys[key] = true;
        rows.push([
          'APP-IMPORT-' + Utilities.getUuid().substring(0, 8),
          user.id,
          user.nama,
          tanggal,
          jam,
          tipe,
          '',
          '',
          '',
          '',
          'DITERIMA',
          '',
          '[FINGERPRINT_IMPORT] Import fingerprint oleh ' + (actor || 'System'),
          now
        ]);
        imported++;
      });
    }
  });

  if (rows.length) appSheet.getRange(appSheet.getLastRow() + 1, 1, rows.length, 14).setValues(rows);
  try {
    const cache = CacheService.getScriptCache();
    const keys = Object.keys(userMap).map(function(name){ return 'dashboard_' + userMap[name].id; });
    keys.push.apply(keys, Object.keys(userMap).map(function(name){ return 'rekap_' + userMap[name].id; }));
    cache.removeAll(keys);
  } catch(e) {}
  clearAbsensiMatrixCache_(bulanKey, Object.keys(userMap).map(function(name){ return userMap[name].id; }));
  appendAuditLog_(actor || 'System', 'IMPORT_ABSENSI_UPLOAD_TO_APP', bulanKey, '', 'imported=' + imported + '; skipped=' + skipped + '; corrected=' + corrected, 'Sumber ABSENSI_UPLOAD ke ABSENSI_APP');
  let syncResult = null;
  try {
    syncResult = processAbsensiAppToRekap(bulanKey, actor || 'System');
  } catch(e) {
    syncResult = { success: false, msg: String(e) };
  }
  const syncMsg = syncResult && syncResult.success
    ? ' Rekap bulanan ikut diperbarui.'
    : ' Import masuk, tapi rekap belum terproses: ' + ((syncResult && syncResult.msg) || 'error tidak diketahui');
  return {
    success: !!(syncResult && syncResult.success),
    bulan: bulanKey,
    importedRows: imported,
    skippedRows: skipped,
    unknownEmployees: unknown,
    sync: syncResult,
    msg: 'Import selesai: ' + imported + ' tap masuk/pulang ditambahkan, ' + skipped + ' duplikat dilewati, ' + corrected + ' tap sore lama dikoreksi.' + syncMsg
  };
}

function notifTelatKaryawan(userId, weekStr, jumlahTelat, totalDenda, ss) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let email = '', nama = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) { email = usersData[i][5]; nama = usersData[i][1]; break; }
  }
  if (!email) return;

  const pesan = jumlahTelat >= 3
    ? '⚠️ Kamu telat <b>'+jumlahTelat+'x</b> minggu ini. Ini peringatan serius!'
    : '📌 Kamu telat <b>'+jumlahTelat+'x</b> minggu ini. Yuk lebih disiplin!';
  const dendaStr = totalDenda > 0 ? '<p style="color:#dc2626;font-weight:600">💸 Estimasi denda: Rp '+totalDenda.toLocaleString('id-ID')+'</p>' : '';

  // Notif di app
  const judulApp = jumlahTelat >= 3 ? '⚠️ Peringatan: Telat '+jumlahTelat+'x minggu ini' : '📌 Info Kehadiran Minggu Ini';
  const isiApp = 'Kamu tercatat telat '+jumlahTelat+'x minggu ini.'+(totalDenda>0?' Estimasi denda: Rp '+totalDenda.toLocaleString('id-ID')+'.':'');
  addNotifikasi(userId, judulApp, isiApp, jumlahTelat >= 3 ? 'PERINGATAN' : 'INFO', 's-notifikasi');

  const body = '<div style="font-family:sans-serif;max-width:480px">'+
    '<div style="background:#0e4fa3;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">📋 Info Kehadiran Minggu Ini</h2></div>'+
    '<div style="background:#f7f9fc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">'+
    '<p>Halo <b>'+nama+'</b>,</p><p>'+pesan+'</p>'+dendaStr+
    '<p style="font-size:12px;color:#6b7280">Cek detail di Hosela Hub → Jobdesk → Rekap Kehadiran</p>'+
    '</div></div>';
  MailApp.sendEmail({ to: String(email).trim(), subject: '📋 Info Kehadiran Minggu Ini — Hosela Hub', htmlBody: body });
}

function notifOwner5xTelat(userId, totalTelat, bulan, ss) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let namaKaryawan = '';
  let ownerEmail = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) namaKaryawan = usersData[i][1];
    if (usersData[i][3] === 'Owner' && usersData[i][6] === 'AKTIF' && usersData[i][5]) ownerEmail = String(usersData[i][5]).trim();
  }
  if (!ownerEmail) return;

  const body = '<div style="font-family:sans-serif;max-width:480px">'+
    '<div style="background:#dc2626;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">🚨 Peringatan Telat Berulang</h2></div>'+
    '<div style="background:#fff7f7;padding:20px;border-radius:0 0 8px 8px;border:1px solid #fecaca">'+
    '<p><b>'+namaKaryawan+'</b> telah telat sebanyak <b>'+totalTelat+'x</b> dalam bulan <b>'+bulan+'</b>.</p>'+
    '<p style="color:#dc2626;font-weight:600">Bintang karyawan ini dikunci maksimal ⭐⭐ untuk bulan ini.</p>'+
    '<p>Silakan lakukan evaluasi dan tindak lanjut sesuai kebijakan perusahaan.</p>'+
    '</div></div>';

  MailApp.sendEmail({ to: ownerEmail, subject: '🚨 HOSELA HUB — '+namaKaryawan+' Telat '+totalTelat+'x Bulan Ini', htmlBody: body });
}

function getAbsensiRekap(userId) {
  const cacheKey = 'rekap_' + userId;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try { repairManualAttendanceSync_(ss, '', userId); } catch(e) { Logger.log('repairManualAttendanceSync_ user error: ' + e); }
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  const data = ss.getSheetByName('ABSENSI_REKAP').getDataRange().getValues();

  // Ambil detail per hari dari ABSENSI_DETAIL — filter berdasarkan tanggal aktual
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const detailMap = {};
  const detailByBulan = {};
  if (detailSheet) {
    const detailData = detailSheet.getDataRange().getValues();
    for (let i = 1; i < detailData.length; i++) {
      const r = detailData[i];
      if (String(r[1]) !== String(userId)) continue;
      const wk = r[2];
      const tipe = r[4];

      // ── SINGLE SOURCE OF TRUTH: extract month as string only ──
      // Rule: bk = first 7 chars of date string "YYYY-MM"
      // No Date(), no timezone, no Utilities.formatDate
      const bk = extractMonthKey(r[3]); // "2026-03-15" → "2026-03"
      const tglStr = extractDateStr(r[3]); // "2026-03-15" or ""

      const item = { keterangan: r[5], nilai: r[6]||0, tanggal: tglStr, jam: extractTimeStr(r[3]) };

      // detailMap per minggu (untuk tampilan per minggu)
      if (!detailMap[wk]) detailMap[wk] = { hadir:[], telat:[], absen:[], lemburPulang:[], lemburMinggu:[], lemburLibur:[], dendaSP:[], dendaManual:[], rewardManual:[] };
      if (tipe === 'HADIR') detailMap[wk].hadir.push(item);
      else if (tipe === 'TELAT') detailMap[wk].telat.push(item);
      else if (tipe === 'ABSEN') detailMap[wk].absen.push(item);
      else if (tipe === 'LEMBUR_PULANG') detailMap[wk].lemburPulang.push(item);
      else if (tipe === 'LEMBUR_MINGGU') detailMap[wk].lemburMinggu.push(item);
      else if (tipe === 'LEMBUR_LIBUR') detailMap[wk].lemburLibur.push(item);
      else if (tipe === 'DENDA_SP' || tipe === 'DENDA_ANOMALI') detailMap[wk].dendaSP.push(item);
      else if (tipe === 'DENDA_MANUAL') detailMap[wk].dendaManual.push(item);
      else if (tipe === 'REWARD_MANUAL') detailMap[wk].rewardManual.push(item);

      // detailByBulan per bulan — string equality ONLY
      if (bk && bk.length === 7) {
        if (!detailByBulan[bk]) detailByBulan[bk] = { hadir:[], absen:[], telat:[], lemburPulang:[], lemburMinggu:[], lemburLibur:[], dendaSP:[], dendaManual:[], rewardManual:[] };
        if (tipe === 'HADIR') detailByBulan[bk].hadir.push(item);
        else if (tipe === 'ABSEN') detailByBulan[bk].absen.push(item);
        else if (tipe === 'TELAT') detailByBulan[bk].telat.push(item);
        else if (tipe === 'LEMBUR_PULANG') detailByBulan[bk].lemburPulang.push(item);
        else if (tipe === 'LEMBUR_MINGGU') detailByBulan[bk].lemburMinggu.push(item);
        else if (tipe === 'LEMBUR_LIBUR') detailByBulan[bk].lemburLibur.push(item);
        else if (tipe === 'DENDA_SP' || tipe === 'DENDA_ANOMALI') detailByBulan[bk].dendaSP.push(item);
        else if (tipe === 'DENDA_MANUAL') detailByBulan[bk].dendaManual.push(item);
        else if (tipe === 'REWARD_MANUAL') detailByBulan[bk].rewardManual.push(item);
      }
    }
  }

  // Ambil gaji bulanan user
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let gajiBulanan = 0;
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) { gajiBulanan = usersData[i][12]||0; break; }
  }

  // Ambil libur resmi
  const kalData = ss.getSheetByName('KALENDER_LIBUR').getDataRange().getValues();
  const liburList = [];
  for (let i = 1; i < kalData.length; i++) {
    if (kalData[i][1]) {
      try {
        const tgl = new Date(kalData[i][1]);
        liburList.push({ tgl, nama: kalData[i][2], tglStr: fmtDate(tgl) });
      } catch(e) {}
    }
  }

  // bulanIni = bulan terbaru yang ada data (absensi atau manual)
  // Tidak hardcode ke current month — cegah default ke bulan kosong
  const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  // Akan di-set setelah bulanMap selesai dibangun

  // Kumpulkan data rekap user per minggu
  const weekRows = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[1]) === String(userId)) {
      weekRows.push({ minggu: r[2], hadir: r[3], telat: r[4], absen: r[5], lemburMinggu: r[6], lemburLibur: r[7], status: r[8], denda: r[9]||0 });
    }
  }

  // Group per bulan
  const bulanMap = {};
  weekRows.forEach(function(w) {
    const monday = getMondayOfWeek(w.minggu);
    if (!monday) return;
    // ── Tentukan bulan minggu ini berdasarkan data aktual ──
    // Ambil semua tanggal yang ada di detailMap untuk minggu ini
    const weekDet = detailMap[w.minggu] || {};
    const allDates = [];
    ['hadir','absen','telat','lemburPulang','lemburMinggu','lemburLibur'].forEach(function(t) {
      (weekDet[t]||[]).forEach(function(item) { if (item.tanggal) allDates.push(item.tanggal); });
    });
    allDates.sort();

    // Tentukan bulan dari data aktual (mayoritas hari), fallback ke Monday
    const bulanCount = {};
    allDates.forEach(function(d) {
      const bk = d.substring(0,7);
      bulanCount[bk] = (bulanCount[bk]||0) + 1;
    });
    let bulanKey = monday.getFullYear() + '-' + String(monday.getMonth()+1).padStart(2,'0');
    if (Object.keys(bulanCount).length > 0) {
      // Pakai bulan dengan hari terbanyak
      bulanKey = Object.keys(bulanCount).sort(function(a,b){ return bulanCount[b]-bulanCount[a]; })[0];
    }

    const bkParts = bulanKey.split('-');
    const bulanLabel = bulanNames[parseInt(bkParts[1])-1] + ' ' + bkParts[0];
    if (!bulanMap[bulanKey]) bulanMap[bulanKey] = { bulan: bulanKey, label: bulanLabel, totalHadir: 0, totalTelat: 0, totalAbsen: 0, lemburMinggu: 0, lemburLibur: 0, totalDenda: 0, mingguList: [] };
    bulanMap[bulanKey].totalDenda += (w.denda||0);

    // Range tanggal — pakai tanggal aktual dari data, bukan full Mon-Sun
    const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    let rangeStr;
    if (allDates.length > 0) {
      // Ambil tanggal awal dan akhir dari data aktual di bulan ini
      const bulanDates = allDates.filter(function(d){ return d.substring(0,7) === bulanKey; });
      if (bulanDates.length > 0) {
        const first = new Date(bulanDates[0]+'T12:00:00');
        const last  = new Date(bulanDates[bulanDates.length-1]+'T12:00:00');
        if (first.getMonth() === last.getMonth()) {
          rangeStr = first.getDate()+' '+mNames[first.getMonth()]+' - '+last.getDate()+' '+mNames[last.getMonth()]+' '+last.getFullYear();
        } else {
          rangeStr = first.getDate()+' '+mNames[first.getMonth()]+' - '+last.getDate()+' '+mNames[last.getMonth()]+' '+last.getFullYear();
        }
      } else {
        const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
        rangeStr = monday.getDate()+' '+mNames[monday.getMonth()]+' - '+sunday.getDate()+' '+mNames[sunday.getMonth()]+' '+sunday.getFullYear();
      }
    } else {
      const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
      rangeStr = monday.getDate()+' '+mNames[monday.getMonth()]+' - '+sunday.getDate()+' '+mNames[sunday.getMonth()]+' '+sunday.getFullYear();
    }

    // Libur resmi di minggu ini
    const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
    const liburMingguIni = liburList.filter(function(l){
      return l.tgl >= monday && l.tgl <= sunday;
    }).map(function(l){ return l.nama; });

    bulanMap[bulanKey].mingguList.push({
      minggu: w.minggu,
      range: rangeStr,
      hadir: w.hadir||0,
      telat: w.telat||0,
      absen: w.absen||0,
      lemburMinggu: w.lemburMinggu||0,
      lemburLibur: w.lemburLibur||0,
      denda: w.denda||0,
      status: w.status||'BAIK',
      libur: liburMingguIni,
      detail: detailMap[w.minggu] || { hadir:[], telat:[], absen:[], lemburPulang:[], lemburMinggu:[], lemburLibur:[] }
    });
  });

  // Libur resmi bulan ini untuk summary (pakai current month)
  const currentMonthForLibur = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
  const liburBulanIni = liburList.filter(function(l){
    const lKey = Utilities.formatDate(l.tgl, 'Asia/Jakarta', 'yyyy-MM');
    return lKey === currentMonthForLibur;
  }).map(function(l){ return l.nama; });

  // Pastikan bulan dari detailByBulan yang punya DENDA_MANUAL/REWARD_MANUAL
  // juga ada di bulanMap (supaya manual entry tidak hilang kalau absensi belum diupload)
  Object.keys(detailByBulan).forEach(function(bk) {
    const det = detailByBulan[bk];
    const hasManual = (det.dendaManual && det.dendaManual.length > 0) ||
                      (det.rewardManual && det.rewardManual.length > 0);
    if (hasManual && !bulanMap[bk]) {
      const parts = bk.split('-');
      const y = parseInt(parts[0]), m = parseInt(parts[1]);
      bulanMap[bk] = {
        bulan: bk,
        label: bulanNames[m-1] + ' ' + y,
        totalHadir: 0, totalTelat: 0, totalAbsen: 0,
        lemburMinggu: 0, lemburLibur: 0, totalDenda: 0,
        mingguList: []
      };
    }
  });

  // Pastikan semua bulan yang ada di detailByBulan juga ada di bulanMap
  // Ini handle kasus: ada HADIR/ABSEN di ABSENSI_DETAIL tapi bulan itu belum ada di weekRows
  Object.keys(detailByBulan).forEach(function(bk) {
    if (bulanMap[bk]) return; // sudah ada, skip
    const det = detailByBulan[bk];
    const hasData = (det.hadir||[]).length > 0 || (det.absen||[]).length > 0 ||
                    (det.telat||[]).length > 0 || (det.dendaManual||[]).length > 0 ||
                    (det.rewardManual||[]).length > 0;
    if (!hasData) return;
    const parts = bk.split('-');
    const y = parseInt(parts[0]), m = parseInt(parts[1]);
    bulanMap[bk] = {
      bulan: bk, label: bulanNames[m-1] + ' ' + y,
      totalHadir:0, totalTelat:0, totalAbsen:0,
      lemburMinggu:0, lemburLibur:0, totalDenda:0,
      mingguList:[]
    };
  });

  // Hitung total per bulan — SEMUA dari detailByBulan (tanggal aktual, bukan minggu)
  // Ini memastikan Apr 1-4 terbaca sebagai April, bukan Maret
  Object.keys(bulanMap).forEach(function(bKey) {
    const b = bulanMap[bKey];
    const det = detailByBulan[bKey] || { hadir:[], absen:[], telat:[], lemburPulang:[], lemburMinggu:[], lemburLibur:[], dendaSP:[], dendaManual:[], rewardManual:[] };

    // Hadir, absen, telat, lembur — dari tanggal aktual
    b.totalHadir = (det.hadir||[]).length;
    b.totalAbsen = (det.absen||[]).length;
    b.totalTelat = (det.telat||[]).length;
    b.lemburMinggu = (det.lemburMinggu||[]).length;
    b.lemburLibur = (det.lemburLibur||[]).length;

    // Bug 1 fix: deduplicate DENDA_SP berdasarkan keterangan (hapus duplikat SP yang sama)
    const seenDendaSP = new Set();
    const dendaSPDedup = (det.dendaSP||[]).filter(function(d) {
      const key = d.keterangan.substring(0,20); // key unik dari awal keterangan
      if (seenDendaSP.has(key)) return false;
      seenDendaSP.add(key); return true;
    });

    // Hitung totalDenda: telat (sudah di rekap) + SP dedup + manual
    let dendaSPTotal = 0;
    dendaSPDedup.forEach(function(d){ dendaSPTotal += (d.nilai||0); });
    let dendaManualTotal = 0;
    (det.dendaManual||[]).forEach(function(d){ dendaManualTotal += (d.nilai||0); });
    b.totalDenda += dendaSPTotal + dendaManualTotal;

    // Bug 3 fix: reward manual masuk ke reward
    let totalRewardLembur = 0;
    det.lemburPulang.forEach(function(d){ totalRewardLembur += (d.nilai||0); });
    det.lemburMinggu.forEach(function(d){ totalRewardLembur += (d.nilai||0); });
    det.lemburLibur.forEach(function(d){ totalRewardLembur += (d.nilai||0); });
    let rewardManualTotal = 0;
    (det.rewardManual||[]).forEach(function(d){ rewardManualTotal += (d.nilai||0); });

    const salarySetting = getEffectiveSalarySetting_(userId, bKey, gajiBulanan, 150000);
    const bonusKerajinan = b.totalAbsen === 0 ? salarySetting.bonusKerajinan : 0;
    b.totalRewardLembur = totalRewardLembur + rewardManualTotal;
    b.rewardManualTotal = rewardManualTotal;
    b.bonusKerajinan = bonusKerajinan;
    b.detailLemburPulang = det.lemburPulang;
    b.detailLemburMinggu = det.lemburMinggu;
    b.detailLemburLibur = det.lemburLibur;
    b.detailAbsen = det.absen || [];
    b.detailDendaSP = dendaSPDedup;
    b.detailDendaManual = det.dendaManual || [];
    b.detailRewardManual = det.rewardManual || [];
    b.gajiBulanan = salarySetting.gajiBulanan;
  });

  // Kembalikan bulan berjalan sebagai default, plus history
  const sortedBulan = Object.values(bulanMap).sort(function(a,b){ return b.bulan.localeCompare(a.bulan); });

  // bulanIni = bulan terbaru yang ada data (bukan hardcode current month)
  const currentMonthStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
  // Pilih: current month kalau ada, atau bulan terbaru yang ada datanya
  const bulanIni = sortedBulan.find(function(b){ return b.bulan === currentMonthStr; })
    ? currentMonthStr
    : (sortedBulan.length > 0 ? sortedBulan[0].bulan : currentMonthStr);

  const result = { bulanIni, liburBulanIni, data: sortedBulan };
  try { cache.put(cacheKey, JSON.stringify(result), 300); } catch(e) {}
  return result;
}

function getMondayOfWeek(weekStr) {
  try {
    const parts = weekStr.split('-W');
    const year = parseInt(parts[0]);
    const week = parseInt(parts[1]);
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - (dow-1) + (week-1)*7);
    return monday;
  } catch(e) { return null; }
}

function getAllAbsensiRekap() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'all_absensi_rekap';
  const cached = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rekapData = ss.getSheetByName('ABSENSI_REKAP').getDataRange().getValues();
  const detailData = ss.getSheetByName('ABSENSI_DETAIL').getDataRange().getValues();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = { nama: usersData[i][1], bagian: usersData[i][3] };

  // Temukan bulan terbaru yang ada datanya di ABSENSI_DETAIL (tanggal aktual)
  const bulanSet = new Set();
  for (let i = 1; i < detailData.length; i++) {
    const tipe = detailData[i][4];
    if (['HADIR','ABSEN','TELAT','LEMBUR_MINGGU','LEMBUR_LIBUR','LEMBUR_PULANG'].indexOf(tipe) === -1) continue;
    const bk = extractMonthKey(detailData[i][3]);
    if (bk) bulanSet.add(bk);
  }
  const latestBulan = Array.from(bulanSet).sort().reverse()[0] || '';

  // Temukan minggu terbaru (untuk label display)
  const weeks = rekapData.slice(1).map(function(r){ return r[2]; }).sort();
  const latestWeek = weeks[weeks.length-1] || '';

  // Aggregate dari ABSENSI_DETAIL bulan terbaru per user (tanggal aktual)
  const userRekap = {};
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    const uid = String(r[1]);
    if (!userMap[uid]) continue;
    const bk = extractMonthKey(r[3]);
    if (bk !== latestBulan) continue;
    if (!userRekap[uid]) userRekap[uid] = { hadir:0, telat:0, absen:0, lemburMinggu:0, lemburLibur:0, status:'BAIK' };
    const tipe = r[4];
    if (tipe === 'HADIR')              userRekap[uid].hadir++;
    else if (tipe === 'TELAT')         userRekap[uid].telat++;
    else if (tipe === 'ABSEN')         userRekap[uid].absen++;
    else if (tipe === 'LEMBUR_MINGGU') userRekap[uid].lemburMinggu++;
    else if (tipe === 'LEMBUR_LIBUR')  userRekap[uid].lemburLibur++;
  }

  // Tentukan status per user
  Object.keys(userRekap).forEach(function(uid) {
    const u = userRekap[uid];
    if (u.absen >= 3 || u.telat >= 5) u.status = 'MERAH';
    else if (u.absen >= 2 || u.telat >= 3) u.status = 'KUNING';
    else u.status = 'BAIK';
  });

  // Build result
  const result = [];
  Object.keys(userRekap).forEach(function(uid) {
    const u = userMap[uid] || { nama:'-', bagian:'-' };
    const r = userRekap[uid];
    result.push({ nama: u.nama, bagian: u.bagian, minggu: latestWeek,
      hadir: r.hadir, telat: r.telat, absen: r.absen,
      lemburMinggu: r.lemburMinggu, lemburLibur: r.lemburLibur, status: r.status });
  });

  // Label: tampilkan bulan + info data s/d tanggal terakhir
  const mNm = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let lastDateStr = '';
  if (latestBulan) {
    // Cari tanggal terbaru dari ABSENSI_DETAIL
    const tglList = [];
    for (let i = 1; i < detailData.length; i++) {
      const tipe = detailData[i][4];
      if (['HADIR','ABSEN','TELAT'].indexOf(tipe) === -1) continue;
      const bk = extractMonthKey(detailData[i][3]);
      if (bk !== latestBulan) continue;
      const tgl = extractDateStr(detailData[i][3]);
      if (tgl) tglList.push(tgl);
    }
    tglList.sort();
    if (tglList.length > 0) {
      const p = tglList[tglList.length-1].split('-');
      lastDateStr = parseInt(p[2])+' '+mNm[parseInt(p[1])-1];
    }
    const bp = latestBulan.split('-');
    lastDateStr = mNm[parseInt(bp[1])-1]+' '+bp[0]+(lastDateStr?' (s/d '+lastDateStr+')':'');
  }

  const response = { minggu: lastDateStr || latestWeek, data: result };
  try { cache.put(cacheKey, JSON.stringify(response), 60); } catch(e) {}
  return response;
}

function getRekapBulananSemua(bulanKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try { repairManualAttendanceSync_(ss, bulanKey, ''); } catch(e) { Logger.log('repairManualAttendanceSync_ month error: ' + e); }
  const cache = CacheService.getScriptCache();
  const cacheKey = 'rekap_bulanan_semua_' + bulanKey;
  const cached = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  // bulanKey format: "2026-03"
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const rekapData = ss.getSheetByName('ABSENSI_REKAP').getDataRange().getValues();
  const detailData = ss.getSheetByName('ABSENSI_DETAIL').getDataRange().getValues();

  // Build user map (exclude Owner/Finance from rekap)
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][6] === 'AKTIF' && usersData[i][3] !== 'Owner' && usersData[i][3] !== 'Finance') {
      userMap[String(usersData[i][0])] = {
        nama: usersData[i][1], bagian: usersData[i][3], jabatan: usersData[i][4],
        bintang: usersData[i][9]||0, skor: usersData[i][10]||0, gajiBulanan: usersData[i][12]||0
      };
    }
  }

  // Aggregate per user dari ABSENSI_DETAIL (tanggal aktual — konsisten dengan rekap karyawan)
  const userRekap = {};
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    const uid = String(r[1]);
    if (!userMap[uid]) continue;
    const bk = extractMonthKey(r[3]);
    if (bk !== bulanKey) continue;
    if (!userRekap[uid]) userRekap[uid] = { hadir:0, telat:0, absen:0, lemburMinggu:0, lemburLibur:0, totalDenda:0 };
    const tipe = r[4];
    if (tipe === 'HADIR')          userRekap[uid].hadir++;
    else if (tipe === 'TELAT')     userRekap[uid].telat++;
    else if (tipe === 'ABSEN')     userRekap[uid].absen++;
    else if (tipe === 'LEMBUR_MINGGU') userRekap[uid].lemburMinggu++;
    else if (tipe === 'LEMBUR_LIBUR')  userRekap[uid].lemburLibur++;
  }

  // Aggregate denda dari ABSENSI_REKAP (per minggu — untuk totalDenda yang akurat)
  for (let i = 1; i < rekapData.length; i++) {
    const r = rekapData[i];
    const uid = String(r[1]);
    if (!userMap[uid]) continue;
    const monday = getMondayOfWeek(String(r[2]));
    if (!monday) continue;
    const rowBulan = monday.getFullYear()+'-'+String(monday.getMonth()+1).padStart(2,'0');
    if (rowBulan !== bulanKey) continue;
    if (!userRekap[uid]) userRekap[uid] = { hadir:0, telat:0, absen:0, lemburMinggu:0, lemburLibur:0, totalDenda:0 };
    userRekap[uid].totalDenda += (r[9]||0);
  }

  // Aggregate detail (sanksi manual, reward, denda SP) per user per bulan
  const userDetail = {};
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    const uid = String(r[1]);
    if (!userMap[uid]) continue;
    let tglObj = null;
    try { tglObj = new Date(r[3]); tglObj.setHours(12,0,0,0); } catch(e) {}
    if (!tglObj || isNaN(tglObj)) continue;
    const rowBulan = tglObj.getFullYear()+'-'+String(tglObj.getMonth()+1).padStart(2,'0');
    if (rowBulan !== bulanKey) continue;
    if (!userDetail[uid]) userDetail[uid] = { dendaSP:0, dendaManual:0, rewardLembur:0, rewardManual:0 };
    const tipe = r[4]; const nilai = r[6]||0;
    if (tipe === 'DENDA_SP' || tipe === 'DENDA_ANOMALI') userDetail[uid].dendaSP += nilai;
    else if (tipe === 'DENDA_MANUAL') userDetail[uid].dendaManual += nilai;
    else if (tipe === 'LEMBUR_PULANG' || tipe === 'LEMBUR_MINGGU' || tipe === 'LEMBUR_LIBUR') userDetail[uid].rewardLembur += nilai;
    else if (tipe === 'REWARD_MANUAL') userDetail[uid].rewardManual += nilai;
  }

  // Hitung hari kerja efektif bulan ini
  const kalData = ss.getSheetByName('KALENDER_LIBUR').getDataRange().getValues();
  const yr = parseInt(bulanKey.split('-')[0]), mo = parseInt(bulanKey.split('-')[1]);
  const hariLibur = new Set();
  for (let i = 1; i < kalData.length; i++) {
    if (kalData[i][1]) {
      const t = new Date(kalData[i][1]);
      if (t.getFullYear()===yr && t.getMonth()+1===mo) hariLibur.add(t.getDate());
    }
  }
  let jumlahMinggu = 0;
  const totalHari = new Date(yr, mo, 0).getDate();
  for (let d = 1; d <= totalHari; d++) if (new Date(yr,mo-1,d).getDay()===0) jumlahMinggu++;
  const hariKerja = Math.max(1, totalHari - jumlahMinggu - hariLibur.size);

  // Build result
  const result = Object.keys(userMap).map(function(uid) {
    const u = userMap[uid];
    const r = userRekap[uid] || { hadir:0, telat:0, absen:0, lemburMinggu:0, lemburLibur:0, totalDenda:0 };
    const d = userDetail[uid] || { dendaSP:0, dendaManual:0, rewardLembur:0, rewardManual:0 };
    const salarySetting = getEffectiveSalarySetting_(uid, bulanKey, u.gajiBulanan, 150000);
    const gajiPokok = salarySetting.gajiBulanan;
    const gajiHarian = Math.round(gajiPokok / hariKerja);
    const totalDenda = r.totalDenda + d.dendaSP + d.dendaManual;
    const totalReward = d.rewardLembur + d.rewardManual;
    const bonusKerajinan = r.absen === 0 ? salarySetting.bonusKerajinan : 0;
    return {
      userId: uid, nama: u.nama, jabatan: u.jabatan, bagian: u.bagian,
      hadir: r.hadir, telat: r.telat, absen: r.absen,
      lemburMinggu: r.lemburMinggu, lemburLibur: r.lemburLibur,
      bintang: u.bintang, skor: u.skor,
      totalDenda, totalReward, bonusKerajinan,
      gajiPokok: gajiPokok, gajiHarian
    };
  }).sort(function(a,b){ return a.nama.localeCompare(b.nama); });

  const response = { bulan: bulanKey, hariKerja, data: result };
  try { cache.put(cacheKey, JSON.stringify(response), 60); } catch(e) {}
  return response;
}

// ─── KALENDER LIBUR ───────────────────────────────
// PAYROLL / SLIP GAJI
function ensurePayrollSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const specs = {
    PAYROLL_RUN: ['id','bulan','periodeMulai','periodeAkhir','status','dibuatOleh','dibuatPada','dikonfirmasiOleh','dikonfirmasiPada','dipublishOleh','dipublishPada'],
    PAYROLL_DETAIL: ['id','payrollRunId','userId','nama','bagian','jabatan','gajiPokok','hariKerja','hadir','absen','telat','lemburPulang','lemburMinggu','lemburLibur','totalReward','totalDenda','bonusKerajinan','adjustmentPlus','adjustmentMinus','catatanAdjustment','totalGaji','statusSlip'],
    PAYROLL_ITEM: ['id','payrollDetailId','tipe','tanggal','keterangan','nominal']
  };
  Object.keys(specs).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(specs[name]);
  });
  return {
    run: ss.getSheetByName('PAYROLL_RUN'),
    detail: ss.getSheetByName('PAYROLL_DETAIL'),
    item: ss.getSheetByName('PAYROLL_ITEM')
  };
}

// ─── ABSENSI KAMERA (STAGING) ─────────────────────
function ensureAbsensiAppSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ABSENSI_APP');
  if (!sheet) sheet = ss.insertSheet('ABSENSI_APP');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,14).setValues([[
      'ID','ID_User','Nama','Tanggal','Jam','Tipe','Latitude','Longitude',
      'Akurasi_Meter','Jarak_Kantor_Meter','Status','Foto_URL','Catatan','Created_At'
    ]]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAbsensiAppConfig_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PENGATURAN');
  const cfg = { officeLat: null, officeLng: null, radius: 120, folderId: '', coordinateSwapped: false };
  if (!sheet) return cfg;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    const val = data[i][1];
    if (key === 'OFFICE_LAT') cfg.officeLat = normalizeCoordinate_(parseLocaleNumber_(val), 15);
    if (key === 'OFFICE_LNG') cfg.officeLng = normalizeCoordinate_(parseLocaleNumber_(val), 180);
    if (key === 'OFFICE_RADIUS_M') cfg.radius = parseLocaleNumber_(val) || 120;
    if (key === 'ABSENSI_PHOTO_FOLDER_ID') cfg.folderId = String(val || '').trim();
  }
  if (Math.abs(cfg.officeLat) > 90 && Math.abs(cfg.officeLng) <= 90) {
    const lat = cfg.officeLng;
    cfg.officeLng = cfg.officeLat;
    cfg.officeLat = lat;
    cfg.coordinateSwapped = true;
  }
  return cfg;
}

function parseLocaleNumber_(val) {
  if (typeof val === 'number') return val;
  let text = String(val || '').trim().replace(/\s/g, '');
  if (!text) return NaN;
  if (text.indexOf(',') !== -1 && text.indexOf('.') !== -1) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(',', '.');
  }
  return parseFloat(text);
}

function normalizeCoordinate_(num, limit) {
  if (isNaN(num)) return num;
  while (Math.abs(num) > limit) num = num / 10;
  return num;
}

function distanceMeters_(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = function(n) { return n * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const aRaw = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const a = Math.min(1, Math.max(0, aRaw));
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getAbsensiDebugConfig() {
  const cfg = getAbsensiAppConfig_();
  return {
    success: true,
    officeLat: cfg.officeLat,
    officeLng: cfg.officeLng,
    radius: cfg.radius,
    coordinateSwapped: cfg.coordinateSwapped,
    hasPhotoFolder: !!cfg.folderId,
    version: 'absensi-config-20260511h'
  };
}

function saveAbsensiPhoto_(photoData, userId, tipe) {
  try {
    const cfg = getAbsensiAppConfig_();
    if (!cfg.folderId) return { url: '', error: 'ABSENSI_PHOTO_FOLDER_ID kosong' };
    if (!photoData) return { url: '', error: 'Data foto kosong' };
    const match = String(photoData).match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!match) return { url: '', error: 'Format foto tidak valid' };
    const bytes = Utilities.base64Decode(match[2]);
    const ext = match[1] === 'png' ? 'png' : 'jpg';
    const name = 'ABSENSI_' + userId + '_' + tipe + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.' + ext;
    const blob = Utilities.newBlob(bytes, 'image/' + (ext === 'jpg' ? 'jpeg' : ext), name);
    const file = DriveApp.getFolderById(cfg.folderId).createFile(blob);
    return { url: file.getUrl(), error: '' };
  } catch (err) {
    return { url: '', error: err.message };
  }
}

function submitAbsensiCamera(userId, nama, tipe, photoData, lat, lng, accuracy, clientTime) {
  const cfg = getAbsensiAppConfig_();
  if (cfg.officeLat === null || cfg.officeLng === null || isNaN(cfg.officeLat) || isNaN(cfg.officeLng)) {
    return { success: false, msg: 'Lokasi kantor belum diset. Isi OFFICE_LAT dan OFFICE_LNG di sheet PENGATURAN.' };
  }
  lat = parseLocaleNumber_(lat); lng = parseLocaleNumber_(lng); accuracy = parseLocaleNumber_(accuracy) || 0;
  if (isNaN(lat) || isNaN(lng)) return { success: false, msg: 'Lokasi tidak valid.' };
  tipe = String(tipe || '').toUpperCase() === 'PULANG' ? 'PULANG' : 'MASUK';
  const distance = distanceMeters_(cfg.officeLat, cfg.officeLng, lat, lng);
  const accepted = distance <= cfg.radius;
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const tanggal = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const jam = Utilities.formatDate(now, tz, 'HH:mm:ss');
  const sheet = ensureAbsensiAppSheet_();
  const id = 'APP-' + Utilities.getUuid().substring(0, 8);
  const cfgNote = 'Kantor: ' + cfg.officeLat + ',' + cfg.officeLng + ' radius ' + cfg.radius + 'm' + (cfg.coordinateSwapped ? ' (lat/lng tertukar otomatis)' : '');
  if (accepted) {
    const data = sheet.getDataRange().getValues();
    let acceptedTapCount = 0;
    let sameTypeCount = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() !== String(userId).trim()) continue;
      if (extractDateStr(data[i][3]) !== tanggal) continue;
      if (String(data[i][10]).toUpperCase() !== 'DITERIMA') continue;
      acceptedTapCount++;
      if (String(data[i][5]).toUpperCase() === tipe) sameTypeCount++;
    }
    if (acceptedTapCount >= 2) {
      return { success: false, status: 'DITOLAK', code: 'MAX_TAP_HARIAN', msg: 'Absensi ditolak. Hari ini sudah ada 2 tap: masuk dan pulang.' };
    }
    if (sameTypeCount >= 1) {
      return { success: false, status: 'DITOLAK', code: 'DUPLICATE_TAP', msg: 'Absensi ' + tipe.toLowerCase() + ' hari ini sudah tercatat.' };
    }
  }
  const status = accepted ? 'DITERIMA' : 'DITOLAK';
  const initialNote = accepted ? 'Dalam radius kantor; foto sedang disimpan | ' + cfgNote : 'Di luar radius kantor | ' + cfgNote;
  sheet.appendRow([id, userId, nama, tanggal, jam, tipe, lat, lng, Math.round(accuracy), Math.round(distance), status, '', initialNote, now]);
  SpreadsheetApp.flush();
  const row = sheet.getLastRow();
  let photoUrl = '';
  let photoSave = { url: '', error: '' };
  let note = initialNote;
  if (accepted) {
    photoSave = saveAbsensiPhoto_(photoData, userId, tipe);
    photoUrl = photoSave.url || '';
    note = ((photoUrl ? 'Dalam radius kantor' : 'Dalam radius kantor; foto belum tersimpan ke Drive' + (photoSave.error ? ' (' + photoSave.error + ')' : '')) + ' | ' + cfgNote);
    sheet.getRange(row, 12, 1, 2).setValues([[photoUrl, note]]);
  }
  clearAbsensiMatrixCache_(tanggal.substring(0, 7), userId);
  return { success: accepted, id: id, status: status, distance: Math.round(distance), radius: cfg.radius, msg: accepted ? 'Absensi diterima' : 'Absensi ditolak karena di luar radius kantor.' };
}

function getAbsensiCameraToday(userId) {
  const sheet = ensureAbsensiAppSheet_();
  const data = sheet.getDataRange().getValues();
  const cfg = getAbsensiAppConfig_();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const rowDate = extractDateStr(data[i][3]);
    if (String(data[i][1]).trim() === String(userId).trim() && rowDate === today) {
      result.push({ id: data[i][0], tanggal: rowDate, jam: extractAttendanceTime_(data[i][4]), tipe: data[i][5], status: data[i][10], fotoUrl: data[i][11], distance: data[i][9], jarak: data[i][9], radius: cfg.radius, catatan: data[i][12] });
    }
  }
  return { success: true, data: result.reverse() };
}

function absensiMatrixCacheKey_(bulanKey, targetUserId) {
  return 'absensi_matrix_' + (targetUserId ? 'user_' + String(targetUserId) : 'all') + '_' + String(bulanKey || '');
}

function clearAbsensiMatrixCache_(bulanKey, userIds) {
  if (!bulanKey) return;
  try {
    const keys = [absensiMatrixCacheKey_(bulanKey, '')];
    (Array.isArray(userIds) ? userIds : [userIds]).forEach(function(userId) {
      if (userId) keys.push(absensiMatrixCacheKey_(bulanKey, userId));
    });
    CacheService.getScriptCache().removeAll(keys);
  } catch(e) {}
}

function clearAnomaliNotificationsForUser_(userId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet || sheet.getLastRow() <= 1) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) !== String(userId)) continue;
      const title = String(data[i][2] || '').toLowerCase();
      const body = String(data[i][3] || '').toLowerCase();
      if ((title.indexOf('tap fingerprint') !== -1 || body.indexOf('tap fingerprint') !== -1) && data[i][5] === 'BELUM') {
        sheet.getRange(i + 1, 6).setValue('SUDAH');
      }
    }
    clearNotifCache_(userId);
  } catch(e) {}
}

function autoResolveAnomaliForDay_(userId, tanggal, actor) {
  tanggal = extractDateStr(tanggal);
  if (!userId || !tanggal) return 0;
  const sheet = ensureAnomaliSheet_();
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  const data = sheet.getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) !== String(userId)) continue;
    if (extractDateStr(data[i][2]) !== tanggal) continue;
    if (String(data[i][5]).toUpperCase() !== 'MENUNGGU') continue;
    sheet.getRange(i + 1, 6).setValue('NORMAL');
    count++;
  }
  if (count > 0) {
    clearAnomaliNotificationsForUser_(userId);
    appendAuditLog_(actor || 'System', 'AUTO_RESOLVE_ANOMALI', userId + '|' + tanggal, 'MENUNGGU', 'NORMAL', 'Jam masuk/pulang sudah dikoreksi manual');
  }
  return count;
}

function hasCompleteAttendanceForDay_(ss, userId, tanggal) {
  tanggal = extractDateStr(tanggal);
  if (!userId || !tanggal) return false;
  let masuk = '', pulang = '';
  const appSheet = ensureAbsensiAppSheet_();
  if (appSheet && appSheet.getLastRow() > 1) {
    const appData = appSheet.getDataRange().getValues();
    for (let i = 1; i < appData.length; i++) {
      if (String(appData[i][1]) !== String(userId)) continue;
      if (extractDateStr(appData[i][3]) !== tanggal) continue;
      if (String(appData[i][10]).toUpperCase() !== 'DITERIMA') continue;
      const tipe = String(appData[i][5] || '').toUpperCase();
      const jam = extractAttendanceTime_(appData[i][4]);
      if (tipe === 'MASUK' && jam && (!masuk || jam < masuk)) masuk = jam;
      if (tipe === 'PULANG' && jam && (!pulang || jam > pulang)) pulang = jam;
    }
  }
  if (masuk && pulang) return true;

  let nama = '';
  const usersSheet = ss.getSheetByName('USERS');
  if (usersSheet && usersSheet.getLastRow() > 1) {
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (String(usersData[i][0]) === String(userId)) { nama = String(usersData[i][1] || '').toLowerCase().trim(); break; }
    }
  }
  if (!nama) return false;
  const rawSheet = ss.getSheetByName('ABSENSI_RAW');
  if (rawSheet && rawSheet.getLastRow() > 1) {
    const rawData = rawSheet.getDataRange().getValues();
    for (let i = 1; i < rawData.length; i++) {
      if (String(rawData[i][1] || '').toLowerCase().trim() !== nama) continue;
      if (extractDateStr(rawData[i][2]) !== tanggal) continue;
      const rawMasuk = extractAttendanceTime_(rawData[i][3]);
      const rawPulang = extractAttendanceTime_(rawData[i][4]);
      if (rawMasuk && rawPulang) return true;
    }
  }
  return false;
}

function getAbsensiMatrix(bulanKey, targetUserId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  bulanKey = String(bulanKey || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM'));
  const p = bulanKey.split('-');
  const year = parseInt(p[0], 10);
  const month = parseInt(p[1], 10);
  if (!year || !month) return { success: false, msg: 'Bulan tidak valid' };
  targetUserId = targetUserId ? String(targetUserId) : '';

  const matrixCache = CacheService.getScriptCache();
  const matrixCacheKey = absensiMatrixCacheKey_(bulanKey, targetUserId);
  try {
    const cachedMatrix = matrixCache.get(matrixCacheKey);
    if (cachedMatrix) return JSON.parse(cachedMatrix);
  } catch(e) {}

  function readRows(sheet, columns) {
    const lastRow = sheet ? sheet.getLastRow() : 0;
    return lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, columns).getValues() : [];
  }

  const usersSheet = ss.getSheetByName('USERS');
  if (!usersSheet) return { success: false, msg: 'Sheet USERS tidak ditemukan' };
  const usersData = readRows(usersSheet, 7);
  const users = [];
  const userMap = {};
  const nameMap = {};
  for (let i = 0; i < usersData.length; i++) {
    const r = usersData[i];
    if (String(r[6]) !== 'AKTIF') continue;
    const id = String(r[0]);
    if (targetUserId && id !== targetUserId) continue;
    if (!targetUserId && (r[3] === 'Owner' || r[3] === 'Finance')) continue;
    const u = { id: id, nama: r[1] || '', bagian: r[3] || '', jabatan: r[4] || '', days: {} };
    users.push(u);
    userMap[id] = u;
    nameMap[String(r[1] || '').toLowerCase().trim()] = u;
  }

  let totalMasuk = 0, totalPulang = 0;

  function cellFor(user, day) {
    if (!user.days[day]) user.days[day] = { masuk: '', pulang: '', absen: false, telat: false, lembur: false, anomali: false, rejected: false, rows: [] };
    return user.days[day];
  }
  function addTime(user, day, tipe, jam, source, rowId, status, catatan) {
    if (!user || !day || !jam) return;
    jam = extractAttendanceTime_(jam);
    const cell = cellFor(user, day);
    cell.rows.push({ id: rowId || '', tipe: tipe, jam: jam, status: status || 'DITERIMA', source: source || '', catatan: catatan || '' });
    if (status === 'DITOLAK') cell.rejected = true;
    if (status && status !== 'DITERIMA') return;
    if (tipe === 'MASUK') {
      cell.absen = false;
      if (source === 'APP') cell.masuk = jam;
      else if (!cell.masuk || jam < cell.masuk) cell.masuk = jam;
      totalMasuk++;
    } else if (tipe === 'PULANG') {
      cell.absen = false;
      if (source === 'APP') cell.pulang = jam;
      else if (!cell.pulang || jam > cell.pulang) cell.pulang = jam;
      totalPulang++;
    }
  }

  // 1) Data fingerprint lama: sumber utama jam masuk/pulang untuk bulan sebelum absensi kamera.
  const rawSheet = ss.getSheetByName('ABSENSI_RAW');
  if (rawSheet && rawSheet.getLastRow() > 1) {
    const rawData = readRows(rawSheet, 5);
    for (let i = 0; i < rawData.length; i++) {
      const rawName = String(rawData[i][1] || '').toLowerCase().trim();
      const user = nameMap[rawName];
      if (!user) continue;
      const tgl = extractDateStr(rawData[i][2]);
      if (!tgl || tgl.substring(0, 7) !== bulanKey) continue;
      const day = parseInt(tgl.substring(8, 10), 10);
      addTime(user, day, 'MASUK', rawData[i][3], 'RAW', rawData[i][0], 'DITERIMA', 'Fingerprint');
      addTime(user, day, 'PULANG', rawData[i][4], 'RAW', rawData[i][0], 'DITERIMA', 'Fingerprint');
    }
  }

  // 2) Detail rekap: lengkapi status absen/telat kalau data mentah tidak ada jam.
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  if (detailSheet && detailSheet.getLastRow() > 1) {
    const detailData = readRows(detailSheet, 6);
    for (let i = 0; i < detailData.length; i++) {
      const uid = String(detailData[i][1]);
      const user = userMap[uid];
      if (!user) continue;
      const tgl = extractDateStr(detailData[i][3]);
      if (!tgl || tgl.substring(0, 7) !== bulanKey) continue;
      const day = parseInt(tgl.substring(8, 10), 10);
      const tipe = String(detailData[i][4] || '').toUpperCase();
      const cell = cellFor(user, day);
      if (tipe === 'ABSEN') cell.absen = true;
      if (tipe === 'TELAT') {
        cell.telat = true;
        const m = String(detailData[i][5] || '').match(/Masuk\s+(\d{1,2}:\d{2})/i);
        if (m && !cell.masuk) addTime(user, day, 'MASUK', m[1], 'DETAIL', detailData[i][0], 'DITERIMA', detailData[i][5]);
      }
      if (tipe === 'LEMBUR_PULANG') {
        cell.lembur = true;
        const m = String(detailData[i][5] || '').match(/Pulang\s+(\d{1,2}:\d{2})/i);
        if (m && !cell.pulang) addTime(user, day, 'PULANG', m[1], 'DETAIL', detailData[i][0], 'DITERIMA', detailData[i][5]);
      }
      if (tipe === 'LEMBUR_MINGGU' || tipe === 'LEMBUR_LIBUR') cell.lembur = true;
    }
  }

  // 2b) Anomali pending: tampilkan sebagai peringatan, bukan absen biasa.
  const anomaliSheet = ss.getSheetByName('ANOMALI');
  if (anomaliSheet && anomaliSheet.getLastRow() > 1) {
    const anomaliData = readRows(anomaliSheet, 6);
    for (let i = 0; i < anomaliData.length; i++) {
      const uid = String(anomaliData[i][1]);
      const user = userMap[uid];
      if (!user) continue;
      if (String(anomaliData[i][5]).toUpperCase() !== 'MENUNGGU') continue;
      const tgl = extractDateStr(anomaliData[i][2]);
      if (!tgl || tgl.substring(0, 7) !== bulanKey) continue;
      if (!isPastDateKey_(tgl)) continue;
      const day = parseInt(tgl.substring(8, 10), 10);
      const cell = cellFor(user, day);
      cell.anomali = true;
      cell.absen = false;
      cell.anomaliTipe = anomaliData[i][4] || '';
    }
  }

  // 3) Absensi kamera/manual: data paling baru, dipakai realtime dan menimpa tampilan lama bila ada.
  const sheet = ensureAbsensiAppSheet_();
  const data = readRows(sheet, 13);
  for (let i = 0; i < data.length; i++) {
    const uid = String(data[i][1]);
    if (!userMap[uid]) continue;
    const tgl = extractDateStr(data[i][3]);
    if (!tgl || tgl.substring(0, 7) !== bulanKey) continue;
    const day = parseInt(tgl.substring(8, 10), 10);
      const tipe = String(data[i][5] || '').toUpperCase();
      const jam = extractAttendanceTime_(data[i][4]);
      const status = String(data[i][10] || '');
      if (status === 'DITERIMA' && tipe === 'ABSEN') {
        const cell = cellFor(userMap[uid], day);
        cell.masuk = '';
        cell.pulang = '';
        cell.absen = new Date(tgl + 'T12:00:00').getDay() !== 0;
        cell.rejected = false;
        cell.manualEmpty = true;
        cell.rows.push({ id: data[i][0], tipe: tipe, jam: '', status: status, source: 'APP', catatan: data[i][12] || '' });
        continue;
      }
      addTime(userMap[uid], day, tipe, jam, 'APP', data[i][0], status, data[i][12] || '');
  }

  users.forEach(function(user) {
    Object.keys(user.days).forEach(function(day) {
      const cell = user.days[day];
      if (cell.masuk && cell.pulang) cell.anomali = false;
      if (cell.anomali || cell.masuk || cell.pulang) cell.absen = false;
    });
  });

  users.sort(function(a, b) { return String(a.nama).localeCompare(String(b.nama)); });
  const days = new Date(year, month, 0).getDate();
  const result = {
    success: true,
    version: 'attendance-matrix-integrated-20260511p',
    sources: ['ABSENSI_RAW','ABSENSI_DETAIL','ABSENSI_APP'],
    bulan: bulanKey,
    days: days,
    users: users,
    totalMasuk: totalMasuk,
    totalPulang: totalPulang
  };
  try {
    const payload = JSON.stringify(result);
    if (payload.length < 95000) matrixCache.put(matrixCacheKey, payload, 120);
  } catch(e) {}
  return result;
}

function updateAbsensiMatrixDay(userId, tanggal, jamMasuk, jamPulang, catatan, actor, skipSync) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let nama = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) { nama = usersData[i][1]; break; }
  }
  if (!nama) return { success: false, msg: 'Karyawan tidak ditemukan' };
  tanggal = extractDateStr(tanggal);
  if (!tanggal) return { success: false, msg: 'Tanggal tidak valid' };
  const note = 'Edit manual oleh ' + (actor || 'Admin') + (catatan ? ': ' + catatan : '');
  const sheet = ensureAbsensiAppSheet_();
  const data = sheet.getDataRange().getValues();
  const isSunday = dateFromDateStr_(tanggal).getDay() === 0;

  function rejectExisting(tipe) {
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) !== String(userId)) continue;
      if (extractDateStr(data[i][3]) !== tanggal) continue;
      const rowTipe = String(data[i][5] || '').toUpperCase();
      if (tipe && rowTipe !== tipe) continue;
      if (['MASUK','PULANG','ABSEN'].indexOf(rowTipe) === -1) continue;
      if (String(data[i][10] || '').toUpperCase() === 'DITOLAK') continue;
      sheet.getRange(i + 1, 11).setValue('DITOLAK');
      sheet.getRange(i + 1, 13).setValue((data[i][12] ? data[i][12] + ' | ' : '') + note + ' - dikosongkan manual');
    }
  }

  function upsert(tipe, jam) {
    if (!jam) return;
    if (String(jam).length === 5) jam = jam + ':00';
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][1]) === String(userId) &&
          extractDateStr(data[i][3]) === tanggal &&
          String(data[i][5]).toUpperCase() === tipe) {
        sheet.getRange(i + 1, 5).setValue(jam);
        sheet.getRange(i + 1, 11).setValue('DITERIMA');
        sheet.getRange(i + 1, 13).setValue(note);
        return;
      }
    }
    sheet.appendRow([
      'APP-MANUAL-' + Utilities.getUuid().substring(0, 8),
      userId, nama, tanggal, jam, tipe, '', '', '', '', 'DITERIMA', '', note, new Date()
    ]);
  }

  if (!jamMasuk) rejectExisting('MASUK');
  if (!jamPulang) rejectExisting('PULANG');
  if (!jamMasuk && !jamPulang) rejectExisting('ABSEN');
  upsert('MASUK', jamMasuk);
  upsert('PULANG', jamPulang);
  if (!jamMasuk && !jamPulang) {
    sheet.appendRow([
      'APP-MANUAL-' + Utilities.getUuid().substring(0, 8),
      userId, nama, tanggal, '', 'ABSEN', '', '', '', '', 'DITERIMA', '', note + (isSunday ? ' - hari Minggu dikosongkan' : ' - dijadikan absen manual'), new Date()
    ]);
  }
  if (jamMasuk && jamPulang) autoResolveAnomaliForDay_(userId, tanggal, actor || 'System');
  const manualSyncResult = syncManualAttendanceDetail_(ss, userId, tanggal, jamMasuk, jamPulang, actor || 'System');
  try { CacheService.getScriptCache().removeAll(['dashboard_' + userId, 'rekap_' + userId]); } catch(e) {}
  const bulanKey = String(tanggal).substring(0, 7);
  clearAbsensiMatrixCache_(bulanKey, userId);
  try {
    CacheService.getScriptCache().removeAll(['all_absensi_rekap', 'rekap_bulanan_semua_' + bulanKey, 'ranking', 'payroll_preview_' + bulanKey]);
  } catch(e) {}
  let syncResult = { success: true, skipped: true, msg: 'Rekap resmi belum diproses otomatis agar simpan manual lebih cepat.' };
  if (skipSync !== true) {
    try {
      syncResult = processAbsensiAppToRekap(bulanKey, actor || 'System');
    } catch(e) {
      syncResult = { success: false, msg: String(e) };
    }
  }
  appendAuditLog_(actor || 'System', 'UPDATE_ABSENSI_MATRIX_DAY', userId + '|' + tanggal, '', 'masuk=' + (jamMasuk || '') + '; pulang=' + (jamPulang || ''), note);
  return { success: true, sync: syncResult, manualSync: manualSyncResult };
}

function debugAbsensiDay(userQuery, tanggal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dateKey = extractDateStr(tanggal);
  if (!dateKey) return { success: false, msg: 'Tanggal wajib format YYYY-MM-DD.' };
  const bulanKey = dateKey.substring(0, 7);
  const dayNum = parseInt(dateKey.substring(8, 10), 10);
  const q = String(userQuery || '').toLowerCase().trim();
  const usersSheet = ss.getSheetByName('USERS');
  if (!usersSheet) return { success: false, msg: 'Sheet USERS tidak ditemukan.' };
  const usersData = usersSheet.getDataRange().getValues();
  let user = null;
  for (let i = 1; i < usersData.length; i++) {
    const id = normalizeUploadText_(usersData[i][0]);
    const nama = normalizeUploadText_(usersData[i][1]);
    if (id === q || nama === q || (q && nama.indexOf(q) !== -1)) {
      user = { id: String(usersData[i][0]), nama: usersData[i][1], bagian: usersData[i][3], jabatan: usersData[i][4] };
      break;
    }
  }
  if (!user) return { success: false, msg: 'User tidak ditemukan: ' + userQuery };

  function sheetRows(name, mapper) {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 1) return [];
    const values = sheet.getDataRange().getValues();
    const rows = [];
    for (let i = 1; i < values.length; i++) {
      const item = mapper(values[i], i + 1);
      if (item) rows.push(item);
    }
    return rows;
  }

  const appRows = sheetRows('ABSENSI_APP', function(r, row) {
    if (String(r[1]) !== user.id) return null;
    if (extractDateStr(r[3]) !== dateKey) return null;
    return { row: row, id: r[0], jam: extractAttendanceTime_(r[4]), tipe: r[5], status: r[10], catatan: r[12] };
  });
  const anomaliRows = sheetRows('ANOMALI', function(r, row) {
    if (String(r[1]) !== user.id) return null;
    if (extractDateStr(r[2]) !== dateKey) return null;
    return { row: row, id: r[0], jam: extractAttendanceTime_(r[3]), tipe: r[4], status: r[5] };
  });
  const detailRows = sheetRows('ABSENSI_DETAIL', function(r, row) {
    if (String(r[1]) !== user.id) return null;
    if (extractDateStr(r[3]) !== dateKey) return null;
    return { row: row, id: r[0], week: r[2], tipe: r[4], keterangan: r[5], nilai: r[6] };
  });
  const rawRows = sheetRows('ABSENSI_RAW', function(r, row) {
    const rawName = String(r[1] || '').toLowerCase().trim();
    if (rawName !== String(user.nama || '').toLowerCase().trim()) return null;
    if (extractDateStr(r[2]) !== dateKey) return null;
    return { row: row, id: r[0], nama: r[1], tanggal: extractDateStr(r[2]), masuk: extractAttendanceTime_(r[3]), pulang: extractAttendanceTime_(r[4]) };
  });

  const uploadMatches = [];
  const uploadSheet = ss.getSheetByName('ABSENSI_UPLOAD');
  if (uploadSheet && uploadSheet.getLastRow() > 1) {
    const up = uploadSheet.getDataRange().getValues();
    const targetNameMap = {};
    targetNameMap[normalizeUploadText_(user.nama)] = user;
    for (let i = 0; i < up.length - 2; i++) {
      const row = up[i];
      let empName = '';
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j]).trim();
        const inlineName = cell.match(/^Nama\s*[:ï¼š]\s*(.+)$/i);
        if (inlineName && inlineName[1]) { empName = String(inlineName[1]).toLowerCase().trim(); break; }
        if (/^Nama\s*[:ï¼š]?$/.test(cell) || cell === 'NamaÃ¯Â¼Å¡' || cell === 'Nama:') {
          for (let k = j + 1; k < row.length; k++) {
            const nextCell = String(row[k]).trim();
            if (nextCell) { empName = nextCell.toLowerCase().trim(); break; }
          }
          if (empName) break;
        }
      }
      if (!empName) empName = findEmployeeNameInUploadRow_(row, targetNameMap);
      if (!empName || normalizeUploadText_(empName) !== normalizeUploadText_(user.nama)) continue;
      const dayNumberRow = up[i + 1] || [];
      let dayOffset = 0;
      for (let col = 0; col < dayNumberRow.length; col++) {
        const val = dayNumberRow[col];
        if (val === 1 || val === '1' || parseInt(val, 10) === 1) { dayOffset = col; break; }
      }
      const rawCellVal = (up[i + 2] || [])[dayOffset + (dayNum - 1)];
      const cellVal = rawCellVal instanceof Date && !isNaN(rawCellVal)
        ? String(rawCellVal)
        : String(rawCellVal || '').trim();
      const times = extractUploadTimes_(rawCellVal);
      uploadMatches.push({ headerRow: i + 1, attendanceRow: i + 3, dayOffset: dayOffset, cellValue: cellVal, times: times });
    }
  }

  const matrix = getAbsensiMatrix(bulanKey, user.id);
  let matrixDay = null;
  if (matrix && matrix.success && matrix.users && matrix.users[0] && matrix.users[0].days) matrixDay = matrix.users[0].days[dayNum] || null;
  return {
    success: true,
    version: 'debug-absensi-day-20260513a',
    user: user,
    tanggal: dateKey,
    bulan: bulanKey,
    uploadMatches: uploadMatches,
    rawRows: rawRows,
    appRows: appRows,
    anomaliRows: anomaliRows,
    detailRows: detailRows,
    matrixDay: matrixDay,
    diagnosis: {
      hasUploadTap: uploadMatches.some(function(x){ return x.times && x.times.length; }),
      hasAppTap: appRows.some(function(x){ return String(x.status).toUpperCase() === 'DITERIMA'; }),
      hasPendingAnomaly: anomaliRows.some(function(x){ return String(x.status).toUpperCase() === 'MENUNGGU'; }),
      hasDetailAbsen: detailRows.some(function(x){ return String(x.tipe).toUpperCase() === 'ABSEN'; }),
      matrixStillAbsent: !!(matrixDay && matrixDay.absen)
    }
  };
}

function ensureAuditLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('AUDIT_LOG');
  if (!sheet) sheet = ss.insertSheet('AUDIT_LOG');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Waktu','Actor','Action','Target','Before','After','Catatan']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendAuditLog_(actor, action, target, beforeVal, afterVal, catatan) {
  try {
    ensureAuditLogSheet_().appendRow([
      'AUD-' + Utilities.getUuid().substring(0, 8),
      new Date(),
      actor || '',
      action || '',
      target || '',
      beforeVal || '',
      afterVal || '',
      catatan || ''
    ]);
  } catch(e) {
    Logger.log('appendAuditLog_ error: ' + e);
  }
}

function getJadwalHariApp_(jadwalKhusus, tgl) {
  for (let j = 0; j < jadwalKhusus.length; j++) {
    const dari = new Date(jadwalKhusus[j].dari); dari.setHours(0,0,0,0);
    const sampai = new Date(jadwalKhusus[j].sampai); sampai.setHours(23,59,59,0);
    const cek = new Date(tgl); cek.setHours(12,0,0,0);
    if (cek >= dari && cek <= sampai) return jadwalKhusus[j];
  }
  return { jamMasuk: '08:00', jamPulang: '18:00' };
}

function getManualSyncContext_(ss, bulanKey) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const users = {};
  for (let i = 1; i < usersData.length; i++) {
    users[String(usersData[i][0])] = {
      id: String(usersData[i][0]),
      nama: usersData[i][1],
      bagian: usersData[i][3],
      jabatan: usersData[i][4],
      gajiBulanan: usersData[i][12] || 0
    };
  }
  const kalSheet = ss.getSheetByName('KALENDER_LIBUR');
  const kalData = kalSheet ? kalSheet.getDataRange().getValues() : [];
  const holidaySet = new Set();
  for (let i = 1; i < kalData.length; i++) {
    if (String(kalData[i][3]).toUpperCase() === 'YA' && kalData[i][1]) {
      const tgl = extractDateStr(kalData[i][1]);
      if (tgl && tgl.substring(0, 7) === bulanKey) holidaySet.add(tgl);
    }
  }
  const jadwalSheet = ss.getSheetByName('JADWAL_KHUSUS');
  const jadwalData = jadwalSheet ? jadwalSheet.getDataRange().getValues() : [];
  const jadwalKhusus = [];
  for (let i = 1; i < jadwalData.length; i++) {
    if (jadwalData[i][0] && jadwalData[i][1]) {
      jadwalKhusus.push({
        dari: new Date(jadwalData[i][0]),
        sampai: new Date(jadwalData[i][1]),
        jamMasuk: String(jadwalData[i][2] || '08:00').trim(),
        jamPulang: String(jadwalData[i][3] || '18:00').trim()
      });
    }
  }
  const p = bulanKey.split('-');
  const year = parseInt(p[0], 10), month = parseInt(p[1], 10);
  const totalHari = new Date(year, month, 0).getDate();
  let jumlahMinggu = 0;
  for (let d = 1; d <= totalHari; d++) if (new Date(year, month - 1, d).getDay() === 0) jumlahMinggu++;
  return { users, holidaySet, jadwalKhusus, hariKerjaEfektif: Math.max(1, totalHari - jumlahMinggu - holidaySet.size) };
}

function recalcUserWeekRekap_(ss, userId, weekStr) {
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const rekapSheet = ss.getSheetByName('ABSENSI_REKAP');
  if (!detailSheet || !rekapSheet) return;
  const data = detailSheet.getDataRange().getValues();
  const w = { hadir: 0, telat: 0, absen: 0, lemburMinggu: 0, lemburLibur: 0, totalDenda: 0 };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) !== String(userId) || String(data[i][2]) !== String(weekStr)) continue;
    const tipe = String(data[i][4] || '').toUpperCase();
    const nilai = parseInt(data[i][6] || 0, 10) || 0;
    if (tipe === 'HADIR') w.hadir++;
    else if (tipe === 'TELAT') { w.telat++; w.totalDenda += nilai; }
    else if (tipe === 'ABSEN') w.absen++;
    else if (tipe === 'LEMBUR_MINGGU') w.lemburMinggu++;
    else if (tipe === 'LEMBUR_LIBUR') w.lemburLibur++;
    else if (tipe === 'DENDA_SP' || tipe === 'DENDA_ANOMALI' || tipe === 'DENDA_MANUAL') w.totalDenda += nilai;
  }
  const masalah = w.absen + w.telat;
  const status = masalah >= 5 ? 'MERAH' : masalah >= 3 ? 'ORANGE' : masalah >= 1 ? 'KUNING' : 'BAIK';
  const rekapData = rekapSheet.getDataRange().getValues();
  for (let i = 1; i < rekapData.length; i++) {
    if (String(rekapData[i][1]) === String(userId) && String(rekapData[i][2]) === String(weekStr)) {
      rekapSheet.getRange(i + 1, 4, 1, 7).setValues([[w.hadir, w.telat, w.absen, w.lemburMinggu, w.lemburLibur, status, w.totalDenda]]);
      return;
    }
  }
  rekapSheet.appendRow(['RKP-' + Utilities.getUuid().substring(0,8), userId, weekStr, w.hadir, w.telat, w.absen, w.lemburMinggu, w.lemburLibur, status, w.totalDenda]);
}

function syncManualAttendanceDetail_(ss, userId, tanggal, jamMasuk, jamPulang, actor) {
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  if (!detailSheet) return { success: false, msg: 'Sheet ABSENSI_DETAIL tidak ditemukan.' };
  const bulanKey = tanggal.substring(0, 7);
  const ctx = getManualSyncContext_(ss, bulanKey);
  const user = ctx.users[String(userId)];
  if (!user) return { success: false, msg: 'Karyawan tidak ditemukan.' };
  const dateObj = dateFromDateStr_(tanggal);
  const weekStr = getWeekString(dateObj);
  const generatedTypes = { HADIR: true, TELAT: true, ABSEN: true, LEMBUR_PULANG: true, LEMBUR_MINGGU: true, LEMBUR_LIBUR: true, ANOMALI_PENDING: true };
  if (detailSheet.getLastRow() > 1) {
    const det = detailSheet.getDataRange().getValues();
    for (let i = det.length - 1; i >= 1; i--) {
      const uid = String(det[i][1]);
      const tgl = extractDateStr(det[i][3]);
      const tipe = String(det[i][4] || '').toUpperCase();
      const ket = String(det[i][5] || '');
      if (uid === String(userId) && tgl === tanggal && (generatedTypes[tipe] || ket.indexOf('[APP_SYNC]') !== -1 || ket.indexOf('[MANUAL_SYNC]') !== -1)) {
        detailSheet.deleteRow(i + 1);
      }
    }
  }

  const rows = [];
  const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const hariNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const tglLabel = dateObj.getDate() + ' ' + mNames[dateObj.getMonth()] + ' (' + hariNames[dateObj.getDay()] + ')';
  const isSunday = dateObj.getDay() === 0;
  const isHoliday = ctx.holidaySet.has(tanggal);
  const gajiHarian = Math.round((user.gajiBulanan || 0) / ctx.hariKerjaEfektif);
  const jadwal = getJadwalHariApp_(ctx.jadwalKhusus, dateObj);

  if (!jamMasuk && !jamPulang) {
    if (!isSunday && !isHoliday) {
      rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'ABSEN', '[MANUAL_SYNC] Tidak ada jam masuk/pulang - ' + tglLabel, 0]);
    }
  } else if (isSunday || isHoliday) {
    if (jamMasuk || jamPulang) {
      rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, isSunday ? 'LEMBUR_MINGGU' : 'LEMBUR_LIBUR', '[MANUAL_SYNC] Masuk hari ' + (isSunday ? 'Minggu' : 'libur') + ' - ' + tglLabel, gajiHarian]);
    }
  } else if (jamMasuk) {
    rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'HADIR', '[MANUAL_SYNC] Hadir - ' + tglLabel, 0]);
    const jm = String(jadwal.jamMasuk || '08:00').split(':');
    const masukParts = String(jamMasuk).split(':');
    const menitMasuk = parseInt(masukParts[0], 10) * 60 + parseInt(masukParts[1], 10);
    const menitWajib = parseInt(jm[0], 10) * 60 + parseInt(jm[1], 10);
    if (menitMasuk > menitWajib) {
      const menitTelat = menitMasuk - menitWajib;
      const denda = Math.ceil(menitTelat / 10) * 10000;
      rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'TELAT', '[MANUAL_SYNC] Masuk ' + jamMasuk + ', telat ' + menitTelat + ' menit - ' + tglLabel, denda]);
    }
    if (jamPulang) {
      const jp = String(jadwal.jamPulang || '18:00').split(':');
      const pulangParts = String(jamPulang).split(':');
      const menitPulang = parseInt(pulangParts[0], 10) * 60 + parseInt(pulangParts[1], 10);
      const menitNormal = parseInt(jp[0], 10) * 60 + parseInt(jp[1], 10);
      const selisih = menitPulang - menitNormal;
      if (selisih >= 60) {
        const lemburMenit = Math.floor(selisih / 30) * 30;
        const lemburJam = lemburMenit / 60;
        rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'LEMBUR_PULANG', '[MANUAL_SYNC] Pulang ' + jamPulang + ', lembur ' + lemburJam + ' jam - ' + tglLabel, Math.floor(lemburJam * 2) * 10000]);
      }
    }
  } else if (jamPulang) {
    rows.push(['DET-' + Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'ANOMALI_PENDING', '[MANUAL_SYNC] Ada jam pulang tanpa jam masuk - ' + tglLabel, 0]);
  }

  if (rows.length) detailSheet.getRange(detailSheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  recalcUserWeekRekap_(ss, userId, weekStr);
  return { success: true, week: weekStr, detailRows: rows.length };
}

function repairManualAttendanceSync_(ss, bulanKey, targetUserId) {
  const appSheet = ss.getSheetByName('ABSENSI_APP');
  if (!appSheet || appSheet.getLastRow() < 2) return { success: true, repaired: 0 };
  bulanKey = String(bulanKey || '').trim();
  targetUserId = String(targetUserId || '').trim();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'manual_repair_' + (bulanKey || 'all') + '_' + (targetUserId || 'all');
  if (cache.get(cacheKey)) return { success: true, cached: true, repaired: 0 };

  const data = appSheet.getDataRange().getValues();
  const grouped = {};
  for (let i = 1; i < data.length; i++) {
    const uid = String(data[i][1] || '').trim();
    if (!uid || (targetUserId && uid !== targetUserId)) continue;
    const tanggal = extractDateStr(data[i][3]);
    if (!tanggal || (bulanKey && tanggal.substring(0, 7) !== bulanKey)) continue;
    const tipe = String(data[i][5] || '').toUpperCase();
    if (['MASUK','PULANG','ABSEN'].indexOf(tipe) === -1) continue;
    const status = String(data[i][10] || '').toUpperCase();
    if (status !== 'DITERIMA') continue;
    const id = String(data[i][0] || '');
    const catatan = String(data[i][12] || '');
    const isManual = id.indexOf('APP-MANUAL-') === 0 || catatan.indexOf('Edit manual') !== -1 || catatan.indexOf('[MANUAL_SYNC]') !== -1;
    if (!isManual) continue;
    const key = uid + '|' + tanggal;
    if (!grouped[key]) grouped[key] = { userId: uid, tanggal: tanggal, masuk: '', pulang: '', manualAbsent: false };
    if (tipe === 'MASUK') grouped[key].masuk = extractAttendanceTime_(data[i][4]);
    else if (tipe === 'PULANG') grouped[key].pulang = extractAttendanceTime_(data[i][4]);
    else if (tipe === 'ABSEN') grouped[key].manualAbsent = true;
  }

  const keys = Object.keys(grouped);
  const repairedMonths = {};
  for (let i = 0; i < keys.length; i++) {
    const item = grouped[keys[i]];
    const masuk = item.manualAbsent ? '' : item.masuk;
    const pulang = item.manualAbsent ? '' : item.pulang;
    syncManualAttendanceDetail_(ss, item.userId, item.tanggal, masuk, pulang, 'Auto Repair');
    repairedMonths[item.tanggal.substring(0, 7)] = true;
  }
  const removeKeys = [];
  if (targetUserId) removeKeys.push('rekap_' + targetUserId, 'dashboard_' + targetUserId);
  Object.keys(repairedMonths).forEach(function(m) {
    removeKeys.push('rekap_bulanan_semua_' + m, 'payroll_preview_' + m);
  });
  if (removeKeys.length) {
    try { cache.removeAll(removeKeys); } catch(e) {}
  }
  try { cache.put(cacheKey, '1', keys.length ? 60 : 300); } catch(e) {}
  return { success: true, repaired: keys.length };
}

function processAbsensiAppToRekap(bulanKey, actor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  bulanKey = String(bulanKey || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM'));
  const p = bulanKey.split('-');
  const year = parseInt(p[0], 10);
  const month = parseInt(p[1], 10);
  if (!year || !month) return { success: false, msg: 'Bulan tidak valid.' };

  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const users = {};
  for (let i = 1; i < usersData.length; i++) {
    const bagian = usersData[i][3];
    if (usersData[i][6] !== 'AKTIF' || bagian === 'Owner' || bagian === 'Finance') continue;
    users[String(usersData[i][0])] = {
      id: String(usersData[i][0]),
      nama: usersData[i][1],
      bagian: bagian,
      jabatan: usersData[i][4],
      gajiBulanan: usersData[i][12] || 0
    };
  }

  const appSheet = ensureAbsensiAppSheet_();
  const appData = appSheet.getDataRange().getValues();
  const dayData = {};
  let acceptedRows = 0;
  for (let i = 1; i < appData.length; i++) {
    const uid = String(appData[i][1]);
    if (!users[uid]) continue;
    if (String(appData[i][10]).toUpperCase() !== 'DITERIMA') continue;
    const tgl = extractDateStr(appData[i][3]);
    if (!tgl || tgl.substring(0, 7) !== bulanKey) continue;
    const tipe = String(appData[i][5] || '').toUpperCase();
    const key = uid + '|' + tgl;
    if (tipe === 'ABSEN') {
      dayData[key] = { userId: uid, tanggal: tgl, masuk: '', pulang: '', manualAbsent: true };
      acceptedRows++;
      continue;
    }
    const jam = extractAttendanceTime_(appData[i][4]);
    if (!jam) continue;
    if (!dayData[key]) dayData[key] = { userId: uid, tanggal: tgl, masuk: '', pulang: '' };
    if (tipe === 'MASUK' && (!dayData[key].masuk || jam < dayData[key].masuk)) dayData[key].masuk = jam;
    if (tipe === 'PULANG' && (!dayData[key].pulang || jam > dayData[key].pulang)) dayData[key].pulang = jam;
    acceptedRows++;
  }
  if (acceptedRows === 0) return { success: false, msg: 'Belum ada data ABSENSI_APP diterima untuk bulan ini.' };

  const pendingAnomalyMap = {};
  const anomaliSheet = ss.getSheetByName('ANOMALI');
  if (anomaliSheet && anomaliSheet.getLastRow() > 1) {
    const anomData = anomaliSheet.getDataRange().getValues();
    for (let i = 1; i < anomData.length; i++) {
      if (String(anomData[i][5]).toUpperCase() !== 'MENUNGGU') continue;
      const uid = String(anomData[i][1]);
      const tgl = extractDateStr(anomData[i][2]);
      const fixedDay = dayData[uid + '|' + tgl];
      if (uid && tgl && tgl.substring(0, 7) === bulanKey && isPastDateKey_(tgl) && !(fixedDay && fixedDay.masuk && fixedDay.pulang)) pendingAnomalyMap[uid + '|' + tgl] = true;
    }
  }

  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const rekapSheet = ss.getSheetByName('ABSENSI_REKAP');
  if (!detailSheet || !rekapSheet) return { success: false, msg: 'Sheet ABSENSI_DETAIL atau ABSENSI_REKAP tidak ditemukan.' };

  const kalSheet = ss.getSheetByName('KALENDER_LIBUR');
  const kalData = kalSheet ? kalSheet.getDataRange().getValues() : [];
  const holidaySet = new Set();
  for (let i = 1; i < kalData.length; i++) {
    if (String(kalData[i][3]).toUpperCase() === 'YA' && kalData[i][1]) {
      const tgl = extractDateStr(kalData[i][1]);
      if (tgl && tgl.substring(0, 7) === bulanKey) holidaySet.add(tgl);
    }
  }

  const jadwalSheet = ss.getSheetByName('JADWAL_KHUSUS');
  const jadwalData = jadwalSheet ? jadwalSheet.getDataRange().getValues() : [];
  const jadwalKhusus = [];
  for (let i = 1; i < jadwalData.length; i++) {
    if (jadwalData[i][0] && jadwalData[i][1]) {
      jadwalKhusus.push({
        dari: new Date(jadwalData[i][0]),
        sampai: new Date(jadwalData[i][1]),
        jamMasuk: String(jadwalData[i][2] || '08:00').trim(),
        jamPulang: String(jadwalData[i][3] || '18:00').trim()
      });
    }
  }

  if (detailSheet.getLastRow() > 1) {
    const det = detailSheet.getDataRange().getValues();
    const generatedTypes = {
      ABSEN: true,
      HADIR: true,
      TELAT: true,
      LEMBUR_PULANG: true,
      LEMBUR_MINGGU: true,
      LEMBUR_LIBUR: true,
      ANOMALI_PENDING: true
    };
    for (let i = det.length - 1; i >= 1; i--) {
      const uid = String(det[i][1]);
      const tgl = extractDateStr(det[i][3]);
      const tipe = String(det[i][4] || '').toUpperCase();
      const ket = String(det[i][5] || '');
      if (users[uid] && tgl && tgl.substring(0, 7) === bulanKey && (ket.indexOf('[APP_SYNC]') !== -1 || generatedTypes[tipe])) {
        detailSheet.deleteRow(i + 1);
      }
    }
  }

  const totalHari = new Date(year, month, 0).getDate();
  let jumlahMinggu = 0;
  for (let d = 1; d <= totalHari; d++) if (new Date(year, month - 1, d).getDay() === 0) jumlahMinggu++;
  const hariKerjaEfektif = Math.max(1, totalHari - jumlahMinggu - holidaySet.size);
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const isCurrentMonth = todayKey.substring(0, 7) === bulanKey;
  const cutoffDay = isCurrentMonth ? parseInt(todayKey.substring(8, 10), 10) : totalHari;

  const weekly = {};
  function weekBucket(uid, weekStr) {
    const key = uid + '|' + weekStr;
    if (!weekly[key]) weekly[key] = {
      userId: uid, week: weekStr, hadir: 0, telat: 0, absen: 0,
      lemburMinggu: 0, lemburLibur: 0, totalDenda: 0, detailRows: []
    };
    return weekly[key];
  }

  const mNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const hariNames = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  Object.keys(users).forEach(function(uid) {
    for (let day = 1; day <= cutoffDay; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dateStr = fmtDate(dateObj);
      const weekStr = getWeekString(dateObj);
      const wd = weekBucket(uid, weekStr);
      const data = dayData[uid + '|' + dateStr] || { masuk: '', pulang: '' };
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = holidaySet.has(dateStr);
      const gajiHarian = Math.round((users[uid].gajiBulanan || 0) / hariKerjaEfektif);
      const tglLabel = day + ' ' + mNames[month - 1] + ' (' + hariNames[dateObj.getDay()] + ')';

      if (isSunday || isHoliday) {
        if (data.masuk) {
          if (isSunday) {
            wd.lemburMinggu++;
            wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'LEMBUR_MINGGU', '[APP_SYNC] Masuk hari Minggu - ' + tglLabel, gajiHarian]);
          } else {
            wd.lemburLibur++;
            wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'LEMBUR_LIBUR', '[APP_SYNC] Masuk hari libur - ' + tglLabel, gajiHarian]);
          }
        }
        continue;
      }

      if (!data.masuk) {
        if (pendingAnomalyMap[uid + '|' + dateStr]) {
          wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'ANOMALI_PENDING', '[APP_SYNC] Menunggu konfirmasi tap anomali - ' + tglLabel, 0]);
          continue;
        }
        if (!isCurrentMonth || day < cutoffDay) {
          wd.absen++;
          wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'ABSEN', '[APP_SYNC] Tidak ada tap masuk - ' + tglLabel, 0]);
        }
        continue;
      }

      wd.hadir++;
      wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'HADIR', '[APP_SYNC] Hadir - ' + tglLabel, 0]);
      const jadwal = getJadwalHariApp_(jadwalKhusus, dateObj);
      const jm = String(jadwal.jamMasuk || '08:00').split(':');
      const masukParts = data.masuk.split(':');
      const menitMasuk = parseInt(masukParts[0], 10) * 60 + parseInt(masukParts[1], 10);
      const menitWajib = parseInt(jm[0], 10) * 60 + parseInt(jm[1], 10);
      if (menitMasuk > menitWajib) {
        const menitTelat = menitMasuk - menitWajib;
        const denda = Math.ceil(menitTelat / 10) * 10000;
        wd.telat++;
        wd.totalDenda += denda;
        wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'TELAT', '[APP_SYNC] Masuk ' + data.masuk + ', telat ' + menitTelat + ' menit - ' + tglLabel, denda]);
      }

      if (data.pulang) {
        const jp = String(jadwal.jamPulang || '18:00').split(':');
        const pulangParts = data.pulang.split(':');
        const menitPulang = parseInt(pulangParts[0], 10) * 60 + parseInt(pulangParts[1], 10);
        const menitNormal = parseInt(jp[0], 10) * 60 + parseInt(jp[1], 10);
        const selisih = menitPulang - menitNormal;
        if (selisih >= 60) {
          const lemburMenit = Math.floor(selisih / 30) * 30;
          const lemburJam = lemburMenit / 60;
          const reward = Math.floor(lemburJam * 2) * 10000;
          wd.detailRows.push(['DET-' + Utilities.getUuid().substring(0,8), uid, weekStr, dateStr, 'LEMBUR_PULANG', '[APP_SYNC] Pulang ' + data.pulang + ', lembur ' + lemburJam + ' jam - ' + tglLabel, reward]);
        }
      }
    }
  });

  let detailCount = 0;
  const detailRows = [];
  Object.keys(weekly).forEach(function(key) {
    weekly[key].detailRows.forEach(function(r) { detailRows.push(r); });
  });
  if (detailRows.length) {
    detailSheet.getRange(detailSheet.getLastRow() + 1, 1, detailRows.length, 7).setValues(detailRows);
    detailCount = detailRows.length;
  }

  const rekapData = rekapSheet.getDataRange().getValues();
  let rekapCount = 0;
  Object.keys(weekly).forEach(function(key) {
    const w = weekly[key];
    const masalah = w.absen + w.telat;
    const status = masalah >= 5 ? 'MERAH' : masalah >= 3 ? 'ORANGE' : masalah >= 1 ? 'KUNING' : 'BAIK';
    let found = false;
    for (let i = 1; i < rekapData.length; i++) {
      if (String(rekapData[i][1]) === String(w.userId) && String(rekapData[i][2]) === String(w.week)) {
        rekapSheet.getRange(i + 1, 4, 1, 7).setValues([[w.hadir, w.telat, w.absen, w.lemburMinggu, w.lemburLibur, status, w.totalDenda]]);
        found = true;
        break;
      }
    }
    if (!found) rekapSheet.appendRow(['RKP-' + Utilities.getUuid().substring(0,8), w.userId, w.week, w.hadir, w.telat, w.absen, w.lemburMinggu, w.lemburLibur, status, w.totalDenda]);
    rekapCount++;
  });

  try {
    const keys = Object.keys(users).map(function(uid){ return 'rekap_' + uid; });
    keys.push.apply(keys, Object.keys(users).map(function(uid){ return 'dashboard_' + uid; }));
    keys.push('all_absensi_rekap', 'rekap_bulanan_semua_' + bulanKey);
    CacheService.getScriptCache().removeAll(keys);
  } catch(e) {}
  clearAbsensiMatrixCache_(bulanKey, Object.keys(users));

  appendAuditLog_(actor || 'System', 'PROCESS_ABSENSI_APP_TO_REKAP', bulanKey, '', 'detail=' + detailCount + '; rekap=' + rekapCount, 'Sumber ABSENSI_APP dengan tag [APP_SYNC]');
  return { success: true, bulan: bulanKey, acceptedRows: acceptedRows, detailRows: detailCount, rekapRows: rekapCount, msg: 'Rekap absensi kamera berhasil diproses.' };
}

function extractAttendanceTime_(raw) {
  if (!raw) return '';
  if (raw instanceof Date && !isNaN(raw)) {
    try { return Utilities.formatDate(raw, Session.getScriptTimeZone(), 'HH:mm:ss'); } catch(e) { return ''; }
  }
  return String(raw);
}

function timeToMinutes_(raw) {
  const jam = extractAttendanceTime_(raw);
  const m = String(jam || '').match(/(\d{1,2}):(\d{2})/);
  if (!m) return NaN;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function dateFromDateStr_(dateStr) {
  const p = String(dateStr || '').split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

function ensureAnomaliSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ANOMALI');
  if (!sheet) sheet = ss.insertSheet('ANOMALI');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 8).setValues([['ID','ID_User','Tanggal','Jam','Tipe','Status','Created_At','Deadline']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOfficeScheduleByDateStr_(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jadwalSheet = ss.getSheetByName('JADWAL_KHUSUS');
  const jadwalData = jadwalSheet ? jadwalSheet.getDataRange().getValues() : [];
  const jadwalKhusus = [];
  for (let i = 1; i < jadwalData.length; i++) {
    if (jadwalData[i][0] && jadwalData[i][1]) {
      jadwalKhusus.push({
        dari: new Date(jadwalData[i][0]),
        sampai: new Date(jadwalData[i][1]),
        jamMasuk: String(jadwalData[i][2] || '08:00').trim(),
        jamPulang: String(jadwalData[i][3] || '18:00').trim()
      });
    }
  }
  return getJadwalHariApp_(jadwalKhusus, dateFromDateStr_(dateStr));
}

function rejectImportedMasukForSingleEvening_(sheet, userId, tanggal, jam, actor) {
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  const data = sheet.getDataRange().getValues();
  const targetJam = extractAttendanceTime_(jam).substring(0, 5);
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0] || '');
    const catatan = String(data[i][12] || '');
    const isFingerprintImport = id.indexOf('APP-IMPORT-') === 0 || catatan.indexOf('[FINGERPRINT_IMPORT]') !== -1;
    if (!isFingerprintImport) continue;
    if (String(data[i][1]) !== String(userId)) continue;
    if (extractDateStr(data[i][3]) !== tanggal) continue;
    if (String(data[i][5] || '').toUpperCase() !== 'MASUK') continue;
    if (String(data[i][10] || '').toUpperCase() !== 'DITERIMA') continue;
    if (extractAttendanceTime_(data[i][4]).substring(0, 5) !== targetJam) continue;
    sheet.getRange(i + 1, 11).setValue('DITOLAK');
    sheet.getRange(i + 1, 13).setValue((catatan ? catatan + ' | ' : '') + 'Dibatalkan oleh ' + (actor || 'System') + ': single tap sore dipindah menjadi PULANG dan menunggu konfirmasi anomali.');
    count++;
  }
  return count;
}

function upsertAnomaliTap_(userId, tanggal, jam, tipe, actor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureAnomaliSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId) &&
        extractDateStr(data[i][2]) === tanggal &&
        String(data[i][4]) === String(tipe)) {
      return data[i][0];
    }
  }

  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 3);
  const anomId = 'ANM-' + Utilities.getUuid().substring(0, 8);
  sheet.appendRow([anomId, userId, tanggal, jam, tipe, 'MENUNGGU', now, deadline]);

  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let nama = String(userId), financeIds = [], ownerIds = [];
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) nama = usersData[i][1] || userId;
    if (usersData[i][6] === 'AKTIF' && usersData[i][3] === 'Finance') financeIds.push(usersData[i][0]);
    if (usersData[i][6] === 'AKTIF' && usersData[i][3] === 'Owner') ownerIds.push(usersData[i][0]);
  }

  const tglLabel = Utilities.formatDate(dateFromDateStr_(tanggal), 'Asia/Jakarta', 'dd MMM yyyy');
  const deadlineLabel = Utilities.formatDate(deadline, 'Asia/Jakarta', 'dd MMM yyyy');
  const tipeLabel = {
    HANYA_1_TAP_SORE: 'hanya ada tap sore/pulang jam ' + jam + ' tanpa tap masuk',
    LUPA_TAP_PULANG: 'hanya ada tap masuk jam ' + jam + ' tanpa tap pulang',
    TAP_MASUK_SORE: 'tap masuk jam ' + jam + ' terlalu sore'
  };
  addNotifikasi(userId, 'Tap fingerprint perlu konfirmasi', 'Tanggal ' + tglLabel + ' ' + (tipeLabel[tipe] || tipe) + '. Konfirmasi ke Finance sebelum ' + deadlineLabel + '.', 'PERINGATAN', 's-notifikasi');
  financeIds.concat(ownerIds).forEach(function(adminId) {
    addNotifikasi(adminId, 'Tap anomali baru', nama + ' tanggal ' + tglLabel + ' ' + (tipeLabel[tipe] || tipe) + '. Cek Kelola Izin > Tap Anomali.', 'PERINGATAN', 's-kelola-izin');
  });
  return anomId;
}

function getPayrollPeriod(bulanKey) {
  const p = String(bulanKey || '').split('-');
  const y = parseInt(p[0], 10), m = parseInt(p[1], 10);
  return { mulai: fmtDate(new Date(y, m - 1, 1)), akhir: fmtDate(new Date(y, m, 0)) };
}

function findPayrollRunByBulan(bulanKey) {
  const sheets = ensurePayrollSheets();
  const data = sheets.run.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(bulanKey)) {
      return { row: i + 1, id: data[i][0], bulan: data[i][1], periodeMulai: data[i][2], periodeAkhir: data[i][3], status: data[i][4], dibuatOleh: data[i][5], dibuatPada: data[i][6], dikonfirmasiOleh: data[i][7], dikonfirmasiPada: data[i][8], dipublishOleh: data[i][9], dipublishPada: data[i][10] };
    }
  }
  return null;
}

function buildPayrollPreviewFromRekap(bulanKey) {
  const rekap = getRekapBulananSemua(bulanKey);
  const data = (rekap.data || []).map(function(r) {
    const gajiPokok = parseInt(r.gajiPokok || 0, 10) || 0;
    const totalReward = parseInt(r.totalReward || 0, 10) || 0;
    const totalDenda = parseInt(r.totalDenda || 0, 10) || 0;
    const bonusKerajinan = parseInt(r.bonusKerajinan || 0, 10) || 0;
    const totalGaji = Math.max(0, gajiPokok + totalReward + bonusKerajinan - totalDenda);
    return {
      userId: r.userId, nama: r.nama, bagian: r.bagian, jabatan: r.jabatan,
      gajiPokok, hariKerja: rekap.hariKerja || 0,
      hadir: r.hadir || 0, absen: r.absen || 0, telat: r.telat || 0,
      lemburPulang: r.lemburPulang || 0, lemburMinggu: r.lemburMinggu || 0, lemburLibur: r.lemburLibur || 0,
      totalReward, totalDenda, bonusKerajinan,
      adjustmentPlus: 0, adjustmentMinus: 0, catatanAdjustment: '',
      totalGaji, statusSlip: 'DRAFT'
    };
  });
  const totalPayroll = data.reduce(function(s, r){ return s + (r.totalGaji || 0); }, 0);
  return { success: true, bulan: bulanKey, status: 'PREVIEW', hariKerja: rekap.hariKerja, totalPayroll, data };
}

function getPayrollPreview(bulanKey) {
  bulanKey = bulanKey || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
  const existing = findPayrollRunByBulan(bulanKey);
  if (existing) return getPayrollRunPayload(existing.id);
  return buildPayrollPreviewFromRekap(bulanKey);
}

function createPayrollDraft(bulanKey, dibuatOleh) {
  bulanKey = bulanKey || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
  const existing = findPayrollRunByBulan(bulanKey);
  if (existing) return getPayrollRunPayload(existing.id);

  const sheets = ensurePayrollSheets();
  const period = getPayrollPeriod(bulanKey);
  const runId = 'PAY-' + Utilities.getUuid().substring(0, 8);
  const now = new Date();
  const preview = buildPayrollPreviewFromRekap(bulanKey);
  sheets.run.appendRow([runId, bulanKey, period.mulai, period.akhir, 'DRAFT', dibuatOleh || '', now, '', '', '', '']);

  preview.data.forEach(function(r) {
    const detailId = 'PYD-' + Utilities.getUuid().substring(0, 8);
    sheets.detail.appendRow([detailId, runId, r.userId, r.nama, r.bagian, r.jabatan, r.gajiPokok, r.hariKerja, r.hadir, r.absen, r.telat, r.lemburPulang, r.lemburMinggu, r.lemburLibur, r.totalReward, r.totalDenda, r.bonusKerajinan, 0, 0, '', r.totalGaji, 'DRAFT']);
    appendPayrollItemsFromAbsensi_(sheets.item, detailId, r.userId, bulanKey);
  });
  return getPayrollRunPayload(runId);
}

function appendPayrollItemsFromAbsensi_(itemSheet, detailId, userId, bulanKey) {
  const rekap = getAbsensiRekap(userId);
  const bulan = (rekap.data || []).find(function(b){ return b.bulan === bulanKey; });
  if (!bulan) return;
  function add(tipe, d, nominalOverride) {
    itemSheet.appendRow(['PYI-' + Utilities.getUuid().substring(0, 8), detailId, tipe, d.tanggal || '', d.keterangan || '', nominalOverride !== undefined ? nominalOverride : (d.nilai || 0)]);
  }
  (bulan.detailDendaSP || []).forEach(function(d){ add('DENDA_SP', d); });
  (bulan.detailDendaManual || []).forEach(function(d){ add('DENDA_MANUAL', d); });
  (bulan.detailRewardManual || []).forEach(function(d){ add('REWARD_MANUAL', d); });
  (bulan.detailLemburPulang || []).forEach(function(d){ add('LEMBUR_PULANG', d); });
  (bulan.detailLemburMinggu || []).forEach(function(d){ add('LEMBUR_MINGGU', d); });
  (bulan.detailLemburLibur || []).forEach(function(d){ add('LEMBUR_LIBUR', d); });
  (bulan.detailAbsen || []).forEach(function(d){ add('ABSEN', d, 0); });
  if ((bulan.bonusKerajinan || 0) > 0) add('BONUS_KERAJINAN', { tanggal: '', keterangan: 'Bonus kerajinan bulan ' + bulanKey, nilai: bulan.bonusKerajinan });
}

function getPayrollRunPayload(payrollRunId) {
  const sheets = ensurePayrollSheets();
  const runData = sheets.run.getDataRange().getValues();
  let run = null;
  for (let i = 1; i < runData.length; i++) {
    if (String(runData[i][0]) === String(payrollRunId)) {
      run = { id: runData[i][0], bulan: runData[i][1], periodeMulai: runData[i][2], periodeAkhir: runData[i][3], status: runData[i][4], dibuatOleh: runData[i][5], dibuatPada: runData[i][6], dikonfirmasiOleh: runData[i][7], dikonfirmasiPada: runData[i][8], dipublishOleh: runData[i][9], dipublishPada: runData[i][10] };
      break;
    }
  }
  if (!run) return { success: false, msg: 'Payroll tidak ditemukan' };

  const detailData = sheets.detail.getDataRange().getValues();
  const data = [];
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    if (String(r[1]) !== String(payrollRunId)) continue;
    data.push({ id: r[0], payrollRunId: r[1], userId: r[2], nama: r[3], bagian: r[4], jabatan: r[5], gajiPokok: r[6] || 0, hariKerja: r[7] || 0, hadir: r[8] || 0, absen: r[9] || 0, telat: r[10] || 0, lemburPulang: r[11] || 0, lemburMinggu: r[12] || 0, lemburLibur: r[13] || 0, totalReward: r[14] || 0, totalDenda: r[15] || 0, bonusKerajinan: r[16] || 0, adjustmentPlus: r[17] || 0, adjustmentMinus: r[18] || 0, catatanAdjustment: r[19] || '', totalGaji: r[20] || 0, statusSlip: r[21] || run.status });
  }
  const totalPayroll = data.reduce(function(s, r){ return s + (parseInt(r.totalGaji, 10) || 0); }, 0);
  return Object.assign({ success: true, totalPayroll, data }, run);
}

function setPayrollStatus_(payrollRunId, status, actor) {
  const sheets = ensurePayrollSheets();
  const data = sheets.run.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(payrollRunId)) continue;
    if (status === 'CONFIRMED') {
      sheets.run.getRange(i + 1, 5).setValue('CONFIRMED');
      sheets.run.getRange(i + 1, 8).setValue(actor || '');
      sheets.run.getRange(i + 1, 9).setValue(now);
    } else if (status === 'PUBLISHED') {
      sheets.run.getRange(i + 1, 5).setValue('PUBLISHED');
      sheets.run.getRange(i + 1, 10).setValue(actor || '');
      sheets.run.getRange(i + 1, 11).setValue(now);
      markPayrollDetailsPublished_(payrollRunId);
      notifyPayrollPublished_(payrollRunId);
    }
    return getPayrollRunPayload(payrollRunId);
  }
  return { success: false, msg: 'Payroll tidak ditemukan' };
}

function confirmPayroll(payrollRunId, confirmedBy) {
  return setPayrollStatus_(payrollRunId, 'CONFIRMED', confirmedBy);
}

function publishPayroll(payrollRunId, publishedBy) {
  return setPayrollStatus_(payrollRunId, 'PUBLISHED', publishedBy);
}

function markPayrollDetailsPublished_(payrollRunId) {
  const sheets = ensurePayrollSheets();
  const data = sheets.detail.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(payrollRunId)) sheets.detail.getRange(i + 1, 22).setValue('PUBLISHED');
  }
}

function notifyPayrollPublished_(payrollRunId) {
  const payload = getPayrollRunPayload(payrollRunId);
  if (!payload.success) return;
  payload.data.forEach(function(d) {
    try { addNotifikasi(d.userId, 'Slip gaji tersedia', 'Slip gaji periode ' + payload.bulan + ' sudah tersedia di menu Slip Gaji.', 'INFO', 's-slip-gaji'); } catch(e) {}
  });
}

function getPayrollEmployeeSlip(userId) {
  const sheets = ensurePayrollSheets();
  const runData = sheets.run.getDataRange().getValues();
  const runMap = {};
  for (let i = 1; i < runData.length; i++) {
    if (String(runData[i][4]) === 'PUBLISHED') runMap[String(runData[i][0])] = { bulan: runData[i][1], dipublishPada: runData[i][10] };
  }
  const detailData = sheets.detail.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    const run = runMap[String(r[1])];
    if (!run || String(r[2]) !== String(userId)) continue;
    result.push({ id: r[0], payrollRunId: r[1], bulan: run.bulan, dipublishPada: run.dipublishPada, totalGaji: r[20] || 0, totalReward: r[14] || 0, totalDenda: r[15] || 0, bonusKerajinan: r[16] || 0 });
  }
  result.sort(function(a,b){ return String(b.bulan).localeCompare(String(a.bulan)); });
  return { success: true, data: result };
}

function getPayrollDetail(payrollDetailId) {
  const sheets = ensurePayrollSheets();
  const detailData = sheets.detail.getDataRange().getValues();
  let detail = null;
  for (let i = 1; i < detailData.length; i++) {
    const r = detailData[i];
    if (String(r[0]) !== String(payrollDetailId)) continue;
    detail = {
      id: r[0], payrollRunId: r[1], userId: r[2], nama: r[3], bagian: r[4], jabatan: r[5],
      gajiPokok: r[6] || 0, hariKerja: r[7] || 0, hadir: r[8] || 0, absen: r[9] || 0, telat: r[10] || 0,
      lemburPulang: r[11] || 0, lemburMinggu: r[12] || 0, lemburLibur: r[13] || 0,
      totalReward: r[14] || 0, totalDenda: r[15] || 0, bonusKerajinan: r[16] || 0,
      adjustmentPlus: r[17] || 0, adjustmentMinus: r[18] || 0, catatanAdjustment: r[19] || '',
      totalGaji: r[20] || 0, statusSlip: r[21] || ''
    };
    break;
  }
  if (!detail) return { success: false, msg: 'Detail payroll tidak ditemukan' };

  const itemData = sheets.item.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < itemData.length; i++) {
    const r = itemData[i];
    if (String(r[1]) === String(payrollDetailId)) items.push({ id: r[0], tipe: r[2], tanggal: r[3], keterangan: r[4], nominal: r[5] || 0 });
  }
  return { success: true, detail, items };
}

function getPayrollRunStatus_(payrollRunId) {
  const sheets = ensurePayrollSheets();
  const data = sheets.run.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payrollRunId)) return String(data[i][4] || '');
  }
  return '';
}

function updatePayrollAdjustment(payrollDetailId, adjustmentPlus, adjustmentMinus, catatan) {
  const sheets = ensurePayrollSheets();
  const data = sheets.detail.getDataRange().getValues();
  const plus = Math.max(0, parseInt(adjustmentPlus || 0, 10) || 0);
  const minus = Math.max(0, parseInt(adjustmentMinus || 0, 10) || 0);
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (String(r[0]) !== String(payrollDetailId)) continue;
    const status = getPayrollRunStatus_(r[1]);
    if (status === 'PUBLISHED') return { success: false, msg: 'Slip sudah dipublish dan tidak bisa diubah' };

    const gajiPokok = parseInt(r[6] || 0, 10) || 0;
    const totalReward = parseInt(r[14] || 0, 10) || 0;
    const totalDenda = parseInt(r[15] || 0, 10) || 0;
    const bonusKerajinan = parseInt(r[16] || 0, 10) || 0;
    const totalGaji = Math.max(0, gajiPokok + totalReward + bonusKerajinan + plus - totalDenda - minus);

    sheets.detail.getRange(i + 1, 18).setValue(plus);
    sheets.detail.getRange(i + 1, 19).setValue(minus);
    sheets.detail.getRange(i + 1, 20).setValue(catatan || '');
    sheets.detail.getRange(i + 1, 21).setValue(totalGaji);
    upsertPayrollAdjustmentItems_(payrollDetailId, plus, minus, catatan || '');
    return getPayrollDetail(payrollDetailId);
  }
  return { success: false, msg: 'Detail payroll tidak ditemukan' };
}

function upsertPayrollAdjustmentItems_(payrollDetailId, plus, minus, catatan) {
  const sheets = ensurePayrollSheets();
  const data = sheets.item.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(payrollDetailId) && (String(data[i][2]) === 'ADJUSTMENT_PLUS' || String(data[i][2]) === 'ADJUSTMENT_MINUS')) {
      sheets.item.deleteRow(i + 1);
    }
  }
  if (plus > 0) sheets.item.appendRow(['PYI-' + Utilities.getUuid().substring(0, 8), payrollDetailId, 'ADJUSTMENT_PLUS', '', catatan || 'Adjustment tambahan', plus]);
  if (minus > 0) sheets.item.appendRow(['PYI-' + Utilities.getUuid().substring(0, 8), payrollDetailId, 'ADJUSTMENT_MINUS', '', catatan || 'Adjustment potongan', minus]);
}

function getPayrollEmployeeSlipDetail(userId, payrollRunId) {
  const payload = getPayrollRunPayload(payrollRunId);
  if (!payload.success || payload.status !== 'PUBLISHED') return { success: false, msg: 'Slip belum tersedia' };
  const detail = payload.data.find(function(d){ return String(d.userId) === String(userId); });
  if (!detail) return { success: false, msg: 'Slip tidak ditemukan' };
  const sheets = ensurePayrollSheets();
  const itemData = sheets.item.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < itemData.length; i++) {
    const r = itemData[i];
    if (String(r[1]) === String(detail.id)) items.push({ id: r[0], tipe: r[2], tanggal: r[3], keterangan: r[4], nominal: r[5] || 0 });
  }
  return { success: true, slip: detail, bulan: payload.bulan, items };
}

function getKalenderLibur() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KALENDER_LIBUR').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    let tgl = '';
    try { tgl = Utilities.formatDate(new Date(data[i][1]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(data[i][1]); }
    result.push({ id: data[i][0], tanggal: tgl, nama: data[i][2], difasilitasi: data[i][3] });
  }
  return result.reverse();
}

function addLibur(tanggal, namaLibur, dibuatOleh) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('KALENDER_LIBUR');
  const id = 'LBR-'+String(sheet.getLastRow()).padStart(3,'0');
  sheet.appendRow([id, new Date(tanggal), namaLibur, 'YA', dibuatOleh, new Date()]);
  return { success: true };
}

// ─── PERATURAN ────────────────────────────────────
function getPeraturan() {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PERATURAN').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++)
    if (data[i][2]) result.push({ no: data[i][0], kategori: data[i][1], isi: data[i][2] });
  return result;
}

// ─── PENGATURAN ───────────────────────────────────
function getPengaturan() {
  try {
    const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PENGATURAN').getDataRange().getValues();
    const result = {};
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) result[String(data[i][0]).trim()] = String(data[i][1]||'').trim();
    }
    return result;
  } catch(e) { return {}; }
}

function updateEmail(userId, email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      sheet.getRange(i+1, 6).setValue(email);
      return { success: true };
    }
  }
  return { success: false };
}

// ─── REWARD & PENALTY MANUAL ────────────────────
function addSanksiManual(buatOleh, targetUserId, tipe, nominal, keterangan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  if (!detailSheet) return { success: false, msg: 'Sheet ABSENSI_DETAIL tidak ditemukan' };

  // Real-time only — gunakan timestamp sekarang (Jakarta)
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');
  // nowStr = "2026-04-09 17:35" — tidak pernah berubah setelah disimpan
  // Month: nowStr.substring(0,7) = "2026-04"
  // Date:  nowStr.substring(0,10) = "2026-04-09"
  // Time:  nowStr.substring(11,16) = "17:35"

  const tglDate = new Date(); // only for weekStr calculation
  const weekStr = getWeekString(tglDate);
  const id = 'DET-'+Utilities.getUuid().substring(0,8);
  const ket = keterangan + ' (oleh '+buatOleh+')';

  // Simpan nowStr sebagai TEXT
  const newRow = detailSheet.getLastRow() + 1;
  detailSheet.appendRow([id, targetUserId, weekStr, nowStr, tipe, ket, parseInt(nominal)||0]);
  detailSheet.getRange(newRow, 4).setNumberFormat('@');

  // Notif ke karyawan
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const isDenda = tipe === 'DENDA_MANUAL';
  const tglLabel = nowStr.substring(8,10)+' '+['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(nowStr.substring(5,7))-1]+' '+nowStr.substring(11,16);
  addNotifikasi(targetUserId,
    isDenda ? '💸 Penalty Manual Dikenakan' : '🎁 Reward Manual Ditambahkan',
    (isDenda ? '⚠️ Penalty' : '🎁 Reward')+' Rp '+parseInt(nominal).toLocaleString('id-ID')+
    ' pada '+tglLabel+'.\n📝 '+keterangan,
    isDenda ? 'PERINGATAN' : 'INFO', 's-notifikasi'
  );

  // Invalidate cache user yang terdampak
  try {
    CacheService.getScriptCache().removeAll(['dashboard_'+targetUserId, 'rekap_'+targetUserId, 'rekap_bulanan_semua_' + nowStr.substring(0,7)]);
  } catch(e) {}

  return { success: true, id };
}

function batalSanksiManual(detailId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ABSENSI_DETAIL');
  if (!sheet) return { success: false };
  const data = sheet.getDataRange().getValues();
  for (let i = data.length-1; i >= 1; i--) {
    if (data[i][0] === detailId && (data[i][4] === 'DENDA_MANUAL' || data[i][4] === 'REWARD_MANUAL')) {
      const userId = data[i][1];
      const tipe = data[i][4];
      const nominal = data[i][6];
      const bulanKey = extractMonthKey(data[i][3]);
      sheet.deleteRow(i+1);
      addNotifikasi(userId,
        tipe === 'DENDA_MANUAL' ? '✅ Denda Manual Dibatalkan' : '✅ Reward Manual Dibatalkan',
        'Sanksi sebesar Rp '+parseInt(nominal).toLocaleString('id-ID')+' telah dibatalkan.',
        'INFO', 's-notifikasi'
      );
      try { CacheService.getScriptCache().removeAll(['dashboard_'+userId, 'rekap_'+userId, 'rekap_bulanan_semua_' + bulanKey]); } catch(e) {}
      return { success: true };
    }
  }
  return { success: false, msg: 'Sanksi tidak ditemukan' };
}

function getSanksiManual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName('ABSENSI_DETAIL').getDataRange().getValues();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = usersData[i][1];
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'DENDA_MANUAL' || data[i][4] === 'REWARD_MANUAL') {
      let tgl = '';
      try { tgl = Utilities.formatDate(new Date(data[i][3]), 'Asia/Jakarta', 'dd MMM yyyy HH:mm'); } catch(e) {}
      result.push({ id: data[i][0], userId: data[i][1], nama: userMap[data[i][1]]||'-', tipe: data[i][4], keterangan: data[i][5], nominal: data[i][6]||0, tgl });
    }
  }
  return result.reverse().slice(0,30);
}

function triggerNotifPeraturan(keterangan) {
  // Dipanggil Owner setelah update peraturan di Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const judul = '📋 Peraturan Diperbarui';
  const isi = keterangan || 'Ada peraturan yang baru diperbarui. Mohon dibaca dan dipahami.';
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][6] === 'AKTIF' && usersData[i][3] !== 'Owner') {
      addNotifikasi(usersData[i][0], judul, isi, 'INFO', 's-peraturan');
    }
  }
  return { success: true };
}

// ─── EMAIL NOTIFICATIONS ──────────────────────────
function kirimEmailPengumuman(judul, isi, kategori, targetBagian) {
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const subject = '📢 PENGUMUMAN HOSELA — ' + judul;
  const body = '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">'+
    '<div style="background:#0e4fa3;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">📢 Pengumuman Hosela Hub</h2></div>'+
    '<div style="background:#f7f9fc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">'+
    '<div style="display:inline-block;background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-size:12px;margin-bottom:12px">'+kategori+'</div>'+
    '<h3 style="color:#1e3a5f;margin:0 0 10px">'+judul+'</h3>'+
    '<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 16px">'+isi+'</p>'+
    '</div></div>';
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    if (row[6] !== 'AKTIF' || !row[5] || row[3] === 'Owner') continue;
    if (targetBagian !== 'ALL' && row[3] !== targetBagian) continue;
    try { MailApp.sendEmail({ to: String(row[5]).trim(), subject, htmlBody: body }); } catch(e) { Logger.log(e); }
  }
}

function reminderUploadAbsensi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const rawData = ss.getSheetByName('ABSENSI_RAW').getDataRange().getValues();
  const lastMonday = new Date(); lastMonday.setDate(lastMonday.getDate()-7);
  const weekStr = getWeekString(lastMonday);
  for (let i = 1; i < rawData.length; i++) if (rawData[i][5] === weekStr) return;
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    if (row[3] === 'Finance' && row[6] === 'AKTIF' && row[5]) {
      const subject = '⚠️ HOSELA HUB — Update Data Absensi Minggu Ini';
      const body = '<div style="font-family:sans-serif;max-width:480px"><div style="background:#c2410c;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">⚠️ Reminder Upload Absensi</h2></div><div style="background:#fff7ed;padding:20px;border-radius:0 0 8px 8px;border:1px solid #fed7aa"><p style="color:#92400e">Data absensi minggu <b>'+weekStr+'</b> belum diperbarui. Silakan upload melalui Hosela Hub.</p></div></div>';
      try { MailApp.sendEmail({ to: String(row[5]).trim(), subject, htmlBody: body }); } catch(e) { Logger.log(e); }
    }
  }
}

function reminderKPIChecklist() {
  // Kirim reminder KPI hanya ke karyawan yang belum submit minggu berjalan.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const kpiSheet = ss.getSheetByName('KPI_LAPORAN');
  const kpiData = kpiSheet ? kpiSheet.getDataRange().getValues() : [];
  const weekStr = getWeekString(new Date());
  const submitted = {};
  for (let i = 1; i < kpiData.length; i++) {
    if (String(kpiData[i][2]) === weekStr) submitted[String(kpiData[i][1])] = true;
  }

  const notifSheet = ss.getSheetByName('NOTIFIKASI');
  const notifData = notifSheet ? notifSheet.getDataRange().getValues() : [];
  const title = 'Reminder KPI Checklist ' + weekStr;
  const alreadyReminded = {};
  for (let i = 1; i < notifData.length; i++) {
    if (String(notifData[i][2]) === title) alreadyReminded[String(notifData[i][1])] = true;
  }

  const subject = 'HOSELA HUB - Reminder KPI Checklist ' + weekStr;
  const body = '<div style="font-family:sans-serif;max-width:480px"><div style="background:#1557d8;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">Reminder KPI Checklist</h2></div><div style="background:#f7f9fc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0"><p style="color:#1e3a5f">Kamu belum mengisi KPI Checklist minggu ini.</p><p style="color:#6b7280">Buka Hosela Hub &gt; KPI Checklist, lalu isi dan kirim sebelum akhir hari ini.</p></div></div>';
  let sent = 0;
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    const userId = String(row[0]);
    if (row[6] !== 'AKTIF' || row[3] === 'Owner') continue;
    if (submitted[userId] || alreadyReminded[userId]) continue;
    addNotifikasi(userId, title, 'Kamu belum mengisi KPI Checklist minggu ' + weekStr + '. Segera isi dari menu KPI Checklist hari ini.', 'PERINGATAN', 's-kpi-check');
    sent++;
    if (row[5]) {
      try { MailApp.sendEmail({ to: String(row[5]).trim(), subject, htmlBody: body }); } catch(e) { Logger.log(e); }
    }
  }
  Logger.log('reminderKPIChecklist week=' + weekStr + ' sent=' + sent);
}

function notifOwnerAbsensiMerah() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const rekapData = ss.getSheetByName('ABSENSI_REKAP').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = { nama: usersData[i][1], bagian: usersData[i][3] };
  const weeks = rekapData.slice(1).map(function(r){ return r[2]; }).sort();
  const latestWeek = weeks[weeks.length-1];
  if (!latestWeek) return;
  const bermasalah = [];
  for (let i = 1; i < rekapData.length; i++) {
    const r = rekapData[i];
    if (r[2] === latestWeek && (r[8] === 'MERAH' || r[8] === 'ORANGE')) {
      const u = userMap[r[1]]||{ nama:'-', bagian:'-' };
      bermasalah.push({ nama: u.nama, bagian: u.bagian, hadir: r[3], telat: r[4], absen: r[5], status: r[8] });
    }
  }
  if (!bermasalah.length) return;
  for (let i = 1; i < usersData.length; i++) {
    const row = usersData[i];
    if (row[3] === 'Owner' && row[6] === 'AKTIF' && row[5]) {
      const rows = bermasalah.map(function(b){
        return '<tr style="background:'+(b.status==='MERAH'?'#fee2e2':'#fff7ed')+'"><td style="padding:8px">'+b.nama+'</td><td style="padding:8px">'+b.bagian+'</td><td style="padding:8px;text-align:center">'+b.hadir+'</td><td style="padding:8px;text-align:center">'+b.telat+'</td><td style="padding:8px;text-align:center">'+b.absen+'</td><td style="padding:8px;text-align:center;font-weight:600">'+b.status+'</td></tr>';
      }).join('');
      const subject = '🚨 HOSELA HUB — '+bermasalah.length+' Karyawan Perlu Perhatian';
      const body = '<div style="font-family:sans-serif;max-width:560px"><div style="background:#0e4fa3;padding:20px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">🚨 Laporan Absensi</h2></div><div style="background:#f7f9fc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0e4fa3"><th style="padding:8px;color:#fff;text-align:left">Nama</th><th style="padding:8px;color:#fff;text-align:left">Bagian</th><th style="padding:8px;color:#fff">Hadir</th><th style="padding:8px;color:#fff">Telat</th><th style="padding:8px;color:#fff">Absen</th><th style="padding:8px;color:#fff">Status</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
      try { MailApp.sendEmail({ to: String(row[5]).trim(), subject, htmlBody: body }); } catch(e) { Logger.log(e); }
    }
  }
}

// ─── SETUP KPI TEMPLATE ───────────────────────────
function setupKPITemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('KPI_TEMPLATE');
  sheet.clearContents();
  sheet.getRange(1,1,1,5).setValues([['ID_KPI','Posisi','No','Indikator','Keterangan']]);
  const data = [
    ['KT-001','Admin Packing',1,'Akurasi Stock','Tidak ada selisih antara fisik dan sistem'],
    ['KT-002','Admin Packing',2,'Kecepatan Inbound','Barang datang siap jual dalam ≤24 jam'],
    ['KT-003','Admin Packing',3,'Support Order','Tidak ada order delay karena admin packing'],
    ['KT-004','Admin Packing',4,'Penempatan & Labeling','Barang mudah dicari, tidak salah lokasi'],
    ['KT-005','Admin Packing',5,'Laporan Harian','Stok masuk/keluar selalu update setiap hari'],
    ['KT-006','Admin Packing',6,'Kontrol Stok Kritis','Tidak ada stok habis tanpa warning sebelumnya'],
    ['KT-007','Admin Packing',7,'Kebersihan Area','Area packing bersih dan rapi setiap hari'],
    ['KT-008','Kepala Gudang',1,'Akurasi Stock','Tidak ada selisih antara fisik dan sistem'],
    ['KT-009','Kepala Gudang',2,'Kecepatan Inbound','Barang datang siap jual dalam ≤24 jam'],
    ['KT-010','Kepala Gudang',3,'Support Order','Tidak ada order delay karena admin packing'],
    ['KT-011','Kepala Gudang',4,'Penempatan & Labeling','Barang mudah dicari, tidak salah lokasi'],
    ['KT-012','Kepala Gudang',5,'Laporan Harian','Stok masuk/keluar selalu update setiap hari'],
    ['KT-013','Kepala Gudang',6,'Kontrol Stok Kritis','Tidak ada stok habis tanpa warning sebelumnya'],
    ['KT-014','Kepala Gudang',7,'Kebersihan Area','Area packing bersih dan rapi setiap hari'],
    ['KT-015','Host Live',1,'Durasi Live','Minimal 2 jam per sesi tanpa gangguan'],
    ['KT-016','Host Live',2,'Produk Ditampilkan','Minimal 15 produk per sesi live'],
    ['KT-017','Host Live',3,'Zero Gangguan Teknis','Tidak ada gangguan karena kelalaian host'],
    ['KT-018','Host Live',4,'Respon Viewer','Pertanyaan viewer direspon cepat dan baik'],
    ['KT-019','Host Live',5,'Pencatatan Order','Semua order dicatat dengan benar saat live'],
    ['KT-020','Host Live',6,'Standar Penampilan','Penampilan dan komunikasi sesuai standar Hosela'],
    ['KT-021','Host Live',7,'Laporan Live','Laporan hasil live dikirim setelah sesi selesai'],
    ['KT-022','Admin Ecommerce',1,'Proses Order','Semua order diproses hari itu juga'],
    ['KT-023','Admin Ecommerce',2,'Respon Chat','Chat dibalas maksimal dalam 1 jam'],
    ['KT-024','Admin Ecommerce',3,'Sinkronisasi Stok','Stok di semua platform selalu sinkron'],
    ['KT-025','Admin Ecommerce',4,'Handling Review','Review negatif ditanggapi hari itu'],
    ['KT-026','Admin Ecommerce',5,'Monitor Iklan','Iklan dan campaign aktif dipantau setiap hari'],
    ['KT-027','Admin Ecommerce',6,'Upload Produk','Upload produk baru sesuai target mingguan'],
    ['KT-028','Admin Ecommerce',7,'Zero Komplain Terlambat','Tidak ada komplain keterlambatan dari pelanggan'],
    ['KT-029','Finance',1,'Laporan Harian','Laporan keuangan selesai sebelum jam 20.00'],
    ['KT-030','Finance',2,'Pencatatan Pengeluaran','Semua pengeluaran tercatat lengkap tanpa selisih'],
    ['KT-031','Finance',3,'Rekap Mingguan','Rekap mingguan dikirim ke owner setiap Senin'],
    ['KT-032','Finance',4,'Upload Absensi','Data absensi diupload tepat waktu setiap minggu'],
    ['KT-033','Finance',5,'Akurasi Input','Tidak ada kesalahan input nominal transaksi'],
    ['KT-034','Finance',6,'Pembayaran Vendor','Tagihan dan pembayaran vendor tidak ada yang terlewat'],
    ['KT-035','Finance',7,'Kecocokan Kas','Kas fisik selalu cocok dengan catatan digital'],
  ];
  sheet.getRange(2,1,data.length,5).setValues(data);

  const lapSheet = ss.getSheetByName('KPI_LAPORAN');
  lapSheet.clearContents();
  lapSheet.getRange(1,1,1,8).setValues([['ID_Laporan','ID_User','Minggu','ID_KPI','Indikator','Selesai','Catatan','Tgl_Submit']]);
  Logger.log('KPI Template berhasil diisi!');
}

// ─── ANOMALI ─────────────────────────────────────
function getAnomaliPending() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureAnomaliSheet_();
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = usersData[i][1];
  const result = [];
  const tipeLabel = { HANYA_1_TAP_SORE: 'Hanya 1 tap (sore/malam)', LUPA_TAP_PULANG: 'Lupa tap pulang', TAP_MASUK_SORE: 'Tap masuk jam sore' };
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'MENUNGGU') {
      let tgl = '', deadline = '';
      const dateKey = extractDateStr(data[i][2]);
      if (!isPastDateKey_(dateKey)) continue;
      if (hasCompleteAttendanceForDay_(ss, data[i][1], dateKey)) {
        autoResolveAnomaliForDay_(data[i][1], dateKey, 'System');
        continue;
      }
      try { tgl = Utilities.formatDate(new Date(data[i][2]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(data[i][2]); }
      try { deadline = Utilities.formatDate(new Date(data[i][7]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { deadline = String(data[i][7]); }
      result.push({ id: data[i][0], userId: data[i][1], nama: userMap[data[i][1]]||'-', tanggal: tgl, jam: data[i][3], tipe: tipeLabel[data[i][4]]||data[i][4], deadline });
    }
  }
  return result;
}

function konfirmasiAnomali(anomId, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureAnomaliSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] !== anomId) continue;
    sheet.getRange(i+1, 6).setValue(status);
    const userId = data[i][1];
    const rawTipe = String(data[i][4] || '');
    const tanggalKey = extractDateStr(data[i][2]);
    const bulanKey = tanggalKey ? tanggalKey.substring(0, 7) : '';
    let syncResult = null;
    let tglStr = '';
    try { tglStr = Utilities.formatDate(new Date(data[i][2]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tglStr = String(data[i][2]); }
    if (status === 'NORMAL') {
      try {
        if ((rawTipe === 'HANYA_1_TAP_SORE' || rawTipe === 'TAP_MASUK_SORE') && tanggalKey) {
          const jadwal = getOfficeScheduleByDateStr_(tanggalKey);
          const jamMasuk = String(jadwal.jamMasuk || '08:00').substring(0, 5);
          syncResult = updateAbsensiMatrixDay(userId, tanggalKey, jamMasuk, '', 'Normalisasi tap anomali: ' + rawTipe, 'Finance');
        } else if (bulanKey) {
          syncResult = processAbsensiAppToRekap(bulanKey, 'Finance');
        }
      } catch(e) { Logger.log(e); }
      try { kurangiAbsenDariIzin(userId, new Date(data[i][2])); } catch(e) { Logger.log(e); }
      addNotifikasi(userId, '✅ Tap Anomali Dikonfirmasi Normal', 'Finance mengkonfirmasi tap fingerprint '+tglStr+' sebagai normal. Tidak ada denda.', 'INFO', 's-notifikasi');
    } else {
      const bulan = fmtDate(new Date(data[i][2])).substring(0,7);
      const jumlahDenda = hitungJumlahAnomali(userId, bulan, ss) + 1;
      let dendaAnomali = jumlahDenda === 1 ? 10000 : jumlahDenda === 2 ? 20000 : 50000;
      addNotifikasi(userId, '💸 Denda Tap Fingerprint', 'Tap anomali '+tglStr+' dikenakan denda Rp '+dendaAnomali.toLocaleString('id-ID')+'.', 'PERINGATAN', 's-notifikasi');
      const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
      if (detailSheet) {
        const weekStr = getWeekString(new Date(data[i][2]));
        detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, data[i][2], 'DENDA_ANOMALI', 'Denda tap anomali: '+(data[i][4]), dendaAnomali]);
      }
      // Notif keras 4x ke owner
      const jumlahTotal = hitungJumlahAnomali(userId, bulan, ss) + 1;
      if (jumlahTotal >= 4) {
        const usersD = ss.getSheetByName('USERS').getDataRange().getValues();
        let namaUser = userId, ownerEmail = '';
        for (let j = 1; j < usersD.length; j++) {
          if (String(usersD[j][0]) === String(userId)) namaUser = usersD[j][1];
          if (usersD[j][3] === 'Owner' && usersD[j][6] === 'AKTIF' && usersD[j][5]) ownerEmail = String(usersD[j][5]).trim();
        }
        addNotifikasi(userId, '🚨 Peringatan Keras — Tap Fingerprint', 'Kamu sudah '+jumlahTotal+'x melakukan kesalahan tap fingerprint bulan ini. Ini menunjukkan ketidakpatuhan terhadap peraturan perusahaan. Segera perbaiki dan akan dilaporkan ke owner.', 'PERINGATAN', 's-notifikasi');
        if (ownerEmail) { try { MailApp.sendEmail({ to: ownerEmail, subject: '🚨 '+namaUser+' — '+jumlahTotal+'x Tap Anomali', htmlBody: '<p><b>'+namaUser+'</b> sudah '+jumlahTotal+'x kesalahan tap fingerprint bulan ini. Mohon evaluasi.</p>'}); } catch(e) { Logger.log(e); } }
      }
      if (bulan) {
        try { syncResult = processAbsensiAppToRekap(bulan, 'Finance'); } catch(e) { Logger.log(e); }
      }
    }
    try { CacheService.getScriptCache().removeAll(['dashboard_' + userId, 'rekap_' + userId]); } catch(e) {}
    clearAbsensiMatrixCache_(bulanKey, userId);
    return { success: true, sync: syncResult };
  }
  return { success: false };
}

function hitungJumlahAnomali(userId, bulan, ss) {
  const data = ss.getSheetByName('ANOMALI').getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId) && fmtDate(new Date(data[i][2])).substring(0,7) === bulan && data[i][5] === 'DENDA') count++;
  }
  return count;
}

function cekDeadlineAnomali() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ANOMALI');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const now = new Date(); now.setHours(0,0,0,0);
  for (let i = data.length-1; i >= 1; i--) {
    if (data[i][5] !== 'MENUNGGU') continue;
    const deadline = new Date(data[i][7]); deadline.setHours(0,0,0,0);
    if (now > deadline) {
      sheet.getRange(i+1, 6).setValue('DENDA');
      try { konfirmasiAnomali(data[i][0], 'DENDA'); } catch(e) { Logger.log(e); }
    }
  }
}

// ─── TRIGGERS ────────────────────────────────────
function keepWarm() { Logger.log('warm: '+new Date()); }

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('reminderUploadAbsensi').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  ScriptApp.newTrigger('reminderKPIChecklist').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(8).create();
  ScriptApp.newTrigger('cekDeadlineAnomali').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('updatePapanPeringkat').timeBased().everyDays(1).atHour(9).create();
}

function updatePapanPeringkat() {
  // Hanya jalan tanggal 10 setiap bulan
  const now = new Date();
  if (now.getDate() !== 10) return;

  // Gunakan hitungBintang — satu sumber kebenaran, formula sama dengan sistem
  // Tidak ada kalkulasi sendiri di sini supaya tidak ada perbedaan hasil
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    const bagian = usersData[i][3];
    if (usersData[i][6] !== 'AKTIF' || bagian === 'Owner' || bagian === 'Finance') continue;
    try { hitungBintang(usersData[i][0]); } catch(e) { Logger.log('updatePapanPeringkat hitungBintang error: '+e); }
  }
  Logger.log('Papan peringkat diupdate: '+now);
  // Notif semua karyawan
  const usersDataNotif = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  const bulanNames2 = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanLabel2 = bulanNames2[bulanLalu.getMonth()] + ' ' + bulanLalu.getFullYear();
  for (let i = 1; i < usersDataNotif.length; i++) {
    if (usersDataNotif[i][6] === 'AKTIF' && usersDataNotif[i][3] !== 'Owner' && usersDataNotif[i][3] !== 'Finance') {
      addNotifikasi(usersDataNotif[i][0], '🏆 Papan Peringkat Diperbarui',
        'Hasil penilaian bulan '+bulanLabel2+' sudah tersedia. Cek papan peringkat!',
        'INFO', 's-papan-peringkat');
    }
  }
}

// ─── IZIN / SAKIT ────────────────────────────────
function submitIzin(userId, tanggal, jenis, keterangan, linkFoto) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('IZIN');
  const id = 'IZN-' + Utilities.getUuid().substring(0,8);
  sheet.appendRow([id, userId, new Date(tanggal), jenis, keterangan, 'MENUNGGU', new Date(), linkFoto||'']);
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  let namaUser = '', emailFinance = '', emailOwner = '', idFinance = '', idOwner = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) namaUser = usersData[i][1];
    if (usersData[i][3] === 'Finance' && usersData[i][6] === 'AKTIF') { emailFinance = String(usersData[i][5]||'').trim(); idFinance = usersData[i][0]; }
    if (usersData[i][3] === 'Owner' && usersData[i][6] === 'AKTIF') { emailOwner = String(usersData[i][5]||'').trim(); idOwner = usersData[i][0]; }
  }
  const tglStr = Utilities.formatDate(new Date(tanggal), 'Asia/Jakarta', 'dd MMM yyyy');
  const fotoInfo = linkFoto ? '<p>📎 <a href="'+linkFoto+'">Lihat Surat Dokter</a></p>' : '';
  const body = '<div style="font-family:sans-serif;max-width:480px">'+
    '<div style="background:#0e4fa3;padding:16px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">📋 Pengajuan '+jenis+'</h2></div>'+
    '<div style="background:#f7f9fc;padding:16px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">'+
    '<p><b>'+namaUser+'</b> mengajukan '+jenis.toLowerCase()+' pada <b>'+tglStr+'</b>.</p>'+
    '<p>Keterangan: '+keterangan+'</p>'+fotoInfo+
    '<p>Buka Hosela Hub → Kelola Izin untuk menyetujui atau menolak.</p>'+
    '</div></div>';
  // Email + notif app ke Finance
  if (emailFinance) { try { MailApp.sendEmail({ to: emailFinance, subject: '📋 Pengajuan '+jenis+' — '+namaUser, htmlBody: body }); } catch(e) { Logger.log(e); } }
  if (idFinance) addNotifikasi(idFinance, '📋 Pengajuan '+jenis+' Baru', namaUser+' mengajukan '+jenis.toLowerCase()+' untuk '+tglStr+'. Segera cek Kelola Izin.', 'INFO', 's-kelola-izin');
  // Email + notif app ke Owner
  if (emailOwner && emailOwner !== emailFinance) { try { MailApp.sendEmail({ to: emailOwner, subject: '📋 Pengajuan '+jenis+' — '+namaUser, htmlBody: body }); } catch(e) { Logger.log(e); } }
  if (idOwner) addNotifikasi(idOwner, '📋 Pengajuan '+jenis+' Baru', namaUser+' mengajukan '+jenis.toLowerCase()+' untuk '+tglStr+'.', 'INFO', 's-kelola-izin');
  return { success: true };
}

function getIzinKaryawan(userId) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('IZIN').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      let tgl = '';
      try { tgl = Utilities.formatDate(new Date(data[i][2]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(data[i][2]); }
      result.push({ id: data[i][0], tanggal: tgl, jenis: data[i][3], keterangan: data[i][4], status: data[i][5] });
    }
  }
  return result.reverse().slice(0,10);
}

function hapusNotifikasi(notifId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === notifId) {
        const userId = data[i][1];
        sheet.deleteRow(i+1);
        clearNotifCache_(userId);
        return { success: true };
      }
    }
    return { success: false };
  } catch(e) { return { success: false }; }
}

function getIzinPendingCount() {
  try {
    const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('IZIN').getDataRange().getValues();
    let count = 0;
    for (let i = 1; i < data.length; i++) { if (data[i][5] === 'MENUNGGU') count++; }
    return { count };
  } catch(e) { return { count: 0 }; }
}

function getIzinPending() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = ss.getSheetByName('IZIN').getDataRange().getValues();
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  for (let i = 1; i < usersData.length; i++) userMap[usersData[i][0]] = usersData[i][1];
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'MENUNGGU') {
      let tgl = '';
      try { tgl = Utilities.formatDate(new Date(data[i][2]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(data[i][2]); }
      result.push({ id: data[i][0], userId: data[i][1], nama: userMap[data[i][1]]||'-', tanggal: tgl, jenis: data[i][3], keterangan: data[i][4], linkFoto: data[i][7]||'' });
    }
  }
  return result;
}

function approveIzin(izinId, status, approvedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('IZIN');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === izinId) {
      sheet.getRange(i+1, 6).setValue(status);
      const userId = data[i][1];
      const tglIzin = new Date(data[i][2]);
      if (status === 'DISETUJUI') {
        // Hari absen TIDAK dikurangi — izin hanya menghapus SP dan denda SP
        try { evaluasiSPSetelahIzin(userId, tglIzin, ss); } catch(e) { Logger.log(e); }
      }
      try { notifStatusIzin(userId, data[i][3], status, data[i][2]); } catch(e) { Logger.log(e); }
      const bulanKey = Utilities.formatDate(tglIzin, 'Asia/Jakarta', 'yyyy-MM');
      try { CacheService.getScriptCache().removeAll(['rekap_'+userId,'dashboard_'+userId,'ranking','all_absensi_rekap','rekap_bulanan_semua_'+bulanKey]); } catch(e) {}
      return { success: true };
    }
  }
  return { success: false };
}

function hapusAbsenDetail(userId, tanggal, ss) {
  const sheet = ss.getSheetByName('ABSENSI_DETAIL');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const tglStr = fmtDate(tanggal).substring(0,10);
  for (let i = data.length-1; i >= 1; i--) {
    if (String(data[i][1]) === String(userId) && data[i][4] === 'ABSEN') {
      let tglDet = '';
      try { tglDet = fmtDate(new Date(data[i][3])).substring(0,10); } catch(e) { tglDet = String(data[i][3]).substring(0,10); }
      if (tglDet === tglStr) sheet.deleteRow(i+1);
    }
  }
}

function evaluasiSPSetelahIzin(userId, tanggal, ss) {
  const bulan = fmtDate(tanggal).substring(0,7);

  // Hitung total absen fisik bulan ini dari ABSENSI_DETAIL (tanggal aktual)
  const detailDataAll = ss.getSheetByName('ABSENSI_DETAIL').getDataRange().getValues();
  let totalAbsenFisik = 0;
  for (let i = 1; i < detailDataAll.length; i++) {
    if (String(detailDataAll[i][1]) === String(userId) && detailDataAll[i][4] === 'ABSEN') {
      let tglDet = '';
      try { tglDet = fmtDate(new Date(detailDataAll[i][3])).substring(0,7); } catch(e) { tglDet = String(detailDataAll[i][3]).substring(0,7); }
      if (tglDet === bulan) totalAbsenFisik++;
    }
  }

  // Hitung jumlah izin disetujui bulan ini
  const izinData = ss.getSheetByName('IZIN').getDataRange().getValues();
  let totalIzinDisetujui = 0;
  for (let i = 1; i < izinData.length; i++) {
    if (String(izinData[i][1]) === String(userId) && izinData[i][5] === 'DISETUJUI') {
      const tglIzin = new Date(izinData[i][2]);
      if (fmtDate(tglIzin).startsWith(bulan)) totalIzinDisetujui++;
    }
  }

  // Absen efektif untuk syarat SP
  const absenEfektif = Math.max(0, totalAbsenFisik - totalIzinDisetujui);
  Logger.log('Evaluasi SP: '+userId+' absen fisik='+totalAbsenFisik+' izin='+totalIzinDisetujui+' efektif='+absenEfektif);

  const spSheet = ss.getSheetByName('SP_HISTORY');
  const detailSheet = ss.getSheetByName('ABSENSI_DETAIL');
  const usersSheet = ss.getSheetByName('USERS');

  // Fungsi hapus SP tipe tertentu bulan ini
  function hapusSP(tipe) {
    const spData = spSheet.getDataRange().getValues();
    for (let i = spData.length-1; i >= 1; i--) {
      if (String(spData[i][1]) === String(userId) && String(spData[i][2]).startsWith(bulan) && spData[i][3] === tipe) {
        spSheet.deleteRow(i+1);
      }
    }
  }

  // Fungsi hapus denda SP dari ABSENSI_DETAIL bulan ini
  function hapusDendaSP() {
    if (!detailSheet) return;
    const detData = detailSheet.getDataRange().getValues();
    for (let i = detData.length-1; i >= 1; i--) {
      if (String(detData[i][1]) === String(userId) && detData[i][4] === 'DENDA_SP') {
        let tglDet = '';
        try { tglDet = fmtDate(new Date(detData[i][3])).substring(0,7); } catch(e) { tglDet = String(detData[i][3]).substring(0,7); }
        if (tglDet === bulan) detailSheet.deleteRow(i+1);
      }
    }
  }

  // Fungsi tambah denda SP baru ke ABSENSI_DETAIL
  function tambahDendaSPBaru(tipe, denda, alasan) {
    if (!detailSheet) return;
    const weekStr = getWeekString(tanggal);
    detailSheet.appendRow(['DET-'+Utilities.getUuid().substring(0,8), userId, weekStr, tanggal, 'DENDA_SP', tipe+': '+alasan, denda]);
  }

  // Fungsi update bintang berdasarkan skor aktual dengan batas maksimal
  function updateBintangDariSkor(maxBintang) {
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (String(usersData[i][0]) === String(userId)) {
        const skorAktual = usersData[i][10] || 0;
        let bintangBaru = skorAktual >= 85 ? 5 : skorAktual >= 75 ? 4 : skorAktual >= 65 ? 3 : skorAktual >= 50 ? 2 : 1;
        if (bintangBaru > maxBintang) bintangBaru = maxBintang;
        usersSheet.getRange(i+1, 10).setValue(bintangBaru);
        break;
      }
    }
  }

  if (absenEfektif >= 5) {
    // Tetap SP3 — tidak ada perubahan
    Logger.log('SP3 tetap berlaku, absen efektif='+absenEfektif);

  } else if (absenEfektif >= 3) {
    // SP3 → SP2
    hapusSP('SP3');
    hapusDendaSP(); // hapus semua denda SP dulu (termasuk SP3)
    // Cek SP2 di SP_HISTORY
    const spData2 = spSheet.getDataRange().getValues();
    let adaSP2 = false;
    for (let i = 1; i < spData2.length; i++) {
      if (String(spData2[i][1]) === String(userId) && String(spData2[i][2]).startsWith(bulan) && spData2[i][3] === 'SP2') { adaSP2 = true; break; }
    }
    const alasanSP2 = 'Absen efektif '+absenEfektif+'x setelah izin disetujui. Denda Rp 50.000 dikenakan.';
    if (!adaSP2) {
      catatSP(userId, bulan, 'SP2', alasanSP2, ss);
      tambahDendaSPBaru('SP2', 50000, alasanSP2);
      updateBintangDariSkor(2);
      addNotifikasi(userId, '⬇️ SP3 → SP2', 'SP3 dibatalkan. Absen efektif '+absenEfektif+'x → SP2 dikenakan. Denda Rp 50.000.', 'PERINGATAN', 's-notifikasi');
    } else {
      // SP2 sudah ada, pastikan denda juga ada (tambah kalau belum)
      let adaDendaSP2 = false;
      if (detailSheet) {
        const detCek = detailSheet.getDataRange().getValues();
        for (let i = 1; i < detCek.length; i++) {
          if (String(detCek[i][1]) === String(userId) && detCek[i][4] === 'DENDA_SP') {
            let tglDet = '';
            try { tglDet = fmtDate(new Date(detCek[i][3])).substring(0,7); } catch(e) { tglDet = String(detCek[i][3]).substring(0,7); }
            if (tglDet === bulan && String(detCek[i][5]).includes('SP2')) { adaDendaSP2 = true; break; }
          }
        }
      }
      if (!adaDendaSP2) tambahDendaSPBaru('SP2', 50000, alasanSP2);
      updateBintangDariSkor(2);
    }

  } else if (absenEfektif >= 2) {
    // Turun ke SP1 — hapus SP2 dan SP3
    hapusSP('SP3'); hapusSP('SP2');
    hapusDendaSP();
    updateBintangDariSkor(5); // bebaskan lock bintang
    addNotifikasi(userId, '⬇️ SP Diturunkan ke SP1', 'Izin kamu disetujui. Absen efektif '+absenEfektif+'x → SP2/SP3 dibatalkan. Hanya SP1 yang berlaku. Tidak ada denda.', 'INFO', 's-izin');

  } else {
    // Absen efektif < 2 — semua SP dihapus
    hapusSP('SP3'); hapusSP('SP2'); hapusSP('SP1');
    hapusDendaSP();
    updateBintangDariSkor(5);
    addNotifikasi(userId, '✅ Semua SP Dibatalkan', 'Izin kamu disetujui. Absen efektif '+absenEfektif+'x → tidak memenuhi syarat SP apapun. Semua denda dihapus.', 'INFO', 's-izin');
  }
}

function kurangiAbsenDariIzin(userId, tanggal) {
  const weekStr = getWeekString(tanggal);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ABSENSI_REKAP');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId) && data[i][2] === weekStr) {
      const absenBaru = Math.max(0, (data[i][5]||0) - 1);
      sheet.getRange(i+1, 6).setValue(absenBaru);
      // Recalculate status
      const masalah = (data[i][4]||0) + absenBaru;
      let status = 'BAIK';
      if (masalah >= 5) status = 'MERAH';
      else if (masalah >= 3) status = 'ORANGE';
      else if (masalah >= 1) status = 'KUNING';
      sheet.getRange(i+1, 9).setValue(status);
      break;
    }
  }
}

function notifStatusIzin(userId, jenis, status, tanggal) {
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  let email = '', nama = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) { email = usersData[i][5]; nama = usersData[i][1]; break; }
  }
  const tglStr = Utilities.formatDate(new Date(tanggal), 'Asia/Jakarta', 'dd MMM yyyy');
  const approved = status === 'DISETUJUI';
  // Notif di app — ke menu Izin/Sakit karyawan
  addNotifikasi(userId,
    (approved?'✅':'❌')+' Pengajuan '+jenis+' '+(approved?'Disetujui':'Ditolak'),
    'Pengajuan '+jenis.toLowerCase()+' kamu untuk '+tglStr+' telah '+(approved?'disetujui. Tidak dihitung absen.':'ditolak. Tetap dihitung absen biasa.'),
    approved?'INFO':'PERINGATAN', 's-izin'
  );
  if (!email) return;
  const body = '<div style="font-family:sans-serif;max-width:480px">'+
    '<div style="background:'+(approved?'#16a34a':'#dc2626')+';padding:16px;border-radius:8px 8px 0 0">'+
    '<h2 style="color:#fff;margin:0">'+(approved?'✅':'❌')+' Izin '+(approved?'Disetujui':'Ditolak')+'</h2></div>'+
    '<div style="background:#f7f9fc;padding:16px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">'+
    '<p>Halo <b>'+nama+'</b>, pengajuan <b>'+jenis+'</b> kamu pada <b>'+tglStr+'</b> telah <b>'+status.toLowerCase()+'</b>.</p>'+
    (approved ? '<p style="color:#16a34a">Hari tidak masuk kamu tidak akan dihitung sebagai absen.</p>' :
    '<p style="color:#dc2626">Hari tidak masuk kamu tetap dihitung sebagai absen biasa.</p>')+
    '</div></div>';
  MailApp.sendEmail({ to: String(email).trim(), subject: (approved?'✅':'❌')+' Pengajuan '+jenis+' — Hosela Hub', htmlBody: body });
}

function notifPeraturanBaru(judulPeraturan) {
  // Kirim notif ke semua karyawan aktif (kecuali Owner)
  const usersData = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USERS').getDataRange().getValues();
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][6] === 'AKTIF' && usersData[i][3] !== 'Owner') {
      addNotifikasi(usersData[i][0], '📋 Peraturan Baru/Diperbarui',
        judulPeraturan ? '"'+judulPeraturan+'" telah ditambahkan. Mohon dibaca.' : 'Ada peraturan yang baru diperbarui. Mohon dibaca.',
        'INFO', 's-peraturan');
    }
  }
}

// ─── SP HISTORY ──────────────────────────────────
function catatSP(userId, bulan, tipeSP, alasan, ss) {
  const sheet = ss.getSheetByName('SP_HISTORY');
  const id = 'SP-' + Utilities.getUuid().substring(0,8);
  sheet.appendRow([id, userId, bulan, tipeSP, alasan, new Date()]);
}

function kirimEmailSPBundled(semuaSP, ss) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  const userMap = {};
  let ownerEmail = '';
  for (let i = 1; i < usersData.length; i++) {
    userMap[usersData[i][0]] = usersData[i][1];
    if (usersData[i][3] === 'Owner' && usersData[i][6] === 'AKTIF' && usersData[i][5]) ownerEmail = String(usersData[i][5]).trim();
  }
  if (!ownerEmail) return;
  const rows = semuaSP.map(function(sp) {
    const warnColor = sp.tipe === 'SP3' ? '#fee2e2' : sp.tipe === 'SP2' ? '#fff7ed' : '#fefce8';
    const textColor = sp.tipe === 'SP3' ? '#991b1b' : sp.tipe === 'SP2' ? '#92400e' : '#78350f';
    const denda = sp.denda > 0 ? ' · Denda Rp '+sp.denda.toLocaleString('id-ID') : '';
    return '<tr style="background:'+warnColor+'"><td style="padding:8px;font-weight:700;color:'+textColor+'">'+sp.tipe+'</td>'+
      '<td style="padding:8px">'+userMap[sp.userId]+'</td>'+
      '<td style="padding:8px;font-size:12px">'+sp.alasan+denda+'</td></tr>';
  }).join('');
  const body = '<div style="font-family:sans-serif;max-width:600px">'+
    '<div style="background:#0e4fa3;padding:16px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">⚠️ Ringkasan Peringatan Karyawan</h2></div>'+
    '<div style="background:#f7f9fc;padding:16px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">'+
    '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0e4fa3">'+
    '<th style="padding:8px;color:#fff;text-align:left">Tipe</th><th style="padding:8px;color:#fff;text-align:left">Karyawan</th><th style="padding:8px;color:#fff;text-align:left">Alasan</th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table>'+
    '<p style="font-size:12px;color:#6b7280;margin-top:12px">Email peringatan individual sudah dikirim ke masing-masing karyawan.</p>'+
    '</div></div>';
  MailApp.sendEmail({ to: ownerEmail, subject: '⚠️ Ringkasan SP Karyawan — Hosela Hub', htmlBody: body });
}

function kirimEmailAnomali(semuaAnomali, ss) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let financeEmail = '', ownerEmail = '';
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][3] === 'Finance' && usersData[i][6] === 'AKTIF' && usersData[i][5]) financeEmail = String(usersData[i][5]).trim();
    if (usersData[i][3] === 'Owner' && usersData[i][6] === 'AKTIF' && usersData[i][5]) ownerEmail = String(usersData[i][5]).trim();
  }
  const to = financeEmail || ownerEmail;
  if (!to) return;
  const tipeLabel = { HANYA_1_TAP_SORE: 'Hanya 1 tap (sore/malam)', LUPA_TAP_PULANG: 'Lupa tap pulang', TAP_MASUK_SORE: 'Tap masuk jam sore' };
  const rows = semuaAnomali.map(function(a) {
    return '<tr><td style="padding:8px;font-weight:600">'+a.nama+'</td>'+
      '<td style="padding:8px">'+a.tanggal+'</td>'+
      '<td style="padding:8px">'+a.jam+'</td>'+
      '<td style="padding:8px;color:#dc2626;font-weight:600">'+(tipeLabel[a.tipe]||a.tipe)+'</td></tr>';
  }).join('');
  const body = '<div style="font-family:sans-serif;max-width:600px">'+
    '<div style="background:#f59e0b;padding:16px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">🔍 Tap Fingerprint Perlu Dicek</h2></div>'+
    '<div style="background:#fffbeb;padding:16px;border-radius:0 0 8px 8px;border:1px solid #fde68a">'+
    '<p>Data absensi berikut memiliki <b>tap tidak wajar</b> yang perlu diverifikasi:</p>'+
    '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f59e0b">'+
    '<th style="padding:8px;color:#fff;text-align:left">Nama</th><th style="padding:8px;color:#fff;text-align:left">Tanggal</th>'+
    '<th style="padding:8px;color:#fff;text-align:left">Jam</th><th style="padding:8px;color:#fff;text-align:left">Masalah</th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table>'+
    '<p style="font-size:12px;color:#92400e;margin-top:12px">Sementara dicatat absen. Koreksi via Kelola Izin di Hosela Hub.</p>'+
    '</div></div>';
  MailApp.sendEmail({ to, subject: '🔍 Tap Fingerprint Perlu Dicek — Hosela Hub', htmlBody: body });
}

// ─── NOTIFIKASI APP ───────────────────────────────
function clearNotifCache_(userId) {
  if (!userId) return;
  try {
    CacheService.getScriptCache().removeAll(['dashboard_' + userId, 'notif_count_' + userId]);
  } catch(e) {}
}

function addNotifikasi(userId, judul, isi, tipe, menu) {
  // tipe: INFO, PERINGATAN, SP1, SP2, SP3
  // menu: menu yang relevan (s-izin, s-papan-peringkat, s-peraturan, dll)
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return;
    const id = 'NTF-' + Utilities.getUuid().substring(0,8);
    sheet.appendRow([id, userId, judul, isi, tipe, 'BELUM', new Date(), menu||'s-notifikasi']);
    clearNotifCache_(userId);
  } catch(e) { Logger.log('addNotifikasi error: '+e); }
}

function getNotifikasi(userId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return [];
    const data = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId)) {
        let tgl = '';
        try { tgl = Utilities.formatDate(new Date(data[i][6]), 'Asia/Jakarta', 'dd MMM yyyy HH:mm'); } catch(e) {}
        result.push({ id: data[i][0], judul: data[i][2], isi: data[i][3], tipe: data[i][4], dibaca: data[i][5] === 'SUDAH', tgl, menu: data[i][7]||'s-notifikasi' });
      }
    }
    return result.reverse().slice(0,30);
  } catch(e) { return []; }
}

function getNotifCountByMenu(userId) {
  // Kembalikan jumlah notif belum dibaca per menu
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'notif_count_' + userId;
    const cached = cache.get(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch(e) {} }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return {};
    const data = sheet.getDataRange().getValues();
    const counts = {};
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && data[i][5] === 'BELUM') {
        const menu = data[i][7] || 's-notifikasi';
        counts[menu] = (counts[menu]||0) + 1;
        counts['s-notifikasi'] = (counts['s-notifikasi']||0) + 1; // total di notifikasi
      }
    }
    try { cache.put(cacheKey, JSON.stringify(counts), 60); } catch(e) {}
    return counts;
  } catch(e) { return {}; }
}

function hapusSemuaNotifikasi(userId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    for (let i = data.length-1; i >= 1; i--) {
      if (String(data[i][1]) === String(userId)) sheet.deleteRow(i+1);
    }
    clearNotifCache_(userId);
    return { success: true };
  } catch(e) { return { success: false }; }
}

function tandaiMenuDibaca(userId, menu) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(userId) && (data[i][7]||'s-notifikasi') === menu && data[i][5] === 'BELUM') {
        sheet.getRange(i+1, 6).setValue('SUDAH');
      }
    }
    clearNotifCache_(userId);
    return { success: true };
  } catch(e) { return { success: false }; }
}

function tandaiDibaca(notifId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('NOTIFIKASI');
    if (!sheet) return { success: false };
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === notifId) {
        sheet.getRange(i+1, 6).setValue('SUDAH');
        clearNotifCache_(data[i][1]);
        break;
      }
    }
    return { success: true };
  } catch(e) { return { success: false }; }
}

function notifSP(userId, tipeSP, alasan, denda, ss) {
  const usersData = ss.getSheetByName('USERS').getDataRange().getValues();
  let emailKaryawan = '', namaKaryawan = '';
  for (let i = 1; i < usersData.length; i++) {
    if (String(usersData[i][0]) === String(userId)) { emailKaryawan = usersData[i][5]; namaKaryawan = usersData[i][1]; break; }
  }

  // Pesan khusus per level SP
  const pesanSP = {
    'SP1': 'Ini peringatan pertama. Yuk perbaiki kedisiplinan kamu minggu depan! Jika terulang, SP2 akan dikenakan beserta denda Rp 50.000.',
    'SP2': 'Pelanggaran ini sudah serius. Bintang kamu dikunci maksimal ⭐⭐ bulan ini. Jika absen mencapai 5x, SP3 akan dikenakan beserta denda Rp 100.000 dan laporan ke Owner.',
    'SP3': 'Pelanggaran sangat serius. Bintang kamu dikunci maksimal ⭐ bulan ini. Harap segera menemui Owner untuk evaluasi lebih lanjut.'
  };
  const pesan = pesanSP[tipeSP] || '';
  const warnColor = tipeSP === 'SP3' ? '#7f1d1d' : tipeSP === 'SP2' ? '#dc2626' : '#f59e0b';
  const judulApp = tipeSP === 'SP3' ? '🚨 Kamu mendapat SP3' : '⚠️ Kamu mendapat '+tipeSP;
  const dendaStr = denda > 0 ? ' Denda Rp '+denda.toLocaleString('id-ID')+' dikenakan.' : '';
  const bintangStr = tipeSP === 'SP3' ? '<p>⭐ Bintang dikunci maksimal 1 bulan ini.</p>' : tipeSP === 'SP2' ? '<p>⭐⭐ Bintang dikunci maksimal 2 bulan ini.</p>' : '';

  // Notif di app — fakta + pesan peringatan
  const isiApp = alasan + dendaStr + '\n\n💬 ' + pesan;
  addNotifikasi(userId, judulApp, isiApp, tipeSP, 's-notifikasi');

  // Email ke karyawan
  if (emailKaryawan) {
    const body = '<div style="font-family:sans-serif;max-width:480px">'+
      '<div style="background:'+warnColor+';padding:16px;border-radius:8px 8px 0 0"><h2 style="color:#fff;margin:0">'+judulApp+'</h2></div>'+
      '<div style="background:#fff7f7;padding:16px;border-radius:0 0 8px 8px;border:1px solid #fecaca">'+
      '<p>Halo <b>'+namaKaryawan+'</b>,</p>'+
      '<p>'+alasan+'</p>'+
      (denda > 0 ? '<p style="color:#dc2626;font-weight:700">💸 Denda: Rp '+denda.toLocaleString('id-ID')+'</p>' : '')+
      bintangStr+
      '<div style="background:#fff3cd;border-left:4px solid '+warnColor+';padding:12px;border-radius:0 8px 8px 0;margin-top:12px">'+
      '<p style="margin:0;font-size:13px;color:#555">💬 '+pesan+'</p></div>'+
      '<p style="color:#6b7280;font-size:12px;margin-top:16px">— Manajemen Hosela</p>'+
      '</div></div>';
    try { MailApp.sendEmail({ to: String(emailKaryawan).trim(), subject: judulApp+' — Hosela Hub', htmlBody: body }); } catch(e) { Logger.log(e); }
  }
}

function tambahDendaAbsen(userId, bulanStr, denda, ss) {
  const sheet = ss.getSheetByName('ABSENSI_REKAP');
  const data = sheet.getDataRange().getValues();
  for (let i = data.length-1; i >= 1; i--) {
    if (String(data[i][1]) === String(userId) && String(data[i][2]).startsWith(bulanStr.substring(0,7))) {
      sheet.getRange(i+1, 10).setValue((data[i][9]||0) + denda);
      break;
    }
  }
}

function getSPHistory(userId) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SP_HISTORY').getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      let tgl = '';
      try { tgl = Utilities.formatDate(new Date(data[i][5]), 'Asia/Jakarta', 'dd MMM yyyy'); } catch(e) { tgl = String(data[i][5]); }
      result.push({ id: data[i][0], bulan: data[i][2], tipe: data[i][3], alasan: data[i][4], tgl });
    }
  }
  return result.reverse();
}

function cekSP3BulanSebelumnya(userId, bulanIni, ss) {
  // Cek apakah user dapat SP2 bulan sebelumnya
  const now = new Date(bulanIni + '-01');
  const bulanLalu = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const bulanLaluStr = bulanLalu.getFullYear() + '-' + String(bulanLalu.getMonth()+1).padStart(2,'0');
  const data = ss.getSheetByName('SP_HISTORY').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId) && data[i][2] === bulanLaluStr && data[i][3] === 'SP2') return true;
  }
  return false;
}

// ─── HELPERS ─────────────────────────────────────
function setupAbsensiDetailFormat() {
  // Jalankan SEKALI untuk fix kolom D (tanggal) di ABSENSI_DETAIL jadi TEXT format
  // Ini mencegah Sheets auto-convert string tanggal jadi Date cell
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ABSENSI_DETAIL');
  if (!sheet || sheet.getLastRow() < 2) return;
  const lastRow = sheet.getLastRow();
  // Set seluruh kolom D (kolom 4) ke format TEXT
  sheet.getRange(2, 4, lastRow - 1, 1).setNumberFormat('@');
  Logger.log('ABSENSI_DETAIL kolom D set ke TEXT format. Rows: ' + (lastRow-1));
}

// ─── DATE STRING HELPERS (no Date(), no timezone) ────────────────
// Single source of truth: all dates as "YYYY-MM-DD" strings
// Month key: "YYYY-MM" via substring(0,7) ONLY

function extractDateStr(raw) {
  // Returns "YYYY-MM-DD" string regardless of input type
  if (!raw) return '';
  if (typeof raw === 'string') {
    // Handle "YYYY-MM-DD HH:mm" (manual entry) → take first 10 chars
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0,10);
    return '';
  }
  if (raw instanceof Date && !isNaN(raw)) {
    // Date object from Sheets (attendance entries) — Jakarta timezone
    try { return Utilities.formatDate(raw, 'Asia/Jakarta', 'yyyy-MM-dd'); } catch(e) { return ''; }
  }
  return '';
}

function extractTimeStr(raw) {
  // Returns "HH:mm" from "YYYY-MM-DD HH:mm" string, or "" if not available
  if (!raw || typeof raw !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) return raw.substring(11,16);
  return '';
}

function extractMonthKey(raw) {
  // Returns "YYYY-MM" using substring(0,7) ONLY
  // "2026-03-15" → "2026-03"
  // "2026-03-15 17:35" → "2026-03"
  const s = extractDateStr(raw);
  return s.length >= 7 ? s.substring(0,7) : '';
}

function fmtDate(d) {
  // fmtDate now delegates to extractDateStr for consistency
  return extractDateStr(d);
}

function getWeekString(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  const w1 = new Date(d.getFullYear(),0,4);
  const wn = 1+Math.round(((d-w1)/86400000-3+(w1.getDay()+6)%7)/7);
  return d.getFullYear()+'-W'+String(wn).padStart(2,'0');
}
