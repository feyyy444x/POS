import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Monitor, Package, Phone, Printer, Send, ShieldCheck, ShoppingCart,
  Sparkles, Ticket, Users, X, Zap, Activity, Store, Workflow
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './homepage.css'
import './chillpos-design-system.css'
import './homepage-cinematic.css'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const fallbackDurations = [
  { duration_key: 'daily', name: 'Harian', duration_days: 3, sort_order: 1, is_active: true },
  { duration_key: 'weekly', name: 'Mingguan', duration_days: 7, sort_order: 2, is_active: true },
  { duration_key: 'monthly', name: 'Bulanan', duration_days: 30, sort_order: 3, is_active: true },
  { duration_key: 'yearly', name: 'Tahunan', duration_days: 365, sort_order: 4, is_active: true },
]
const defaultFeatures = ['Semua fitur ChillPos', 'Kasir dan transaksi', 'Produk dan stok terpisah per tenant/lokasi', 'Laporan operasional', 'Sistem antrean dan struk']
const fallbackPlans = [
  { key: 'starter', name: 'Starter', location_limit: 3, note: 'Untuk usaha yang mulai menambah tenant operasional', prices: { daily: 5000, weekly: 15000, monthly: 49000, yearly: 490000 }, features: defaultFeatures, popular: false, sort_order: 1 },
  { key: 'growth', name: 'Growth', location_limit: 5, note: 'Untuk bisnis yang mulai berkembang', prices: { daily: 10000, weekly: 30000, monthly: 99000, yearly: 990000 }, features: defaultFeatures, popular: false, sort_order: 2 },
  { key: 'business', name: 'Business', location_limit: 10, note: 'Untuk bisnis dengan beberapa lokasi', prices: { daily: 15000, weekly: 50000, monthly: 179000, yearly: 1790000 }, features: defaultFeatures, popular: true, sort_order: 3 },
  { key: 'enterprise', name: 'Enterprise', location_limit: 15, note: 'Untuk jaringan usaha yang lebih besar', prices: { daily: 25000, weekly: 85000, monthly: 299000, yearly: 2990000 }, features: defaultFeatures, popular: false, sort_order: 4 },
]
const features = [
  { number: '01', icon: ShoppingCart, title: 'Transaksi kasir lebih praktis', text: 'Layani pelanggan dari satu layar: pilih produk, hitung total otomatis, proses pembayaran, dan simpan riwayat transaksi dengan lebih rapi.' },
  { number: '02', icon: Users, title: 'Banyak kasir, tetap terpantau', text: 'Berikan akun masing-masing kepada karyawan. Beberapa kasir bekerja bersamaan untuk melayani pelanggan, sementara setiap transaksi tetap memiliki identitas kasir yang mengerjakannya.' },
  { number: '03', icon: Monitor, title: 'Antrean sesuai alur pelayanan', text: 'Catat nama pelanggan, nomor antrean, dan loket atau kasir yang melayani. Aktifkan atau nonaktifkan fitur antrean sesuai kebutuhan toko.' },
  { number: '04', icon: Package, title: 'Produk dan stok lebih tertata', text: 'Susun katalog, kategori, harga, dan informasi persediaan dalam satu tempat agar tim lebih mudah menemukan produk dan memantau kebutuhan stok.' },
  { number: '05', icon: BarChart3, title: 'Laporan untuk memahami usaha', text: 'Lihat riwayat transaksi dan ringkasan penjualan untuk membantu memantau aktivitas toko serta menjadi bahan evaluasi operasional.' },
  { number: '06', icon: Printer, title: 'Struk transaksi siap dicetak', text: 'Selesaikan transaksi dengan bukti pembayaran yang dapat dicetak melalui printer thermal yang kompatibel dengan perangkat dan browser Anda.' },
]
const storyScenes = {
  kasir: { index: '01', eyebrow: 'SAAT TRANSAKSI DIMULAI', title: 'Dari pilih produk hingga transaksi tercatat.', description: 'Kasir memilih produk, memeriksa total, memproses pembayaran, lalu menyimpan transaksi dalam satu alur kerja.', icon: ShoppingCart, status: 'Transaksi tersimpan', tag: 'POS WORKSPACE' },
  tim: { index: '02', eyebrow: 'SAAT TIM BEKERJA BERSAMA', title: 'Setiap kasir bekerja dengan akunnya.', description: 'Karyawan dapat menggunakan akun masing-masing secara bersamaan. Transaksi tetap tercatat atas nama akun yang mengerjakannya.', icon: Users, status: 'Akun tim terhubung', tag: 'TEAM OPERATIONS' },
  antrian: { index: '03', eyebrow: 'SAAT PELANGGAN MENUNGGU', title: 'Antrean tetap jelas dan sederhana.', description: 'Catat nama pelanggan, nomor antrean, dan loket atau kasir yang melayani. Antrean dapat diaktifkan atau dinonaktifkan sesuai kebutuhan toko.', icon: Monitor, status: 'Antrean operasional', tag: 'QUEUE OPERATIONS' },
}
const requiresPromoCode = (promo) => promo?.requires_code === true || promo?.requires_code === 'true' || promo?.requires_code === 1
const eligiblePeriods = (promo) => (Array.isArray(promo?.eligible_periods)
  ? promo.eligible_periods.map(value => String(value).trim().toLowerCase())
  : typeof promo?.eligible_periods === 'string'
    ? promo.eligible_periods.split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
    : []).filter(period => period !== 'custom')
const promoDiscountLabel = (promo) => {
  const type = String(promo?.discount_type || '').trim().toLowerCase()
  const value = Math.max(0, Number(promo?.discount_value || 0))
  return ['percent', 'percentage', 'percentual', 'persen'].includes(type)
    ? Math.min(value, 100) + '%'
    : money(value)
}
function Brand({ footer = false }) {
  return <a className={'living-brand' + (footer ? ' living-brand-footer' : '')} href="/" aria-label="ChillPos beranda">
    <img src="/chillpos-mark.svg" alt="" />
    <span>ChillPos<small>BUSINESS OPERATIONS</small></span>
  </a>
}
export default function Homepage() {
  const [plans, setPlans] = useState(fallbackPlans)
  const [durations, setDurations] = useState(fallbackDurations)
  const [selectedDuration, setSelectedDuration] = useState('monthly')
  const [promos, setPromos] = useState([])
  const [supportChannels, setSupportChannels] = useState({ whatsapp_enabled: false, whatsapp_number: '', telegram_enabled: true, telegram_username: 'becaaapos' })
  const [serverQuotes, setServerQuotes] = useState({})
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [faqOpen, setFaqOpen] = useState(0)
  const [scene, setScene] = useState('kasir')

  const loadPromos = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('site_promotions')
      .select('id,title,description,discount_type,discount_value,eligible_periods,promo_code,requires_code,starts_at,ends_at,is_active')
      .eq('is_active', true)
    if (error) { setPromos([]); return }
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
    const loadSupportChannels = async () => {
      const { data, error } = await supabase.from('support_channel_settings')
        .select('whatsapp_enabled,whatsapp_number,telegram_enabled,telegram_username')
        .eq('id', 1).maybeSingle()
      if (error || !data) return
      setSupportChannels({
        whatsapp_enabled: Boolean(data.whatsapp_enabled),
        whatsapp_number: String(data.whatsapp_number || '').replace(/\D/g, ''),
        telegram_enabled: Boolean(data.telegram_enabled),
        telegram_username: String(data.telegram_username || '').replace(/^@/, '').trim(),
      })
    }
    loadSupportChannels()
    const channel = supabase.channel('homepage-support-channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_channel_settings' }, loadSupportChannels)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])
  useEffect(() => {
    if (!supabase) return
    let mounted = true
    const loadPricing = async () => {
      const [packageResult, durationResult] = await Promise.all([
        supabase.from('site_activation_packages').select('package_key,name,location_limit,note,prices,features,is_popular,is_active,sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('site_activation_durations').select('duration_key,name,duration_days,sort_order,is_active').eq('is_active', true).order('sort_order', { ascending: true }),
      ])
      if (mounted && !durationResult.error && Array.isArray(durationResult.data) && durationResult.data.length) {
        // Homepage only offers the four supported standard activation periods.
        const savedDurations = new Map(durationResult.data
          .filter(d => ['daily', 'weekly', 'monthly', 'yearly'].includes(String(d.duration_key || '').trim().toLowerCase()))
          .map(d => [d.duration_key, d]))
        // A configured database row is authoritative: only active standard durations are public.
        // Fallback options are used only when the duration table has not been seeded yet.
        const nextDurations = savedDurations.size
          ? fallbackDurations.filter(d => savedDurations.has(d.duration_key)).map(d => ({
              ...d,
              ...savedDurations.get(d.duration_key),
              duration_days: Number(savedDurations.get(d.duration_key)?.duration_days ?? d.duration_days),
            }))
          : fallbackDurations
        setDurations(nextDurations)
        setSelectedDuration(current => nextDurations.some(d => d.duration_key === current) ? current : (nextDurations.find(d => d.duration_key === 'yearly')?.duration_key || nextDurations[0]?.duration_key || 'yearly'))
      }
      if (mounted && !packageResult.error && Array.isArray(packageResult.data) && packageResult.data.length) {
        setPlans(packageResult.data.filter(plan => ['starter', 'growth', 'business', 'enterprise', 'single_workspace'].includes(String(plan.package_key || '').trim().toLowerCase()) && !/custom/i.test(String(plan.name || ''))).map(plan => ({
          ...plan,
          prices: { ...(fallbackPlans.find(fallback => fallback.key === plan.package_key)?.prices || {}), ...(plan.prices && typeof plan.prices === 'object' ? plan.prices : {}) },
          key: plan.package_key,
          location_limit: Number(plan.location_limit),
          popular: Boolean(plan.is_popular),
          features: Array.isArray(plan.features) ? plan.features : defaultFeatures,
        })))
      }
    }
    loadPricing()
    const packageChannel = supabase.channel('homepage-activation-packages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_activation_packages' }, loadPricing)
      .subscribe(status => { if (status === 'SUBSCRIBED') loadPricing() })
    const durationChannel = supabase.channel('homepage-activation-durations-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_activation_durations' }, loadPricing)
      .subscribe(status => { if (status === 'SUBSCRIBED') loadPricing() })
    const refresh = () => { if (document.visibilityState === 'visible') loadPricing() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      mounted = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      supabase.removeChannel(packageChannel)
      supabase.removeChannel(durationChannel)
    }
  }, [])
  // Server-calculated quotes are authoritative for all displayed package discounts.
  useEffect(() => {
    if (!supabase || !plans.length) { setServerQuotes({}); setQuoteLoading(false); return }
    let cancelled = false
    setServerQuotes({})
    setQuoteLoading(true)
    Promise.all(plans.map(async plan => {
      const { data, error } = await supabase.rpc('get_activation_quote', {
        p_package_key: plan.key,
        p_duration_key: selectedDuration,
        p_promo_code: coupon.trim() || null,
      })
      return [plan.key, !error && data?.ok ? data : null]
    })).then(entries => {
      if (!cancelled) setServerQuotes(Object.fromEntries(entries))
    }).catch(() => {
      if (!cancelled) setServerQuotes({})
    }).finally(() => {
      if (!cancelled) setQuoteLoading(false)
    })
    return () => { cancelled = true }
  }, [plans, selectedDuration, coupon])

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
    document.querySelectorAll('.living-reveal:not(.is-visible)').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [promos.length])
  const availablePromos = promos
  const automaticPromo = availablePromos.find(p => !requiresPromoCode(p) && (!p.starts_at || new Date(p.starts_at).getTime() <= Date.now()))
  const couponPromo = useMemo(() => {
    const code = coupon.trim().toUpperCase()
    if (!code) return null
    return availablePromos.find(p => requiresPromoCode(p) && String(p.promo_code || '').trim().toUpperCase() === code) || null
  }, [coupon, availablePromos])
  const activePromo = coupon.trim() ? couponPromo : automaticPromo
  const promoStartsLater = Boolean(activePromo?.starts_at && new Date(activePromo.starts_at).getTime() > Date.now())
  const selected = plans.find(p => p.key === selectedPlan) || plans[1]
  const currentScene = storyScenes[scene] || storyScenes.kasir
  const SceneIcon = currentScene.icon
  const contactCustom = () => {
    const details = [
      'Halo Tim ChillPos, saya ingin konsultasi Paket Khusus.',
      'Saya membutuhkan masa aktif dan jumlah tenant yang disesuaikan dengan kebutuhan bisnis.',
      'Mohon bantu informasikan pilihan durasi, kuota tenant, harga, dan proses aktivasi yang sesuai.',
      'Nama Perusahaan: ',
      'Kebutuhan jumlah tenant: ',
      'Kebutuhan masa aktif: ',
      'Terima kasih.'
    ].join('\\n')
    window.open('https://t.me/becaaapos?text=' + encodeURIComponent(details), '_blank', 'noopener,noreferrer')
  }
  const contact = (plan, promo, quote) => {
    const details = [
      'Halo Tim ChillPos, saya ingin menanyakan penyewaan layanan.',
      'Paket: ' + plan.name + ' (' + Number(plan.location_limit || 1) + ' tenant tambahan)',
      'Masa sewa: ' + (plan.duration || selectedDuration),
      'Harga normal: ' + money(plan.price),
      promo ? 'Promo: ' + (promo.title || promo.promo_code || 'Promo ChillPos') : '',
      promo ? 'Perkiraan harga setelah diskon: ' + money(Number(quote?.final_price ?? plan.price)) : '',
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
        <a href="#pusat-kendali" onClick={() => setMenuOpen(false)}>Pusat Kendali</a>
        <a href="#fitur" onClick={() => setMenuOpen(false)}>Fitur</a>
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
          <div className="living-kicker"><span className="living-live-dot" /> CINEMATIC DIGITAL SHOWROOM <span className="living-kicker-line" /></div>
          <h1>Bisnis bergerak.<br/><span>Sistem ikut bekerja.</span></h1>
          <p>Kenali cara ChillPos membantu menghubungkan transaksi, produk, stok, tim, dan laporan dalam satu pengalaman operasional yang lebih teratur.</p>
          <div className="living-hero-actions"><a className="living-cta" href="#cerita">Jelajahi cara kerja <ArrowDown size={16}/></a><a className="living-cta living-demo-cta" href="/?screen=register">Pendaftaran Gratis <ArrowUpRight size={14}/></a><a className="living-text-link" href="/login">Sudah punya akun? <span>Masuk workspace <ArrowUpRight size={14}/></span></a></div>
          <div className="living-hero-index"><span>01 — THE PRODUCT EXPERIENCE</span><span>SCROLL TO EXPLORE ↓</span></div>
        </div>
        <div className="living-stage" aria-label="Ilustrasi alur ChillPos">
          <div className="living-stage-ring ring-one" /><div className="living-stage-ring ring-two" /><div className="living-stage-ring ring-three" />
          <div className="living-stage-label label-top"><span>CONNECTED OPERATIONS</span><i /></div>
          <div className="living-stage-core"><img src="/chillpos-mark.svg" alt="" /><span>ONE SYSTEM</span></div>
          <div className="living-node node-pos"><span className="living-node-icon"><ShoppingCart size={18}/></span><small>01 / POS</small><b>Transaksi</b><i>LIVE</i></div>
          <div className="living-node node-team"><span className="living-node-icon"><Users size={18}/></span><small>02 / TEAM</small><b>Tim bekerja</b><i>SYNC</i></div>
          <div className="living-node node-queue"><span className="living-node-icon"><Monitor size={18}/></span><small>03 / QUEUE</small><b>Antrean</b><i>LIVE</i></div>
          <div className="living-node node-stock"><span className="living-node-icon"><Package size={18}/></span><small>04 / STOCK</small><b>Produk</b><i>SYNC</i></div>
          <svg className="living-connectors" viewBox="0 0 600 600" fill="none" aria-hidden="true"><path d="M300 300 L165 170"/><path d="M300 300 L445 160"/><path d="M300 300 L450 425"/><path d="M300 300 L150 435"/></svg>
          <div className="living-stage-caption"><span className="living-caption-pulse" /> REAL-TIME WORKFLOW <span>•</span> BUILT FOR BUSINESS</div>
        </div>
        <div className="living-hero-bottom"><span>CINEMATIC PRODUCT SHOWCASE</span><span>DESIGNED AROUND REAL WORKFLOWS</span><span>01 / 04</span></div>
      </section>

      <section className="living-manifesto living-reveal">
        <div className="living-manifesto-index">CHILLPOS / 2026</div>
        <div className="living-manifesto-copy"><span>SEBUAH USAHA ADALAH ALUR YANG SALING TERHUBUNG.</span><h2>Ketika satu hal bergerak,<br/><em>semuanya ikut bergerak.</em></h2></div>
        <div className="living-manifesto-note">Bukan sekadar mencatat pembayaran. ChillPos membantu pemilik usaha menghubungkan pekerjaan kasir, tim, produk, persediaan, laporan, dan layanan pelanggan dalam satu alur operasional.</div>
      </section>

      <section className="living-bridge living-reveal" id="pusat-kendali">
        <div className="living-bridge-line" aria-hidden="true" />
        <div className="living-bridge-copy"><span className="living-eyebrow">PUSAT KENDALI / OWNER CONTROL CENTER</span><h2>Satu Perusahaan.<br/><em>Tenant tetap dalam kendali.</em></h2><p>Pusat Kendali adalah pusat kendali pemilik Perusahaan untuk melihat daftar tenant, memilih workspace yang akan dikelola, memantau ringkasan bisnis, serta mengatur tim dan pengaturan Perusahaan dari satu tempat.</p><a className="living-inline-link" href="/login">Masuk ke Pusat Kendali <ArrowUpRight size={15}/></a></div>
        <div className="living-bridge-map"><div className="living-map-core"><img src="/chillpos-mark.svg" alt=""/><span>Pusat Kendali</span></div><div className="living-map-item map-one"><Store size={17}/><span>Perusahaan</span></div><div className="living-map-item map-two"><Users size={17}/><span>Tim</span></div><div className="living-map-item map-three"><Monitor size={17}/><span>Tenant</span></div><div className="living-map-item map-four"><BarChart3 size={17}/><span>Laporan</span></div><div className="living-map-link link-one"/><div className="living-map-link link-two"/><div className="living-map-link link-three"/><div className="living-map-link link-four"/></div>
      </section>

      <section className="living-story" id="cerita">
        <div className="living-story-intro living-reveal"><span className="living-eyebrow">CINEMATIC PRODUCT STORY / 01—03</span><h2>Masuk ke dalam alur.<br/><span>Lihat bagaimana semuanya terhubung.</span></h2><p>Lihat bagaimana pekerjaan harian saling terhubung—mulai dari transaksi pelanggan, aktivitas beberapa kasir, hingga pencatatan antrean dan loket.</p></div>
        <div className="living-story-layout">
          <div className="living-story-tabs" role="tablist" aria-label="Pilih alur bisnis">
            {Object.entries(storyScenes).map(([key,item]) => {
              const Icon = item.icon
              return <button type="button" role="tab" aria-selected={scene===key} className={scene===key?'is-active':''} key={key} onClick={() => setScene(key)}><span>{item.index}</span><Icon size={18}/><b>{key==='kasir'?'Transaksi kasir':key==='tim'?'Aktivitas tim':'Sistem antrean'}</b><ArrowUpRight size={15}/></button>
            })}
            <div className="living-story-aside"><Workflow size={18}/><p>Satu alur operasional.<br/>Satu workspace.</p></div>
          </div>
          <div className="living-story-demo" key={scene}>
            <div className="living-demo-top"><span>{currentScene.tag}</span><span><i/> SYSTEM FLOW</span></div>
            <div className="living-demo-copy"><span className="living-demo-index">{currentScene.index} / 03</span><span className="living-eyebrow">{currentScene.eyebrow}</span><h3>{currentScene.title}</h3><p>{currentScene.description}</p><div className="living-demo-status"><span className="living-demo-status-icon"><SceneIcon size={19}/></span><span><small>STATUS SIMULASI</small><b>{currentScene.status}</b></span><CheckCircle2 size={19}/></div></div>
            <div className="living-demo-graphic">
              {scene==='kasir' && <><div className="living-receipt"><div className="living-receipt-head"><span>CHILLPOS / POS</span><span>ORDER #0128</span></div><div className="living-receipt-item"><span>Kopi susu</span><b>Rp18.000</b></div><div className="living-receipt-item"><span>Roti panggang</span><b>Rp15.000</b></div><div className="living-receipt-total"><span>TOTAL</span><b>Rp33.000</b></div><div className="living-receipt-paid"><Check size={14}/> PEMBAYARAN TERCATAT</div></div><div className="living-demo-orb"><ShoppingCart size={24}/><span>TRANSACTION<br/>COMPLETE</span></div></>}
              {scene==='tim' && <><div className="living-team-stack"><div><span className="living-avatar avatar-a">A</span><span><b>Kasir A</b><small>Transaksi #0128</small></span><i>Aktif</i></div><div><span className="living-avatar avatar-b">B</span><span><b>Kasir B</b><small>Transaksi #0129</small></span><i>Aktif</i></div><div><span className="living-avatar avatar-c">C</span><span><b>Kasir C</b><small>Transaksi #0130</small></span><i>Aktif</i></div></div><div className="living-demo-orb"><Users size={24}/><span>MULTI-USER<br/>WORKSPACE</span></div></>}
              {scene==='antrian' && <><div className="living-tv-card"><span>ANTREAN BERIKUTNYA</span><strong>A012</strong><b>Loket / Kasir 2</b><small>Nama pelanggan: Rina</small></div><div className="living-demo-orb"><Monitor size={24}/><span>QUEUE<br/>OPERATIONS</span></div></>}
            </div>
            <div className="living-demo-foot"><span>DEMO ILUSTRATIF • BUKAN DATA LIVE</span><span>EXPLORE NEXT <ArrowRight size={13}/></span></div>
          </div>
        </div>
      </section>

      <section className="living-bridge">
        <div className="living-bridge-line" aria-hidden="true" />
        <div className="living-bridge-copy living-reveal"><span className="living-eyebrow">FROM ONE ACTION TO THE NEXT</span><h2>Lebih sedikit proses terpisah.<br/><em>Lebih banyak hal yang terhubung.</em></h2><p>Satukan proses penjualan, aktivitas karyawan, pengelolaan produk, dan layanan pelanggan agar pemilik usaha punya gambaran operasional yang lebih utuh.</p><a className="living-inline-link" href="#fitur">Jelajahi ekosistem <ArrowRight size={15}/></a></div>
        <div className="living-bridge-map living-reveal"><div className="living-map-core"><img src="/chillpos-mark.svg" alt=""/><span>ChillPos</span></div><div className="living-map-item map-one"><ShoppingCart size={17}/><span>Transaksi</span></div><div className="living-map-item map-two"><Users size={17}/><span>Karyawan</span></div><div className="living-map-item map-three"><Monitor size={17}/><span>Antrean</span></div><div className="living-map-item map-four"><BarChart3 size={17}/><span>Laporan</span></div><div className="living-map-link link-one"/><div className="living-map-link link-two"/><div className="living-map-link link-three"/><div className="living-map-link link-four"/></div>
      </section>

      {activePromo && <section className="living-promo-spotlight" aria-label="Promo ChillPos"><div className="living-promo-spotlight-orbit" aria-hidden="true"/><div className="living-promo-spotlight-label"><Sparkles size={16}/> PENAWARAN CHILLPOS <span className="living-live-dot"/></div><div className="living-promo-spotlight-main"><div><span className="living-eyebrow">PENAWARAN TERBATAS / CHILLPOS</span><h2>{activePromo.title || 'Penawaran khusus ChillPos'}</h2><p>{activePromo.description || 'Dapatkan harga khusus untuk masa akses ChillPos pilihanmu.'}</p><div className="living-promo-spotlight-meta"><span><CheckCircle2 size={14}/> Ketentuan mengikuti paket dan durasi yang memenuhi syarat</span>{activePromo.starts_at && <span><Activity size={14}/> Mulai {new Date(activePromo.starts_at).toLocaleString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})} WIB</span>}</div></div><div className="living-promo-spotlight-value"><small>DISKON</small><strong>{promoDiscountLabel(activePromo)}</strong><span>{promoStartsLater ? 'Segera dimulai' : requiresPromoCode(activePromo) ? 'Gunakan kode promo' : 'Potongan otomatis jika memenuhi syarat'}</span></div></div><a className="living-cta living-cta-light" href="#harga">Lihat harga setelah diskon <ArrowRight size={15}/></a></section>}

      <section className="living-features" id="fitur">
        <div className="living-section-head living-reveal"><div><span className="living-eyebrow">THE DIGITAL PRODUCT GALLERY</span><h2>Setiap fitur punya ruang.<br/><em>Setiap proses punya tujuan.</em></h2></div><p>Jelajahi fitur utama ChillPos dan kenali perannya dalam aktivitas bisnis sehari-hari.</p></div>
        <div className="living-feature-list">{features.map(({number,icon:Icon,title,text},index)=><article className="living-feature-row living-reveal" key={number}><span className="living-feature-number">{number}</span><span className="living-feature-icon"><Icon size={23}/></span><div className="living-feature-copy"><h3>{title}</h3><p>{text}</p></div><span className="living-feature-meta">{index===0?'POINT OF SALE':index===1?'MULTI-ACCOUNT':index===2?'QUEUE DISPLAY':index===3?'CATALOGUE':index===4?'REPORTING':'THERMAL PRINT'}</span><ArrowUpRight className="living-feature-arrow" size={20}/></article>)}</div>
      </section>


      <section className="cinema-product-scene cinema-pos-scene" id="cinema-pos">
        <div className="cinema-product-copy"><span className="cinema-eyebrow">06 / THE POS EXPERIENCE</span><h2>Pelayanan pelanggan.<br/><em>Dalam alur yang jelas.</em></h2><p>Perlihatkan bagaimana tim memilih produk, memeriksa keranjang, dan memahami ringkasan transaksi dalam satu alur kasir.</p><span className="cinema-demo-label">SIMULASI ANTARMUKA • BUKAN TRANSAKSI NYATA</span></div>
        <div className="cinema-pos-preview"><div className="cinema-preview-top"><span/> <span/> <span/><b>CHILLPOS / POS PREVIEW</b></div><div className="cinema-pos-preview-body"><div><b>Daftar produk</b><small>Katalog dan kategori</small><i/><i/><i/><i/></div><aside><b>Keranjang</b><span>Produk contoh <strong>—</strong></span><span>Jumlah item <strong>—</strong></span><hr/><span>Total transaksi <strong>Preview</strong></span><small>Simulasi visual, tidak menyimpan transaksi.</small></aside></div></div>
      </section>
      <section className="cinema-product-scene cinema-inventory-scene" id="cinema-inventory">
        <div className="cinema-inventory-preview"><div><b>Produk & inventaris</b><span>PREVIEW UI</span></div><article><i/><span><b>Produk</b><small>Informasi katalog</small></span><em>Detail</em></article><article><i/><span><b>Kategori</b><small>Pengelompokan produk</small></span><em>Detail</em></article><article><i/><span><b>Persediaan</b><small>Informasi stok</small></span><em>Detail</em></article><article><i/><span><b>Riwayat stok</b><small>Perubahan inventaris</small></span><em>Detail</em></article></div>
        <div className="cinema-product-copy"><span className="cinema-eyebrow">07 / THE INVENTORY GALLERY</span><h2>Produk tertata.<br/><em>Stok lebih terpantau.</em></h2><p>Kenali katalog produk, kategori, informasi persediaan, dan riwayat perubahan stok dalam satu area pengelolaan.</p></div>
      </section>
      <section className="cinema-product-scene cinema-selforder-scene" id="cinema-self-order">
        <div className="cinema-product-copy"><span className="cinema-eyebrow">08 / THE SELF ORDER EXPERIENCE</span><h2>Berikan pelanggan<br/><em>ruang untuk memesan.</em></h2><p>Perkenalkan pengalaman Self Order melalui katalog, keranjang, ringkasan pesanan, dan instruksi pembayaran.</p><span className="cinema-demo-label">DEMO • BUKAN PESANAN NYATA</span></div>
        <div className="cinema-phone-preview"><div className="cinema-phone-screen"><img src="/chillpos-mark.svg" alt=""/><small>SELF ORDER / PREVIEW</small><h3>Menu toko</h3><article><i/><span><b>Produk contoh</b><small>Detail produk</small></span><em>+</em></article><article><i/><span><b>Produk pilihan</b><small>Detail produk</small></span><em>+</em></article><div className="cinema-phone-summary">Ringkasan pesanan <b>Demo checkout</b></div></div></div>
      </section>
      <section className="cinema-product-scene cinema-data-scene" id="cinema-data">
        <div className="cinema-data-heading"><span className="cinema-eyebrow">09 / THE DATA DIMENSION</span><h2>Informasi untuk<br/><em>memahami aktivitas bisnis.</em></h2><p>Ringkasan transaksi, laporan penjualan, dan informasi produk membantu pemilik usaha membaca aktivitas operasional.</p></div>
        <div className="cinema-data-preview"><article><small>RINGKASAN PENJUALAN</small><b>Data laporan</b><div className="cinema-data-bars"><i/><i/><i/><i/><i/><i/><i/></div><span>Ilustrasi tampilan laporan</span></article><article><small>AKTIVITAS TRANSAKSI</small><b>Riwayat operasional</b><div className="cinema-data-lines"><i/><i/><i/><i/></div><span>Ilustrasi daftar aktivitas</span></article><article><small>PRODUK & PERFORMA</small><b>Informasi produk</b><div className="cinema-data-ring"><span>Preview</span></div><span>Ilustrasi analitik</span></article></div>
        <p className="cinema-data-note">Visual dan angka contoh bersifat ilustratif, bukan klaim performa pelanggan.</p>
      </section>
      <section className="cinema-human-scene" id="cinema-team">
        <div className="cinema-human-copy"><span className="cinema-eyebrow">10 / THE HUMAN & WORKSPACE EXPERIENCE</span><h2>Tim bekerja bersama.<br/><em>Akses tetap terarah.</em></h2><p>Pengelolaan akun, peran, dan hak akses membantu setiap anggota tim bekerja sesuai tanggung jawabnya. Pemilik beberapa tenant juga dapat memantau workspace melalui Pusat Kendali.</p><a className="living-inline-link" href="/login">Jelajahi workspace <ArrowUpRight size={15}/></a></div>
        <div className="cinema-human-preview"><div><b>Manajemen tim</b><span>WORKSPACE PREVIEW</span></div><article><i>A</i><span><b>Manager</b><small>Pengelolaan workspace</small></span><em>ROLE</em></article><article><i>B</i><span><b>Karyawan</b><small>Akses operasional</small></span><em>ROLE</em></article><article><i>C</i><span><b>Karyawan</b><small>Akses operasional</small></span><em>ROLE</em></article><small className="cinema-human-note">Contoh tampilan — akses mengikuti pengaturan peran yang berlaku.</small></div>
      </section>


      <section className="living-pricing living-pricing-redesign" id="harga">
        <div className="living-section-head living-reveal">
          <div><span className="living-eyebrow">PAKET SEWA CHILLPOS / 04</span><h2>Satu sistem untuk bisnismu.<br/><em>Pilih kapasitas dan masa sewa.</em></h2></div>
          <p>Gunakan fitur operasional ChillPos sesuai kebutuhan usaha. Pilih paket yang tersedia atau konsultasikan Paket Khusus untuk menentukan masa aktif dan jumlah tenant sesuai kebutuhan bisnismu. Kode aktivasi diterbitkan dan diproses oleh Super Admin.</p>
        </div>
        {activePromo && <article className="living-pricing-promo living-promo-feature" aria-live="polite">
          <div className="living-promo-feature-mark"><Sparkles size={23}/><span>LIMITED<br/>OFFER</span></div>
          <div className="living-promo-feature-copy">
            <div className="living-promo-kicker"><span className="living-live-dot"/> {promoStartsLater ? 'PROMO SEGERA HADIR' : requiresPromoCode(activePromo) ? 'VOUCHER TERSEDIA' : 'PROMO DARI CHILLPOS'} <span className="living-promo-kicker-line"/></div>
            <h3>{activePromo.title || 'Penawaran khusus ChillPos'}</h3>
            <p>{activePromo.description || 'Dapatkan harga khusus untuk paket aktivasi pilihanmu.'}</p>
            <div className="living-promo-details">
              <span><CheckCircle2 size={14}/> Berlaku untuk {eligiblePeriods(activePromo).map(period=>durations.find(d=>d.duration_key===period)?.name||period).join(', ')||'semua durasi'}</span>
              {activePromo.starts_at && <span><Activity size={14}/> Mulai {new Date(activePromo.starts_at).toLocaleString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})} WIB</span>}
              {activePromo.ends_at && <span><Activity size={14}/> Berakhir {new Date(activePromo.ends_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'})}</span>}
              {requiresPromoCode(activePromo) && activePromo.promo_code && <span><Ticket size={14}/> Kode: {activePromo.promo_code}</span>}
            </div>
          </div>
          <div className="living-promo-feature-discount"><small>POTONGAN</small><strong>{promoDiscountLabel(activePromo)}</strong><span>{promoStartsLater ? 'Harga promo ditampilkan sebelum mulai' : requiresPromoCode(activePromo) ? 'Gunakan kode promo' : 'Otomatis di harga paket'}</span></div>
        </article>}
        <div className="living-pricing-toolbar">
          <div><span className="living-eyebrow">PILIH MASA SEWA</span><p>Pilih masa sewa; harga setiap paket akan menyesuaikan.</p></div>
          <div className="living-pricing-live"><i/> HARGA & PROMO TERKINI</div>
        </div>
        <div className="living-duration-picker" role="tablist" aria-label="Pilihan masa sewa">
          {durations.map(duration=><button type="button" role="tab" aria-selected={selectedDuration===duration.duration_key} className={selectedDuration===duration.duration_key?'is-active':''} key={duration.duration_key} onClick={()=>setSelectedDuration(duration.duration_key)}><span>{duration.name}</span><small>{Number(duration.duration_days)} hari</small></button>)}
        </div>
        <div className="living-coupon living-coupon-redesign">
          <label htmlFor="living-coupon"><Ticket size={15}/> Punya kode voucher?</label>
          <div><input id="living-coupon" value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder="Ketik kode voucher di sini"/>{coupon && <button type="button" onClick={()=>setCoupon('')} aria-label="Hapus kode kupon"><X size={15}/></button>}</div>
          {coupon && <small className={serverQuotes[selectedPlan]?.promo_id?'is-valid':''}>{quoteLoading?'Memeriksa voucher dan harga ke server…':serverQuotes[selectedPlan]?.promo_id?'✓ '+(serverQuotes[selectedPlan]?.promo_title||'Voucher ChillPos')+' valid untuk paket dan durasi ini.':'Kode tidak valid, tidak aktif, atau tidak berlaku untuk durasi yang dipilih.'}</small>}
        </div>
        {availablePromos.some(p=>requiresPromoCode(p)) && <div className="living-voucher-list living-voucher-list-redesign">{availablePromos.filter(p=>requiresPromoCode(p)).map(p=><article className={couponPromo?.id===p.id?'is-active':''} key={p.id}>
          <div><span><Ticket size={14}/>{p.title||'Voucher ChillPos'}</span><p>{p.description||'Masukkan kode untuk menggunakan penawaran ini.'}</p><small>Potongan {promoDiscountLabel(p)} · {eligiblePeriods(p).map(period=>durations.find(d=>d.duration_key===period)?.name||period).join(', ')||'Semua durasi'}</small></div>
          <button type="button" onClick={()=>setCoupon(p.promo_code||'')} disabled={!p.promo_code}>{p.promo_code?'Pakai voucher':'Kode tidak tersedia'} <ArrowRight size={13}/></button>
        </article>)}</div>}
        <div className="living-plan-grid living-plan-grid-redesign">
          {plans.map((plan,index)=>{
            const duration=durations.find(d=>d.duration_key===selectedDuration) || durations[0]
            const basePrice=Math.max(0,Number(plan.prices?.[selectedDuration] ?? 0))
            const pricedPlan={...plan,price:basePrice,duration:duration?.name||selectedDuration,duration_days:Number(duration?.duration_days||0)}
            const serverQuote=serverQuotes[plan.key]
            const displayPromo=serverQuote?.promo_id?{id:serverQuote.promo_id,title:serverQuote.promo_title,description:serverQuote.promo_description,discount_type:serverQuote.discount_type,discount_value:serverQuote.discount_value,eligible_periods:serverQuote.eligible_periods,promo_code:serverQuote.promo_code,requires_code:serverQuote.requires_code,starts_at:serverQuote.starts_at,ends_at:serverQuote.ends_at}:null
            const isEligible=Boolean(displayPromo)
            const discount=isEligible?Math.max(0,Number(serverQuote?.discount||0)):0
            const finalPrice=Math.max(0,Number(serverQuote?.final_price ?? basePrice))
            const planFeatures=plan.features?.length?plan.features:defaultFeatures
            return <article className={'living-plan living-plan-redesign'+(plan.popular?' is-popular':'')+(selectedPlan===plan.key?' is-selected':'')} key={plan.key} style={{'--plan-index':index}} onClick={()=>setSelectedPlan(plan.key)}>
              <div className="living-plan-top"><span>{plan.name}</span>{plan.popular&&<b>REKOMENDASI</b>}</div>
              <p className="living-plan-note">{plan.note || 'Pilihan kapasitas tenant tambahan sesuai kebutuhan bisnismu.'}</p>
              <div className="living-plan-location"><Store size={14}/> Kuota {Number(plan.location_limit||1)} tenant tambahan di luar workspace utama</div>
              <div className="living-plan-price-label">{discount>0?'HARGA PROMO':'HARGA PAKET SEWA'}</div>
              <div className="living-price living-price-redesign">{discount>0&&<del>{money(basePrice)}</del>}<strong>{money(finalPrice)}</strong><small>/ {duration?.name||'masa sewa'} ({Number(duration?.duration_days||0)} hari)</small></div>
              {discount>0&&<div className="living-saving living-saving-redesign"><Zap size={13}/> Hemat {money(discount)} <b>−{promoDiscountLabel(displayPromo)}</b></div>}
              {displayPromo && !isEligible && <div className="living-plan-ineligible">Promo tidak berlaku untuk durasi ini</div>}
              <div className="living-plan-divider"/>
              <ul>{planFeatures.map((feature,featureIndex)=><li key={featureIndex}><CheckCircle2 size={14}/>{feature}</li>)}</ul>
              <button className="living-cta living-plan-cta living-plan-cta-redesign" onClick={e=>{e.stopPropagation();contact(pricedPlan,displayPromo&&isEligible?displayPromo:null,serverQuote)}}>{discount>0?'Pilih paket promo':'Tanyakan paket'} <ArrowRight size={14}/></button>
              <span className="living-plan-footnote">Kode aktivasi diterbitkan oleh Super Admin</span>
            </article>
          })}
        </div>
        <article className="living-plan living-plan-redesign living-plan-custom living-reveal">
          <div className="living-plan-top"><span>Paket Khusus</span><b>SESUAI KEBUTUHAN</b></div>
          <p className="living-plan-note">Punya kebutuhan operasional yang berbeda? Kami bantu siapkan skema aktivasi yang menyesuaikan kebutuhan bisnismu.</p>
          <div className="living-custom-highlight"><span><Activity size={16}/></span><div><strong>Lebih fleksibel, tanpa batasan paket standar</strong><small>Diskusikan masa aktif dan jumlah tenant yang kamu perlukan.</small></div></div>
          <ul>
            <li><CheckCircle2 size={14}/>Masa aktif dapat disesuaikan</li>
            <li><CheckCircle2 size={14}/>Jumlah tenant sesuai kebutuhan</li>
            <li><CheckCircle2 size={14}/>Dibantu tim ChillPos untuk proses aktivasi</li>
          </ul>
          <button className="living-cta living-plan-cta living-plan-cta-redesign" onClick={contactCustom}>Konsultasikan kebutuhan <ArrowRight size={14}/></button>
          <span className="living-plan-footnote">Harga dan kuota dibicarakan langsung sesuai permintaan</span>
        </article>
        {!activePromo && <div className="living-no-promo"><span><Activity size={16}/></span><div><b>Belum ada promo otomatis yang aktif</b><p>Voucher berkode tetap bisa digunakan sesuai masa berlaku dan ketentuan promo.</p></div></div>}
        <p className="living-pricing-note">Harga dan informasi promo mengikuti pengaturan aktif di Super Admin. Layanan menggunakan model sewa dengan aktivasi oleh Super Admin, bukan penagihan berulang otomatis.</p>
      </section>

      <section className="living-faq" id="faq"><div className="living-section-head living-reveal"><div><span className="living-eyebrow">GOOD TO KNOW</span><h2>Sebelum mulai,<br/><em>ini yang perlu diketahui.</em></h2></div><p>Jawaban ringkas untuk membantu Anda memahami cara memulai menggunakan ChillPos.</p></div><div className="living-faq-list">{[{q:'Apa yang membedakan paket ChillPos?',a:'Fitur utama ChillPos tersedia untuk setiap paket. Paket reguler menentukan kuota tenant dan harga sesuai masa sewa. Paket Khusus memungkinkan masa aktif serta jumlah tenant ditentukan sesuai kebutuhan melalui konsultasi dengan tim ChillPos.'},{q:'Bagaimana cara mulai menggunakan ChillPos?',a:'Pilih salah satu paket yang tersedia, atau hubungi tim ChillPos melalui Telegram jika membutuhkan Paket Khusus dengan masa aktif dan jumlah tenant yang disesuaikan. Aktivasi diproses oleh Super Admin.'},{q:'Apa itu Pusat Kendali?',a:'Pusat Kendali adalah pusat kendali pemilik Perusahaan untuk melihat dan mengelola tenant dalam satu Perusahaan, termasuk memilih workspace tenant yang akan dikelola. Data dan stok setiap tenant tetap terpisah.'},{q:'Apakah ChillPos mendukung printer thermal?',a:'ChillPos menyediakan alur cetak struk untuk printer thermal yang kompatibel dengan perangkat dan browser yang digunakan.'},{q:'Bisakah beberapa karyawan menjadi kasir bersamaan?',a:'Bisa. Beberapa akun karyawan dapat digunakan pada toko yang sama secara bersamaan. Setiap transaksi tetap tercatat berdasarkan akun kasir yang melayaninya.'},{q:'Apakah data usaha langsung hilang saat masa aktif berakhir?',a:'Berakhirnya masa aktif membatasi akses operasional tenant sesuai status aktivasi. Owner tetap dapat membuka Pusat Kendali untuk melihat informasi Perusahaan, sedangkan data operasional tidak otomatis dihapus hanya karena masa sewa berakhir.'}].map((item,i)=><div className={'living-faq-item'+(faqOpen===i?' is-open':'')} key={item.q}><button onClick={()=>setFaqOpen(faqOpen===i?-1:i)} aria-expanded={faqOpen===i}><span><small>0{i+1}</small>{item.q}</span><ChevronDown size={17}/></button>{faqOpen===i&&<p>{item.a}</p>}</div>)}</div></section>

      <section className="living-final">
        <div className="living-final-orbit" aria-hidden="true"/><div className="living-final-copy living-reveal"><span className="living-eyebrow">THE FINAL INVITATION</span><h2>Mulai dari satu langkah.<br/><em>Bangun operasional lebih terarah.</em></h2><p>Mulai bangun operasional yang lebih teratur dengan alur kasir, tim, produk, laporan, dan layanan pelanggan yang saling terhubung.</p></div>
        <div className="living-final-actions"><a className="living-cta living-cta-light" href="#harga">Pilih paket sewa <ArrowRight size={16}/></a><a className="living-final-login" href="/login">Sudah punya akun? Login workspace <ArrowUpRight size={14}/></a></div>
      </section>
    </main>
    <footer className="living-footer"><Brand footer/><p>ChillPos membantu mengelola operasional toko. Pusat Kendali membantu pemilik Perusahaan mengendalikan tenant dalam satu pusat kendali, dengan data setiap tenant tetap terpisah.</p><div className="living-footer-links"><a href="#cerita">Cara kerja</a><a href="#fitur">Ekosistem</a><a href="#harga">Harga sewa</a><a href="#faq">FAQ</a>{supportChannels.whatsapp_enabled && supportChannels.whatsapp_number && <a href={"https://wa.me/" + supportChannels.whatsapp_number} target="_blank" rel="noreferrer">WhatsApp</a>}{supportChannels.telegram_enabled && supportChannels.telegram_username && <a href={"https://t.me/" + supportChannels.telegram_username} target="_blank" rel="noreferrer">Telegram</a>}</div><small>© {new Date().getFullYear()} ChillPos. Seluruh hak dilindungi.</small></footer>
  </div>
}
