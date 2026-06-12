var _payrollPreviewCache = {};
var _payrollDetailCache = {};
var _slipDetailCache = {};
var _salaryUsersCache = [];
var _salaryUserMap = {};
var _salaryUsersMonth = '';
var _salarySelectedMonth = '';

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
 renderPayrollPreview(_payrollPreviewCache[bulanKey], bulanKey);
 return;
 }

 gasCall('getPayrollPreview', [bulanKey], function(res) {
 if (!res || res.error || res.success === false) {
 renderPayrollSetupState(bulanKey);
 return;
 }
 _payrollPreviewCache[bulanKey] = res;
 renderPayrollPreview(res, bulanKey);
 }, function() {
 renderPayrollSetupState(bulanKey);
 });
}

function salaryEsc(s) {
 return String(s == null ? '' : s)
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#39;');
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
 var html =
 '<div class="card" style="padding:12px;margin-bottom:10px">'+
 '<label class="form-label">Bulan Gaji Berlaku</label>'+
 '<select class="form-input" onchange="changeSalaryMonth(this.value)">'+buildSalaryMonthOptions(bulanKey)+'</select>'+
 '<div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin-top:8px">Gaji yang disimpan akan dipakai untuk perhitungan '+salaryMonthLabel(bulanKey)+' dan bulan setelahnya sampai ada perubahan baru.</div>'+
 '</div>' +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:18px;font-weight:900;color:var(--blue)">'+rows.length+'</div><div style="font-size:11px;color:var(--text-muted)">Karyawan</div></div>' +
 '<div class="card" style="padding:10px;text-align:center"><div style="font-size:14px;font-weight:900;color:var(--green)">Rp '+total.toLocaleString('id-ID')+'</div><div style="font-size:11px;color:var(--text-muted)">Total '+salaryMonthLabel(bulanKey)+'</div></div>' +
 '</div>' +
 '<button class="btn btn-sm btn-primary" style="width:100%;margin-bottom:10px" onclick="loadSalarySettings(true)">Refresh Data</button>';
 rows.forEach(function(r) {
 var id = String(r.id || '');
 var safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
 var effectiveSalary = parseInt(r.gajiBulanBerlaku || r.gajiBulanan || 0, 10) || 0;
 var activeSalary = parseInt(r.gajiBulanan || 0, 10) || 0;
 _salaryUserMap[id] = r;
 html += '<div class="card salary-user-card" data-search="'+salaryEsc((r.nama+' '+r.bagian+' '+r.jabatan).toLowerCase())+'" style="padding:12px;margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px">' +
 '<div><div style="font-size:13px;font-weight:900;color:var(--text-dark)">'+salaryEsc(r.nama)+'</div><div style="font-size:11px;color:var(--text-muted)">'+salaryEsc(r.jabatan || '-')+' &middot; '+salaryEsc(r.bagian || '-')+'</div></div>' +
 '<span class="badge '+(r.status === 'AKTIF' ? 'badge-green' : 'badge-gray')+'">'+salaryEsc(r.status || '-')+'</span>' +
 '</div>' +
 '<label class="form-label">Gaji untuk '+salaryMonthLabel(bulanKey)+'</label>' +
 '<input class="form-input" type="number" min="0" inputmode="numeric" id="salary-'+safeId+'" value="'+effectiveSalary+'" style="margin-bottom:8px">' +
 '<input class="form-input" type="text" id="salary-note-'+safeId+'" placeholder="Catatan perubahan gaji (opsional)" style="margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
 '<div style="font-size:11px;color:var(--text-muted)">Gaji aktif: <b>Rp '+activeSalary.toLocaleString('id-ID')+'</b><br>Untuk bulan ini: <b>Rp '+effectiveSalary.toLocaleString('id-ID')+'</b></div>' +
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

function saveSalaryUser(userId, btn) {
 if (!currentUser || (currentUser.bagian !== 'Finance' && currentUser.bagian !== 'Owner')) {
 showToast('Akses ditolak');
 return;
 }
 var safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
 var input = document.getElementById('salary-' + safeId);
 var noteInput = document.getElementById('salary-note-' + safeId);
 var salary = parseInt(input ? input.value : 0, 10) || 0;
 var bulanKey = getSalarySelectedMonth();
 var note = noteInput ? noteInput.value.trim() : '';
 if (salary <= 0) { showToast('Gaji harus lebih dari 0'); return; }
 if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
 gasCall('updateUserSalary', [currentUser.id, userId, salary, bulanKey, note], function(res) {
 if (!res || res.error || res.success === false) {
 showToast((res && (res.msg || res.error)) || 'Gagal simpan gaji');
 if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
 return;
 }
 _salaryUsersCache = [];
 _salaryUsersMonth = '';
 Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
 Object.keys(_payrollDetailCache).forEach(function(k){ delete _payrollDetailCache[k]; });
 showToast('Gaji '+salaryMonthLabel(bulanKey)+' berhasil diperbarui');
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
 actionHtml = '<button class="btn btn-sm btn-primary" onclick="confirmPayrollUI(&quot;'+(res.id || '')+'&quot;)">Konfirmasi</button>';
 } else if (status === 'CONFIRMED') {
 actionHtml = '<button class="btn btn-sm btn-gold" onclick="publishPayrollUI(&quot;'+(res.id || '')+'&quot;)">Terbitkan Slip</button>';
 } else {
 actionHtml = '<span class="badge badge-green">Diterbitkan</span>';
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
 html += '<div style="font-size:12px;font-weight:800;color:var(--text-dark);margin-bottom:8px">Rincian Komponen</div>';
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
 html += renderPayrollItems(items);
 html += '</div>';
 return html;
}

function renderPayrollAdjustmentForm(d) {
 return '<div style="margin-top:12px;background:#f8fafc;border:1px solid var(--gray-border);border-radius:8px;padding:10px">' +
 '<div style="font-size:11px;font-weight:800;color:var(--text-dark);margin-bottom:8px">Penyesuaian Finance</div>' +
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
 '<div><label class="form-label">Tambahan</label><input class="form-input" type="number" id="adj-plus-'+d.id+'" value="'+(parseInt(d.adjustmentPlus || 0, 10) || 0)+'" placeholder="0"></div>' +
 '<div><label class="form-label">Potongan</label><input class="form-input" type="number" id="adj-minus-'+d.id+'" value="'+(parseInt(d.adjustmentMinus || 0, 10) || 0)+'" placeholder="0"></div>' +
 '</div>' +
 '<textarea class="form-input" id="adj-note-'+d.id+'" style="height:58px;margin-bottom:8px" placeholder="Catatan penyesuaian">'+(d.catatanAdjustment || '')+'</textarea>' +
 '<button class="btn btn-sm btn-primary" style="width:100%" onclick="savePayrollAdjustment(&quot;'+d.id+'&quot;)">Simpan Penyesuaian</button>' +
 '</div>';
}

function savePayrollAdjustment(payrollDetailId) {
 var plusEl = document.getElementById('adj-plus-' + payrollDetailId);
 var minusEl = document.getElementById('adj-minus-' + payrollDetailId);
 var noteEl = document.getElementById('adj-note-' + payrollDetailId);
 var plus = plusEl ? plusEl.value : 0;
 var minus = minusEl ? minusEl.value : 0;
 var note = noteEl ? noteEl.value.trim() : '';
 gasCall('updatePayrollAdjustment', [payrollDetailId, plus, minus, note], function(res) {
 if (!res || res.success === false) {
 showToast((res && res.msg) || 'Gagal simpan adjustment');
 return;
 }
 _payrollDetailCache[payrollDetailId] = res;
 Object.keys(_payrollPreviewCache).forEach(function(k){ delete _payrollPreviewCache[k]; });
 showToast('Penyesuaian disimpan');
 var boxes = document.querySelectorAll('[id^="payroll-detail-"]');
 boxes.forEach(function(box) {
 if (box.style.display === 'block' && box.innerHTML.indexOf('adj-plus-' + payrollDetailId) !== -1) {
 box.innerHTML = renderPayrollDetailBox(res);
 }
 });
 loadPayrollPreview();
 }, function() {
 showToast('Gagal simpan adjustment');
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

function renderPayrollItems(items) {
 if (!items.length) return '<div style="font-size:11px;color:var(--text-muted);margin-top:10px">Belum ada item detail.</div>';
 var html = '<div style="font-size:11px;font-weight:800;color:var(--text-muted);margin-top:12px;margin-bottom:6px">ITEM DETAIL</div>';
 items.forEach(function(it) {
 var n = parseInt(it.nominal || 0, 10) || 0;
 var tipe = String(it.tipe || '');
 var color = n < 0 || tipe.indexOf('DENDA') !== -1 || tipe.indexOf('POTONGAN') !== -1 ? '#dc2626' : '#065f46';
 html += '<div style="border:1px solid var(--gray-border);border-radius:8px;padding:8px;margin-bottom:6px;background:#fff">';
 html += '<div style="display:flex;justify-content:space-between;gap:8px"><div style="font-size:11px;font-weight:800;color:var(--text-dark)">'+payrollItemLabel(tipe)+'</div><div style="font-size:11px;font-weight:900;color:'+color+'">Rp '+Math.abs(n).toLocaleString('id-ID')+'</div></div>';
 html += '<div style="font-size:10px;color:var(--text-muted);line-height:1.5;margin-top:3px">'+(it.tanggal || '')+' '+(it.keterangan || '')+'</div>';
 html += '</div>';
 });
 return html;
}

function payrollItemLabel(tipe) {
 var map = {
 DENDA_SP: 'Denda SP',
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
 gasCall('createPayrollDraft', [bulanKey, currentUser.nama], function(res) {
 _payrollPreviewCache[bulanKey] = res;
 renderPayrollPreview(res, bulanKey);
 showToast('Draf penggajian dibuat');
 }, function() {
 renderPayrollSetupState(bulanKey);
 showToast('Gagal membuat draf penggajian');
 });
}

function confirmPayrollUI(payrollRunId) {
 if (!payrollRunId || !currentUser) return;
 if (!confirm('Konfirmasi penggajian ini? Slip belum diterbitkan sampai tombol Terbitkan Slip ditekan.')) return;
 gasCall('confirmPayroll', [payrollRunId, currentUser.nama], function(res) {
 if (res && res.bulan) _payrollPreviewCache[res.bulan] = res;
 renderPayrollPreview(res, res.bulan);
 showToast('Penggajian dikonfirmasi');
 }, function() {
 showToast('Gagal konfirmasi payroll');
 });
}

function publishPayrollUI(payrollRunId) {
 if (!payrollRunId || !currentUser) return;
 if (!confirm('Terbitkan slip gaji ke semua karyawan untuk penggajian ini?')) return;
 gasCall('publishPayroll', [payrollRunId, currentUser.nama], function(res) {
 if (res && res.bulan) _payrollPreviewCache[res.bulan] = res;
 renderPayrollPreview(res, res.bulan);
 showToast('Slip gaji dipublish');
 }, function() {
 showToast('Gagal publish slip');
 });
}

function loadSlipGaji() {
 var el = document.getElementById('slip-gaji-content');
 if (!el || !currentUser) return;
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

function renderSlipSetupState() {
 var el = document.getElementById('slip-gaji-content');
 if (!el) return;
 el.innerHTML =
 '<div class="card" style="padding:16px">' +
 '<div class="card-title"><div class="card-dot"></div>Slip gaji belum tersedia</div>' +
 '<div style="font-size:12px;color:var(--text-muted);line-height:1.6">' +
 'Menu ini sudah disiapkan. Slip akan muncul di sini setelah Finance/Owner mengonfirmasi dan mem-publish payroll.' +
 '</div>' +
 '</div>';
}

function renderSlipList(items) {
 var el = document.getElementById('slip-gaji-content');
 if (!el) return;
 if (!items.length) {
 el.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>Belum ada slip yang dipublish</div>';
 return;
 }
 el.innerHTML = items.map(function(s) {
 var targetId = 'slip-detail-' + String(s.payrollRunId || s.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
 return '<div class="card" style="padding:12px;margin-bottom:8px">' +
 '<div style="display:flex;justify-content:space-between;align-items:center">' +
 '<div><div style="font-size:13px;font-weight:800;color:var(--text-dark)">'+(s.bulan || s.periode || '-')+'</div><div style="font-size:11px;color:var(--text-muted)">Dipublish '+(s.dipublishPada || '-')+'</div></div>' +
 '<div style="font-size:13px;font-weight:800;color:var(--green)">Rp '+(parseInt(s.totalGaji || s.total || 0, 10) || 0).toLocaleString('id-ID')+'</div>' +
 '</div>' +
 '<button class="btn btn-sm btn-primary" style="margin-top:10px;width:100%" onclick="toggleSlipDetail(&quot;'+(s.payrollRunId || '')+'&quot;,&quot;'+targetId+'&quot;)">Lihat Slip</button>' +
 '<div id="'+targetId+'" style="display:none"></div>' +
 '</div>';
 }).join('');
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
