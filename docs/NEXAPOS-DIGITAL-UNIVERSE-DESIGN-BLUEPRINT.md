# NEXAPOS — ARCHITECTURAL FUTURE
## Master Design Specification: Full Website, Product UI, Motion & Homepage Content

**Status:** Arah desain final disetujui pengguna — implementasi berlangsung di PR #22  
**Branch:** `nexapos/consolidated-pr-22`  
**Scope:** Homepage publik, autentikasi, Super Admin, Admin NexaPos, NexaSpace, Owner, Single Workspace, seluruh workspace tenant, POS, inventaris, laporan, antrean, Self Order, dukungan, dan seluruh komponen bersama.

---

## 1. Keputusan art direction

NexaPos menggunakan identitas **ARCHITECTURAL FUTURE**: sebuah lingkungan digital bisnis yang dibangun dengan prinsip arsitektur, presisi, kedalaman ruang, dan gerak sinematik.

Ini bukan template dashboard POS yang diganti warna, bukan halaman homepage dengan hero 3D sementara halaman lain dibiarkan lama, dan bukan sekadar penambahan glow atau animasi dekoratif.

### Komposisi gaya
1. **Architectural Interface — fondasi:** grid, struktur geometris, asimetri, ruang kosong, proporsi, dan komposisi editorial.
2. **Cinematic Digital — atmosfer:** perspektif, pencahayaan, kedalaman, gerakan kamera, serta transisi antar-ruang.
3. **Spatial Minimalism — komponen:** panel bertingkat, permukaan modular, material matte, transparansi selektif, dan bayangan terkontrol.
4. **Industrial Digital — detail:** indikator, angka, garis ukur, instrumen, dan feedback mekanis.
5. **Swiss Precision — keterbacaan:** hierarki tipografi, konsistensi jarak, keteraturan data, dan keterbacaan tabel.

Setiap halaman mempunyai karakter dan komposisi sendiri. Design system menyatukan bahasa visual, bukan memaksa semua halaman memakai layout identik.

### Identitas warna dan material
- Deep Navy: `#071827`
- NexaPos Navy: `#102D50`
- Architectural Panel: `#102C43`
- Precision Teal: `#08B996`
- Teal Highlight: `#55E5C2`
- Mist / Light Grey: `#EDF2F4`
- White: `#FFFFFF`
- Steel Grey: `#718392`
- Material: matte architectural surface, metal detail, glass/translucent layer secara selektif, soft emissive teal.
- Dilarang memakai ungu, pink, violet, rainbow gradient, atau warna yang keluar dari identitas merek.
- Logo NexaPos dan logo tenant yang sudah ada harus tetap dihormati.

---

## 2. Prinsip pengalaman produk

1. Visual 3D memperkuat konteks, tidak menggantikan kontrol HTML/React yang sesungguhnya.
2. Gerak memiliki tujuan: menunjukkan hierarki, sebab-akibat, progres, perubahan status, dan perpindahan halaman.
3. Checkout POS, input barcode/pencarian, pembayaran, dan cetak struk harus tetap cepat.
4. Informasi harga, stok, jumlah, izin, status, dan laporan tidak boleh dikaburkan oleh efek visual.
5. Tidak boleh ada kontrol hover-only; seluruh aksi harus dapat digunakan dengan keyboard dan layar sentuh.
6. WebGL/3D merupakan progressive enhancement. Jika WebGL gagal, fungsi aplikasi tetap tersedia.
7. Hormati `prefers-reduced-motion`, tab tersembunyi, keterbatasan GPU, dan jaringan lambat.
8. Desktop mendapat komposisi spasial yang lebih kaya; tablet dan mobile mempunyai susunan dan intensitas gerak sendiri.
9. Tidak ada layout generik yang diulang pada halaman yang memiliki kebutuhan kerja berbeda.
10. Setiap tombol, menu, tab, form, modal, filter, tabel, pagination, notifikasi, dan aksi harus memiliki state normal, hover/focus, active, loading, disabled, success, dan error sesuai konteks.

---

## 3. Peta desain seluruh halaman

### A. Website publik dan akses
| Halaman | Konsep visual | Isi dan fungsi |
|---|---|---|
| Homepage | Cinematic architectural gateway, editorial story | Identitas NexaPos, sistem, model workspace, kapabilitas, operasional, paket, promo, FAQ, dukungan |
| Pilihan aktivasi | Commercial configuration stage | Durasi dan paket yang aktif, harga dinamis, kuota publik jika diizinkan, voucher dan promo |
| Paket Khusus | Consultation feature | Penawaran konsultasi tanpa harga dan kuota publik |
| Demo | Guided product walkthrough | Data simulasi; tidak boleh menulis data ke database produksi |
| Login | Single-canvas access portal | Login, status, validasi, dan pemulihan; bukan split-screen |
| Aktivasi/invitation | Progressive access sequence | Verifikasi dan status aktivasi dengan feedback yang jelas |
| Self Order publik | Customer ordering journey | Katalog, detail produk, keranjang, checkout/pesanan sesuai konfigurasi tenant |
| Layar antrean | Service stage | Nomor antrean, nama pesanan, counter/kasir/loket; tanpa media, video, atau template TV |

### B. Platform Admin dan Super Admin
| Modul | Komposisi visual |
|---|---|
| Dashboard platform | Command observatory untuk ringkasan dan status platform |
| Manajemen tenant | Registry dan directory tenant dengan filter/status |
| NexaSpace platform | Peta relasi organisasi dan tenant |
| Pusat kendali tenant | Panel inspeksi tenant, aktivasi, kuota, status dan tindakan |
| Aktivasi/durasi | Configuration instruments untuk durasi dan paket |
| Harga/paket/promo | Commercial configuration studio dengan preview |
| Tim & hak akses platform | Identity/security registry |
| Akun staf nonaktif | Status directory dengan pemulihan akun |
| Audit platform | Forensic event ledger yang dapat difilter dan ditelusuri |
| Pusat bantuan | Support operations dan eskalasi Admin |

Super Admin dan Admin NexaPos mempunyai kapabilitas sesuai aturan produk yang berlaku. Perbedaan label/role tidak boleh menciptakan tampilan atau izin yang saling bertentangan.

### C. NexaSpace dan Owner
| Modul | Komposisi visual |
|---|---|
| Dashboard NexaSpace | Organization command space |
| Profil organisasi | Identity studio untuk nama dan detail organisasi |
| Direktori tenant | Tenant constellation/list yang dapat diakses |
| Buat/kelola tenant | Provisioning sequence dengan kuota dan validasi |
| Pindah tenant | Workspace portal transition yang cepat |
| Tim dan hak akses | People/access map |
| Laporan organisasi | Multi-tenant analytics dan drill-down |
| Monitoring | Operations wall untuk aktivitas dan status |
| Audit organisasi | Event timeline dengan scope organisasi |

Owner NexaSpace dapat mengelola tenant sesuai kuota paket dan kewenangannya. Organisasi dan tenant harus tetap terisolasi. Pengelolaan stok tetap per tenant, tanpa transfer stok lintas tenant.

### D. Single Workspace
Single Workspace adalah model terpisah: Owner langsung masuk ke satu workspace POS mandiri, tanpa NexaSpace, organisasi induk, atau tenant management. Halaman dan navigasinya tidak boleh menampilkan konsep organisasi multi-tenant yang tidak relevan. Owner tetap memiliki akses penuh sesuai spesifikasi Single Workspace.

### E. Workspace tenant dan operasional
| Modul | Komposisi visual | Prioritas |
|---|---|---|
| Dashboard workspace | Spatial operational workbench | Status dan ringkasan yang berguna |
| POS / checkout | Transaction cockpit | Kecepatan, keterbacaan, input cepat |
| Produk | Product catalogue/index | Cari, filter, kategori, detail |
| Inventaris | Industrial stock ledger | Stok, penyesuaian, stok rendah |
| Laporan penjualan | Business observatory | Rentang tanggal, pencarian, grafik dan tabel |
| Modal/COGS | Financial inspection panel | Modal, margin, rincian transaksi |
| Sesi kasir | Cash control station | Buka/tutup kasir dan status sesi |
| Kehadiran/istirahat | Presence timeline | Status karyawan, break dan monitoring |
| Antrean | Live service stage | Nomor, nama pesanan, counter/kasir/loket |
| Tim & akses | Identity matrix | Manager, Karyawan, PIN/password dan izin |
| Pengaturan | System configuration studio | Pengaturan terkelompok dan preview |
| Struk | Print-focused receipt surface | Preview dan alur cetak yang sudah ada |
| Self Order | Ordering control studio | Status, QR, katalog, konfigurasi |
| Dukungan | Support workspace | NexaBot, typing indicator, handoff Admin |
| Notifikasi | Contextual alert layer | Prioritas dan aksi yang jelas |

---

## 4. Homepage: struktur konten dan product truth

Homepage harus menjelaskan produk yang benar-benar tersedia dan mengikuti spesifikasi terbaru. Homepage bukan daftar slogan pemasaran. Setiap bagian harus menjelaskan apa fungsi fitur, siapa yang menggunakannya, dan batasan pentingnya.

### Urutan section homepage
1. **Hero — Bangun alur. Kendalikan bisnis.**  
   Perkenalkan NexaPos sebagai sistem operasional yang menghubungkan POS, checkout, katalog, stok per tenant, tim, sesi kasir, antrean, Self Order, dan laporan.
2. **Sistem / Framework**  
   Jelaskan satu sistem untuk transaksi, produk, persediaan, tim, dan evaluasi operasional.
3. **Model Workspace**  
   - NexaSpace: pusat kendali Owner untuk organisasi multi-tenant, pengelolaan tenant sesuai kuota, tim, laporan, dan perpindahan workspace.
   - Single Workspace: satu workspace mandiri tanpa NexaSpace atau tenant management; penawaran hanya tampil jika Admin mengaktifkan paketnya.
4. **Urutan Operasional**  
   Transaksi → katalog dan stok → tim dan akses → laporan dan evaluasi.
5. **Kapabilitas Produk**  
   POS, multi-kasir, katalog dan inventaris, laporan dan modal, sesi kasir/kehadiran/istirahat, antrean, Self Order, tim dan izin, struk, audit aktivitas.
6. **Complete Operating Suite**  
   Penjelasan rinci stok per tenant, sesi kasir, Self Order, antrean sederhana, laporan, pengelolaan akses, audit, dan struk.
7. **Aktivasi dan sewa**  
   Durasi dan paket berdasarkan konfigurasi Admin. Paket reguler berbagi kemampuan operasional yang sama; perbedaan kuota dan harga mengikuti konfigurasi paket.
8. **Dukungan**  
   NexaBot adalah pendamping penggunaan di dalam workspace dan dapat meneruskan percakapan kepada Admin NexaPos. Dukungan publik melalui WhatsApp/Telegram hanya jika kanal tersebut aktif.
9. **FAQ**  
   Menjawab perbedaan workspace, stok tenant, multi-kasir, antrean, Self Order, masa aktivasi, Paket Khusus, keamanan akses, dan dukungan.
10. **CTA dan footer**  
    Ajakan melihat aktivasi atau masuk ke workspace, kanal kontak yang aktif, dan informasi merek.

### Ketentuan paket dan harga yang tidak boleh dilanggar
- Durasi publik reguler: 3 hari (Harian), 7 hari (Mingguan), 30 hari (Bulanan), 365 hari (Tahunan), sesuai data durasi aktif.
- Durasi Custom adalah konfigurasi Admin; jangan tampilkan sebagai pilihan durasi publik.
- Paket dan kuota tenant reguler dibaca dari konfigurasi aktif Admin; jangan mengunci jumlah kuota atau harga dengan copy statis.
- Single Workspace merupakan model produk berbeda dan hanya ditampilkan jika paketnya aktif dan harganya tersedia sesuai aturan publik.
- Paket Khusus ditampilkan sebagai konsultasi. **Jangan menampilkan harga atau kuota tenant publik.** Masa aktif dan kuota ditentukan melalui konsultasi/aktivasi oleh Admin.
- Kuota tenant dan durasi aktivasi adalah dua dimensi yang berbeda.
- Promo/voucher, periode, syarat, harga sebelum/sesudah diskon, dan kelayakan harus mengikuti data server. Jangan mengarang promo atau menjamin diskon yang belum tervalidasi.
- Aktivasi menggunakan kode yang diterbitkan Admin/Super Admin; jangan menyebut self-service subscription otomatis.
- Aktivasi bukan penagihan berulang otomatis.

### Ketentuan penjelasan fitur
- POS: pilih produk, kuantitas, keranjang, total, pembayaran, riwayat transaksi.
- Multi-kasir: beberapa akun dapat bekerja bersamaan; identitas petugas transaksi tetap tercatat.
- Inventaris: katalog, kategori, harga dan stok terpisah per tenant; tidak ada transfer stok antar-tenant.
- Laporan: penjualan, riwayat, rentang tanggal, modal/COGS dan estimasi keuntungan sesuai data yang tersedia.
- Sesi kasir/kehadiran: pembukaan dan penutupan kasir, kehadiran, monitoring istirahat sesuai modul aktif.
- Antrean: nama pesanan, nomor antrean, counter/kasir/loket; tidak ada video/media/TV template.
- Self Order: pelanggan memesan melalui perangkat sendiri; ketersediaan produk mengikuti katalog dan stok tenant serta konfigurasi tenant.
- Tim: Owner, Manager, Karyawan; akses dan tindakan mengikuti izin.
- Dukungan: NexaBot di dalam workspace; handoff hanya kepada Admin NexaPos. Kanal publik WhatsApp/Telegram mengikuti pengaturan aktif.
- Audit: jelaskan sesuai scope yang tersedia (platform, organisasi, atau tenant); jangan menjanjikan data yang tidak dicatat.

### Standar copywriting
- Gunakan bahasa Indonesia yang spesifik, ringkas, informatif, dan konsisten.
- Hindari klaim generik seperti “solusi terbaik untuk semua bisnis”, “100% otomatis”, atau “semua kebutuhan dalam satu klik”.
- Jangan menampilkan fitur sebagai tersedia bila belum terimplementasi/teruji.
- Jangan menampilkan statistik simulasi sebagai data bisnis nyata.
- Demo hanya memakai data simulasi dan tidak menulis ke database.
- Semua tombol CTA harus menuju tujuan yang benar.

---

## 5. Komponen dan micro-interaction

| Komponen | Desain dan state |
|---|---|
| Header / sidebar | Struktur navigasi berdasarkan role dan workspace |
| Tombol primer | Surface Navy/Teal, feedback tekanan singkat, loading tidak mengubah layout |
| Tombol sekunder | Neutral raised surface dan fokus yang jelas |
| Tombol destruktif | Warna bahaya yang konsisten, konfirmasi eksplisit |
| Ikon | Satu keluarga ikon, stroke dan ukuran konsisten; tanpa emoji |
| Card | Kedalaman dan komposisi sesuai konteks, bukan semua kartu seragam |
| Tabel | Ruang baca lega, header jelas, mobile overflow/stack yang disengaja |
| Form | Label, hint, validasi, focus, disabled, error dan success |
| Dropdown / tab | Panel berlapis, active state dan keyboard support |
| Modal | Fokus terjaga, ukuran responsif, tindakan utama/sekunder jelas |
| Tooltip | Kontekstual, tidak menutupi kontrol |
| Grafik | Animasi reveal tidak mengubah interpretasi angka |
| Toast / notification | Prioritas, durasi dan aksi yang jelas |
| Loading / empty / error | Status dan pemulihan jelas; tidak ada loader 3D blocking |
| Pagination / search | Perubahan data dan hasil mudah dipahami |

---

## 6. Spatial Motion Language

- Pointer parallax pada objek dekoratif hanya di perangkat yang mendukung pointer.
- Hover mengangkat atau mengubah material secara halus, bukan gerakan besar.
- Click menghasilkan tekanan singkat.
- Menu dan modal muncul dari lapisan ruang.
- Page transition mengikuti keluarga halaman; tidak menghalangi aksi POS.
- Scroll mengungkap section dan objek secara bertahap; konten tetap dapat diakses.
- Data update memberikan feedback pada nilai yang berubah tanpa memindahkan seluruh layout.
- Checkout success memberikan konfirmasi yang cepat, tidak menunda langkah berikutnya.
- Mobile memakai tap feedback, bukan hover.
- Reduced motion menghilangkan gerak dekoratif tanpa menghilangkan informasi.

---

## 7. Responsivitas dan aksesibilitas

### Desktop
- Komposisi editorial dan spasial yang kaya.
- Sidebar dan multi-panel sesuai kebutuhan.
- WebGL/3D hanya pada area yang menambah konteks.

### Tablet
- Panel dan navigasi adaptif.
- Touch target tetap memadai.
- Kepadatan 3D dikurangi.

### Mobile
- Layout ditata ulang, bukan sekadar diperkecil.
- Navigasi ringkas, form satu kolom, modal sesuai viewport.
- POS memprioritaskan katalog, keranjang, total, dan pembayaran.
- Tabel menggunakan pola responsif yang dapat dibaca.
- Tidak ada aksi penting yang hanya tersedia melalui hover.

### Aksesibilitas
- Kontras teks memadai, fokus keyboard terlihat, label input tersedia.
- Informasi status tidak hanya dibedakan dengan warna.
- Canvas dekoratif tidak masuk urutan fokus atau menghalangi pembaca layar.
- Hormati reduced-motion dan kegagalan WebGL.

---

## 8. Batasan implementasi dan rilis

- Semua pekerjaan berada pada PR #22 dan branch `nexapos/consolidated-pr-22`.
- Tidak membuat PR baru untuk pekerjaan ini.
- Redesign visual tidak mengubah skema database, menjalankan migrasi, reset data, atau menulis data produksi.
- Pertahankan routing, autentikasi, RLS, izin, tenant isolation, checkout, stok, pembayaran, struk, aktivasi, laporan, Self Order, antrean, dan support behavior.
- Jangan merge atau deploy ke domain publik tanpa review dan persetujuan eksplisit.
- Uji build dan CI pada commit terbaru; jangan menganggap hasil commit lama berlaku untuk commit baru.
- Preview harus diperiksa pada desktop, tablet, dan mobile.
- Lakukan uji authenticated end-to-end untuk role Super Admin, Admin NexaPos, Owner NexaSpace, Owner Single Workspace, Manager, dan Karyawan sebelum release.
- Jangan menyatakan seluruh redesign selesai sebelum semua halaman, komponen, dan alur utama diperiksa.

## 9. Definition of Done

1. Setiap halaman pada inventaris mempunyai komposisi yang sesuai fungsi, bukan hanya global CSS.
2. Homepage menjelaskan seluruh fitur terbaru dan seluruh aturan paket secara akurat.
3. Seluruh komponen utama mempunyai state dan feedback yang konsisten.
4. POS tetap cepat, jelas, dan operasional.
5. Desktop/tablet/mobile tidak mengalami teks terpotong, tabrakan, modal keluar layar, atau tabel yang tidak dapat digunakan.
6. WebGL fallback dan reduced motion berfungsi.
7. Tidak ada tombol dekoratif atau CTA salah tujuan.
8. Tidak ada regresi pada auth, role, RLS, tenant isolation, checkout, stock, report, receipt, queue, Self Order, atau support.
9. Build dan tes pada commit terbaru lulus.
10. PR tetap belum merge dan production tidak berubah sampai persetujuan rilis.


---

## 14. Final approved visual direction — Adaptive Architectural Experience

This section supersedes any earlier color or lighting guidance in this document where they conflict.

**Approved combination:** Hybrid Architecture + Immersive Motion + Adaptive Visual.  
**Visual intensity:** Immersive on brand/storytelling surfaces; restrained on operational surfaces.  
**Theme behavior:** Adaptive by product context, not a forced site-wide dark or light theme.

### Non-negotiable visual exclusions
- No light neon, neon glow, RGB, cyberpunk, fluorescent accents, glowing cursor, emissive outlines, or excessive bloom.
- No purple, pink, violet, rainbow gradients, or decorative color outside the NexaPos identity.
- No glow/shadow treatment that reduces contrast or makes controls look illuminated.
- No high-motion effects that interfere with checkout, barcode/search input, payment, receipt printing, or touch interaction.

### Material and palette direction
- Matte charcoal, graphite, warm ivory, limestone, concrete, muted steel, and restrained deep teal.
- Existing NexaPos logo and tenant logos remain unchanged.
- Teal is a controlled accent, not a luminous highlight.
- Dark architectural surfaces are appropriate for navigation, login, immersive storytelling and selected command-center regions.
- Light warm surfaces are appropriate for dense operational data, forms, catalogues, tables, and analytics where sustained readability matters.

### Motion behavior
- Homepage may use cinematic scroll choreography, spatial composition, and progressive 3D enhancement.
- Authentication uses calm entrance transitions and clear form feedback.
- Admin and NexaSpace use navigation transitions, restrained reveal, state feedback, and data visualization.
- POS checkout and other time-critical workflows prioritize immediate response; decorative motion is minimized or disabled.
- Respect `prefers-reduced-motion`, touch devices, hidden tabs, low-power devices, and WebGL failure. All business controls remain usable without WebGL.

### Implementation status
- Added `src/nexa-immersive-adaptive.css` as the global adaptive visual layer.
- Activated it from `src/main.jsx` after the existing global visual imports so the new tokens and component treatments take precedence.
- No business logic, Supabase schema, RLS policy, environment variable, or production data was changed by this visual-layer commit.
- Build and visual regression checks remain required before this design is considered release-ready.
