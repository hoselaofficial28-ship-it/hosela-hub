// ============================================================================
// MOCK BACKEND — Hosela Hub Supabase Clone (MODE DEMO)
// ============================================================================
// Data di bawah ini SEMUANYA CONTOH/FIKTIF (bukan data karyawan asli Hosela).
// File ini menggantikan panggilan ke Google Apps Script sementara, supaya
// tampilan & alur clone bisa dicek di browser sebelum backend Supabase asli
// (schema + RLS + Edge Function) selesai dibangun.
//
// Setiap aksi di bawah berusaha meniru bentuk response yang sama dengan
// dokumentasi hasil audit di docs/clone-supabase/07-DATA-DICTIONARY.md,
// supaya saat nanti diganti ke Supabase asli, kode js/app.js & js/payroll.js
// TIDAK perlu diubah (gasCall tetap menerima bentuk data yang sama).
// ============================================================================
(function () {
  'use strict';

  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 10); }
  function fmtDate(d) {
    var bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
  }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function bulanKeyNow() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

  // ---- FIXTURE: USERS (semua fiktif, password demo sama untuk semua) ----
  var DEMO_PASSWORD = 'demo123';
  var USERS = [
    { id: 'U-OWNER', nama: 'Owner Demo', sandi: DEMO_PASSWORD, bagian: 'Owner', jabatan: 'Owner', email: 'owner@demo.local', status: 'AKTIF', bintang: 5, skor: 95, skorKPI: 95, gajiBulanan: 0, finalScore: 95 },
    { id: 'U-FIN', nama: 'Finance Demo', sandi: DEMO_PASSWORD, bagian: 'Finance', jabatan: 'Finance', email: 'finance@demo.local', status: 'AKTIF', bintang: 5, skor: 92, skorKPI: 92, gajiBulanan: 0, finalScore: 92 },
    { id: 'U-K1', nama: 'Budi', sandi: DEMO_PASSWORD, bagian: 'Packing', jabatan: 'Staff Packing', email: 'budi@demo.local', status: 'AKTIF', bintang: 4, skor: 82, skorKPI: 85, gajiBulanan: 3500000, finalScore: 77 },
    { id: 'U-K2', nama: 'Sari', sandi: DEMO_PASSWORD, bagian: 'Live', jabatan: 'Host Live', email: 'sari@demo.local', status: 'AKTIF', bintang: 3, skor: 68, skorKPI: 70, gajiBulanan: 3200000, finalScore: 58 },
    { id: 'U-K3', nama: 'Dimas', sandi: DEMO_PASSWORD, bagian: 'Ecommerce', jabatan: 'Admin Ecommerce', email: 'dimas@demo.local', status: 'AKTIF', bintang: 2, skor: 55, skorKPI: 60, gajiBulanan: 3200000, finalScore: 40 }
  ];
  function findUser(id) { for (var i = 0; i < USERS.length; i++) if (USERS[i].id === id) return USERS[i]; return null; }
  function findUserByName(nama) { nama = String(nama || '').toLowerCase().trim(); for (var i = 0; i < USERS.length; i++) if (USERS[i].nama.toLowerCase() === nama) return USERS[i]; return null; }
  function publicUser(u) { return { id: u.id, nama: u.nama, bagian: u.bagian, jabatan: u.jabatan, email: u.email, status: u.status, bintang: u.bintang, skor: u.skor, skorKPI: u.skorKPI, gajiBulanan: u.gajiBulanan, finalScore: u.finalScore }; }

  // ---- FIXTURE: konten ----
  var PENGUMUMAN = [
    { id: 'PNG-003', judul: 'Jadwal Libur Lebaran', isi: 'Toko tutup H-1 s/d H+2 Lebaran. Jangan lupa stok sebelum libur.', kategori: 'PENTING', targetBagian: 'ALL', dibuat: 'Owner Demo', tgl: fmtDate(daysAgo(1)) },
    { id: 'PNG-002', judul: 'Target Live Bulan Ini', isi: 'Target 2 juta/hari untuk sesi Live. Semangat tim!', kategori: 'INFO', targetBagian: 'Live', dibuat: 'Owner Demo', tgl: fmtDate(daysAgo(4)) },
    { id: 'PNG-001', judul: 'Selamat datang di Hosela Hub', isi: 'Ini contoh pengumuman untuk mode demo.', kategori: 'UMUM', targetBagian: 'ALL', dibuat: 'Owner Demo', tgl: fmtDate(daysAgo(10)) }
  ];
  var IDE = [
    { id: 'IDE-002', userId: 'U-K2', nama: 'Sari', judul: 'Live bareng 2 host', deskripsi: 'Supaya interaksi lebih ramai saat live.', tgl: fmtDate(daysAgo(2)), status: 'BARU', feedback: '' },
    { id: 'IDE-001', userId: 'U-K1', nama: 'Budi', judul: 'Label QR di rak packing', deskripsi: 'Biar pencarian barang lebih cepat.', tgl: fmtDate(daysAgo(6)), status: 'DITERIMA', feedback: 'Ide bagus, akan dicoba bulan depan.' }
  ];
  var PERATURAN = [
    { id: 'RULE-001', no: '01', kategori: 'Kehadiran', isi: 'Jam masuk 08:00, toleransi telat dihitung per 10 menit.' },
    { id: 'RULE-002', no: '02', kategori: 'Kehadiran', isi: 'Absen tanpa izin mempengaruhi bonus kerajinan bulan itu.' },
    { id: 'RULE-003', no: '03', kategori: 'Umum', isi: 'Gunakan seragam saat jam kerja toko.' }
  ];
  var LIBUR = [
    { id: 'LBR-002', tanggal: fmtDate(daysAgo(-20)), nama: 'Hari Kemerdekaan', difasilitasi: 'YA' },
    { id: 'LBR-001', tanggal: fmtDate(daysAgo(-5)), nama: 'Cuti Bersama (contoh)', difasilitasi: 'YA' }
  ];
  var KPI_TEMPLATE = {
    'Staff Packing': [
      { id: 'KT-001', no: 1, indikator: 'Akurasi Stock', keterangan: 'Tidak ada selisih fisik vs sistem' },
      { id: 'KT-002', no: 2, indikator: 'Packing Rapi', keterangan: 'Tidak ada komplain kemasan' }
    ],
    'Host Live': [
      { id: 'KT-010', no: 1, indikator: 'Durasi Live', keterangan: 'Minimal 3 jam per sesi' },
      { id: 'KT-011', no: 2, indikator: 'Handling Review', keterangan: 'Review negatif ditanggapi hari itu' }
    ],
    'Admin Ecommerce': [
      { id: 'KT-020', no: 1, indikator: 'Respon Chat', keterangan: 'Dibalas di bawah 15 menit' },
      { id: 'KT-021', no: 2, indikator: 'Update Harga', keterangan: 'Harga kompetitor dicek harian' }
    ]
  };
  var NOTIF = {
    'U-K1': [
      { id: 'NTF-001', judul: 'Info Kehadiran Minggu Ini', isi: 'Kamu tercatat telat 1x minggu ini.', tipe: 'INFO', dibaca: false, tgl: fmtDate(daysAgo(1)), menu: 's-notifikasi' },
      { id: 'NTF-002', judul: 'Pengumuman Baru', isi: 'Jadwal Libur Lebaran sudah terbit.', tipe: 'INFO', dibaca: true, tgl: fmtDate(daysAgo(2)), menu: 's-pengumuman' }
    ],
    'U-K2': [
      { id: 'NTF-003', judul: 'Izin Disetujui', isi: 'Pengajuan izinmu tanggal kemarin disetujui.', tipe: 'INFO', dibaca: false, tgl: fmtDate(daysAgo(1)), menu: 's-izin' }
    ],
    'U-K3': [
      { id: 'NTF-004', judul: 'Kamu mendapat SP2', isi: 'Absen 3x bulan ini. Denda Rp 50.000 dikenakan.', tipe: 'SP2', dibaca: false, tgl: fmtDate(daysAgo(3)), menu: 's-notifikasi' }
    ],
    'U-FIN': [], 'U-OWNER': []
  };
  var IZIN = [
    { id: 'IZN-001', userId: 'U-K2', nama: 'Sari', tanggal: fmtDate(daysAgo(6)), jenis: 'SAKIT', keterangan: 'Demam', status: 'DISETUJUI', linkFoto: '' },
    { id: 'IZN-002', userId: 'U-K1', nama: 'Budi', tanggal: fmtDate(daysAgo(1)), jenis: 'IZIN', keterangan: 'Urus KTP', status: 'MENUNGGU', linkFoto: '' }
  ];
  var SANKSI = [
    { id: 'DET-001', userId: 'U-K3', nama: 'Dimas', tipe: 'DENDA_MANUAL', keterangan: 'Terlambat konfirmasi stok (oleh Finance Demo)', nominal: 20000, tgl: fmtDate(daysAgo(5)) }
  ];
  // Setting gaji/kerajinan efektif per user (mulai bulan ini)
  var SALARY_SETTING = {
    'U-K1': { gajiBulanan: 3500000, bonusKerajinan: 150000, bulanSetting: bulanKeyNow() },
    'U-K2': { gajiBulanan: 3200000, bonusKerajinan: 150000, bulanSetting: bulanKeyNow() },
    'U-K3': { gajiBulanan: 3200000, bonusKerajinan: 150000, bulanSetting: bulanKeyNow() }
  };
  // Simpan state "pendaftaran pending" di memori supaya alur approve/tolak bisa didemokan hidup-hidup
  var REGISTRASI_PENDING = [
    { id: 'REG-001', nama: 'Calon Karyawan Demo', bagian: 'Packing', jabatan: 'Staff Packing', tglDaftar: fmtDate(daysAgo(0)), _sandi: 'passwordpilihansendiri' }
  ];
  var JOBDESK_OPTIONS = {
    'Gudang': ['Admin Gudang & Stok', 'Staff Inbound', 'Picker', 'Admin Packing', 'Quality Control Packing', 'Kepala Gudang'],
    'Live Streaming': ['Live Streamer', 'Moderator Live', 'Operator Live', 'Koordinator Live Streaming'],
    'Content Creator': ['Content Creator', 'Scriptwriter / Copywriter', 'Video Editor', 'Graphic Designer', 'Fotografer Produk', 'Content Lead'],
    'Marketplace & Ecommerce': ['Admin Marketplace', 'Customer Service Marketplace', 'Listing Specialist', 'Promo & Campaign Specialist', 'Marketplace Ads Specialist', 'Ecommerce Supervisor'],
    'Digital Marketing': ['Social Media Specialist', 'Performance Ads Specialist', 'Affiliate & KOL Specialist', 'CRM & Retention Specialist', 'Digital Marketing Lead'],
    'Customer Service': ['Customer Service Chat', 'Customer Service Komplain & Retur', 'Customer Experience Specialist', 'Customer Service Lead'],
    'Purchasing & Inventory': ['Purchasing Staff', 'Supplier Coordinator', 'Inventory Control', 'Purchasing Supervisor'],
    'Operasional & Fulfillment': ['Admin Pesanan', 'Fulfillment Staff', 'Staff Retur & Refund', 'Koordinator Operasional', 'Operations Manager'],
    'Keuangan & Administrasi': ['Admin Keuangan', 'Accounting Staff', 'Accounts Payable / Receivable', 'Admin Pajak', 'Supervisor Keuangan'],
    'HR & General Affairs': ['HR Admin', 'Recruitment & People Operations', 'General Affairs Staff', 'HRGA Supervisor'],
    'Product & Merchandising': ['Product Research', 'Merchandiser', 'Product Development', 'Catalog Specialist', 'Product Lead']
  };
  var JOBDESK_LINKS = {};
  var OFFICE_SETTINGS = { OFFICE_LAT: '-6.2000', OFFICE_LNG: '106.8000', OFFICE_RADIUS_M: '120' };

  // Payroll run in-memory (per bulan)
  var PAYROLL_RUNS = {}; // bulanKey -> { id, status, details:[...] }

  function karyawanList() { return USERS.filter(function (u) { return u.bagian !== 'Owner' && u.bagian !== 'Finance'; }); }

  function buildPayrollDetailForUser(u) {
    var setting = SALARY_SETTING[u.id] || { gajiBulanan: u.gajiBulanan, bonusKerajinan: 150000 };
    var absen = u.id === 'U-K3' ? 1 : 0; // Dimas contoh punya absen -> tidak dapat bonus kerajinan
    var telat = u.id === 'U-K2' ? 2 : (u.id === 'U-K3' ? 1 : 0);
    var totalDenda = telat * 10000;
    var bonusKerajinan = absen === 0 ? setting.bonusKerajinan : 0;
    var totalReward = u.id === 'U-K1' ? 30000 : 0;
    var totalGaji = Math.max(0, setting.gajiBulanan + totalReward + bonusKerajinan - totalDenda);
    return {
      id: uid('PYD'), userId: u.id, nama: u.nama, bagian: u.bagian, jabatan: u.jabatan,
      gajiPokok: setting.gajiBulanan, hariKerja: 25, hadir: 25 - absen - telat, absen: absen, telat: telat,
      lemburPulang: 0, lemburMinggu: 0, lemburLibur: 0,
      totalReward: totalReward, totalDenda: totalDenda, bonusKerajinan: bonusKerajinan,
      adjustmentPlus: 0, adjustmentMinus: 0, catatanAdjustment: '',
      totalGaji: totalGaji, statusSlip: 'DRAFT'
    };
  }

  // ============================== HANDLERS ==============================
  var handlers = {
    ping: function () { return { success: true, msg: 'pong (demo)' }; },

    validateLogin: function (args) {
      var username = args[0], password = args[1];
      var u = findUserByName(username);
      if (!u || u.status !== 'AKTIF') return { success: false, msg: 'User tidak ditemukan atau nonaktif' };
      if (String(password) !== String(u.sandi)) return { success: false, msg: 'Kata sandi salah' };
      return { success: true, isDefaultPassword: password === 'hosela', user: { id: u.id, nama: u.nama, bagian: u.bagian, jabatan: u.jabatan } };
    },

    gantiPIN: function (args) {
      var userId = args[0], lama = args[1], baru = args[2];
      var u = findUser(userId);
      if (!u) return { success: false, msg: 'User tidak ditemukan' };
      if (String(u.sandi) !== String(lama)) return { success: false, msg: 'Kata sandi lama tidak cocok' };
      u.sandi = baru;
      return { success: true };
    },

    updateEmail: function (args) {
      var userId = args[0], email = args[1];
      var u = findUser(userId);
      if (u) u.email = email;
      return { success: true };
    },

    getPengaturan: function () {
      return { OFFICE_LAT: OFFICE_SETTINGS.OFFICE_LAT, OFFICE_LNG: OFFICE_SETTINGS.OFFICE_LNG, OFFICE_RADIUS_M: OFFICE_SETTINGS.OFFICE_RADIUS_M, LINK_PANDUAN: '' };
    },

    getHomeData: function (args) {
      var u = findUser(args[0]);
      var notifCountByMenu = {};
      (NOTIF[args[0]] || []).forEach(function (n) {
        if (!n.dibaca) { notifCountByMenu[n.menu] = (notifCountByMenu[n.menu] || 0) + 1; notifCountByMenu['s-notifikasi'] = (notifCountByMenu['s-notifikasi'] || 0) + 1; }
      });
      var topUser = USERS.filter(function (x) { return x.bagian !== 'Owner' && x.bagian !== 'Finance'; }).sort(function (a, b) { return b.finalScore - a.finalScore; })[0];
      return {
        success: true,
        pengumuman: PENGUMUMAN,
        rewards: topUser ? [{ bulan: bulanKeyNow(), nama: topUser.nama, bagian: topUser.bagian, alasan: 'Kehadiran terbaik bulan ini', pesan: 'Terus pertahankan ya!' }] : [],
        notifCountByMenu: notifCountByMenu,
        profile: u ? { bintang: u.bintang, skor: u.skor } : {},
        anomaliPending: []
      };
    },

    getNotifikasi: function (args) { return (NOTIF[args[0]] || []).slice().reverse(); },
    getNotifCountByMenu: function (args) {
      var counts = {};
      (NOTIF[args[0]] || []).forEach(function (n) { if (!n.dibaca) { counts[n.menu] = (counts[n.menu] || 0) + 1; counts['s-notifikasi'] = (counts['s-notifikasi'] || 0) + 1; } });
      return counts;
    },
    tandaiDibaca: function (args) {
      Object.keys(NOTIF).forEach(function (uidKey) { (NOTIF[uidKey] || []).forEach(function (n) { if (n.id === args[0]) n.dibaca = true; }); });
      return { success: true };
    },
    tandaiMenuDibaca: function (args) {
      (NOTIF[args[0]] || []).forEach(function (n) { if (n.menu === args[1]) n.dibaca = true; });
      return { success: true };
    },
    hapusNotifikasi: function (args) {
      Object.keys(NOTIF).forEach(function (uidKey) { NOTIF[uidKey] = (NOTIF[uidKey] || []).filter(function (n) { return n.id !== args[0]; }); });
      return { success: true };
    },
    hapusSemuaNotifikasi: function (args) { NOTIF[args[0]] = []; return { success: true }; },

    // ---- Jobdesk ----
    getMyJobdesk: function () {
      var u = findUser(window.currentUser && window.currentUser.id);
      if (!u) return { success: true, data: null };
      return { success: true, data: { bagian: u.bagian, jabatan: u.jabatan, link: JOBDESK_LINKS[u.bagian+'|'+u.jabatan] || '' } };
    },
    getOwnerJobdesks: function () {
      var data = [];
      Object.keys(JOBDESK_OPTIONS).forEach(function(bagian) {
        JOBDESK_OPTIONS[bagian].forEach(function(jabatan) {
          data.push({ bagian: bagian, jabatan: jabatan, link: JOBDESK_LINKS[bagian+'|'+jabatan] || '' });
        });
      });
      return { success: true, data: data };
    },
    saveOwnerJobdesk: function (args) {
      JOBDESK_LINKS[args[0]+'|'+args[1]] = args[2];
      return { success: true, msg: 'Link jobdesk berhasil disimpan (demo)' };
    },
    getOfficeSettings: function () { return { success: true, data: OFFICE_SETTINGS }; },
    setOfficeSettings: function (args) {
      OFFICE_SETTINGS = { OFFICE_LAT: String(args[0]), OFFICE_LNG: String(args[1]), OFFICE_RADIUS_M: String(args[2]) };
      return { success: true, msg: 'Lokasi kantor berhasil disimpan (demo)' };
    },
    getJobdeskList: function () {
      var map = {};
      karyawanList().forEach(function (u) { map[u.bagian] = (map[u.bagian] || 0) + 1; });
      return Object.keys(map).map(function (k) { return { bagian: k, count: map[k] }; });
    },
    getStaffByBagian: function (args) {
      return karyawanList().filter(function (u) { return u.bagian === args[0]; }).map(function (u) { return { id: u.id, nama: u.nama, jabatan: u.jabatan }; });
    },
    getJobdeskByJabatan: function (args) {
      return { jabatan: args[0], link: 'https://example.com/jobdesk/' + encodeURIComponent(args[0]) + ' (contoh link dokumen)' };
    },
    getJobdeskByBagian: function (args) { return handlers.getJobdeskByJabatan(args); },

    // ---- Pengumuman / Ide / Peraturan / Kalender ----
    getPengumuman: function (args) {
      var bagian = args[0];
      return PENGUMUMAN.filter(function (p) { return p.targetBagian === 'ALL' || p.targetBagian === bagian; });
    },
    addPengumuman: function (args) {
      PENGUMUMAN.unshift({ id: uid('PNG'), judul: args[0], isi: args[1], kategori: args[2] || 'UMUM', targetBagian: args[3] || 'ALL', dibuat: args[4] || 'Owner Demo', tgl: fmtDate(new Date()) });
      return { success: true, msg: 'Pengumuman ditambahkan (demo)' };
    },
    getIde: function () { return IDE.slice().reverse(); },
    addIde: function (args) {
      var u = findUser(args[0]);
      IDE.unshift({ id: uid('IDE'), userId: args[0], nama: u ? u.nama : args[0], judul: args[1], deskripsi: args[2], tgl: fmtDate(new Date()), status: 'BARU', feedback: '' });
      return { success: true };
    },
    getPeraturan: function () { return PERATURAN; },
    savePeraturan: function (args) {
      var id = args[0], kategori = args[1], isi = args[2];
      var row = PERATURAN.find(function(p){ return p.id === id; });
      if (row) { row.kategori = kategori; row.isi = isi; }
      else PERATURAN.push({ id: uid('RULE'), no: String(PERATURAN.length + 1).padStart(2, '0'), kategori: kategori, isi: isi });
      return { success: true, msg: id ? 'Peraturan diperbarui (demo)' : 'Peraturan ditambahkan (demo)' };
    },
    triggerNotifPeraturan: function () { return { success: true, msg: 'Notifikasi peraturan dikirim (demo)' }; },
    getKalenderLibur: function () { return LIBUR; },
    addLibur: function (args) {
      LIBUR.unshift({ id: uid('LBR'), tanggal: args[0], nama: args[1], difasilitasi: 'YA' });
      return { success: true };
    },
    hapusLibur: function (args) {
      var before = LIBUR.length;
      LIBUR = LIBUR.filter(function (l) { return l.id !== args[0]; });
      return { success: LIBUR.length < before, msg: LIBUR.length < before ? 'Hari libur dihapus (demo)' : 'ID tidak ditemukan' };
    },

    // ---- Papan peringkat / Manage users ----
    getPapanPeringkat: function () {
      return karyawanList().sort(function (a, b) { return b.finalScore - a.finalScore; }).map(function (u) { return { id: u.id, nama: u.nama, bagian: u.bagian, jabatan: u.jabatan, bintang: u.bintang, finalScore: u.finalScore }; });
    },
    getAllUsers: function () { return USERS.map(publicUser); },
    getOwnerAccounts: function () { return USERS.map(function(u) { var row = publicUser(u); row.createdAt = fmtDate(new Date()); return row; }); },
    setUserAccess: function (args) {
      var u = findUser(args[0]);
      if (!u || u.bagian === 'Owner') return { success: false, msg: 'Akun tidak dapat diubah' };
      u.status = args[1] ? 'AKTIF' : 'NONAKTIF';
      return { success: true, msg: u.nama + (args[1] ? ' berhasil diaktifkan kembali' : ' berhasil dinonaktifkan') };
    },
    nonaktifkanUser: function (args) { var u = findUser(args[0]); if (u) u.status = 'NONAKTIF'; return { success: !!u }; },

    // ---- 6 aksi "gap" registrasi — didemokan bekerja penuh di sini ----
    getDaftarOptions: function () { return { success: true, data: JOBDESK_OPTIONS }; },
    daftarAkun: function (args) {
      USERS.push({ id: uid('U'), nama: args[0], sandi: args[3] || DEMO_PASSWORD, bagian: args[1], jabatan: args[2], email: args[4] || '', status: 'AKTIF', bintang: 0, skor: 0, skorKPI: 0, gajiBulanan: 0, finalScore: 0 });
      return { success: true, msg: 'Pendaftaran berhasil! Akun langsung aktif dan bisa dipakai untuk login (demo).' };
    },
    getRegistrasiPending: function () { return { data: REGISTRASI_PENDING.map(function (r) { return { id: r.id, nama: r.nama, bagian: r.bagian, jabatan: r.jabatan, tglDaftar: r.tglDaftar }; }) }; },
    approveRegistrasi: function (args) {
      var idx = REGISTRASI_PENDING.findIndex(function (r) { return r.id === args[0]; });
      if (idx === -1) return { success: false, msg: 'Pendaftaran tidak ditemukan (sudah diproses?)' };
      var r = REGISTRASI_PENDING[idx];
      USERS.push({ id: uid('U'), nama: r.nama, sandi: r._sandi || DEMO_PASSWORD, bagian: r.bagian, jabatan: r.jabatan, email: '', status: 'AKTIF', bintang: 0, skor: 0, skorKPI: 0, gajiBulanan: 0, finalScore: 0 });
      REGISTRASI_PENDING.splice(idx, 1);
      return { success: true, msg: r.nama + ' disetujui, memakai sandi yang dipilih sendiri saat daftar (demo)' };
    },
    tolakRegistrasi: function (args) {
      var idx = REGISTRASI_PENDING.findIndex(function (r) { return r.id === args[0]; });
      if (idx === -1) return { success: false, msg: 'Pendaftaran tidak ditemukan' };
      REGISTRASI_PENDING[idx].status = 'DITOLAK'; // disimpan sbg riwayat, bukan dihapus (sesuai keputusan Ko)
      REGISTRASI_PENDING.splice(idx, 1);
      return { success: true, msg: 'Pendaftaran ditolak & disimpan sebagai riwayat (demo)' };
    },
    addKaryawanBaru: function (args) {
      USERS.push({ id: uid('U'), nama: args[0], sandi: 'hosela', bagian: args[1], jabatan: args[2], email: args[3] || '', status: 'AKTIF', bintang: 0, skor: 0, skorKPI: 0, gajiBulanan: 0, finalScore: 0 });
      return { success: true, msg: args[0] + ' berhasil didaftarkan! Password: hosela' };
    },

    // ---- Izin ----
    getIzinKaryawan: function (args) { return IZIN.filter(function (i) { return i.userId === args[0]; }).slice().reverse(); },
    submitIzin: function (args) {
      var u = findUser(args[0]);
      IZIN.unshift({ id: uid('IZN'), userId: args[0], nama: u ? u.nama : args[0], tanggal: args[1], jenis: args[2], keterangan: args[3], status: 'MENUNGGU', linkFoto: args[4] || '' });
      return { success: true, msg: 'Pengajuan terkirim' };
    },
    getIzinPending: function () { return IZIN.filter(function (i) { return i.status === 'MENUNGGU'; }); },
    getIzinPendingCount: function () { return { count: IZIN.filter(function (i) { return i.status === 'MENUNGGU'; }).length }; },
    approveIzin: function (args) {
      var i = IZIN.find(function (x) { return x.id === args[0]; });
      if (i) i.status = args[1];
      return { success: !!i, msg: 'Keputusan disimpan (demo)' };
    },

    // ---- KPI ----
    getKPITemplate: function (args) { return KPI_TEMPLATE[args[0]] || []; },
    getKPILaporan: function (args) { return []; },
    submitKPILaporan: function () { return { success: true }; },

    // ---- Absensi (disederhanakan untuk demo — kamera asli butuh backend nyata) ----
    getAbsensiRekap: function (args) {
      return { data: [{ bulan: bulanKeyNow(), hadir: 20, telat: 2, absen: 0, lemburPulang: 0, lemburMinggu: 0, lemburLibur: 0, status: 'KUNING', totalDenda: 20000, detailDendaSP: [], detailDendaManual: [], detailRewardManual: [], detailLemburPulang: [], detailLemburMinggu: [], detailLemburLibur: [], detailAbsen: [], bonusKerajinan: 150000 }] };
    },
    getAbsensiCameraToday: function () { return { data: [] }; },
    getAllAbsensiRekap: function () {
      return karyawanList().map(function (u) { return { id: u.id, nama: u.nama, bagian: u.bagian, hadir: 20, telat: 1, absen: 0, status: 'BAIK' }; });
    },
    getAnomaliPending: function () { return []; },
    submitAbsensiCamera: function () { return { success: true, status: 'DITERIMA', msg: 'Absensi tercatat (demo — tanpa validasi lokasi/foto asli)' }; },
    notifyAttendanceTelegram: function () { return { success: true, demo: true }; },
    testAttendanceTelegram: function () { return { success: true, demo: true }; },
    testEmployeeAttendanceTelegram: function () { return { success: true, demo: true }; },

    // ---- Sanksi manual ----
    getSanksiManual: function () { return SANKSI; },
    addSanksiManual: function (args) {
      var u = findUser(args[0]);
      SANKSI.unshift({ id: uid('DET'), userId: args[0], nama: u ? u.nama : args[0], tipe: args[1], keterangan: args[2], nominal: parseInt(args[3], 10) || 0, tgl: fmtDate(new Date()) });
      return { success: true };
    },
    batalSanksiManual: function (args) { SANKSI = SANKSI.filter(function (s) { return s.id !== args[0]; }); return { success: true }; },

    // ---- Review telat (gap — rancangan baru, didemokan sederhana) ----
    getIzinTelatReview: function () { return []; },
    reviewIzinTelat: function () { return { success: true, msg: 'Keputusan tersimpan (demo — fitur ini belum ada di sistem lama, menunggu rancangan final)' }; },

    // ---- Payroll / Gaji ----
    getSalaryUsers: function () {
      return { success: true, bulan: bulanKeyNow(), data: karyawanList().map(function (u) {
        var s = SALARY_SETTING[u.id] || { gajiBulanan: u.gajiBulanan, bonusKerajinan: 150000 };
        return { id: u.id, nama: u.nama, bagian: u.bagian, jabatan: u.jabatan, status: u.status, gajiBulanan: u.gajiBulanan, gajiBulanBerlaku: s.gajiBulanan, bonusKerajinan: s.bonusKerajinan, bulanBerlaku: bulanKeyNow() };
      }) };
    },
    updateUserSalary: function (args) {
      var userId = args[1], gaji = args[2], bonus = args[5];
      SALARY_SETTING[userId] = { gajiBulanan: parseInt(gaji, 10) || 0, bonusKerajinan: bonus == null ? 150000 : (parseInt(bonus, 10) || 0), bulanSetting: bulanKeyNow() };
      var u = findUser(userId); if (u) u.gajiBulanan = SALARY_SETTING[userId].gajiBulanan;
      return { success: true };
    },
    updateSalaryUsersBatch: function (args) {
      var list = args[1] || [];
      list.forEach(function (row) { SALARY_SETTING[row.userId] = { gajiBulanan: row.gaji, bonusKerajinan: row.bonusKerajinan, bulanSetting: bulanKeyNow() }; });
      return { success: true };
    },
    deactivateSalaryUser: function (args) { return { success: true }; },

    getPayrollPreview: function (args) {
      var bulanKey = args[0] || bulanKeyNow();
      if (PAYROLL_RUNS[bulanKey]) return handlers.getPayrollDetail.__fromRun(PAYROLL_RUNS[bulanKey]);
      var data = karyawanList().map(buildPayrollDetailForUser);
      return { success: true, bulan: bulanKey, status: 'PREVIEW', totalPayroll: data.reduce(function (s, r) { return s + r.totalGaji; }, 0), data: data };
    },
    createPayrollDraft: function (args) {
      var bulanKey = args[0] || bulanKeyNow();
      if (!PAYROLL_RUNS[bulanKey]) {
        PAYROLL_RUNS[bulanKey] = { id: uid('PAY'), bulan: bulanKey, status: 'DRAFT', data: karyawanList().map(buildPayrollDetailForUser) };
      }
      return handlers.getPayrollDetail.__fromRun(PAYROLL_RUNS[bulanKey]);
    },
    syncPayrollAttendance: function (args) {
      var run = findRunById(args[0]);
      if (!run) return { success: false, msg: 'Penggajian tidak ditemukan (demo)' };
      run.status = 'DRAFT';
      run.sourceStale = false;
      run.data = karyawanList().map(buildPayrollDetailForUser);
      return handlers.getPayrollDetail.__fromRun(run);
    },
    confirmPayroll: function (args) {
      var run = findRunById(args[0]); if (run) run.status = 'CONFIRMED';
      return handlers.getPayrollDetail.__fromRun(run);
    },
    publishPayroll: function (args) {
      var run = findRunById(args[0]);
      if (run) { run.status = 'PUBLISHED'; run.data.forEach(function (d) { d.statusSlip = 'PUBLISHED'; }); }
      return handlers.getPayrollDetail.__fromRun(run);
    },
    cancelPayroll: function (args) {
      var run = findRunById(args[0]);
      if (run && run.status === 'PUBLISHED') {
        run.status = 'CONFIRMED';
        run.data.forEach(function (d) { d.statusSlip = 'DRAFT'; });
      }
      return handlers.getPayrollDetail.__fromRun(run);
    },
    getPayrollDetail: function (args) {
      var run = findRunByDetailId(args[0]);
      if (!run) return { success: false, msg: 'Payroll detail tidak ditemukan (demo)' };
      return { success: true, data: run.data.find(function (d) { return d.id === args[0]; }) };
    },
    getPayrollEmployeeSlip: function (args) {
      var userId = args[0];
      var rows = [];
      Object.keys(PAYROLL_RUNS).forEach(function (bulan) {
        var run = PAYROLL_RUNS[bulan];
        if (run.status !== 'PUBLISHED') return;
        var d = run.data.find(function (x) { return x.userId === userId; });
        if (d) rows.push(Object.assign({ bulan: bulan, payrollRunId: run.id }, d));
      });
      return { success: true, data: rows };
    },
    getPublishedPayrollSlips: function () {
      var rows = [];
      Object.keys(PAYROLL_RUNS).forEach(function (bulan) {
        var run = PAYROLL_RUNS[bulan];
        if (run.status !== 'PUBLISHED') return;
        run.data.forEach(function (d) {
          rows.push(Object.assign({ bulan: bulan, payrollRunId: run.id }, d));
        });
      });
      return { success: true, data: rows };
    },
    getPayrollEmployeeSlipDetail: function (args) {
      var userId = args[0], runId = args[1];
      var run = PAYROLL_RUNS[Object.keys(PAYROLL_RUNS).find(function (b) { return PAYROLL_RUNS[b].id === runId; }) || ''] || findRunById(runId);
      if (!run) return { success: false, msg: 'Slip tidak ditemukan (demo)' };
      var d = run.data.find(function (x) { return x.userId === userId; });
      return { success: true, data: d, items: buildItemsForDetail(d) };
    },
    updatePayrollAdjustment: function (args) {
      var run = findRunByDetailId(args[0]);
      if (!run) return { success: false };
      var d = run.data.find(function (x) { return x.id === args[0]; });
      if (d) {
        var tambah = parseInt(args[1], 10) || 0;
        var potong = parseInt(args[2], 10) || 0;
        // Menumpuk, bukan menimpa (keputusan Ko 2026-10-17).
        if (tambah <= 0 && potong <= 0) return { success: false, msg: 'Isi nominal tambahan atau potongan dulu' };
        d.adjustmentPlus = (parseInt(d.adjustmentPlus || 0, 10) || 0) + tambah;
        d.adjustmentMinus = (parseInt(d.adjustmentMinus || 0, 10) || 0) + potong;
        d.catatanAdjustment = args[3] || '';
        d.totalGaji = Math.max(0, d.gajiPokok + d.totalReward + d.bonusKerajinan + d.adjustmentPlus - d.totalDenda - d.adjustmentMinus);
      }
      return { success: true, data: d };
    },
    hapusPayrollAdjustment: function (args) {
      for (var b in PAYROLL_RUNS) {
        for (var i = 0; i < PAYROLL_RUNS[b].data.length; i++) {
          if (PAYROLL_RUNS[b].data[i].id === args[0]) {
            return { success: true, data: PAYROLL_RUNS[b].data[i] };
          }
        }
      }
      return { success: false, msg: 'Item penyesuaian tidak ditemukan' };
    }
  };

  function findRunById(runId) { for (var b in PAYROLL_RUNS) if (PAYROLL_RUNS[b].id === runId) return PAYROLL_RUNS[b]; return null; }
  function findRunByDetailId(detailId) { for (var b in PAYROLL_RUNS) if (PAYROLL_RUNS[b].data.some(function (d) { return d.id === detailId; })) return PAYROLL_RUNS[b]; return null; }
  function buildItemsForDetail(d) {
    if (!d) return [];
    var items = [];
    if (d.bonusKerajinan > 0) items.push({ tipe: 'BONUS_KERAJINAN', keterangan: 'Bonus kerajinan bulan ' + bulanKeyNow(), nominal: d.bonusKerajinan });
    if (d.totalDenda > 0) items.push({ tipe: 'DENDA_SP', keterangan: 'Akumulasi denda telat/SP', nominal: d.totalDenda });
    if (d.totalReward > 0) items.push({ tipe: 'LEMBUR_PULANG', keterangan: 'Reward lembur', nominal: d.totalReward });
    if (d.adjustmentPlus > 0) items.push({ tipe: 'ADJUSTMENT_PLUS', keterangan: d.catatanAdjustment || 'Adjustment tambahan', nominal: d.adjustmentPlus });
    if (d.adjustmentMinus > 0) items.push({ tipe: 'ADJUSTMENT_MINUS', keterangan: d.catatanAdjustment || 'Adjustment potongan', nominal: d.adjustmentMinus });
    return items;
  }
  handlers.getPayrollDetail.__fromRun = function (run) {
    if (!run) return { success: false, msg: 'Run tidak ditemukan' };
    return { success: true, id: run.id, bulan: run.bulan, status: run.status, sourceStale: !!run.sourceStale, totalPayroll: run.data.reduce(function (s, r) { return s + r.totalGaji; }, 0), data: run.data };
  };

  // ============================== ENTRY POINT ==============================
  window.mockBackend = function (action, args) {
    var h = handlers[action];
    if (typeof h === 'function') return h(args || []);
    console.warn('[DEMO] Aksi "' + action + '" belum punya data contoh spesifik — pakai fallback kosong.');
    return { success: true, data: [], msg: '(mode demo) belum ada data contoh untuk aksi ini' };
  };

  window.__DEMO_USERS__ = USERS.map(function (u) { return { nama: u.nama, bagian: u.bagian, sandi: u.sandi }; });
})();
