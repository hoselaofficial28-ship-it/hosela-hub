var _payrollPreviewCache = {};
var _payrollDetailCache = {};
var _slipDetailCache = {};
var _salaryUsersCache = [];
var _salaryUserMap = {};
var _salaryUsersMonth = '';
var _salarySelectedMonth = '';
var _payrollAutoSyncing = {};
var _slipListState = { items: [], isAdmin: false, month: '', sort: 'DESC' };

function getDefaultPayrollMonth() {
 var now = new Date();
 var d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
 return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function fillPayrollMonthSelect() {
 var sel = document.getElementById('payroll-bulan-sel');
 if (!sel || sel.options.length) return;
 var now = new Date();
 var bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 for (var i = 1; i <= 7; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
 var opt = document.createElement('option');
 opt.value = key;
 opt.textContent = bulanNames[d.getMonth()] + ' ' + d.getFullYear();
 sel.appendChild(opt);
 }
 sel.value = getDefaultPayrollMonth();
}

function getSalarySelectedMonth() {
 if (_salarySelectedMonth) return _salarySelectedMonth;
 _salarySelectedMonth = getDefaultPayrollMonth();
 return _salarySelectedMonth;
}

function salaryMonthLabel(key) {
 if (typeof labelBulanKey === 'function') return labelBulanKey(key);
 var parts = String(key || '').split('-');
 var y = parseInt(parts[0], 10);
 var m = parseInt(parts[1], 10);
 var names = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 if (!y || !m || m < 1 || m > 12) return key || '-';
 return names[m - 1] + ' ' + y;
}

function buildSalaryMonthOptions(selected) {
 var now = new Date();
 var html = '';
 for (var i = -1; i <= 12; i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
 html += '<option value="'+key+'"'+(key === selected ? ' selected' : '')+'>'+salaryMonthLabel(key)+'</option>';
 }
 return html;
}

function changeSalaryMonth(value) {
 _salarySelectedMonth = value || getDefaultPayrollMonth();
 _salaryUsersCache = [];
 _salaryUsersMonth = '';
 loadSalarySettings(true);
}

function loadPayroll() {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 goTo('s-home');
 showToast('Penggajian hanya untuk Finance dan Owner');
 return;
 }
 fillPayrollMonthSelect();
 loadPayrollPreview();
}

function loadPayrollPreview() {
 var sel = document.getElementById('payroll-bulan-sel');
 var el = document.getElementById('payroll-content');
 if (!sel || !el) return;
 var bulanKey = sel.value || getDefaultPayrollMonth();
 el.innerHTML = skelCards(3);

 if (_payrollPreviewCache[bulanKey]) {
 handlePayrollPreviewResponse(_payrollPreviewCache[bulanKey], bulanKey);
 return;
 }

 gasCall('getPayrollPreview', [bulanKey], function(res) {
 if (!res || res.error || res.success === false) {
 renderPayrollSetupState(bulanKey);
 return;
 }
 handlePayrollPreviewResponse(res, bulanKey);
 }, function() {
 renderPayrollSetupState(bulanKey);
 });
}

function handlePayrollPreviewResponse(res, bulanKey) {
 var status = String(res && res.status || '').toUpperCase();
 if (res && res.id && res.sourceStale === true && status !== 'PUBLISHED' && !_payrollAutoSyncing[bulanKey]) {
  _payrollAutoSyncing[bulanKey] = true;
  syncPayrollAttendanceUI(res.id, bulanKey, null, true);
  return;
 }
 _payrollPreviewCache[bulanKey] = res;
 renderPayrollPreview(res, bulanKey);
}

function salaryEsc(s) {
 return String(s == null ? '' : s)
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#39;');
}

function payrollPdfMoney(n) {
 return (parseInt(n || 0, 10) || 0).toLocaleString('id-ID');
}

function formatPayrollItemDescription(value) {
 return String(value || '').replace(/(\d+)(?:[.,](\d+))?\s+jam\b/gi, function(match, whole, fraction) {
  if (!fraction) return whole + ' jam';
  var hours = Number(whole + '.' + fraction);
  if (!isFinite(hours)) return match;
  return hours.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jam';
 });
}

function payrollPdfRow(label, value, type) {
 var n = parseInt(value || 0, 10) || 0;
 var sign = type === 'minus' && n > 0 ? '-' : (type === 'plus' && n > 0 ? '+' : '');
 var cls = type === 'minus' ? 'minus' : 'plus';
 return '<div class="pdf-row '+cls+'"><span>'+salaryEsc(label)+'</span><b>'+sign+' Rp '+payrollPdfMoney(Math.abs(n))+'</b></div>';
}

function buildPayrollSlipPdfHtml(res) {
 var d = res && (res.slip || res.detail) || {};
 var items = res && res.items || [];
 var bulan = res && res.bulan || d.bulan || d.kerajinanSettingBulan || '';
 var nama = d.nama || (currentUser && currentUser.nama) || '-';
 var title = 'Slip Gaji - ' + nama + ' - ' + salaryMonthLabel(bulan);
 var kelompok = kelompokkanPayrollItems(items);
 var pdfItemRow = function(item) {
  var tipe = item.tipe || '';
  var nominal = parseInt(item.nominal || 0, 10) || 0;
  var minus = payrollItemIsDeduction(tipe, nominal);
  var kosong = nominal === 0;
  var tanda = kosong ? '' : (minus ? '-' : '+');
  var kelas = kosong ? 'netral' : (minus ? 'minus' : 'plus');
  return '<div class="pdf-item"><div><b>'+salaryEsc(payrollItemLabel(tipe))+'</b><small>'+salaryEsc(formatPayrollItemDescription(item.keterangan || item.tanggal || '-'))+'</small></div><strong class="'+kelas+'">'+tanda+' Rp '+payrollPdfMoney(Math.abs(nominal))+'</strong></div>';
 };
 var itemHtml = '';
 if (!items.length) {
  itemHtml = '<div class="pdf-empty">Tidak ada item detail.</div>';
 } else {
  if (kelompok.plus.length) {
   itemHtml += '<div class="pdf-group plus">Penerimaan (+) = + Rp '+payrollPdfMoney(kelompok.jumlahPlus)+'</div>' + kelompok.plus.map(pdfItemRow).join('');
  }
  if (kelompok.minus.length) {
   itemHtml += '<div class="pdf-group minus">Potongan (&minus;) = - Rp '+payrollPdfMoney(kelompok.jumlahMinus)+'</div>' + kelompok.minus.map(pdfItemRow).join('');
  }
  if (kelompok.nol.length) {
   itemHtml += '<div class="pdf-group netral">Tanpa nilai = Rp 0</div>' + kelompok.nol.map(pdfItemRow).join('');
  }
  itemHtml += '<div class="pdf-item pdf-item-total"><div><b>Selisih item detail</b><small>(+ &minus; &minus;)</small></div><strong>Rp '+payrollPdfMoney(kelompok.jumlahPlus - kelompok.jumlahMinus)+'</strong></div>';
 }
 var html = '<!doctype html><html><head><meta charset="utf-8"><title>'+salaryEsc(title)+'</title>'+
 '<style>'+
 '@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#eef4ff;font-family:Manrope,Arial,sans-serif;color:#172033}.pdf-wrap{max-width:820px;margin:0 auto;padding:24px}.pdf-card{background:#fff;border:1px solid #dbe7ff;border-radius:22px;padding:28px;box-shadow:0 18px 50px rgba(37,99,235,.12)}.pdf-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid #e5edff;padding-bottom:18px;margin-bottom:18px}.brand{display:flex;gap:12px;align-items:center}.logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#1d5fd7,#6ba4ff);color:#fff;display:grid;place-items:center;font-weight:800;font-size:24px}.brand h1{font-size:22px;margin:0;letter-spacing:-.03em}.brand p,.meta p{margin:3px 0 0;color:#64748b;font-size:12px}.meta{text-align:right}.meta b{font-size:15px;color:#0f172a}.employee{display:grid;grid-template-columns:1.4fr .8fr;gap:12px;margin:18px 0}.box{background:#f8fbff;border:1px solid #e2ebff;border-radius:16px;padding:14px}.box small{display:block;color:#64748b;font-size:11px;margin-bottom:4px}.box b{font-size:14px}.total{background:linear-gradient(135deg,#1f62db,#5a93ff);color:#fff;border-radius:18px;padding:18px;margin:18px 0;display:flex;justify-content:space-between;align-items:center}.total span{font-size:12px;opacity:.9}.total b{font-size:24px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.metric{border-radius:14px;padding:12px;text-align:center;background:#f8fbff;border:1px solid #e2ebff}.metric b{display:block;font-size:16px;color:#1d5fd7}.metric span{font-size:11px;color:#64748b}.section-title{font-size:13px;font-weight:800;margin:20px 0 10px;color:#0f172a}.pdf-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eef2ff;font-size:13px}.pdf-row.plus b,.plus{color:#059669}.pdf-row.minus b,.minus{color:#dc2626}.netral{color:#64748b}.pdf-item{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border:1px solid #e2ebff;border-radius:14px;padding:12px;margin-bottom:8px}.pdf-item small{display:block;color:#64748b;margin-top:3px}.pdf-empty{color:#64748b;border:1px dashed #cbdaf5;border-radius:14px;padding:14px;text-align:center}.pdf-group{display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin:14px 0 8px;padding:8px 12px;border-radius:12px;background:#f8fbff;border:1px solid #e2ebff}.pdf-group.plus{color:#059669}.pdf-group.minus{color:#dc2626}.pdf-group.netral{color:#64748b}.pdf-item-total{border-top:2px solid #e5edff;margin-top:10px}.note{margin-top:18px;color:#64748b;font-size:11px;line-height:1.5}.actions{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;margin-bottom:14px}.actions button{border:0;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer}.print{background:#1f62db;color:#fff}.close{background:#eaf1ff;color:#1f3b68}@media print{body{background:#fff}.pdf-wrap{padding:0}.actions{display:none}.pdf-card{box-shadow:none;border:0;border-radius:0;padding:0}}'+
 '</style></head><body><div class="pdf-wrap"><div class="actions"><button class="close" onclick="window.close()">Tutup</button><button class="print" onclick="window.print()">Download / Simpan PDF</button></div><div class="pdf-card">'+
 '<div class="pdf-head"><div class="brand"><div class="logo">H</div><div><h1>Hosela Hub</h1><p>Slip Gaji Karyawan</p></div></div><div class="meta"><b>'+salaryEsc(salaryMonthLabel(bulan))+'</b><p>Dipublish '+salaryEsc(d.dipublishPada || res.dipublishPada || '-')+'</p></div></div>'+
 '<div class="employee"><div class="box"><small>Nama Karyawan</small><b>'+salaryEsc(nama)+'</b><p style="margin:4px 0 0;color:#64748b;font-size:12px">'+salaryEsc(d.jabatan || '-')+' · '+salaryEsc(d.bagian || '-')+'</p></div><div class="box"><small>ID Slip</small><b>'+salaryEsc(d.id || '-').slice(0,24)+'</b></div></div>'+
 '<div class="metrics"><div class="metric"><b>'+payrollPdfMoney(d.hadir || 0)+'</b><span>Hadir</span></div><div class="metric"><b>'+payrollPdfMoney(d.absen || 0)+'</b><span>Absen</span></div><div class="metric"><b>'+payrollPdfMoney(d.telat || 0)+'</b><span>Telat</span></div><div class="metric"><b>'+payrollPdfMoney((d.lemburPulang || 0) + (d.lemburMinggu || 0) + (d.lemburLibur || 0))+'</b><span>Lembur</span></div></div>'+
 '<div class="section-title">Rincian Komponen</div>'+payrollPdfRow('Gaji Pokok', d.gajiPokok, 'plus')+payrollPdfRow('Penghargaan', d.totalReward, 'plus')+payrollPdfRow('Bonus Kerajinan', d.bonusKerajinan, 'plus')+payrollPdfRow('Denda', d.totalDenda, 'minus')+(d.adjustmentPlus ? payrollPdfRow('Penyesuaian Tambahan', d.adjustmentPlus, 'plus') : '')+(d.adjustmentMinus ? payrollPdfRow('Penyesuaian Potongan', d.adjustmentMinus, 'minus') : '')+
 '<div class="total"><span>Total Diterima</span><b>Rp '+payrollPdfMoney(d.totalGaji)+'</b></div><div class="section-title">Item Detail</div>'+itemHtml+
 '<div class="note">Dokumen ini dibuat otomatis dari Hosela Hub berdasarkan slip gaji yang sudah dipublish. Simpan PDF ini sebagai arsip pribadi karyawan.</div></div></div><script>setTimeout(function(){ window.focus(); window.print(); }, 500);<\/script></body></html>';
 return html;
}

function openPayrollSlipPdfWindow(res, popup) {
 var html = buildPayrollSlipPdfHtml(res);
 popup.document.open();
 popup.document.write(html);
 popup.document.close();
}


function showPayrollSlipPrintOverlay(res) {
 var full = buildPayrollSlipPdfHtml(res);
 var styleMatch = full.match(/<style>([\s\S]*?)<\/style>/);
 var bodyMatch = full.match(/<body>([\s\S]*?)<script>/);
 var style = styleMatch ? styleMatch[1] : '';
 var body = bodyMatch ? bodyMatch[1] : '<div class="pdf-wrap"><div class="pdf-card">Slip tidak bisa ditampilkan.</div></div>';
 var old = document.getElementById('payroll-print-root');
 if (old && old.parentNode) old.parentNode.removeChild(old);
 var root = document.createElement('div');
 root.id = 'payroll-print-root';
 root.innerHTML = '<style>'+style+'#payroll-print-root{position:fixed;inset:0;z-index:99999;background:#eef4ff;overflow:auto}.payroll-print-hint{max-width:820px;margin:14px auto 0;padding:0 24px;color:#475569;font:12px Arial,sans-serif}@media print{body>*:not(#payroll-print-root){display:none!important}#payroll-print-root{position:static!important;inset:auto!important;background:#fff!important;overflow:visible!important}.payroll-print-hint{display:none!important}}</style>'+body+'<div class="payroll-print-hint">Jika dialog PDF belum muncul, tekan tombol <b>Download / Simpan PDF</b> di atas.</div>';
 document.body.appendChild(root);
 var closeBtn = root.querySelector('.close');
 if (closeBtn) closeBtn.onclick = function(){ if (root.parentNode) root.parentNode.removeChild(root); };
 var printBtn = root.querySelector('.print');
 if (printBtn) printBtn.onclick = function(){ window.print(); };
}

function openPayrollSlipPdfResult(res, popup) {
 if (popup) {
  try { openPayrollSlipPdfWindow(res, popup); return; } catch(e) {}
 }
 showPayrollSlipPrintOverlay(res);
}

function downloadEmployeeSlipPdf(payrollRunId, userId, btn) {
 if (!payrollRunId) { showToast('Payroll slip tidak valid'); return; }
 var targetUserId = userId || (currentUser && currentUser.id) || '';
 if (!targetUserId) { showToast('User tidak valid'); return; }
 if (btn) { btn.disabled = true; btn.textContent = 'Menyiapkan PDF...'; }
 var cached = targetUserId === (currentUser && currentUser.id) ? _slipDetailCache[payrollRunId] : null;
 if (cached) {
  showPayrollSlipPrintOverlay(cached);
  if (btn) { btn.disabled = false; btn.textContent = 'Download PDF'; }
  return;
 }
 gasCall('getPayrollEmployeeSlipDetail', [targetUserId, payrollRunId], function(res) {
  if (btn) { btn.disabled = false; btn.textContent = 'Download PDF'; }
  if (!res || res.error || res.success === false) {
   showToast((res && (res.msg || res.error)) || 'Gagal menyiapkan PDF');
   return;
  }
  if (targetUserId === (currentUser && currentUser.id)) _slipDetailCache[payrollRunId] = res;
  showPayrollSlipPrintOverlay(res);
 }, function() {
  if (btn) { btn.disabled = false; btn.textContent = 'Download PDF'; }
  showToast('Gagal menyiapkan PDF');
 });
}
function loadSalarySettings(force) {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 goTo('s-home');
 showToast('Setting gaji hanya untuk Finance dan Owner');
 return;
 }
 var el = document.getElementById('salary-settings-content');
 if (!el) return;
 var bulanKey = getSalarySelectedMonth();
 if (!force && _salaryUsersCache.length && _salaryUsersMonth === bulanKey) {
 renderSalaryUsers(_salaryUsersCache, bulanKey);
 return;
 }
 el.innerHTML = skelCards(4);
 gasCall('getSalaryUsers', [currentUser.id, bulanKey], function(res) {
 if (!res || res.error || res.success === false) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>'+(salaryEsc((res && (res.msg || res.error)) || 'Gagal memuat data gaji'))+'</div>';
 return;
 }
 _salaryUsersCache = res.data || [];
 _salaryUsersMonth = res.bulan || bulanKey;
 renderSalaryUsers(_salaryUsersCache, _salaryUsersMonth);
 }, function() {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Gagal memuat data gaji</div>';
 });
}

function getKerajinanInputValue(r) {
 if (r && Object.prototype.hasOwnProperty.call(r, 'bonusKerajinan') && r.bonusKerajinan !== '' && r.bonusKerajinan != null) {
 return Math.max(0, parseInt(r.bonusKerajinan || 0, 10) || 0);
 }
 return 150000;
}
function renderSalaryUsers(rows, bulanKey) {
 var el = document.getElementById('salary-settings-content');
 if (!el) return;
 _salaryUserMap = {};
 bulanKey = bulanKey || getSalarySelectedMonth();
 if (!rows.length) {
 el.innerHTML =
 '<div class="card" style="padding:12px;margin-bottom:10px">'+
 '<label class="form-label">Bulan Gaji Berlaku</label>'+
 '<select class="form-input" onchange="changeSalaryMonth(this.value)">'+buildSalaryMonthOptions(bulanKey)+'</select>'+
 '</div>'+
 '<div class="empty-state"><div class="empty-icon"></div>Belum ada karyawan aktif</div>';
 return;
 }
 var total = rows.reduce(function(s, r){ return s + (parseInt(r.gajiBulanBerlaku || r.gajiBulanan || 0, 10) || 0); }, 0);
 var totalKerajinan = rows.reduce(function(s, r){ return s + getKerajinanInputValue(r); }, 0);
 var html =
 '<div class="card" style="padding:12px;margin-bottom:10px">'+
 '<label class="form-label">Bulan Gaji Berlaku</label>'+
 '<select class="form-input" onchange="changeSalaryMonth(this.value)">'+buildSalaryMonthOptions(bulanKey)+'</select>'+
 '<div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin-top:8px">Gaji dan uang kerajinan yang disimpan akan dipakai untuk perhitungan '+salaryMonthLabel(bulanKey)+' dan bulan setelahnya sampai ada perubahan baru.</div>'+
 '</div>' +
 '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:var(--blue)">'+rows.length+'</div><div style="font-size:11px;color:var(--text-muted)">Karyawan</div></div>' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:900;color:var(--green)">Rp '+total.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Total Gaji</div></div>' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:900;color:#d97706">Rp '+totalKerajinan.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Total Kerajinan</div></div>' +
 '</div>' +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">' +
 '<button class="btn btn-sm btn-primary" style="width:100%" onclick="loadSalarySettings(true)">Refresh Data</button>' +
 '<button class="btn btn-sm btn-gold" id="salary-save-all" style="width:100%" onclick="saveAllSalaryUsers(this)">Simpan Semua Perubahan</button>' +
 '</div>';
 rows.forEach(function(r) {
 var id = String(r.id || '');
 var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
 var effectiveSalary = parseInt(r.gajiBulanBerlaku || r.gajiBulanan || 0, 10) || 0;
 var activeSalary = parseInt(r.gajiBulanan || 0, 10) || 0;
 var kerajinan = getKerajinanInputValue(r);
 _salaryUserMap[id] = r;
 html += '<div class="card salary-user-card" data-search="'+salaryEsc((r.nama+' '+r.bagian+' '+r.jabatan).toLowerCase())+'" style="padding:12px;margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px">' +
 '<div><div style="font-size:13px;font-weight:900;color:var(--text-dark)">'+salaryEsc(r.nama)+'</div><div style="font-size:11px;color:var(--text-muted)">'+salaryEsc(r.jabatan || '-')+' &middot; '+salaryEsc(r.bagian || '-')+'</div></div>' +
 '<span class="badge '+(r.status === 'AKTIF' ? 'badge-green' : 'badge-gray')+'">'+salaryEsc(r.status || '-')+'</span>' +
 '</div>' +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
 '<div><label class="form-label">Gaji untuk '+salaryMonthLabel(bulanKey)+'</label><input class="form-input" type="number" min="0" inputmode="numeric" id="salary-'+safeId+'" value="'+effectiveSalary+'"></div>' +
 '<div><label class="form-label">Uang Kerajinan</label><input class="form-input" type="number" min="0" inputmode="numeric" id="kerajinan-'+safeId+'" value="'+kerajinan+'"></div>' +
 '</div>' +
 '<input class="form-input" type="text" id="salary-note-'+safeId+'" placeholder="Catatan perubahan gaji/kerajinan (opsional)" style="margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
 '<div style="font-size:11px;color:var(--text-muted)">Gaji aktif: <b>Rp '+activeSalary.toLocaleString('id-ID')+'</b><br>Gaji bulan ini: <b>Rp '+effectiveSalary.toLocaleString('id-ID')+'</b><br>Kerajinan bulan ini: <b>Rp '+kerajinan.toLocaleString('id-ID')+'</b></div>' +
 '<div style="display:flex;gap:6px">' +
 '<button class="btn btn-sm btn-danger" onclick="deleteSalaryUser(&quot;'+salaryEsc(id)+'&quot;, this)">Hapus</button>' +
 '<button class="btn btn-sm btn-gold" onclick="saveSalaryUser(&quot;'+salaryEsc(id)+'&quot;, this)">Simpan</button>' +
 '</div>' +
 '</div>' +
 '</div>';
 });
 el.innerHTML = html;
}
function filterSalaryUsers() {
 var input = document.getElementById('salary-search');
 var q = input ? input.value.trim().toLowerCase() : '';
 document.querySelectorAll('.salary-user-card').forEach(function(card) {
 var text = card.getAttribute('data-search') || '';
 card.style.display = text.indexOf(q) !== -1 ? '' : 'none';
 });
}

function collectSalaryUserPayloads() {
 var bulanKey = getSalarySelectedMonth();
 return _salaryUsersCache.map(function(r) {
 var id = String(r.id || '');
 var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
 var salaryInput = document.getElementById('salary-' + safeId);
 var kerajinanInput = document.getElementById('kerajinan-' + safeId);
 var noteInput = document.getElementById('salary-note-' + safeId);
 return {
 userId: id,
 salary: parseInt(salaryInput ? salaryInput.value : 0, 10) || 0,
 bonusKerajinan: parseInt(kerajinanInput ? kerajinanInput.value : 0, 10) || 0,
 note: noteInput ? noteInput.value.trim() : '',
 bulan: bulanKey
 };
 }).filter(function(item) { return item.userId; });
}

function clearSalaryLocalCaches() {
 _salaryUsersCache = [];
 _salaryUsersMonth = '';
 Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
 Object.keys(_payrollDetailCache).forEach(function(k){ delete _payrollDetailCache[k]; });
 cacheClearAction('getSalaryUsers');
 cacheClearAction('getPayrollPreview');
 cacheClearAction('getRekapBulananSemua');
 cacheClearAction('getAllAbsensiRekap');
}
function saveAllSalaryUsers(btn) {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 showToast('Akses ditolak');
 return;
 }
 var bulanKey = getSalarySelectedMonth();
 var items = collectSalaryUserPayloads();
 if (!items.length) { showToast('Tidak ada data untuk disimpan'); return; }
 for (var i = 0; i < items.length; i++) {
 if (items[i].salary <= 0) { showToast('Gaji harus lebih dari 0 untuk semua karyawan'); return; }
 }
 if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
 gasCall('updateSalaryUsersBatch', [currentUser.id, bulanKey, items], function(res) {
 if (!res || res.error || res.success === false) {
 showToast((res && (res.msg || res.error)) || 'Gagal simpan semua perubahan');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan Semua Perubahan'; }
 return;
 }
 clearSalaryLocalCaches();
 showToast('Semua gaji dan kerajinan '+salaryMonthLabel(bulanKey)+' berhasil diperbarui');
 loadSalarySettings(true);
 }, function() {
 showToast('Gagal simpan semua perubahan');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan Semua Perubahan'; }
 });
}

function saveSalaryUser(userId, btn) {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 showToast('Akses ditolak');
 return;
 }
 var safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
 var input = document.getElementById('salary-' + safeId);
 var noteInput = document.getElementById('salary-note-' + safeId);
 var kerajinanInput = document.getElementById('kerajinan-' + safeId);
 var salary = parseInt(input ? input.value : 0, 10) || 0;
 var kerajinan = parseInt(kerajinanInput ? kerajinanInput.value : 0, 10) || 0;
 var bulanKey = getSalarySelectedMonth();
 var note = noteInput ? noteInput.value.trim() : '';
 if (salary <= 0) { showToast('Gaji harus lebih dari 0'); return; }
 if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
 gasCall('updateUserSalary', [currentUser.id, userId, salary, bulanKey, note, kerajinan], function(res) {
 if (!res || res.error || res.success === false) {
 showToast((res && (res.msg || res.error)) || 'Gagal simpan gaji');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
 return;
 }
 if (res.bonusKerajinan == null) {
 showToast('Backend belum menyimpan uang kerajinan. Deploy Apps Script terbaru dulu.');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
 return;
 }
 clearSalaryLocalCaches();
 showToast('Gaji dan kerajinan '+salaryMonthLabel(bulanKey)+' berhasil diperbarui');
 loadSalarySettings(true);
 }, function() {
 showToast('Gagal simpan gaji');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
 });
}
function deleteSalaryUser(userId, btn) {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 showToast('Akses ditolak');
 return;
 }
 var user = _salaryUserMap[userId] || {};
 var nama = user.nama || userId;
 if (!confirm('Hapus/nonaktifkan '+nama+'?\nKaryawan tidak bisa login lagi dan tidak muncul di payroll aktif.')) return;
 if (btn) { btn.disabled = true; btn.textContent = 'Menghapus...'; }
 gasCall('deactivateSalaryUser', [currentUser.id, userId], function(res) {
 if (!res || res.error || res.success === false) {
 showToast((res && (res.msg || res.error)) || 'Gagal hapus karyawan');
 if (btn) { btn.disabled = false; btn.textContent = 'Hapus'; }
 return;
 }
 _salaryUsersCache = [];
 Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
 Object.keys(_payrollDetailCache).forEach(function(k){ delete _payrollDetailCache[k]; });
 showToast((res.nama || nama)+' berhasil dinonaktifkan');
 loadSalarySettings(true);
 }, function() {
 showToast('Gagal hapus karyawan');
 if (btn) { btn.disabled = false; btn.textContent = 'Hapus'; }
 });
}

function renderPayrollSetupState(bulanKey) {
 var el = document.getElementById('payroll-content');
 if (!el) return;
 el.innerHTML =
 '<div class="card" style="padding:16px">' +
 '<div class="card-title"><div class="card-dot"></div>Penggajian belum aktif</div>' +
 '<div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:12px">' +
 'Struktur halaman payroll sudah siap. Tahap berikutnya adalah menambahkan sheet PAYROLL dan endpoint GAS agar preview gaji periode '+bulanKey+' bisa dihitung dari rekap absensi.' +
 '</div>' +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
 '<div style="background:#f8fafc;border:1px solid var(--gray-border);border-radius:8px;padding:10px"><div style="font-size:11px;color:var(--text-muted)">Periode</div><div style="font-size:14px;font-weight:800;color:var(--text-dark)">'+bulanKey+'</div></div>' +
 '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px"><div style="font-size:11px;color:#92400e">Status</div><div style="font-size:14px;font-weight:800;color:#c2410c">Menunggu GAS</div></div>' +
 '</div>' +
 '</div>' +
 '<div class="card" style="padding:16px">' +
 '<div class="card-title"><div class="card-dot"></div>Alur publish slip</div>' +
 '<div style="font-size:12px;color:var(--text-muted);line-height:1.8">' +
 '1. Finance membuat preview gaji bulan sebelumnya.<br>' +
 '2. Finance/Owner mengecek detail reward, denda, absen, dan adjustment.<br>' +
 '3. Setelah dikonfirmasi, sistem publish slip ke menu Slip Gaji karyawan.' +
 '</div>' +
 '</div>';
}

function renderPayrollPreview(res, bulanKey) {
 var el = document.getElementById('payroll-content');
 if (!el) return;
 var data = res.data || res.items || [];
 var status = res.status || 'DRAFT';
 var total = data.reduce(function(sum, r){ return sum + (parseInt(r.totalGaji || r.total || 0, 10) || 0); }, 0);
 var actionHtml = '';
 if (status === 'PREVIEW') {
 actionHtml = '<button class="btn btn-sm btn-primary" onclick="createPayrollDraftUI(&quot;'+bulanKey+'&quot;)">Buat Draf</button>';
 } else if (status === 'DRAFT') {
 actionHtml = '<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px">' +
 '<button class="btn btn-sm btn-secondary" onclick="syncPayrollAttendanceUI(&quot;'+(res.id || '')+'&quot;,&quot;'+bulanKey+'&quot;,this,false)">Sinkronkan Kehadiran</button>' +
 '<button class="btn btn-sm btn-primary" onclick="confirmPayrollUI(&quot;'+(res.id || '')+'&quot;,this)">Konfirmasi</button></div>';
 } else if (status === 'CONFIRMED') {
 actionHtml = '<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px">' +
 '<button class="btn btn-sm btn-secondary" onclick="syncPayrollAttendanceUI(&quot;'+(res.id || '')+'&quot;,&quot;'+bulanKey+'&quot;,this,false)">Sinkronkan Ulang</button>' +
 '<button class="btn btn-sm btn-gold" onclick="publishPayrollUI(&quot;'+(res.id || '')+'&quot;,this)">Terbitkan Slip</button></div>';
 } else {
 actionHtml = '<div class="payroll-published-actions"><span class="badge badge-green">Diterbitkan</span>' +
 (currentUser && currentUser.bagian === 'Owner'
 ? '<button class="btn btn-sm btn-danger-soft" onclick="cancelPayrollUI(&quot;'+(res.id || '')+'&quot;,&quot;'+bulanKey+'&quot;,this)">Batalkan Terbit</button>'
 : '') +
 '</div>';
 }
 var html =
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:18px;font-weight:800;color:var(--blue)">'+data.length+'</div><div style="font-size:11px;color:var(--text-muted)">Karyawan</div></div>' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:800;color:var(--green)">Rp '+total.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Estimasi Total</div></div>' +
 '</div>' +
 '<div class="card" style="padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">' +
 '<div><div style="font-size:13px;font-weight:800;color:var(--text-dark)">Penggajian '+bulanKey+'</div><div style="font-size:11px;color:var(--text-muted)">Status: '+payrollStatusLabel(status)+'</div></div>' +
 actionHtml +
 '</div>';

 if (!data.length) {
 html += '<div class="empty-state"><div class="empty-icon"></div>Belum ada data penggajian untuk periode ini</div>';
 } else {
 data.forEach(function(r, idx) {
 var detailId = 'payroll-detail-' + idx + '-' + String(r.userId || r.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
 var buttonHtml = r.id
 ? '<button class="btn btn-sm btn-primary" style="margin-top:10px;width:100%" onclick="togglePayrollDetail(&quot;'+r.id+'&quot;,&quot;'+detailId+'&quot;)">Lihat Detail</button>'
 : '<div style="font-size:11px;color:var(--text-muted);margin-top:10px">Buat draft untuk melihat rincian slip.</div>';
 html += '<div class="card" style="padding:12px;margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
 '<div><div style="font-size:13px;font-weight:800;color:var(--text-dark)">'+(r.nama || '-')+'</div><div style="font-size:11px;color:var(--text-muted)">'+(r.jabatan || '-')+' · '+(r.bagian || '-')+'</div></div>' +
 '<div style="font-size:13px;font-weight:800;color:var(--green);white-space:nowrap">Rp '+(parseInt(r.totalGaji || r.total || 0, 10) || 0).toLocaleString('id-ID')+'</div>' +
 '</div>' +
 renderPayrollMiniBreakdown(r) +
 buttonHtml +
 '<div id="'+detailId+'" style="display:none"></div>' +
 '</div>';
 });
 }
 el.innerHTML = html;
}

function renderPayrollMiniBreakdown(r) {
 var pokok = parseInt(r.gajiPokok || 0, 10) || 0;
 var reward = (parseInt(r.totalReward || 0, 10) || 0) + (parseInt(r.bonusKerajinan || 0, 10) || 0);
 var denda = parseInt(r.totalDenda || 0, 10) || 0;
 return '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">' +
 '<div style="background:#f8fafc;border-radius:7px;padding:7px;text-align:center"><div style="font-size:11px;font-weight:800;color:var(--text-dark)">Rp '+pokok.toLocaleString('id-ID')+'</div><div style="font-size:9px;color:var(--text-muted)">Pokok</div></div>' +
 '<div style="background:#f0fdf4;border-radius:7px;padding:7px;text-align:center"><div style="font-size:11px;font-weight:800;color:#16a34a">+Rp '+reward.toLocaleString('id-ID')+'</div><div style="font-size:9px;color:var(--text-muted)">Penghargaan</div></div>' +
 '<div style="background:#fff7f7;border-radius:7px;padding:7px;text-align:center"><div style="font-size:11px;font-weight:800;color:#dc2626">-Rp '+denda.toLocaleString('id-ID')+'</div><div style="font-size:9px;color:var(--text-muted)">Denda</div></div>' +
 '</div>';
}

function payrollStatusLabel(status) {
 var map = {
 PREVIEW: 'Pratinjau',
 DRAFT: 'Draf',
 CONFIRMED: 'Dikonfirmasi',
 PUBLISHED: 'Diterbitkan'
 };
 return map[String(status || '').toUpperCase()] || status || '-';
}

function togglePayrollDetail(payrollDetailId, targetId) {
 var target = document.getElementById(targetId);
 if (!target) return;
 if (target.style.display === 'block') {
 target.style.display = 'none';
 return;
 }
 target.style.display = 'block';
 if (_payrollDetailCache[payrollDetailId]) {
 target.innerHTML = renderPayrollDetailBox(_payrollDetailCache[payrollDetailId]);
 return;
 }
 target.innerHTML = skelCards(1);
 gasCall('getPayrollDetail', [payrollDetailId], function(res) {
 if (!res || res.success === false) {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Detail payroll belum tersedia</div>';
 return;
 }
 _payrollDetailCache[payrollDetailId] = res;
 target.innerHTML = renderPayrollDetailBox(res);
 }, function() {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Gagal memuat detail payroll</div>';
 });
}

function renderPayrollDetailBox(res) {
 var d = res.detail || res.slip || {};
 var items = res.items || [];
 var html = '<div style="margin-top:10px;border-top:1px solid var(--gray-border);padding-top:10px">';
 html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><div style="font-size:12px;font-weight:800;color:var(--text-dark)">Rincian Komponen</div>';
 if (d.payrollRunId && d.userId) html += '<button class="btn btn-sm btn-secondary" onclick="downloadEmployeeSlipPdf(&quot;'+salaryEsc(d.payrollRunId)+'&quot;,&quot;'+salaryEsc(d.userId)+'&quot;,this)">Download PDF</button>';
 html += '</div>';
 html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">';
 html += payrollMetric('Hadir', (d.hadir || 0) + ' hari', '#f0fdf4', '#16a34a');
 html += payrollMetric('Absen', (d.absen || 0) + ' hari', '#fff7f7', '#dc2626');
 html += payrollMetric('Telat', (d.telat || 0) + 'x', '#fff7ed', '#d97706');
 html += payrollMetric('Lembur', ((d.lemburPulang || 0) + (d.lemburMinggu || 0) + (d.lemburLibur || 0)) + 'x', '#eff6ff', '#1d4ed8');
 html += '</div>';
 html += payrollAmountRow('Gaji Pokok', d.gajiPokok, 'plus');
 html += payrollAmountRow('Penghargaan', d.totalReward, 'plus');
 html += payrollAmountRow('Bonus Kerajinan', d.bonusKerajinan, 'plus');
 html += payrollAmountRow('Denda', d.totalDenda, 'minus');
 if (d.adjustmentPlus) html += payrollAmountRow('Penyesuaian Tambahan', d.adjustmentPlus, 'plus');
 if (d.adjustmentMinus) html += payrollAmountRow('Penyesuaian Potongan', d.adjustmentMinus, 'minus');
 html += '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:var(--text-dark);padding-top:8px;border-top:1px solid var(--gray-border);margin-top:6px"><span>Total Diterima</span><span>Rp '+(parseInt(d.totalGaji || 0, 10) || 0).toLocaleString('id-ID')+'</span></div>';
 if (currentUser && (currentUser.bagian === 'Finance' || currentUser.bagian === 'Owner') && d.statusSlip !== 'PUBLISHED') {
 html += renderPayrollAdjustmentForm(d);
 }
 html += renderPayrollItems(items, {
  bisaHapusPenyesuaian: !!(currentUser && (currentUser.bagian === 'Finance' || currentUser.bagian === 'Owner') && d.statusSlip !== 'PUBLISHED'),
  payrollDetailId: d.id || ''
 });
 html += '</div>';
 return html;
}

/**
 * Form penyesuaian Finance. Kolom sengaja KOSONG setiap kali tampil (keputusan Ko
 * 2026-10-17): penyesuaian yang sudah disimpan MENUMPUK sebagai baris item, jadi
 * input ini untuk penyesuaian berikutnya. Ringkasan yang tersimpan ditampilkan di
 * atas form supaya angka lama tetap terlihat tanpa ikut nyangkut di kolom input.
 */
function renderPayrollAdjustmentForm(d) {
 var plusTersimpan = parseInt(d.adjustmentPlus || 0, 10) || 0;
 var minusTersimpan = parseInt(d.adjustmentMinus || 0, 10) || 0;
 var ringkas = '';
 if (plusTersimpan || minusTersimpan) {
  ringkas = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;line-height:1.6">Sudah tersimpan: ' +
   (plusTersimpan ? '<b style="color:#16a34a">+ Rp ' + plusTersimpan.toLocaleString('id-ID') + '</b>' : '') +
   (plusTersimpan && minusTersimpan ? ' · ' : '') +
   (minusTersimpan ? '<b style="color:#dc2626">- Rp ' + minusTersimpan.toLocaleString('id-ID') + '</b>' : '') +
   '<br>Hapus lewat tombol <b>Hapus</b> pada baris penyesuaian di item detail.</div>';
 }
 return '<div style="margin-top:12px;background:#f8fafc;border:1px solid var(--gray-border);border-radius:8px;padding:10px">' +
 '<div style="font-size:11px;font-weight:800;color:var(--text-dark);margin-bottom:8px">Penyesuaian Finance</div>' +
 ringkas +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
 '<div><label class="form-label">Tambahan</label><input class="form-input" type="number" id="adj-plus-'+d.id+'" value="" placeholder="0"></div>' +
 '<div><label class="form-label">Potongan</label><input class="form-input" type="number" id="adj-minus-'+d.id+'" value="" placeholder="0"></div>' +
 '</div>' +
 '<textarea class="form-input" id="adj-note-'+d.id+'" style="height:58px;margin-bottom:8px" placeholder="Catatan penyesuaian (mis. denda keterlambatan)"></textarea>' +
 '<button class="btn btn-sm btn-primary" id="adj-save-'+d.id+'" style="width:100%" onclick="savePayrollAdjustment(&quot;'+d.id+'&quot;)">Tambah Penyesuaian</button>' +
 '</div>';
}

function savePayrollAdjustment(payrollDetailId) {
 var plusEl = document.getElementById('adj-plus-' + payrollDetailId);
 var minusEl = document.getElementById('adj-minus-' + payrollDetailId);
 var noteEl = document.getElementById('adj-note-' + payrollDetailId);
 var saveBtn = document.getElementById('adj-save-' + payrollDetailId);
 var plus = parseInt((plusEl ? plusEl.value : 0), 10) || 0;
 var minus = parseInt((minusEl ? minusEl.value : 0), 10) || 0;
 var note = noteEl ? noteEl.value.trim() : '';
 // Nominal 0 tidak dikirim: penyesuaian yang sudah tersimpan tidak boleh terhapus
 // hanya karena kolom dibiarkan kosong (keputusan Ko 2026-10-17).
 if (plus <= 0 && minus <= 0) {
  showToast('Isi nominal tambahan atau potongan dulu');
  return;
 }
 if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan...'; }
 gasCall('updatePayrollAdjustment', [payrollDetailId, plus, minus, note], function(res) {
 if (!res || res.success === false) {
  showToast((res && res.msg) || 'Gagal simpan adjustment');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Tambah Penyesuaian'; }
  return;
 }
  _payrollDetailCache[payrollDetailId] = res;
  Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
  cacheClearAction('getPayrollPreview');
  cacheClearAction('getPayrollDetail');
  showToast('Penyesuaian ditambahkan');
  var boxes = document.querySelectorAll('[id^="payroll-detail-"]');
  boxes.forEach(function(box) {
  if (box.style.display === 'block' && box.innerHTML.indexOf('adj-plus-' + payrollDetailId) !== -1) {
  box.innerHTML = renderPayrollDetailBox(res);
  }
  });
  loadPayrollPreview();
 }, function() {
  showToast('Gagal simpan adjustment');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Tambah Penyesuaian'; }
 });
}

/**
 * Hapus SATU baris penyesuaian Finance (mis. salah input nominal).
 * Penyesuaian lain tidak tersentuh; total dihitung ulang di database.
 */
function hapusPayrollAdjustmentUI(itemId, payrollDetailId, btn) {
 if (!itemId) return;
 if (!confirm('Hapus baris penyesuaian ini?\n\nBaris lain tidak ikut terhapus.')) return;
 var teksAsli = btn ? btn.textContent : '';
 if (btn) { btn.disabled = true; btn.textContent = '...'; }
 gasCall('hapusPayrollAdjustment', [itemId], function(res) {
  if (!res || res.success === false) {
   showToast((res && res.msg) || 'Gagal hapus penyesuaian');
   if (btn) { btn.disabled = false; btn.textContent = teksAsli || 'Hapus'; }
   return;
  }
  if (payrollDetailId) _payrollDetailCache[payrollDetailId] = res;
  Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
  cacheClearAction('getPayrollPreview');
  cacheClearAction('getPayrollDetail');
  showToast('Penyesuaian dihapus');
  var boxes = document.querySelectorAll('[id^="payroll-detail-"]');
  boxes.forEach(function(box) {
   if (box.style.display === 'block' && box.innerHTML.indexOf('adj-plus-' + payrollDetailId) !== -1) {
    box.innerHTML = renderPayrollDetailBox(res);
   }
  });
  loadPayrollPreview();
 }, function() {
  showToast('Gagal hapus penyesuaian');
  if (btn) { btn.disabled = false; btn.textContent = teksAsli || 'Hapus'; }
 });
}

function payrollMetric(label, value, bg, color) {
 return '<div style="background:'+bg+';border-radius:7px;padding:8px;text-align:center"><div style="font-size:13px;font-weight:900;color:'+color+'">'+value+'</div><div style="font-size:9px;color:var(--text-muted)">'+label+'</div></div>';
}

function payrollAmountRow(label, value, type) {
 var n = parseInt(value || 0, 10) || 0;
 if (!n) return '';
 var color = type === 'minus' ? '#dc2626' : '#16a34a';
 var sign = type === 'minus' ? '-' : '+';
 return '<div style="display:flex;justify-content:space-between;font-size:11px;color:'+color+';padding:4px 0"><span>'+label+'</span><span style="font-weight:800">'+sign+' Rp '+n.toLocaleString('id-ID')+'</span></div>';
}

function payrollItemRowHtml(it, opsi) {
 var n = parseInt(it.nominal || 0, 10) || 0;
 var tipe = String(it.tipe || '');
 var minus = payrollItemIsDeduction(tipe, n);
 var kosong = n === 0;
 // Potongan selalu minus + merah; pendapatan plus + hijau; nominal nol netral tanpa tanda.
 var color = kosong ? 'var(--text-muted)' : (minus ? '#dc2626' : '#065f46');
 var tanda = kosong ? '' : (minus ? '-' : '+');
 var bolehHapus = opsi && opsi.bisaHapusPenyesuaian && /^ADJUSTMENT_/.test(tipe) && it.id;
 var tombolHapus = bolehHapus
  ? '<button type="button" onclick="hapusPayrollAdjustmentUI(&quot;'+salaryEsc(it.id)+'&quot;,&quot;'+salaryEsc(opsi.payrollDetailId || '')+'&quot;,this)" style="border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:800;cursor:pointer;margin-left:8px;white-space:nowrap">Hapus</button>'
  : '';
 var html = '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:8px;margin-bottom:6px;background:#fff">';
 html += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div style="font-size:11px;font-weight:800;color:var(--text-dark)">'+salaryEsc(payrollItemLabel(tipe))+'</div><div style="display:flex;align-items:center"><div style="font-size:11px;font-weight:900;color:'+color+'">'+tanda+' Rp '+Math.abs(n).toLocaleString('id-ID')+'</div>'+tombolHapus+'</div></div>';
 html += '<div style="font-size:10px;color:var(--text-muted);line-height:1.5;margin-top:3px">'+salaryEsc(((it.tanggal || '')+' '+formatPayrollItemDescription(it.keterangan || '')).trim())+'</div>';
 html += '</div>';
 return html;
}

/**
 * Item detail disusun berkelompok: semua penerimaan (+) dulu, lalu semua potongan (-),
 * lalu item tanpa nilai. Tiap kelompok punya subtotal supaya jumlahnya bisa dicocokkan
 * dengan komponen di atasnya (mis. total denda).
 */
function kelompokkanPayrollItems(items) {
 var hasil = { plus: [], minus: [], nol: [] };
 (items || []).forEach(function(it) {
  var mentah = parseInt(it.nominal || 0, 10) || 0;
  if (mentah === 0) { hasil.nol.push(it); return; }
  if (payrollItemIsDeduction(it.tipe, mentah)) hasil.minus.push(it);
  else hasil.plus.push(it);
 });
 var urut = function(a, b) {
  var t = String(a.tanggal || '').localeCompare(String(b.tanggal || ''));
  return t !== 0 ? t : String(a.tipe || '').localeCompare(String(b.tipe || ''));
 };
 hasil.plus.sort(urut); hasil.minus.sort(urut); hasil.nol.sort(urut);
 hasil.jumlahPlus = hasil.plus.reduce(function(s, it) { return s + Math.abs(parseInt(it.nominal || 0, 10) || 0); }, 0);
 hasil.jumlahMinus = hasil.minus.reduce(function(s, it) { return s + Math.abs(parseInt(it.nominal || 0, 10) || 0); }, 0);
 return hasil;
}

function renderPayrollItems(items, opsi) {
 if (!items || !items.length) return '<div style="font-size:11px;color:var(--text-muted);margin-top:10px">Belum ada item detail.</div>';
 var k = kelompokkanPayrollItems(items);
 var baris = function(it) { return payrollItemRowHtml(it, opsi); };
 var html = '<div style="font-size:11px;font-weight:800;color:var(--text-muted);margin-top:12px;margin-bottom:6px">ITEM DETAIL</div>';
 if (k.plus.length) {
  // Subtotal ditulis sebaris dengan judul kelompok supaya tidak terbaca seperti baris item.
  html += '<div style="font-size:11px;font-weight:900;color:#065f46;margin:8px 0 6px">PENERIMAAN (+) = + Rp '+k.jumlahPlus.toLocaleString('id-ID')+'</div>';
  html += k.plus.map(baris).join('');
 }
 if (k.minus.length) {
  html += '<div style="font-size:11px;font-weight:900;color:#dc2626;margin:12px 0 6px">POTONGAN (&minus;) = - Rp '+k.jumlahMinus.toLocaleString('id-ID')+'</div>';
  html += k.minus.map(baris).join('');
 }
 if (k.nol.length) {
  html += '<div style="font-size:11px;font-weight:900;color:var(--text-muted);margin:12px 0 6px">TANPA NILAI</div>';
  html += k.nol.map(baris).join('');
 }
 html += '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:900;color:var(--text-dark);border-top:1px solid var(--gray-border);padding-top:8px;margin-top:8px"><span>Selisih item detail (+ &minus; &minus;)</span><span>Rp '+(k.jumlahPlus - k.jumlahMinus).toLocaleString('id-ID')+'</span></div>';
 // Ruang bawah supaya baris terakhir tidak tertutup tombol "Pratinjau HP" yang melayang.
 html += '<div style="height:104px" aria-hidden="true"></div>';
 return html;
}

/**
 * Apakah satu item slip mengurangi gaji (potongan) atau menambah (pendapatan).
 * Jenis potongan yang dipakai sistem: DENDA_SP, DENDA_MANUAL, DENDA_ANOMALI,
 * POTONGAN_ABSEN, ADJUSTMENT_MINUS, ABSEN - jadi tidak boleh hanya mengecek "DENDA".
 */
function payrollItemIsDeduction(tipe, nominal) {
 var t = String(tipe || '').toUpperCase();
 var n = parseInt(nominal || 0, 10) || 0;
 if (n < 0) return true;
 if (t === 'ADJUSTMENT_MINUS' || t === 'ABSEN') return true;
 if (t.indexOf('DENDA') !== -1) return true;
 if (t.indexOf('POTONGAN') !== -1) return true;
 return false;
}

function payrollItemLabel(tipe) {
 var map = {
 DENDA_SP: 'Denda SP',
 DENDA_TELAT: 'Denda keterlambatan',
 DENDA_MANUAL: 'Denda manual',
 DENDA_ANOMALI: 'Denda tap anomali',
 REWARD_MANUAL: 'Penghargaan manual',
 LEMBUR_PULANG: 'Lembur pulang',
 LEMBUR_MINGGU: 'Lembur hari Minggu',
 LEMBUR_LIBUR: 'Lembur hari libur',
 POTONGAN_ABSEN: 'Potongan absen',
 BONUS_KERAJINAN: 'Bonus kerajinan',
 ADJUSTMENT_PLUS: 'Penyesuaian tambahan',
 ADJUSTMENT_MINUS: 'Penyesuaian potongan'
 };
 return map[tipe] || tipe;
}

function createPayrollDraftUI(bulanKey) {
 if (!currentUser) return;
 var el = document.getElementById('payroll-content');
 if (el) el.innerHTML = skelCards(3);
 cacheClearAction('getPayrollPreview');
 cacheClearAction('getPayrollDetail');
 gasCall('createPayrollDraft', [bulanKey, currentUser.nama], function(res) {
 if (!res || res.error || res.success === false || !res.id || String(res.status || '').toUpperCase() === 'PREVIEW') {
 renderPayrollSetupState(bulanKey);
 showToast((res && (res.msg || res.error)) || 'Draf belum berhasil dibuat');
 return;
 }
 cacheClearAction('getPayrollPreview');
 cacheClearAction('getPayrollDetail');
 _payrollPreviewCache[bulanKey] = res;
 renderPayrollPreview(res, bulanKey);
 showToast('Draf penggajian dibuat');
 }, function() {
 renderPayrollSetupState(bulanKey);
 showToast('Gagal membuat draf penggajian');
 });
}

function syncPayrollAttendanceUI(payrollRunId, bulanKey, button, automatic) {
 if (!payrollRunId || !currentUser) return;
 if (!automatic && !confirm('Sinkronkan penggajian dengan Catatan Kehadiran terbaru?\n\nJika sebelumnya sudah dikonfirmasi, status akan kembali ke Draf agar dapat diperiksa ulang.')) return;
 var originalText = button ? button.textContent : '';
 if (button) {
  button.disabled = true;
  button.textContent = 'Menyinkronkan...';
 }
 gasCall('syncPayrollAttendance', [payrollRunId], function(res) {
  delete _payrollAutoSyncing[bulanKey];
  if (!res || res.success === false) {
   if (button) { button.disabled = false; button.textContent = originalText; }
   showToast((res && res.msg) || 'Sinkronisasi penggajian gagal');
   return;
  }
  cacheClearAction('getPayrollPreview');
  cacheClearAction('getPayrollDetail');
  _payrollDetailCache = {};
  _payrollPreviewCache[bulanKey] = res;
  renderPayrollPreview(res, res.bulan || bulanKey);
  showToast(automatic ? 'Penggajian otomatis diselaraskan dengan kehadiran terbaru' : 'Penggajian sudah disinkronkan');
 }, function(err) {
  delete _payrollAutoSyncing[bulanKey];
  if (button) { button.disabled = false; button.textContent = originalText; }
  renderPayrollSetupState(bulanKey);
  showToast((err && err.message) || 'Sinkronisasi penggajian gagal');
 });
}

function confirmPayrollUI(payrollRunId, button) {
 if (!payrollRunId || !currentUser) return;
 if (!confirm('Konfirmasi penggajian ini?\n\nSistem akan menyinkronkan Catatan Kehadiran terbaru terlebih dahulu. Slip belum diterbitkan sampai tombol Terbitkan Slip ditekan.')) return;
 var originalText = button ? button.textContent : 'Konfirmasi';
 if (button) { button.disabled = true; button.textContent = 'Mengonfirmasi...'; }
 gasCall('confirmPayroll', [payrollRunId, currentUser.nama], function(res) {
 if (!res || res.success === false) {
  if (button) { button.disabled = false; button.textContent = originalText; }
  showToast((res && res.msg) || 'Gagal konfirmasi payroll');
  return;
 }
 if (res && res.bulan) _payrollPreviewCache[res.bulan] = res;
 renderPayrollPreview(res, res.bulan);
 showToast('Penggajian dikonfirmasi');
 }, function(err) {
 if (button) { button.disabled = false; button.textContent = originalText; }
 showToast((err && err.message) || 'Gagal konfirmasi payroll');
 });
}

function publishPayrollUI(payrollRunId, button) {
 if (!payrollRunId || !currentUser) return;
 if (!confirm('Terbitkan slip gaji ke semua karyawan untuk penggajian ini?')) return;
 var originalText = button ? button.textContent : 'Terbitkan Slip';
 if (button) { button.disabled = true; button.textContent = 'Menerbitkan...'; }
 gasCall('publishPayroll', [payrollRunId, currentUser.nama], function(res) {
 if (!res || res.success === false) {
  if (button) { button.disabled = false; button.textContent = originalText; }
  showToast((res && res.msg) || 'Gagal publish slip');
  return;
 }
 if (res && res.bulan) _payrollPreviewCache[res.bulan] = res;
 renderPayrollPreview(res, res.bulan);
 showToast('Slip gaji dipublish');
 }, function(err) {
 if (button) { button.disabled = false; button.textContent = originalText; }
 showToast((err && err.message) || 'Gagal publish slip');
 });
}

function cancelPayrollUI(payrollRunId, bulanKey, button) {
 if (!payrollRunId || !currentUser || currentUser.bagian !== 'Owner') return;
 var label = salaryMonthLabel(bulanKey || '');
 if (!confirm('Batalkan penerbitan slip '+label+'?\n\nSlip akan ditarik dari semua karyawan dan kembali ke status Dikonfirmasi. Data tidak dihapus dan dapat diterbitkan lagi.')) return;
 var originalText = button ? button.textContent : 'Batalkan Terbit';
 if (button) {
 button.disabled = true;
 button.textContent = 'Membatalkan...';
 }
 gasCall('cancelPayroll', [payrollRunId], function(res) {
 if (!res || res.success === false) {
 showToast((res && res.msg) || 'Gagal membatalkan slip');
 if (button) {
 button.disabled = false;
 button.textContent = originalText;
 }
 return;
 }
 cacheClearAction('getPayrollPreview');
 cacheClearAction('getPayrollDetail');
 cacheClearAction('getPayrollEmployeeSlip');
 cacheClearAction('getPayrollEmployeeSlipDetail');
 _slipDetailCache = {};
 if (res.bulan) _payrollPreviewCache[res.bulan] = res;
 renderPayrollPreview(res, res.bulan || bulanKey);
 showToast('Penerbitan slip dibatalkan. Data kembali ke tahap Dikonfirmasi.');
 }, function(err) {
 showToast((err && err.message) || 'Gagal membatalkan slip');
 if (button) {
 button.disabled = false;
 button.textContent = originalText;
 }
 });
}

function loadSlipGaji() {
 var el = document.getElementById('slip-gaji-content');
 if (!el || !currentUser) return;
 cacheClearAction('getPayrollEmployeeSlip');
 cacheClearAction('getPayrollEmployeeSlipDetail');
 if (isPayrollAdminViewer()) {
 loadPublishedEmployeeSlips();
 return;
 }
 el.innerHTML = skelCards(2);

 gasCall('getPayrollEmployeeSlip', [currentUser.id], function(res) {
 if (!res || res.error || res.success === false) {
 renderSlipSetupState();
 return;
 }
 renderSlipList(res.data || res.items || []);
 }, function() {
 renderSlipSetupState();
 });
}

function isPayrollAdminViewer() {
 return currentUser && (currentUser.bagian === 'Owner' || currentUser.bagian === 'Finance');
}

function buildRecentPayrollMonths(count) {
 var now = new Date();
 var months = [];
 for (var i = 1; i <= (count || 12); i++) {
 var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
 months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
 }
 return months;
}

function loadPublishedEmployeeSlips() {
 var el = document.getElementById('slip-gaji-content');
 if (!el) return;
 el.innerHTML = skelCards(3);
 cacheClearAction('getPublishedPayrollSlips');
 cacheClearAction('getPayrollDetail');
 gasCall('getPublishedPayrollSlips', [], function(res) {
  if (!res || res.error || res.success === false) {
   el.innerHTML = slipListErrorState(res && (res.msg || res.error || res.message));
   return;
  }
  renderAdminSlipList(res.data || res.items || []);
 }, function(err) {
  el.innerHTML = slipListErrorState(err && (err.msg || err.message || err));
 });
}
/**
 * Keadaan gagal saat memuat riwayat slip. Sebab asli ditampilkan (bukan disamarkan) supaya
 * Owner/Finance tahu harus berbuat apa — mis. fungsi RPC belum ada karena migrasi belum jalan.
 */
function slipListErrorState(sebab) {
 var pesan = sebab ? String(sebab) : '';
 var saran = /get_published_payroll_slips|does not exist|PGRST202|schema cache/i.test(pesan)
  ? ' Jalankan migrasi supabase/migrations/20261017000042_grouped_payroll_slips.sql di Supabase.'
  : ' Coba muat ulang halaman.';
 return '<div class="empty-state"><div class="empty-icon"></div>Riwayat slip belum dapat dimuat.' +
  (pesan ? '<br><small>Penyebab: ' + salaryEsc(pesan) + '</small>' : '') +
  '<br><small>' + saran.trim() + '</small></div>';
}
function renderSlipSetupState() {
 var el = document.getElementById('slip-gaji-content');
 if (!el) return;
 el.innerHTML =
 '<div class="card slip-empty-card">' +
 '<div class="card-title"><div class="card-dot"></div>Slip gaji belum tersedia</div>' +
 '<div class="slip-empty-copy">' +
 'Menu ini sudah disiapkan. Slip akan muncul di sini setelah Finance/Owner mengonfirmasi dan mem-publish payroll.' +
 '</div>' +
 '</div>';
}

function renderSlipList(items) {
 setSlipListData(items, false);
}

function renderAdminSlipList(items) {
 setSlipListData(items, true);
}

function setSlipListData(items, isAdmin) {
 _slipListState.items = Array.isArray(items) ? items.slice() : [];
 _slipListState.isAdmin = !!isAdmin;
 var available = getSlipAvailableMonths(_slipListState.items);
 if (_slipListState.month && available.indexOf(_slipListState.month) === -1) _slipListState.month = '';
 renderGroupedSlipList();
}

function getSlipAvailableMonths(items) {
 var seen = {};
 (items || []).forEach(function(item) {
  var key = String(item.bulan || item.periode || '');
  if (key) seen[key] = true;
 });
 return Object.keys(seen).sort(function(a, b) { return b.localeCompare(a); });
}

function changeSlipMonthFilter(value) {
 _slipListState.month = value || '';
 renderGroupedSlipList();
}

function changeSlipSort(value) {
 _slipListState.sort = value === 'ASC' ? 'ASC' : 'DESC';
 renderGroupedSlipList();
}

function renderGroupedSlipList() {
 var el = document.getElementById('slip-gaji-content');
 if (!el) return;
 var allItems = _slipListState.items || [];
 if (!allItems.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>' + (_slipListState.isAdmin ? 'Belum ada slip karyawan yang diterbitkan' : 'Belum ada slip yang diterbitkan') + '</div>';
 return;
 }
 var months = getSlipAvailableMonths(allItems);
 var filtered = allItems.filter(function(item) {
  return !_slipListState.month || String(item.bulan || item.periode || '') === _slipListState.month;
 });
 filtered.sort(function(a, b) {
  var monthCompare = String(a.bulan || '').localeCompare(String(b.bulan || ''));
  if (_slipListState.sort === 'DESC') monthCompare *= -1;
  if (monthCompare) return monthCompare;
  return String(a.nama || '').localeCompare(String(b.nama || ''));
 });
 var total = filtered.reduce(function(sum, s) { return sum + (parseInt(s.totalGaji || s.total || 0, 10) || 0); }, 0);
 var shownMonths = getSlipAvailableMonths(filtered);
 if (_slipListState.sort === 'ASC') shownMonths.reverse();
 var monthOptions = '<option value="">Semua bulan</option>' + months.map(function(month) {
  return '<option value="'+salaryEsc(month)+'"'+(_slipListState.month === month ? ' selected' : '')+'>'+salaryEsc(salaryMonthLabel(month))+'</option>';
 }).join('');
 var html = '<section class="slip-browser" aria-label="Riwayat slip gaji">' +
 '<div class="slip-toolbar">' +
 '<div class="slip-toolbar-copy"><strong>Riwayat Slip</strong><span>'+months.length+' bulan tersedia</span></div>' +
 '<div class="slip-filter-grid">' +
 '<label class="slip-filter-field"><span>Pilih bulan</span><select class="form-input" aria-label="Pilih bulan slip" onchange="changeSlipMonthFilter(this.value)">'+monthOptions+'</select></label>' +
 '<label class="slip-filter-field"><span>Urutkan</span><select class="form-input" aria-label="Urutkan slip" onchange="changeSlipSort(this.value)"><option value="DESC"'+(_slipListState.sort === 'DESC' ? ' selected' : '')+'>Terbaru dahulu</option><option value="ASC"'+(_slipListState.sort === 'ASC' ? ' selected' : '')+'>Terlama dahulu</option></select></label>' +
 '</div></div>' +
 '<div class="slip-summary-grid"><div class="card slip-summary-card"><strong>'+filtered.length+'</strong><span>Slip ditampilkan</span></div><div class="card slip-summary-card"><strong class="is-green">Rp '+total.toLocaleString('id-ID')+'</strong><span>Total gaji bersih</span></div></div>';

 if (!filtered.length) {
  html += '<div class="empty-state"><div class="empty-icon"></div>Tidak ada slip pada bulan yang dipilih</div>';
 } else {
  shownMonths.forEach(function(month) {
   var monthItems = filtered.filter(function(item) { return String(item.bulan || item.periode || '') === month; });
   var monthTotal = monthItems.reduce(function(sum, item) { return sum + (parseInt(item.totalGaji || item.total || 0, 10) || 0); }, 0);
   html += '<section class="slip-month-group" aria-labelledby="slip-month-'+salaryEsc(month)+'"><div class="slip-month-head"><div><span>PERIODE GAJI</span><h3 id="slip-month-'+salaryEsc(month)+'">'+salaryEsc(salaryMonthLabel(month))+'</h3></div><div><strong>'+monthItems.length+' slip</strong><span>Rp '+monthTotal.toLocaleString('id-ID')+'</span></div></div><div class="slip-month-list">';
   monthItems.forEach(function(item, index) { html += renderSlipListRow(item, index); });
   html += '</div></section>';
  });
 }
 html += '</section>';
 el.innerHTML = html;
}

function renderSlipListRow(s, index) {
 var safeId = String((s.id || s.payrollRunId || '') + '-' + (s.userId || index)).replace(/[^a-zA-Z0-9_-]/g, '');
 var targetId = 'slip-row-detail-' + safeId;
 var total = parseInt(s.totalGaji || s.total || 0, 10) || 0;
 var isAdmin = _slipListState.isAdmin;
 var title = isAdmin ? (s.nama || '-') : 'Slip Gaji';
 var meta = isAdmin ? ((s.jabatan || '-') + ' · ' + (s.bagian || '-')) : ('Diterbitkan ' + (s.dipublishPada || '-'));
 var detailAction = isAdmin
  ? 'toggleAdminSlipDetail(&quot;'+salaryEsc(s.id || '')+'&quot;,&quot;'+targetId+'&quot;)'
  : 'toggleSlipDetail(&quot;'+salaryEsc(s.payrollRunId || '')+'&quot;,&quot;'+targetId+'&quot;)';
 var userId = isAdmin ? (s.userId || '') : (currentUser && currentUser.id || '');
 return '<article class="slip-list-row">' +
  '<div class="slip-row-main"><div class="slip-row-identity"><div class="slip-document-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg></div><div><div class="slip-period">'+salaryEsc(title)+'</div><div class="slip-meta">'+salaryEsc(meta)+'</div></div></div>' +
  '<div class="slip-amount"><span>Gaji bersih</span><strong>Rp '+total.toLocaleString('id-ID')+'</strong></div></div>' +
  (isAdmin ? renderPayrollMiniBreakdown(s) : '') +
  '<div class="slip-actions"><button class="btn btn-sm btn-primary" aria-controls="'+targetId+'" onclick="'+detailAction+'">Lihat Rincian</button><button class="btn btn-sm btn-secondary" onclick="downloadEmployeeSlipPdf(&quot;'+salaryEsc(s.payrollRunId || '')+'&quot;,&quot;'+salaryEsc(userId)+'&quot;,this)">Unduh PDF</button></div>' +
  '<div id="'+targetId+'" class="slip-detail-panel" style="display:none"></div></article>';
}
function toggleSlipDetail(payrollRunId, targetId) {
 var target = document.getElementById(targetId);
 if (!target || !currentUser) return;
 if (target.style.display === 'block') {
 target.style.display = 'none';
 return;
 }
 target.style.display = 'block';
 if (_slipDetailCache[payrollRunId]) {
 target.innerHTML = renderPayrollDetailBox(_slipDetailCache[payrollRunId]);
 return;
 }
 target.innerHTML = skelCards(1);
 gasCall('getPayrollEmployeeSlipDetail', [currentUser.id, payrollRunId], function(res) {
 if (!res || res.success === false) {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Detail slip belum tersedia</div>';
 return;
 }
 _slipDetailCache[payrollRunId] = res;
 target.innerHTML = renderPayrollDetailBox(res);
 }, function() {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Gagal memuat detail slip</div>';
 });
}

function toggleAdminSlipDetail(payrollDetailId, targetId) {
 var target = document.getElementById(targetId);
 if (!target || !payrollDetailId) return;
 if (target.style.display === 'block') {
 target.style.display = 'none';
 return;
 }
 target.style.display = 'block';
 if (_payrollDetailCache[payrollDetailId]) {
 target.innerHTML = renderPayrollDetailBox(_payrollDetailCache[payrollDetailId]);
 return;
 }
 target.innerHTML = skelCards(1);
 gasCall('getPayrollDetail', [payrollDetailId], function(res) {
 if (!res || res.success === false) {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Detail slip belum tersedia</div>';
 return;
 }
 _payrollDetailCache[payrollDetailId] = res;
 target.innerHTML = renderPayrollDetailBox(res);
 }, function() {
 target.innerHTML = '<div class="empty-state" style="padding:12px">Gagal memuat detail slip</div>';
 });
}
