// ============================================================================
// REAL BACKEND — aksi yang SUDAH tersambung ke Supabase asli (bukan contoh).
// Aksi lain yang belum ada di sini tetap pakai mock-backend.js (lihat
// gasCall di app.js, real-backend dicoba dulu baru fallback ke mock).
// ============================================================================
(function () {
  'use strict';

  function profileRow(p) { return Array.isArray(p) ? p[0] : p; }

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
    }
  };

  window.realBackendHandles = function (action) { return Object.prototype.hasOwnProperty.call(handlers, action); };
  window.realBackend = function (action, args) { return handlers[action](args || []); };
})();
