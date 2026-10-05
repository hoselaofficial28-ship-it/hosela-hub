# API Parity Manifest

Hasil audit statis pada 5 Oktober 2026: frontend memiliki 68 pemanggilan `gasCall` bernama tetap. `ADA` berarti memiliki case pada dispatcher `handleAPI`; `GAP` berarti UI memanggilnya tetapi case dispatcher aktif tidak ditemukan.

| Aksi frontend | Dispatcher GAS |
|---|---|
| `addIde` | ADA |
| `addKaryawanBaru` | GAP |
| `addLibur` | ADA |
| `addPengumuman` | ADA |
| `addSanksiManual` | ADA |
| `approveIzin` | ADA |
| `approveRegistrasi` | GAP |
| `batalSanksiManual` | ADA |
| `confirmPayroll` | ADA |
| `createPayrollDraft` | ADA |
| `daftarAkun` | GAP |
| `deactivateSalaryUser` | ADA |
| `gantiPIN` | ADA |
| `getAbsensiCameraToday` | ADA |
| `getAbsensiRekap` | ADA |
| `getAllAbsensiRekap` | ADA |
| `getAllUsers` | ADA |
| `getAnomaliPending` | ADA |
| `getDaftarOptions` | GAP |
| `getHomeData` | ADA |
| `getIde` | ADA |
| `getIzinKaryawan` | ADA |
| `getIzinPending` | ADA |
| `getIzinPendingCount` | ADA |
| `getIzinTelatReview` | GAP |
| `getJobdeskByJabatan` | ADA |
| `getJobdeskList` | ADA |
| `getKalenderLibur` | ADA |
| `getKPILaporan` | ADA |
| `getKPITemplate` | ADA |
| `getNotifikasi` | ADA |
| `getPapanPeringkat` | ADA |
| `getPayrollDetail` | ADA |
| `getPayrollEmployeeSlip` | ADA |
| `getPayrollEmployeeSlipDetail` | ADA |
| `getPayrollPreview` | ADA |
| `getPengaturan` | ADA |
| `getPengumuman` | ADA |
| `getPeraturan` | ADA |
| `getRegistrasiPending` | GAP |
| `getRekapBulananSemua` | ADA |
| `getSalaryUsers` | ADA |
| `getSanksiManual` | ADA |
| `getStaffByBagian` | ADA |
| `hapusLibur` | GAP |
| `hapusNotifikasi` | ADA |
| `hapusSemuaNotifikasi` | ADA |
| `importAbsensiUploadToApp` | ADA |
| `konfirmasiAnomali` | ADA |
| `nonaktifkanUser` | ADA |
| `ping` | ADA |
| `processAbsensiAppToRekap` | ADA |
| `processAbsensiUpload` | ADA |
| `publishPayroll` | ADA |
| `reviewIzinTelat` | GAP |
| `submitAbsensiCamera` | ADA |
| `submitIzin` | ADA |
| `submitKPILaporan` | ADA |
| `tandaiDibaca` | ADA |
| `tandaiMenuDibaca` | ADA |
| `tolakRegistrasi` | GAP |
| `triggerNotifPeraturan` | ADA |
| `updateAbsensiMatrixDay` | ADA |
| `updateEmail` | ADA |
| `updatePayrollAdjustment` | ADA |
| `updateSalaryUsersBatch` | ADA |
| `updateUserSalary` | ADA |
| `validateLogin` | ADA |

Dispatcher juga memiliki aksi yang dapat dipanggil secara dinamis atau tidak tampak pada pencarian literal, termasuk `getAbsensiMatrix`, `getAbsensiMatrixUser`, `getUserProfile`, `getNotifCountByMenu`, `getSPHistory`, `hitungBintang`, `notifPeraturanBaru`, dan endpoint debug. Audit runtime/network tetap wajib; tabel ini bukan pengganti contract test.

Untuk setiap aksi, implementasi Supabase harus mencatat:

- role yang boleh menjalankan;
- input dan validasi;
- bentuk response sukses/error;
- tabel yang dibaca/ditulis;
- side effect notifikasi/email/Drive/audit;
- aturan idempotency dan transaksi;
- fixture serta test parity.
