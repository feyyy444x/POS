# ChillPos — Soft Motion Premium
## Blueprint Rebranding & Redesign Menyeluruh

**Status:** Arah desain disetujui; implementasi dan pemeriksaan per modul berlangsung di PR #22.  
**Repositori:** `feyyy444x/POS`  
**Branch kerja:** `nexapos/consolidated-pr-22` (nama branch teknis dipertahankan agar PR yang berjalan tidak terputus).  
**Batas rilis:** tidak merge ke main, tidak menjalankan migrasi produksi, dan tidak deploy domain publik tanpa persetujuan eksplisit.

## 1. Identitas merek

- Nama produk dan seluruh brand publik: **ChillPos**.
- Tidak boleh ada nama brand lama pada logo, teks, title, metadata, halaman, navigasi, notifikasi, email, struk, demo, atau materi publik.
- Nama modul lama untuk pusat Owner diganti menjadi **Pusat Kendali**; tidak ada identitas merek lama yang dipertahankan di UI.
- Asisten dukungan bernama **Joeclyn**.
- Arah tagline sementara: **Business Operations**. Tagline pemasaran final dapat disepakati terpisah.
- Palet: Warm Ivory `#F2F0E9`, Soft Stone `#E4E1D8`, Muted Sage `#AAB5A7`, Dusty Olive `#858F7D`, Soft Charcoal `#424943`, Cloud White `#FAFAF7`.
- Tipografi: Plus Jakarta Sans untuk heading dan Inter/system sans-serif untuk isi bila font eksternal tidak tersedia.
- Dilarang: light neon, cyberpunk, glow agresif, warna menyilaukan, rainbow gradient, dekorasi yang mengganggu tugas operasional.

## 2. Prinsip visual dan motion

1. Soft Motion Premium: visual hangat, rapi, lapang, modern, dan berkarakter; bukan template dashboard generik.
2. Setiap halaman mempunyai komposisi sesuai tugas, tetapi menggunakan token warna, tipografi, spacing, radius, elevation, ikon, dan status yang konsisten.
3. Motion harus menjelaskan konteks, hierarki, progres, dan feedback; bukan animasi tanpa tujuan.
4. Gunakan scroll reveal, stagger ringan, parallax terbatas, hover lift, transisi halaman, skeleton/loading, counter animation, dan showcase bergerak hanya bila membantu pemahaman.
5. Animasi tidak boleh menahan input kasir, checkout, barcode, pencarian, pembayaran, atau cetak struk.
6. Semua interaksi dapat digunakan dengan keyboard dan layar sentuh; tidak ada aksi hover-only.
7. Hormati `prefers-reduced-motion`, GPU lemah, jaringan lambat, dan tab yang tidak aktif. Sediakan fallback tanpa WebGL/3D.
8. Visual 3D/floating adalah lapisan presentasi; tombol, form, data, dan kontrol tetap elemen aplikasi yang sesungguhnya.
9. Data harga, stok, transaksi, status, dan izin harus tetap jelas dan tidak ditutupi efek visual.
10. Tidak menggunakan emoji sebagai ikon antarmuka.

## 3. Inventaris halaman publik

- Homepage: hero visual bergerak, pengenalan produk, showcase fitur/modul, cara kerja, Pusat Kendali, Single Workspace, manfaat operasional, paket, promo, FAQ, kanal bantuan.
- Halaman paket dan aktivasi: harga dan durasi dari backend, penawaran yang benar-benar aktif, validasi kuota, kode aktivasi.
- Paket Khusus: konsultasi tanpa harga atau kuota publik; kuota ditentukan Admin saat aktivasi.
- Login dan undangan: satu kanvas, validasi, loading, error, status akun, reset/pemulihan sesuai alur yang tersedia.
- Demo publik: data simulasi lokal, tidak menulis data palsu ke database produksi.
- Self Order publik: katalog, detail, keranjang, instruksi QRIS, unggah bukti, status pesanan.
- Layar antrean: hanya nama, nomor antrean, dan loket/kasir; tanpa TV media, video, playlist, atau template lama.

## 4. Panel platform

### Super Admin dan Admin ChillPos
- Dashboard ringkasan platform.
- Manajemen tenant dan detail tenant.
- Aktivasi perusahaan, durasi, paket, harga, kuota, dan status.
- Promo dan voucher.
- Tim platform dan hak akses.
- Akun nonaktif dan pemulihan.
- Audit log platform.
- Pusat bantuan dan inbox.
- Semua aksi memiliki target, konfirmasi, loading, sukses, dan error yang jelas.

## 5. Pusat Kendali Owner

- Dashboard perusahaan.
- Profil dan identitas perusahaan.
- Direktori tenant dan pencarian.
- Pembuatan tenant sesuai kuota.
- Perpindahan workspace.
- Tim dan hak akses.
- Monitoring aktivitas.
- Laporan gabungan.
- Paket dan aktivasi.
- Audit Perusahaan.
- Profil dan keamanan akun.
- Status kedaluwarsa/suspend tetap mengizinkan pembacaan sesuai aturan, tetapi semua mutasi harus diblokir di backend.

## 6. Single Workspace

- Owner masuk langsung ke satu workspace POS mandiri.
- Tidak menampilkan direktori Perusahaan atau manajemen multi-tenant yang tidak relevan.
- Tetap memiliki seluruh fitur operasional sesuai izin.
- Jalur aktivasi dan masa aktif tersendiri dipertahankan.

## 7. Workspace operasional

Setiap modul berikut harus ditinjau dan didesain, bukan hanya halaman dashboard:

- Dashboard workspace.
- POS/kasir, keranjang, diskon, metode pembayaran, checkout.
- Produk, kategori, SKU/barcode, harga, foto, dan status aktif.
- Stok/inventaris dan riwayat perubahan stok.
- Transaksi, detail transaksi, pencarian, filter, pagination, ekspor.
- Struk dan pengaturan cetak.
- Pelanggan dan pemasok.
- Laporan penjualan, produk, stok, dan ringkasan.
- Tim, undangan, peran, hak akses, akun, PIN, dan sesi.
- Shift kasir, buka/tutup shift, saldo awal, dan rekonsiliasi.
- Antrean, pemanggilan, loket, dan layar publik.
- Self Order, daftar pesanan, pemeriksaan bukti pembayaran, persetujuan kasir.
- Pengaturan toko, profil, keamanan, preferensi, dan audit.
- Pusat bantuan dan percakapan Joeclyn/Admin.

## 8. Checklist komponen terkecil

Untuk setiap halaman dan modul, audit:
- Header, breadcrumb, sidebar, navigasi mobile, tab, subnav, footer.
- Tombol utama/sekunder/ikon, tautan, aksi massal, menu konteks.
- Form, label, placeholder, helper text, validasi, upload, input angka/tanggal.
- Modal, drawer, popover, dropdown, tooltip, toast, banner, dialog konfirmasi.
- Tabel, kolom, wrapping, sticky header, sort, filter, pencarian, pagination, empty state.
- Kartu, badge, status, indikator realtime, skeleton, loading, error, success.
- Grafik, legenda, tooltip, rentang tanggal, ekspor.
- Focus, hover, active, disabled, loading, pressed, selected, error, success.
- Tampilan portrait/landscape dan keyboard virtual pada perangkat mobile.

## 9. Responsivitas dan QA

Target uji: 360, 390, 430, 768, 1024, 1280, 1440, dan 1920 piksel.
- Tidak boleh ada horizontal overflow yang tidak disengaja.
- Teks tidak terpotong, tombol tidak bertumpuk, tabel memiliki strategi responsif.
- Modal dan dropdown tidak keluar viewport.
- Area sentuh nyaman, fokus keyboard terlihat, kontras teks memadai.
- Uji Safari iOS, Chrome Android, dan browser desktop.
- Uji reduced motion dan kondisi jaringan/perangkat terbatas.

## 10. Batas backend dan data

- Pertahankan Supabase produksi yang sudah ada, seluruh akun, tenant, transaksi, stok, histori, storage, RLS, RPC, dan Realtime.
- Tidak membuat ulang database atau menghapus data.
- Tidak mengganti key role, tabel, kolom, RPC, storage bucket, atau identifier teknis hanya demi kosmetik.
- Checkout, idempotency, stok, shift, aktivasi, kuota, status, dan tenant isolation harus tetap berjalan.
- Semua aksi sensitif divalidasi di backend; menyembunyikan tombol di UI bukan pengamanan.
- Tidak membuat data palsu untuk mengisi halaman produksi.

## 11. Strategi implementasi dan gerbang rilis

1. Audit inventaris halaman, komponen, aset, dan referensi brand lama.
2. Tetapkan token dan komponen bersama.
3. Terapkan identitas ChillPos ke homepage, login, panel platform, Pusat Kendali, dan workspace.
4. Redesain tiap modul sesuai tugasnya dan audit semua state komponen.
5. Jalankan build, tes statis, security smoke, dan Deploy Preview pada PR #22.
6. Lakukan visual QA desktop/tablet/mobile serta authenticated E2E semua role.
7. Periksa backend dan migrasi tanpa menjalankan migrasi produksi baru.
8. Minta persetujuan sebelum merge atau deployment produksi.

**Catatan kompatibilitas:** nama branch, nama repository, domain lama, app identifier native, key database, dan storage key yang sudah dipakai pengguna dapat dipertahankan sebagai identifier teknis sementara. Identifier tersebut bukan branding UI dan tidak boleh diubah tanpa rencana migrasi yang menjaga instalasi, sesi, data, dan tautan yang sudah berjalan.
