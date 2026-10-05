// ============================================================================
// REAL BACKEND — aksi yang SUDAH tersambung ke Supabase asli (bukan contoh).
// Aksi lain yang belum ada di sini tetap pakai mock-backend.js (lihat
// gasCall di app.js, real-backend dicoba dulu baru fallback ke mock).
// ============================================================================
(function () {
  'use strict';

  function profileRow(p) { return Array.isArray(p) ? p[0] : p; }

  var MONTH_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtTanggalId(isoDate) {
    if (!isoDate) return '';
    var d = new Date(String(isoDate).substring(0, 10) + 'T12:00:00');
    return d.getDate() + ' ' + MONTH_ID[d.getMonth()] + ' ' + d.getFullYear();
  }

  var handlers = {
    validateLogin: async function (args) {
      var nama = args[0], password = args[1];
      var resolved = await window.sb.rpc('resolve_login_email', { p_nama: nama });
      if (resolved.error || !resolved.data) return { success: false, msg: 'Nama atau sandi salah' };
      var signIn = await window.sb.auth.signInWithPassword({ email: resolved.data, password: password });
      if (signIn.error || !signIn.data.session) return { success: false, msg: 'Nama atau sandi salah' };
      var prof = await window.sb.rpc('get_my_profile');
      var p = profileRow(prof.data);
      if (prof.error || !p) { await window.sb.auth.signOut(); return { success: false, msg: 'Profil tidak ditemukan' }; }
      if (p.status !== 'AKTIF') {
        await window.sb.auth.signOut();
        var msg = 'Nama atau sandi salah';
        if (p.status === 'PENDING') msg = 'Akun kamu masih menunggu persetujuan Owner.';
        else if (p.status === 'DITOLAK') msg = 'Pendaftaran kamu ditolak. Hubungi Owner.';
        else if (p.status === 'NONAKTIF') msg = 'Akun kamu nonaktif. Hubungi Owner.';
        return { success: false, msg: msg };
      }
      return { success: true, isDefaultPassword: false, user: { id: p.id, nama: p.nama, bagian: p.bagian, jabatan: p.jabatan } };
    },

    getDaftarOptions: async function () {
      var r = await window.sb.rpc('get_daftar_options');
      if (r.error) return { success: false, msg: r.error.message };
      return { success: true, data: r.data || {} };
    },

    daftarAkun: async function (args) {
      var nama = args[0], bagian = args[1], jabatan = args[2], sandi = args[3], email = args[4];
      if (!email) return { success: false, msg: 'Email wajib diisi (sistem baru butuh email untuk login).' };
      var r = await window.sb.auth.signUp({
        email: email, password: sandi,
        options: { data: { nama: nama, bagian: bagian, jabatan: jabatan } }
      });
      if (r.error) {
        var msg = r.error.message || 'Pendaftaran gagal';
        if (/already registered|already exists/i.test(msg)) msg = 'Email ini sudah terdaftar.';
        return { success: false, msg: msg };
      }
      // Jangan biarkan user "setengah login" sebelum di-approve Owner.
      try { await window.sb.auth.signOut(); } catch (e) {}
      return { success: true, msg: 'Pendaftaran terkirim! Menunggu persetujuan Owner sebelum bisa login.' };
    },

    getRegistrasiPending: async function () {
      var r = await window.sb.rpc('get_registrasi_pending');
      if (r.error) return { data: [] };
      return { data: (r.data || []).map(function (row) {
        return { id: row.id, nama: row.nama, bagian: row.bagian, jabatan: row.jabatan, tglDaftar: new Date(row.tgl_daftar).toLocaleDateString('id-ID') };
      }) };
    },

    approveRegistrasi: async function (args) {
      var r = await window.sb.rpc('approve_registrasi', { p_user_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    tolakRegistrasi: async function (args) {
      var r = await window.sb.rpc('tolak_registrasi', { p_user_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [userId, nama, tipe, photoData, lat, lng, accuracy, clientTime]
    // Foto (photoData) BELUM disambung ke Google Drive -- cuma metadata tap yang
    // tersimpan untuk sekarang, foto diabaikan di sisi ini sampai Edge Function
    // upload dibangun.
    submitAbsensiCamera: async function (args) {
      var tipe = args[2], lat = args[4], lng = args[5], accuracy = args[6];
      var r = await window.sb.rpc('submit_absensi_camera', {
        p_tipe: tipe, p_lat: lat, p_lng: lng, p_akurasi: Math.round(accuracy || 0)
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getAbsensiCameraToday: async function (args) {
      var userId = args[0];
      var today = new Date();
      var tgl = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      var r = await window.sb.from('attendance_events')
        .select('id,tanggal,jam,tipe,status,jarak_kantor_meter,catatan')
        .eq('user_id', userId).eq('tanggal', tgl)
        .order('created_at', { ascending: false });
      if (r.error) return { success: false, data: [] };
      return { success: true, data: (r.data || []).map(function (row) {
        return { id: row.id, tanggal: row.tanggal, jam: row.jam, tipe: row.tipe, status: row.status, distance: row.jarak_kantor_meter, jarak: row.jarak_kantor_meter, catatan: row.catatan };
      }) };
    },

    processAbsensiAppToRekap: async function (args) {
      var bulanKey = args[0];
      var r = await window.sb.rpc('process_absensi_app_to_rekap', { p_bulan_key: bulanKey });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [userId, tgl, jenis, keterangan, linkFoto]
    submitIzin: async function (args) {
      var tgl = args[1], jenis = args[2], ket = args[3], foto = args[4];
      var r = await window.sb.rpc('submit_izin', { p_tanggal: tgl, p_jenis: jenis, p_keterangan: ket, p_link_foto: foto || null });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // Return ARRAY langsung (bukan {success,data}) -- sesuai ekspektasi UI lama.
    getIzinKaryawan: async function (args) {
      var userId = args[0];
      var r = await window.sb.from('leave_requests')
        .select('id,tanggal,jenis,keterangan,status')
        .eq('user_id', userId).order('submitted_at', { ascending: false }).limit(10);
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, tanggal: fmtTanggalId(row.tanggal), jenis: row.jenis, keterangan: row.keterangan, status: row.status };
      });
    },

    getIzinPending: async function () {
      var r = await window.sb.rpc('get_izin_pending');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, userId: row.user_id, nama: row.nama, tanggal: fmtTanggalId(row.tanggal), jenis: row.jenis, keterangan: row.keterangan, linkFoto: row.link_foto || '' };
      });
    },

    // args lama: [izinId, status, actorNama] -- actorNama diabaikan, pakai auth.uid()
    approveIzin: async function (args) {
      var r = await window.sb.rpc('approve_izin', { p_izin_id: args[0], p_status: args[1] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getPayrollPreview: async function (args) {
      var r = await window.sb.rpc('get_payroll_preview', { p_bulan_key: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [bulanKey, actorNama] -- actorNama diabaikan, pakai auth.uid()
    createPayrollDraft: async function (args) {
      var r = await window.sb.rpc('create_payroll_draft', { p_bulan_key: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    confirmPayroll: async function (args) {
      var r = await window.sb.rpc('confirm_payroll', { p_payroll_run_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    publishPayroll: async function (args) {
      var r = await window.sb.rpc('publish_payroll', { p_payroll_run_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getPayrollDetail: async function (args) {
      var r = await window.sb.rpc('get_payroll_detail', { p_payroll_detail_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    updatePayrollAdjustment: async function (args) {
      var r = await window.sb.rpc('update_payroll_adjustment', {
        p_payroll_detail_id: args[0], p_adjustment_plus: parseInt(args[1], 10) || 0,
        p_adjustment_minus: parseInt(args[2], 10) || 0, p_catatan: args[3] || ''
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getPayrollEmployeeSlip: async function (args) {
      var r = await window.sb.rpc('get_payroll_employee_slip', { p_user_id: args[0] || null });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [userId, payrollRunId]
    getPayrollEmployeeSlipDetail: async function (args) {
      var r = await window.sb.rpc('get_payroll_employee_slip_detail', { p_user_id: args[0], p_payroll_run_id: args[1] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getRekapBulananSemua: async function (args) {
      var r = await window.sb.rpc('get_rekap_bulanan_semua', { p_bulan_key: args[0] });
      if (r.error) return { success: false, msg: r.error.message, data: [] };
      var hariKerja = await window.sb.rpc('calc_hari_kerja_efektif', { p_bulan_key: args[0] });
      return {
        success: true, bulan: args[0], hariKerja: (hariKerja.data) || 0,
        data: (r.data || []).map(function (row) {
          return {
            userId: row.user_id, nama: row.nama, bagian: row.bagian, jabatan: row.jabatan,
            hadir: row.hadir, telat: row.telat, absen: row.absen,
            lemburMinggu: row.lembur_minggu, lemburLibur: row.lembur_libur,
            bintang: row.bintang, skor: row.skor,
            totalDenda: row.total_denda, totalReward: row.total_reward, bonusKerajinan: row.bonus_kerajinan,
            gajiPokok: row.gaji_pokok, gajiHarian: row.gaji_harian
          };
        })
      };
    },

    // Query langsung (bukan RPC) -- RLS kpi_templates sudah izinkan baca semua.
    getKPITemplate: async function (args) {
      var jabatan = args[0];
      var r = await window.sb.from('kpi_templates').select('id,no_urut,indikator,keterangan').eq('jabatan', jabatan).order('no_urut');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, no: row.no_urut, indikator: row.indikator, keterangan: row.keterangan };
      });
    },

    // Query langsung + grouping di JS -- RLS kpi_reports sudah izinkan baca sendiri.
    getKPILaporan: async function (args) {
      var userId = args[0];
      var r = await window.sb.from('kpi_reports')
        .select('minggu,kpi_template_id,indikator,selesai,catatan')
        .eq('user_id', userId).order('minggu', { ascending: false });
      if (r.error) return [];
      var weeks = {};
      var order = [];
      (r.data || []).forEach(function (row) {
        if (!weeks[row.minggu]) { weeks[row.minggu] = { minggu: row.minggu, items: [], selesai: 0, total: 0 }; order.push(row.minggu); }
        var w = weeks[row.minggu];
        w.items.push({ kpiId: row.kpi_template_id, indikator: row.indikator, selesai: row.selesai, catatan: row.catatan });
        w.total++;
        if (row.selesai) w.selesai++;
      });
      return order.slice(0, 4).map(function (k) { return weeks[k]; });
    },

    submitKPILaporan: async function (args) {
      var minggu = args[1], items = args[2];
      var r = await window.sb.rpc('submit_kpi_laporan', { p_minggu: minggu, p_items: items || [] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getPapanPeringkat: async function () {
      var r = await window.sb.rpc('get_papan_peringkat');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return {
          id: row.id, nama: row.nama, jabatan: row.jabatan, bagian: row.bagian,
          bintang: row.bintang, skor: row.skor, finalScore: row.final_score,
          ranking: row.ranking, isRanking1: row.is_ranking1, apresiasi: row.apresiasi
        };
      });
    }
  };

  window.realBackendHandles = function (action) { return Object.prototype.hasOwnProperty.call(handlers, action); };
  window.realBackend = function (action, args) { return handlers[action](args || []); };
})();
