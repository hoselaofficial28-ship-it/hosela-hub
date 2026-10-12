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
  function fmtTanggalJamId(isoDatetime) {
    if (!isoDatetime) return '';
    var d = new Date(isoDatetime);
    var jam = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return d.getDate() + ' ' + MONTH_ID[d.getMonth()] + ' ' + d.getFullYear() + ' ' + jam;
  }

  var handlers = {
    validateLogin: async function (args) {
      var nama = args[0], password = args[1];
      var resolved = await window.sb.rpc('resolve_login_email', { p_nama: nama });
      if (resolved.error || !resolved.data) return { success: false, msg: 'Nama atau sandi salah' };
      var signIn = await window.sb.auth.signInWithPassword({ email: resolved.data, password: password });
      if (signIn.error || !signIn.data.session) {
        var authMsg = (signIn.error && signIn.error.message) ? signIn.error.message : '';
        if (/email not confirmed/i.test(authMsg)) {
          return { success: false, msg: 'Akun sudah terdaftar, tetapi konfirmasi email Supabase masih aktif. Hubungi Owner untuk mengaktifkan akun.' };
        }
        return { success: false, msg: 'Nama atau sandi salah' };
      }
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
      return { success: true, msg: 'Pendaftaran berhasil! Akun langsung aktif dan bisa dipakai untuk login.' };
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

    // Kalender kehadiran dibangun dari tabel Supabase yang sudah dilindungi RLS.
    // Owner/Finance mendapat semua profil; karyawan otomatis hanya melihat dirinya.
    getAbsensiMatrix: async function (args) {
      return buildAttendanceMatrix(args[0], null);
    },

    getAbsensiMatrixUser: async function (args) {
      return buildAttendanceMatrix(args[1], args[0]);
    },

    updateAbsensiMatrixDay: async function (args) {
      var r = await window.sb.rpc('update_absensi_matrix_day', {
        p_user_id: args[0], p_tanggal: args[1], p_jam_masuk: args[2] || null,
        p_jam_pulang: args[3] || null, p_catatan: args[4] || ''
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    importAbsensiUploadToApp: async function (args) {
      var r = await window.sb.rpc('import_attendance_legacy_to_events', { p_bulan_key: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getAbsensiRekap: async function (args) {
      var r = await window.sb.rpc('get_absensi_rekap', { p_user_id: args[0] });
      if (r.error) return { bulanIni: '', liburBulanIni: [], data: [], success: false, msg: r.error.message };
      return r.data;
    },

    getAllAbsensiRekap: async function () {
      var r = await window.sb.rpc('get_all_absensi_rekap');
      if (r.error) return { minggu: '', data: [] };
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
    },

    // args lama: [nama, bagian, jabatan, email]. Lewat Edge Function (bukan
    // RPC) -- satu-satunya cara aman buat akun+password dari server.
    addKaryawanBaru: async function (args) {
      var nama = args[0], bagian = args[1], jabatan = args[2], email = args[3];
      var r = await window.sb.functions.invoke('add-karyawan', { body: { nama: nama, bagian: bagian, jabatan: jabatan, email: email } });
      if (r.error) {
        var msg = 'Gagal mendaftarkan karyawan';
        try { var body = await r.error.context.json(); if (body && body.msg) msg = body.msg; } catch (e) {}
        return { success: false, msg: msg };
      }
      return r.data;
    },

    // args lama: [actorId, bulanKey] -- actorId diabaikan, pakai auth.uid()
    getSalaryUsers: async function (args) {
      var r = await window.sb.rpc('get_salary_users', { p_bulan_key: args[1] || null });
      if (r.error) return { success: false, msg: r.error.message };
      return {
        success: true, bulan: args[1],
        data: (r.data || []).map(function (row) {
          return {
            id: row.id, nama: row.nama, bagian: row.bagian, jabatan: row.jabatan, status: row.status,
            gajiBulanan: row.gaji_bulanan, gajiBulanBerlaku: row.gaji_bulan_berlaku, bonusKerajinan: row.bonus_kerajinan,
            bulanBerlaku: row.bulan_berlaku, bulanSetting: row.bulan_setting, catatanSetting: row.catatan_setting
          };
        })
      };
    },

    // args lama: [actorId, userId, salary, bulanKey, note, bonusKerajinan]
    updateUserSalary: async function (args) {
      var r = await window.sb.rpc('update_user_salary', {
        p_user_id: args[1], p_salary: parseInt(args[2], 10) || 0, p_bulan_key: args[3] || null,
        p_note: args[4] || '', p_bonus_kerajinan: parseInt(args[5], 10) || 150000
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [actorId, bulanKey, items]
    updateSalaryUsersBatch: async function (args) {
      var r = await window.sb.rpc('update_salary_users_batch', { p_bulan_key: args[1] || null, p_items: args[2] || [] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [actorId, userId]
    deactivateSalaryUser: async function (args) {
      var r = await window.sb.rpc('deactivate_salary_user', { p_user_id: args[1] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getAllUsers: async function () {
      var r = await window.sb.rpc('get_all_users');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, nama: row.nama, bagian: row.bagian, jabatan: row.jabatan, status: row.status };
      });
    },

    getOwnerAccounts: async function () {
      var r = await window.sb.rpc('get_owner_accounts');
      if (r.error) throw r.error;
      return (r.data || []).map(function (row) {
        return {
          id: row.id, nama: row.nama, bagian: row.bagian, jabatan: row.jabatan,
          email: row.email, status: row.status,
          createdAt: fmtTanggalJamId(row.created_at), nonaktifAt: fmtTanggalJamId(row.nonaktif_at)
        };
      });
    },

    setUserAccess: async function (args) {
      var r = await window.sb.rpc('set_user_access', { p_user_id: args[0], p_active: !!args[1] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [userId] -- sama persis deactivate_salary_user, cuma beda jumlah argumen
    nonaktifkanUser: async function (args) {
      var r = await window.sb.rpc('deactivate_salary_user', { p_user_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getMyJobdesk: async function () {
      var r = await window.sb.rpc('get_my_jobdesk');
      if (r.error) return { success: false, msg: r.error.message };
      var row = profileRow(r.data);
      return row ? { success: true, data: row } : { success: true, data: null };
    },

    getOwnerJobdesks: async function () {
      var r = await window.sb.rpc('get_owner_jobdesks');
      if (r.error) return { success: false, data: [], msg: r.error.message };
      return { success: true, data: r.data || [] };
    },

    saveOwnerJobdesk: async function (args) {
      var r = await window.sb.rpc('upsert_jobdesk_link', {
        p_bagian: args[0], p_jabatan: args[1], p_link: args[2]
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getOfficeSettings: async function () {
      var r = await window.sb.rpc('get_office_settings');
      if (r.error) return { success: false, msg: r.error.message };
      return { success: true, data: r.data || {} };
    },

    setOfficeSettings: async function (args) {
      var r = await window.sb.rpc('set_office_settings', {
        p_lat: args[0], p_lng: args[1], p_radius: args[2]
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // Query langsung -- RLS announcements sudah filter bagian sendiri/ALL otomatis.
    getPengumuman: async function (args) {
      var bagian = args[0];
      var r = await window.sb.from('announcements')
        .select('id,judul,isi,kategori,dibuat_oleh,created_at')
        .eq('status', 'AKTIF').order('created_at', { ascending: false });
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, judul: row.judul, isi: row.isi, kategori: row.kategori, dibuat: row.dibuat_oleh, tgl: fmtTanggalId(row.created_at) };
      });
    },

    // args lama: [judul, isi, kategori, target, actorNama]
    addPengumuman: async function (args) {
      var r = await window.sb.rpc('add_pengumuman', { p_judul: args[0], p_isi: args[1], p_kategori: args[2], p_target_bagian: args[3] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    getIde: async function () {
      var r = await window.sb.rpc('get_ide');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, judul: row.judul, deskripsi: row.deskripsi, tgl: fmtTanggalId(row.tgl), status: row.status, feedback: row.feedback, nama: row.nama, bagian: row.bagian };
      });
    },

    // args lama: [userId, nama, judul, deskripsi] -- userId/nama diabaikan, pakai auth.uid()
    addIde: async function (args) {
      var judul = args[2], deskripsi = args[3];
      var r = await window.sb.from('team_ideas').insert({ user_id: (await window.sb.auth.getUser()).data.user.id, judul: judul, deskripsi: deskripsi });
      if (r.error) return { success: false, msg: r.error.message };
      return { success: true };
    },

    // Query langsung -- RLS holidays "semua baca".
    getKalenderLibur: async function () {
      var r = await window.sb.from('holidays').select('id,tanggal,nama,difasilitasi').order('tanggal', { ascending: false });
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, tanggal: fmtTanggalId(row.tanggal), nama: row.nama, difasilitasi: row.difasilitasi ? 'YA' : 'TIDAK' };
      });
    },

    // args lama: [tanggal, nama, actorNama]
    addLibur: async function (args) {
      var r = await window.sb.rpc('add_libur', { p_tanggal: args[0], p_nama: args[1] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [id, actorNama]
    hapusLibur: async function (args) {
      var r = await window.sb.rpc('hapus_libur', { p_holiday_id: args[0] });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // Query langsung -- RLS rules "semua baca".
    getPeraturan: async function () {
      var r = await window.sb.from('rules').select('id,no_urut,kategori,isi').order('no_urut');
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, no: row.no_urut, kategori: row.kategori, isi: row.isi };
      });
    },

    savePeraturan: async function (args) {
      var r = await window.sb.rpc('save_rule', {
        p_id: args[0] || null, p_kategori: args[1], p_isi: args[2]
      });
      if (r.error) return { success: false, msg: r.error.message };
      return r.data;
    },

    // args lama: [userId] -- query langsung, RLS notifications "baca sendiri".
    getNotifikasi: async function (args) {
      var userId = args[0];
      var r = await window.sb.from('notifications')
        .select('id,judul,isi,tipe,status,created_at,menu')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
      if (r.error) return [];
      return (r.data || []).map(function (row) {
        return { id: row.id, judul: row.judul, isi: row.isi, tipe: row.tipe, dibaca: row.status === 'SUDAH', tgl: fmtTanggalJamId(row.created_at), menu: row.menu };
      });
    },

    // args lama: [notifId]
    hapusNotifikasi: async function (args) {
      var r = await window.sb.rpc('hapus_notifikasi', { p_notif_id: args[0] });
      if (r.error) return { success: false };
      return r.data;
    },

    // args lama: [userId]
    hapusSemuaNotifikasi: async function () {
      var r = await window.sb.rpc('hapus_semua_notifikasi');
      if (r.error) return { success: false };
      return r.data;
    },

    // args lama: [keterangan]
    triggerNotifPeraturan: async function (args) {
      var r = await window.sb.rpc('trigger_notif_peraturan', { p_keterangan: args[0] || '' });
      if (r.error) return { success: false };
      return r.data;
    },

    // args lama: [notifId]
    tandaiDibaca: async function (args) {
      var r = await window.sb.rpc('tandai_dibaca', { p_notif_id: args[0] });
      if (r.error) return { success: false };
      return r.data;
    },

    // args lama: [userId, menu] -- userId diabaikan, RPC pakai auth.uid() sendiri.
    tandaiMenuDibaca: async function (args) {
      var r = await window.sb.rpc('tandai_menu_dibaca', { p_menu: args[1] });
      if (r.error) return { success: false };
      return r.data;
    }
  };

  function attendanceDayCell(user, day) {
    if (!user.days[day]) user.days[day] = { masuk: '', pulang: '', absen: false, telat: false, lembur: false, anomali: false, rejected: false, rows: [] };
    return user.days[day];
  }

  function attendanceTime(value) {
    return value ? String(value).substring(0, 8) : '';
  }

  function attendanceMinutes(value) {
    var m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
  }

  function attendanceScheduleForDate(schedules, dateKey) {
    var found = (schedules || []).find(function (s) { return dateKey >= s.dari && dateKey <= s.sampai; });
    return found || { jam_masuk: '08:00:00', jam_pulang: '18:00:00' };
  }

  async function buildAttendanceMatrix(bulanKey, targetUserId) {
    bulanKey = String(bulanKey || '');
    if (!/^\d{4}-\d{2}$/.test(bulanKey)) return { success: false, msg: 'Bulan tidak valid' };
    var start = bulanKey + '-01';
    var parts = bulanKey.split('-');
    var end = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
    var endKey = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');

    var profileQuery = window.sb.from('profiles').select('id,nama,bagian,jabatan').eq('status', 'AKTIF').order('nama');
    if (targetUserId) profileQuery = profileQuery.eq('id', targetUserId);
    else profileQuery = profileQuery.not('bagian', 'in', '(Owner,Finance)');
    var results = await Promise.all([
      profileQuery,
      window.sb.from('attendance_events').select('id,user_id,tanggal,jam,tipe,status,source,catatan').gte('tanggal', start).lte('tanggal', endKey).order('created_at'),
      window.sb.from('attendance_details').select('id,user_id,tanggal,waktu,tipe,keterangan').gte('tanggal', start).lte('tanggal', endKey),
      window.sb.from('attendance_anomalies').select('id,user_id,tanggal,tipe,status').gte('tanggal', start).lte('tanggal', endKey).eq('status', 'MENUNGGU'),
      window.sb.from('work_schedules').select('dari,sampai,jam_masuk,jam_pulang,urutan').lte('dari', endKey).gte('sampai', start).order('urutan')
    ]);
    var failed = results.find(function (x) { return x.error; });
    if (failed) return { success: false, msg: failed.error.message };

    var users = (results[0].data || []).map(function (p) { return { id: p.id, nama: p.nama, bagian: p.bagian, jabatan: p.jabatan, days: {} }; });
    var userMap = {};
    users.forEach(function (u) { userMap[u.id] = u; });
    var totalMasuk = 0, totalPulang = 0;

    (results[2].data || []).forEach(function (row) {
      var u = userMap[row.user_id]; if (!u) return;
      var day = parseInt(String(row.tanggal).substring(8, 10), 10), cell = attendanceDayCell(u, day);
      if (row.tipe === 'ABSEN') cell.absen = true;
      else if (row.tipe === 'TELAT') cell.telat = true;
      else if (row.tipe === 'LEMBUR_PULANG' || row.tipe === 'LEMBUR_MINGGU' || row.tipe === 'LEMBUR_LIBUR') cell.lembur = true;
    });
    (results[3].data || []).forEach(function (row) {
      var u = userMap[row.user_id]; if (!u) return;
      var cell = attendanceDayCell(u, parseInt(String(row.tanggal).substring(8, 10), 10));
      cell.anomali = true; cell.absen = false; cell.anomaliTipe = row.tipe || '';
    });
    (results[1].data || []).forEach(function (row) {
      var u = userMap[row.user_id]; if (!u) return;
      var day = parseInt(String(row.tanggal).substring(8, 10), 10), cell = attendanceDayCell(u, day);
      var jam = attendanceTime(row.jam), tipe = String(row.tipe || '').toUpperCase();
      cell.rows.push({ id: row.id, tipe: tipe, jam: jam, status: row.status, source: row.source, catatan: row.catatan || '' });
      if (row.status !== 'DITERIMA') { cell.rejected = true; return; }
      if (tipe === 'ABSEN') { cell.masuk = ''; cell.pulang = ''; cell.absen = new Date(row.tanggal + 'T12:00:00').getDay() !== 0; cell.rejected = false; return; }
      cell.absen = false;
      if (tipe === 'MASUK') { cell.masuk = jam; totalMasuk++; }
      if (tipe === 'PULANG') { cell.pulang = jam; totalPulang++; }
    });
    users.forEach(function (u) {
      Object.keys(u.days).forEach(function (day) {
        var cell = u.days[day], dateKey = bulanKey + '-' + String(day).padStart(2, '0');
        var schedule = attendanceScheduleForDate(results[4].data || [], dateKey);
        cell.jadwalMasuk = attendanceTime(schedule.jam_masuk).substring(0, 5) || '08:00';
        if (cell.masuk && cell.pulang) cell.anomali = false;
        if (cell.anomali || cell.masuk || cell.pulang) cell.absen = false;
        var actual = attendanceMinutes(cell.masuk), required = attendanceMinutes(cell.jadwalMasuk);
        if (actual !== null && required !== null && new Date(dateKey + 'T12:00:00').getDay() !== 0 && actual > required) cell.telat = true;
      });
    });
    return { success: true, version: 'attendance-matrix-supabase-20261012', sources: ['attendance_details','attendance_events'], bulan: bulanKey, days: end.getDate(), users: users, totalMasuk: totalMasuk, totalPulang: totalPulang };
  }

  window.realBackendHandles = function (action) { return Object.prototype.hasOwnProperty.call(handlers, action); };
  window.realBackend = function (action, args) { return handlers[action](args || []); };
})();
