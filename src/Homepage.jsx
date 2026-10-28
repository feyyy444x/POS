import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Headphones, Monitor, Package, Printer, ShieldCheck, ShoppingCart,
  Sparkles, Ticket, Users, X, Zap, Activity, Store, Workflow
} from 'lucide-react'
import { supabase } from './lib/supabase'
import SupportCenter from './SupportCenter.jsx'
import './homepage.css'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const fallbackPlans = [
  { key: 'daily', name: 'Harian', duration: '1 hari', price: 10000, note: 'Untuk kebutuhan jangka pendek' },
  { key: 'weekly', name: 'Mingguan', duration: '7 hari', price: 49000, note: 'Fleksibel untuk operasional mingguan' },
  { key: 'monthly', name: 'Bulanan', duration: '30 hari', price: 149000, note: 'Praktis untuk operasional rutin', popular: true },
  { key: 'yearly', name: 'Tahunan', duration: '365 hari', price: 1490000, note: 'Pilihan untuk penggunaan jangka panjang' },
]
const features = [
  { number: '01', icon: ShoppingCart, title: 'Transaksi yang mengalir', text: 'Layani pelanggan, catat pembayaran, dan simpan setiap transaksi dengan alur kasir yang praktis.' },
  { number: '02', icon: Users, title: 'Tim yang terhubung', text: 'Beberapa akun karyawan dapat bekerja bersamaan, dengan identitas transaksi masing-masing.' },
  { number: '03', icon: Monitor, title: 'Antrian ikut bergerak', text: 'Nomor antrian tersinkron dan dapat ditampilkan di layar TV untuk membantu alur layanan.' },
  { number: '04', icon: Package, title: 'Produk selalu tertata', text: 'Atur katalog, harga, stok, dan informasi produk dalam satu workspace.' },
  { number: '05', icon: BarChart3, title: 'Gambaran lebih jelas', text: 'Lihat catatan transaksi dan laporan operasional untuk membantu mengambil keputusan.' },
  { number: '06', icon: Printer, title: 'Siap untuk struk thermal', text: 'Cetak struk melalui printer thermal yang kompatibel dengan perangkat dan browser Anda.' },
]
const storyScenes = {
  kasir: { index: '01', eyebrow: 'SAAT TRANSAKSI DIMULAI', title: 'Satu transaksi. Data langsung tercatat.', description: 'Kasir memilih produk, memproses pembayaran, dan menyelesaikan transaksi dari satu alur kerja.', icon: ShoppingCart, status: 'Transaksi tersimpan', tag: 'POS WORKSPACE' },
  tim: { index: '02', eyebrow: 'SAAT TIM BEKERJA BERSAMA', title: 'Setiap karyawan punya identitas.', description: 'Akun karyawan bekerja bersamaan, sehingga aktivitas dan transaksi tetap dapat ditelusuri sesuai akun yang digunakan.', icon: Users, status: 'Akun tim terhubung', tag: 'TEAM OPERATIONS' },
  antrian: { index: '03', eyebrow: 'SAAT PELANGGAN MENUNGGU', title: 'Antrian ikut tersinkron.', description: 'Nomor antrian dikelola secara digital dan dapat ditampilkan di layar TV agar pelanggan tahu giliran mereka.', icon: Monitor, status: 'Layar antrian aktif', tag: 'LIVE QUEUE' },
}
function discountFor(plan, promo) {
  if (!promo || !promo.is_active || !promo.eligible_periods?.includes(plan.key)) return 0
  if (promo.requires_code) return 0
  if (promo.discount_type === 'percent') return Math.min(plan.price, Math.round(plan.price * Number(promo.discount_value || 0) / 100))
  return Math.min(plan.price, Number(promo.discount_value || 0))
}
function Brand({ footer = false }) {
  return <a className={'living-brand' + (footer ? ' living-brand-footer' : '')} href="/" aria-label="NexaPos beranda">
    <img src="/nexapos-mark.svg" alt="" />
    <span>Nexa<span>Pos</span><small>SMART COMMERCE</small></span>
  </a>
}
export default function Homepage() {
  const [plans, setPlans] = useState(fallbackPlans)
  const [promos, setPromos] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('monthly')
  const [faqOpen, setFaqOpen] = useState(0)
  const [liveChatOpen, setLiveChatOpen] = useState(false)
  const [scene, setScene] = useState('kasir')

  const loadPromos = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('site_promotions')
      .select('id,title,description,discount_type,discount_value,eligible_periods,promo_code,requires_code,starts_at,ends_at,is_active')
      .eq('is_active', true)
    if (error) return
    const now = Date.now()
    setPromos((data || []).filter(p => (!p.starts_at || new Date(p.starts_at).getTime() <= now) && (!p.ends_at || new Date(p.ends_at).getTime() >= now)))
  }, [])
  useEffect(() => {
    if (!supabase) return
    loadPromos()
    const channel = supabase.channel('homepage-promotions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_promotions' }, loadPromos)
      .subscribe(status => { if (status === 'SUBSCRIBED') loadPromos() })
    const refreshOnResume = () => { if (document.visibilityState === 'visible') loadPromos() }
    window.addEventListener('focus', refreshOnResume)
    document.addEventListener('visibilitychange', refreshOnResume)
    return () => {
      window.removeEventListener('focus', refreshOnResume)
      document.removeEventListener('visibilitychange', refreshOnResume)
      supabase.removeChannel(channel)
    }
  }, [loadPromos])
  useEffect(() => {
    if (!supabase) return
    let mounted = true
    const loadPlans = async () => {
      const { data, error } = await supabase.from('site_subscription_plans')
        .select('plan_key,name,duration,price,note,features,is_popular,is_active,sort_order')
        .eq('is_active', true).order('sort_order', { ascending: true })
      if (!error && mounted && Array.isArray(data) && data.length) {
        setPlans(data.map(plan => ({ ...plan, key: plan.plan_key, price: Number(plan.price), popular: Boolean(plan.is_popular), features: Array.isArray(plan.features) ? plan.features : [] })))
      }
    }
    loadPlans()
    const channel = supabase.channel('homepage-subscription-plans-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_subscription_plans' }, loadPlans)
      .subscribe(status => { if (status === 'SUBSCRIBED') loadPlans() })
    const refresh = () => { if (document.visibilityState === 'visible') loadPlans() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      mounted = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      supabase.removeChannel(channel)
    }
  }, [])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' })
    document.querySelectorAll('.living-reveal').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  const automaticPromo = promos.find(p => !p.requires_code)
  const couponPromo = useMemo(() => {
    const code = coupon.trim().toUpperCase()
    if (!code) return null
    return promos.find(p => p.requires_code && String(p.promo_code || '').toUpperCase() === code) || null
  }, [coupon, promos])
  const activePromo = coupon.trim() ? couponPromo : automaticPromo
  const selected = plans.find(p => p.key === selectedPlan) || plans[2]
  const currentScene = storyScenes[scene] || storyScenes.kasir
  const SceneIcon = currentScene.icon
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
  return <div className="living-home">
    <header className="living-nav">
      <Brand />
      <button className="living-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}>{menuOpen ? <X /> : <span className="living-menu-lines"><i /><i /></span>}</button>
      <nav className={menuOpen ? 'living-nav-links is-open' : 'living-nav-links'}>
        <a href="#cerita" onClick={() => setMenuOpen(false)}>Cara kerja</a>
        <a href="#fitur" onClick={() => setMenuOpen(false)}>Ekosistem</a>
        <a href="#harga" onClick={() => setMenuOpen(false)}>Harga</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
      </nav>
      <div className="living-nav-actions"><a className="living-login" href="/login">Login workspace <ArrowUpRight size={14}/></a><a className="living-cta living-cta-nav" href="#harga">Mulai jelajahi <ArrowRight size={15}/></a></div>
    </header>
    <main>
      <section className="living-hero">
        <div className="living-hero-grid" aria-hidden="true" />
        <div className="living-hero-noise" aria-hidden="true" />
        <div className="living-hero-orbit orbit-large" aria-hidden="true" />
        <div className="living-hero-orbit orbit-small" aria-hidden="true" />
        <div className="living-hero-copy">
          <div className="living-kicker"><span className="living-live-dot" /> ONE CONNECTED BUSINESS SYSTEM <span className="living-kicker-line" /></div>
          <h1>Bisnis bukan<br/>sekadar <span>transaksi.</span></h1>
          <p>Kasir, tim, produk, dan antrian. Semuanya bergerak dalam satu sistem yang saling terhubung.</p>
          <div className="living-hero-actions"><a className="living-cta" href="#cerita">Rasakan alurnya <ArrowDown size={16}/></a><a className="living-cta living-demo-cta" href="/?screen=demo">Coba Demo Interaktif <ArrowUpRight size={14}/></a><a className="living-text-link" href="/login">Sudah punya akun? <span>Masuk workspace <ArrowUpRight size={14}/></span></a></div>
          <div className="living-hero-index"><span>01 — THE LIVING SYSTEM</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="living-stage" aria-label="Ilustrasi alur NexaPos">
          <div className="living-stage-ring ring-one" /><div className="living-stage-ring ring-two" /><div className="living-stage-ring ring-three" />
          <div className="living-stage-label label-top"><span>CONNECTED OPERATIONS</span><i /></div>
          <div className="living-stage-core"><img src="/nexapos-mark.svg" alt="" /><span>ONE SYSTEM</span></div>
          <div className="living-node node-pos"><span className="living-node-icon"><ShoppingCart size={18}/></span><small>01 / POS</small><b>Transaksi</b><i>LIVE</i></div>
          <div className="living-node node-team"><span className="living-node-icon"><Users size={18}/></span><small>02 / TEAM</small><b>Tim bekerja</b><i>SYNC</i></div>
          <div className="living-node node-queue"><span className="living-node-icon"><Monitor size={18}/></span><small>03 / QUEUE</small><b>Antrian TV</b><i>LIVE</i></div>
          <div className="living-node node-stock"><span className="living-node-icon"><Package size={18}/></span><small>04 / STOCK</small><b>Produk</b><i>SYNC</i></div>
          <svg className="living-connectors" viewBox="0 0 600 600" fill="none" aria-hidden="true"><path d="M300 300 L165 170"/><path d="M300 300 L445 160"/><path d="M300 300 L450 425"/><path d="M300 300 L150 435"/></svg>
          <div className="living-stage-caption"><span className="living-caption-pulse" /> REAL-TIME WORKFLOW <span>•</span> BUILT FOR BUSINESS</div>
        </div>
        <div className="living-hero-bottom"><span>SCROLL-LED PRODUCT STORY</span><span>DESIGNED AROUND REAL WORKFLOWS</span><span>01 / 04</span></div>
      </section>

      <section className="living-manifesto living-reveal">
        <div className="living-manifesto-index">NEXAPOS / 2026</div>
        <div className="living-manifesto-copy"><span>SEBUAH USAHA ADALAH ALUR YANG SALING TERHUBUNG.</span><h2>Ketika satu hal bergerak,<br/><em>semuanya ikut bergerak.</em></h2></div>
        <div className="living-manifesto-note">Bukan sekadar aplikasi kasir. Sebuah ruang kerja untuk menghubungkan aktivitas penting dalam bisnis sehari-hari.</div>
      </section>

      <section className="living-story" id="cerita">
        <div className="living-story-intro living-reveal"><span className="living-eyebrow">THE SYSTEM IN MOTION / 01—03</span><h2>Ikuti alurnya.<br/><span>Lihat semuanya terhubung.</span></h2><p>Pilih satu bagian untuk melihat bagaimana NexaPos membantu aktivitas bisnis berjalan dalam satu alur.</p></div>
        <div className="living-story-layout">
          <div className="living-story-tabs" role="tablist" aria-label="Pilih alur bisnis">
            {Object.entries(storyScenes).map(([key,item]) => {
              const Icon = item.icon
              return <button type="button" role="tab" aria-selected={scene===key} className={scene===key?'is-active':''} key={key} onClick={() => setScene(key)}><span>{item.index}</span><Icon size={18}/><b>{key==='kasir'?'Transaksi kasir':key==='tim'?'Aktivitas tim':'Sistem antrian'}</b><ArrowUpRight size={15}/></button>
            })}
            <div className="living-story-aside"><Workflow size={18}/><p>Satu alur operasional.<br/>Satu workspace.</p></div>
          </div>
          <div className="living-story-demo" key={scene}>
            <div className="living-demo-top"><span>{currentScene.tag}</span><span><i/> SYSTEM FLOW</span></div>
            <div className="living-demo-copy"><span className="living-demo-index">{currentScene.index} / 03</span><span className="living-eyebrow">{currentScene.eyebrow}</span><h3>{currentScene.title}</h3><p>{currentScene.description}</p><div className="living-demo-status"><span className="living-demo-status-icon"><SceneIcon size={19}/></span><span><small>STATUS SIMULASI</small><b>{currentScene.status}</b></span><CheckCircle2 size={19}/></div></div>
            <div className="living-demo-graphic">
              {scene==='kasir' && <><div className="living-receipt"><div className="living-receipt-head"><span>NEXAPOS / POS</span><span>ORDER #0128</span></div><div className="living-receipt-item"><span>Kopi susu</span><b>Rp18.000</b></div><div className="living-receipt-item"><span>Roti panggang</span><b>Rp15.000</b></div><div className="living-receipt-total"><span>TOTAL</span><b>Rp33.000</b></div><div className="living-receipt-paid"><Check size={14}/> PEMBAYARAN TERCATAT</div></div><div className="living-demo-orb"><ShoppingCart size={24}/><span>TRANSACTION<br/>COMPLETE</span></div></>}
              {scene==='tim' && <><div className="living-team-stack"><div><span className="living-avatar avatar-a">A</span><span><b>Kasir A</b><small>Transaksi #0128</small></span><i>Aktif</i></div><div><span className="living-avatar avatar-b">B</span><span><b>Kasir B</b><small>Transaksi #0129</small></span><i>Aktif</i></div><div><span className="living-avatar avatar-c">C</span><span><b>Kasir C</b><small>Transaksi #0130</small></span><i>Aktif</i></div></div><div className="living-demo-orb"><Users size={24}/><span>MULTI-USER<br/>WORKSPACE</span></div></>}
              {scene==='antrian' && <><div className="living-tv-card"><span>NOW CALLING</span><strong>A012</strong><b>Silakan ke Kasir 2</b><div><i/><i/><i/><i/><i/><i/><i/></div></div><div className="living-demo-orb"><Monitor size={24}/><span>LIVE QUEUE<br/>DISPLAY</span></div></>}
            </div>
            <div className="living-demo-foot"><span>DEMO ILUSTRATIF • BUKAN DATA LIVE</span><span>EXPLORE NEXT <ArrowRight size={13}/></span></div>
          </div>
        </div>
      </section>

      <section className="living-bridge">
        <div className="living-bridge-line" aria-hidden="true" />
        <div className="living-bridge-copy living-reveal"><span className="living-eyebrow">FROM ONE ACTION TO THE NEXT</span><h2>Lebih sedikit proses terpisah.<br/><em>Lebih banyak hal yang terhubung.</em></h2><p>Alur operasional yang rapi membantu tim melayani pelanggan, mencatat transaksi, dan mengelola antrian tanpa kehilangan gambaran besar.</p><a className="living-inline-link" href="#fitur">Jelajahi ekosistem <ArrowRight size={15}/></a></div>
        <div className="living-bridge-map living-reveal"><div className="living-map-core"><img src="/nexapos-mark.svg" alt=""/><span>NexaPos</span></div><div className="living-map-item map-one"><ShoppingCart size={17}/><span>Transaksi</span></div><div className="living-map-item map-two"><Users size={17}/><span>Karyawan</span></div><div className="living-map-item map-three"><Monitor size={17}/><span>Antrian TV</span></div><div className="living-map-item map-four"><BarChart3 size={17}/><span>Laporan</span></div><div className="living-map-link link-one"/><div className="living-map-link link-two"/><div className="living-map-link link-three"/><div className="living-map-link link-four"/></div>
      </section>

      {activePromo && <section className="living-promo living-reveal"><div className="living-promo-symbol"><Sparkles size={20}/></div><div><span>PENAWARAN NEXAPOS</span><h2>{activePromo.title || 'Penawaran khusus NexaPos'}</h2><p>{activePromo.description || 'Hubungi tim kami untuk informasi penawaran yang sedang berlaku.'}</p></div><a className="living-cta living-cta-light" href="#harga">Lihat penawaran <ArrowRight size={15}/></a></section>}

      <section className="living-features" id="fitur">
        <div className="living-section-head living-reveal"><div><span className="living-eyebrow">BUILT AROUND YOUR BUSINESS</span><h2>Semua bagian punya peran.<br/><em>Semuanya saling mendukung.</em></h2></div><p>Alat yang Anda perlukan untuk menjaga aktivitas bisnis tetap teratur, dari depan kasir hingga layar antrian.</p></div>
        <div className="living-feature-list">{features.map(({number,icon:Icon,title,text},index)=><article className="living-feature-row living-reveal" key={number}><span className="living-feature-number">{number}</span><span className="living-feature-icon"><Icon size={23}/></span><div className="living-feature-copy"><h3>{title}</h3><p>{text}</p></div><span className="living-feature-meta">{index===0?'POINT OF SALE':index===1?'MULTI-ACCOUNT':index===2?'QUEUE DISPLAY':index===3?'CATALOGUE':index===4?'REPORTING':'THERMAL PRINT'}</span><ArrowUpRight className="living-feature-arrow" size={20}/></article>)}</div>
      </section>

      <section className="living-pricing" id="harga">
        <div className="living-section-head living-reveal"><div><span className="living-eyebrow">ACCESS THE SYSTEM</span><h2>Pilih durasi.<br/><em>Bangun ritme bisnismu.</em></h2></div><p>Semua pilihan masa sewa mendapatkan akses ke fitur aplikasi yang sama. Pilih durasi sesuai kebutuhan operasional Anda.</p></div>
        {activePromo && <div className="living-pricing-promo living-reveal"><div><span><Ticket size={14}/> {activePromo.title || 'PROMO AKTIF'}</span><b>{activePromo.description || 'Nikmati penawaran selama periode promo berlangsung.'}</b><small className="living-promo-terms">Berlaku untuk: {(activePromo.eligible_periods||[]).map(period=>({daily:'Harian',weekly:'Mingguan',monthly:'Bulanan',yearly:'Tahunan'}[period]||period)).join(', ')||'Sesuai ketentuan'}{activePromo.requires_code&&activePromo.promo_code?` · Kode ${activePromo.promo_code}`:''}{activePromo.ends_at?` · Sampai ${new Date(activePromo.ends_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}`:''}</small></div><span className="living-promo-badge">{activePromo.requires_code?'KODE PROMO':'PROMO AKTIF'}</span></div>}
        <div className="living-coupon living-reveal"><label htmlFor="living-coupon">Punya kode promo?</label><div><Ticket size={17}/><input id="living-coupon" value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder="Masukkan kode promo"/>{coupon && <button onClick={()=>setCoupon('')} aria-label="Hapus kode kupon"><X size={15}/></button>}</div>{coupon && <small className={couponPromo?'is-valid':''}>{couponPromo?`Kode valid · ${couponPromo.title||'Promo NexaPos'}`:coupon?'Kode belum valid atau tidak sedang berlaku.':'Kode akan diverifikasi sebelum konfirmasi penyewaan.'}</small>}</div>
        {promos.some(p=>p.requires_code) && <div className="living-voucher-list living-reveal">{promos.filter(p=>p.requires_code).map(p=><article className={couponPromo?.id===p.id?'is-active':''} key={p.id}><div><span><Ticket size={14}/>{p.title||'Voucher NexaPos'}</span><p>{p.description||'Masukkan kode voucher untuk melihat penawaran yang berlaku.'}</p><small>Berlaku untuk: {(p.eligible_periods||[]).map(period=>({daily:'Harian',weekly:'Mingguan',monthly:'Bulanan',yearly:'Tahunan'}[period]||period)).join(', ')||'Sesuai ketentuan'}</small></div><button type="button" onClick={()=>setCoupon(p.promo_code||'')} disabled={!p.promo_code}>{p.promo_code?'Gunakan kode '+p.promo_code:'Kode tidak tersedia'} <ArrowRight size={13}/></button></article>)}</div>}
        <div className="living-plan-grid">{plans.map(plan=>{const displayPromo=coupon.trim()?(couponPromo?{...couponPromo,requires_code:false}:null):automaticPromo;const discount=discountFor(plan,displayPromo);const finalPrice=plan.price-discount;return <article className={'living-plan'+(plan.popular?' is-popular':'')+(selectedPlan===plan.key?' is-selected':'')} key={plan.key} onClick={()=>setSelectedPlan(plan.key)}><div className="living-plan-top"><span>{plan.name}</span>{plan.popular&&<b>PALING DIPILIH</b>}</div><p>{plan.note}</p><div className="living-price">{discount>0&&<del>{money(plan.price)}</del>}<strong>{money(finalPrice)}</strong><small>/ {plan.duration}</small></div>{discount>0&&<span className="living-saving">Hemat {money(discount)}</span>}<ul>{(plan.features?.length?plan.features:['Akses workspace NexaPos','Fitur kasir dan produk','Pengelolaan antrian','Bantuan penggunaan']).map((feature,index)=><li key={index}><CheckCircle2 size={14}/>{feature}</li>)}</ul><button className="living-cta living-plan-cta" onClick={e=>{e.stopPropagation();contact(plan,displayPromo)}}>Tanyakan penyewaan <ArrowRight size={14}/></button></article>})}</div>
        <p className="living-pricing-note">Harga dan potongan merupakan informasi penawaran. Harga akhir, syarat promo, dan aktivasi akan dikonfirmasi oleh tim NexaPos sebelum pembayaran.</p>
      </section>

      <section className="living-faq" id="faq"><div className="living-section-head living-reveal"><div><span className="living-eyebrow">GOOD TO KNOW</span><h2>Sebelum mulai,<br/><em>ini yang perlu diketahui.</em></h2></div><p>Jawaban ringkas untuk membantu Anda memahami cara memulai menggunakan NexaPos.</p></div><div className="living-faq-list">{[{q:'Apakah semua masa sewa mendapatkan fitur yang sama?',a:'Ya. Seluruh pilihan masa sewa mendapatkan fitur aplikasi yang sama. Perbedaannya hanya pada jangka waktu penggunaan.'},{q:'Bagaimana cara mulai menyewa NexaPos?',a:'Pilih masa sewa yang sesuai, lalu hubungi tim NexaPos melalui Telegram untuk memperoleh informasi proses pembayaran dan aktivasi.'},{q:'Apakah NexaPos mendukung printer thermal?',a:'NexaPos menyediakan alur cetak struk untuk printer thermal yang kompatibel dengan perangkat dan browser yang digunakan.'},{q:'Apakah beberapa karyawan dapat menggunakan akun masing-masing?',a:'NexaPos dirancang untuk mendukung beberapa akun karyawan dalam satu toko, dengan identitas transaksi yang mengikuti akun yang digunakan dan hak akses masing-masing.'},{q:'Bagaimana jika masa sewa berakhir?',a:'Akses tenant perlu diperpanjang oleh pengelola layanan. Silakan hubungi tim NexaPos untuk konfirmasi masa aktif dan perpanjangan.'}].map((item,i)=><div className={'living-faq-item'+(faqOpen===i?' is-open':'')} key={item.q}><button onClick={()=>setFaqOpen(faqOpen===i?-1:i)} aria-expanded={faqOpen===i}><span><small>0{i+1}</small>{item.q}</span><ChevronDown size={17}/></button>{faqOpen===i&&<p>{item.a}</p>}</div>)}</div></section>

      <section className="living-final">
        <div className="living-final-orbit" aria-hidden="true"/><div className="living-final-copy living-reveal"><span className="living-eyebrow">THE NEXT MOVE IS YOURS</span><h2>Bisnis bergerak.<br/><em>Pastikan sistemnya ikut.</em></h2><p>Kenali NexaPos dan temukan alur kerja yang lebih terhubung untuk bisnis Anda.</p></div>
        <div className="living-final-actions"><a className="living-cta living-cta-light" href="#harga">Pilih paket sewa <ArrowRight size={16}/></a><a className="living-final-login" href="/login">Sudah punya akun? Login workspace <ArrowUpRight size={14}/></a></div>
      </section>
    </main>
    <div className="living-chat-launcher">
      {!liveChatOpen && <button type="button" className="living-chat-button" onClick={() => setLiveChatOpen(true)} aria-label="Buka pusat bantuan" title="Pusat bantuan"><img src="/nexapos-mark.svg" alt=""/><span>Pusat bantuan</span></button>}
      {liveChatOpen && <SupportCenter session={null} onClose={() => setLiveChatOpen(false)} />}
    </div>
    <footer className="living-footer"><Brand footer/><p>Kasir, tim, dan antrian dalam satu sistem yang saling terhubung.</p><div className="living-footer-links"><a href="#cerita">Cara kerja</a><a href="#fitur">Ekosistem</a><a href="#harga">Harga sewa</a><a href="#faq">FAQ</a><a href="https://t.me/becaaapos" target="_blank" rel="noreferrer">Hubungi kami</a></div><small>© {new Date().getFullYear()} NexaPos. Seluruh hak dilindungi.</small></footer>
  </div>
}
