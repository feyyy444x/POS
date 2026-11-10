# acoPos — Hybrid Spatial + Editorial Homepage

**Status:** Arah desain disetujui; implementasi homepage dikerjakan pada branch acopos/rebrand-preview.
**Repositori:** feyyy444x/POS
**Ruang lingkup:** Homepage publik acoPos. Login, registrasi, dashboard, Pusat Kendali, dan workspace mempertahankan alur serta fungsinya.

## Arah visual

- Konsep: **Hybrid Spatial + Editorial** dengan komposisi modular dan storytelling produk.
- Intensitas motion: **Balanced** — gerakan membantu pemahaman tanpa mengganggu interaksi.
- Palet: silver metal, graphite, charcoal, dan dark soft; highlight silver lembut, bukan neon.
- Hero memakai objek 3D metalik berbasis CSS, orbit tipis, node modul, dan parallax ringan.
- Feature Explorer interaktif, showcase antarmuka, dan transisi scroll yang halus.
- Tipografi editorial, layout modular, panel dengan kedalaman visual, dan ruang negatif yang cukup.
- Tidak menggunakan template SaaS generik, neon, cyberpunk, atau glow agresif.
- Tidak menambah dependency 3D/animasi eksternal; gunakan CSS dan React yang sudah tersedia.

## Struktur 17 bagian

1. Navigation & Header — identitas acoPos, navigasi, login workspace, dan CTA.
2. Hero — pengenalan utama acoPos dan ajakan menjelajahi platform.
3. Introduction — visi produk dan masalah operasional yang dibantu.
4. Interactive 3D Experience — objek metalik, orbit, dan node ekosistem.
5. Business Ecosystem — gambaran modul operasional acoPos.
6. Feature Explorer — tab interaktif untuk POS, inventaris, laporan/HPP, QR Menu, dan tim.
7. How acoPos Works — perjalanan aktivasi, persiapan workspace, operasional, dan pemantauan.
8. Business Intelligence — ringkasan penjualan, transaksi, dan informasi biaya.
9. Multiple Devices — pengalaman desktop, tablet, dan smartphone.
10. Security & Access Control — pengelolaan akun, peran, dan ruang lingkup akses.
11. Control Center & Workspace — penjelasan pengelolaan perusahaan dan workspace.
12. Activation Packages — paket, masa aktif, kuota, promo, dan Paket Khusus.
13. Why Choose acoPos — manfaat dan pendekatan produk.
14. Help & Support Center — FAQ dan kanal bantuan resmi yang aktif.
15. Frequently Asked Questions — jawaban penggunaan dan aktivasi.
16. Final Call to Action — jalur pendaftaran dan login.
17. Footer — informasi platform, navigasi, dan kanal dukungan.

## Data dan fungsi yang wajib dipertahankan

- Harga, durasi, kuota, paket, promo, dan server quote tetap berasal dari Supabase/configuration serta RPC yang sudah ada.
- Tidak boleh mengarang harga, kuota, status promo, atau klaim performa.
- Workspace Only tetap mengikuti konfigurasi paket yang berlaku.
- Paket Khusus tidak menampilkan harga atau kuota publik.
- Login, pendaftaran, CTA, kanal bantuan, dan navigasi tetap menuju tujuan yang benar.
- **QR Menu & Self Ordering** menggunakan QR Code toko, katalog tersinkronisasi, unggah bukti pembayaran, persetujuan kasir, lalu pemrosesan pesanan.
- Showcase demo diberi label ilustratif; tidak membuat transaksi, mengurangi stok, mengirim pesanan, atau mengunggah bukti pembayaran sungguhan.
- Tidak mengubah schema, migration, RLS, RPC, Realtime, Storage, autentikasi, atau data produksi untuk kebutuhan visual.

## Motion, accessibility, dan responsivitas

- Scroll reveal, orbit, hover, parallax ringan, dan transisi lembut.
- Semua aksi dapat dijalankan dengan keyboard dan sentuhan; tidak ada hover-only.
- Hormati prefers-reduced-motion.
- Desktop, tablet, dan mobile menggunakan layout yang disusun ulang; tidak boleh ada horizontal overflow.
- Tipografi, panel, tombol, dan informasi harga tetap terbaca pada viewport sempit.
- Efek visual tidak menutupi teks, CTA, harga, atau informasi penting.

## Acceptance checklist

- [ ] Seluruh 17 bagian homepage tampil dan terhubung.
- [ ] Hero dan objek 3D silver berjalan dengan motion balanced.
- [ ] Feature Explorer dan FAQ interaktif.
- [ ] QR Menu & Self Ordering memakai penamaan dan alur yang benar.
- [ ] Harga, paket, durasi, promo, dan quote server tetap berfungsi.
- [ ] Login dan pendaftaran tetap bekerja.
- [ ] Showcase tidak menulis data operasional.
- [ ] Desktop, tablet, dan mobile lolos pemeriksaan layout.
- [ ] Reduced motion menyediakan tampilan yang tetap utuh.
- [ ] Build dan static tests lolos.
- [ ] Preview diuji sebelum persetujuan rilis.
- [ ] Tidak ada perubahan database produksi atau deployment produksi tanpa persetujuan terpisah.
