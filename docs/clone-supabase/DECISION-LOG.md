# Decision Log

Catat keputusan yang mengubah atau memperjelas perilaku aplikasi lama.

| Tanggal | Area | Konflik/pertanyaan | Keputusan Ko | Dampak implementasi |
|---|---|---|---|---|
| 2026-10-05 | SP/bintang | Pesan SP2/SP3 menyebut cap bintang, tetapi fungsi skor aktif terutama memasang gate dari `absenMurni`. Tentukan apakah cap berdasarkan SP juga wajib. | Belum diputuskan | Jangan mengubah hasil lama sebelum golden test dan keputusan Ko. |
| 2026-10-05 | Payroll historis | Kode memakai snapshot publish, tetapi tampilan slip juga dapat menerapkan setting kerajinan efektif terbaru. | Pertahankan hasil UI saat ini; rancang koreksi yang bisa diaudit. | Uji khusus agar bonus tidak ganda dengan adjustment. |
| 2026-10-05 | Endpoint lama | Ada 9 panggilan frontend tanpa case dispatcher aktif. | Telusuri arsip/UI dan pulihkan semua alur. | Jangan menghapus menu hanya karena endpoint GAS hilang. |
