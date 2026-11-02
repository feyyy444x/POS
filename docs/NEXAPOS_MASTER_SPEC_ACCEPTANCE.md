# NexaPos — Master Specification & Release Acceptance

Dokumen ini menjadi sumber status pekerjaan NexaPos. Status kode, status migrasi produksi, preview, dan uji operasional dicatat terpisah agar fitur yang baru ada di kode tidak keliru disebut sudah aktif untuk pelanggan.

## Lingkungan yang digunakan

- Repository: `feyyy444x/POS`
- Jalur pekerjaan: PR #22 — `nexapos/consolidated-pr-22`
- Netlify site: `posfeyyy`
- Domain publik: https://nexaposdigital.my.id
- Supabase produksi: `zoplanjzcizvjhorsldm`
- Aturan: tidak membuat PR baru, tidak merge ke `main`, tidak deploy ke produksi, dan tidak menjalankan migrasi destruktif ke produksi tanpa review serta persetujuan yang sesuai.

## Status verifikasi terkini — 2 November 2026

- Riwayat migrasi Supabase produksi: **103 versi**.
- File migrasi pada branch PR #22: **103 versi**.
- Rekonsiliasi versi: **103/103 cocok**; tidak ada file migrasi branch yang tertinggal dan tidak ada versi produksi tanpa file sumber pada branch.
- Pemeriksaan tabel publik: seluruh tabel publik yang diperiksa memiliki RLS aktif.
- Struktur antrean: tabel media lama tidak ada; kolom template/media lama tidak ada; bucket Storage `tv-media` masih ada tetapi kosong (0 objek).
- Deploy Preview terakhir yang diverifikasi: commit `53f7e634bd52302a1fa7fd39b8d7dfd12a5b2f53`, status Netlify `ready`.
- GitHub CI dan security smoke pada commit tersebut lulus: build frontend, 102/102 tes statis, 6/6 preview smoke checks, dan pemeriksaan Capacitor CLI.
- Dependency audit pada instalasi dan `npm audit --audit-level=moderate`: **0 vulnerabilities**. Resolusi dependensi terverifikasi: Capacitor CLI `7.6.10`, glob `14.0.3`, minimatch `11.0.4`.
- Belum ada merge atau deployment produksi dari pekerjaan ini.

## 1. Identitas produk dan model workspace

**Status: Implemented in branch; authenticated E2E pending.**

- NexaSpace adalah pusat kendali Owner untuk model multi-tenant.
- Owner NexaSpace mengelola perusahaan dan tenant; data serta stok antar-tenant tetap terisolasi.
- Single Workspace adalah model terpisah: satu Owner langsung masuk ke satu workspace POS, tanpa NexaSpace dan tanpa organisasi induk.
- Single Workspace sudah memiliki alur registrasi, aktivasi, perpanjangan, dan routing tersendiri.
- Konfigurasi produksi saat pemeriksaan: paket `single_workspace` masih nonaktif di `site_activation_packages`. Harga seed tersedia, tetapi paket tidak ditampilkan di homepage sebelum Admin mengaktifkannya. Jangan mengaktifkan penawaran publik sebelum harga dan teks penawarannya disetujui.
- Paket Khusus ditampilkan sebagai penawaran konsultasi tanpa harga/kuota publik. Aktivasi internal memakai key `special` dan kuota ditentukan Super Admin.

## 2. Homepage dan identitas visual

**Status: Implemented in branch; visual regression desktop/tablet/mobile pending.**

- Arah visual terbaru: NEXA / ARCHITECTURE (Digital Architecture × Nexa Control × Kinetic Dimension), identitas Navy–Teal, halaman dengan komposisi dan karakter berbeda; redesign struktural, bukan CSS facelift atau template AI. Login wajib satu kanvas non-split dan dimulai dari nol.
- Blueprint: `docs/NEXA_ARCHITECTURE_DESIGN_BLUEPRINT.md`.
- Sistem gerak mencakup scroll reveal, parallax, cursor aura, magnetic controls, transition, kinetic typography, liquid motion, dan tilt 3D ringan.
- Login, homepage, NexaSpace, Admin, dan workspace memakai fondasi visual yang konsisten tanpa menyamakan semua layout.
- Homepage memuat penjelasan fitur, model NexaSpace dan Single Workspace, paket reguler, Paket Khusus, promo, FAQ, serta kanal WhatsApp/Telegram sesuai konfigurasi.
- Homepage hanya menampilkan durasi standar 3/7/30/365 hari; durasi Custom tetap untuk pengaturan Admin dan tidak menjadi opsi publik.
- Seluruh animasi wajib menghormati `prefers-reduced-motion`, perangkat sentuh, dan ukuran layar kecil.

## 3. Paket, harga, durasi, promosi, dan aktivasi

**Status: Implemented in branch and production schema; business configuration review pending.**

- Paket reguler: Starter, Growth, Business, Enterprise.
- Paket Khusus: konsultasi; tidak menampilkan harga atau kuota tenant di homepage.
- Durasi produksi: Harian 3 hari, Mingguan 7 hari, Bulanan 30 hari, Tahunan 365 hari, serta Custom yang diisi Admin.
- Harga per durasi disimpan di database dan dipakai homepage; jangan mengandalkan nilai fallback saat tabel belum tersedia.
- Form aktivasi perusahaan mendukung pemilihan paket atau kuota Custom, termasuk Paket Khusus.
- Validasi aktivasi, kuota, masa berlaku, promo, dan voucher dilakukan di backend.
- Single Workspace mempunyai pengaturan harga dan status aktif terpisah dari paket NexaSpace.

## 4. Super Admin dan Admin NexaPos

**Status: Implemented in branch; authenticated E2E pending.**

- Super Admin dan Admin NexaPos memiliki panel dan kewenangan platform sesuai spesifikasi.
- Tidak ada role Customer Service platform.
- Admin mengelola paket, durasi, promo, tenant, aktivasi, pengguna, dan dukungan.
- Aksi sensitif harus memeriksa hak akses di backend; UI yang menyembunyikan tombol bukan pengganti RLS/RPC authorization.
- Setiap tombol aksi harus memiliki tujuan dan konfirmasi yang jelas.

## 5. Owner dan NexaSpace

**Status: Implemented in branch; authenticated E2E pending.**

- Owner NexaSpace dapat melihat organisasi, kuota, masa sewa, tenant, laporan gabungan, audit, serta pengaturan organisasi.
- Owner dapat membuat tenant sesuai kuota dan berpindah ke tenant yang dimiliki.
- Tenant yang nonaktif/kedaluwarsa tidak boleh menjalankan operasi POS, tetapi Owner tetap dapat membuka NexaSpace untuk melihat status dan mengelola tenant sesuai izin.
- Penghapusan tenant dan organisasi memiliki cakupan data yang berbeda dan harus selalu memakai konfirmasi permanen.
- Single Workspace tidak boleh otomatis terhubung ke `owner_organizations`.

## 6. Tim, peran, dan akun

**Status: Implemented in branch; authenticated E2E pending.**

- Label peran tenant yang terlihat: Owner, Manager, Karyawan.
- Key kompatibilitas database lama dapat tetap memakai `admin` untuk Manager dan `cashier` untuk Karyawan; jangan mengganti key tanpa migrasi dan audit seluruh RPC/policy.
- Manajemen anggota mencakup undangan, edit, aktif/nonaktif, reset PIN/password, dan penghapusan.
- Password minimum 6 karakter.
- Histori kasir harus tetap mempertahankan identitas pelaku setelah akun dihapus.
- Owner Single Workspace tidak memerlukan keanggotaan tenant tambahan.

## 7. POS, multi-kasir, stok, transaksi, dan struk

**Status: Implemented in branch; authenticated concurrency E2E pending.**

- Beberapa kasir dapat bekerja bersamaan dengan identitas transaksi masing-masing.
- Checkout backend mengagregasi item berulang, mengunci stok tenant, dan memakai idempotency key.
- Stok tenant tidak dapat dipindahkan antar-tenant.
- Struk menampilkan informasi transaksi dan hanya menampilkan nomor antrean jika tiket benar-benar dibuat.
- Wajib diuji dengan dua atau lebih akun kasir pada tenant yang sama, termasuk transaksi bersamaan dan kegagalan jaringan.

## 8. Antrean operasional

**Status: Implemented in branch and production schema.**

- Antrean dapat diaktifkan/nonaktifkan.
- Layar antrean hanya menampilkan nomor antrean, nama pelanggan, dan konter/kasir/loket.
- Media, video, playlist, dan template layar sudah dikeluarkan dari UI dan skema media lama.
- Tabel `store_tv_media` sudah tidak ada; kolom template/media lama pada `store_tv_settings` sudah tidak ada.
- Bucket Storage `tv-media` kosong dan masih tersisa; penghapusan bucket harus melalui Storage API. Tidak ada objek media yang ditemukan saat pemeriksaan.

## 9. Self-Service Ordering

**Status: Implemented in branch and production migrations; authenticated E2E pending.**

- Katalog publik hanya menampilkan produk aktif yang tersedia.
- Pesanan mandiri memvalidasi toko, ketersediaan, stok, dan batas input di backend.
- Bukti pembayaran memakai bucket privat, batas ukuran dan MIME, serta policy upload berbasis order yang masih menunggu pembayaran.
- Verifikasi pembayaran dan perubahan status pesanan hanya boleh dilakukan oleh anggota tenant yang berwenang dan memenuhi syarat operasional/shift.

## 10. NexaBot dan dukungan

**Status: Implemented in branch and production migrations; authenticated E2E pending.**

- Nama bot yang terlihat adalah NexaBot, bukan label generik AI.
- Basis pengetahuan berfokus pada penggunaan NexaPos.
- Handoff diarahkan ke Admin NexaPos.
- Indikator mengetik tersedia untuk NexaBot dan Admin.
- Homepage tidak menampilkan live chat guest; kanal publik adalah WhatsApp dan Telegram sesuai konfigurasi.

## 11. Audit log

**Status: Implemented in branch and production migrations; scope verification pending.**

- Audit platform dan organisasi memiliki pembatasan scope.
- Owner hanya boleh melihat audit organisasi/tenant miliknya.
- Super Admin dapat melihat audit platform.
- Uji direct API diperlukan untuk memastikan tidak ada akses silang organisasi.

## 12. Realtime dan navigasi

**Status: Implemented in branch; authenticated E2E pending.**

- Realtime digunakan untuk pembaruan data yang relevan.
- Pergantian aplikasi/tab tidak boleh memaksa reload seluruh workspace.
- Navigasi browser Back/Forward dan tombol kembali harus mempertahankan konteks yang aman.
- Refresh manual tetap tersedia; status koneksi harus memberi informasi yang jelas.
- Draft lokal tidak boleh menyimpan rahasia, token, PIN, atau data sensitif.

## 13. Database, migrasi, dan RLS

**Status: Production migration history reconciled; policy behavior review ongoing.**

- Pada pemeriksaan 2 November 2026, 103/103 versi migrasi produksi cocok dengan file di branch PR #22.
- Jangan mengulang migrasi yang sudah tercatat.
- Semua tabel publik yang diperiksa memiliki RLS aktif.
- Peringatan beberapa policy SELECT yang permissive perlu dibaca berdasarkan ekspresi scope-nya: beberapa policy memang menggabungkan akses anggota tenant, Owner organisasi, dan Super Admin. Jangan menghapus policy secara massal karena dapat memutus akses Owner atau laporan.
- 18 indeks ditandai belum terpakai; jangan menghapus sebelum memeriksa query workload dan kebutuhan operasional.
- Setiap perubahan DDL baru harus menjadi file migrasi baru di PR #22 dan melewati review sebelum diterapkan ke produksi.

## 14. Keamanan fungsi database dan autentikasi

**Status: Review ongoing; no blanket privilege revocation.**

- Fungsi `SECURITY DEFINER` yang terekspos menggunakan `search_path` kosong pada pemeriksaan saat ini.
- 54 fungsi yang dapat dipanggil oleh role authenticated mencakup RPC operasional yang memang digunakan aplikasi; masing-masing tetap perlu diuji guard autentikasi, PIN, role, tenant, dan status operasionalnya.
- Empat fungsi anon yang terdeteksi adalah endpoint publik untuk Self Order, unggah bukti pembayaran, katalog, dan layar antrean. Akses publik tersebut harus tetap dibatasi pada data/aksi yang memang dibutuhkan pengunjung.
- Supabase Auth masih melaporkan Leaked Password Protection belum aktif. Pengaturan ini berada di konfigurasi Auth Dashboard dan belum dapat diubah melalui konektor yang tersedia.
- Dependency audit terakhir menemukan empat temuan moderate pada rantai `glob`/`minimatch`. Override ke versi patched dan CI gate `npm audit --audit-level=moderate` telah ditambahkan; hasil CI terbaru wajib lulus sebelum release.

## 15. Performa, responsivitas, dan aksesibilitas

**Status: Implemented in branch; device QA pending.**

- Halaman sekunder dan modul berat memakai lazy loading/code splitting.
- Build terakhir sebelum dependency hardening menghasilkan main chunk sekitar 250 KB (gzip sekitar 62 KB), React vendor sekitar 186 KB (gzip sekitar 59 KB), dan Supabase vendor sekitar 139 KB (gzip sekitar 38 KB).
- Tabel, modal, kartu, form, dan navigasi harus diuji pada desktop, tablet, dan HP.
- Semua animasi harus tetap ringan, tidak menghalangi input/tombol, dan menghormati reduced motion.
- Uji perangkat nyata tetap diperlukan untuk Safari iOS, Chrome Android, dan browser desktop.

## 16. Release gates dan keputusan rilis

**Status: NOT READY FOR PRODUCTION RELEASE.**

Sebelum merge/deploy produksi, seluruh hal berikut wajib selesai:

1. CI terbaru setelah dependency overrides lulus, termasuk audit moderate, Capacitor CLI smoke, build, tes statis, dan preview smoke.
2. Deploy Preview harus cocok dengan head PR #22 terbaru.
3. Login dan routing Super Admin, Admin, Owner NexaSpace, Single Workspace, Manager, dan Karyawan diuji dengan akun yang sah.
4. Uji RLS langsung lintas dua organisasi/tenant untuk produk, stok, transaksi, anggota, laporan, audit, antrean, dan realtime.
5. Uji dua atau lebih kasir bersamaan, stok, idempotency, struk, shift, dan antrean on/off.
6. Uji aktivasi, perpanjangan, masa kedaluwarsa, kuota, Paket Khusus, Single Workspace, promo, dan voucher.
7. Uji penghapusan akun/tenant/organisasi dengan data historis dan konfirmasi.
8. Uji tampilan serta interaksi di desktop, tablet, dan HP.
9. Aktifkan Leaked Password Protection pada Supabase Auth.
10. Review akhir security advisor dan dependency audit.

**Tidak ada merge ke `main`, migrasi produksi tambahan, atau deployment domain publik dari pekerjaan ini sampai release gates terpenuhi dan pengguna memberi persetujuan.**
