/* Izin datang terlambat. Semua nominal keputusan dihitung ulang di Supabase. */
var lateLeaveRows = Object.create(null);
function lateLeaveMoney(value) {
 return 'Rp ' + Math.round(Number(value) || 0).toLocaleString('id-ID');
}
function renderLateLeaveReviews(rows) {
 return rows.map(function(row) {
  lateLeaveRows[row.id] = row;
  var id = esc(row.id), basis = row.basisIzin;
  return '<article class="review-telat-card leave-review-card" data-search="'+esc([row.nama,row.tanggal,row.statusReview,row.alasan].join(' ').toLowerCase())+'">'+
   '<div class="leave-review-heading"><div><h3>'+esc(row.nama)+'</h3><p>'+esc(row.tanggal)+' &middot; Masuk '+esc(row.jamMasuk)+'</p></div><span class="leave-review-badge">'+esc(row.statusReview.replace(/_/g,' '))+'</span></div>'+
   '<p>Jadwal '+esc(row.jadwalMasuk || '-')+' &middot; '+Number(row.menitTelat || 0)+' menit setelah jadwal</p>'+
   '<div class="leave-review-summary"><span>Potongan saat ini<strong>'+lateLeaveMoney(row.potonganFinal)+'</strong></span><span>Jika dijadikan izin<strong>'+(basis && !basis.error ? lateLeaveMoney(basis.potonganIzin) : 'Belum tersedia')+'</strong></span></div>'+
   '<p>'+esc(row.alasan || 'Belum ada alasan izin.')+'</p>'+
   (row.terkunci ? '<p class="leave-review-help">Slip sudah terbit. Batalkan penerbitannya untuk mengubah keputusan.</p>' :
    '<button class="btn btn-primary" onclick="openLateLeaveDecision(\''+id+'\')">'+(row.statusReview==='MENUNGGU'?'Jadikan Izin / Tinjau':'Ubah Keputusan')+'</button>')+'</article>';
 }).join('');
}
function openLateLeaveForDay(userId, tanggal, button) {
 if (button) { button.disabled=true; button.textContent='Memuat...'; }
 gasCall('getIzinTelatReview',['ALL',tanggal.slice(0,7)],function(rows) {
  if (button) { button.disabled=false; button.textContent='Atur Izin Kedatangan'; }
  var row=(rows || []).find(function(r){ return r.userId===userId && r.tanggal===tanggal; });
  if (!row) { showToast('Belum ada rekap telat untuk tanggal ini. Proses ke Rekap Resmi terlebih dahulu.'); return; }
  lateLeaveRows[row.id]=row;
  closeAttendanceEdit();
  openLateLeaveDecision(row.id);
 },function(error) {
  if (button) { button.disabled=false; button.textContent='Atur Izin Kedatangan'; }
  showToast((error && error.message) || 'Gagal memuat keputusan. Coba lagi.');
 });
}
var lateLeavePreviousFocus;
function openLateLeaveDecision(id) {
 var r=lateLeaveRows[id];
 if (!r || r.terkunci) { showToast('Slip sudah terbit; batalkan penerbitan dahulu.'); return; }
 closeLateLeaveDecision();
 lateLeavePreviousFocus=document.activeElement;
 var b=r.basisIzin, ready=!!(b && !b.error);
 var html='<div class="att-modal-backdrop" id="late-leave-modal"><section class="att-modal leave-review-dialog" role="dialog" aria-modal="true" aria-labelledby="late-leave-title">'+
 '<h3 id="late-leave-title">Atur Izin Kedatangan</h3><p>'+esc(r.nama)+' &middot; '+esc(r.tanggal)+'</p>'+
 (ready ? '<div class="leave-review-summary"><span>Durasi izin<strong>'+Number(b.menitIzin)+' menit</strong></span><span>Potongan izin<strong>'+lateLeaveMoney(b.potonganIzin)+'</strong></span></div><p class="leave-review-help">Gaji pokok '+lateLeaveMoney(b.gajiBulanan)+' &divide; '+Number(b.hariKerja)+' hari kerja &divide; '+(Number(b.menitShift)/60)+' jam. Dihitung sesuai menit yang tidak bekerja, tanpa pembulatan ke jam.</p>' : '<p role="alert">'+esc(b && b.error || 'Perhitungan baru belum tersedia. Jalankan pembaruan database terlebih dahulu.')+'</p>')+
 '<label for="late-leave-kind">Keputusan</label><select class="form-input" id="late-leave-kind"><option value="IZIN_KHUSUS">Izin datang terlambat</option><option value="NORMAL">Telat biasa</option><option value="BEBAS">Bebas potongan (tetap telat)</option></select>'+
 '<label for="late-leave-reason">Alasan / keterangan</label><textarea class="form-input" id="late-leave-reason" rows="3" maxlength="500" oninput="document.getElementById(\'late-leave-error\').textContent=\'\'" placeholder="Contoh: izin mengantar keluarga berobat">'+esc(r.alasan || '')+'</textarea>'+
 '<p class="leave-review-help">Izin yang disetujui tidak menambah jumlah telat atau sanksi keterlambatan. Jam masuk asli tetap disimpan.</p>'+
 '<p id="late-leave-error" role="alert"></p><div class="leave-review-actions"><button class="btn btn-secondary" id="late-leave-cancel" onclick="closeLateLeaveDecision()">Batal</button><button class="btn btn-primary" id="late-leave-save" '+(!ready?'disabled':'')+' onclick="saveLateLeaveDecision(\''+esc(id)+'\')">Simpan Keputusan</button></div></section></div>';
 document.body.insertAdjacentHTML('beforeend',html);
 document.getElementById('late-leave-kind').value=r.statusReview==='TELAT_NORMAL'?'NORMAL':r.statusReview==='BEBAS_POTONGAN'?'BEBAS':'IZIN_KHUSUS';
 document.getElementById('late-leave-kind').focus();
 document.getElementById('late-leave-modal').addEventListener('keydown',function(e) {
  if(e.key==='Escape' && !document.getElementById('late-leave-save').dataset.busy) closeLateLeaveDecision();
  if(e.key==='Tab') {
   var nodes=Array.from(this.querySelectorAll('button:not(:disabled),select,textarea'));
   var first=nodes[0],last=nodes[nodes.length-1];
   if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
}
function closeLateLeaveDecision() {
 var el=document.getElementById('late-leave-modal');
 if(el) el.remove();
 if(lateLeavePreviousFocus && lateLeavePreviousFocus.isConnected) lateLeavePreviousFocus.focus();
}
function saveLateLeaveDecision(id) {
 var kind=document.getElementById('late-leave-kind').value;
 var reason=document.getElementById('late-leave-reason').value.trim();
 var error=document.getElementById('late-leave-error');
 if(kind==='IZIN_KHUSUS' && !reason){error.textContent='Isi alasan izin terlebih dahulu.';return;}
 var save=document.getElementById('late-leave-save'),cancel=document.getElementById('late-leave-cancel');
 if(save.dataset.busy) return;
 save.dataset.busy='1';save.disabled=true;cancel.disabled=true;save.textContent='Menyimpan...';error.textContent='';
 function failed(message){delete save.dataset.busy;save.disabled=false;cancel.disabled=false;save.textContent='Simpan Keputusan';error.textContent=message;}
 gasCall('reviewIzinTelat',[id,kind,0,reason,'',''],function(result){
  if(!result || !result.success){failed(result && result.msg || 'Keputusan belum tersimpan.');return;}
  closeLateLeaveDecision();
  clearAttendanceMatrixCache(null,null);
  loadReviewTelat(true);
  loadAttendanceMatrix(true);
  showToast(result.msg || 'Keputusan tersimpan.');
 },function(e){failed(e && e.message || 'Koneksi gagal. Coba kembali.');});
}
