import { ArrowRight, ArrowUpRight, Boxes, BarChart3, ClipboardList, CreditCard, Package, ShieldCheck, ShoppingCart, Store, Users } from 'lucide-react'
import './nexapos-spatial.css'

const capabilities = [
  { icon: ShoppingCart, title: 'Transaksi kasir', text: 'Pilih produk, hitung total, proses pembayaran, dan simpan riwayat transaksi dalam satu alur kerja.' },
  { icon: Package, title: 'Produk & persediaan', text: 'Kelola katalog, kategori, harga, dan stok workspace agar operasional lebih tertata.' },
  { icon: Users, title: 'Tim & hak akses', text: 'Gunakan akun karyawan masing-masing dan atur peran sesuai tanggung jawab di workspace.' },
  { icon: BarChart3, title: 'Laporan operasional', text: 'Tinjau riwayat dan ringkasan penjualan untuk membantu mengevaluasi aktivitas usaha.' },
  { icon: Boxes, title: 'NexaSpace', text: 'Pusat pengelolaan perusahaan untuk memantau dan mengelola beberapa tenant.' },
  { icon: ClipboardList, title: 'Self Order & antrean', text: 'Sediakan alur pemesanan mandiri dan pengelolaan antrean sesuai pengaturan workspace.' },
]

export default function LandingPage() {
  return <main className="nx-landing">
    <header className="nx-landing-nav">
      <a className="nx-landing-brand" href="/" aria-label="NexaPos beranda"><span className="nx-brand-orb">N</span><span>NexaPos<small>SPATIAL DIGITAL UNIVERSE</small></span></a>
      <nav aria-label="Navigasi ringkasan"><a href="#solusi">Solusi</a><a href="#alur">Cara kerja</a><a href="#fitur">Fitur</a><a href="#akses">Pilihan workspace</a></nav>
      <div><a className="nx-landing-login" href="/login">Login</a><a className="nx-landing-cta" href="/?screen=register">Mulai gratis <ArrowUpRight size={15}/></a></div>
    </header>

    <section className="nx-landing-hero">
      <div className="nx-landing-hero-copy">
        <span className="nx-eyebrow"><i/> BUSINESS OPERATIONS PLATFORM</span>
        <h1>Semua alur bisnis.<br/><em>Satu ruang kendali.</em></h1>
        <p>NexaPos adalah aplikasi web untuk membantu bisnis mengelola transaksi, produk, stok, tim, dan laporan. Untuk perusahaan dengan beberapa workspace, NexaSpace menghadirkan pusat kendali dalam satu ekosistem.</p>
        <div className="nx-landing-actions"><a className="nx-landing-cta" href="/?screen=register">Buat Workspace Gratis <ArrowRight size={16}/></a><a className="nx-landing-secondary" href="/#fitur">Jelajahi seluruh ekosistem</a></div>
        <small className="nx-landing-note">Workspace Gratis dibuat sebagai workspace mandiri. Tidak memerlukan kode aktivasi atau pembayaran pada proses pendaftaran.</small>
      </div>
      <div className="nx-landing-visual" aria-label="Ilustrasi ekosistem NexaPos">
        <div className="nx-landing-orbit nx-orbit-a"/><div className="nx-landing-orbit nx-orbit-b"/>
        <div className="nx-landing-core"><span>N</span><b>NEXAPOS</b><small>CONNECTED OPERATIONS</small></div>
        <div className="nx-float-card nx-card-pos"><ShoppingCart/><b>Point of Sale</b><small>Transaksi</small></div>
        <div className="nx-float-card nx-card-stock"><Package/><b>Inventory</b><small>Produk & stok</small></div>
        <div className="nx-float-card nx-card-team"><Users/><b>Team</b><small>Hak akses</small></div>
        <div className="nx-float-card nx-card-space"><Boxes/><b>NexaSpace</b><small>Company control</small></div>
      </div>
    </section>

    <section className="nx-landing-intro" id="solusi">
      <span className="nx-eyebrow">DESIGNED FOR DAILY OPERATIONS</span>
      <h2>Operasional yang saling terhubung, tanpa kehilangan kendali.</h2>
      <p>Mulai dari satu workspace untuk menjalankan usaha sehari-hari. Saat bisnis berkembang, struktur perusahaan dan tenant membantu memisahkan ruang kerja sekaligus memberi Owner gambaran operasional yang lebih luas. NexaPos dapat digunakan untuk retail/toko, minimarket, fashion, kuliner, kafe, jasa, salon, apotek, dan kategori usaha lainnya.</p>
    </section>

    <section className="nx-landing-capabilities" id="fitur">
      <div className="nx-landing-section-head"><span className="nx-eyebrow">THE NEXAPOS ECOSYSTEM</span><h2>Alat kerja utama dalam satu aplikasi.</h2><p>Fitur yang ditampilkan mengacu pada modul operasional NexaPos.</p></div>
      <div className="nx-landing-cap-grid">{capabilities.map(({icon:Icon,title,text},i)=><article key={title}><span className="nx-cap-index">0{i+1}</span><Icon size={23}/><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="nx-landing-flow" id="alur">
      <div><span className="nx-eyebrow">HOW IT WORKS</span><h2>Mulai sederhana.<br/><em>Kembangkan dengan teratur.</em></h2><p>Alur penggunaan disesuaikan dengan model workspace yang dipilih dan aktivasi yang berlaku.</p></div>
      <ol><li><b>01</b><span><strong>Daftar atau terima aktivasi</strong><small>Buat Workspace Gratis dari homepage atau gunakan akses yang diberikan Admin.</small></span></li><li><b>02</b><span><strong>Siapkan profil usaha</strong><small>Lengkapi nama workspace dan informasi usaha yang diperlukan.</small></span></li><li><b>03</b><span><strong>Atur tim dan operasional</strong><small>Kelola produk, stok, karyawan, transaksi, serta fitur pendukung yang tersedia.</small></span></li><li><b>04</b><span><strong>Pantau perkembangan</strong><small>Gunakan laporan workspace atau NexaSpace sesuai struktur akun.</small></span></li></ol>
    </section>

    <section className="nx-landing-workspaces" id="akses">
      <span className="nx-eyebrow">WORKSPACE STRUCTURE</span><h2>Pilih struktur yang sesuai dengan bisnis.</h2>
      <div className="nx-workspace-grid">
        <article><Store/><h3>Single Workspace</h3><p>Workspace mandiri untuk Owner yang mengelola satu ruang operasional tanpa perlu mengelola banyak tenant.</p></article>
        <article><Boxes/><h3>NexaSpace & Tenant</h3><p>Struktur perusahaan untuk Owner yang membutuhkan beberapa workspace tenant dengan pengelolaan terpusat.</p></article>
        <article><ShieldCheck/><h3>Admin NexaPos</h3><p>Pengelolaan aktivasi dan administrasi platform dilakukan oleh Admin NexaPos sesuai kewenangannya.</p></article>
      </div>
    </section>

    <section className="nx-landing-trust">
      <div><ShieldCheck size={24}/><span><b>Akses berbasis peran</b><small>Setiap akun menggunakan hak akses sesuai perannya.</small></span></div>
      <div><CreditCard size={24}/><span><b>Aktivasi transparan</b><small>Detail paket, durasi, dan harga ditampilkan melalui informasi paket yang berlaku.</small></span></div>
      <div><Store size={24}/><span><b>Operasional berbasis workspace</b><small>Data operasional dikelola pada workspace masing-masing.</small></span></div>
    </section>

    <section className="nx-landing-faq">
      <span className="nx-eyebrow">BEFORE YOU START</span><h2>Yang perlu diketahui.</h2>
      <details><summary>Apakah bisa mulai tanpa membayar?</summary><p>Ya. NexaPos menyediakan pendaftaran Workspace Gratis melalui formulir di homepage. Pendaftaran tetap memerlukan verifikasi email.</p></details>
      <details><summary>Apakah Workspace Gratis sama dengan paket aktivasi perusahaan?</summary><p>Tidak. Workspace Gratis adalah workspace mandiri. Paket aktivasi perusahaan digunakan sesuai model aktivasi dan kebutuhan tenant.</p></details>
      <details><summary>Bisakah satu perusahaan memiliki beberapa tenant?</summary><p>Ya. NexaSpace merupakan pusat kendali Owner untuk mengelola perusahaan dan workspace tenant sesuai kuota serta status aktivasi.</p></details>
      <details><summary>Bagaimana mengetahui harga paket?</summary><p>Lihat bagian Harga pada homepage NexaPos untuk informasi paket dan durasi yang sedang tersedia. Harga mengikuti konfigurasi yang dipublikasikan.</p></details>
      <details><summary>Bagaimana jika membutuhkan bantuan?</summary><p>Gunakan kanal WhatsApp atau Telegram yang ditampilkan pada homepage apabila kanal tersebut tersedia dan diaktifkan.</p></details>
    </section>

    <section className="nx-landing-end">
      <span className="nx-eyebrow">YOUR BUSINESS, IN ONE CONNECTED SPACE</span><h2>Siapkan ruang kerja bisnis Anda.</h2><p>Mulai dari workspace mandiri, lalu gunakan struktur perusahaan saat kebutuhan operasional berkembang.</p><a className="nx-landing-cta" href="/?screen=register">Daftar Workspace Gratis <ArrowRight size={16}/></a><a className="nx-landing-back" href="/">Kembali ke homepage utama</a>
    </section>
    <footer className="nx-landing-footer"><a className="nx-landing-brand" href="/"><span className="nx-brand-orb">N</span><span>NexaPos<small>SPATIAL DIGITAL UNIVERSE</small></span></a><span>© {new Date().getFullYear()} NexaPos. Seluruh hak dilindungi.</span><a href="/login">Login workspace <ArrowUpRight size={14}/></a></footer>
  </main>
}
