// ============================================================================
// Hosela Hub — Laporan Dashboard PC
// ============================================================================
// Kumpulan fungsi untuk halaman utama pada tampilan PC (desktop):
//   1) ringkasan kehadiran HARI INI  (siapa terlambat, siapa belum absen)
//   2) ringkasan kinerja BULAN INI   (telat, absen, denda, bintang, peringkat)
//   3) penyusun HTML kartu laporan + daftar menu sidebar
//
// Semua fungsi di sini MURNI (tidak menyentuh DOM/jaringan) supaya bisa diuji
// otomatis di tests/pc-dashboard.test.mjs. Yang mengurus DOM tetap di app.js.
// ============================================================================

function pcEscape(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pcIcon(name) {
  try {
    return (typeof uiIcon === 'function') ? uiIcon(name) : '';
  } catch (e) {
    return '';
  }
}

function pcTodayKey(d) {
  var t = d ? new Date(d) : new Date();
  if (!t || isNaN(t.getTime())) t = new Date();
  return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
}

function pcJamSingkat(v) {
  var s = String(v === undefined || v === null ? '' : v);
  if (!s) return '';
  return s.length >= 5 ? s.substring(0, 5) : s;
}

function pcRupiah(n) {
  var v = Number(n || 0);
  return 'Rp ' + v.toLocaleString('id-ID');
}

// ---------------------------------------------------------------------------
// 1) Ringkasan kehadiran hari ini, dihitung dari data matriks absensi bulan ini
//    (gabungan attendance_events + attendance_details + jadwal kerja).
// ---------------------------------------------------------------------------
function pcAttendanceSummary(matrix, todayKey, opsi) {
  var out = {
    total: 0, hadir: 0, tepatWaktu: 0, terlambat: 0, belum: 0, sudahPulang: 0,
    anomali: 0, alpa: 0, terlambatList: [], belumList: [], anomaliList: [], liburNama: ''
  };
  if (!matrix || !matrix.users || !matrix.users.length) return out;
  var day = parseInt(String(todayKey || '').substring(8, 10), 10);
  out.total = matrix.users.length;
  matrix.users.forEach(function (u) {
    var cell = (u.days && !isNaN(day)) ? u.days[day] : null;
    var dasar = { nama: u.nama, bagian: u.bagian };
    if (!cell) {
      out.belum++;
      out.belumList.push({ nama: u.nama, bagian: u.bagian });
      return;
    }
    if (cell.anomali && !cell.masuk && !cell.pulang) {
      out.anomali++;
      out.anomaliList.push({ nama: u.nama, bagian: u.bagian, tipe: cell.anomaliTipe || '' });
      return;
    }
    if (!cell.masuk && !cell.pulang && cell.absen) { out.alpa++; return; }
    if (cell.masuk) {
      out.hadir++;
      if (cell.telat) {
        out.terlambat++;
        out.terlambatList.push({ nama: u.nama, bagian: u.bagian, masuk: pcJamSingkat(cell.masuk), jadwal: pcJamSingkat(cell.jadwalMasuk) || '08:00' });
      } else {
        out.tepatWaktu++;
      }
      if (cell.pulang) out.sudahPulang++;
      return;
    }
    if (cell.pulang) { out.hadir++; out.sudahPulang++; return; }
    out.belum++;
    out.belumList.push({ nama: u.nama, bagian: u.bagian });
  });
  // Yang paling telat muncul paling atas (jam masuk paling besar).
  out.terlambatList.sort(function (a, b) { return String(b.masuk).localeCompare(String(a.masuk)); });
  out.belumList.sort(function (a, b) { return String(a.nama || '').localeCompare(String(b.nama || '')); });
  if (opsi && opsi.liburNama) out.liburNama = String(opsi.liburNama);
  return out;
}

// ---------------------------------------------------------------------------
// 2) Ringkasan kinerja bulan ini, dari getRekapBulananSemua.
// ---------------------------------------------------------------------------
function pcPerformanceSummary(rekap) {
  var out = {
    ada: false, jumlah: 0, totalTelat: 0, totalAbsen: 0, totalDenda: 0, totalReward: 0,
    rataSkor: 0, hadirTotal: 0, top: [], perhatian: []
  };
  var rows = (rekap && rekap.data) || [];
  if (!rows.length) return out;
  out.ada = true;
  var skorSum = 0;
  rows.forEach(function (r) {
    out.jumlah++;
    out.totalTelat += Number(r.telat || 0);
    out.totalAbsen += Number(r.absen || 0);
    out.totalDenda += Number(r.totalDenda || 0);
    out.totalReward += Number(r.totalReward || 0);
    out.hadirTotal += Number(r.hadir || 0);
    skorSum += Number(r.skor || 0);
  });
  out.rataSkor = out.jumlah ? Math.round(skorSum / out.jumlah) : 0;
  out.top = rows.slice().sort(function (a, b) { return Number(b.skor || 0) - Number(a.skor || 0); }).slice(0, 3)
    .map(function (r) {
      return { nama: r.nama, bagian: r.bagian, skor: Number(r.skor || 0), bintang: Number(r.bintang || 0), telat: Number(r.telat || 0) };
    });
  out.perhatian = rows.slice()
    .filter(function (r) { return Number(r.telat || 0) > 0 || Number(r.absen || 0) > 0; })
    .sort(function (a, b) {
      return (Number(b.telat || 0) + Number(b.absen || 0) * 2) - (Number(a.telat || 0) + Number(a.absen || 0) * 2);
    })
    .slice(0, 3)
    .map(function (r) {
      return { nama: r.nama, bagian: r.bagian, telat: Number(r.telat || 0), absen: Number(r.absen || 0), denda: Number(r.totalDenda || 0) };
    });
  return out;
}

// Nama hari libur untuk tanggal tertentu. getKalenderLibur mengirim tanggal
// sudah terformat ("14 Okt 2026"), jadi dibandingkan dengan format yang sama.
function pcLiburHariIni(daftarLibur, todayKey) {
  var list = daftarLibur || [];
  var target = pcTanggalId(todayKey);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i] && list[i].tanggal || '') === target) return String(list[i].nama || 'Libur');
  }
  return '';
}

function pcTanggalId(todayKey) {
  var MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var t = new Date(String(todayKey || pcTodayKey()) + 'T12:00:00');
  if (isNaN(t.getTime())) t = new Date();
  return t.getDate() + ' ' + MONTH_ID[t.getMonth()] + ' ' + t.getFullYear();
}

// Ringkasan pribadi (untuk karyawan): status hari ini + hitungan bulan ini.
function pcPersonalSummary(matrix, todayKey) {
  var out = { masuk: '', pulang: '', jadwal: '', telat: false, hadir: 0, telatCount: 0, absen: 0, anomali: 0 };
  if (!matrix || !matrix.users || !matrix.users.length) return out;
  var u = matrix.users[0];
  var day = parseInt(String(todayKey || '').substring(8, 10), 10);
  var cell = (u.days && !isNaN(day)) ? u.days[day] : null;
  if (cell) {
    out.masuk = pcJamSingkat(cell.masuk);
    out.pulang = pcJamSingkat(cell.pulang);
    out.jadwal = pcJamSingkat(cell.jadwalMasuk);
    out.telat = !!cell.telat;
  }
  Object.keys(u.days || {}).forEach(function (k) {
    var c = u.days[k];
    if (c.masuk) { out.hadir++; if (c.telat) out.telatCount++; }
    else if (c.absen) out.absen++;
    if (c.anomali && !c.masuk && !c.pulang) out.anomali++;
  });
  return out;
}

// ---------------------------------------------------------------------------
// 3) Penyusun HTML
// ---------------------------------------------------------------------------
function pcMetricHtml(label, value, sub, tone) {
  return '<div class="pc-metric' + (tone ? ' pc-metric-' + tone : '') + '">' +
    '<div class="pc-metric-label">' + pcEscape(label) + '</div>' +
    '<div class="pc-metric-value">' + pcEscape(value) + '</div>' +
    (sub ? '<div class="pc-metric-sub">' + pcEscape(sub) + '</div>' : '') +
    '</div>';
}

function pcEmptyRowHtml(text) {
  return '<div class="pc-empty">' + pcEscape(text) + '</div>';
}

function pcAttendanceCardHtml(sum, opsi) {
  var persen = sum.total ? Math.round((sum.hadir / sum.total) * 100) : 0;
  var html = '<section class="pc-card pc-card-wide" id="pc-card-attendance">' +
    '<div class="pc-card-head">' +
    '<div><div class="pc-card-kicker">KEHADIRAN HARI INI</div>' +
    '<h3>' + sum.hadir + ' dari ' + sum.total + ' karyawan sudah absen masuk</h3></div>' +
    '<button type="button" class="pc-link" onclick="goTo(\'s-catatan-kehadiran\')">Catatan Kehadiran &rarr;</button>' +
    '</div>';

  if (sum.liburNama) {
    html += '<div class="pc-note pc-note-info">Hari ini libur: ' + pcEscape(sum.liburNama) + '</div>';
  }

  html += '<div class="pc-metric-row">' +
    pcMetricHtml('Hadir', sum.hadir + '/' + sum.total, persen + '% dari tim') +
    pcMetricHtml('Terlambat', String(sum.terlambat), sum.tepatWaktu + ' orang tepat waktu', sum.terlambat ? 'warn' : '') +
    pcMetricHtml('Belum absen', String(sum.belum), (opsi && opsi.jamSekarang) ? 'per ' + opsi.jamSekarang : '', sum.belum ? 'danger' : '') +
    pcMetricHtml('Sudah pulang', String(sum.sudahPulang), 'tap pulang tercatat') +
    (sum.anomali ? pcMetricHtml('Perlu konfirmasi', String(sum.anomali), 'tap menunggu Finance', 'warn') : '') +
    '</div>';

  html += '<div class="pc-split">';
  html += '<div class="pc-list-box"><div class="pc-list-title">Terlambat hari ini</div>';
  html += sum.terlambatList.length
    ? sum.terlambatList.map(function (x) {
      return '<div class="pc-list-row"><div><b>' + pcEscape(x.nama) + '</b><small>' + pcEscape(x.bagian || '-') + '</small></div>' +
        '<span class="pc-chip pc-chip-warn">masuk ' + pcEscape(x.masuk) + '</span></div>';
    }).join('')
    : pcEmptyRowHtml('Tidak ada yang terlambat hari ini.');
  html += '</div>';

  html += '<div class="pc-list-box"><div class="pc-list-title">Belum absen</div>';
  html += sum.belumList.length
    ? sum.belumList.slice(0, 8).map(function (x) {
      return '<div class="pc-list-row"><div><b>' + pcEscape(x.nama) + '</b><small>' + pcEscape(x.bagian || '-') + '</small></div>' +
        '<span class="pc-chip pc-chip-danger">belum tap</span></div>';
    }).join('') + (sum.belumList.length > 8 ? '<div class="pc-empty">+' + (sum.belumList.length - 8) + ' karyawan lainnya</div>' : '')
    : pcEmptyRowHtml('Semua karyawan sudah absen masuk.');
  html += '</div></div></section>';
  return html;
}

function pcPerformanceCardHtml(perf, bulanLabel) {
  if (!perf || !perf.ada) {
    return '<section class="pc-card" id="pc-card-performance">' +
      '<div class="pc-card-head"><div><div class="pc-card-kicker">KINERJA ' + pcEscape(bulanLabel || '') + '</div>' +
      '<h3>Belum ada rekap bulan ini</h3></div></div>' +
      pcEmptyRowHtml('Rekap muncul setelah absensi bulan ini diproses (menu Laporan Absensi).') +
      '</section>';
  }
  var html = '<section class="pc-card" id="pc-card-performance">' +
    '<div class="pc-card-head"><div><div class="pc-card-kicker">KINERJA ' + pcEscape(bulanLabel || '') + '</div>' +
    '<h3>' + perf.jumlah + ' karyawan, rata-rata skor ' + perf.rataSkor + '/100</h3></div>' +
    '<button type="button" class="pc-link" onclick="goTo(\'s-laporan-absensi\')">Laporan Absensi &rarr;</button>' +
    '</div>' +
    '<div class="pc-metric-row">' +
    pcMetricHtml('Total telat', String(perf.totalTelat), 'sepanjang bulan', perf.totalTelat ? 'warn' : '') +
    pcMetricHtml('Total absen', String(perf.totalAbsen), 'tanpa keterangan', perf.totalAbsen ? 'danger' : '') +
    pcMetricHtml('Total denda', pcRupiah(perf.totalDenda), 'potongan kehadiran') +
    pcMetricHtml('Total reward', pcRupiah(perf.totalReward), 'bonus & penghargaan') +
    '</div>';

  html += '<div class="pc-list-box"><div class="pc-list-title">Peringkat teratas bulan ini</div>';
  html += perf.top.length
    ? perf.top.map(function (x, i) {
      return '<div class="pc-list-row"><div><b>' + (i + 1) + '. ' + pcEscape(x.nama) + '</b><small>' + pcEscape(x.bagian || '-') + ' &middot; ' + x.bintang + ' bintang</small></div>' +
        '<span class="pc-chip pc-chip-ok">skor ' + x.skor + '</span></div>';
    }).join('')
    : pcEmptyRowHtml('Belum ada nilai KPI bulan ini.');
  html += '</div>';

  html += '<div class="pc-list-box"><div class="pc-list-title">Perlu perhatian</div>';
  html += perf.perhatian.length
    ? perf.perhatian.map(function (x) {
      return '<div class="pc-list-row"><div><b>' + pcEscape(x.nama) + '</b><small>' + pcEscape(x.bagian || '-') + ' &middot; denda ' + pcRupiah(x.denda) + '</small></div>' +
        '<span class="pc-chip ' + (x.absen ? 'pc-chip-danger' : 'pc-chip-warn') + '">' + x.telat + 'x telat &middot; ' + x.absen + 'x absen</span></div>';
    }).join('')
    : pcEmptyRowHtml('Tidak ada catatan telat/absen bulan ini.');
  html += '</div></section>';
  return html;
}

function pcActionCardHtml(data) {
  var izin = (data && data.izinPending) || [];
  var peng = (data && data.pengumuman) || [];
  var html = '<section class="pc-card" id="pc-card-action">' +
    '<div class="pc-card-head"><div><div class="pc-card-kicker">PERLU TINDAKAN</div>' +
    '<h3>' + izin.length + ' pengajuan izin menunggu</h3></div>' +
    '<button type="button" class="pc-link" onclick="goTo(\'s-kelola-izin\')">Kelola Izin &rarr;</button>' +
    '</div>';
  html += '<div class="pc-list-box"><div class="pc-list-title">Pengajuan izin menunggu</div>';
  html += izin.length
    ? izin.slice(0, 4).map(function (x) {
      return '<div class="pc-list-row"><div><b>' + pcEscape(x.nama) + '</b><small>' + pcEscape(x.jenis || '-') + ' &middot; ' + pcEscape(x.tanggal || '-') + '</small></div>' +
        '<span class="pc-chip pc-chip-warn">menunggu</span></div>';
    }).join('') + (izin.length > 4 ? '<div class="pc-empty">+' + (izin.length - 4) + ' pengajuan lainnya</div>' : '')
    : pcEmptyRowHtml('Tidak ada pengajuan izin yang menunggu.');
  html += '</div>';

  html += '<div class="pc-list-box"><div class="pc-list-title">Pengumuman terbaru</div>';
  html += peng.length
    ? peng.slice(0, 3).map(function (x) {
      return '<div class="pc-list-row"><div><b>' + pcEscape(x.judul) + '</b><small>' + pcEscape(x.kategori || 'Info') + '</small></div></div>';
    }).join('')
    : pcEmptyRowHtml('Belum ada pengumuman.');
  html += '</div></section>';
  return html;
}

function pcPersonalReportsHtml(data) {
  var att = (data && data.attendance) || {};
  var perf = (data && data.performance) || {};
  var html = '<section class="pc-card pc-card-wide" id="pc-card-personal">' +
    '<div class="pc-card-head"><div><div class="pc-card-kicker">ABSENSI SAYA HARI INI</div>' +
    '<h3>' + pcEscape(att.statusText || 'Belum ada absensi hari ini') + '</h3></div>' +
    '<button type="button" class="pc-link" onclick="goTo(\'s-absensi-camera\')">Absensi Kamera &rarr;</button>' +
    '</div>' +
    '<div class="pc-metric-row">' +
    pcMetricHtml('Masuk', att.masuk || '-', att.jadwal ? 'jadwal ' + att.jadwal : '') +
    pcMetricHtml('Pulang', att.pulang || '-', 'tap pulang') +
    pcMetricHtml('Skor KPI', String(perf.skor === undefined ? 0 : perf.skor) + '/100', (perf.bintang || 0) + ' bintang') +
    pcMetricHtml('Hadir bulan ini', String(perf.hadir || 0), (perf.telat || 0) + 'x telat &middot; ' + (perf.absen || 0) + 'x absen') +
    '</div></section>';

  var izin = (data && data.izin) || [];
  var slip = (data && data.slip) || [];
  html += '<section class="pc-card" id="pc-card-personal-more">' +
    '<div class="pc-card-head"><div><div class="pc-card-kicker">RIWAYAT SAYA</div><h3>Izin &amp; slip terakhir</h3></div></div>' +
    '<div class="pc-list-box"><div class="pc-list-title">Pengajuan izin terakhir</div>' +
    (izin.length
      ? izin.slice(0, 3).map(function (x) {
        return '<div class="pc-list-row"><div><b>' + pcEscape(x.jenis || '-') + '</b><small>' + pcEscape(x.tanggal || '-') + '</small></div>' +
          '<span class="pc-chip ' + (String(x.status) === 'DISETUJUI' ? 'pc-chip-ok' : 'pc-chip-warn') + '">' + pcEscape(String(x.status || '').toLowerCase()) + '</span></div>';
      }).join('')
      : pcEmptyRowHtml('Belum pernah mengajukan izin.')) +
    '</div>' +
    '<div class="pc-list-box"><div class="pc-list-title">Slip gaji terakhir</div>' +
    (slip.length
      ? slip.slice(0, 3).map(function (x) {
        return '<div class="pc-list-row"><div><b>' + pcEscape(x.bulan || x.periode || '-') + '</b><small>gaji bersih' + (x.dipublishPada ? ' &middot; ' + pcEscape(x.dipublishPada) : '') + '</small></div>' +
          '<span class="pc-chip pc-chip-ok">' + pcRupiah(x.totalGaji || x.total || 0) + '</span></div>';
      }).join('')
      : pcEmptyRowHtml('Belum ada slip gaji yang diterbitkan.')) +
    '</div></section>';
  return html;
}

// ---------------------------------------------------------------------------
// 4) Daftar menu sidebar (tampilan PC): seluruh menu dipindah ke sini.
// ---------------------------------------------------------------------------
function pcRenderSidebarNav(model) {
  var menus = (model && model.menus) || [];
  var activeId = (model && model.activeId) || '';
  var kategoriDari = (model && model.kategoriDari) || function () { return ''; };
  var labelKategori = (model && model.labelKategori) || function (c) { return c; };
  var urutan = (model && model.urutan) || [];
  var beranda = (model && model.beranda) || { id: 's-home', label: 'Beranda', icon: 'home' };

  function navItem(m) {
    var aktif = m.id === activeId;
    return '<button type="button" class="pc-nav-item' + (aktif ? ' active' : '') + '" data-screen="' + pcEscape(m.id) + '" onclick="goTo(\'' + pcEscape(m.id) + '\')" title="' + pcEscape(m.label) + '">' +
      '<span class="pc-nav-icon">' + pcIcon(m.icon) + '</span>' +
      '<span class="pc-nav-text">' + pcEscape(m.label) + '</span>' +
      '</button>';
  }

  var groups = {};
  menus.forEach(function (m) {
    var cat = kategoriDari(m) || 'Akun';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  });
  var urut = urutan.filter(function (c) { return groups[c] && groups[c].length; });

  var html = '<div class="pc-nav-scroll">' + navItem(beranda);
  urut.forEach(function (cat) {
    html += '<div class="pc-nav-group">' + pcEscape(labelKategori(cat)) + '</div>';
    groups[cat].forEach(function (m) { html += navItem(m); });
  });
  html += '</div>';
  return html;
}

// Label ringkas untuk indikator "diperbarui pukul ...".
function pcUpdatedText(d) {
  var t = d ? new Date(d) : new Date();
  if (!t || isNaN(t.getTime())) t = new Date();
  return ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
}
