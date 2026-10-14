// ============================================================================
// Hosela Hub — Penyimpanan Foto Absensi (Firebase Storage, TANPA SDK)
// ============================================================================
// Sengaja tidak memakai SDK Firebase: aplikasi ini web statis mobile-first dan
// aturan project melarang menambah library besar. Yang dipakai hanya REST
// resmi Google (3 endpoint):
//   1) Masuk anonim  : POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<apiKey>
//   2) Unggah foto   : POST https://firebasestorage.googleapis.com/v0/b/<bucket>/o?name=<path>
//   3) Tautan foto   : https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=<token>
//
// Isi PHOTO_STORAGE_CONFIG dari Firebase Console (Project settings -> Your apps
// -> Web app -> SDK setup and configuration). Nilai config ini memang PUBLIK
// karena tampil di browser; keamanan dijaga Storage Rules — lihat
// docs/clone-supabase/08-SETUP-FIREBASE-FOTO.md.
//
// Selama config masih kosong, photoStorageConfigured() = false dan aplikasi
// tetap jalan normal (foto tidak dikirim, status ditampilkan apa adanya).
// ============================================================================

var PHOTO_STORAGE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  appId: ''
};

var PHOTO_STORAGE_PREFIX = 'absensi';
var PHOTO_STORAGE_MAX_BYTES = 800 * 1024;
var PHOTO_STORAGE_TOKEN_MS = 50 * 60 * 1000;

var _photoToken = '';
var _photoTokenUntil = 0;
var _photoTokenUid = '';

function photoStorageConfigured() {
  return !!(PHOTO_STORAGE_CONFIG.apiKey && PHOTO_STORAGE_CONFIG.storageBucket);
}

function photoStoragePad2(n) {
  return (n < 10 ? '0' : '') + n;
}

// Path di dalam bucket: absensi/<tahun-bulan>/<stempel>_<TIPE>_<userId>.jpg
// Dikelompokkan per bulan supaya mudah ditelusuri dan mudah diarsipkan nanti.
function photoStoragePath(userId, tipe, takenAt) {
  var d = takenAt ? new Date(takenAt) : new Date();
  if (!d || isNaN(d.getTime())) d = new Date();
  var bulan = d.getFullYear() + '-' + photoStoragePad2(d.getMonth() + 1);
  var stamp = '' + d.getFullYear() + photoStoragePad2(d.getMonth() + 1) + photoStoragePad2(d.getDate()) +
    '-' + photoStoragePad2(d.getHours()) + photoStoragePad2(d.getMinutes()) + photoStoragePad2(d.getSeconds());
  var tipeBersih = String(tipe || 'MASUK').toUpperCase().replace(/[^A-Z]/g, '') || 'MASUK';
  var uid = String(userId || 'tanpa-id').replace(/[^A-Za-z0-9-]/g, '').slice(0, 36) || 'tanpa-id';
  return PHOTO_STORAGE_PREFIX + '/' + bulan + '/' + stamp + '_' + tipeBersih + '_' + uid + '.jpg';
}

// Pesan error ditampilkan APA ADANYA (termasuk kode aslinya) supaya penyebabnya
// bisa ditelusuri, sesuai aturan Ko: jangan menyamarkan sebab sebenarnya.
function photoStorageErrorText(status, payload) {
  var code = '';
  if (payload && payload.error && payload.error.message) code = String(payload.error.message);
  else if (payload && payload.error && typeof payload.error === 'string') code = String(payload.error);
  else if (payload && payload.error && payload.error.code) code = String(payload.error.code);

  var map = {
    OPERATION_NOT_ALLOWED: 'Masuk anonim (Anonymous) belum diaktifkan di Firebase Authentication.',
    ADMIN_ONLY_OPERATION: 'Metode masuk anonim tidak diizinkan di project Firebase ini.',
    API_KEY_INVALID: 'API key Firebase tidak valid.',
    API_KEY_HTTP_REFERRER_BLOCKED: 'API key Firebase diblokir untuk alamat web ini (cek pembatasan HTTP referrer).',
    STORAGE_UNAUTHORIZED: 'Akses penyimpanan ditolak — Storage Rules belum mengizinkan unggah.',
    STORAGE_BUCKET_NOT_FOUND: 'Bucket penyimpanan Firebase tidak ditemukan.',
    STORAGE_QUOTA_EXCEEDED: 'Kuota penyimpanan Firebase habis.',
    STORAGE_UNKNOWN: 'Penyimpanan Firebase menolak permintaan.',
    UNAUTHORIZED: 'Tidak diizinkan menulis ke penyimpanan (Storage Rules).'
  };
  if (code && map[code]) return map[code] + ' [' + code + ']';
  if (status === 404) return 'Alamat penyimpanan tidak ditemukan (nama bucket kemungkinan salah). [HTTP 404]';
  if (status === 401 || status === 403) return 'Akses penyimpanan ditolak: ' + (code || 'tidak diizinkan') + ' [HTTP ' + status + ']';
  if (status === 413) return 'Foto ditolak karena terlalu besar. [HTTP 413]';
  if (code) return 'Gagal menyimpan foto: ' + code + (status ? ' [HTTP ' + status + ']' : '');
  return 'Gagal menyimpan foto: HTTP ' + status;
}

function photoStorageDataUrlToBytes(dataUrl) {
  var m = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i);
  if (!m) return null;
  var bin;
  try { bin = atob(m[2]); } catch (e) { return null; }
  var arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { mime: m[1].toLowerCase(), bytes: arr };
}

function photoStorageSha256(bytes, cb) {
  try {
    if (!window.crypto || !window.crypto.subtle || !window.crypto.subtle.digest) { cb(''); return; }
    window.crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      var b = new Uint8Array(buf);
      var out = '';
      for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      cb(out);
    }).catch(function () { cb(''); });
  } catch (e) { cb(''); }
}

// Masuk anonim: token berlaku 1 jam, kami simpan 50 menit agar tidak kedaluwarsa
// di tengah proses unggah. Tidak ada layar login dan tidak ada izin Google yang
// perlu diklik karyawan.
function photoStorageSignIn(cb) {
  if (!photoStorageConfigured()) { cb(new Error('Konfigurasi penyimpanan foto (Firebase) belum diisi.'), ''); return; }
  if (_photoToken && Date.now() < _photoTokenUntil) { cb(null, _photoToken); return; }
  fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(PHOTO_STORAGE_CONFIG.apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  }).then(function (res) {
    return res.text().then(function (text) {
      var body = null;
      try { body = JSON.parse(text); } catch (e) { body = null; }
      return { status: res.status, body: body };
    });
  }).then(function (r) {
    if (!r.body || !r.body.idToken) { cb(new Error(photoStorageErrorText(r.status, r.body)), ''); return; }
    _photoToken = r.body.idToken;
    _photoTokenUid = r.body.localId || '';
    _photoTokenUntil = Date.now() + PHOTO_STORAGE_TOKEN_MS;
    cb(null, _photoToken);
  }).catch(function (err) {
    cb(new Error('Tidak bisa menghubungi penyimpanan Firebase: ' + ((err && err.message) ? err.message : 'jaringan bermasalah')), '');
  });
}

// Unggah foto. opts = { userId, tipe, dataUrl, takenAt }
// done(err, { path, url, mime, size, sha256 })
function photoStorageUpload(opts, done) {
  if (!photoStorageConfigured()) {
    done(new Error('Konfigurasi penyimpanan foto (Firebase) belum diisi.'), null);
    return;
  }
  var parsed = photoStorageDataUrlToBytes(opts && opts.dataUrl);
  if (!parsed) { done(new Error('Format foto tidak dikenali (bukan data:image/...).'), null); return; }
  if (parsed.bytes.length > PHOTO_STORAGE_MAX_BYTES) {
    done(new Error('Foto terlalu besar: ' + Math.round(parsed.bytes.length / 1024) + ' KB, maksimal ' +
      Math.round(PHOTO_STORAGE_MAX_BYTES / 1024) + ' KB.'), null);
    return;
  }

  var path = photoStoragePath(opts.userId, opts.tipe, opts.takenAt);
  var bucket = PHOTO_STORAGE_CONFIG.storageBucket;

  photoStorageSha256(parsed.bytes, function (sha) {
    photoStorageSignIn(function (err, token) {
      if (err) { done(err, null); return; }
      var endpoint = 'https://firebasestorage.googleapis.com/v0/b/' + encodeURIComponent(bucket) +
        '/o?name=' + encodeURIComponent(path);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': parsed.mime },
        body: new Blob([parsed.bytes], { type: parsed.mime })
      }).then(function (res) {
        return res.text().then(function (text) {
          var body = null;
          try { body = JSON.parse(text); } catch (e) { body = null; }
          return { status: res.status, body: body };
        });
      }).then(function (r) {
        if (r.status >= 200 && r.status < 300 && r.body && r.body.name) {
          var downloadToken = String(r.body.downloadTokens || '').split(',')[0];
          var link = 'https://firebasestorage.googleapis.com/v0/b/' + encodeURIComponent(bucket) +
            '/o/' + encodeURIComponent(r.body.name) + '?alt=media' + (downloadToken ? '&token=' + encodeURIComponent(downloadToken) : '');
          done(null, { path: r.body.name, url: link, mime: parsed.mime, size: parsed.bytes.length, sha256: sha });
          return;
        }
        done(new Error(photoStorageErrorText(r.status, r.body)), null);
      }).catch(function (e) {
        done(new Error('Unggah foto gagal: ' + ((e && e.message) ? e.message : 'jaringan bermasalah')), null);
      });
    });
  });
}
