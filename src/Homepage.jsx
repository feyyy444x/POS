import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Building2, Check, CheckCircle2, ChevronDown,
  CircleDollarSign, Monitor, Package, Phone, Printer, Send, ShieldCheck, ShoppingCart,
  Sparkles, Ticket, Users, X, Zap, Activity, Store, Workflow
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './architecture-home.css'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const fallbackDurations = [
  { duration_key: 'daily', name: 'Harian', duration_days: 3, sort_order: 1, is_active: true },
  { duration_key: 'weekly', name: 'Mingguan', duration_days: 7, sort_order: 2, is_active: true },
  { duration_key: 'monthly', name: 'Bulanan', duration_days: 30, sort_order: 3, is_active: true },
  { duration_key: 'yearly', name: 'Tahunan', duration_days: 365, sort_order: 4, is_active: true },
]
const defaultFeatures = ['Semua fitur NexaPos', 'POS dan transaksi', 'Produk dan stok terpisah per tenant/lokasi', 'Laporan operasional', 'Sistem antrean dan struk']
const fallbackPlans = [
  { key: 'starter', name: 'Starter', location_limit: 3, note: 'Untuk usaha yang mulai menambah tenant operasional', prices: { daily: 5000, weekly: 15000, monthly: 49000, yearly: 490000 }, features: defaultFeatures, popular: false, sort_order: 1 },
  { key: 'growth', name: 'Growth', location_limit: 5, note: 'Untuk bisnis yang mulai berkembang', prices: { daily: 10000, weekly: 30000, monthly: 99000, yearly: 990000 }, features: defaultFeatures, popular: false, sort_order: 2 },
  { key: 'business', name: 'Business', location_limit: 10, note: 'Untuk bisnis dengan beberapa lokasi', prices: { daily: 15000, weekly: 50000, monthly: 179000, yearly: 1790000 }, features: defaultFeatures, popular: true, sort_order: 3 },
  { key: 'enterprise', name: 'Enterprise', location_limit: 15, note: 'Untuk jaringan usaha yang lebih besar', prices: { daily: 25000, weekly: 85000, monthly: 299000, yearly: 2990000 }, features: defaultFeatures, popular: false, sort_order: 4 },
]
const features = [
  { number: '01', icon: ShoppingCart, title: 'Transaksi lebih praktis', text: 'Layani pelanggan dari satu layar: pilih produk, hitung total otomatis, proses pembayaran, dan simpan riwayat transaksi dengan lebih rapi.' },
  { number: '02', icon: Users, title: 'Banyak Karyawan, tetap terpantau', text: 'Berikan akun masing-masing kepada karyawan. Beberapa Karyawan dapat melayani pelanggan secara bersamaan, sementara setiap transaksi tetap memiliki identitas Karyawan yang mengerjakannya.' },
  { number: '03', icon: Monitor, title: 'Antrean sesuai alur pelayanan', text: 'Catat nama pelanggan, nomor antrean, dan loket atau petugas yang melayani. Aktifkan atau nonaktifkan fitur antrean sesuai kebutuhan toko.' },
  { number: '04', icon: Package, title: 'Produk dan stok lebih tertata', text: 'Susun katalog, kategori, harga, dan informasi persediaan dalam satu tempat agar tim lebih mudah menemukan produk dan memantau kebutuhan stok.' },
  { number: '05', icon: BarChart3, title: 'Laporan untuk memahami usaha', text: 'Lihat riwayat transaksi dan ringkasan penjualan untuk membantu memantau aktivitas toko serta menjadi bahan evaluasi operasional.' },
  { number: '06', icon: Printer, title: 'Struk transaksi siap dicetak', text: 'Selesaikan transaksi dengan bukti pembayaran yang dapat dicetak melalui printer thermal yang kompatibel dengan perangkat dan browser Anda.' },
]
const storyScenes = {
  kasir: { index: '01', eyebrow: 'SAAT TRANSAKSI DIMULAI', title: 'Dari pilih produk hingga transaksi tercatat.', description: 'Karyawan memilih produk, memeriksa total, memproses pembayaran, lalu menyimpan transaksi dalam satu alur kerja.', icon: ShoppingCart, status: 'Transaksi tersimpan', tag: 'POS WORKSPACE' },
  tim: { index: '02', eyebrow: 'SAAT TIM BEKERJA BERSAMA', title: 'Setiap Karyawan bekerja dengan akunnya.', description: 'Karyawan dapat menggunakan akun masing-masing secara bersamaan. Transaksi tetap tercatat atas nama akun yang mengerjakannya.', icon: Users, status: 'Akun tim terhubung', tag: 'TEAM OPERATIONS' },
  antrean: { index: '03', eyebrow: 'SAAT PELANGGAN MENUNGGU', title: 'Antrean tetap jelas dan sederhana.', description: 'Catat nama pelanggan, nomor antrean, dan loket atau petugas yang melayani. Antrean dapat diaktifkan atau dinonaktifkan sesuai kebutuhan toko.', icon: Monitor, status: 'Antrean operasional', tag: 'QUEUE OPERATIONS' },
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
  return <a className={'living-brand' + (footer ? ' living-brand-footer' : '')} href="/" aria-label="NexaPos beranda">
    <img src="/nexapos-mark.svg" alt="" />
    <span>Nexa<span>Pos</span><small>SMART COMMERCE</small></span>
  </a>
}
export default function Homepage() {
  const [plans, setPlans] = useState([])
  const [durations, setDurations] = useState([])
  const [selectedDuration, setSelectedDuration] = useState('monthly')
  const [promos, setPromos] = useState([])
  const [supportChannels, setSupportChannels] = useState({ whatsapp_enabled: false, whatsapp_number: '', telegram_enabled: false, telegram_username: '' })
  const [serverQuotes, setServerQuotes] = useState({})
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('growth')
  const [faqOpen, setFaqOpen] = useState(0)
  const [scene, setScene] = useState('kasir')

  const loadPromos = useCallback(async () => {
    if (!supabase) { setPromos([]); return }
    const { data, error } = await supabase.from('site_promotions')
      .select('id,title,description,discount_type,discount_value,eligible_periods,promo_code,requires_code,starts_at,ends_at,is_active')
      .eq('is_active', true)
    if (error) { setPromos([]); return }
    const now = Date.now()
    setPromos((data || []).filter(p => ((!p.starts_at || new Date(p.starts_at).getTime() <= now) && (!p.ends_at || new Date(p.ends_at).getTime() >= now)) || (p.starts_at && new Date(p.starts_at).getTime() > now && (!p.ends_at || new Date(p.ends_at).getTime() >= now))))
  }, [])
  useEffect(() => {
    if (!supabase) return
    loadPromos()
    const channel = supabase.channel('homepage-promotions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_promotions' }, loadPromos)
      .subscribe()
    const refresh = () => { if (document.visibilityState === 'visible') loadPromos() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      supabase.removeChannel(channel)
    }
  }, [loadPromos])
  useEffect(() => {
    if (!supabase) return
    let mounted = true
    const loadSupportChannels = async () => {
      const { data, error } = await supabase.from('support_channel_settings')
        .select('whatsapp_enabled,whatsapp_number,telegram_enabled,telegram_username')
        .eq('id', 1).maybeSingle()
      if (error || !data || !mounted) return
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
    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [])
  useEffect(() => {
    if (!supabase) { setPlans([]); setDurations([]); return }
    let mounted = true
    const loadPricing = async () => {
      const [packageResult, durationResult] = await Promise.all([
        supabase.from('site_activation_packages').select('package_key,name,location_limit,note,prices,features,is_popular,is_active,sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('site_activation_durations').select('duration_key,name,duration_days,sort_order,is_active').eq('is_active', true).order('sort_order', { ascending: true }),
      ])
      if (!mounted) return
      if (durationResult.error) {
        setDurations([])
      } else {
        const allowed = new Map((durationResult.data || [])
          .filter(d => ['daily', 'weekly', 'monthly', 'yearly'].includes(String(d.duration_key || '').trim().toLowerCase()))
          .map(d => [d.duration_key, d]))
        const next = fallbackDurations.filter(d => allowed.has(d.duration_key)).map(d => ({
          ...d, ...allowed.get(d.duration_key),
          duration_days: Number(allowed.get(d.duration_key)?.duration_days ?? d.duration_days),
        }))
        setDurations(next)
        setSelectedDuration(current => next.some(d => d.duration_key === current) ? current : (next.find(d => d.duration_key === 'monthly')?.duration_key || next[0]?.duration_key || ''))
      }
      if (packageResult.error) {
        setPlans([])
      } else {
        setPlans((packageResult.data || [])
          .filter(plan => ['starter', 'growth', 'business', 'enterprise', 'single_workspace'].includes(String(plan.package_key || '').trim().toLowerCase()))
          .filter(plan => !/custom/i.test(String(plan.name || '')))
          .map(plan => ({
            ...plan,
            prices: plan.prices && typeof plan.prices === 'object' ? plan.prices : {},
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
      .subscribe()
    const durationChannel = supabase.channel('homepage-activation-durations-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_activation_durations' }, loadPricing)
      .subscribe()
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
  useEffect(() => {
    if (!supabase || !plans.length || !selectedDuration) { setServerQuotes({}); setQuoteLoading(false); return }
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
    })).then(entries => { if (!cancelled) setServerQuotes(Object.fromEntries(entries)) })
      .catch(() => { if (!cancelled) setServerQuotes({}) })
      .finally(() => { if (!cancelled) setQuoteLoading(false) })
    return () => { cancelled = true }
  }, [plans, selectedDuration, coupon])

  const availablePromos = promos
  const automaticPromo = availablePromos.find(p => !requiresPromoCode(p) && (!p.starts_at || new Date(p.starts_at).getTime() <= Date.now()))
  const couponPromo = useMemo(() => {
    const code = coupon.trim().toUpperCase()
    if (!code) return null
    return availablePromos.find(p => requiresPromoCode(p) && String(p.promo_code || '').trim().toUpperCase() === code) || null
  }, [coupon, availablePromos])
  const activePromo = coupon.trim() ? couponPromo : automaticPromo
  const promoStartsLater = Boolean(activePromo?.starts_at && new Date(activePromo.starts_at).getTime() > Date.now())
  const supportAvailable = Boolean((supportChannels.telegram_enabled && supportChannels.telegram_username) || (supportChannels.whatsapp_enabled && supportChannels.whatsapp_number))
  const openSupport = (details) => {
    const message = encodeURIComponent(details)
    if (supportChannels.telegram_enabled && supportChannels.telegram_username) {
      window.open('https://t.me/' + supportChannels.telegram_username + '?text=' + message, '_blank', 'noopener,noreferrer')
      return
    }
    if (supportChannels.whatsapp_enabled && supportChannels.whatsapp_number) {
      window.open('https://wa.me/' + supportChannels.whatsapp_number + '?text=' + message, '_blank', 'noopener,noreferrer')
    }
  }
  const contactCustom = () => openSupport([
    'Halo Tim NexaPos, saya ingin konsultasi Paket Khusus.',
    'Saya membutuhkan masa aktif dan jumlah tenant yang disesuaikan dengan kebutuhan bisnis.',
    'Nama usaha/organisasi: ',
    'Kebutuhan jumlah tenant: ',
    'Kebutuhan masa aktif: ',
    'Mohon informasi pilihan dan proses aktivasinya. Terima kasih.'
  ].join('\n'))
  const contact = (plan, promo, quote) => openSupport([
    'Halo Tim NexaPos, saya ingin menanyakan aktivasi layanan.',
    'Paket: ' + plan.name + (plan.key === 'single_workspace' ? ' (satu workspace mandiri)' : ' (' + Number(plan.location_limit || 1) + ' tenant tambahan)'),
    'Masa sewa: ' + (plan.duration || selectedDuration),
    'Harga yang ditampilkan: ' + money(plan.price),
    promo ? 'Promo: ' + (promo.title || promo.promo_code || 'Promo NexaPos') : '',
    promo ? 'Perkiraan harga setelah diskon: ' + money(Number(quote?.final_price ?? plan.price)) : '',
    coupon.trim() ? 'Kode voucher: ' + coupon.trim().toUpperCase() : '',
    'Mohon informasi mengenai proses aktivasi dan pembayaran. Terima kasih.'
  ].filter(Boolean).join('\n'))
  return <div className="architecture-home">
    <header className="arch-nav">
      <Brand />
      <button className="arch-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Tutup navigasi' : 'Buka navigasi'}>{menuOpen ? <X size={20}/> : <span><i/><i/></span>}</button>
      <nav className={menuOpen ? 'arch-nav-links is-open' : 'arch-nav-links'}>
        <a href="#sistem" onClick={() => setMenuOpen(false)}>Sistem</a>
        <a href="#ruang-kerja" onClick={() => setMenuOpen(false)}>Workspace</a>
        <a href="#kapabilitas" onClick={() => setMenuOpen(false)}>Kapabilitas</a>
        <a href="#aktivasi" onClick={() => setMenuOpen(false)}>Aktivasi</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
      </nav>
      <div className="arch-nav-actions"><a className="arch-login" href="/login">Masuk <ArrowUpRight size={14}/></a><a className="arch-nav-cta" href="#aktivasi">Jelajahi aktivasi <ArrowRight size={14}/></a></div>
    </header>

    <main>
      <section className="arch-hero">
        <div className="arch-hero-grid" aria-hidden="true"/>
        <div className="arch-hero-coordinate" aria-hidden="true">07° / NEXA / 26</div>
        <div className="arch-hero-copy">
          <div className="arch-kicker"><span/> BUSINESS OPERATIONS / DIGITAL ARCHITECTURE</div>
          <h1>Bangun alur.<br/><em>Kendalikan bisnis.</em></h1>
          <p>NexaPos menyatukan transaksi, produk, stok, tim, dan laporan dalam workspace operasional. Untuk pemilik multi-tenant, NexaSpace menjadi pusat kendali organisasi.</p>
          <div className="arch-hero-actions"><a className="arch-primary-cta" href="#sistem">Kenali sistem <ArrowDown size={16}/></a><a className="arch-secondary-cta" href="/?screen=demo">Lihat demo interaktif <ArrowUpRight size={15}/></a></div>
          <div className="arch-hero-foot"><span>01 — SYSTEM OVERVIEW</span><span>SCROLL TO EXPLORE</span></div>
        </div>
        <div className="arch-hero-structure" aria-label="Struktur sistem NexaPos">
          <div className="arch-structure-top"><span>OPERATIONAL FRAMEWORK</span><span>NP / 001</span></div>
          <div className="arch-structure-mark"><img src="/nexapos-mark.svg" alt=""/><span>NEXAPOS</span><small>SMART COMMERCE</small></div>
          <div className="arch-structure-axis axis-x"/><div className="arch-structure-axis axis-y"/>
          <div className="arch-structure-node node-a"><small>01 / SELL</small><b>Transaksi</b><ShoppingCart size={17}/></div>
          <div className="arch-structure-node node-b"><small>02 / MANAGE</small><b>Produk & stok</b><Package size={17}/></div>
          <div className="arch-structure-node node-c"><small>03 / OPERATE</small><b>Tim & akses</b><Users size={17}/></div>
          <div className="arch-structure-node node-d"><small>04 / ANALYZE</small><b>Laporan</b><BarChart3 size={17}/></div>
          <div className="arch-structure-caption"><i/> ONE OPERATIONAL SYSTEM</div>
        </div>
        <div className="arch-hero-index"><span>DESIGNED AROUND REAL BUSINESS WORKFLOWS</span><span>SCROLL ↓</span></div>
      </section>

      <section className="arch-manifesto" id="sistem">
        <div className="arch-section-index"><span>01</span><small>THE FRAMEWORK</small></div>
        <div className="arch-manifesto-main"><span className="arch-overline">OPERASIONAL YANG TERHUBUNG</span><h2>Bukan sekadar mencatat transaksi.<br/><em>Susun cara bisnis bekerja.</em></h2></div>
        <p className="arch-manifesto-note">Kelola pekerjaan harian dari satu sistem: layani pelanggan, atur katalog dan persediaan, berikan akses kepada tim, serta tinjau aktivitas penjualan.</p>
      </section>

      <section className="arch-workspace-section" id="ruang-kerja">
        <div className="arch-section-heading"><div><span className="arch-overline">02 / WORKSPACE ARCHITECTURE</span><h2>Pilih struktur kerja<br/><em>yang sesuai dengan bisnismu.</em></h2></div><p>Setiap model workspace memiliki tujuan berbeda. Pemisahan ini menjaga pengelolaan organisasi dan kegiatan operasional tetap jelas.</p></div>
        <div className="arch-workspace-grid">
          <article className="arch-workspace-card arch-workspace-organization">
            <div className="arch-workspace-card-top"><span>MODEL 01 / MULTI-TENANT</span><Building2 size={18}/></div>
            <div className="arch-workspace-graphic arch-org-graphic"><div className="arch-org-core"><img src="/nexapos-mark.svg" alt=""/><b>NexaSpace</b><small>ORGANIZATION HUB</small></div><span className="arch-org-branch branch-one">TENANT 01</span><span className="arch-org-branch branch-two">TENANT 02</span><span className="arch-org-branch branch-three">TENANT 03</span></div>
            <div className="arch-workspace-copy"><span className="arch-overline">UNTUK PEMILIK ORGANISASI</span><h3>NexaSpace</h3><p>Pusat kendali Owner untuk melihat organisasi, mengelola tenant sesuai kuota, mengatur anggota, memantau aktivitas, dan berpindah workspace.</p><ul><li><Check size={14}/> Direktori dan pengelolaan tenant</li><li><Check size={14}/> Kuota serta masa aktivasi</li><li><Check size={14}/> Tim dan laporan organisasi</li></ul><a href="/login">Masuk melalui akun Owner <ArrowUpRight size={15}/></a></div>
          </article>
          <article className="arch-workspace-card arch-workspace-independent">
            <div className="arch-workspace-card-top"><span>MODEL 02 / SINGLE WORKSPACE</span><Store size={18}/></div>
            <div className="arch-workspace-graphic arch-single-graphic"><div className="arch-single-frame"><span>INDEPENDENT</span><strong>01</strong><small>BUSINESS WORKSPACE</small></div><div className="arch-single-axis"/></div>
            <div className="arch-workspace-copy"><span className="arch-overline">UNTUK OWNER MANDIRI</span><h3>Single Workspace</h3><p>Model workspace mandiri untuk Owner yang mengelola satu operasional POS tanpa pusat organisasi NexaSpace atau manajemen tenant.</p><ul><li><Check size={14}/> Satu workspace POS independen</li><li><Check size={14}/> Owner mengelola fitur workspace</li><li><Check size={14}/> Tim, produk, stok, dan transaksi</li></ul><span className="arch-availability-note">Ketersediaan penawaran mengikuti status paket yang diaktifkan Admin.</span></div>
          </article>
        </div>
      </section>

      <section className="arch-process">
        <div className="arch-process-head"><span className="arch-overline">03 / OPERATIONAL SEQUENCE</span><h2>Setiap aktivitas punya<br/><em>tempat dan urutannya.</em></h2></div>
        <div className="arch-process-list">
          <article><span>01</span><div><ShoppingCart size={20}/><h3>Layani transaksi</h3><p>Pilih produk, periksa keranjang, proses pembayaran, dan simpan riwayat transaksi.</p></div><small>POINT OF SALE</small></article>
          <article><span>02</span><div><Package size={20}/><h3>Kelola katalog & stok</h3><p>Atur kategori, produk, harga, dan persediaan di workspace masing-masing.</p></div><small>INVENTORY</small></article>
          <article><span>03</span><div><Users size={20}/><h3>Atur tim dan akses</h3><p>Berikan akun serta hak akses sesuai peran Owner, Manager, atau Karyawan.</p></div><small>TEAM OPERATIONS</small></article>
          <article><span>04</span><div><BarChart3 size={20}/><h3>Tinjau hasil operasional</h3><p>Gunakan riwayat transaksi dan laporan untuk memahami aktivitas bisnis.</p></div><small>BUSINESS INSIGHT</small></article>
        </div>
      </section>

      <section className="arch-capabilities" id="kapabilitas">
        <div className="arch-section-heading"><div><span className="arch-overline">04 / PRODUCT CAPABILITIES</span><h2>Dirancang untuk<br/><em>pekerjaan yang nyata.</em></h2></div><p>Deskripsi berikut mengikuti kemampuan produk yang tersedia. Ketersediaan setiap tindakan tetap mengikuti peran, izin, dan konfigurasi workspace.</p></div>
        <div className="arch-capability-grid">{features.map(({number,icon:Icon,title,text})=><article className="arch-capability" key={number}><div className="arch-capability-top"><span>{number}</span><Icon size={20}/></div><h3>{title}</h3><p>{text}</p><span className="arch-capability-rule"/></article>)}</div>
        <div className="arch-capability-foot"><span><ShieldCheck size={16}/> AKSES BERDASARKAN PERAN</span><p>Owner, Manager, dan Karyawan melihat fungsi sesuai kewenangannya. Data dan stok setiap tenant tetap terpisah.</p></div>
      </section>

      <section className="arch-activation" id="aktivasi">
        <div className="arch-activation-heading"><div><span className="arch-overline">05 / ACTIVATION & RENTAL</span><h2>Pilih masa sewa.<br/><em>Sesuaikan kapasitas.</em></h2></div><p>NexaPos menggunakan model sewa dengan aktivasi yang diproses oleh Super Admin. Harga, paket, dan promo mengikuti konfigurasi aktif.</p></div>
        {activePromo && <article className="arch-promo"><div><span className="arch-overline">PENAWARAN AKTIF</span><h3>{activePromo.title || 'Penawaran NexaPos'}</h3><p>{activePromo.description || 'Ketentuan promo mengikuti paket dan masa sewa yang memenuhi syarat.'}</p></div><strong>{promoDiscountLabel(activePromo)}<small>POTONGAN</small></strong><span className="arch-promo-note">{requiresPromoCode(activePromo) ? 'Voucher memerlukan kode' : promoStartsLater ? 'Promo segera dimulai' : 'Promo otomatis jika memenuhi syarat'}</span></article>}
        <div className="arch-duration-row"><div><span className="arch-overline">PILIH MASA AKTIF</span><p>Harga menyesuaikan durasi yang dipilih.</p></div><div className="arch-duration-options" role="tablist" aria-label="Pilihan masa sewa">{durations.map(duration=><button type="button" role="tab" aria-selected={selectedDuration===duration.duration_key} className={selectedDuration===duration.duration_key?'is-active':''} key={duration.duration_key} onClick={()=>setSelectedDuration(duration.duration_key)}><b>{duration.name}</b><small>{Number(duration.duration_days)} hari</small></button>)}</div></div>
        <div className="arch-voucher-row"><label htmlFor="arch-voucher"><Ticket size={15}/> Kode voucher</label><div><input id="arch-voucher" value={coupon} onChange={event=>setCoupon(event.target.value.toUpperCase())} placeholder="Masukkan kode jika memilikinya"/>{coupon&&<button type="button" onClick={()=>setCoupon('')} aria-label="Hapus kode voucher"><X size={15}/></button>}</div><small>{coupon ? quoteLoading ? 'Memeriksa voucher ke server…' : serverQuotes[selectedPlan]?.promo_id ? 'Voucher terverifikasi untuk paket dan durasi ini.' : 'Kode belum valid untuk pilihan paket dan durasi ini.' : 'Voucher hanya berlaku sesuai ketentuan promo.'}</small></div>
        {availablePromos.some(p=>requiresPromoCode(p)) && <div className="arch-voucher-list">{availablePromos.filter(p=>requiresPromoCode(p)).map(p=><article key={p.id}><div><b>{p.title || 'Voucher NexaPos'}</b><p>{p.description || 'Masukkan kode untuk memeriksa kelayakan penawaran.'}</p><small>Potongan {promoDiscountLabel(p)}</small></div><button type="button" onClick={()=>setCoupon(p.promo_code||'')} disabled={!p.promo_code}>Gunakan kode <ArrowRight size={13}/></button></article>)}</div>}
        <div className="arch-plan-grid">
          {plans.length ? plans.map((plan,index)=>{
            const duration=durations.find(d=>d.duration_key===selectedDuration) || durations[0]
            const basePrice=Math.max(0,Number(plan.prices?.[selectedDuration] ?? 0))
            const pricedPlan={...plan,price:basePrice,duration:duration?.name||selectedDuration,duration_days:Number(duration?.duration_days||0)}
            const serverQuote=serverQuotes[plan.key]
            const displayPromo=serverQuote?.promo_id?{id:serverQuote.promo_id,title:serverQuote.promo_title,description:serverQuote.promo_description,discount_type:serverQuote.discount_type,discount_value:serverQuote.discount_value,eligible_periods:serverQuote.eligible_periods,promo_code:serverQuote.promo_code,requires_code:serverQuote.requires_code,starts_at:serverQuote.starts_at,ends_at:serverQuote.ends_at}:null
            const discount=displayPromo?Math.max(0,Number(serverQuote?.discount||0)):0
            const finalPrice=Math.max(0,Number(serverQuote?.final_price ?? basePrice))
            return <article className={'arch-plan'+(plan.popular?' is-popular':'')+(selectedPlan===plan.key?' is-selected':'')} key={plan.key}>
              <div className="arch-plan-top"><span>0{index+1} / {plan.name.toUpperCase()}</span>{plan.popular&&<b>REKOMENDASI</b>}</div>
              <p>{plan.note || 'Pilihan kapasitas sesuai kebutuhan operasional.'}</p>
              {plan.key==='single_workspace' ? <div className="arch-plan-quota"><Store size={14}/> 1 workspace mandiri</div> : <div className="arch-plan-quota"><Store size={14}/> Kuota {Number(plan.location_limit||1)} tenant tambahan di luar workspace utama</div>}
              <div className="arch-plan-price-label">{discount>0?'HARGA SETELAH PROMO':'HARGA SEWA'}</div>
              {discount>0&&<del>{money(basePrice)}</del>}<strong className="arch-plan-price">{money(finalPrice)}</strong><small className="arch-plan-period">/ {duration?.name||'durasi'} · {Number(duration?.duration_days||0)} hari</small>
              {discount>0&&<span className="arch-plan-saving">Hemat {money(discount)} · {promoDiscountLabel(displayPromo)}</span>}
              <ul>{(plan.features?.length?plan.features:defaultFeatures).map((feature,i)=><li key={i}><Check size={14}/>{feature}</li>)}</ul>
              <button type="button" disabled={!supportAvailable} onClick={()=>{setSelectedPlan(plan.key);contact(pricedPlan,displayPromo,serverQuote)}}>{supportAvailable ? "Tanyakan paket ini" : "Kanal konsultasi belum tersedia"} <ArrowUpRight size={15}/></button>
              <small className="arch-plan-foot">Kode aktivasi diterbitkan oleh Super Admin.</small>
            </article>
          }) : <div className="arch-pricing-unavailable"><ShieldCheck size={20}/><div><b>Informasi paket belum tersedia.</b><p>Harga dan pilihan aktivasi akan ditampilkan setelah konfigurasi paket aktif berhasil dimuat. Silakan masuk kembali nanti atau hubungi tim NexaPos melalui kanal dukungan yang tersedia.</p></div></div>}
        </div>
        <article className="living-plan living-plan-redesign living-plan-custom arch-special-plan"><div><span className="arch-overline">CUSTOM ARRANGEMENT / PAKET KHUSUS</span><h3>Operasional dengan kebutuhan khusus?</h3><p>Diskusikan masa aktif dan jumlah tenant sesuai kebutuhan. Harga dan kuota tidak ditampilkan secara publik; detail ditentukan melalui konsultasi dan proses aktivasi oleh Admin.</p><ul><li>Masa aktif dapat disesuaikan</li><li>Jumlah tenant sesuai kebutuhan</li></ul></div><button type="button" disabled={!supportAvailable} onClick={contactCustom}>{supportAvailable ? "Konsultasikan kebutuhan" : "Kanal konsultasi belum tersedia"} <ArrowUpRight size={15}/></button></article>
        {/* Pricing audit boundary: {!activePromo && <div className="living-no-promo"> */}
        <p className="arch-activation-footnote">Informasi harga dan promo mengikuti data serta ketentuan aktif di sistem. Aktivasi bukan penagihan berulang otomatis.</p>
      </section>

      <section className="arch-faq" id="faq">
        <div className="arch-faq-heading"><span className="arch-overline">06 / FREQUENTLY ASKED QUESTIONS</span><h2>Hal penting,<br/><em>sebelum mulai.</em></h2><p>Jawaban ini menjelaskan model kerja dan batasan NexaPos berdasarkan fungsi produk saat ini.</p></div>
        <div className="arch-faq-list">{[
          {q:'Apa yang dapat dikelola melalui NexaPos?',a:'NexaPos menyediakan alur POS untuk transaksi, pengelolaan produk dan stok, tim dan hak akses, laporan, serta antrean operasional. Fitur yang terlihat mengikuti peran dan izin akun.'},
          {q:'Apa perbedaan NexaSpace dan Single Workspace?',a:'NexaSpace adalah pusat kendali Owner untuk organisasi dengan beberapa tenant. Single Workspace adalah model terpisah untuk Owner yang mengelola satu workspace mandiri tanpa NexaSpace. Penawaran Single Workspace hanya tersedia ketika paketnya diaktifkan Admin.'},
          {q:'Bagaimana cara mendapatkan akses?',a:'Pilih paket dan masa sewa yang tersedia, lalu hubungi kanal dukungan NexaPos. Aktivasi diproses oleh Super Admin dan kode aktivasi diberikan melalui proses yang ditetapkan.'},
          {q:'Apakah semua paket memiliki fitur yang sama?',a:'Paket reguler menggunakan kemampuan operasional NexaPos yang sama. Perbedaan paket reguler terutama pada kuota tenant dan harga berdasarkan masa sewa. Rincian yang tampil mengikuti konfigurasi aktif.'},
          {q:'Apakah stok dapat dipindahkan antar-tenant?',a:'Tidak. Produk dan stok dikelola pada masing-masing tenant. Data stok antar-tenant tetap terisolasi dan tidak tersedia fitur transfer stok lintas tenant.'},
          {q:'Bisakah beberapa Karyawan bertransaksi bersamaan?',a:'Ya. Beberapa akun dapat bekerja pada tenant yang sama secara bersamaan. Identitas akun yang mengerjakan transaksi tetap dicatat.'},
          {q:'Apa yang ditampilkan pada antrean?',a:'Antrean operasional menampilkan nomor antrean, nama pelanggan, dan konter atau kasir/loket. Fitur media, video, dan template TV tidak termasuk dalam sistem antrean saat ini.'},
          {q:'Apakah masa aktif berakhir berarti data langsung dihapus?',a:'Tidak. Berakhirnya masa aktif membatasi operasi tenant sesuai status aktivasi. Data tidak otomatis dihapus hanya karena masa aktif berakhir; akses Owner ke NexaSpace mengikuti aturan status organisasi.'},
          {q:'Apakah NexaPos mendukung cetak struk?',a:'NexaPos menyediakan fungsi cetak struk. Kompatibilitas printer thermal bergantung pada perangkat, browser, koneksi, dan konfigurasi printer yang digunakan.'},
          {q:'Apakah tersedia pemesanan mandiri?',a:'Fitur Self Order tersedia pada aplikasi untuk tenant yang mengaktifkan dan mengonfigurasinya. Ketersediaan menu dan proses pemesanan mengikuti pengaturan tenant.'}
        ].map((item,i)=><article className={faqOpen===i?'is-open':''} key={item.q}><button type="button" aria-expanded={faqOpen===i} onClick={()=>setFaqOpen(faqOpen===i?-1:i)}><span><small>0{i+1}</small>{item.q}</span><ChevronDown size={17}/></button>{faqOpen===i&&<p>{item.a}</p>}</article>)}</div>
      </section>

      <section className="arch-contact">
        <div><span className="arch-overline">07 / START WITH THE RIGHT WORKSPACE</span><h2>Siapkan sistem<br/><em>untuk langkah berikutnya.</em></h2><p>Jelajahi model workspace, periksa pilihan aktivasi yang tersedia, atau masuk jika akun NexaPos Anda sudah aktif.</p></div>
        <div className="arch-contact-actions"><a href="#aktivasi" className="arch-primary-cta">Lihat pilihan aktivasi <ArrowRight size={15}/></a><a href="/login" className="arch-contact-login">Sudah punya akun? Masuk ke workspace <ArrowUpRight size={15}/></a></div>
      </section>
    </main>
    <footer className="arch-footer"><Brand footer/><p>NexaPos — sistem operasional untuk transaksi, produk, stok, tim, dan pengelolaan workspace bisnis.</p><div>{supportChannels.whatsapp_enabled&&supportChannels.whatsapp_number&&<a href={'https://wa.me/'+supportChannels.whatsapp_number} target="_blank" rel="noreferrer"><Phone size={14}/> WhatsApp</a>}{supportChannels.telegram_enabled&&supportChannels.telegram_username&&<a href={'https://t.me/'+supportChannels.telegram_username} target="_blank" rel="noreferrer"><Send size={14}/> Telegram</a>}<a href="/login">Login <ArrowUpRight size={14}/></a></div><small>© {new Date().getFullYear()} NexaPos. Seluruh hak dilindungi.</small></footer>
  </div>

}
