import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const fixtures = {
  profiles: [
    { id: 'u-1', nama: 'Ayu', bagian: 'Packing', jabatan: 'Admin Packing' },
  ],
  attendance_events: [
    { id: 'e-1', user_id: 'u-1', tanggal: '2026-10-06', jam: '08:12:00', tipe: 'MASUK', status: 'DITERIMA', source: 'CAMERA', catatan: '' },
    { id: 'e-2', user_id: 'u-1', tanggal: '2026-10-06', jam: '19:05:00', tipe: 'PULANG', status: 'DITERIMA', source: 'CAMERA', catatan: '' },
  ],
  attendance_details: [
    { id: 'd-1', user_id: 'u-1', tanggal: '2026-10-06', waktu: '08:12:00', tipe: 'TELAT', keterangan: 'Telat 12 menit' },
    { id: 'd-2', user_id: 'u-1', tanggal: '2026-10-06', waktu: '19:05:00', tipe: 'LEMBUR_PULANG', keterangan: 'Lembur 1 jam' },
  ],
  attendance_anomalies: [],
  work_schedules: [
    { dari: '2026-10-01', sampai: '2026-10-31', jam_masuk: '08:00:00', jam_pulang: '18:00:00', urutan: 1 },
  ],
};

function queryFor(table) {
  const result = { data: fixtures[table] || [], error: null };
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    not() { return chain; },
    gte() { return chain; },
    lte() { return chain; },
    order() { return chain; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return chain;
}

const rpcCalls = [];
const window = {
  sb: {
    from: queryFor,
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (name === 'get_absensi_rekap') return { data: { bulanIni: '2026-10', data: [] }, error: null };
      if (name === 'get_all_absensi_rekap') return { data: { minggu: 'Okt 2026', data: [] }, error: null };
      return { data: { success: true }, error: null };
    },
    auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
    functions: { invoke: async () => ({ data: {}, error: null }) },
  },
};

const context = vm.createContext({ window, console, Date, Promise, String, Array, Object, Math, parseInt, isNaN });
vm.runInContext(fs.readFileSync(new URL('../app/js/real-backend.js', import.meta.url), 'utf8'), context);
const appSource = fs.readFileSync(new URL('../app/js/app.js', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /<span>'\+u\.id\+'<\/span>/, 'UUID karyawan tidak boleh ditampilkan di kartu Catatan Kehadiran');

const matrix = await window.realBackend('getAbsensiMatrix', ['2026-10']);
assert.equal(matrix.success, true);
assert.equal(matrix.days, 31);
assert.equal(matrix.users.length, 1);
assert.equal(matrix.users[0].days[6].masuk, '08:12:00');
assert.equal(matrix.users[0].days[6].pulang, '19:05:00');
assert.equal(matrix.users[0].days[6].telat, true);
assert.equal(matrix.users[0].days[6].lembur, true);
assert.equal(matrix.totalMasuk, 1);
assert.equal(matrix.totalPulang, 1);

const personal = await window.realBackend('getAbsensiRekap', ['u-1']);
assert.equal(personal.bulanIni, '2026-10');
assert.equal(rpcCalls.at(-1).name, 'get_absensi_rekap');

await window.realBackend('updateAbsensiMatrixDay', ['u-1', '2026-10-06', '08:00', '18:00', 'koreksi']);
assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls.at(-1))), {
  name: 'update_absensi_matrix_day',
  args: { p_user_id: 'u-1', p_tanggal: '2026-10-06', p_jam_masuk: '08:00', p_jam_pulang: '18:00', p_catatan: 'koreksi' },
});

console.log('attendance-matrix tests: OK');
