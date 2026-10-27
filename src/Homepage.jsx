import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, CheckCircle2, ChevronDown, CircleDollarSign, Headphones, Menu, Monitor, Package, Printer, ShieldCheck, ShoppingCart, Sparkles, Ticket, X, Zap } from 'lucide-react'
import { supabase } from './lib/supabase'
import './homepage.css'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const plans = [
  { key: 'daily', name: 'Harian', duration: '1 hari', price: 10000, note: 'Untuk kebutuhan jangka pendek' },
  { key: 'weekly', name: 'Mingguan', duration: '7 hari', price: 49000, note: 'Fleksibel untuk operasional mingguan' },
  { key: 'monthly', name: 'Bulanan', duration: '30 hari', price: 149000, note: 'Praktis untuk operasional rutin', popular: true },
  { key: 'yearly', name: 'Tahunan', duration: '365 hari', price: 1490000, note: 'Pilihan untuk penggunaan jangka panjang' },
]
const features = [
  { icon: ShoppingCart, title: 'Kasir digital (POS)', text: 'Catat transaksi dan pembayaran dengan alur kasir yang praktis.' },
  { icon: Package, title: 'Produk dan stok', text: 'Kelola produk, persediaan, harga jual, dan harga modal dalam satu tempat.' },
  { icon: BarChart3, title: 'Laporan penjualan', text: 'Pantau transaksi, produk terjual, dan ringkasan modal untuk membantu evaluasi usaha.' },
  { icon: Printer, title: 'Cetak struk thermal', text: 'Siapkan struk transaksi dengan printer thermal yang kompatibel.' },
  { icon: Monitor, title: 'Antrian real-time', text: 'Kelola nomor antrian dan tampilkan panggilan antrian pada layar TV.' },
  { icon: Headphones, title: 'Pusat bantuan', text: 'Dapatkan panduan melalui saluran bantuan NexaPos.' },
]
function discountFor(plan, promo) {
  if (!promo || !promo.is_active || !promo.eligible_periods?.includes(plan.key)) return 0
  if (promo.requires_code) return 0
  if (promo.discount_type === 'percent') return Math.min(plan.price, Math.round(plan.price * Number(promo.discount_value || 0) / 100))
  return Math.min(plan.price, Number(promo.discount_value || 0))
}
export default function Homepage() {
  const [promos, setPromos] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [faqOpen, setFaqOpen] = useState(0)
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.from('site_promotions').select('id,title,description,discount_type,discount_value,eligible_periods,promo_code,requires_code,starts_at,ends_at,is_active')
      .eq('is_active', true).then(({ data, error }) => {
        if (!active || error) return
        const now = Date.now()
        setPromos((data || []).filter(p => (!p.starts_at || new Date(p.starts_at).getTime() <= now) && (!p.ends_at || new Date(p.ends_at).getTime() >= now)))
      })
    return () => { active = false }
  }, [])
  const automaticPromo = promos.find(p => !p.requires_code)
  const couponPromo = useMemo(() => {
    const code = coupon.trim().toUpperCase()
    if (!code) return null
    return promos.find(p => p.requires_code && String(p.promo_code || '').toUpperCase() === code) || null
  }, [coupon, promos])
  const activePromo = couponPromo || automaticPromo || null
  const selected = plans.find(p => p.key === selectedPlan) || plans[2]
    const contact = (plan, promo) => {
    const details = [
      'Halo Tim NexaPos, saya ingin menanyakan penyewaan layanan.',
      'Masa sewa: ' + plan.name + ' (' + plan.duration + ')',
      'Harga normal: ' + money(plan.price),
      promo ? 'Promo: ' + (promo.title || promo.promo_code || 'Promo NexaPos') : '',
      promo ? 'Perkiraan harga setelah diskon: ' + money(plan.price - discountFor(plan, { ...promo, requires_code: false })) : '',
      coupon.trim() ? 'Kode kupon: ' + coupon.trim().toUpperCase() : '',
      'Mohon informasi mengenai proses aktivasi dan pembayaran. Terima kasih.'
    ].filter(Boolean).join('\n')
    window.open('https://t.me/becaaapos?text=' + encodeURIComponent(details), '_blank', 'noopener,noreferrer')
  }
  return <div className="nx-home">
    <header className="nx-nav">
      <a className="nx-brand" href="/" aria-label="NexaPos beranda"><span className="nx-brand-mark">N</span><span>Nexa<span>Pos</span><small>SMART COMMERCE</small></span></a>
      <button className="nx-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Buka navigasi">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'nx-nav-links is-open' : 'nx-nav-links'}>
        <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a><a href="#keunggulan" onClick={() => setMenuOpen(false)}>Keunggulan</a><a href="#harga" onClick={() => setMenuOpen(false)}>Harga sewa</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
      </nav>
      <div className="nx-nav-actions"><a className="nx-login-link" href="/login">Login Workspace</a><a className="nx-button nx-button-small" href="#harga">Lihat Paket <ArrowRight size={16}/></a></div>
    </header>
    <main>
      <section className="nx-hero">
        <div className="nx-hero-glow nx-glow-one"/><div className="nx-hero-glow nx-glow-two"/>
        <div className="nx-hero-copy"><div className="nx-eyebrow"><span className="nx-live-dot"/> SOLUSI DIGITAL UNTUK USAHA ANDA</div>
          <h1>Kelola Bisnis Lebih Mudah <span>Bersama NexaPos.</span></h1>
          <p>Solusi kasir digital dan sistem antrian terintegrasi untuk membantu operasional usaha Anda menjadi lebih praktis, teratur, dan efisien.</p>
          <div className="nx-hero-actions"><a className="nx-button" href="#harga">Lihat Pilihan Sewa <ArrowRight size={17}/></a><a className="nx-button nx-button-ghost" href="/login">Masuk ke Workspace</a></div>
          <div className="nx-proof-row"><span><CheckCircle2 size={15}/> Kasir dan stok</span><span><CheckCircle2 size={15}/> Laporan usaha</span><span><CheckCircle2 size={15}/> Antrian terintegrasi</span></div>
        </div>
        <div className="nx-hero-visual" aria-label="Ilustrasi dashboard NexaPos">
          <div className="nx-visual-orbit orbit-a"/><div className="nx-visual-orbit orbit-b"/>
          <div className="nx-dashboard-window"><div className="nx-window-top"><span/><span/><span/><b>NexaPos Workspace</b></div><div className="nx-window-body"><aside><i/><i/><i/><i/><i/></aside><div className="nx-window-content"><div className="nx-window-title"><span>Ringkasan usaha</span><b>Hari ini</b></div><div className="nx-mini-stats"><div><small>Total penjualan</small><strong>Rp2.450.000</strong><i>+12,8%</i></div><div><small>Transaksi</small><strong>128</strong><i>Hari ini</i></div></div><div className="nx-chart"><div className="nx-chart-label"><b>Aktivitas penjualan</b><span>7 hari terakhir</span></div><div className="nx-chart-bars">{[34,52,43,72,57,88,68].map((h,i)=><i key={i} style={{height:h+'%'}}/>)}</div></div><div className="nx-window-bottom"><span><Ticket size={14}/> Antrian aktif</span><b>A012</b><em>Terhubung</em></div></div></div></div>
          <div className="nx-float-card nx-float-sales"><span><CircleDollarSign size={17}/></span><div><small>Transaksi tercatat</small><b>Lebih terorganisir</b></div></div>
          <div className="nx-float-card nx-float-queue"><span><Monitor size={17}/></span><div><small>Tampilan antrian</small><b>Sinkron ke TV</b></div></div>
        </div>
        <div className="nx-hero-bottom"><span>SMART COMMERCE</span><span>UNTUK OPERASIONAL YANG LEBIH BAIK</span><span>01 / 04</span></div>
      </section>
      {activePromo && <section className="nx-promo-strip"><div className="nx-promo-icon"><Sparkles size={21}/></div><div><span>INFORMASI PROMOSI</span><h2>{activePromo.title || 'Penawaran khusus NexaPos'}</h2><p>{activePromo.description || 'Tanyakan penawaran yang sedang berlaku kepada tim kami.'}</p></div><a className="nx-button nx-button-light" href="#harga">Lihat penawaran <ArrowRight size={16}/></a></section>}
      <section className="nx-section nx-features" id="fitur"><div className="nx-section-head"><span className="nx-eyebrow">FITUR UTAMA</span><h2>Satu ruang kerja untuk kebutuhan operasional.</h2><p>Kelola aktivitas penting usaha Anda melalui satu platform yang dirancang agar lebih praktis dan teratur.</p></div><div className="nx-feature-grid">{features.map(({icon:Icon,title,text},i)=><article className="nx-feature-card" key={title}><span className="nx-feature-icon"><Icon size={21}/></span><small>0{i+1} / FITUR</small><h3>{title}</h3><p>{text}</p><span className="nx-feature-arrow"><ArrowRight size={16}/></span></article>)}</div></section>
      <section className="nx-benefits" id="keunggulan"><div className="nx-benefits-copy"><span className="nx-eyebrow">DIRANCANG UNTUK USAHA ANDA</span><h2>Operasional lebih tertata. Waktu lebih berharga.</h2><p>NexaPos menyatukan alur kasir dan antrian agar tim dapat bekerja lebih terarah, sementara Anda memperoleh gambaran operasional dengan lebih mudah.</p><div className="nx-benefit-list"><div><span><Zap size={18}/></span><div><b>Alur kerja praktis</b><small>Kurangi perpindahan antarproses saat melayani pelanggan.</small></div></div><div><span><ShieldCheck size={18}/></span><div><b>Akses workspace</b><small>Masuk melalui akun dengan hak akses yang sesuai.</small></div></div><div><span><CircleDollarSign size={18}/></span><div><b>Informasi harga jelas</b><small>Pilih masa sewa sesuai kebutuhan operasional usaha.</small></div></div></div></div><div className="nx-benefit-panel"><div className="nx-panel-top"><span>OPERASIONAL TERINTEGRASI</span><span className="nx-panel-live"><i/> SISTEM</span></div><div className="nx-flow-step"><span>01</span><div><b>Transaksi kasir</b><small>Produk dan pembayaran dicatat</small></div><CheckCircle2 size={18}/></div><div className="nx-flow-line"/><div className="nx-flow-step"><span>02</span><div><b>Nomor antrian</b><small>Nomor antrian dikelola secara digital</small></div><CheckCircle2 size={18}/></div><div className="nx-flow-line"/><div className="nx-flow-step"><span>03</span><div><b>Laporan operasional</b><small>Data membantu pemantauan usaha</small></div><CheckCircle2 size={18}/></div><div className="nx-panel-foot"><span>Dirancang untuk mendukung produktivitas</span><ArrowRight size={16}/></div></div></section>
      <section className="nx-section nx-pricing" id="harga"><div className="nx-section-head"><span className="nx-eyebrow">PILIHAN MASA SEWA</span><h2>Fleksibel sesuai kebutuhan Anda.</h2><p>Semua pilihan masa sewa mendapatkan akses ke fitur aplikasi yang sama. Silakan pilih durasi yang paling sesuai.</p></div>
        {automaticPromo && <div className="nx-promo-banner"><div><span className="nx-promo-label"><Ticket size={14}/> {automaticPromo.title || 'PROMO AKTIF'}</span><h3>{automaticPromo.description || 'Nikmati penawaran selama periode promo berlangsung.'}</h3></div><span className="nx-promo-badge">PENAWARAN KHUSUS</span></div>}
        <div className="nx-coupon-row"><label htmlFor="nx-coupon">Memiliki kode kupon?</label><div><Ticket size={17}/><input id="nx-coupon" value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder="Masukkan kode promo"/>{coupon && <button onClick={()=>setCoupon('')} aria-label="Hapus kode kupon"><X size={15}/></button>}</div>{coupon && <small className={couponPromo?'nx-coupon-valid':'nx-coupon-hint'}>{couponPromo?'Kode terdeteksi. Konfirmasi syarat promo dengan tim NexaPos.':'Kode akan diperiksa kembali oleh tim saat konfirmasi penyewaan.'}</small>}</div>
        <div className="nx-plan-grid">{plans.map(plan=>{const displayPromo=couponPromo?{...couponPromo,requires_code:false}:automaticPromo;const discount=discountFor(plan,displayPromo);const finalPrice=plan.price-discount;return <article className={'nx-plan-card '+(plan.popular?'nx-plan-popular':'')+(selectedPlan===plan.key?' nx-plan-selected':'')} key={plan.key} onClick={()=>setSelectedPlan(plan.key)}><div className="nx-plan-top"><span>{plan.name}</span>{plan.popular&&<b>PALING DIPILIH</b>}</div><p>{plan.note}</p><div className="nx-price">{discount>0&&<del>{money(plan.price)}</del>}<strong>{money(finalPrice)}</strong><small>/ {plan.duration}</small></div>{discount>0&&<span className="nx-saving">Hemat {money(discount)}</span>}<ul><li><CheckCircle2 size={15}/> Semua fitur NexaPos</li><li><CheckCircle2 size={15}/> POS dan manajemen produk</li><li><CheckCircle2 size={15}/> Laporan penjualan dan modal</li><li><CheckCircle2 size={15}/> Sistem antrian dan bantuan</li></ul><button className="nx-button nx-button-plan" onClick={e=>{e.stopPropagation();contact(plan,activePromo)}}>Tanyakan penyewaan <ArrowRight size={15}/></button></article>})}</div>
        <p className="nx-pricing-note">Harga dan potongan di halaman ini merupakan informasi penawaran. Harga akhir, syarat promo, dan aktivasi akan dikonfirmasi oleh tim NexaPos sebelum pembayaran.</p>
      </section>
      <section className="nx-faq" id="faq"><div className="nx-section-head"><span className="nx-eyebrow">PERTANYAAN UMUM</span><h2>Informasi sebelum Anda menyewa.</h2><p>Berikut beberapa hal yang sering ditanyakan mengenai layanan NexaPos.</p></div><div className="nx-faq-list">{[{q:'Apakah semua masa sewa mendapatkan fitur yang sama?',a:'Ya. Seluruh pilihan masa sewa mendapatkan fitur aplikasi yang sama. Perbedaannya hanya pada jangka waktu penggunaan.'},{q:'Bagaimana cara mulai menyewa NexaPos?',a:'Pilih masa sewa yang sesuai, lalu hubungi tim NexaPos melalui Telegram untuk memperoleh informasi proses pembayaran dan aktivasi.'},{q:'Apakah NexaPos mendukung printer thermal?',a:'NexaPos menyediakan alur cetak struk untuk printer thermal yang kompatibel dengan perangkat dan browser yang digunakan.'},{q:'Bagaimana jika masa sewa berakhir?',a:'Akses tenant perlu diperpanjang oleh pengelola layanan. Silakan hubungi tim NexaPos untuk konfirmasi masa aktif dan perpanjangan.'}].map((item,i)=><div className={'nx-faq-item '+(faqOpen===i?'is-open':'')} key={item.q}><button onClick={()=>setFaqOpen(faqOpen===i?-1:i)}><span>{item.q}</span><ChevronDown size={18}/></button>{faqOpen===i&&<p>{item.a}</p>}</div>)}</div></section>
      <section className="nx-final-cta"><div><span className="nx-eyebrow">MULAI BERSAMA NEXAPOS</span><h2>Siap menata operasional usaha Anda?</h2><p>Tim kami siap membantu menjelaskan proses penyewaan dan penggunaan NexaPos.</p></div><div><a className="nx-button nx-button-light" href="https://t.me/becaaapos" target="_blank" rel="noreferrer">Hubungi Tim NexaPos <ArrowRight size={16}/></a><a className="nx-cta-login" href="/login">Sudah memiliki akun? Login workspace</a></div></section>
    </main>
    <footer className="nx-footer"><a className="nx-brand" href="/"><span className="nx-brand-mark">N</span><span>Nexa<span>Pos</span><small>SMART COMMERCE</small></span></a><p>Solusi kasir digital dan sistem antrian untuk mendukung operasional usaha Anda.</p><div><a href="#fitur">Fitur</a><a href="#harga">Harga sewa</a><a href="#faq">FAQ</a><a href="https://t.me/becaaapos" target="_blank" rel="noreferrer">Hubungi kami</a></div><small>© {new Date().getFullYear()} NexaPos. Seluruh hak dilindungi.</small></footer>
  </div>
}
