# acoPos — Cinematic Product Storytelling × Digital Gallery × Digital Showroom

**Status:** Blueprint homepage disetujui dan implementasi visual sedang dikerjakan pada PR #22.  
**Repositori:** `feyyy444x/POS`  
**Branch:** `acoPos/consolidated-pr-22`  
**Ruang lingkup:** Homepage publik saja. Halaman login, registrasi, panel platform, Pusat Kendali, dan workspace tidak termasuk redesign visual ini.

## Arah visual

- Dominasi: hybrid cinematic storytelling + digital gallery + interactive showroom.
- Motion: balanced; gerakan membantu pemahaman dan tidak menghambat interaksi.
- Product showcase: hybrid — elemen UI representatif, komposisi spatial/3D ringan, dan demo visual yang diberi label.
- Palet: Warm Ivory `#F4F0E8`, Deep Navy `#142936`, Warm Sand `#D9CBB8`, Soft White `#FFFFFF`, Charcoal `#20272B`, Muted Teal `#6F9990`.
- Headline editorial, layout asimetris, panel produk berlapis, transisi antar-adegan.
- Tidak menggunakan light neon, cyberpunk, glow agresif, atau efek berlebihan.
- Tidak menambah dependency animasi/3D tanpa kebutuhan.

## Struktur 16 bagian

1. Navigation / The Entrance — navigasi ringkas, login, pendaftaran.
2. The Opening Scene — headline utama, CTA, hero visual produk.
3. The Cinematic Product Reveal — showcase antarmuka dashboard.
4. The Moving Statement — pernyataan nilai produk dengan ritme editorial.
5. The Digital Product Gallery — koleksi fitur dan modul acoPos.
6. The POS Experience — pratinjau kasir dan alur transaksi.
7. The Inventory Gallery — katalog, kategori, stok, dan riwayat inventaris.
8. The Self Order Experience — pratinjau pemesanan mandiri.
9. The Data Dimension — laporan dan ringkasan operasional.
10. The Human & Workspace Experience — peran, akun tim, dan workspace.
11. The Connected Workflow — alur persiapan toko hingga laporan.
12. The Experience Gallery — tab demonstrasi dan cuplikan pengalaman fitur.
13. The Pricing Exhibition — paket, durasi, promo, harga, dan kuota.
14. Trust & FAQ — jawaban dan informasi bantuan yang akurat.
15. The Final Invitation — CTA pendaftaran dan login.
16. Footer / The Closing Frame — navigasi dan kanal bantuan.

Promo yang sedang aktif boleh ditampilkan sebagai spotlight di dalam alur pricing; konten dan syaratnya harus tetap bersumber dari konfigurasi aktual.

## Data dan fungsi yang wajib dipertahankan

- Harga, durasi, kuota, paket, dan promo harus tetap berasal dari Supabase/configuration dan server quote RPC yang sudah ada.
- Tidak boleh mengarang harga, kuota, status promo, atau klaim performa.
- Workspace Only tetap mengikuti konfigurasi paket yang berlaku.
- Paket Khusus tidak boleh menampilkan harga atau kuota publik.
- Login, pendaftaran, link, CTA, kanal bantuan, dan seluruh navigasi harus menuju tujuan yang benar.
- Showcase demo harus jelas diberi label sebagai ilustrasi; tidak membuat transaksi, mengurangi stok, mengirim Self Order, atau mengunggah bukti pembayaran sungguhan.
- Tidak mengubah schema, migration, RLS, RPC, Realtime, Storage, autentikasi, atau data produksi untuk kebutuhan visual.

## Motion, accessibility, dan responsivitas

- Scroll reveal dan transisi lembut; hindari parallax berlebihan.
- UI floating dan perspektif hanya pada showcase, bukan pada kontrol transaksi nyata.
- Semua aksi dapat dijalankan dengan keyboard dan sentuhan; tidak ada hover-only.
- Hormati `prefers-reduced-motion`.
- Desktop, tablet, dan mobile harus menggunakan layout yang disusun ulang; mobile tidak boleh memiliki horizontal overflow.
- Tipografi, tabel, panel, dan tombol tetap terbaca pada viewport sempit.
- Efek visual tidak boleh menutupi teks, CTA, harga, atau informasi penting.

## Acceptance checklist

- [ ] Semua bagian homepage tampil dan berurutan.
- [ ] Hero, galeri, showcase, dan CTA memiliki hierarki visual jelas.
- [ ] Harga, paket, durasi, promo, dan quote server tetap berfungsi.
- [ ] Login dan registrasi tetap bekerja.
- [ ] Demo tidak menulis data operasional.
- [ ] Tidak ada neon/cyberpunk/glow agresif.
- [ ] Desktop/tablet/mobile lolos pemeriksaan layout.
- [ ] Reduced motion menyediakan tampilan yang tetap utuh.
- [ ] Build dan static tests lolos.
- [ ] Deploy Preview diuji sebelum persetujuan rilis.
- [ ] Tidak ada merge ke main, migrasi produksi, atau deployment domain publik tanpa persetujuan terpisah.
