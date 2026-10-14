// ============================================================================
// Hosela Hub — Penyimpanan Foto Absensi (Supabase Storage)
// ============================================================================
// Foto masuk ke bucket PRIVAT `attendance-photos`. Browser hanya memakai sesi
// Supabase karyawan yang sudah login; tidak ada kredensial admin di frontend.
// Path selalu diawali user id agar policy Storage dapat memastikan karyawan
// hanya mengunggah dan membuka fotonya sendiri. Owner/Finance dapat membaca
// semua foto melalui policy SQL.
// ============================================================================

var PHOTO_STORAGE_BUCKET = 'attendance-photos';
var PHOTO_STORAGE_ENABLED = true;
var PHOTO_STORAGE_MAX_BYTES = 180 * 1024;

function photoStorageEnabled() {
  return !!PHOTO_STORAGE_ENABLED;
}

function photoStorageConfigured() {
  return !!(window.sb && window.sb.storage);
}

function photoStoragePad2(n) {
  return (n < 10 ? '0' : '') + n;
}

// Path: <user-id>/<tahun-bulan>/<stempel>_<TIPE>_<event-id>.jpg
// Folder pertama wajib user id karena dipakai policy Storage Supabase.
function photoStoragePath(userId, tipe, takenAt, eventId) {
  var d = takenAt ? new Date(takenAt) : new Date();
  if (!d || isNaN(d.getTime())) d = new Date();
  var bulan = d.getFullYear() + '-' + photoStoragePad2(d.getMonth() + 1);
  var stamp = '' + d.getFullYear() + photoStoragePad2(d.getMonth() + 1) + photoStoragePad2(d.getDate()) +
    '-' + photoStoragePad2(d.getHours()) + photoStoragePad2(d.getMinutes()) + photoStoragePad2(d.getSeconds()) +
    '-' + String(d.getMilliseconds()).padStart(3, '0');
  var tipeBersih = String(tipe || 'MASUK').toUpperCase().replace(/[^A-Z]/g, '') || 'MASUK';
  var uid = String(userId || '').toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 36);
  var eid = String(eventId || '').toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 36);
  if (!uid) uid = 'tanpa-id';
  if (!eid) eid = 'tanpa-event';
  return uid + '/' + bulan + '/' + stamp + '_' + tipeBersih + '_' + eid + '.jpg';
}

function photoStorageErrorText(err) {
  var msg = String((err && err.message) || err || 'Penyebab tidak diketahui');
  if (/row-level security|unauthorized|permission|403/i.test(msg)) {
    return 'Akses Supabase Storage ditolak. Pastikan bucket dan policy foto absensi sudah dipasang. [' + msg + ']';
  }
  if (/bucket.*not found|not found.*bucket|404/i.test(msg)) {
    return 'Bucket foto absensi belum tersedia di Supabase. [' + msg + ']';
  }
  if (/maximum allowed size|payload too large|413/i.test(msg)) {
    return 'Foto ditolak karena melewati batas ukuran 180 KB. [' + msg + ']';
  }
  if (/duplicate|already exists|409/i.test(msg)) {
    return 'Nama foto sudah pernah dipakai. Ambil ulang foto lalu kirim kembali. [' + msg + ']';
  }
  return 'Gagal menyimpan foto ke Supabase: ' + msg;
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

// opts = { userId, eventId, tipe, dataUrl, takenAt }
// done(err, { path, url, mime, size, sha256, provider })
function photoStorageUpload(opts, done) {
  if (!photoStorageConfigured()) {
    done(new Error('Koneksi Supabase Storage belum tersedia.'), null);
    return;
  }
  var parsed = photoStorageDataUrlToBytes(opts && opts.dataUrl);
  if (!parsed) { done(new Error('Format foto tidak dikenali (bukan data:image/...).'), null); return; }
  if (parsed.mime !== 'image/jpeg') { done(new Error('Format foto harus JPEG.'), null); return; }
  if (parsed.bytes.length > PHOTO_STORAGE_MAX_BYTES) {
    done(new Error('Foto masih terlalu besar: ' + Math.round(parsed.bytes.length / 1024) +
      ' KB, maksimal ' + Math.round(PHOTO_STORAGE_MAX_BYTES / 1024) + ' KB.'), null);
    return;
  }

  var path = photoStoragePath(opts.userId, opts.tipe, opts.takenAt, opts.eventId);
  photoStorageSha256(parsed.bytes, function (sha) {
    var blob = new Blob([parsed.bytes], { type: parsed.mime });
    window.sb.storage.from(PHOTO_STORAGE_BUCKET).upload(path, blob, {
      cacheControl: '3600',
      contentType: parsed.mime,
      // Nama berbasis event tetap sama saat kirim ulang. Upsert membuat retry
      // aman bila file sudah masuk tetapi RPC metadata sempat gagal.
      upsert: true
    }).then(function (r) {
      if (r.error) { done(new Error(photoStorageErrorText(r.error)), null); return; }
      done(null, {
        path: (r.data && r.data.path) || path,
        url: '',
        mime: parsed.mime,
        size: parsed.bytes.length,
        sha256: sha,
        provider: 'SUPABASE'
      });
    }).catch(function (err) {
      done(new Error(photoStorageErrorText(err)), null);
    });
  });
}

// Bucket privat: tautan dibuat hanya saat pengguna yang berhak menekan
// "Lihat Foto", dan otomatis kedaluwarsa setelah 2 menit.
function photoStorageCreateSignedUrl(path, done) {
  if (!photoStorageConfigured()) { done(new Error('Koneksi Supabase Storage belum tersedia.'), ''); return; }
  var safePath = String(path || '').trim();
  if (!safePath) { done(new Error('Lokasi foto tidak tersedia.'), ''); return; }
  window.sb.storage.from(PHOTO_STORAGE_BUCKET).createSignedUrl(safePath, 120).then(function (r) {
    if (r.error || !r.data || !r.data.signedUrl) {
      done(new Error(photoStorageErrorText(r.error || 'Tautan foto tidak berhasil dibuat.')), '');
      return;
    }
    done(null, r.data.signedUrl);
  }).catch(function (err) {
    done(new Error(photoStorageErrorText(err)), '');
  });
}
