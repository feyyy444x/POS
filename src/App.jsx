import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowLeft, KeyRound, Copy, Building2, Power, Eye, BarChart3, Bell, Boxes, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Clock3, CreditCard, FileText, Headphones, LayoutDashboard,
  LogOut, Menu, Minus, Monitor, Package, Plus, Printer, QrCode, RefreshCw, Search,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, SkipForward, Store, Ticket, Trash2,
  TrendingUp, UserRound, Users, UserPlus, CalendarDays, Ban, Archive, Mail, Wallet, X
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'
import SupportCenter from './SupportCenter.jsx'
import Homepage from './Homepage.jsx'
import Demo from './Demo.jsx'
import PromotionManager from './PromotionManager.jsx'
import SubscriptionPlanManager from './SubscriptionPlanManager.jsx'
import TvDisplaySettings from './TvDisplaySettings.jsx'
import PlatformStaffManager from './PlatformStaffManager.jsx'
import StoreControlCenter from './StoreControlCenter.jsx'
import AuditLogPanel from './AuditLogPanel.jsx'
import OrganizationReports from './OrganizationReports.jsx'
import OrganizationOperations from './OrganizationOperations.jsx'
import OrganizationSettings from './OrganizationSettings.jsx'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

async function fetchOwnerOrganizationTenants() {
  return supabase.rpc('owner_list_organization_tenant_profiles')
}
const shortTime = (value) => new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
const initial = (name) => (name || 'N').trim().slice(0, 1).toUpperCase()

function Brand({ small = false }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark brand-mark-image"><img className="brand-logo-image" src="/nexapos-mark.svg" alt="" /></span><span>Nexa<span className="brand-accent">Pos</span><small>SMART COMMERCE</small></span></div>
}

function WibClock({ className = '', showDate = false }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const time = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)
  const date = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now)
  return <span className={`wib-digital-clock ${className}`} title="Waktu Indonesia Barat"><Clock3 size={14}/><strong>{time}</strong><small>WIB</small>{showDate && <em>{date}</em>}</span>
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSuccess(false)
    if (!isSupabaseConfigured) {
      setMessage('Konfigurasi Supabase belum tersedia. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di environment Netlify.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (result.error) setMessage(userFacingError(result.error))
      } else {
        const response = await fetch('/.netlify/functions/activate-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, activationCode: activationCode.trim() }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'Aktivasi undangan gagal. Periksa kembali email dan status undangan.')
        setSuccess(true)
        setMessage('Undangan berhasil diverifikasi dan password berhasil dibuat. Silakan masuk menggunakan email dan password tersebut.')
        setMode('login')
      }
    } catch (error) {
      setMessage(userFacingError(error, 'Terjadi kesalahan. Silakan coba lagi.'))
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-shell">
    <div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
    <div className="auth-left">
      <Brand/>
      <div className="auth-hero"><span className="eyebrow"><span className="pulse-dot"/> POINT OF SALE, REIMAGINED</span>
        <h1>Operasional bisnis,<br/><span>naik level.</span></h1>
        <p>Kasir, stok, dan antrian dalam satu ruang kerja yang terasa cepat, rapi, dan selalu tersinkron.</p>
        <div className="hero-stats"><div><strong>Realtime</strong><span>Queue sync</span></div><div><strong>80mm</strong><span>Thermal ready</span></div><div><strong>Cloud</strong><span>Data tersimpan</span></div></div>
      </div>
      <div className="auth-footer">© {new Date().getFullYear()} NexaPos <span>•</span> Built for better business.</div>
    </div>
    <div className="auth-right"><form className="auth-card" onSubmit={submit}>
      <div className="auth-card-icon"><ShieldCheck size={23}/></div>
      <span className="eyebrow muted">WORKSPACE ACCESS</span>
      <h2>{mode === 'login' ? 'Selamat datang' : 'Aktivasi Undangan'}</h2>
      <p className="subtle">{mode === 'login' ? 'Masuk menggunakan akun NexaPos yang sudah aktif.' : 'Aktivasi hanya tersedia untuk email yang telah didaftarkan Owner atau Super Admin.'}</p>
      <label>Email terdaftar pada undangan</label><div className="field"><UserRound size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@bisnis.com" required autoComplete="email"/></div>
      {mode === 'activate' && <><label>Kode aktivasi dari Owner</label><div className="field"><KeyRound size={17}/><input value={activationCode} onChange={e=>setActivationCode(e.target.value.replace(/[^a-f0-9]/gi,'').slice(0,32))} placeholder="Tempel kode aktivasi" autoComplete="off" required minLength={32} maxLength={32}/></div></>}
      <label>Password {mode === 'login' ? '' : 'baru'}</label><div className="field"><ShieldCheck size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Masukkan password':'Minimal 6 karakter'} required minLength={mode==='login'?1:6} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {message && <div className={`notice ${success ? 'notice-success' : ''}`}>{message}</div>}
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? <span className="spinner"/> : mode==='login' ? 'Masuk ke workspace' : 'Verifikasi & aktifkan akun'} <ArrowRight size={17}/></button>
      <div className="auth-switch">{mode==='login'?'Sudah menerima undangan?':'Sudah mengaktifkan akun?'} <button type="button" onClick={()=>{setMode(mode==='login'?'activate':'login');setMessage('');setSuccess(false)}}>{mode==='login'?'Aktivasi Undangan':'Kembali ke login'}</button></div>
      <div className="secure-note"><ShieldCheck size={14}/> Aktivasi diperiksa langsung terhadap undangan tenant</div>
    </form></div>
  </main>
}


function PinGate({session,status,onReady,onSignOut}) {
  const [pin,setPin]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const setup=!status?.has_pin
  const submit=async(event)=>{
    event.preventDefault();setError('')
    if(!/^\d{4}$/.test(pin)){setError('PIN harus tepat 4 angka.');return}
    setBusy(true)
    const {data,error:rpcError}=await supabase.rpc(setup?'set_my_pin':'verify_my_pin',setup?{p_pin:pin}:{p_pin:pin})
    setBusy(false)
    if(rpcError){setError(userFacingError(rpcError));return}
    if(!setup&&data!==true){setPin('');setError('PIN salah. Silakan coba kembali.');return}
    onReady({has_pin:true,is_verified:true})
  }
  return <main className="auth-shell"><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/><div className="auth-left"><Brand/><div className="auth-hero"><span className="eyebrow"><span className="pulse-dot"/> ACCOUNT SECURITY</span><h1>Satu langkah<br/><span>lebih aman.</span></h1><p>PIN pribadi melindungi akses ke workspace NexaPos.</p></div><div className="auth-footer">© {new Date().getFullYear()} NexaPos</div></div><div className="auth-right"><form className="auth-card" onSubmit={submit}><div className="auth-card-icon"><ShieldCheck size={23}/></div><span className="eyebrow muted">PIN VERIFICATION</span><h2>{setup?'Buat PIN 4 angka':'Masukkan PIN'}</h2><p className="subtle">{setup?'Buat PIN pribadi sebelum menggunakan workspace. Jangan gunakan PIN yang mudah ditebak.':'Password benar. Verifikasi PIN untuk membuka workspace.'}</p><label>PIN 4 angka</label><div className="field"><ShieldCheck size={17}/><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" required/></div>{error&&<div className="notice">{error}</div>}<button className="btn btn-primary btn-wide" disabled={busy||pin.length!==4}>{busy?<span className="spinner"/>:setup?'Simpan PIN & lanjut':'Verifikasi PIN'} <ArrowRight size={17}/></button><div className="secure-note"><ShieldCheck size={14}/> PIN diverifikasi server dan sesi dibatasi 12 jam</div><button type="button" className="text-button" onClick={onSignOut}>Keluar dari akun</button></form></div></main>
}

function Pagination({page,total,pageSize=10,onChange}) {
  const pages=Math.max(1,Math.ceil(total/pageSize))
  if(total<=pageSize)return null
  const start=(page-1)*pageSize+1
  const end=Math.min(page*pageSize,total)
  return <div className="pagination-bar"><span>Menampilkan {start}–{end} dari {total.toLocaleString('id-ID')} data</span><div className="pagination-actions"><button className="btn btn-small btn-outline" disabled={page<=1} onClick={()=>onChange(page-1)}>Sebelumnya</button><span>Halaman {page} / {pages}</span><button className="btn btn-small btn-outline" disabled={page>=pages} onClick={()=>onChange(page+1)}>Berikutnya</button></div></div>
}


function OwnerOrganizationCenter({session,organization,tenants,busy,notice,onRefresh,onSignOut,onEnterTenant,ownerTenantName,setOwnerTenantName,onCreateTenant,tenantBusy,onDeleteTenant,deleteTenantBusy,onOrganizationSaved,readOnly=false,lockStatus='suspended',onLockedAction=()=>{}}) {
  const [activeMenu,setActiveMenu]=useState('overview')
  const [mobileOpen,setMobileOpen]=useState(false)
  const [tenantQuery,setTenantQuery]=useState('')
  const [profileNotice,setProfileNotice]=useState('')
  const [lockNoticeOpen,setLockNoticeOpen]=useState(false)
  const activeTenants=(tenants||[]).filter(item=>item.status!=='deleted'&&!item.deleted_at)
  const isTenantOperational=item=>organization.status==='active'&&!(organization.expires_at&&new Date(organization.expires_at)<=new Date())&&item.status==='active'&&!(item.expires_at&&new Date(item.expires_at)<=new Date())
  const additionalTenants=activeTenants.filter(item=>!item.is_primary_workspace)
  const activeCount=activeTenants.filter(isTenantOperational).length
  const remaining=Math.max(0,Number(organization.activation_location_limit||0)-additionalTenants.length)
  const menu=[
    {id:'overview',label:'Dashboard Pengelola',icon:LayoutDashboard,group:'PERUSAHAAN'},
    {id:'tenants',label:'Tenant Saya',icon:Store,group:'PERUSAHAAN'},
    {id:'team',label:'Karyawan & Hak Akses',icon:Users,group:'OPERASIONAL'},
    {id:'monitoring',label:'Monitoring',icon:Activity,group:'OPERASIONAL'},
    {id:'reports',label:'Laporan Gabungan',icon:BarChart3,group:'ANALISIS'},
    {id:'plans',label:'Paket & Aktivasi',icon:CreditCard,group:'PENGELOLAAN'},
    {id:'settings',label:'NexaSpace',icon:Settings,group:'PENGELOLAAN'},
    {id:'profile',label:'Profil & Keamanan',icon:UserRound,group:'KEAMANAN'},
    {id:'audit',label:'Audit',icon:ShieldCheck,group:'KEAMANAN'},
  ]
  const activeItem=menu.find(item=>item.id===activeMenu)||menu[0]
  const filteredTenants=activeTenants.filter(item=>(item.name||'').toLowerCase().includes(tenantQuery.toLowerCase())).sort((a,b)=>Number(isTenantOperational(b))-Number(isTenantOperational(a))||new Date(b.created_at||0)-new Date(a.created_at||0))
  const choose=(id)=>{setActiveMenu(id);setMobileOpen(false)}
  const guardLockedClick=(event)=>{if(!readOnly)return;const button=event.target?.closest?.('button');if(!button)return;const allowed=button.closest('nav')||button.closest('.owner-navigation')||button.classList.contains('owner-mobile-menu')||button.classList.contains('owner-mobile-close')||button.classList.contains('owner-mobile-backdrop')||button.classList.contains('owner-refresh-button')||button.classList.contains('owner-delete-tenant-button')||button.hasAttribute('data-lock-dismiss')||button.title==='Keluar'||/keluar|logout/i.test(button.textContent||'');if(allowed)return;event.preventDefault();event.stopPropagation();event.nativeEvent?.stopImmediatePropagation?.();onLockedAction();setLockNoticeOpen(true)}
  const Stat=({label,value,meta,icon:Icon})=><article className="owner-stat-card"><span className="owner-stat-icon"><Icon size={18}/></span><div><small>{label}</small><strong>{value}</strong><p>{meta}</p></div></article>
  const TenantCard=({tenant})=><article className="owner-tenant-card" key={tenant.id}>
    <div className="owner-tenant-card-top"><span className="owner-tenant-symbol"><Store size={19}/></span><span className={'owner-status '+(tenant.status==='active'&&!(tenant.expires_at&&new Date(tenant.expires_at)<=new Date())?'is-active':'')}>{tenant.expires_at&&new Date(tenant.expires_at)<=new Date()?'expired':tenant.status||'unknown'}</span></div>
    <h3>{tenant.name||'Tenant tanpa nama'}</h3>
    <p>{tenant.is_primary_workspace?'Workspace utama':'Tenant tambahan'} · {tenant.activation_package_key||organization.activation_package_key||'Paket perusahaan'}</p>
    {(tenant.address||tenant.phone)&&<p className="owner-tenant-profile-meta">{[tenant.address,tenant.phone].filter(Boolean).join(' · ')}</p>}
    <div className="owner-tenant-card-bottom"><span>{tenant.expires_at?'Berakhir '+new Date(tenant.expires_at).toLocaleDateString('id-ID'):'Masa aktif mengikuti paket'}</span>
      <div className="owner-tenant-card-actions" style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><button className="owner-enter-button" disabled={tenant.status==='deleted'||Boolean(tenant.deleted_at)||busy} onClick={()=>onEnterTenant(tenant.id)}>Masuk workspace <ArrowRight size={15}/></button>{!isTenantOperational(tenant)&&<button type="button" className="owner-delete-tenant-button" title="Hapus tenant nonaktif secara permanen" aria-label={"Hapus tenant "+(tenant.name||"ini")+" secara permanen"} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:36,height:36,minWidth:36,padding:0,border:"1px solid #fecaca",borderRadius:11,background:"#fff7f7",color:"#b42318",cursor:"pointer"}} disabled={deleteTenantBusy} onClick={()=>onDeleteTenant(tenant)}><Trash2 size={16}/></button>}</div>
    </div>
  </article>
  const ComingSoon=({description})=><section className="owner-empty-state"><span><Activity size={22}/></span><h3>Ruang kerja {activeItem.label}</h3><p>{description}</p><small>Halaman ini sudah tersedia di navigasi. Integrasi data dan tindakan akan diaktifkan setelah sumber data perusahaan tersedia, tanpa menampilkan data contoh.</small></section>
  return <div className="owner-console" onClickCapture={guardLockedClick} onSubmitCapture={event=>{if(!readOnly)return;event.preventDefault();event.stopPropagation();event.nativeEvent?.stopImmediatePropagation?.();onLockedAction();setLockNoticeOpen(true)}}>
    <aside className={'owner-sidebar '+(mobileOpen?'owner-sidebar-open':'')}>
      <div className="owner-brand-row"><Brand/><button className="owner-mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Tutup navigasi"><X size={19}/></button></div>
      <div className="owner-org-switch"><span className="owner-org-avatar">{initial(organization.organization_name||organization.owner_name||organization.owner_email)}</span><span><strong>{organization.organization_name||'Perusahaan belum bernama'}</strong><small>COMPANY OWNER · {organization.owner_name||'Pemilik'}</small></span><span className="owner-org-dot"/></div>
      <nav className="owner-navigation" aria-label="Navigasi perusahaan">
        {['PERUSAHAAN','OPERASIONAL','ANALISIS','PENGELOLAAN','KEAMANAN'].map(group=><div className="owner-nav-group" key={group}><small>{group}</small>{menu.filter(item=>item.group===group).map(item=>{const Icon=item.icon;return <button key={item.id} className={'owner-nav-link '+(activeMenu===item.id?'owner-nav-active':'')} onClick={()=>choose(item.id)}><Icon size={18}/><span>{item.label}</span>{activeMenu===item.id&&<i/>}</button>})}</div>)}
      </nav>
      <div className="owner-sidebar-bottom"><div className="owner-sidebar-plan"><span><CreditCard size={16}/> Paket perusahaan</span><strong>{organization.activation_package_key||'Starter'}</strong><small>{remaining} kuota tenant tambahan tersisa</small></div>
        <div className="owner-user-row"><span className="owner-user-avatar">{initial(session.user.email)}</span><span><strong>{session.user.email}</strong><small>Owner</small></span><button title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div>
      </div>
    </aside>
    {mobileOpen&&<button className="owner-mobile-backdrop" onClick={()=>setMobileOpen(false)} aria-label="Tutup navigasi"/>}
    <main className="owner-main">
      <header className="owner-topbar"><div className="owner-topbar-left"><button className="owner-mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Buka navigasi"><Menu size={20}/></button><div><div className="owner-breadcrumb">NEXAPOS <span>/</span> NEXASPACE</div><h1>{activeItem.label}</h1></div></div><div className="owner-topbar-actions"><span className="owner-live-indicator"><i/> NexaSpace aktif</span><button className="owner-refresh-button" onClick={onRefresh} disabled={busy}><RefreshCw size={16} className={busy?'owner-spin':''}/> <span>{busy?'Memuat':'Perbarui data'}</span></button></div></header>
      <div className="owner-content">
        {notice&&<div className="owner-notice" role="status">{notice}</div>}
        {readOnly&&<div className="owner-notice" role="status"><strong>AKSES OPERASIONAL DIKUNCI</strong><br/>Akses operasional POS {organization.organization_name||'Perusahaan Anda'} sedang dihentikan sementara. Anda masih dapat melihat data dan menghapus tenant yang sudah nonaktif; tindakan operasional POS tetap dikunci.</div>}
        {activeMenu==='overview'&&<>
          <section className="owner-welcome"><div><span className="owner-kicker">CONTROL CENTER · {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><h2>Semua tenant, <em>satu kendali.</em></h2><p>Pantau perusahaan dan buka workspace tenant dari satu pusat pengelolaan.</p></div><div className="owner-welcome-mark"><Boxes size={42}/></div></section>
          <div className="owner-stat-grid"><Stat label="Tenant aktif" value={activeCount} meta="Workspace aktif dalam perusahaan" icon={Store}/><Stat label="Total tenant" value={activeTenants.length} meta="Termasuk workspace utama" icon={Boxes}/><Stat label="Kuota tambahan" value={remaining} meta="Slot tenant yang masih tersedia" icon={Package}/><Stat label="Paket perusahaan" value={organization.activation_package_key||'Starter'} meta="Paket langganan saat ini" icon={CreditCard}/></div>
          <section className="owner-section-heading"><div><span className="owner-kicker">WORKSPACE PERUSAHAAN</span><h2>Tenant yang dikelola</h2><p>Pilih tenant untuk melanjutkan pekerjaan operasional.</p></div><button className="owner-text-action" onClick={()=>choose('tenants')}>Lihat semua tenant <ArrowRight size={15}/></button></section>
          <div className="owner-tenant-grid">{activeTenants.slice(0,3).map(tenant=><TenantCard tenant={tenant}/>)}
            {!activeTenants.length&&<div className="owner-no-tenant"><Store size={24}/><strong>Belum ada tenant</strong><span>Tenant perusahaan akan muncul di sini setelah tersedia.</span></div>}
          </div>
        </>}
        {activeMenu==='tenants'&&<><section className="owner-section-heading owner-page-heading"><div><span className="owner-kicker">COMPANY WORKSPACES</span><h2>Tenant Saya</h2><p>Kelola akses ke seluruh workspace di bawah perusahaan ini.</p></div><div className="owner-tenant-count">{activeTenants.length} tenant</div></section><form className="owner-create-tenant-form" onSubmit={onCreateTenant}><div><strong>Tambah tenant baru</strong><small>Kuota tambahan tersisa: {remaining} · Workspace utama tidak dihitung sebagai tenant tambahan.</small></div><input className="text-input" value={ownerTenantName} onChange={event=>setOwnerTenantName(event.target.value)} maxLength={120} minLength={2} placeholder="Nama tenant baru" required/><button className="btn btn-primary" disabled={tenantBusy||remaining<=0||organization.status!=='active'||Boolean(organization.expires_at&&new Date(organization.expires_at)<=new Date())}>{tenantBusy?<span className="spinner"/>:<Plus size={15}/>} Buat tenant</button></form><div className="owner-tenant-toolbar"><label><Search size={17}/><input value={tenantQuery} onChange={e=>setTenantQuery(e.target.value)} placeholder="Cari nama tenant..."/></label><span>{filteredTenants.length} hasil</span></div><div className="owner-tenant-grid">{filteredTenants.map(tenant=><TenantCard tenant={tenant}/>)}{!filteredTenants.length&&<div className="owner-no-tenant">Tidak ada tenant yang cocok dengan pencarian.</div>}</div></>}
        {activeMenu==='profile'&&<section className="owner-profile-page">
          <section className="owner-section-heading owner-page-heading"><div><span className="owner-kicker">ACCOUNT SECURITY</span><h2>Profil & Keamanan</h2><p>Kelola identitas login, password, dan PIN keamanan akun Owner.</p></div></section>
          {profileNotice&&<div className="owner-notice" role="status">{profileNotice}</div>}
          <div className="owner-profile-grid">
            <form className="panel settings-form" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;const values=new FormData(form);const fullName=String(values.get('owner_full_name')||'').trim();if(fullName.length<2){setProfileNotice('Nama minimal 2 karakter.');return}const {error}=await supabase.rpc('update_my_profile',{p_full_name:fullName});if(error){setProfileNotice(userFacingError(error,'Profil belum berhasil diperbarui.'));return}setProfileNotice('Nama profil berhasil diperbarui.')}}>
              <div className="panel-head"><div><h3><UserRound size={17}/> Profil akun Owner</h3><p>Email login: {session.user.email}</p></div></div>
              <label>Nama lengkap</label><input className="text-input" name="owner_full_name" defaultValue={session.user.user_metadata?.full_name||organization.owner_name||''} minLength={2} maxLength={120} required/>
              <label>Email akun</label><input className="text-input" value={session.user.email||''} readOnly/>
              <button className="btn btn-primary" type="submit"><Check size={16}/> Simpan profil</button>
            </form>
            <form className="panel settings-form" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;const values=new FormData(form);const current=String(values.get('current_pin')||'');const next=String(values.get('new_pin')||'');const confirmPin=String(values.get('confirm_pin')||'');if(!/^\d{4}$/.test(next)||next!==confirmPin){setProfileNotice('PIN baru harus tepat 4 angka dan konfirmasinya harus sama.');return}const {data,error}=await supabase.rpc('change_my_pin',{p_current_pin:current,p_new_pin:next});if(error){setProfileNotice(userFacingError(error,'PIN belum berhasil diganti.'));return}if(data!==true){setProfileNotice('PIN saat ini salah. Percobaan gagal tercatat untuk pembatasan keamanan.');return}form.reset();setProfileNotice('PIN berhasil diganti.')}}>
              <div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti PIN</h3><p>PIN keamanan terdiri dari tepat 4 angka.</p></div></div>
              <label>PIN saat ini</label><input className="text-input" name="current_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" required/>
              <label>PIN baru</label><input className="text-input" name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" required/>
              <label>Ulangi PIN baru</label><input className="text-input" name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" required/>
              <button className="btn btn-primary" type="submit"><ShieldCheck size={16}/> Ganti PIN</button>
            </form>
            <form className="panel settings-form" onSubmit={async event=>{event.preventDefault();const form=event.currentTarget;const values=new FormData(form);const current=String(values.get('current_password')||'');const next=String(values.get('new_password')||'');const confirmPassword=String(values.get('confirm_password')||'');if(next.length<6||next!==confirmPassword){setProfileNotice('Password baru minimal 6 karakter dan konfirmasinya harus sama.');return}const reauth=await supabase.auth.signInWithPassword({email:session.user.email,password:current});if(reauth.error){setProfileNotice('Password saat ini salah.');return}const changed=await supabase.auth.updateUser({password:next});if(changed.error){setProfileNotice(userFacingError(changed.error,'Password belum berhasil diganti.'));return}form.reset();setProfileNotice('Password berhasil diganti.')}}>
              <div className="panel-head"><div><h3><KeyRound size={17}/> Ganti password</h3><p>Gunakan password unik minimal 6 karakter.</p></div></div>
              <label>Password saat ini</label><input className="text-input" name="current_password" type="password" autoComplete="current-password" required/>
              <label>Password baru</label><input className="text-input" name="new_password" type="password" autoComplete="new-password" minLength={6} required/>
              <label>Ulangi password baru</label><input className="text-input" name="confirm_password" type="password" autoComplete="new-password" minLength={6} required/>
              <button className="btn btn-primary" type="submit"><ShieldCheck size={16}/> Ganti password</button>
            </form>
          </div>
        </section>}
        {activeMenu==='team'&&<OrganizationOperations mode="team" tenants={activeTenants}/>}
        {activeMenu==='monitoring'&&<OrganizationOperations mode="monitoring" tenants={activeTenants}/>}
        {activeMenu==='reports'&&<OrganizationReports organization={organization} tenants={activeTenants}/>}
        {activeMenu==='plans'&&<section className="owner-plan-layout"><div className="owner-plan-card"><span className="owner-kicker">CURRENT SUBSCRIPTION</span><h2>{organization.activation_package_key||'Starter'}</h2><p>Paket yang berlaku untuk perusahaan ini.</p><div className="owner-plan-metrics"><div><small>Kuota tenant tambahan</small><strong>{additionalTenants.length} / {Number(organization.activation_location_limit||0)}</strong></div><div><small>Sisa kuota</small><strong>{remaining}</strong></div></div></div><div className="owner-plan-side"><CreditCard size={24}/><h3>Paket & Aktivasi</h3><p>Perubahan paket dan aktivasi perusahaan dikelola melalui proses aktivasi resmi NexaPos.</p><small>Data paket ditampilkan berdasarkan konfigurasi perusahaan.</small></div></section>}
        {activeMenu==='settings'&&<OrganizationSettings organization={organization} session={session} onSaved={onOrganizationSaved}/> }
        {activeMenu==='audit'&&<AuditLogPanel scope="organization" organizationId={organization.id}/>}
      </div>
      <footer className="owner-footer"><span>NexaSpace · Owner Control Center</span><span>Data perusahaan terisolasi · {session.user.email}</span></footer>
    </main>
    {readOnly&&lockNoticeOpen&&<OperationalLockNotice storeName={organization.organization_name||'Perusahaan Anda'} status={lockStatus} onClose={()=>setLockNoticeOpen(false)}/>}
  </div>
}
function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [adminCheckReady, setAdminCheckReady] = useState(false)
  const [pinStatus, setPinStatus] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [store, setStore] = useState(null)
  const [membership, setMembership] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [ownerOrganization, setOwnerOrganization] = useState(null)
  const [tenantOrganizationStatus, setTenantOrganizationStatus] = useState(null)
  const [ownerTenants, setOwnerTenants] = useState([])
  const [ownerTenantName, setOwnerTenantName] = useState('')
  const [ownerTenantBusy, setOwnerTenantBusy] = useState(false)
  const [isOwnerTenantWorkspace, setIsOwnerTenantWorkspace] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedStoreReady, setSelectedStoreReady] = useState(false)
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [reportPeriod, setReportPeriod] = useState('today')
  const [reportPayment, setReportPayment] = useState('all')
  const [reportStatus, setReportStatus] = useState('paid')
  const [reportSearch, setReportSearch] = useState('')
  const [reportStart, setReportStart] = useState('')
  const [reportEnd, setReportEnd] = useState('')
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [lockNoticeOpen, setLockNoticeOpen] = useState(false)
  const [ownerMemberDeleteTarget,setOwnerMemberDeleteTarget] = useState(null)
  const [ownerMemberDeleteText,setOwnerMemberDeleteText] = useState('')
  const [ownerMemberDeleteBusy,setOwnerMemberDeleteBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'checking')
  const [manualRefreshTick, setManualRefreshTick] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Semua')
  const [productCategory, setProductCategory] = useState('Semua')
  const [cart, setCart] = useState([])
  const [productModal, setProductModal] = useState(null)
  const [queueCustomer, setQueueCustomer] = useState('')
  const [queueCounterLabel, setQueueCounterLabel] = useState(() => { try { return localStorage.getItem('nexapos-counter-label') || '' } catch { return '' } })
  const [openCashierShifts, setOpenCashierShifts] = useState([])
  const [monitoringSearch, setMonitoringSearch] = useState('')
  const [breakSettings, setBreakSettings] = useState({max_break_minutes:15,repeat_reminder_minutes:5,sound_enabled:true,escalation_enabled:true,manual_alert_title:'Peringatan dari Admin',manual_alert_message:'⚠️ Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.'})
  const [shiftBreak, setShiftBreak] = useState(null)
  const [monitoringBreaks, setMonitoringBreaks] = useState([])
  const [cashierAlerts, setCashierAlerts] = useState([])
  const [sendingBreakAlert, setSendingBreakAlert] = useState('')
  const [breakHistory, setBreakHistory] = useState([])
  const [monitoringNow, setMonitoringNow] = useState(Date.now())
  const [monitoringSoundReady, setMonitoringSoundReady] = useState(false)
  const lastBreakSoundRef = useRef({})

  // Make browser Back/Forward follow in-app workspace navigation without dropping the cart or form drafts.
  useEffect(() => {
    const current = window.history.state || {}
    if (!current.nexaposWorkspaceNav) {
      window.history.replaceState({ ...current, nexaposWorkspaceNav: true, page }, '', window.location.href)
    }
    const onPopState = event => {
      const state = event.state
      if (state?.nexaposWorkspaceNav) setPage(state.page || 'dashboard')
      else setPage('dashboard')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!authReady || isSuperAdmin) return
    const current = window.history.state || {}
    if (current.nexaposWorkspaceNav && current.page === page) return
    window.history.pushState({ ...current, nexaposWorkspaceNav: true, page }, '', window.location.href)
  }, [page, authReady, isSuperAdmin])
  const monitoringAudioContextRef = useRef(null)
  const [queueBusy, setQueueBusy] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [orderSuccessToast, setOrderSuccessToast] = useState(null)
  const orderSuccessAudioRef = useRef(null)
  const checkoutRequestIdRef = useRef(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [discount, setDiscount] = useState('0')
  const [savingSettings, setSavingSettings] = useState(false)
  const [activeShift, setActiveShift] = useState(null)
  const [shiftRecords, setShiftRecords] = useState([])
  const [shiftOpeningCash, setShiftOpeningCash] = useState('0')
  const [shiftCountedCash, setShiftCountedCash] = useState('')
  const [shiftCountedQris, setShiftCountedQris] = useState('')
  const [shiftNotes, setShiftNotes] = useState('')
  const [shiftReportDate, setShiftReportDate] = useState(today())
  const [attendanceStart, setAttendanceStart] = useState(today())
  const [attendanceEnd, setAttendanceEnd] = useState(today())
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [shiftBusy, setShiftBusy] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamInvites, setTeamInvites] = useState([])
  const [teamSaving, setTeamSaving] = useState(false)
  const [activationCodeCard, setActivationCodeCard] = useState(null)
  const [activationCodeCopied, setActivationCodeCopied] = useState(false)
  const [productPage,setProductPage] = useState(1)
  const [posProductPage,setPosProductPage] = useState(1)
  const [queuePage,setQueuePage] = useState(1)
  const [orderPage,setOrderPage] = useState(1)
  const [teamMemberPage,setTeamMemberPage] = useState(1)
  const [teamInvitePage,setTeamInvitePage] = useState(1)
  const listPageSize = 10

  // Preserve non-sensitive form drafts when mobile browsers suspend or reload the page.
  // Drafts stay local to this browser and are scoped to the current page and signed-in user.
  useEffect(() => {
    // A tenant/user change must start a fresh restoration pass on the existing DOM.
    Array.from(document.forms).forEach((form) => { delete form.dataset.draftRestoredKeys })
    const storagePrefix = 'nexapos-form-draft-v1:'
    const userScope = session?.user?.id || 'anonymous'
    const formIdentity = (form) => {
      if (form.dataset.draftKey) return form.dataset.draftKey
      const heading = form.querySelector('h1, h2, h3, [role="heading"]')?.textContent?.trim() || ''
      const formClass = typeof form.className === 'string' ? form.className : ''
      const parentClass = typeof form.parentElement?.className === 'string' ? form.parentElement.className : ''
      return [form.getAttribute('aria-label') || '', form.getAttribute('name') || '',
        form.getAttribute('action') || '', heading, formClass, parentClass].join('|')
    }
    const tenantScope = store?.id || selectedStoreId || 'no-store'
    const storageKey = (form) => {
      const identity = formIdentity(form)
      // Forms with identical markup need a stable per-page occurrence key, otherwise one
      // form can restore another form's draft after a refresh.
      const sameIdentityForms = Array.from(document.forms).filter((candidate) => formIdentity(candidate) === identity)
      const occurrence = Math.max(0, sameIdentityForms.indexOf(form))
      return storagePrefix
        + encodeURIComponent(window.location.pathname) + ':'
        + encodeURIComponent(userScope) + ':'
        + encodeURIComponent(tenantScope) + ':'
        + encodeURIComponent(identity) + ':' + occurrence
    }
    const isSensitive = (field) => {
      const type = (field.type || '').toLowerCase()
      const label = field.labels ? Array.from(field.labels).map((item) => item.textContent || '').join(' ') : ''
      const identity = [field.name, field.id, field.autocomplete, field.getAttribute('placeholder'),
        field.getAttribute('aria-label'), label].join(' ').toLowerCase()
      return field.disabled || field.readOnly
        || ['password', 'hidden', 'file', 'submit', 'button', 'reset', 'image'].includes(type)
        || /password|passwd|pin|activation.?code|invite.?code|token|secret|cvv|cvc|credit.?card|otp|one.?time.?code/.test(identity)
    }
    const fieldsFor = (form) => Array.from(form.elements).filter((field) =>
      field && ['INPUT', 'TEXTAREA', 'SELECT'].includes(field.tagName) && !isSensitive(field)
    )
    const fieldIdentity = (form, field, index) => {
      const label = field.labels ? Array.from(field.labels).map((item) => item.textContent || '').join(' ').trim() : ''
      const base = field.name || field.id || field.getAttribute('aria-label')
        || field.getAttribute('placeholder') || label || field.type || field.tagName
      const siblings = fieldsFor(form).slice(0, index + 1).filter((item) => {
        const itemLabel = item.labels ? Array.from(item.labels).map((entry) => entry.textContent || '').join(' ').trim() : ''
        const itemBase = item.name || item.id || item.getAttribute('aria-label')
          || item.getAttribute('placeholder') || itemLabel || item.type || item.tagName
        return itemBase === base && (item.type || item.tagName) === (field.type || field.tagName)
      }).length - 1
      return String(base) + ':' + (field.type || field.tagName) + ':' + siblings
    }
    const saveForm = (form) => {
      try {
        const fields = fieldsFor(form).map((field, index) => ({
          key: fieldIdentity(form, field, index),
          value: field.type === 'checkbox' || field.type === 'radio' ? Boolean(field.checked) : field.value,
          checked: field.type === 'checkbox' || field.type === 'radio' ? Boolean(field.checked) : undefined
        }))
        if (fields.length) {
          localStorage.setItem(storageKey(form), JSON.stringify({ savedAt: Date.now(), fields }))
          form.dataset.nexaposDirty = 'true'
        }
      } catch { /* Storage can be unavailable; keep the app usable. */ }
    }
    const restoreForm = (form) => {
      try {
        const key = storageKey(form)
        const raw = localStorage.getItem(key)
        if (!raw) return
        const draft = JSON.parse(raw)
        if (!draft?.savedAt || Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000 || !Array.isArray(draft.fields)) {
          localStorage.removeItem(key)
          return
        }
        // Track restored fields rather than the whole form: forms often reveal additional
        // inputs conditionally, after the first render or after a user changes a section.
        const restoredKeys = new Set((form.dataset.draftRestoredKeys || '').split(',').filter(Boolean))
        const fields = fieldsFor(form)
        fields.forEach((field, index) => {
          const fieldKey = fieldIdentity(form, field, index)
          if (restoredKeys.has(fieldKey) || field === document.activeElement) return
          const saved = draft.fields.find((item) => item.key === fieldKey)
          if (!saved) return
          if (field.type === 'checkbox' || field.type === 'radio') {
            field.checked = Boolean(saved.checked)
            field.dispatchEvent(new Event('change', { bubbles: true }))
          } else {
            const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
              : field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            if (setter) setter.call(field, saved.value ?? '')
            else field.value = saved.value ?? ''
            field.dispatchEvent(new Event('input', { bubbles: true }))
            field.dispatchEvent(new Event('change', { bubbles: true }))
          }
          restoredKeys.add(fieldKey)
        })
        if (restoredKeys.size) form.dataset.draftRestoredKeys = Array.from(restoredKeys).join(',')
      } catch { /* Ignore malformed or inaccessible drafts. */ }
    }
    const restoreAllForms = () => {
      Array.from(document.forms).forEach(restoreForm)
    }
    const onInput = (event) => {
      const field = event.target
      const form = field?.form
      if (form && !isSensitive(field)) saveForm(form)
    }
    const onReset = (event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      try { localStorage.removeItem(storageKey(form)) } catch {}
      delete form.dataset.draftRestored
      delete form.dataset.nexaposDirty
    }
    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onInput, true)
    document.addEventListener('reset', onReset, true)
    const hasUnsavedDraft = () => Array.from(document.forms).some(form => form.dataset.nexaposDirty === 'true')
    const onNavigationClick = event => {
      const target = event.target?.closest?.('.nav-link, .nx-back-button, .admin-shortcut, [data-nexapos-nav]')
      if (!target || target.closest('form') || !hasUnsavedDraft()) return
      if (!window.confirm('Ada perubahan formulir yang belum dikonfirmasi. Draft non-sensitif disimpan di perangkat ini. Tetap pindah halaman?')) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation?.()
      }
    }
    const onBeforeUnload = event => {
      if (!hasUnsavedDraft()) return
      event.preventDefault()
      event.returnValue = ''
    }
    document.addEventListener('click', onNavigationClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pageshow', restoreAllForms)
    const observer = new MutationObserver(() => restoreAllForms())
    if (document.body) observer.observe(document.body, { childList: true, subtree: true })
    restoreAllForms()
    return () => {
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      document.removeEventListener('reset', onReset, true)
      document.removeEventListener('click', onNavigationClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pageshow', restoreAllForms)
      observer.disconnect()
    }
  }, [session?.user?.id, store?.id, selectedStoreId])

  useEffect(() => {
    if (!orderSuccessToast) return
    const timeout = setTimeout(() => setOrderSuccessToast(null), 3800)
    return () => clearTimeout(timeout)
  }, [orderSuccessToast])

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, nextSession)=>setSession(nextSession))
    return ()=>subscription.unsubscribe()
  }, [])

  const loadWorkspace = useCallback(async (preferredStoreId = selectedStoreId, strictSelection = false) => {
    if (!session?.user || !supabase) return
    setLoading(true)
    setNotice('')
    // Platform staff accounts are independent of tenant membership; never send them through tenant onboarding.
    if (isSuperAdmin) {
      setMemberships([])
      setMembership(null)
      setOwnerOrganization(null)
      setOwnerTenants([])
      setSelectedStoreId('')
      setStore(null)
      setSettings(null)
      setProducts([])
      setOrders([])
      setOrderItems([])
      setQueue([])
      setTeamMembers([])
      setTeamInvites([])
      setLoading(false)
      return
    }
    let memberRows = null
    let memberError = null
    // Auth/session and RLS can settle shortly after sign-in; retry both empty and transient-error responses.
    for (let attempt = 0; attempt < 4; attempt++) {
      let timeoutId
      const timeout = new Promise(resolve => { timeoutId = setTimeout(() => resolve({data:null,error:{message:'Permintaan ke server terlalu lama. Periksa koneksi internet lalu coba masuk kembali.'}}), 10000) })
      let result
      try {
        result = await Promise.race([
          supabase.from('store_members').select('store_id,role,is_active,created_at,full_name,email').eq('user_id',session.user.id).eq('is_active',true).order('created_at',{ascending:false}),
          timeout
        ])
      } finally { clearTimeout(timeoutId) }
      memberRows = result.data
      memberError = result.error
      if (!memberError && memberRows?.length) break
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
    }
    let resolvedMembers = memberRows || []
    if (memberError) {
      if (strictSelection) setIsOwnerTenantWorkspace(false)
      setNotice(userFacingError(memberError, 'Koneksi belum siap saat memuat keanggotaan. Periksa internet lalu coba lagi.'))
      setLoading(false)
      return
    }
    if (strictSelection && preferredStoreId && !resolvedMembers.some(m => m.store_id === preferredStoreId && m.is_active === true)) {
      setIsOwnerTenantWorkspace(false)
      setStore(null); setMembership(null); setSettings(null); setProducts([]); setOrders([]); setOrderItems([]); setQueue([])
      setNotice('Tenant tidak berhasil dibuka: akses Owner belum terbaca pada tenant yang dipilih. Data tidak dialihkan ke tenant lain. Muat ulang Pusat Perusahaan atau hubungi Admin jika masalah berlanjut.')
      setLoading(false)
      return
    }
    if (!resolvedMembers.length) {
      setTenantOrganizationStatus(null)
      // Owner organizations are control centers and do not require a store membership to sign in.
      const {data: organization, error: organizationError} = await supabase.from('owner_organizations')
        .select('id,owner_user_id,owner_email,owner_name,organization_name,activation_package_key,activation_location_limit,status,activated_at,expires_at,activation_days')
        .eq('owner_user_id', session.user.id).limit(1).maybeSingle()
      if (organizationError) {
        setOwnerOrganization(null)
        setOwnerTenants([])
        setNotice(userFacingError(organizationError, 'Data perusahaan Owner belum dapat dimuat.'))
      } else if (organization?.id) {
        setOwnerOrganization(organization)
        const {data: organizationTenants, error: tenantsError} = await fetchOwnerOrganizationTenants()
        if (tenantsError) {
          setOwnerTenants([])
          setNotice(userFacingError(tenantsError, 'Daftar tenant perusahaan belum dapat dimuat.'))
        } else {
          setOwnerTenants(organizationTenants || [])
          setNotice('')
        }
      } else {
        setOwnerOrganization(null)
        setOwnerTenants([])
        setNotice('Akun belum memiliki toko atau perusahaan Owner. Jika Anda baru menerima undangan, coba lagi sebentar.')
      }
      setMemberships([])
      setMembership(null)
      setStore(null)
      setSettings(null)
      setProducts([])
      setOrders([])
      setOrderItems([])
      setQueue([])
      setLoading(false)
      return
    }
    const {data: storeRows, error: storesError} = await supabase.from('stores').select('id,name').in('id',resolvedMembers.map(m=>m.store_id))
    if (storesError) { setNotice(userFacingError(storesError)); setLoading(false); return }
    const {data: settingRows} = await supabase.from('store_settings').select('store_id,store_name').in('store_id',resolvedMembers.map(m=>m.store_id))
    const availableMemberships = resolvedMembers.map(m=>({...m,store_name:settingRows?.find(s=>s.store_id===m.store_id)?.store_name||storeRows?.find(s=>s.id===m.store_id)?.name||'Toko'}))
    setMemberships(availableMemberships)
    const selectedMember = availableMemberships.find(m=>m.store_id===preferredStoreId)
    if (strictSelection && preferredStoreId && !selectedMember) {
      setIsOwnerTenantWorkspace(false)
      setStore(null); setMembership(null); setSettings(null); setProducts([]); setOrders([]); setOrderItems([]); setQueue([])
      setNotice('Tenant yang dipilih tidak ditemukan dalam daftar akses aktif akun ini. Tenant lain tidak akan dibuka otomatis.')
      setLoading(false)
      return
    }
    const member = selectedMember || availableMemberships[0]
    if (selectedStoreId !== member.store_id) setSelectedStoreId(member.store_id)
    setMembership(member)
    const loadIssues = []
    const [
      {data: storeData, error: storeLoadError},
      {data: settingData, error: settingLoadError},
      {data: productData, error: productLoadError},
      {data: orderData, error: orderLoadError},
      {data: queueData, error: queueLoadError},
    ] = await Promise.all([
      supabase.from('stores').select('*').eq('id',member.store_id).single(),
      supabase.from('store_settings').select('*').eq('store_id',member.store_id).maybeSingle(),
      supabase.from('products').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}),
      supabase.from('orders').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}),
      supabase.from('queue_tickets').select('*').eq('store_id',member.store_id).eq('service_date',today()).order('queue_number',{ascending:false})
    ])
    if (storeLoadError || !storeData) {
      setStore(null); setSettings(null); setProducts([]); setOrders([]); setOrderItems([]); setQueue([])
      setNotice(userFacingError(storeLoadError, 'Data toko belum berhasil dimuat. Muat ulang halaman atau coba login kembali.'))
      setLoading(false)
      return
    }
    if (settingLoadError) loadIssues.push('Pengaturan toko: ' + userFacingError(settingLoadError))
    if (productLoadError) loadIssues.push('Produk: ' + userFacingError(productLoadError))
    if (orderLoadError) loadIssues.push('Transaksi: ' + userFacingError(orderLoadError))
    if (queueLoadError) loadIssues.push('Antrean: ' + userFacingError(queueLoadError))
    setStore(storeData)
    if (storeData.organization_id) {
      const {data: tenantOrgData} = await supabase.from('owner_organizations').select('id,status,expires_at,organization_name').eq('id',storeData.organization_id).maybeSingle()
      setTenantOrganizationStatus(tenantOrgData || null)
    } else setTenantOrganizationStatus(null)
    setSettings(settingData || {store_id:member.store_id,store_name:storeData?.name||member.store_name||'NexaPos Store',address:'',phone:'',receipt_footer:'Terima kasih telah berbelanja',receipt_note:'',queue_prefix:'A',queue_enabled:true,currency:'IDR'})
    if (member.role === 'owner') {
      const {data: organization, error: organizationError} = await supabase.from('owner_organizations')
        .select('id,owner_user_id,owner_email,owner_name,organization_name,activation_package_key,activation_location_limit,status,activated_at,expires_at,activation_days')
        .eq('owner_user_id', session.user.id).limit(1).maybeSingle()
      if (organizationError) {
        setOwnerOrganization(null)
        setOwnerTenants([])
        loadIssues.push('Perusahaan Owner: ' + userFacingError(organizationError))
      } else {
        setOwnerOrganization(organization || null)
        if (organization?.id) {
          const {data: organizationTenants, error: organizationTenantsError} = await fetchOwnerOrganizationTenants()
          if (organizationTenantsError) {
            setOwnerTenants([])
            loadIssues.push('Daftar tenant perusahaan: ' + userFacingError(organizationTenantsError))
          } else setOwnerTenants(organizationTenants || [])
        } else setOwnerTenants([])
      }
    } else {
      setOwnerOrganization(null)
      setOwnerTenants([])
    }
    setProducts(productData || []); setOrders(orderData || []); setQueue(queueData || [])
    const orderIds=(orderData||[]).map(o=>o.id)
    if(orderIds.length){
      const {data:itemRows,error:itemError}=await supabase.from('order_items').select('*').in('order_id',orderIds)
      if(itemError){setOrderItems([]);loadIssues.push('Rincian transaksi: '+userFacingError(itemError))}
      else setOrderItems(itemRows||[])
    } else setOrderItems([])
    if (['owner','admin'].includes(member.role)) {
      const {data: memberList,error:memberListError} = await supabase.from('store_members')
        .select('id,user_id,role,email,full_name,is_active,created_at')
        .eq('store_id',member.store_id).order('created_at',{ascending:true})
      if(memberListError){setTeamMembers([]);loadIssues.push('Daftar tim: '+userFacingError(memberListError))}
      else setTeamMembers(memberList || [])
      if (member.role === 'owner') {
        const {data: inviteList,error:inviteListError} = await supabase.from('store_invites')
          .select('id,email,full_name,role,created_at,expires_at,accepted_at')
          .eq('store_id',member.store_id).order('created_at',{ascending:false})
        if(inviteListError){setTeamInvites([]);loadIssues.push('Riwayat undangan: '+userFacingError(inviteListError))}
        else setTeamInvites(inviteList || [])
      } else {
        setTeamInvites([])
      }
    } else { setTeamMembers([]); setTeamInvites([]) }
    setNotice(loadIssues.length ? 'Sebagian data gagal dimuat: ' + loadIssues.join(' · ') : '')
    setLoading(false)
  }, [session, selectedStoreId, isSuperAdmin])

  useEffect(()=>{if(!session){setIsSuperAdmin(false);setIsPlatformAdmin(false);setAdminCheckReady(true);return}let cancelled=false;setAdminCheckReady(false);Promise.all([supabase.from('super_admins').select('user_id').eq('user_id',session.user.id).maybeSingle(),supabase.rpc('get_my_platform_staff_role')]).then(([adminResult,staffResult])=>{if(cancelled)return;const staffData=Array.isArray(staffResult.data)?staffResult.data[0]:staffResult.data;const isPlatformAdmin=!staffResult.error&&staffData?.role==='admin';setIsPlatformAdmin(isPlatformAdmin);setIsSuperAdmin(Boolean(adminResult.data)||isPlatformAdmin);setAdminCheckReady(true)}).catch(()=>{if(!cancelled){setIsSuperAdmin(false);setIsPlatformAdmin(false);setAdminCheckReady(true)}});return()=>{cancelled=true}},[session?.user?.id,session?.access_token])

  useEffect(()=>{
    const handleOnline=()=>setSyncStatus('checking')
    const handleOffline=()=>setSyncStatus('offline')
    window.addEventListener('online',handleOnline)
    window.addEventListener('offline',handleOffline)
    if(!navigator.onLine)setSyncStatus('offline')
    return()=>{window.removeEventListener('online',handleOnline);window.removeEventListener('offline',handleOffline)}
  },[])

  useEffect(()=>{if(!session){setPinStatus(null);return}let cancelled=false;setPinStatus(null);supabase.rpc('get_my_pin_status').then(({data,error})=>{if(cancelled)return;if(error)setPinStatus({error:userFacingError(error, 'Status PIN belum dapat dimuat. Coba lagi.')} );else setPinStatus(data?.[0]||{has_pin:false,is_verified:false})});return()=>{cancelled=true}},[session?.user?.id,session?.access_token])

  useEffect(() => {
    if (!session?.user?.id) {
      setSelectedStoreId('')
      setSelectedStoreReady(false)
      return
    }
    try {
      const savedStore = localStorage.getItem('nexapos-selected-store-v1:' + session.user.id)
      setSelectedStoreId(savedStore || '')
    } catch {
      setSelectedStoreId('')
    }
    setSelectedStoreReady(true)
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id || !selectedStoreId) return
    try { localStorage.setItem('nexapos-selected-store-v1:' + session.user.id, selectedStoreId) } catch {}
  }, [session?.user?.id, selectedStoreId])

  useEffect(() => {
    if (!session || !selectedStoreReady) return
    loadWorkspace()
  }, [session, loadWorkspace, selectedStoreReady])

  useEffect(()=>{
    if(!session?.user?.id||!ownerOrganization?.id||!supabase)return
    let cancelled=false
    const refreshOwnerTenants=async()=>{
      const {data,error}=await fetchOwnerOrganizationTenants()
      if(!cancelled&&!error&&data)setOwnerTenants(data)
    }
    if(!isOwnerTenantWorkspace)refreshOwnerTenants()
    const refreshOwnerData=async()=>{
      await refreshOwnerTenants()
      const {data:organizationData,error:organizationError}=await supabase.from('owner_organizations')
        .select('*').eq('owner_user_id',session.user.id).maybeSingle()
      if(!cancelled&&!organizationError&&organizationData)setOwnerOrganization(organizationData)
    }
    const channel=supabase.channel('owner-tenant-profile-sync-'+ownerOrganization.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},refreshOwnerData)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},refreshOwnerData)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members'},refreshOwnerData)
      .on('postgres_changes',{event:'*',schema:'public',table:'owner_organizations'},refreshOwnerData)
      .subscribe(status=>{if(status==='SUBSCRIBED')refreshOwnerData()})
    const handleFocus=()=>{if(!isOwnerTenantWorkspace)refreshOwnerTenants()}
    const refreshInterval=window.setInterval(()=>{if(!isOwnerTenantWorkspace)refreshOwnerTenants()},15000)
    window.addEventListener('focus',handleFocus)
    return()=>{
      cancelled=true
      window.clearInterval(refreshInterval)
      window.removeEventListener('focus',handleFocus)
      supabase.removeChannel(channel)
    }
  },[session?.user?.id,ownerOrganization?.id,isOwnerTenantWorkspace])

  useEffect(()=>{
    if(!session?.user?.id||!selectedStoreId||isSuperAdmin||!supabase)return
    let cancelled=false
    const refreshSelectedWorkspace=async()=>{
      if(cancelled)return
      await loadWorkspace(selectedStoreId,true)
    }
    const channel=supabase.channel('nexapos-tenant-lifecycle-sync-'+selectedStoreId)
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},payload=>{
        const changedId=payload.new?.id||payload.old?.id
        if(!changedId||changedId===selectedStoreId)refreshSelectedWorkspace()
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},payload=>{
        const changedId=payload.new?.store_id||payload.old?.store_id
        if(!changedId||changedId===selectedStoreId)refreshSelectedWorkspace()
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members'},payload=>{
        const changedId=payload.new?.store_id||payload.old?.store_id
        if(!changedId||changedId===selectedStoreId)refreshSelectedWorkspace()
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'owner_organizations'},refreshSelectedWorkspace)
      .subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[session?.user?.id,selectedStoreId,isSuperAdmin,loadWorkspace])

  // Preserve the active workspace page and its scroll position across reloads and app switching.
  useEffect(() => {
    if (!session?.user?.id || !selectedStoreReady || isSuperAdmin) return
    const key = selectedStoreId
      ? 'nexapos-workspace-page-v1:' + session.user.id + ':' + selectedStoreId
      : ''
    if (!key) return
    const allowed = new Set(['dashboard','pos','products','queue','monitoring','reports','reports-org','attendance','cashier','settings','profile','tv-settings','team','tenants','audit'])
    try {
      const saved = localStorage.getItem(key)
      if (saved && allowed.has(saved) && (!['team','tenants','audit'].includes(saved) || ['owner','admin'].includes(membership?.role))) setPage(saved)
    } catch {}
  }, [session?.user?.id, selectedStoreId, selectedStoreReady, isSuperAdmin, membership?.role])

  useEffect(() => {
    if (!session?.user?.id || !selectedStoreId || isSuperAdmin) return
    if (['team','tenants','audit'].includes(page) && !['owner','admin'].includes(membership?.role)) return
    try { localStorage.setItem('nexapos-workspace-page-v1:' + session.user.id + ':' + selectedStoreId, page) } catch {}
  }, [page, session?.user?.id, selectedStoreId, isSuperAdmin, membership?.role])

  useEffect(() => {
    if (!session?.user?.id || !store?.id) return
    const key = 'nexapos-scroll-v1:' + session.user.id + ':' + store.id + ':' + page
    const restore = () => {
      try {
        const saved = Number(localStorage.getItem(key) || 0)
        if (saved > 0) window.requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }))
      } catch {}
    }
    const save = () => { try { localStorage.setItem(key, String(window.scrollY)) } catch {} }
    const saveWhenHidden = () => { if (document.visibilityState === 'hidden') save() }
    restore()
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', saveWhenHidden)
    }
  }, [page, store?.id, session?.user?.id])

  // Load the cashier's open shift and the selected day's shift ledger.
  useEffect(()=>{
    if(!store?.id||!session?.user?.id||!supabase)return
    let cancelled=false
    const refreshShiftData=async()=>{
      const {data:active,error:activeError}=await supabase.from('cashier_shifts').select('*')
        .eq('store_id',store.id).eq('cashier_id',session.user.id).is('closed_at',null).maybeSingle()
      if(!cancelled){
        if(activeError){setActiveShift(null);if(!activeError.message?.includes('cashier_shifts'))setNotice(userFacingError(activeError))}
        else setActiveShift(active||null)
      }
      const start=new Date(shiftReportDate+'T00:00:00+07:00')
      const end=new Date(start.getTime()+86400000)
      const {data:records,error:recordsError}=await supabase.from('cashier_shifts').select('*')
        .eq('store_id',store.id).gte('opened_at',start.toISOString()).lt('opened_at',end.toISOString())
        .order('opened_at',{ascending:false})
      if(!cancelled){
        if(recordsError){setShiftRecords([]);if(!recordsError.message?.includes('cashier_shifts'))setNotice(userFacingError(recordsError))}
        else setShiftRecords(records||[])
      }
    }
    refreshShiftData()
    const channel=supabase.channel('cashier-shifts-'+store.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'cashier_shifts',filter:'store_id=eq.'+store.id},refreshShiftData)
      .subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[store?.id,session?.user?.id,shiftReportDate,manualRefreshTick])

  // Break settings/history are tenant-scoped and synchronized through Supabase Realtime.
  useEffect(()=>{
    if(!store?.id||!session?.user?.id||!supabase)return
    let cancelled=false
    const refreshBreakData=async()=>{
      const [{data:config,error:configError},{data:rows,error:rowsError}]=await Promise.all([
        supabase.from('cashier_break_settings').select('*').eq('store_id',store.id).maybeSingle(),
        supabase.from('cashier_shift_breaks').select('*').eq('store_id',store.id).gte('started_at',new Date(Date.now()-7*86400000).toISOString()).order('started_at',{ascending:false}).limit(100)
      ])
      if(cancelled)return
      if(config)setBreakSettings(config)
      else if(!configError)setBreakSettings({store_id:store.id,max_break_minutes:15,repeat_reminder_minutes:5,sound_enabled:true,escalation_enabled:true,manual_alert_title:'Peringatan dari Admin',manual_alert_message:'⚠️ Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.'})
      if(rowsError){setMonitoringBreaks([]);setBreakHistory([]);if(!rowsError.message?.includes('cashier_shift_breaks'))setNotice(userFacingError(rowsError))}
      else {setMonitoringBreaks((rows||[]).filter(row=>!row.ended_at));setBreakHistory((rows||[]).filter(row=>row.ended_at));setShiftBreak((rows||[]).find(row=>row.cashier_id===session.user.id&&!row.ended_at)||null)}
    }
    refreshBreakData()
    const channel=supabase.channel('cashier-breaks-'+store.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'cashier_shift_breaks',filter:'store_id=eq.'+store.id},refreshBreakData)
      .on('postgres_changes',{event:'*',schema:'public',table:'cashier_break_settings',filter:'store_id=eq.'+store.id},refreshBreakData)
      .subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[store?.id,session?.user?.id,manualRefreshTick])

  useEffect(()=>{const timer=setInterval(()=>setMonitoringNow(Date.now()),1000);return()=>clearInterval(timer)},[])

  // Manual alerts are delivered live only to the selected cashier.
  useEffect(()=>{
    if(!store?.id||!session?.user?.id||!supabase)return
    let cancelled=false
    const refreshAlerts=async()=>{
      const {data,error}=await supabase.from('cashier_manual_alerts').select('*').eq('store_id',store.id).eq('cashier_id',session.user.id).is('read_at',null).order('created_at',{ascending:false}).limit(10)
      if(cancelled)return
      if(!error)setCashierAlerts(data||[])
    }
    refreshAlerts()
    const channel=supabase.channel('cashier-manual-alerts-'+store.id+'-'+session.user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'cashier_manual_alerts',filter:'store_id=eq.'+store.id},payload=>{if(payload.new?.cashier_id===session.user.id)refreshAlerts()})
      .subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[store?.id,session?.user?.id,manualRefreshTick])

  const sendBreakAlert=async(row)=>{
    if(!isManager||!store?.id||!session?.user?.id||!row?.cashier_id||sendingBreakAlert)return
    setSendingBreakAlert(row.cashier_id)
    const title=String(breakSettings.manual_alert_title||'Peringatan dari Admin').trim().slice(0,120)||'Peringatan dari Admin'
    const message=String(breakSettings.manual_alert_message||'⚠️ Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.').trim().slice(0,2000)
    if(!message){setSendingBreakAlert('');setNotice('Isi pesan peringatan tidak boleh kosong.');return}
    const {error}=await supabase.from('cashier_manual_alerts').insert({store_id:store.id,cashier_id:row.cashier_id,sent_by:session.user.id,title,message})
    setSendingBreakAlert('')
    if(error){setNotice('Peringatan gagal dikirim. ' + userFacingError(error));return}
    setNotice('Peringatan berhasil dikirim ke akun '+row.displayName+'.')
  }

  const acknowledgeCashierAlert=async(alert)=>{
    const {error}=await supabase.from('cashier_manual_alerts').update({read_at:new Date().toISOString()}).eq('id',alert.id).eq('cashier_id',session.user.id)
    if(error){setNotice('Peringatan belum dapat ditandai dibaca.');return}
    setCashierAlerts(prev=>prev.filter(item=>item.id!==alert.id))
  }

  const monitoringBreakRows = monitoringBreaks.filter(row=>!row.ended_at).map(row=>{const shift=openCashierShifts.find(item=>item.id===row.shift_id);const member=shift?.member||teamMembers.find(item=>item.user_id===row.cashier_id);const elapsedMinutes=Math.max(0,Math.floor((monitoringNow-new Date(row.started_at).getTime())/60000));return {...row,displayName:member?.full_name?.trim()||member?.email||row.cashier_name_snapshot||'Kasir '+String(row.cashier_id||'').slice(0,8),email:member?.email||'',elapsedMinutes,overdue:elapsedMinutes>=Number(breakSettings.max_break_minutes||15),overdueMinutes:Math.max(0,elapsedMinutes-Number(breakSettings.max_break_minutes||15))}})
  const overdueBreakRows = monitoringBreakRows.filter(row=>row.overdue)

  // Audio is local to an admin/owner monitoring page; no external notification is sent.
  useEffect(()=>{
    if(page!=='monitoring'||!breakSettings.sound_enabled||!monitoringSoundReady)return
    for(const row of overdueBreakRows){
      const interval=Math.floor(row.overdueMinutes/Math.max(1,Number(breakSettings.repeat_reminder_minutes||5)))
      if(lastBreakSoundRef.current[row.id]===interval)continue
      lastBreakSoundRef.current[row.id]=interval
      try{
        const context=monitoringAudioContextRef.current
        if(!context||context.state!=='running')continue
        const oscillator=context.createOscillator();const gain=context.createGain()
        oscillator.type='sine';oscillator.frequency.value=880;gain.gain.value=0.12
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start()
        gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.45);oscillator.stop(context.currentTime+0.45)
        oscillator.onended=()=>context.close()
      }catch{}
    }
  },[page,monitoringNow,breakSettings,overdueBreakRows,monitoringSoundReady])

  // Attendance report has its own date range and search; it does not alter the cashier's daily shift ledger.
  useEffect(()=>{
    if(!store?.id||!supabase)return
    let cancelled=false
    const refreshAttendance=async()=>{
      const startDate=attendanceStart||today()
      const endDate=attendanceEnd||startDate
      if(startDate>endDate){setAttendanceRecords([]);return}
      const start=new Date(startDate+'T00:00:00+07:00')
      const end=new Date(new Date(endDate+'T00:00:00+07:00').getTime()+86400000)
      const {data,error}=await supabase.from('cashier_shifts').select('*').eq('store_id',store.id)
        .gte('opened_at',start.toISOString()).lt('opened_at',end.toISOString()).order('opened_at',{ascending:false})
      if(cancelled)return
      if(error){setAttendanceRecords([]);if(!error.message?.includes('cashier_shifts'))setNotice(userFacingError(error))}
      else setAttendanceRecords(data||[])
    }
    refreshAttendance()
    const channel=supabase.channel('nexapos-attendance-'+store.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'cashier_shifts',filter:'store_id=eq.'+store.id},refreshAttendance)
      .subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[store?.id,attendanceStart,attendanceEnd,manualRefreshTick])

  // Owner/admin monitoring: active shifts are ordered by their actual opening time, never fixed cashier slots.
  useEffect(()=>{
    if(!store?.id||!supabase||!['owner','admin'].includes(membership?.role)){setOpenCashierShifts([]);return}
    let cancelled=false
    const refreshOpenShifts=async()=>{
      const [{data:shifts,error:shiftError},{data:members,error:memberError}]=await Promise.all([
        supabase.from('cashier_shifts').select('id,store_id,cashier_id,cashier_name_snapshot,opened_at,opening_cash').eq('store_id',store.id).is('closed_at',null).order('opened_at',{ascending:true}),
        supabase.from('store_members').select('user_id,full_name,email,role,is_active').eq('store_id',store.id).eq('is_active',true)
      ])
      if(cancelled)return
      if(shiftError||memberError){setOpenCashierShifts([]);return}
      const memberById=new Map((members||[]).map(m=>[m.user_id,m]))
      setOpenCashierShifts((shifts||[]).map(shift=>({...shift,member:memberById.get(shift.cashier_id)})))
    }
    refreshOpenShifts()
    const channel=supabase.channel('nexapos-open-shifts-'+store.id).on('postgres_changes',{event:'*',schema:'public',table:'cashier_shifts',filter:'store_id=eq.'+store.id},refreshOpenShifts).subscribe()
    return()=>{cancelled=true;supabase.removeChannel(channel)}
  },[store?.id,membership?.role,manualRefreshTick])

  // Subscribe to membership changes for the signed-in user; no polling is needed.
  useEffect(()=>{
    const userId=session?.user?.id
    if(!userId||!supabase)return
    const channel=supabase.channel('nexapos-membership-'+userId)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members',filter:'user_id=eq.'+userId},()=>loadWorkspace())
      .subscribe()
    return ()=>{supabase.removeChannel(channel)}
  },[session?.user?.id,loadWorkspace])

  useEffect(()=>{
    if (!session || !membership?.store_id || !supabase) return
    const storeId = membership.store_id
    const refreshOrders = () => supabase.from('orders').select('*').eq('store_id',storeId).order('created_at',{ascending:false}).then(({data,error})=>{if(!error&&data)setOrders(data)})
    const refreshOrderItems = async () => {
      const {data:orderRows,error:ordersError}=await supabase.from('orders').select('id').eq('store_id',storeId)
      if(ordersError||!orderRows)return
      const orderIds=orderRows.map(o=>o.id)
      if(!orderIds.length){setOrderItems([]);return}
      const {data:itemRows,error:itemError}=await supabase.from('order_items').select('*').in('order_id',orderIds)
      if(!itemError&&itemRows)setOrderItems(itemRows)
    }
    const refreshProducts = () => supabase.from('products').select('*').eq('store_id',storeId).order('created_at',{ascending:false}).then(({data,error})=>{if(!error&&data)setProducts(data)})
    const refreshSettings = () => supabase.from('store_settings').select('*').eq('store_id',storeId).maybeSingle().then(({data,error})=>{if(!error&&data)setSettings(data)})
    const refreshTeam = () => loadWorkspace()
    const refreshQueue = () => supabase.from('queue_tickets').select('*').eq('store_id',storeId).order('queue_number',{ascending:false}).then(({data,error})=>{if(!error&&data)setQueue(data)})
    const channel = supabase.channel('nexapos-live-'+storeId)
      .on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets',filter:'store_id=eq.'+storeId},payload=>{
        if(payload.eventType==='DELETE') setQueue(prev=>prev.filter(t=>t.id!==payload.old.id))
        else setQueue(prev=>{const rows=prev.filter(t=>t.id!==payload.new.id);rows.push(payload.new);return rows.sort((a,b)=>b.queue_number-a.queue_number)})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'products',filter:'store_id=eq.'+storeId},refreshProducts)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'store_id=eq.'+storeId},()=>{refreshOrders();refreshOrderItems()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings',filter:'store_id=eq.'+storeId},refreshSettings)
      .on('postgres_changes',{event:'*',schema:'public',table:'stores',filter:'id=eq.'+storeId},refreshTeam)
      .subscribe((status)=>{
        if(!navigator.onLine){setSyncStatus('offline');return}
        if(status==='SUBSCRIBED'){
          setSyncStatus('connected')
          refreshOrders(); refreshOrderItems(); refreshProducts(); refreshSettings(); refreshTeam(); refreshQueue()
        } else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT') setSyncStatus('unstable')
      })
    return ()=>{supabase.removeChannel(channel)}
  },[session,membership?.store_id,membership?.role,loadWorkspace,manualRefreshTick])

  // Keep the Owner's member and invitation tables in sync through Supabase Realtime.
  useEffect(()=>{
    if(!session?.user?.id||!store?.id||!supabase||!['owner','admin'].includes(membership?.role))return
    let cancelled=false
    const refreshTeamLists=async()=>{
      const memberQuery=supabase.from('store_members')
        .select('id,user_id,role,email,full_name,is_active,created_at')
        .eq('store_id',store.id).order('created_at',{ascending:true})
      const inviteQuery=membership?.role==='owner'
        ? supabase.from('store_invites').select('id,email,full_name,role,created_at,expires_at,accepted_at').eq('store_id',store.id).order('created_at',{ascending:false})
        : Promise.resolve({data:null,error:null})
      const [{data:members,error:membersError},{data:invites,error:invitesError}]=await Promise.all([memberQuery,inviteQuery])
      if(cancelled)return
      if(!membersError&&members)setTeamMembers(members)
      if(membership?.role==='owner'&&!invitesError&&invites)setTeamInvites(invites)
    }
    const channel=supabase.channel('nexapos-team-'+store.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members',filter:'store_id=eq.'+store.id},refreshTeamLists)
    if(membership?.role==='owner')channel.on('postgres_changes',{event:'*',schema:'public',table:'store_invites',filter:'store_id=eq.'+store.id},refreshTeamLists)
    channel.subscribe(status=>{if(status==='SUBSCRIBED')refreshTeamLists()})
    return ()=>{cancelled=true;supabase.removeChannel(channel)}
  },[session?.user?.id,store?.id,membership?.role,manualRefreshTick])

  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice])

  const isManager = ['owner','admin'].includes(membership?.role)
  const canAddProduct = isManager || membership?.role === 'cashier'
  const currentShiftOrders=useMemo(()=>activeShift?orders.filter(o=>o.cashier_id===activeShift.cashier_id&&new Date(o.created_at)>=new Date(activeShift.opened_at)&&(!activeShift.closed_at||new Date(o.created_at)<=new Date(activeShift.closed_at))&&o.status==='paid'):[],[orders,activeShift])
  const expectedShiftCash=Number(activeShift?.opening_cash||0)+currentShiftOrders.filter(o=>o.payment_method==='cash').reduce((sum,o)=>sum+Number(o.total||0),0)
  const expectedShiftQris=currentShiftOrders.filter(o=>o.payment_method==='qris').reduce((sum,o)=>sum+Number(o.total||0),0)
  const categories = useMemo(()=>['Semua',...new Set(products.map(p=>p.category||'Umum'))],[products])
  const visibleProducts = useMemo(()=>products.filter(p=>p.is_active && (category==='Semua'||(p.category||'Umum')===category) && (p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))),[products,category,search])
  const subtotal = cart.reduce((sum,item)=>sum+Number(item.price)*item.quantity,0)
  const safeDiscount = Math.min(Math.max(Number(discount)||0,0),subtotal)
  const total = subtotal-safeDiscount
  useEffect(() => { checkoutRequestIdRef.current = null }, [cart, safeDiscount, payMethod, paidAmount, queueCustomer, store?.id, settings?.queue_enabled])
  const waitingQueue = queue.filter(t=>t.status==='waiting')
  const activeQueue = queue.filter(t=>['called','serving'].includes(t.status))
  const todaysOrders = orders.filter(o=>o.created_at?.slice(0,10)===today())
  const todaysSales = todaysOrders.filter(o=>o.status==='paid').reduce((sum,o)=>sum+Number(o.total),0)
  const reportDate = d => {const x=new Date(d);return Number.isNaN(x.getTime())?'':x.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})}
  const selectedReportDate = reportStart || today()
  const reportRangeStart = reportStart || today()
  const reportRangeEnd = reportEnd || reportRangeStart
  const reportFilteredOrders = orders.filter(o => {
    const date=reportDate(o.created_at)
    if(date<reportRangeStart||date>reportRangeEnd)return false
    if(!reportSearch.trim())return true
    const q=reportSearch.trim().toLocaleLowerCase('id-ID')
    const cashier=teamMembers.find(m=>m.user_id===o.cashier_id)
    const cashierName=cashier?.full_name?.trim()||cashier?.email||(o.cashier_id===session?.user?.id?(membership?.full_name?.trim()||session?.user?.email):o.cashier_id||'')
    return [o.receipt_number,o.payment_method,o.status,cashierName,o.cashier_id].some(value=>String(value||'').toLocaleLowerCase('id-ID').includes(q))
  })
  const monitoringCashierRows = openCashierShifts.map(shift=>{
    const cashierOrders=orders.filter(o=>o.cashier_id===shift.cashier_id&&o.status==='paid'&&new Date(o.created_at)>=new Date(shift.opened_at)&&(!shift.closed_at||new Date(o.created_at)<=new Date(shift.closed_at)))
    const member=shift.member
    return {...shift,displayName:member?.full_name?.trim()||member?.email||shift.cashier_name_snapshot||'Kasir '+String(shift.cashier_id||'').slice(0,8),transactionCount:cashierOrders.length,salesTotal:cashierOrders.reduce((sum,o)=>sum+Number(o.total||0),0)}
  }).filter(row=>!monitoringSearch.trim()||[row.displayName,row.member?.email,row.cashier_id].some(value=>String(value||'').toLocaleLowerCase('id-ID').includes(monitoringSearch.trim().toLocaleLowerCase('id-ID'))))
  const staleShiftRows = monitoringCashierRows.map(row=>({...row,elapsedHours:Math.max(0,Math.floor((monitoringNow-new Date(row.opened_at).getTime())/3600000))})).filter(row=>row.elapsedHours>=12)
  const monitoringSalesTotal = monitoringCashierRows.reduce((sum,row)=>sum+row.salesTotal,0)
  const monitoringTransactionTotal = monitoringCashierRows.reduce((sum,row)=>sum+row.transactionCount,0)
  const filteredAttendanceRecords = attendanceRecords.filter(row=>{
    if(!attendanceSearch.trim())return true
    const q=attendanceSearch.trim().toLocaleLowerCase('id-ID')
    const member=teamMembers.find(m=>m.user_id===row.cashier_id)
    const cashierName=member?.full_name?.trim()||member?.email||(row.cashier_id===session?.user?.id?(membership?.full_name?.trim()||session?.user?.email):'')
    return [cashierName,row.cashier_id,row.notes,row.status].some(value=>String(value||'').toLocaleLowerCase('id-ID').includes(q))
  })
  const reportPaidOrders=reportFilteredOrders.filter(o=>o.status==='paid')
  const reportRevenue=reportPaidOrders.reduce((s,o)=>s+Number(o.total||0),0)
  const reportItems=orderItems.filter(i=>reportPaidOrders.some(o=>o.id===i.order_id))
  const reportUnits=reportItems.reduce((s,i)=>s+Number(i.quantity||0),0)
  // Total modal dihitung dari harga modal pada data produk dikali jumlah unit terjual.
  const reportCapital=reportItems.reduce((sum,item)=>{
    const product=products.find(p=>p.id===item.product_id)
    return sum+(Number(product?.cost_price)||0)*(Number(item.quantity)||0)
  },0)

  const addToCart = (product) => setCart(prev=>{const existing=prev.find(i=>i.id===product.id);if(existing)return prev.map(i=>i.id===product.id?{...i,quantity:Math.min(i.quantity+1,product.stock||999)}:i);return [...prev,{...product,quantity:1}]})
  const changeQty = (id, delta) => setCart(prev=>prev.map(i=>i.id===id?{...i,quantity:Math.max(1,Math.min(i.quantity+delta,i.stock||999))}:i))
  const removeCartItem = id => setCart(prev=>prev.filter(i=>i.id!==id))

  const checkout = async () => {
    if (!checkoutRequestIdRef.current) {
      try { checkoutRequestIdRef.current = window.crypto.randomUUID() }
      catch { setNotice('Perangkat ini tidak dapat membuat ID transaksi aman. Perbarui browser lalu coba lagi.'); return }
    }
    if(!cart.length||!store)return
    // Prepare audio synchronously from the cashier's click; only play it after the server confirms success.
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass && !orderSuccessAudioRef.current) orderSuccessAudioRef.current = new AudioContextClass()
      if (orderSuccessAudioRef.current?.state === 'suspended') orderSuccessAudioRef.current.resume().catch(() => {})
    } catch { /* Audio may be unavailable; the visual confirmation still works. */ }
    if(shiftBreak){setNotice('Transaksi dinonaktifkan saat istirahat. Tekan Kembali Bekerja untuk melayani pelanggan.');return}
    if(!activeShift){setNotice('Buka shift kasir terlebih dahulu sebelum memproses transaksi.');setPage('cashier');return}
    const paid=payMethod==='cash'?(Number(paidAmount)||0):total
    if(paid<total){setNotice('Nominal pembayaran masih kurang.');return}
    setQueueBusy(true)
    const {data,error}=await supabase.rpc('complete_sale_idempotent',{p_store_id:store.id,p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity})),p_discount:safeDiscount,p_payment_method:payMethod,p_paid_amount:paid,p_customer_name:settings?.queue_enabled===false?null:(queueCustomer||null),p_create_queue:settings?.queue_enabled!==false,p_request_id:checkoutRequestIdRef.current})
    if(error){setQueueBusy(false);setNotice(userFacingError(error));return}
    const {data: receiptItems} = await supabase.from('order_items').select('*').eq('order_id',data.order.id).order('id')
    setReceipt({...data,items:receiptItems||[]})
    const successfulOrder = data?.order || data
    const orderNumber = successfulOrder.receipt_number || (successfulOrder.id ? String(successfulOrder.id).slice(0, 8).toUpperCase() : 'Pesanan baru')
    setOrderSuccessToast({number:orderNumber,total:Number(successfulOrder.total ?? total)})
    try {
      const audio = orderSuccessAudioRef.current
      if (audio && audio.state === 'running') {
        const now = audio.currentTime
        const gain = audio.createGain()
        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
        gain.connect(audio.destination)
        ;[880, 1175].forEach((frequency, index) => {
          const oscillator = audio.createOscillator()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, now + index * 0.11)
          oscillator.connect(gain)
          oscillator.start(now + index * 0.11)
          oscillator.stop(now + index * 0.11 + 0.16)
        })
        setTimeout(() => { try { gain.disconnect() } catch {} }, 600)
      }
    } catch { /* Browser audio restrictions must not interrupt checkout. */ }
    checkoutRequestIdRef.current = null
    setCart([]);setPaidAmount('');setDiscount('0');setQueueCustomer('')
    await loadWorkspace()
    setPage('pos')
    setQueueBusy(false)
  }

  const openCashierShift=async(event)=>{
    event.preventDefault()
    if(!store?.id||!session?.user?.id||activeShift||shiftBusy)return
    const openingCash=Number(shiftOpeningCash)
    if(!Number.isFinite(openingCash)||openingCash<0){setNotice('Saldo awal kas harus nol atau lebih.');return}
    setShiftBusy(true)
    const {data,error}=await supabase.from('cashier_shifts').insert({
      store_id:store.id,cashier_id:session.user.id,opening_cash:openingCash
    }).select('*').single()
    setShiftBusy(false)
    if(error){setNotice(userFacingError(error));return}
    setActiveShift(data)
    setShiftCountedCash('');setShiftCountedQris('');setShiftNotes('')
    setPage('pos')
    setNotice('Shift kasir berhasil dibuka.')
  }

  const enableMonitoringSound=async()=>{
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext
      if(!AudioContextClass){setNotice('Browser ini tidak mendukung suara pengingat.');return}
      let context=monitoringAudioContextRef.current
      if(!context||context.state==='closed'){context=new AudioContextClass();monitoringAudioContextRef.current=context}
      await context.resume()
      const oscillator=context.createOscillator();const gain=context.createGain()
      oscillator.frequency.value=880;gain.gain.value=0.08;oscillator.connect(gain);gain.connect(context.destination)
      oscillator.start();gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.2);oscillator.stop(context.currentTime+0.2)
      setMonitoringSoundReady(true);setNotice('Suara pengingat monitoring aktif di browser ini.')
    }catch{setNotice('Browser memblokir suara. Izinkan audio pada browser lalu coba lagi.')}
  }

  const startCashierBreak=async()=>{
    if(!activeShift||shiftBreak||!store?.id||!session?.user?.id)return
    const {data,error}=await supabase.from('cashier_shift_breaks').insert({store_id:store.id,shift_id:activeShift.id,cashier_id:session.user.id}).select('*').single()
    if(error){setNotice(userFacingError(error));return}
    setShiftBreak(data);setMonitoringBreaks(prev=>[...prev.filter(row=>row.id!==data.id),data]);setNotice('Istirahat dimulai. Sesi kasir tetap terbuka.')
  }

  const endCashierBreak=async()=>{
    if(!shiftBreak)return
    const {data,error}=await supabase.from('cashier_shift_breaks').update({ended_at:new Date().toISOString()}).eq('id',shiftBreak.id).is('ended_at',null).select('*').single()
    if(error){setNotice(userFacingError(error));return}
    setShiftBreak(null);setMonitoringBreaks(prev=>prev.filter(row=>row.id!==data.id));setBreakHistory(prev=>[data,...prev.filter(row=>row.id!==data.id)].slice(0,100));setNotice('Istirahat selesai. Durasi tersimpan dalam riwayat.')
  }

  const saveBreakSettings=async(event)=>{
    event.preventDefault()
    if(!isManager||!store?.id)return
    const next={store_id:store.id,max_break_minutes:Math.min(240,Math.max(1,Number(breakSettings.max_break_minutes)||15)),repeat_reminder_minutes:5,sound_enabled:true,escalation_enabled:true,manual_alert_title:String(breakSettings.manual_alert_title||'Peringatan dari Admin').trim().slice(0,120)||'Peringatan dari Admin',manual_alert_message:String(breakSettings.manual_alert_message||'⚠️ Waktu istirahat Anda telah melewati batas. Silakan kembali bekerja.').trim().slice(0,2000),updated_at:new Date().toISOString()}
    const {error}=await supabase.from('cashier_break_settings').upsert(next,{onConflict:'store_id'})
    if(error){setNotice(userFacingError(error));return}
    setBreakSettings(next);setNotice('Pengaturan peringatan istirahat tersimpan untuk toko ini.')
  }

  const closeCashierShift=async(event)=>{
    event.preventDefault()
    if(shiftBreak){setNotice('Tekan Kembali Bekerja sebelum menutup sesi kasir.');return}
    if(!activeShift||shiftBusy||shiftCountedCash===''||shiftCountedQris==='')return
    const countedCash=Number(shiftCountedCash),countedQris=Number(shiftCountedQris)
    if(!Number.isFinite(countedCash)||countedCash<0||!Number.isFinite(countedQris)||countedQris<0){
      setNotice('Uang tunai dan QRIS aktual harus nol atau lebih.');return
    }
    setShiftBusy(true)
    const {data,error}=await supabase.rpc('close_cashier_shift',{
      p_shift_id:activeShift.id,p_counted_cash:countedCash,p_counted_qris:countedQris,p_notes:shiftNotes.trim()||null
    })
    setShiftBusy(false)
    if(error){setNotice(userFacingError(error));return}
    setActiveShift(null)
    setShiftCountedCash('');setShiftCountedQris('');setShiftNotes('')
    setShiftRecords(prev=>[data,...prev.filter(row=>row.id!==data.id)])
    setNotice('Shift ditutup. Rekap tunai dan QRIS tersimpan.')
  }

  const createTicket = async () => {
    if(!store)return
    if(settings?.queue_enabled===false){setNotice('Sistem antrian sedang nonaktif. Aktifkan dari Pengaturan toko untuk membuat nomor.');return}
    setQueueBusy(true)
    const {data,error}=await supabase.rpc('create_queue_ticket',{p_store_id:store.id,p_customer_name:queueCustomer||null,p_order_id:null})
    setQueueBusy(false)
    if(error){setNotice(userFacingError(error));return}
    setQueueCustomer('')
    setNotice('Nomor antrian '+(settings?.queue_prefix||'A')+String(data.queue_number).padStart(3,'0')+' berhasil dibuat.')
    await loadWorkspace()
  }

  const updateTicket = async (ticket,status) => {
    if(settings?.queue_enabled===false){setNotice('Sistem antrian sedang nonaktif. Aktifkan dari Pengaturan toko untuk mengelola nomor.');return}
    if(status==='called'){
      const counterLabel = queueCounterLabel.trim() || String(membership?.full_name?.trim() || session?.user?.user_metadata?.full_name?.trim() || session?.user?.user_metadata?.name?.trim() || session?.user?.email || 'Loket 1').trim()
      setQueueCounterLabel(counterLabel)
      try { localStorage.setItem('nexapos-counter-label', counterLabel) } catch {}
      setQueueBusy(true)
      try {
        const {error}=await supabase.rpc('call_queue_ticket',{p_ticket_id:ticket.id,p_counter_label:counterLabel})
        if(error){setNotice(userFacingError(error));return}
        await loadWorkspace()
        setNotice('Antrean berhasil dipanggil oleh '+counterLabel+'.')
      } catch (error) {
        setNotice(userFacingError(error, 'Gagal memanggil antrean. Periksa koneksi lalu coba lagi.'))
      } finally {
        setQueueBusy(false)
      }
      return
    }
    const {error}=await supabase.rpc('update_queue_ticket_status',{p_ticket_id:ticket.id,p_status:status})
    if(error)setNotice(userFacingError(error));else await loadWorkspace()
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    if(!isManager && !(membership?.role === 'cashier' && !productModal?.id)){setNotice('Karyawan hanya dapat menambahkan produk baru; perubahan dan penghapusan produk memerlukan Manager.');return}
    const form=new FormData(event.currentTarget)
    const data={store_id:store.id,name:String(form.get('name')).trim(),sku:String(form.get('sku')||'').trim()||null,barcode:String(form.get('barcode')||'').trim()||null,category:String(form.get('category')||'Umum').trim()||'Umum',price:Number(form.get('price')||0),cost_price:Number(form.get('cost_price')||0),stock:Number(form.get('stock')||0),is_active:true}
    const result=productModal?.id
      ? await supabase.from('products').update({...data,updated_at:new Date().toISOString()}).eq('id',productModal.id).eq('store_id',store.id)
      : await supabase.from('products').insert(data)
    if(result.error){setNotice(userFacingError(result.error));return}
    setProductModal(null);setNotice('Produk berhasil disimpan.')
    const {data:rows}=await supabase.from('products').select('*').eq('store_id',store.id).order('created_at',{ascending:false});setProducts(rows||[])
  }

  const deleteProduct = async (product) => {
    if(!isManager)return
    if(!confirm('Hapus produk '+product.name+'?'))return
    const {error}=await supabase.from('products').delete().eq('id',product.id).eq('store_id',store.id)
    if(error)setNotice(userFacingError(error));else{setProducts(prev=>prev.filter(p=>p.id!==product.id));setNotice('Produk dihapus.')}
  }

  const inviteTeamMember = async (event) => {
    event.preventDefault()
    if (membership?.role !== 'owner') { setNotice('Hanya Owner yang dapat mendaftarkan karyawan.'); return }
    const form = new FormData(event.currentTarget)
    const activationCode = crypto.randomUUID().replaceAll('-', '')
    setTeamSaving(true)
    const {error} = await supabase.rpc('invite_store_member', {p_store_id:store.id,p_email:String(form.get('email')||'').trim(),p_full_name:String(form.get('full_name')||'').trim(),p_role:String(form.get('role')||'cashier'),p_activation_code:activationCode})
    setTeamSaving(false)
    if (error) { setNotice(userFacingError(error)); return }
    event.currentTarget.reset()
    setActivationCodeCopied(false)
    setActivationCodeCard({email:String(form.get('email')||'').trim(),code:activationCode,title:'Kode aktivasi karyawan'})
    setNotice('Undangan berhasil dibuat. Salin kode aktivasi dan kirimkan secara pribadi kepada karyawan.')
    await loadWorkspace()
  }

  const saveTeamMemberRole = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const {error} = await supabase.rpc('owner_update_store_member', {p_member_id:String(form.get('member_id')),p_full_name:String(form.get('full_name')||'').trim(),p_role:String(form.get('role')),p_is_active:form.get('is_active')==='true'})
    if (error) { setNotice(userFacingError(error)); return }
    setNotice('Nama, role, dan akses karyawan diperbarui.')
    await loadWorkspace()
  }

  const deleteTeamMember = async (member) => {
    setOwnerMemberDeleteText('')
    setOwnerMemberDeleteTarget(member)
  }
  const confirmOwnerMemberDelete = async () => {
    if(!ownerMemberDeleteTarget||ownerMemberDeleteText.trim()!=='HAPUS')return
    setOwnerMemberDeleteBusy(true)
    try{
      const {error}=await supabase.rpc('owner_delete_store_member',{p_member_id:ownerMemberDeleteTarget.id})
      if(error)throw error
      setOwnerMemberDeleteTarget(null)
      setOwnerMemberDeleteText('')
      setNotice('Keanggotaan dihapus permanen.')
      await loadWorkspace()
    }catch(error){
      setNotice(userFacingError(error,'Keanggotaan belum berhasil dihapus. Periksa sesi kasir yang masih terbuka lalu coba lagi.'))
    }finally{setOwnerMemberDeleteBusy(false)}
  }

  const regenerateTeamInviteCode = async (invite) => {
    if(invite.accepted_at){setNotice('Undangan sudah diterima. Buat undangan baru jika karyawan perlu aktivasi ulang.');return}
    if(!confirm('Buat kode aktivasi baru untuk '+invite.email+'? Kode lama akan langsung tidak berlaku dan masa berlaku diperpanjang 30 hari.'))return
    const activationCode=crypto.randomUUID().replaceAll('-','')
    setTeamSaving(true)
    const {error}=await supabase.rpc('owner_regenerate_store_invite',{p_invite_id:invite.id,p_activation_code:activationCode})
    setTeamSaving(false)
    if(error){setNotice(userFacingError(error));return}
    setActivationCodeCopied(false)
    setActivationCodeCard({email:invite.email,code:activationCode,title:'Kode aktivasi baru'})
    setNotice('Kode aktivasi berhasil dibuat ulang. Kode lama sudah tidak berlaku.')
    await loadWorkspace()
  }

  const deleteTeamInvite = async (invite) => {
    if(!confirm('Hapus permanen undangan '+invite.email+'?'))return
    const {error}=await supabase.rpc('owner_delete_store_invite',{p_invite_id:invite.id})
    if(error){setNotice(userFacingError(error));return}
    setNotice('Undangan dihapus permanen.')
    await loadWorkspace()
  }

  const resetTeamMemberPin = async member => {
    if (!confirm('Reset PIN ' + (member.full_name || member.email || 'karyawan') + '? Karyawan harus membuat PIN baru saat login berikutnya.')) return
    const { error } = await supabase.rpc('manager_reset_store_member_pin', { p_member_id: member.id })
    if (error) { setNotice(userFacingError(error)); return }
    setNotice('PIN karyawan berhasil direset.')
  }

  const resetTeamMemberPassword = async member => {
    const password = window.prompt('Password sementara baru (minimal 6 karakter) untuk ' + (member.full_name || member.email || 'karyawan') + '.')
    if (password === null) return
    if (password.length < 6 || password.length > 128) { setNotice('Password harus 6–128 karakter.'); return }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { setNotice('Sesi login tidak tersedia. Silakan masuk kembali.'); return }
    try {
      const response = await fetch('/.netlify/functions/manage-store-member-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ memberId: member.id, password }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Reset password karyawan gagal.')
      setNotice('Password sementara berhasil diperbarui. Sampaikan secara pribadi kepada karyawan.')
    } catch (error) { setNotice(error.message || 'Reset password karyawan gagal.') }
  }

  const toggleTeamMember = async (member) => {
    const nextActive = !member.is_active
    if (!confirm((nextActive?'Aktifkan kembali ':'Nonaktifkan ')+(member.full_name||member.email||'akun karyawan')+'?')) return
    const {error} = await supabase.rpc('manage_store_member', {p_member_id:member.id,p_role:member.role==='admin'?'admin':'cashier',p_is_active:nextActive})
    if (error) { setNotice(userFacingError(error)); return }
    setNotice(nextActive?'Akun karyawan diaktifkan kembali.':'Akses karyawan dinonaktifkan.')
    await loadWorkspace()
  }

  const uploadStoreLogo = async (event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !store?.id) return
    if (!isManager) { setNotice('Hanya Owner atau Admin Tenant yang dapat mengubah logo toko.'); return }
    if (file.size > 3 * 1024 * 1024) { setNotice('Ukuran logo maksimal 3 MB.'); return }
    const mimeExtensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
    const extension = mimeExtensions[file.type]
    if (!extension) { setNotice('Format logo harus PNG, JPG, atau WebP.'); return }
    setUploadingLogo(true)
    const path = `${store.id}/logo-${Date.now()}.${extension}`
    const previousUrl = settings?.logo_url
    const { error: uploadError } = await supabase.storage.from('store-logos').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) {
      setUploadingLogo(false)
      setNotice(userFacingError(uploadError, 'Logo belum dapat diunggah. Periksa konfigurasi penyimpanan atau hubungi admin.'))
      return
    }
    const { data: publicData } = supabase.storage.from('store-logos').getPublicUrl(path)
    const next = {
      store_id: store.id,
      store_name: settings?.store_name || store.name || 'NexaPos Store',
      address: settings?.address || '',
      phone: settings?.phone || '',
      receipt_footer: settings?.receipt_footer || 'Terima kasih telah berbelanja',
      receipt_note: settings?.receipt_note || '',
      queue_prefix: settings?.queue_prefix || 'A',
      queue_enabled: settings?.queue_enabled !== false,
      currency: settings?.currency || 'IDR',
      logo_url: publicData.publicUrl,
      updated_at: new Date().toISOString(),
    }
    const { error: saveError } = await supabase.from('store_settings').upsert(next)
    if (saveError) {
      await supabase.storage.from('store-logos').remove([path])
      setUploadingLogo(false)
      setNotice(userFacingError(saveError, 'Logo belum berhasil disimpan. Coba lagi atau hubungi admin.'))
      return
    }
    if (previousUrl) {
      const marker = '/storage/v1/object/public/store-logos/'
      const index = previousUrl.indexOf(marker)
      if (index >= 0) {
        const previousPath = decodeURIComponent(previousUrl.slice(index + marker.length).split('?')[0])
        if (previousPath && previousPath !== path) await supabase.storage.from('store-logos').remove([previousPath])
      }
    }
    setSettings(next)
    setUploadingLogo(false)
    setNotice('Logo toko berhasil diperbarui dan akan tampil pada struk.')
  }

  const removeStoreLogo = async () => {
    if (!settings?.logo_url || !store?.id || !isManager) return
    setUploadingLogo(true)
    const marker = '/storage/v1/object/public/store-logos/'
    const index = settings.logo_url.indexOf(marker)
    const previousPath = index >= 0 ? decodeURIComponent(settings.logo_url.slice(index + marker.length).split('?')[0]) : null
    const next = { ...settings, logo_url: null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('store_settings').upsert(next)
    if (error) {
      setUploadingLogo(false)
      setNotice(userFacingError(error, 'Logo belum berhasil disimpan. Coba lagi atau hubungi admin.'))
      return
    }
    if (previousPath) await supabase.storage.from('store-logos').remove([previousPath])
    setSettings(next)
    setUploadingLogo(false)
    setNotice('Logo toko dihapus.')
  }

  const saveStoreSettings = async (event) => {
    event.preventDefault();setSavingSettings(true)
    const form=new FormData(event.currentTarget)
    const next={store_id:store.id,store_name:String(form.get('store_name')||'NexaPos Store'),address:String(form.get('address')||''),phone:String(form.get('phone')||''),receipt_footer:String(form.get('receipt_footer')||''),receipt_note:String(form.get('receipt_note')||'').trim(),queue_prefix:String(form.get('queue_prefix')||'A').slice(0,3).toUpperCase(),queue_enabled:form.get('queue_enabled')==='on',currency:'IDR',logo_url:settings?.logo_url||null,updated_at:new Date().toISOString()}
    const {error}=await supabase.from('store_settings').upsert(next)
    setSavingSettings(false)
    if(error)setNotice(userFacingError(error));else{setSettings(next);setNotice('Pengaturan disimpan.')}
  }

  const createOwnerTenant = async (event) => {
    event.preventDefault()
    const name = ownerTenantName.trim()
    if (!name) { setNotice('Nama tenant wajib diisi.'); return }
    setOwnerTenantBusy(true)
    setNotice('')
    const {data, error} = await supabase.rpc('owner_create_store_tenant', {p_store_name: name})
    setOwnerTenantBusy(false)
    if (error) { setNotice(userFacingError(error, 'Tenant baru belum berhasil dibuat.')); return }
    setOwnerTenantName('')
    setNotice('Tenant ' + name + ' berhasil dibuat. Paket dan masa aktif mengikuti perusahaan Owner.')
    const {data: refreshedTenants, error: refreshTenantsError} = await fetchOwnerOrganizationTenants()
    if (!refreshTenantsError) setOwnerTenants(refreshedTenants || [])
    if (data?.id) {
      setIsOwnerTenantWorkspace(true)
      setStore(null); setMembership(null); setSettings(null); setProducts([]); setOrders([]); setOrderItems([]); setQueue([]); setCart([]); setReceipt(null)
      setSelectedStoreId(data.id)
      await loadWorkspace(data.id, true)
    } else await loadWorkspace()
  }

  const deleteOwnerTenant = async (tenant) => {
    const organizationOperational = ownerOrganization?.status === 'active' && !(ownerOrganization?.expires_at && new Date(ownerOrganization.expires_at) <= new Date())
    const isOperational = organizationOperational && tenant.status === 'active' && !(tenant.expires_at && new Date(tenant.expires_at) <= new Date())
    if (isOperational) {
      setNotice('Tenant aktif harus dinonaktifkan Admin/Super Admin terlebih dahulu sebelum dihapus.')
      return
    }
    const confirmation = prompt(
      'PENGHAPUSAN PERMANEN TENANT\\nSemua produk, stok, transaksi, item transaksi, antrean, pengaturan, undangan, anggota, riwayat kasir, dan data operasional tenant ini akan dihapus permanen. Tenant lain tidak terpengaruh.\\n\\nKetik HAPUS ' + tenant.name + ' untuk melanjutkan.'
    )
    if (confirmation !== 'HAPUS ' + tenant.name) return
    setOwnerTenantBusy(true)
    setNotice('')
    const { error } = await supabase.rpc('owner_delete_store_tenant', { p_store_id: tenant.id })
    setOwnerTenantBusy(false)
    if (error) {
      setNotice(userFacingError(error, 'Tenant belum berhasil dihapus. Periksa apakah masih ada sesi kasir terbuka.'))
      return
    }
    const { data: refreshedTenants, error: refreshError } = await fetchOwnerOrganizationTenants()
    if (!refreshError) setOwnerTenants(refreshedTenants || [])
    setNotice('Tenant ' + (tenant.name || '') + ' berhasil dihapus permanen. Daftar NexaSpace telah disinkronkan.')
  }

  const printReceipt = () => { if(receipt)window.print() }
  const nav = [
    {section:'WORKSPACE',items:[['dashboard','Ringkasan',LayoutDashboard],['pos','Kasir / POS',ShoppingCart],['products','Produk & stok',Package],['queue','Sistem antrian',Ticket]]},
    {section:'OPERASIONAL',items:['owner','admin'].includes(membership?.role)?[['monitoring','Monitoring kasir aktif',Activity]]:[]},
    {section:'ANALYTICS',items:[['reports','Laporan penjualan',BarChart3],...(membership?.role==='owner'?[['reports-org','Laporan perusahaan',Store]]:[]),['attendance','Laporan absensi',CalendarDays]]},
    {section:'CASH MANAGEMENT',items:[['cashier','Buka / tutup kasir',Wallet]]},
    {section:'PREFERENCES',items:[['settings','Pengaturan toko',Settings],['profile','Profil & keamanan',UserRound], ...(['owner','admin'].includes(membership?.role)?[['tv-settings','Edit Tampilan TV',Monitor]]:[])]},
    {section:'PERUSAHAAN',items:membership?.role==='owner'?[['owner-center','Pusat perusahaan',LayoutDashboard],['team','Karyawan & akses',Users],['tenants','Tenant & lokasi',Store],['audit','Audit aktivitas',Activity]]:(['admin','manager'].includes(membership?.role)?[['team','Karyawan & akses',Users]]:[])}
  ]

  if(!authReady || (session && !adminCheckReady))return <div className="loading-screen"><span className="spinner spinner-large"/><span>Menyiapkan NexaPos…</span></div>
  if(!session)return (window.location.pathname === '/' || window.location.pathname === '/index.html' ? <Homepage/> : <AuthScreen/>)
  if(!pinStatus)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keamanan akun…</span></div>
  if(pinStatus.error)return <div className="loading-screen"><p>Modul keamanan PIN belum siap: {pinStatus.error}</p><p>Terapkan migrasi PIN sebelum memakai versi ini.</p><button className="btn btn-outline" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  if(!pinStatus.has_pin||!pinStatus.is_verified)return <PinGate session={session} status={pinStatus} onReady={setPinStatus} onSignOut={()=>supabase.auth.signOut()}/>
  if(isSuperAdmin)return <SuperAdminScreen session={session} syncStatus={syncStatus} setSyncStatus={setSyncStatus} onSignOut={()=>supabase.auth.signOut()} platformAdmin={isPlatformAdmin}/>
  
  const organizationEntitlementStatus = ownerOrganization ? (ownerOrganization.status === 'active' && ownerOrganization.expires_at && new Date(ownerOrganization.expires_at) <= new Date() ? 'expired' : (ownerOrganization.status || 'active')) : 'active'
  const ownerCenterLockStatus = organizationEntitlementStatus
  if (ownerOrganization && (!isOwnerTenantWorkspace || ownerCenterLockStatus !== 'active')) return <OwnerOrganizationCenter
    session={session}
    organization={ownerOrganization}
    tenants={ownerTenants}
    busy={loading}
    notice={notice}
    onRefresh={loadWorkspace}
    onSignOut={()=>supabase.auth.signOut()}
    ownerTenantName={ownerTenantName}
    setOwnerTenantName={setOwnerTenantName}
    onCreateTenant={createOwnerTenant}
    tenantBusy={ownerTenantBusy}
    onDeleteTenant={deleteOwnerTenant}
    deleteTenantBusy={ownerTenantBusy}
    readOnly={ownerCenterLockStatus !== 'active'}
    lockStatus={ownerCenterLockStatus}
    onLockedAction={()=>setLockNoticeOpen(true)}
    onOrganizationSaved={updated=>setOwnerOrganization(current=>current?.id===updated?.id?{...current,...updated}:current)}
    onEnterTenant={async(tenantId)=>{
      const {error}=await supabase.rpc('owner_enter_store_tenant',{p_store_id:tenantId})
      if(error){setNotice(userFacingError(error,'Tidak dapat membuka tenant ini.'));return}
      setIsOwnerTenantWorkspace(true)
      setSelectedStoreId(tenantId)
      setStore(null);setMembership(null);setSettings(null);setProducts([]);setOrders([]);setQueue([]);setCart([]);setReceipt(null);setNotice('')
      await loadWorkspace(tenantId, true)
    }}
  />
  if(loading&&!store)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keanggotaan toko…</span></div>
  if(!store)return <div className="loading-screen"><span className="spinner spinner-large"/><p>{notice||'Akun ini belum terhubung ke toko. Minta Owner atau Super Admin mengirim undangan.'}</p><button className="btn btn-outline" onClick={loadWorkspace} disabled={loading}><RefreshCw size={14}/> {loading?'Memeriksa toko…':'Cek koneksi toko'}</button><button className="btn btn-ghost" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  const effectiveStoreStatus = store.status !== 'active' ? (store.status || 'pending') : (tenantOrganizationStatus && tenantOrganizationStatus.status !== 'active' ? tenantOrganizationStatus.status : (tenantOrganizationStatus?.expires_at && new Date(tenantOrganizationStatus.expires_at) <= new Date() ? 'expired' : (store.expires_at && new Date(store.expires_at) <= new Date() ? 'expired' : 'active')))
  const tenantReadOnly = effectiveStoreStatus !== 'active'

  const tenantDaysRemaining = store?.expires_at ? Math.ceil((new Date(store.expires_at).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/86400000) : null
  const tenantExpiryTone = tenantDaysRemaining === null ? '' : tenantDaysRemaining < 7 ? 'critical' : tenantDaysRemaining <= 25 ? 'warning' : 'healthy'
  const titleMap={'owner-center':'Pusat perusahaan',dashboard:'Ringkasan',pos:'Kasir / POS',products:'Produk & stok',queue:'Sistem antrian',monitoring:'Monitoring kasir aktif',reports:'Laporan penjualan','reports-org':'Laporan perusahaan',attendance:'Laporan absensi',cashier:'Buka / tutup kasir',settings:'Pengaturan toko',profile:'Profil & keamanan','tv-settings':'Edit Tampilan TV',tenants:'Tenant & lokasi',audit:'Audit aktivitas'}
  const guardTenantAction=(event)=>{if(!tenantReadOnly)return;const button=event.target?.closest?.('button');if(!button)return;const allowed=button.closest('nav')||button.classList.contains('nav-link')||button.classList.contains('mobile-menu')||button.classList.contains('mobile-scrim')||button.classList.contains('nx-back-button')||button.classList.contains('admin-shortcut')||button.hasAttribute('data-nexapos-nav')||button.hasAttribute('data-lock-dismiss')||button.title==='Keluar'||/keluar|logout/i.test(button.textContent||'')||/refresh|perbarui/i.test((button.className||'')+' '+(button.getAttribute('aria-label')||''));if(allowed)return;event.preventDefault();event.stopPropagation();event.nativeEvent?.stopImmediatePropagation?.();setLockNoticeOpen(true)}
  const guardTenantSubmit=(event)=>{if(!tenantReadOnly)return;event.preventDefault();event.stopPropagation();event.nativeEvent?.stopImmediatePropagation?.();setLockNoticeOpen(true)}
  return <div className="app-shell" onClickCapture={guardTenantAction} onSubmitCapture={guardTenantSubmit}>
    {tenantReadOnly&&<div className="tenant-readonly-banner" role="status" style={{margin:'14px 18px 0',padding:'14px 18px',border:'1px solid #f3c7a7',borderRadius:14,background:'#fff7ed',color:'#7c2d12'}}><strong>AKSES OPERASIONAL DIKUNCI</strong><span style={{display:'block',marginTop:4}}>Akses operasional {tenantOrganizationStatus?.organization_name||store.name||'Perusahaan Anda'} ini sedang dihentikan sementara. Anda masih dapat melihat halaman dan informasi yang tersedia, tetapi seluruh tindakan operasional tidak dapat digunakan.</span></div>}
    {lockNoticeOpen&&<OperationalLockNotice storeName={tenantOrganizationStatus?.organization_name||store.name||'Perusahaan Anda'} status={effectiveStoreStatus} onClose={()=>setLockNoticeOpen(false)}/>}
    {ownerMemberDeleteTarget&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!ownerMemberDeleteBusy){setOwnerMemberDeleteTarget(null);setOwnerMemberDeleteText('')}}} style={{position:'fixed',inset:0,zIndex:10020,background:'rgba(12,16,32,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
      <section role="dialog" aria-modal="true" aria-labelledby="owner-delete-member-title" style={{position:'relative',width:'100%',maxWidth:430,background:'var(--panel,#fff)',color:'var(--ink,#1b2035)',borderRadius:18,padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.28)',border:'1px solid var(--border,#e6e8f0)'}}>
        <button type="button" aria-label="Tutup konfirmasi hapus anggota" disabled={ownerMemberDeleteBusy} onClick={()=>{setOwnerMemberDeleteTarget(null);setOwnerMemberDeleteText('')}} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:10,border:'1px solid var(--border,#e6e8f0)',background:'transparent',color:'inherit',display:'grid',placeItems:'center',cursor:'pointer'}}><X size={17}/></button>
        <div style={{width:46,height:46,borderRadius:14,display:'grid',placeItems:'center',background:'rgba(220,38,38,.10)',color:'#dc2626',marginBottom:14}}><Trash2 size={22}/></div>
        <span className="eyebrow muted">TINDAKAN PERMANEN</span>
        <h2 id="owner-delete-member-title" style={{fontSize:20,margin:'6px 42px 8px 0'}}>Hapus anggota toko?</h2>
        <p style={{fontSize:13,color:'var(--muted,#73798f)',lineHeight:1.6,margin:'0 0 14px'}}>Keanggotaan akan dihapus. Jika akun tidak lagi digunakan di tenant lain, kredensial login juga akan dihapus. Riwayat operasional tetap dipertahankan.</p>
        <div style={{border:'1px solid var(--border,#e6e8f0)',background:'var(--surface,#f7f8fc)',borderRadius:12,padding:13,marginBottom:16}}>
          <small style={{display:'block',color:'var(--muted,#73798f)',marginBottom:4}}>Anggota yang dipilih</small>
          <strong style={{display:'block',overflowWrap:'anywhere'}}>{ownerMemberDeleteTarget.full_name||'Tanpa nama'}</strong>
          <span style={{fontSize:13,color:'var(--muted,#73798f)',overflowWrap:'anywhere'}}>{ownerMemberDeleteTarget.email||'Email tidak tersedia'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:8}}>
          <label htmlFor="owner-delete-member-confirm" style={{fontSize:13,fontWeight:700}}>Salin kode lalu ketik di bawah</label>
          <button type="button" className="btn btn-small btn-outline" onClick={async()=>{try{await navigator.clipboard.writeText('HAPUS');setNotice('Kode konfirmasi HAPUS berhasil disalin.')}catch{setNotice('Browser tidak mengizinkan salin otomatis. Pilih teks HAPUS untuk menyalinnya.')}}}><Copy size={14}/> Salin HAPUS</button>
        </div>
        <div style={{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:20,fontWeight:800,letterSpacing:'.16em',textAlign:'center',padding:12,border:'1px dashed #dc2626',borderRadius:10,color:'#dc2626',marginBottom:12,userSelect:'all'}}>HAPUS</div>
        <input id="owner-delete-member-confirm" className="text-input" autoComplete="off" value={ownerMemberDeleteText} onChange={e=>setOwnerMemberDeleteText(e.target.value.toUpperCase())} placeholder="Ketik HAPUS untuk mengonfirmasi" disabled={ownerMemberDeleteBusy}/>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button type="button" className="btn btn-outline" style={{flex:1,justifyContent:'center'}} disabled={ownerMemberDeleteBusy} onClick={()=>{setOwnerMemberDeleteTarget(null);setOwnerMemberDeleteText('')}}>Batal</button>
          <button type="button" className="btn btn-primary" style={{flex:1,justifyContent:'center',background:'#dc2626',borderColor:'#dc2626'}} disabled={ownerMemberDeleteBusy||ownerMemberDeleteText.trim()!=='HAPUS'} onClick={confirmOwnerMemberDelete}>{ownerMemberDeleteBusy?<span className="spinner"/>:<Trash2 size={15}/>} Hapus permanen</button>
        </div>
      </section>
    </div>}

    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      {membership?.role==='owner'&&<button className="btn btn-outline btn-small" style={{margin:'0 14px 12px'}} onClick={()=>setIsOwnerTenantWorkspace(false)}><ArrowLeft size={14}/> Pusat perusahaan</button>}
      <div className="store-switch"><span className="store-avatar">{settings?.logo_url?<img className="sidebar-store-logo" src={settings.logo_url} alt={`Logo ${settings?.store_name||store.name}`}/>:<Store size={17}/>}</span><span className="store-copy">{memberships.length>1?<select className="store-select" aria-label="Pilih toko aktif" value={store.id} onChange={e=>{setSelectedStoreId(e.target.value);setStore(null);setMembership(null);setSettings(null);setProducts([]);setOrders([]);setQueue([]);setCart([]);setReceipt(null);setNotice('')}}>{memberships.map(m=><option key={m.store_id} value={m.store_id}>{m.store_name}</option>)}</select>:<strong>{settings?.store_name||store.name}</strong>}<small>{memberships.length>1?'Ganti workspace':'Workspace aktif'}</small></span>{memberships.length===1&&<ChevronDown size={15}/>}</div>
      <nav className="side-nav">{nav.filter(group=>group.items.length).map(group=><div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([id,label,Icon])=><button key={id} className={`nav-link ${page===id?'nav-active':''}`} onClick={()=>{if(id==='owner-center'){setIsOwnerTenantWorkspace(false)}else{setPage(id)}setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='queue'&&waitingQueue.length>0&&<em>{waitingQueue.length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><Headphones size={17}/></span><strong>Butuh bantuan?</strong><small>Kelola bisnis dengan lebih mudah.</small><button onClick={()=>window.dispatchEvent(new CustomEvent('nexapos-open-support',{detail:{authorized:true}}))}>Pusat bantuan <ArrowRight size={13}/></button></div><div className="user-card"><span className="user-avatar">{initial(membership?.full_name||session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email)}</span><span className="user-copy"><strong>{membership?.full_name?.trim()||session.user.user_metadata?.full_name?.trim()||session.user.user_metadata?.name?.trim()||session.user.email}</strong><small>{membership.role}</small></span><button className="icon-button" title="Keluar" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Tutup menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Buka sidebar"><Menu size={20}/></button><div className="topbar-title-group"><div className="breadcrumb">Workspace <span>/</span> <strong>{titleMap[page]}</strong></div><div className="topbar-date"><span className="desktop-date">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><span className="mobile-date">{new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'})}</span></div></div></div><div className="topbar-actions"><WibClock/><span className="live-status" title={syncStatus==='connected'?'Koneksi dan Supabase Realtime terhubung':syncStatus==='unstable'?'Koneksi tidak stabil; sinkronisasi mungkin terlambat':syncStatus==='offline'?'Tidak ada koneksi jaringan':'Memeriksa koneksi'} style={{color:syncStatus==='connected'?'#16a34a':syncStatus==='unstable'?'#ca8a04':syncStatus==='offline'?'#dc2626':'#64748b'}}><i style={{backgroundColor:syncStatus==='connected'?'#16a34a':syncStatus==='unstable'?'#eab308':syncStatus==='offline'?'#dc2626':'#94a3b8'}}/>{syncStatus==='connected'?'LIVE SYNC':syncStatus==='unstable'?'SYNC LAMBAT':syncStatus==='offline'?'OFFLINE':'MEMERIKSA'}</span><button className="icon-button refresh-btn" title="Refresh halaman ini" aria-label="Refresh halaman ini" onClick={()=>{setManualRefreshTick(v=>v+1);loadWorkspace()}}><RefreshCw size={17}/></button></div></header>
      {page==='dashboard'&&store?.expires_at&&tenantDaysRemaining!==null&&<div className={`tenant-expiry-banner ${tenantExpiryTone}`}><span className="tenant-expiry-icon"><CalendarDays size={18}/></span><div><strong>{tenantDaysRemaining<0?'Masa aktif toko telah berakhir':tenantDaysRemaining===0?'Masa aktif toko berakhir hari ini':`Masa aktif toko tersisa ${tenantDaysRemaining} hari`}</strong><small>{tenantDaysRemaining<0?'Hubungi Super Admin untuk mengaktifkan kembali toko.':`Berlaku sampai ${new Date(store.expires_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta'})}`}</small></div></div>}
      {cashierAlerts.length>0&&<div role="alert" aria-live="assertive" style={{position:'relative',zIndex:20,margin:'0 0 14px',padding:'14px 16px',border:'2px solid #dc2626',borderRadius:14,background:'#fff1f2',color:'#991b1b',display:'flex',alignItems:'flex-start',gap:12}}><Bell size={21}/><div style={{flex:1}}>{cashierAlerts.map(alert=><div key={alert.id} style={{marginTop:6}}><strong>{alert.title||'Peringatan dari Admin'}</strong><div style={{marginTop:4}}>{alert.message}</div><div style={{fontSize:12,opacity:.8,marginTop:3}}>{new Date(alert.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</div><button type="button" className="btn btn-small btn-outline" style={{marginTop:8}} onClick={()=>acknowledgeCashierAlert(alert)}>Saya mengerti</button></div>)}</div></div>}
      {notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {orderSuccessToast&&<div role="status" aria-live="polite" className="order-success-toast" style={{position:'fixed',top:76,right:12,zIndex:12000,width:'min(360px, calc(100vw - 24px))',display:'flex',alignItems:'flex-start',gap:11,padding:'14px 15px',background:'var(--panel,#fff)',color:'var(--ink,#202338)',border:'1px solid #b9edce',borderRadius:15,boxShadow:'0 16px 42px rgba(18,35,31,.18)'}}><CheckCircle2 size={22} style={{color:'#16945f',flexShrink:0,marginTop:1}}/><div style={{flex:1,minWidth:0}}><strong style={{display:'block',fontSize:13,marginBottom:4}}>Pesanan berhasil dibuat!</strong><span style={{display:'block',fontSize:12,opacity:.78,overflowWrap:'anywhere'}}>No. {orderSuccessToast.number}</span><strong style={{display:'block',fontSize:13,marginTop:5}}>{money(orderSuccessToast.total)}</strong></div><button type="button" aria-label="Tutup notifikasi pesanan berhasil" onClick={()=>setOrderSuccessToast(null)} style={{border:0,background:'transparent',color:'inherit',padding:2,display:'grid',placeItems:'center',flexShrink:0}}><X size={16}/></button></div>}
      {activationCodeCard&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setActivationCodeCard(null);setActivationCodeCopied(false)}}} style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(12,16,32,.48)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
        <section role="dialog" aria-modal="true" aria-labelledby="activation-code-title" style={{position:'relative',width:'100%',maxWidth:390,background:'var(--panel,#fff)',color:'var(--ink,#1b2035)',borderRadius:18,padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.24)',border:'1px solid var(--border,#e6e8f0)'}}>
          <button type="button" aria-label="Tutup kartu kode aktivasi" title="Tutup" onClick={()=>{setActivationCodeCard(null);setActivationCodeCopied(false)}} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:10,border:'1px solid var(--border,#e6e8f0)',background:'transparent',color:'inherit',display:'grid',placeItems:'center',cursor:'pointer'}}><X size={17}/></button>
          <div style={{width:44,height:44,borderRadius:13,display:'grid',placeItems:'center',background:'rgba(98,92,241,.12)',color:'var(--primary,#625cf1)',marginBottom:14}}><KeyRound size={21}/></div>
          <h2 id="activation-code-title" style={{fontSize:19,margin:'0 42px 6px 0'}}>{activationCodeCard.title}</h2>
          <p style={{fontSize:13,color:'var(--muted,#73798f)',lineHeight:1.6,margin:'0 0 16px'}}>Kirim kode ini secara pribadi kepada <strong>{activationCodeCard.email}</strong>. Kode hanya ditampilkan sekali.</p>
          <div style={{border:'1px dashed var(--border,#cfd3e2)',background:'var(--surface,#f7f8fc)',borderRadius:12,padding:'14px 12px',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:14,letterSpacing:'.035em',overflowWrap:'anywhere',textAlign:'center',userSelect:'all'}}>{activationCodeCard.code}</div>
          <button type="button" className="btn btn-primary btn-wide" style={{marginTop:16,justifyContent:'center'}} onClick={async()=>{try{await navigator.clipboard.writeText(activationCodeCard.code);setActivationCodeCopied(true)}catch{setNotice('Browser tidak mengizinkan salin otomatis. Tekan lama kode untuk menyalinnya.')}}}><Copy size={16}/>{activationCodeCopied?'Kode tersalin':'Salin kode aktivasi'}</button>
          <p style={{fontSize:11,color:'var(--muted,#73798f)',margin:'12px 0 0',lineHeight:1.5}}>Jangan bagikan kode ini di grup publik. Menutup kartu tidak akan menampilkan kode kembali.</p>
        </section>
      </div>}
      <div className="page-content">
        {page==='dashboard'&&<section className="page-section">
          <div className="page-heading"><div><span className="eyebrow muted">OVERVIEW / TODAY</span><h1>Selamat datang kembali <span className="wave">✦</span></h1><p>Berikut gambaran aktivitas toko Anda hari ini.</p></div><button className="btn btn-primary" onClick={()=>setPage('pos')}><Plus size={17}/> Transaksi baru</button></div>
          <div className="welcome-banner"><div className="banner-copy"><span className="banner-label"><Activity size={14}/> NEXAPOS INSIGHTS</span><h2>Semua berjalan dalam<br/><span>satu kendali.</span></h2><p>Pantau penjualan, kelola produk, dan panggil antrian tanpa berpindah sistem.</p><button className="banner-button" onClick={()=>setPage('reports')}>Lihat laporan <ArrowRight size={15}/></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><div className="art-card-head"><span/><span/><span/></div><div className="art-chart"><i/><i/><i/><i/><i/><i/><i/></div><div className="art-card-foot"><b/><b/><b/></div></div><div className="floating-chip chip-sales"><TrendingUp size={15}/><span><small>Penjualan hari ini</small><b>{money(todaysSales)}</b></span></div><div className="floating-chip chip-queue"><Ticket size={16}/><span><small>Antrian menunggu</small><b>{waitingQueue.length} pelanggan</b></span></div></div></div>
          <div className="section-title-row"><div><h2>Performa hari ini</h2><p>Ringkasan operasional toko</p></div><span className="date-pill"><Clock3 size={14}/> {today()}</span></div>
          <div className="stats-grid"><StatCard icon={CircleDollarSign} label="Total penjualan" value={money(todaysSales)} meta={todaysOrders.length+' transaksi hari ini'} tone="violet"/><StatCard icon={ShoppingBag} label="Transaksi" value={todaysOrders.length} meta="Transaksi tercatat hari ini" tone="blue"/><StatCard icon={Boxes} label="Produk aktif" value={products.filter(p=>p.is_active).length} meta={products.filter(p=>p.stock<=5).length+' stok menipis'} tone="orange"/><StatCard icon={Ticket} label="Antrian menunggu" value={waitingQueue.length} meta={activeQueue.length+' sedang dilayani'} tone="green"/></div>
          <div className="dashboard-grid"><div className="panel sales-panel"><div className="panel-head"><div><h3>Transaksi terbaru</h3><p>Aktivitas penjualan terakhir</p></div><button className="text-button" onClick={()=>setPage('reports')}>Lihat semua <ArrowRight size={14}/></button></div>{orders.length===0?<EmptyState icon={FileText} title="Belum ada transaksi" text="Transaksi pertama Anda akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Waktu</th><th>Pembuat pesanan</th><th>Pembayaran</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0,5).map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{shortTime(o.created_at)}</td><td>{teamMembers.find(m=>m.user_id===o.cashier_id)?.full_name?.trim() || teamMembers.find(m=>m.user_id===o.cashier_id)?.email || (o.cashier_id===session.user.id ? (membership?.full_name?.trim()||session.user.email) : (o.cashier_id ? 'Kasir ID '+o.cashier_id.slice(0,8) : 'Tidak tercatat (transaksi lama)'))}</td><td><span className="payment-tag">{o.payment_method}</span></td><td className="strong">{money(o.total)}</td><td><span className="status-pill status-paid">{o.status==='paid'?'Berhasil':o.status}</span></td></tr>)}</tbody></table></div>}</div><div className="panel queue-panel"><div className="panel-head"><div><h3>Antrian berjalan</h3><p>Pantauan layanan real-time</p></div><button className="icon-button" onClick={()=>setPage('queue')}><ArrowRight size={16}/></button></div><div className="queue-mini-stats"><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div><div><small>Dipanggil</small><strong>{activeQueue.length}</strong></div></div>{queue.filter(t=>t.status!=='done'&&t.status!=='skipped').slice(0,4).map(t=><div className="queue-mini-row" key={t.id}><span className="queue-number">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><span className="queue-mini-name">{t.customer_name||'Pelanggan'}</span><span className={`status-pill ${t.status==='waiting'?'status-waiting':'status-serving'}`}>{t.status==='waiting'?'Menunggu':'Dipanggil'}</span></div>)}{queue.length===0&&<EmptyState icon={Ticket} title="Belum ada antrian" text="Antrian baru akan muncul otomatis."/>}</div></div>
        </section>}

        {page==='pos'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SALES / CHECKOUT</span><h1>Kasir <span className="heading-accent">POS.</span></h1><p>Pilih produk, proses pembayaran, dan cetak struk.</p></div><span className={`date-pill ${activeShift?'':'shift-closed-pill'}`}><i className="live-dot"/> {activeShift?'Shift aktif':'Shift belum dibuka'}</span></div>{!activeShift&&<div className="shift-required-banner"><div><strong>Buka shift untuk mengaktifkan transaksi POS</strong><p>Masukkan saldo awal kas melalui menu Buka / tutup kasir sebelum memproses penjualan.</p></div><button className="btn btn-primary" onClick={()=>setPage('cashier')}><Wallet size={16}/> Buka kasir</button></div>}{shiftBreak&&<div className="shift-required-banner" style={{borderColor:'#d97706',background:'rgba(217,119,6,0.08)'}}><div><strong>Kasir sedang istirahat</strong><p>Transaksi tidak dapat diselesaikan sampai Anda kembali bekerja. Sesi kasir tetap terbuka.</p></div><button className="btn btn-primary" onClick={()=>setPage('cashier')}><Clock3 size={16}/> Kembali bekerja</button></div>}<div className="pos-layout"><div className="pos-catalog"><div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPosProductPage(1);setProductPage(1)}} placeholder="Cari nama, SKU, barcode…"/></div><button className="icon-button" onClick={loadWorkspace} title="Refresh produk"><RefreshCw size={16}/></button></div><div className="category-pills">{categories.map(c=><button key={c} className={category===c?'category-active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{visibleProducts.slice((posProductPage-1)*listPageSize,posProductPage*listPageSize).map(p=><button key={p.id} className="product-tile" disabled={queueBusy||p.stock<=0} onClick={()=>addToCart(p)}><span className="product-tile-icon"><Package size={21}/></span><span className="product-tile-name">{p.name}</span><span className="product-tile-bottom"><strong>{money(p.price)}</strong><small>Stok {p.stock}</small></span><span className="product-add"><Plus size={14}/></span></button>)}</div>{visibleProducts.length===0&&<EmptyState icon={Package} title="Produk tidak ditemukan" text="Coba kata kunci lain atau tambahkan produk baru." action={canAddProduct?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}<Pagination page={posProductPage} total={visibleProducts.length} pageSize={listPageSize} onChange={setPosProductPage}/></div><aside className="cart-panel"><div className="cart-head"><div><h3><ShoppingCart size={18}/> Keranjang</h3><p>{cart.reduce((s,i)=>s+i.quantity,0)} item dipilih</p></div><button className="text-button" onClick={()=>setCart([])} disabled={!cart.length}>Kosongkan</button></div><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.id}><div className="cart-item-main"><strong>{item.name}</strong><small>{money(item.price)} / item</small><div className="quantity-control"><button disabled={queueBusy} onClick={()=>changeQty(item.id,-1)}><Minus size={12}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.id,1)} disabled={queueBusy||item.quantity>=item.stock}><Plus size={12}/></button></div></div><div className="cart-item-side"><strong>{money(item.price*item.quantity)}</strong><button className="icon-button danger-icon" disabled={queueBusy} onClick={()=>removeCartItem(item.id)}><Trash2 size={14}/></button></div></div>)}{cart.length===0&&<EmptyState icon={ShoppingCart} title="Keranjang masih kosong" text="Pilih produk untuk memulai transaksi."/>}</div><div className="checkout-fields">{settings?.queue_enabled!==false&&<><label>Nama pelanggan <span>Opsional · untuk antrian</span></label><input className="text-input" value={queueCustomer} disabled={queueBusy} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama untuk nomor antrian"/></>}<label>Diskon (Rp)</label><input className="text-input" type="number" min="0" max={subtotal} value={discount} disabled={queueBusy} onChange={e=>setDiscount(e.target.value)}/><label>Metode pembayaran</label><div className="payment-options">{[['cash','Tunai',Wallet],['qris','QRIS',QrCode],['transfer','Transfer',CreditCard]].map(([v,l,I])=><button key={v} className={payMethod===v?'payment-active':''} disabled={queueBusy} onClick={()=>setPayMethod(v)}><I size={15}/>{l}</button>)}</div>{payMethod==='cash'&&<><label>Uang diterima (Rp)</label><input className="text-input" type="number" min={total} value={paidAmount} disabled={queueBusy} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(total)}/></>}</div><div className="cart-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Diskon</span><strong className="discount-value">− {money(safeDiscount)}</strong></div><div className="grand-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>{payMethod==='cash'&&Number(paidAmount)>=total&&total>0&&<div><span>Kembalian</span><strong>{money(Number(paidAmount)-total)}</strong></div>}</div><button className="btn btn-primary btn-wide checkout-button" disabled={!cart.length||queueBusy||!activeShift} onClick={checkout}>{queueBusy?<span className="spinner"/>:<Check size={17}/>} Proses pembayaran <ArrowRight size={16}/></button><div className="cart-note"><ShieldCheck size={13}/> Transaksi aman tersimpan di cloud</div></aside></div></section>}

        {page==='products'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">INVENTORY / CATALOG</span><h1>Produk <span className="heading-accent">& stok.</span></h1><p>Kelola katalog, harga jual, barcode, dan ketersediaan stok.</p></div>{canAddProduct&&<button className="btn btn-primary" onClick={()=>setProductModal({})}><Plus size={17}/> Tambah produk</button>}</div><div className="product-toolbar panel"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setProductPage(1);setPosProductPage(1)}} placeholder="Cari produk, SKU, barcode…"/></div><label className="category-filter-label">Kategori<select className="text-input category-filter" value={productCategory} onChange={e=>{setProductCategory(e.target.value);setProductPage(1)}}>{categories.map(item=><option key={item} value={item}>{item}</option>)}</select></label><span className="result-count">{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length} produk</span></div><div className="panel inventory-panel"><div className="table-wrap"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Status</th>{isManager&&<th>Aksi</th>}</tr></thead><tbody>{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).slice((productPage-1)*listPageSize,productPage*listPageSize).map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-cell-icon"><Package size={17}/></span><strong>{p.name}</strong></div></td><td className="muted-cell">{p.sku||p.barcode||'—'}</td><td><span className="category-tag">{p.category||'Umum'}</span></td><td className="strong">{money(p.price)}</td><td><span className={`stock-count ${p.stock<=5?'stock-low':''}`}>{p.stock} unit</span></td><td><span className={`status-pill ${p.is_active?'status-paid':'status-inactive'}`}>{p.is_active?'Aktif':'Nonaktif'}</span></td>{isManager&&<td><div className="row-actions"><button className="icon-button" title="Edit produk" onClick={()=>setProductModal(p)}><Settings size={15}/></button><button className="icon-button danger-icon" title="Hapus produk" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length===0&&<EmptyState icon={Package} title={products.length===0?'Katalog masih kosong':'Produk tidak ditemukan'} text={products.length===0?'Tambahkan produk pertama untuk mulai berjualan.':'Coba kategori atau kata kunci lain.'} action={isManager&&products.length===0?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}</div><Pagination page={productPage} total={products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length} pageSize={listPageSize} onChange={setProductPage}/></div>{!canAddProduct&&<p className="permission-note"><ShieldCheck size={14}/> Karyawan dan Manager dapat melihat katalog. Manager dapat mengelola seluruh produk; Karyawan dapat menambahkan produk baru.</p>}</section>}

        {page==='queue'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SERVICE / QUEUE MANAGEMENT</span><h1>Sistem <span className="heading-accent">antrian.</span></h1><p>Nomor otomatis dan status tersinkron langsung ke semua perangkat.</p></div><div className="queue-heading-actions"><button className="btn btn-outline" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={17}/> Buka layar TV</button>{['owner','admin'].includes(membership?.role)&&<button className="btn btn-primary" onClick={()=>setPage('tv-settings')}><Settings size={17}/> Edit Tampilan TV</button>}</div></div><div className="queue-overview"><div className="queue-feature"><div className="queue-feature-head"><span className="banner-label"><span className="pulse-dot"/> LIVE QUEUE</span><span className="queue-today">{queue.length} tiket hari ini</span></div><div className="queue-feature-number">{activeQueue[0]?((settings?.queue_prefix||'A')+String(activeQueue[0].queue_number).padStart(3,'0')):'—'}</div><div className="queue-feature-label">{activeQueue[0]?'Sedang dipanggil':'Belum ada antrian dipanggil'}</div><div className="queue-feature-bottom"><span><i className="live-dot"/> Sinkron aktif</span><button onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}>Mode layar penuh <ArrowRight size={14}/></button></div></div><div className="queue-side-stats"><div className="queue-stat-card"><span className="stat-icon tone-orange"><Clock3 size={18}/></span><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-green"><Headphones size={18}/></span><div><small>Dipanggil / dilayani</small><strong>{activeQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-blue"><CheckCircle2 size={18}/></span><div><small>Selesai</small><strong>{queue.filter(t=>t.status==='done').length}</strong></div></div></div></div>{settings?.queue_enabled===false&&<div className="panel queue-disabled-notice"><Ticket size={20}/><div><strong>Sistem antrian sedang nonaktif</strong><p>Transaksi kasir tetap berjalan normal. Aktifkan kembali melalui Pengaturan toko jika ingin menggunakan antrian.</p></div><button className="btn btn-outline" onClick={()=>setPage('settings')}>Buka pengaturan</button></div>}<div className="queue-tools panel"><div><h3>Antrean & loket aktif</h3><p>Isi nama loket pada perangkat ini. TV menampilkan loket yang benar-benar menekan Panggil.</p></div><div className="queue-create-form"><input className="text-input" value={queueCounterLabel} onChange={e=>{setQueueCounterLabel(e.target.value);try{localStorage.setItem('nexapos-counter-label',e.target.value)}catch{}}} placeholder="Nama kasir/konter/loket (contoh: Loket 3)" aria-label="Nama kasir konter atau loket"/><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama pelanggan untuk nomor manual (opsional)"/><button className="btn btn-primary" disabled={queueBusy||settings?.queue_enabled===false} onClick={createTicket}><Plus size={16}/> Buat nomor</button></div></div><div className="panel queue-list-panel"><div className="panel-head"><div><h3>Daftar antrian hari ini</h3><p>Kelola status setiap pelanggan</p></div><button className="icon-button" onClick={loadWorkspace}><RefreshCw size={16}/></button></div>{queue.length===0?<EmptyState icon={Ticket} title="Belum ada antrian" text="Nomor akan tampil di sini saat dibuat."/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Pelanggan</th><th>Pembuat pesanan</th><th>Waktu</th><th>Loket pemanggil</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{queue.slice((queuePage-1)*listPageSize,queuePage*listPageSize).map(t=><tr key={t.id}><td><span className="queue-number large">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span></td><td className="strong">{t.customer_name||'Pelanggan'}</td><td>{t.created_by_name||'Petugas'}</td><td>{shortTime(t.created_at)}</td><td>{t.status==='waiting'?'—':(t.counter_label||'Loket')}</td><td><span className={`status-pill ${t.status==='waiting'?'status-waiting':t.status==='done'?'status-paid':t.status==='skipped'?'status-inactive':'status-serving'}`}>{({waiting:'Menunggu',called:'Dipanggil',serving:'Dilayani',done:'Selesai',skipped:'Dilewati'})[t.status]}</span></td><td><div className="row-actions">{settings?.queue_enabled!==false&&t.status==='waiting'&&<button className="btn btn-small btn-primary" disabled={queueBusy} title={queueCounterLabel.trim() ? 'Panggil nomor antrean' : 'Nama loket akan menggunakan nama akun Anda'} onClick={()=>updateTicket(t,'called')}><Bell size={13}/> Panggil</button>}{settings?.queue_enabled!==false&&t.status==='called'&&<button className="btn btn-small btn-outline" onClick={()=>updateTicket(t,'serving')}>Layani</button>}{settings?.queue_enabled!==false&&['called','serving'].includes(t.status)&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'done')}><Check size={13}/> Selesai</button>}{settings?.queue_enabled!==false&&t.status==='waiting'&&<button className="icon-button" title="Lewati" onClick={()=>updateTicket(t,'skipped')}><SkipForward size={15}/></button>}</div></td></tr>)}</tbody></table></div>}<Pagination page={queuePage} total={queue.length} pageSize={listPageSize} onChange={setQueuePage}/></div></section>}

        {page==='monitoring'&&['owner','admin'].includes(membership?.role)&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">OPERATIONS / LIVE MONITORING</span><h1>Monitoring <span className="heading-accent">kasir aktif.</span></h1><p>Pantau kasir yang sedang membuka sesi, transaksi, dan nilai penjualan pada toko ini. Data aktivitas tersinkron secara real-time.</p></div><span className="date-pill"><i className="live-dot"/> LIVE</span></div>{staleShiftRows.length>0&&<div className="panel" style={{border:'2px solid #d97706',background:'rgba(217,119,6,0.07)',marginBottom:18}}><div className="panel-head"><div><h3 style={{color:'#b45309'}}><Clock3 size={18}/> Peringatan sesi kasir belum ditutup</h3><p>{staleShiftRows.length} sesi terbuka lebih dari 12 jam. Ini hanya peringatan; sistem tidak menutup sesi otomatis.</p></div><span className="status-pill" style={{background:'#fef3c7',color:'#92400e'}}>PERIKSA SESI</span></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai sesi</th><th>Durasi terbuka</th></tr></thead><tbody>{staleShiftRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><strong>{row.elapsedHours} jam</strong></td></tr>)}</tbody></table></div></div>}{overdueBreakRows.length>0&&<div className="panel" style={{border:'2px solid #dc2626',background:'rgba(220,38,38,0.07)',marginBottom:18}}><div className="panel-head"><div><h3 style={{color:'#b91c1c'}}><Bell size={18}/> Peringatan istirahat melewati batas</h3><p>{overdueBreakRows.length} kasir perlu ditindaklanjuti. Bunyi pengingat lokal berulang setiap {breakSettings.repeat_reminder_minutes||5} menit saat halaman monitoring terbuka.</p></div><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span className="status-pill" style={{background:'#fee2e2',color:'#991b1b'}}>ESKALASI</span><button type="button" className="btn btn-small btn-outline" onClick={enableMonitoringSound}>{monitoringSoundReady?'Suara aktif':'Aktifkan suara'}</button></div></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Durasi istirahat</th><th>Melewati batas</th><th>Mulai istirahat</th><th>Aksi</th></tr></thead><tbody>{overdueBreakRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td><strong style={{color:'#b91c1c'}}>{row.elapsedMinutes} menit</strong></td><td>{row.overdueMinutes} menit</td><td>{new Date(row.started_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><button type="button" className="btn btn-small btn-primary" disabled={sendingBreakAlert===row.cashier_id} onClick={()=>sendBreakAlert(row)}>{sendingBreakAlert===row.cashier_id?'Mengirim…':'Kirim Peringatan'}</button></td></tr>)}</tbody></table></div></div>}
        <div className="stats-grid report-finance-stats"><StatCard icon={Users} label="Kasir aktif" value={openCashierShifts.length.toLocaleString('id-ID')} meta="Sesi yang masih terbuka" tone="violet"/><StatCard icon={ShoppingBag} label="Transaksi aktif" value={monitoringTransactionTotal.toLocaleString('id-ID')} meta="Transaksi lunas sejak sesi dibuka" tone="blue"/><StatCard icon={Wallet} label="Penjualan sesi aktif" value={money(monitoringSalesTotal)} meta="Akumulasi transaksi lunas kasir aktif" tone="orange"/></div><div className="panel report-panel"><div className="panel-head"><div><h3><Users size={17}/> Daftar kasir aktif</h3><p>Urutan mengikuti waktu mulai sesi; yang mulai lebih dahulu berada di atas.</p></div><span className="result-count">{monitoringCashierRows.length} kasir</span></div><div className="report-filter-grid"><label>Cari kasir<input className="text-input" type="search" value={monitoringSearch} onChange={e=>setMonitoringSearch(e.target.value)} placeholder="Nama, email, atau ID kasir…"/></label></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai aktif</th><th>Durasi sesi</th><th>Modal awal</th><th>Transaksi lunas</th><th>Total penjualan</th><th>Status</th></tr></thead><tbody>{monitoringCashierRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{(()=>{const mins=Math.max(0,Math.floor((Date.now()-new Date(row.opened_at).getTime())/60000));return mins>=60?Math.floor(mins/60)+' jam '+(mins%60)+' menit':mins+' menit'})()}</td><td>{money(row.opening_cash)}</td><td>{row.transactionCount.toLocaleString('id-ID')}</td><td className="strong">{money(row.salesTotal)}</td><td>{monitoringBreakRows.some(item=>item.shift_id===row.id)?<span className="status-pill status-waiting">Istirahat · {monitoringBreakRows.find(item=>item.shift_id===row.id)?.elapsedMinutes} mnt</span>:<span className="status-pill status-paid">Aktif melayani</span>}</td></tr>)}</tbody></table></div>{monitoringCashierRows.length===0&&<EmptyState icon={Users} title={openCashierShifts.length?'Kasir tidak ditemukan':'Belum ada kasir aktif'} text={openCashierShifts.length?'Coba kata pencarian lain.':'Kasir yang membuka sesi akan muncul otomatis di sini.'}/>}</div><div className="panel report-panel"><div className="panel-head"><div><h3><Clock3 size={17}/> Riwayat istirahat 7 hari terakhir</h3><p>Riwayat berakhir tersimpan untuk audit operasional.</p></div><span className="result-count">{breakHistory.length} catatan</span></div>{breakHistory.length===0?<p className="subtle" style={{padding:16}}>Belum ada istirahat yang selesai dalam 7 hari terakhir.</p>:<div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai</th><th>Kembali</th><th>Durasi</th></tr></thead><tbody>{breakHistory.map(row=>{const member=teamMembers.find(item=>item.user_id===row.cashier_id);const duration=Math.max(0,Math.floor((new Date(row.ended_at).getTime()-new Date(row.started_at).getTime())/60000));return <tr key={row.id}><td>{member?.full_name||member?.email||row.cashier_name_snapshot||'Kasir '+String(row.cashier_id||'').slice(0,8)}</td><td>{new Date(row.started_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{new Date(row.ended_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{duration} menit</td></tr>})}</tbody></table></div>}</div><div className="panel shift-form"><div className="panel-head"><div><h3><ShieldCheck size={17}/> Catatan monitoring</h3><p>Status aktif berarti sesi kasir masih terbuka, bukan jaminan perangkat sedang online atau digunakan saat ini.</p></div></div><p className="subtle">Istirahat tidak menutup sesi kasir. Durasi dan riwayat istirahat tersimpan; peringatan suara berjalan saat halaman monitoring admin/owner terbuka dan browser mengizinkan audio. Sesi yang terlupa ditutup tidak ditutup otomatis.</p></div></section>}

        {page==='reports'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SALES / SALES REPORT</span><h1>Laporan <span className="heading-accent">penjualan.</span></h1><p>Filter rentang tanggal dan cari transaksi berdasarkan nomor struk, metode pembayaran, atau kasir.</p></div><button className="btn btn-outline" onClick={()=>{const rows=[['No Struk','Tanggal','Pembayaran','Kasir','Subtotal','Diskon','Total','Status'],...reportFilteredOrders.map(o=>[o.receipt_number,o.created_at,o.payment_method,teamMembers.find(m=>m.user_id===o.cashier_id)?.full_name||teamMembers.find(m=>m.user_id===o.cashier_id)?.email||o.cashier_id,o.subtotal,o.discount,o.total,o.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='nexapos-laporan-penjualan-'+reportRangeStart+'-sampai-'+reportRangeEnd+'.csv';a.click();URL.revokeObjectURL(url)}}><ArrowDownRight size={16}/> Unduh laporan</button></div>
        <div className="panel report-filter-panel"><div className="panel-head"><div><h3><CalendarDays size={17}/> Filter laporan</h3><p>Pilih rentang tanggal, lalu cari transaksi bila diperlukan.</p></div><button className="btn btn-ghost btn-small" onClick={()=>{setReportStart('');setReportEnd('');setReportSearch('');setOrderPage(1)}}>Hari ini</button></div><div className="report-filter-grid"><label>Dari tanggal<input className="text-input" type="date" max={today()} value={reportRangeStart} onChange={e=>{setReportStart(e.target.value);setOrderPage(1)}}/></label><label>Sampai tanggal<input className="text-input" type="date" min={reportRangeStart} max={today()} value={reportRangeEnd} onChange={e=>{setReportEnd(e.target.value);setOrderPage(1)}}/></label><label>Cari transaksi<input className="text-input" type="search" value={reportSearch} onChange={e=>{setReportSearch(e.target.value);setOrderPage(1)}} placeholder="No. struk, nama kasir, metode…"/></label></div></div>
        <div className="stats-grid report-finance-stats"><StatCard icon={Wallet} label="Total penjualan" value={money(reportRevenue)} meta={selectedReportDate===today()?'Hari ini':new Date(selectedReportDate+'T12:00:00').toLocaleDateString('id-ID')} tone="violet"/><StatCard icon={CircleDollarSign} label="Total modal" value={money(reportCapital)} meta="Harga modal produk × jumlah terjual" tone="blue"/><StatCard icon={ShoppingBag} label="Transaksi lunas" value={reportPaidOrders.length.toLocaleString('id-ID')} meta="Transaksi berhasil pada tanggal dipilih" tone="blue"/><StatCard icon={Package} label="Produk terjual" value={reportUnits.toLocaleString('id-ID')} meta={reportItems.length+' baris item' } tone="orange"/></div>
        <div className="panel report-panel"><div className="panel-head"><div><h3>Riwayat transaksi harian</h3><p>{new Date(selectedReportDate+'T12:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div><span className="result-count">{reportFilteredOrders.length} transaksi</span></div><div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Waktu</th><th>Pembuat pesanan</th><th>Metode</th><th>Subtotal</th><th>Diskon</th><th>Total</th><th>Status</th><th>Struk</th></tr></thead><tbody>{reportFilteredOrders.slice((orderPage-1)*listPageSize,orderPage*listPageSize).map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{shortTime(o.created_at)}</td><td>{teamMembers.find(m=>m.user_id===o.cashier_id)?.full_name?.trim() || teamMembers.find(m=>m.user_id===o.cashier_id)?.email || (o.cashier_id===session.user.id ? (membership?.full_name?.trim()||session.user.email) : (o.cashier_id ? 'Kasir ID '+o.cashier_id.slice(0,8) : 'Tidak tercatat (transaksi lama)'))}</td><td><span className="payment-tag">{o.payment_method}</span></td><td>{money(o.subtotal)}</td><td>{money(o.discount)}</td><td className="strong">{money(o.total)}</td><td><span className={`status-pill ${o.status==='paid'?'status-paid':'status-inactive'}`}>{o.status}</span></td><td><button className="icon-button" onClick={async()=>{const {data}=await supabase.from('order_items').select('*').eq('order_id',o.id);setReceipt({order:o,items:data||[],ticket:null});setTimeout(()=>window.print(),100)}} title="Cetak struk"><Printer size={15}/></button></td></tr>)}</tbody></table></div><Pagination page={orderPage} total={reportFilteredOrders.length} pageSize={listPageSize} onChange={setOrderPage}/>{reportFilteredOrders.length===0&&<EmptyState icon={FileText} title="Belum ada transaksi pada tanggal ini" text="Pilih tanggal lain atau buat transaksi baru di menu Kasir."/>}</div></section>}


        {page==='cashier'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">CASH MANAGEMENT / SHIFT</span><h1>Buka / tutup <span className="heading-accent">kasir.</span></h1><p>Catat saldo awal, rekonsiliasi uang tunai dan QRIS, serta tutup shift setiap kasir.</p></div><span className={`date-pill ${activeShift?'':'shift-closed-pill'}`}><i className="live-dot"/>{activeShift?'Shift sedang berjalan':'Shift belum dibuka'}</span></div>
          
          {!activeShift?<form className="panel shift-form" onSubmit={openCashierShift}><div className="panel-head"><div><h3><Wallet size={17}/> Buka shift kasir</h3><p>Masukkan saldo tunai awal sebelum menerima transaksi.</p></div></div><div className="shift-open-grid"><label>Saldo awal tunai (Rp)<input className="text-input" type="number" min="0" step="1" value={shiftOpeningCash} onChange={e=>setShiftOpeningCash(e.target.value)} required/></label></div><button className="btn btn-primary" disabled={shiftBusy}>{shiftBusy?<span className="spinner"/>:<Check size={16}/>} Buka shift</button></form>
          :<form className="panel shift-form" onSubmit={closeCashierShift}><div className="panel-head"><div><h3><Clock3 size={17}/> Shift aktif</h3><p>Dibuka {new Date(activeShift.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}. Tutup shift setelah transaksi selesai.</p></div><span className="status-pill status-paid">Aktif</span></div><div className="break-self-control" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:'12px 0'}}><div><strong>{shiftBreak?'Sedang istirahat':'Sedang bekerja'}</strong><p className="subtle" style={{margin:'4px 0 0'}}>{shiftBreak?'Mulai '+new Date(shiftBreak.started_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta'})+' · sesi tetap aktif':'Istirahat akan tercatat di monitoring admin/owner.'}</p></div>{shiftBreak?<button type="button" className="btn btn-primary" onClick={endCashierBreak}><CheckCircle2 size={16}/> Kembali Bekerja</button>:<button type="button" className="btn btn-outline" onClick={startCashierBreak}><Clock3 size={16}/> Mulai Istirahat</button>}</div><div className="shift-difference-grid"><div><span>Saldo awal tunai</span><strong>{money(activeShift.opening_cash)}</strong></div><div><span>Tunai yang diharapkan</span><strong>{money(expectedShiftCash)}</strong></div><div><span>Penjualan QRIS</span><strong>{money(expectedShiftQris)}</strong></div><div><span>Transaksi selama shift</span><strong>{currentShiftOrders.length.toLocaleString('id-ID')}</strong></div></div><div className="shift-form-grid"><label>Uang tunai aktual (Rp)<input className="text-input" type="number" min="0" step="1" value={shiftCountedCash} onChange={e=>setShiftCountedCash(e.target.value)} placeholder="Hitung uang tunai" required/></label><label>Total QRIS aktual (Rp)<input className="text-input" type="number" min="0" step="1" value={shiftCountedQris} onChange={e=>setShiftCountedQris(e.target.value)} placeholder="Total QRIS" required/></label><label className="shift-notes-label">Catatan penutupan (opsional)<textarea className="text-input" value={shiftNotes} onChange={e=>setShiftNotes(e.target.value)} rows="3" placeholder="Catatan selisih atau kendala"/></label></div><button className="btn btn-primary" disabled={shiftBusy||Boolean(shiftBreak)||shiftCountedCash===''||shiftCountedQris===''}>{shiftBusy?<span className="spinner"/>:<CheckCircle2 size={16}/>} Tutup shift dan simpan rekap</button></form>}
          <div className="panel report-panel"><div className="panel-head"><div><h3>Riwayat shift hari ini</h3><p>Riwayat buka/tutup kasir untuk toko aktif.</p></div><button className="btn btn-ghost btn-small" onClick={()=>setShiftReportDate(today())}>Hari ini</button></div><div className="report-filter-grid"><label>Tanggal<input className="text-input" type="date" max={today()} value={shiftReportDate} onChange={e=>setShiftReportDate(e.target.value)}/></label></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Dibuka</th><th>Ditutup</th><th>Saldo awal</th><th>Tunai aktual</th><th>QRIS aktual</th><th>Selisih tunai</th><th>Selisih QRIS</th><th>Status</th></tr></thead><tbody>{shiftRecords.map(row=><tr key={row.id}><td>{row.cashier_id===session.user.id?'Anda':row.cashier_id.slice(0,8)}</td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{row.closed_at?new Date(row.closed_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}):'—'}</td><td>{money(row.opening_cash)}</td><td>{row.counted_cash==null?'—':money(row.counted_cash)}</td><td>{row.counted_qris==null?'—':money(row.counted_qris)}</td><td>{row.cash_difference==null?'—':money(row.cash_difference)}</td><td>{row.qris_difference==null?'—':money(row.qris_difference)}</td><td><span className={`status-pill ${row.closed_at?'status-paid':'status-waiting'}`}>{row.closed_at?'Ditutup':'Aktif'}</span></td></tr>)}</tbody></table></div>{shiftRecords.length===0&&<EmptyState icon={CalendarDays} title="Belum ada catatan shift" text="Shift kasir yang dibuka akan muncul di sini."/>}</div>
        </section>}

        {page==='attendance'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">TEAM / ATTENDANCE</span><h1>Laporan <span className="heading-accent">absensi.</span></h1><p>Filter rentang tanggal dan cari nama kasir, ID, atau catatan absensi.</p></div><button className="btn btn-outline" onClick={()=>{const rows=[['ID Kasir','Nama Kasir','Waktu Masuk','Waktu Keluar','Durasi','Saldo Awal','Tunai Aktual','QRIS Aktual','Selisih Tunai','Selisih QRIS','Catatan'],...filteredAttendanceRecords.map(row=>[row.cashier_id,teamMembers.find(m=>m.user_id===row.cashier_id)?.full_name||teamMembers.find(m=>m.user_id===row.cashier_id)?.email||'',row.opened_at,row.closed_at||'',row.closed_at?Math.max(0,Math.round((new Date(row.closed_at)-new Date(row.opened_at))/60000))+' menit':'Masih aktif',row.opening_cash,row.counted_cash??'',row.counted_qris??'',row.cash_difference??'',row.qris_difference??'',row.notes||''])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='nexapos-absensi-'+(attendanceStart||today())+'-sampai-'+(attendanceEnd||attendanceStart||today())+'.csv';a.click();URL.revokeObjectURL(url)}}><ArrowDownRight size={16}/> Unduh laporan absensi</button></div><div className="panel report-filter-panel"><div className="panel-head"><div><h3><CalendarDays size={17}/> Filter absensi</h3><p>Pilih rentang tanggal dan gunakan pencarian untuk menyaring hasil.</p></div><button className="btn btn-ghost btn-small" onClick={()=>{setAttendanceStart(today());setAttendanceEnd(today());setAttendanceSearch('')}}>Hari ini</button></div><div className="report-filter-grid"><label>Dari tanggal<input className="text-input" type="date" max={today()} value={attendanceStart} onChange={e=>setAttendanceStart(e.target.value)}/></label><label>Sampai tanggal<input className="text-input" type="date" min={attendanceStart} max={today()} value={attendanceEnd} onChange={e=>setAttendanceEnd(e.target.value)}/></label><label>Cari absensi<input className="text-input" type="search" value={attendanceSearch} onChange={e=>setAttendanceSearch(e.target.value)} placeholder="Nama kasir, ID, catatan…"/></label></div></div><div className="panel report-panel"><div className="panel-head"><div><h3>Riwayat kehadiran</h3><p>{attendanceStart||today()} sampai {attendanceEnd||attendanceStart||today()}</p></div><span className="result-count">{filteredAttendanceRecords.length} catatan</span></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Waktu masuk</th><th>Waktu keluar</th><th>Durasi</th><th>Saldo awal</th><th>Tunai aktual</th><th>QRIS aktual</th><th>Selisih</th><th>Catatan</th></tr></thead><tbody>{filteredAttendanceRecords.map(row=><tr key={row.id}><td>{teamMembers.find(m=>m.user_id===row.cashier_id)?.full_name||teamMembers.find(m=>m.user_id===row.cashier_id)?.email||(row.cashier_id===session.user.id?'Anda':row.cashier_id.slice(0,8))}</td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{row.closed_at?new Date(row.closed_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}):'—'}</td><td>{row.closed_at?Math.max(0,Math.round((new Date(row.closed_at)-new Date(row.opened_at))/60000))+' menit':'Sedang bertugas'}</td><td>{money(row.opening_cash)}</td><td>{row.counted_cash==null?'—':money(row.counted_cash)}</td><td>{row.counted_qris==null?'—':money(row.counted_qris)}</td><td>{row.cash_difference==null?'—':money(Number(row.cash_difference)+Number(row.qris_difference||0))}</td><td>{row.notes||'—'}</td></tr>)}</tbody></table></div>{filteredAttendanceRecords.length===0&&<EmptyState icon={CalendarDays} title="Belum ada data absensi" text="Coba ubah rentang tanggal atau kata pencarian."/>}</div></section>}

        {page==='audit'&&membership.role==='owner'&&<AuditLogPanel scope="organization" organizationId={ownerOrganization?.id} storeId={store?.id}/>}
        {page==='reports-org'&&membership.role==='owner'&&<OrganizationReports organization={ownerOrganization} tenants={ownerTenants}/>}
        {page==='tenants'&&membership.role==='owner'&&<section className="page-section">
        <div className="page-heading"><div><span className="eyebrow muted">OWNER WORKSPACE / COMPANY</span><h1>Tenant <span className="heading-accent">& lokasi.</span></h1><p>Kelola tenant dalam satu perusahaan. Semua tenant memakai paket dan masa aktif perusahaan yang sama.</p></div><span className="role-chip"><Store size={14}/> OWNER</span></div>
        {ownerOrganization ? <div className="stats-grid">
          <StatCard icon={Store} label="Tenant tambahan" value={ownerTenants.filter(item=>!item.is_primary_workspace&&item.status!=='deleted'&&!item.deleted_at).length} meta={'Di luar workspace utama · kuota '+Number(ownerOrganization.activation_location_limit||0)} tone="violet"/>
          <StatCard icon={Package} label="Paket perusahaan" value={ownerOrganization.activation_package_key||'starter'} meta="Diatur Super Admin" tone="blue"/>
          <StatCard icon={CalendarDays} label="Masa aktif" value={ownerOrganization.expires_at?new Date(ownerOrganization.expires_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'}):'Belum aktif'} meta={ownerOrganization.status==='active'?'Status aktif':'Status: '+ownerOrganization.status} tone={ownerOrganization.status==='active'?'green':'orange'}/>
        </div> : <div className="panel"><strong>Perusahaan Owner belum terhubung</strong><p>Hubungi Super Admin untuk menautkan akun Owner ke perusahaan dan paket aktivasi.</p></div>}
        <div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Store size={17}/> Tenant milik perusahaan</h3><p>Pilih tenant untuk berpindah workspace. Data tenant lain tetap terisolasi.</p></div></div>
          {ownerTenants.filter(item=>item.status!=='deleted'&&!item.deleted_at).length ? <div className="table-wrap"><table><thead><tr><th>Nama tenant</th><th>Status</th><th>Paket / kuota</th><th>Workspace</th><th>Aksi</th></tr></thead><tbody>{ownerTenants.filter(item=>item.status!=='deleted'&&!item.deleted_at).map(item=>{const linked=Boolean(item.has_membership)||memberships.some(memberItem=>memberItem.store_id===item.id);return <tr key={item.id}><td><strong>{item.name}</strong><br/><small className="mono">{item.id}</small></td><td><span className={'status-pill '+(item.status==='active'?'status-paid':item.status==='pending'?'status-waiting':'status-inactive')}>{item.status||'—'}</span>{item.expires_at&&<><br/><small>Berakhir {new Date(item.expires_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'})}</small></>}</td><td>{item.is_primary_workspace?'Workspace utama':(item.activation_package_key||ownerOrganization?.activation_package_key||'starter')+' · Tenant tambahan'}</td><td>{item.id===store.id?<span className="status-pill status-paid">Sedang aktif</span>:linked?<button type="button" className="btn btn-small btn-outline" onClick={()=>{setSelectedStoreId(item.id);setPage('dashboard')}}>Buka workspace <ArrowRight size={13}/></button>:<span className="subtle">Menunggu undangan Owner</span>}</td><td><button type="button" className="btn btn-small btn-outline" disabled={ownerTenantBusy} onClick={()=>deleteOwnerTenant(item)}><Trash2 size={13}/> Hapus permanen</button></td></tr>})}</tbody></table></div> : <div className="empty-state"><strong>Belum ada tenant Owner</strong><p>Tenant perusahaan yang terhubung akan muncul di sini.</p></div>}
        </div>
        <div className="panel super-register-panel"><div className="panel-head"><div><h3><Plus size={17}/> Tambah tenant</h3><p>Tenant tambahan otomatis mengikuti kuota dan tanggal kedaluwarsa perusahaan. Workspace utama tidak mengurangi kuota tenant tambahan.</p></div></div>
          <form className="tenant-register-form" onSubmit={createOwnerTenant}><div><label>Nama tenant baru</label><input className="text-input" value={ownerTenantName} onChange={event=>setOwnerTenantName(event.target.value)} placeholder="Contoh: Cabang Pusat Kota" maxLength={120} required/></div><button className="btn btn-primary" disabled={ownerTenantBusy||!ownerOrganization||ownerOrganization.status!=='active'||ownerTenants.filter(item=>!item.is_primary_workspace&&item.status!=='deleted'&&!item.deleted_at).length>=Number(ownerOrganization.activation_location_limit||0)}>{ownerTenantBusy?<span className="spinner"/>:<Plus size={16}/>} Buat tenant</button></form>
          {!ownerOrganization ? <p className="subtle">Perusahaan belum tersedia. Minta Super Admin menautkan perusahaan terlebih dahulu.</p> : ownerOrganization.status!=='active' ? <p className="subtle">Pembuatan tenant hanya tersedia saat paket perusahaan aktif.</p> : ownerTenants.filter(item=>!item.is_primary_workspace&&item.status!=='deleted'&&!item.deleted_at).length>=Number(ownerOrganization.activation_location_limit||0) ? <p className="subtle">Kuota tenant sudah penuh. Hubungi Super Admin untuk meningkatkan paket.</p> : <p className="subtle">Sisa kuota: {Math.max(0,Number(ownerOrganization.activation_location_limit||0)-ownerTenants.filter(item=>!item.is_primary_workspace&&item.status!=='deleted'&&!item.deleted_at).length)} tenant.</p>}
        </div>
      </section>}
      {page==='team'&&['owner','admin'].includes(membership.role)&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">TEAM / ACCESS CONTROL</span><h1>Karyawan <span className="heading-accent">& akses.</span></h1><p>Undang akun baru dan atur jabatan khusus untuk toko ini.</p></div><span className="role-chip"><ShieldCheck size={14}/> {membership.role==='owner'?'Owner':'Manager'}</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={inviteTeamMember}><div className="panel-head"><div><h3><UserPlus size={17}/> Daftarkan karyawan</h3><p>Undangan hanya berlaku untuk email ini. Karyawan harus aktivasi dan membuat password sebelum login.</p></div></div><label>Nama karyawan</label><input className="text-input" name="full_name" placeholder="Nama lengkap" required/><label>Email akun</label><input className="text-input" type="email" name="email" placeholder="karyawan@email.com" required/><label>Jabatan di toko</label><select className="text-input" name="role" defaultValue="cashier"><option value="admin">Manager</option><option value="cashier">Karyawan</option></select><button className="btn btn-primary" disabled={teamSaving}>{teamSaving?<span className="spinner"/>:<UserPlus size={16}/>} Buat undangan</button><p className="permission-note">Undangan berlaku 30 hari. Akun tidak mendapatkan akses ke tenant lain.</p></form><div className="panel"><div className="panel-head"><div><h3><Users size={17}/> Anggota toko</h3><p>{teamMembers.length} akun terdaftar</p></div></div>{teamMembers.length===0?<EmptyState icon={Users} title="Belum ada karyawan" text="Akun Owner akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>Nama / email</th><th>Jabatan</th><th>Akses</th><th>Bergabung</th><th>Kelola</th></tr></thead><tbody>{teamMembers.slice((teamMemberPage-1)*listPageSize,teamMemberPage*listPageSize).map(m=><tr key={m.id}><td><strong>{m.full_name?.trim()||'Akun toko'}</strong>{m.email&&<><br/><small className="member-email-visible">{m.email}</small></>}</td><td><span className="status-pill status-serving">{m.role==='owner'?'Owner':m.role==='admin'?'Manager':m.role==='manager'?'Manager':'Karyawan'}</span></td><td><span className={'status-pill '+(m.is_active?'status-paid':'status-inactive')}>{m.is_active?'Aktif':'Nonaktif'}</span></td><td>{new Date(m.created_at).toLocaleDateString('id-ID')}</td><td>{m.role!=='owner'&&<div className="member-manage-cell"><form className="member-role-form" onSubmit={saveTeamMemberRole}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="is_active" value={String(m.is_active)}/><input className="text-input member-name-edit" name="full_name" defaultValue={m.full_name||''} aria-label={'Nama '+(m.email||m.user_id)} required minLength={2}/><select className="text-input" name="role" defaultValue={m.role==='admin'?'admin':'cashier'} aria-label={'Jabatan '+(m.email||m.user_id)}><option value="admin">Manager</option><option value="cashier">Karyawan</option></select><button className="btn btn-small btn-outline">Simpan</button></form><div className="member-manage-actions"><button className={'btn btn-small '+(m.is_active?'btn-outline':'btn-primary')} onClick={()=>toggleTeamMember(m)}>{m.is_active?'Nonaktifkan':'Aktifkan'}</button><button className="btn btn-small btn-outline" onClick={()=>resetTeamMemberPin(m)}><ShieldCheck size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" onClick={()=>resetTeamMemberPassword(m)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamMember(m)}><Trash2 size={13}/> Hapus permanen</button></div></div>}</td></tr>)}</tbody></table></div>}<Pagination page={teamMemberPage} total={teamMembers.length} pageSize={listPageSize} onChange={setTeamMemberPage}/></div></div><div className="panel team-invites-panel"><div className="panel-head"><div><h3><Mail size={17}/> Riwayat undangan</h3><p>Undangan aktif dan yang sudah diterima</p></div></div>{teamInvites.length===0?<p className="subtle">Belum ada undangan.</p>:<div className="table-wrap"><table><thead><tr><th>Email</th><th>Jabatan</th><th>Status</th><th>Kedaluwarsa</th><th>Aksi</th></tr></thead><tbody>{teamInvites.slice((teamInvitePage-1)*listPageSize,teamInvitePage*listPageSize).map(i=><tr key={i.id}><td><strong>{i.full_name?.trim()||'Undangan'}</strong><br/><small className="member-email-visible">{i.email}</small></td><td>{i.role==='owner'?'Owner':i.role==='admin'?'Admin':'Kasir'}</td><td><span className={'status-pill '+(i.accepted_at?'status-paid':new Date(i.expires_at)<new Date()?'status-inactive':'status-waiting')}>{i.accepted_at?'Diterima':new Date(i.expires_at)<new Date()?'Kedaluwarsa':'Menunggu'}</span></td><td>{new Date(i.expires_at).toLocaleDateString('id-ID')}</td><td><div className="member-manage-actions">{!i.accepted_at&&<button className="btn btn-small btn-outline" disabled={teamSaving} onClick={()=>regenerateTeamInviteCode(i)}><KeyRound size={13}/> Buat ulang kode</button>}<button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamInvite(i)}><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div>}<Pagination page={teamInvitePage} total={teamInvites.length} pageSize={listPageSize} onChange={setTeamInvitePage}/></div></section>}

        {page==='profile'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">ACCOUNT / SECURITY</span><h1>Profil <span className="heading-accent">& keamanan.</span></h1><p>Perbarui nama, ganti PIN 4 angka, dan ubah password akun Anda.</p></div><span className="role-chip"><ShieldCheck size={14}/> Terverifikasi</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.rpc('update_my_profile',{p_full_name:String(f.get('full_name')||'').trim()});if(error){setNotice(userFacingError(error));return}setNotice('Profil diperbarui.');await loadWorkspace()}}><div className="panel-head"><div><h3><UserRound size={17}/> Profil akun</h3><p>Email login: {session.user.email}</p></div></div><label>Nama lengkap</label><input className="text-input" name="full_name" defaultValue={session.user.user_metadata?.full_name||membership?.full_name||''} required minLength={2} maxLength={120}/><label>Email akun</label><input className="text-input" value={session.user.email||''} readOnly/><button className="btn btn-primary"><Check size={16}/> Simpan profil</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_pin')||'');const next=String(f.get('new_pin')||'');const confirmPin=String(f.get('confirm_pin')||'');if(!/^\d{4}$/.test(next)||next!==confirmPin){setNotice('PIN baru harus tepat 4 angka dan konfirmasinya harus sama.');return}const {data,error}=await supabase.rpc('change_my_pin',{p_current_pin:current,p_new_pin:next});if(error){setNotice(userFacingError(error));return}if(data!==true){setNotice('PIN saat ini salah. Percobaan gagal tercatat untuk pembatasan keamanan.');return}form.reset();setNotice('PIN berhasil diganti. Sesi keamanan diperbarui.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti PIN</h3><p>PIN hanya terdiri dari 4 angka. Jangan bagikan kepada siapa pun.</p></div></div><label>PIN saat ini</label><input className="text-input" name="current_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>PIN baru</label><input className="text-input" name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>Ulangi PIN baru</label><input className="text-input" name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti PIN</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_password')||'');const next=String(f.get('new_password')||'');const confirmPassword=String(f.get('confirm_password')||'');if(next.length<6||next!==confirmPassword){setNotice('Password baru minimal 6 karakter dan konfirmasinya harus sama.');return}const reauth=await supabase.auth.signInWithPassword({email:session.user.email,password:current});if(reauth.error){setNotice('Password saat ini salah.');return}const changed=await supabase.auth.updateUser({password:next});if(changed.error){setNotice(userFacingError(changed.error, 'Password belum berhasil diganti. Periksa kembali lalu coba lagi.'));return}form.reset();setNotice('Password berhasil diganti. Silakan verifikasi PIN kembali jika diminta.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti password</h3><p>Gunakan password unik minimal 6 karakter.</p></div></div><label>Password saat ini</label><input className="text-input" name="current_password" type="password" autoComplete="current-password" required/><label>Password baru</label><input className="text-input" name="new_password" type="password" autoComplete="new-password" minLength={6} required/><label>Ulangi password baru</label><input className="text-input" name="confirm_password" type="password" autoComplete="new-password" minLength={6} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti password</button></form></div></section>}
        {page==='tv-settings'&&<TvDisplaySettings store={store} settings={settings} membership={membership} onNotice={setNotice}/>}
        {page==='settings'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">CONFIGURATION / STORE</span><h1>Pengaturan <span className="heading-accent">toko.</span></h1><p>Atur identitas toko, struk thermal, dan format antrian.</p></div><span className="role-chip"><ShieldCheck size={14}/>{membership.role}</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={saveStoreSettings}><div className="panel-head"><div><h3><Store size={17}/> Profil toko</h3><p>Informasi yang tampil di struk</p></div></div><label>Logo toko (opsional)</label><div className="store-logo-editor">{settings?.logo_url?<img className="store-logo-preview" src={settings.logo_url} alt="Logo toko saat ini"/>:<div className="store-logo-placeholder"><Store size={22}/><span>Belum ada logo</span></div>}<div className="store-logo-controls"><input className="text-input logo-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadStoreLogo} disabled={uploadingLogo||!isManager}/><small>PNG, JPG, atau WebP · maksimal 3 MB. Logo akan dicetak di bagian atas struk.</small>{settings?.logo_url&&<button type="button" className="btn btn-outline btn-small" onClick={removeStoreLogo} disabled={uploadingLogo||!isManager}><Trash2 size={14}/> Hapus logo</button>}{uploadingLogo&&<span className="logo-upload-status"><span className="spinner spinner-purple"/> Memproses logo…</span>}</div></div><label>Nama toko</label><input className="text-input" name="store_name" defaultValue={settings?.store_name||store.name} required/><label>Alamat toko</label><textarea className="text-input" name="address" defaultValue={settings?.address||''} rows="3" placeholder="Alamat untuk dicetak di struk"/><label>Nomor telepon</label><input className="text-input" name="phone" defaultValue={settings?.phone||''} placeholder="08xx xxxx xxxx"/><label>Footer struk</label><input className="text-input" name="receipt_footer" defaultValue={settings?.receipt_footer||'Terima kasih telah berbelanja'}/><label>Catatan struk (opsional)</label><textarea className="text-input" name="receipt_note" defaultValue={settings?.receipt_note||''} rows="2" maxLength="300" placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar."/><small className="field-help">Kosongkan jika tidak ingin menampilkan catatan pada struk.</small><div className="queue-setting-toggle"><div><strong>Sistem antrian</strong><small>{settings?.queue_enabled===false?'Nonaktif — transaksi tidak membuat nomor antrian.':'Aktif — transaksi dapat membuat nomor antrian.'}</small></div><label className="switch-control"><input type="checkbox" name="queue_enabled" defaultChecked={settings?.queue_enabled!==false} disabled={!isManager}/><span className="switch-track"/><span className="sr-only">Aktifkan sistem antrian</span></label></div><label>Prefix antrian</label><input className="text-input prefix-input" name="queue_prefix" defaultValue={settings?.queue_prefix||'A'} maxLength="3"/><button className="btn btn-primary" disabled={savingSettings||!isManager}>{savingSettings?<span className="spinner"/>:<Check size={16}/>} Simpan pengaturan</button>{!isManager&&<p className="permission-note">Hanya admin/manager yang dapat mengubah pengaturan.</p>}</form><div className="settings-aside">{isManager&&<form className="panel settings-form" onSubmit={saveBreakSettings}><div className="panel-head"><div><h3><Bell size={17}/> Peringatan istirahat</h3><p>Pengaturan hanya berlaku untuk toko yang sedang dipilih.</p></div></div><label>Batas istirahat (menit)</label><input className="text-input" type="number" min="1" max="240" value={breakSettings.max_break_minutes||15} onChange={e=>setBreakSettings(prev=>({...prev,max_break_minutes:e.target.value}))} required/><label>Judul peringatan yang dikirim ke kasir</label><input className="text-input" value={breakSettings.manual_alert_title||'Peringatan dari Admin'} onChange={e=>setBreakSettings(prev=>({...prev,manual_alert_title:e.target.value}))} maxLength={120} required placeholder="Peringatan dari Admin"/><label>Isi pesan peringatan</label><textarea className="text-input" value={breakSettings.manual_alert_message||''} onChange={e=>setBreakSettings(prev=>({...prev,manual_alert_message:e.target.value}))} rows={4} maxLength={2000} required placeholder="Tulis pesan untuk kasir…"/><small className="subtle">Judul dan isi ini tersimpan khusus untuk toko yang dipilih, lalu dipakai oleh tombol Kirim Peringatan.</small><div className="info-line"><CheckCircle2 size={15}/> Pengingat suara setiap 5 menit setelah batas terlewati</div><div className="info-line"><CheckCircle2 size={15}/> Eskalasi visual merah di Monitoring</div><button className="btn btn-primary"><Check size={16}/> Simpan peringatan</button></form>}<div className="panel settings-info"><span className="settings-info-icon"><Printer size={20}/></span><h3>Printer thermal</h3><p>Struk menggunakan layout 80mm. Hubungkan printer ke perangkat kasir, lalu gunakan dialog cetak browser. Printer Bluetooth tertentu memerlukan aplikasi/driver pendamping.</p><div className="info-line"><CheckCircle2 size={15}/> Layout struk 80mm</div><div className="info-line"><CheckCircle2 size={15}/> Bisa cetak dari Chrome</div></div><div className="panel settings-info"><span className="settings-info-icon blue-info"><Monitor size={20}/></span><h3>Layar antrian TV</h3><p>Buka layar TV dari menu antrian di browser TV. Status diperbarui otomatis saat koneksi internet aktif.</p><button className="btn btn-outline btn-wide" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={16}/> Buka layar TV</button></div><div className="panel account-info"><span className="account-avatar"><UserRound size={19}/></span><div><strong>{membership?.full_name?.trim()||session.user.user_metadata?.full_name?.trim()||session.user.user_metadata?.name?.trim()||session.user.email}</strong><small>Masuk sebagai {membership.role}</small></div><button className="text-button" onClick={()=>supabase.auth.signOut()}>Keluar</button></div></div></div></section>}
      </div>
    </main>
    {productModal&&<div className="modal-backdrop" onClick={()=>setProductModal(null)}><form className="modal-card" onClick={e=>e.stopPropagation()} onSubmit={saveProduct}><div className="modal-head"><div><span className="eyebrow muted">INVENTORY</span><h2>{productModal.id?'Edit produk':'Tambah produk'}</h2></div><button type="button" className="icon-button" onClick={()=>setProductModal(null)}><X size={18}/></button></div><label>Nama produk *</label><input className="text-input" name="name" defaultValue={productModal.name||''} required placeholder="Contoh: Kopi susu"/><div className="form-row"><div><label>SKU</label><input className="text-input" name="sku" defaultValue={productModal.sku||''} placeholder="KOP-001"/></div><div><label>Barcode</label><input className="text-input" name="barcode" defaultValue={productModal.barcode||''} placeholder="Scan / ketik"/></div></div><label>Kategori</label><input className="text-input" name="category" defaultValue={productModal.category||'Umum'} placeholder="Minuman"/><div className="form-row"><div><label>Harga jual (Rp) *</label><input className="text-input" type="number" min="0" step="1" name="price" defaultValue={productModal.price??0} required/></div><div><label>Modal (Rp)</label><input className="text-input" type="number" min="0" step="1" name="cost_price" defaultValue={productModal.cost_price??0}/></div></div><label>Stok tersedia *</label><input className="text-input" type="number" min="0" step="1" name="stock" defaultValue={productModal.stock??0} required/><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setProductModal(null)}>Batal</button><button className="btn btn-primary"><Check size={16}/> Simpan produk</button></div></form></div>}
    {receipt&&<div className="receipt-modal-layer"><div className="receipt-actions no-print"><span><CheckCircle2 size={16}/> Transaksi tersimpan</span><button className="btn btn-outline" onClick={()=>setReceipt(null)}>Tutup</button><button className="btn btn-primary" onClick={printReceipt}><Printer size={16}/> Cetak struk</button></div><Receipt receipt={receipt} settings={settings} cashierName={membership?.full_name?.trim()||session.user.user_metadata?.full_name?.trim()||session.user.user_metadata?.name?.trim()||session.user.email}/></div>}
  </div>
}

function StatCard({icon:Icon,label,value,meta,tone}){return <div className="stat-card"><span className={`stat-icon tone-${tone}`}><Icon size={20}/></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-meta">{meta}</span></div>}
function EmptyState({icon:Icon,title,text,action,actionLabel}){return <div className="empty-state"><span className="empty-icon"><Icon size={23}/></span><strong>{title}</strong><p>{text}</p>{action&&<button className="btn btn-outline btn-small" onClick={action}>{actionLabel||'Tambah baru'}</button>}</div>}
function Receipt({receipt,settings,cashierName}){
  const order=receipt.order||receipt
  const items=receipt.items||[]
  const ticket=receipt.ticket
  return <div className="receipt-print"><div className="receipt-center">{settings?.logo_url&&<img className="receipt-store-logo" src={settings.logo_url} alt="Logo toko"/>}<h2>{settings?.store_name||'NexaPos Store'}</h2>{settings?.address&&<p>{settings.address}</p>}{settings?.phone&&<p>{settings.phone}</p>}<div className="receipt-rule"/><p>Struk: {order.receipt_number||'ANTRIAN'}</p><p>{new Date(order.created_at||Date.now()).toLocaleString('id-ID')}</p><p>Kasir: {cashierName||'Kasir'}</p></div><div className="receipt-rule"/>{items.map(i=><div className="receipt-item" key={i.id}><span>{i.product_name}<br/>{i.quantity} × {money(i.unit_price)}</span><strong>{money(i.line_total)}</strong></div>)}<div className="receipt-rule"/><div className="receipt-total"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>{Number(order.discount)>0&&<div className="receipt-total"><span>Diskon</span><strong>− {money(order.discount)}</strong></div>}<div className="receipt-total receipt-grand"><span>TOTAL</span><strong>{money(order.total)}</strong></div><div className="receipt-total"><span>Pembayaran ({order.payment_method||'—'})</span><strong>{money(order.paid_amount)}</strong></div><div className="receipt-total"><span>Kembalian</span><strong>{money(order.change_amount)}</strong></div>{ticket&&<div className="receipt-queue"><small>NOMOR ANTRIAN</small><strong>{settings?.queue_prefix||'A'}{String(ticket.queue_number).padStart(3,'0')}</strong></div>}<div className="receipt-center receipt-thanks">{settings?.receipt_note?.trim()&&<p className="receipt-note">{settings.receipt_note.trim()}</p>}<p>{settings?.receipt_footer||'Terima kasih telah berbelanja'}</p><small>Powered by NexaPos</small></div></div>
}

function OperationalLockNotice({storeName,status,onClose}) {
  const expired=status==='expired'
  return <div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}} style={{position:'fixed',inset:0,zIndex:12000,background:'rgba(10,18,38,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}><section role="dialog" aria-modal="true" aria-labelledby="operational-lock-title" style={{position:'relative',width:'100%',maxWidth:460,background:'#fff',color:'#182238',borderRadius:20,padding:'30px 26px 24px',boxShadow:'0 24px 80px rgba(0,0,0,.3)'}}><button type="button" data-lock-dismiss aria-label="Tutup pemberitahuan" onClick={onClose} style={{position:'absolute',right:12,top:12,width:36,height:36,borderRadius:11,border:'1px solid #e2e8f0',background:'#fff',color:'#334155',display:'grid',placeItems:'center',cursor:'pointer'}}><X size={18}/></button><span style={{display:'inline-flex',padding:'7px 10px',borderRadius:999,background:'#fff1e8',color:'#a33b12',fontSize:11,fontWeight:800,letterSpacing:'.08em'}}>NEXAPOS · AKSES TERBATAS</span><h2 id="operational-lock-title" style={{fontSize:22,lineHeight:1.25,margin:'18px 42px 8px 0'}}>AKSES OPERASIONAL DIKUNCI</h2><h3 style={{fontSize:17,margin:'0 0 18px',color:'#334155'}}>{storeName}</h3><p style={{margin:'0 0 8px',color:'#475569'}}>Status layanan Anda saat ini:</p><strong style={{display:'block',color:'#b42318',fontSize:14,marginBottom:14}}>{expired?'MASA AKTIF TELAH BERAKHIR':'TOKO NONAKTIF'}</strong><p style={{color:'#475569',lineHeight:1.65,margin:'0 0 12px'}}>Akses operasional {storeName||'Perusahaan Anda'} ini sedang dihentikan sementara. Anda masih dapat melihat halaman dan informasi yang tersedia, tetapi seluruh tindakan operasional tidak dapat digunakan.</p><p style={{color:'#475569',lineHeight:1.65,margin:'0 0 12px'}}>Untuk mengaktifkan kembali layanan atau memperpanjang masa sewa, silakan hubungi Tim NexaPos dan sertakan nama perusahaan <strong>{storeName}</strong>.</p><p style={{color:'#64748b',fontSize:12,lineHeight:1.6,margin:0}}>Data perusahaan dan transaksi tetap tersimpan selama masa penonaktifan. Menutup pemberitahuan ini tidak mengaktifkan kembali layanan.</p></section></div>
}

function TenantLockedScreen({store,status,onSignOut}) {
  const expired = status === 'expired'
  const heading = expired ? 'Masa aktif toko berakhir' : status === 'pending' ? 'Menunggu aktivasi toko' : status === 'deleted' ? 'Tenant diarsipkan' : 'Toko dinonaktifkan'
  const description = expired
    ? 'Masa aktivasi tenant ini sudah habis. Akses operasional diblokir otomatis sampai Super Admin mengaktivasi kembali.'
    : status === 'pending'
      ? 'Toko sudah terdaftar, tetapi belum diaktivasi oleh Super Admin.'
      : status === 'deleted'
        ? 'Tenant ini telah diarsipkan. Hubungi Super Admin jika perlu peninjauan.'
        : 'Akses tenant ini dihentikan oleh Super Admin. Hubungi dukungan NexaPos untuk informasi lebih lanjut.'
  return <main className="tenant-locked-shell"><div className="tenant-locked-card"><Brand/><span className="tenant-lock-icon"><ShieldCheck size={26}/></span><span className="eyebrow muted">TENANT ACCESS CONTROL</span><h1>{heading}</h1><h3>{store?.name||'Toko NexaPos'}</h3><p>{description}</p>{store?.expires_at&&<div className="tenant-expiry"><CalendarDays size={16}/> Masa aktif berakhir: <strong>{new Date(store.expires_at).toLocaleString('id-ID')}</strong></div>}<button className="btn btn-primary btn-wide" onClick={onSignOut}><LogOut size={16}/> Keluar dari akun</button><small>Data transaksi tetap tersimpan dan tidak dihapus karena masa aktif berakhir.</small></div></main>
}

function SuperAdminScreen({session,syncStatus,setSyncStatus,onSignOut,platformAdmin=false}) {
  const [tenants,setTenants]=useState([])
  const [organizations,setOrganizations]=useState([])
  const [organizationsLoading,setOrganizationsLoading]=useState(false)
  const [organizationSearch,setOrganizationSearch]=useState('')
  const [organizationStatus,setOrganizationStatus]=useState('all')
  const [expandedCompanyId,setExpandedCompanyId]=useState('')
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [usersLoading,setUsersLoading]=useState(false)
  const [usersError,setUsersError]=useState('')
  const [notice,setNotice]=useState('')
  const [ownerActivationCard,setOwnerActivationCard]=useState(null)
  const [ownerActivationCopied,setOwnerActivationCopied]=useState(false)
  const [registering,setRegistering]=useState(false)
  const [duration,setDuration]=useState('monthly')
  const [customDays,setCustomDays]=useState('14')
  const [activationPackage,setActivationPackage]=useState('growth')
  const [activationDurations,setActivationDurations]=useState([{duration_key:'daily',name:'Harian',duration_days:3},{duration_key:'weekly',name:'Mingguan',duration_days:7},{duration_key:'monthly',name:'Bulanan',duration_days:30},{duration_key:'yearly',name:'Tahunan',duration_days:365},{duration_key:'custom',name:'Custom',duration_days:15}])
  const [activationPackages,setActivationPackages]=useState([{package_key:'starter',name:'Starter',location_limit:3},{package_key:'growth',name:'Growth',location_limit:5},{package_key:'business',name:'Business',location_limit:10},{package_key:'enterprise',name:'Enterprise',location_limit:15}])
  const [disabledMembers,setDisabledMembers]=useState([])
  const [disabledLoading,setDisabledLoading]=useState(false)
  const [deletingUserId,setDeletingUserId]=useState('')
  const [userActionId,setUserActionId]=useState('')
  const [deleteConfirmTarget,setDeleteConfirmTarget]=useState(null)
  const [deleteConfirmText,setDeleteConfirmText]=useState('')
  const [deleteConfirmBusy,setDeleteConfirmBusy]=useState(false)
  const [section,setSection]=useState('dashboard')
  const [selectedTenant,setSelectedTenant]=useState(null)
  const [sectionRestored,setSectionRestored]=useState(false)
  const [mobileNav,setMobileNav]=useState(false)

  // Keep platform navigation in browser history, including the selected tenant control center.
  useEffect(() => {
    const current = window.history.state || {}
    if (!current.nexaposSuperAdminNav) {
      window.history.replaceState({ ...current, nexaposSuperAdminNav: true, superSection: section, superSelectedTenant: selectedTenant }, '', window.location.href)
    }
    const onPopState = event => {
      const state = event.state
      if (state?.nexaposSuperAdminNav) {
        setSection(state.superSection || 'dashboard')
        setSelectedTenant(state.superSelectedTenant || null)
      } else {
        setSection('dashboard')
        setSelectedTenant(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const current = window.history.state || {}
    if (current.nexaposSuperAdminNav && current.superSection === section && (current.superSelectedTenant?.id || null) === (selectedTenant?.id || null)) return
    window.history.pushState({ ...current, nexaposSuperAdminNav: true, superSection: section, superSelectedTenant: selectedTenant }, '', window.location.href)
  }, [section, selectedTenant?.id])

  // Restore the last Admin Super section per authenticated account after a reload.
  // Only navigation state is persisted; sensitive credentials and activation codes are never stored here.
  useEffect(()=>{
    const userId=session?.user?.id
    if(!userId)return
    const allowedSections=new Set(['dashboard','stores','nexaspace','users','disabled','support','promotions','subscription-plans','audit'])
    try {
      const saved=localStorage.getItem('nexapos-super-admin-section-v1:'+userId)
      if(saved&&allowedSections.has(saved))setSection(saved)
    } catch {}
    setSectionRestored(true)
  },[session?.user?.id])

  useEffect(()=>{
    const userId=session?.user?.id
    if(!userId||!sectionRestored)return
    try { localStorage.setItem('nexapos-super-admin-section-v1:'+userId,section) } catch {}
  },[section,sectionRestored,session?.user?.id])
  const [tenantSearch,setTenantSearch]=useState('')
  const [tenantStatus,setTenantStatus]=useState('all')
  const [tenantPage,setTenantPage]=useState(1)
  const [userSearch,setUserSearch]=useState('')
  const [userStatus,setUserStatus]=useState('all')
  const [userPage,setUserPage]=useState(1)
  const [disabledPage,setDisabledPage]=useState(1)
  const pageSize=8
  const load=useCallback(async()=>{
    setLoading(true)
    const {data,error}=await supabase.from('stores').select('id,name,owner_name,owner_email,status,activated_at,expires_at,activation_days,activation_package_key,activation_location_limit,organization_id,is_primary_workspace,created_at,deleted_at').order('created_at',{ascending:false})
    if(error){setTenants([]);setNotice(userFacingError(error));setLoading(false);return}
    const storeIds=(data||[]).map(tenant=>tenant.id)
    const organizationIds=[...new Set((data||[]).map(tenant=>tenant.organization_id).filter(Boolean))]
    const [settingsResult,organizationResult]=await Promise.all([
      storeIds.length ? supabase.from('store_settings').select('store_id,store_name').in('store_id',storeIds) : Promise.resolve({data:[],error:null}),
      organizationIds.length ? supabase.from('owner_organizations').select('id,organization_name').in('id',organizationIds) : Promise.resolve({data:[],error:null})
    ])
    if(settingsResult.error)setNotice('Nama workspace sebagian belum dapat disinkronkan. Coba muat ulang atau hubungi admin.')
    if(organizationResult.error)setNotice('Nama perusahaan sebagian belum dapat disinkronkan. Coba muat ulang atau hubungi admin.')
    const settingsByStore=new Map((settingsResult.data||[]).map(row=>[row.store_id,row.store_name]))
    const organizationById=new Map((organizationResult.data||[]).map(row=>[row.id,row.organization_name]))
    setTenants((data||[]).map(tenant=>({...tenant,organization_name:organizationById.get(tenant.organization_id)||'',name:String(settingsByStore.get(tenant.id)||'').trim()||tenant.name})))
    setLoading(false)
  },[])
  const loadOrganizations=useCallback(async()=>{
    setOrganizationsLoading(true)
    const {data,error}=await supabase.from('owner_organizations').select('id,owner_user_id,owner_email,owner_name,organization_name,status,activated_at,expires_at,activation_days,activation_package_key,activation_location_limit,created_at').order('created_at',{ascending:false})
    if(error){setOrganizations([]);setNotice(userFacingError(error,'Daftar NexaSpace belum dapat dimuat.'));setOrganizationsLoading(false);return}
    const orgs=data||[];const storeIds=tenants.filter(t=>orgs.some(o=>o.id===t.organization_id)).map(t=>t.id)
    const {data:members}=storeIds.length?await supabase.from('store_members').select('store_id,user_id,is_active,role').in('store_id',storeIds).eq('is_active',true):{data:[]}
    setOrganizations(orgs.map(org=>{const orgTenants=tenants.filter(t=>t.organization_id===org.id&&t.status!=='deleted'&&!t.deleted_at);const ids=new Set(orgTenants.map(t=>t.id));const orgMembers=(members||[]).filter(m=>ids.has(m.store_id)&&m.user_id&&m.role!=='owner');const employeeIds=new Set(orgMembers.map(m=>m.user_id));const tenantRows=orgTenants.map(tenant=>({...tenant,employee_count:new Set(orgMembers.filter(m=>m.store_id===tenant.id).map(m=>m.user_id)).size}));return {...org,tenant_count:orgTenants.length,active_tenant_count:orgTenants.filter(t=>statusOf(t)==='active').length,employee_count:employeeIds.size,tenant_rows:tenantRows,primary_tenant:orgTenants.find(t=>t.is_primary_workspace)||orgTenants[0]||null}}))
    setOrganizationsLoading(false)
  },[tenants])
  const loadUsers=useCallback(async()=>{
    setUsersLoading(true)
    setUsersError('')
    try {
      const {data,error}=await supabase.rpc('super_admin_list_users_detailed')
      if(error) {
        setUsers([])
        setUsersError('Gagal memuat akun: '+error.message)
        setNotice('Gagal memuat daftar akun. Periksa akses Super Admin dan koneksi database.')
      } else {
        setUsers(data||[])
      }
    } catch (error) {
      setUsers([])
      setUsersError('Tidak dapat menghubungi database untuk memuat akun. Periksa koneksi lalu coba lagi.')
    } finally {
      setUsersLoading(false)
    }
  },[])
  useEffect(()=>{load();loadUsers()},[load,loadUsers])
  useEffect(()=>{loadOrganizations()},[loadOrganizations])
  useEffect(()=>{
    const channel=supabase.channel('super-admin-organization-profile-sync')
      .on('postgres_changes',{event:'*',schema:'public',table:'owner_organizations'},()=>{load();loadUsers()})
      .subscribe()
    return()=>{supabase.removeChannel(channel)}
  },[loadUsers])
  useEffect(()=>{
    let mounted=true
    const loadActivationOptions=async()=>{
      const [durationResult,packageResult]=await Promise.all([
        supabase.from('site_activation_durations').select('duration_key,name,duration_days,sort_order,is_active').eq('is_active',true).order('sort_order',{ascending:true}),
        supabase.from('site_activation_packages').select('package_key,name,location_limit,is_active,sort_order').eq('is_active',true).order('sort_order',{ascending:true}),
      ])
      if(!mounted)return
      if(!durationResult.error&&Array.isArray(durationResult.data)&&durationResult.data.length)setActivationDurations(durationResult.data.map(item=>({...item,duration_days:Number(item.duration_days)})))
      if(!packageResult.error&&Array.isArray(packageResult.data)&&packageResult.data.length)setActivationPackages(packageResult.data.map(item=>({...item,location_limit:Number(item.location_limit)})))
    }
    loadActivationOptions()
    return()=>{mounted=false}
  },[])
  const statusOf=(tenant)=>tenant.status||'pending'
  const loadDisabledMembers=useCallback(async()=>{setDisabledLoading(true);const {data,error}=await supabase.rpc('super_admin_list_disabled_members');if(error){setDisabledMembers([]);setNotice(userFacingError(error))}else setDisabledMembers(data||[]);setDisabledLoading(false)},[])
  useEffect(()=>{loadDisabledMembers()},[loadDisabledMembers])
  // Super Admin lists update from database events; no polling.
  useEffect(()=>{
    const channel=supabase.channel('nexapos-super-admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},()=>{load();loadUsers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members'},()=>{loadUsers();loadDisabledMembers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_invites'},()=>loadUsers())
      .on('postgres_changes',{event:'*',schema:'public',table:'owner_organizations'},()=>loadUsers())
      .subscribe()
    return ()=>{supabase.removeChannel(channel)}
  },[load,loadUsers,loadDisabledMembers])
  const activeCount=tenants.filter(t=>statusOf(t)==='active').length
  const expiredCount=organizations.filter(org=>org.status==='active'&&org.expires_at&&new Date(org.expires_at)<=new Date()).length
  const submitTenant=async(event)=>{
    event.preventDefault()
    const formElement=event.currentTarget
    const form=new FormData(formElement)
    const organizationName=String(form.get('organization_name')||'').trim()
    const storeName=String(form.get('store_name')||'').trim()
    const ownerName=String(form.get('owner_name')||'').trim()
    const ownerEmail=String(form.get('owner_email')||'').trim().toLowerCase()
    if(!organizationName||!storeName||!ownerName||!ownerEmail){setNotice('Nama perusahaan, nama workspace utama, nama Owner, dan email Owner wajib diisi.');return}
    const activationCode=crypto.randomUUID().replaceAll('-','')
    setRegistering(true)
    setNotice('')
    try{
      const {error}=await supabase.rpc('register_store_tenant',{p_store_name:storeName,p_owner_name:ownerName,p_owner_email:ownerEmail,p_activation_code:activationCode,p_organization_name:organizationName})
      if(error)throw error
      formElement.reset()
      setOwnerActivationCopied(false)
      setOwnerActivationCard({email:ownerEmail,code:activationCode,title:'Kode aktivasi Owner'})
      setNotice('Perusahaan dan workspace utama berhasil didaftarkan secara terpisah. Kode aktivasi ditampilkan di kartu; kirimkan secara pribadi kepada Owner.')
      await load()
    }catch(error){
      setNotice(userFacingError(error,'Pendaftaran Owner belum berhasil. Pastikan migrasi perusahaan Owner sudah diterapkan dan email belum digunakan untuk undangan Owner yang bertabrakan.'))
    }finally{
      setRegistering(false)
    }
  }
  const regenerateOwnerInvite=async(tenant)=>{
    const activationCode=crypto.randomUUID().replaceAll('-','')
    if(!confirm('Buat kode undangan baru untuk '+(tenant.owner_email||'Owner')+'? Kode undangan lama yang belum digunakan akan diganti.'))return
    setRegistering(true)
    const {error}=await supabase.rpc('super_admin_regenerate_owner_invite',{p_store_id:tenant.id,p_activation_code:activationCode})
    setRegistering(false)
    if(error){setNotice(userFacingError(error));return}
    setOwnerActivationCopied(false)
    setOwnerActivationCard({email:tenant.owner_email,code:activationCode,title:'Kode aktivasi Owner'})
    setNotice('Kode aktivasi baru siap disalin. Kode lama yang belum digunakan sudah diganti.')
    await load()
  }
  const changeOrganizationStatus=async(org,nextStatus)=>{if(!org?.id)return;if(!confirm((nextStatus==='suspended'?'Nonaktifkan':'Aktifkan')+' NexaSpace '+org.organization_name+'?'))return;const {error}=await supabase.from('owner_organizations').update({status:nextStatus,updated_at:new Date().toISOString()}).eq('id',org.id);if(error){setNotice(userFacingError(error,'Status NexaSpace gagal diperbarui.'));return}setNotice('Status NexaSpace '+org.organization_name+' berhasil diperbarui.');await Promise.all([load(),loadOrganizations()])}
  const activateOrganization=async(org)=>{if(!org?.primary_tenant){setNotice('Workspace utama perusahaan tidak ditemukan.');return}await activate(org.primary_tenant);await loadOrganizations()}
  const deleteOrganization=async(org)=>{if(!org?.id)return;const confirmation=prompt('HAPUS PERMANEN NEXASPACE\\nSeluruh tenant/workspace, akun Owner, data operasional, dan keanggotaan perusahaan ini akan dihapus.\\n\\nKetik HAPUS '+org.organization_name+' untuk melanjutkan.');if(confirmation!=='HAPUS '+org.organization_name)return;if(!org.owner_user_id){setNotice('Akun Owner belum terhubung. Penghapusan perusahaan ini memerlukan penanganan akun undangan terlebih dahulu.');return}const {error}=await supabase.rpc('super_admin_delete_user',{p_user_id:org.owner_user_id});if(error){setNotice(userFacingError(error,'Penghapusan NexaSpace gagal.'));return}setNotice('NexaSpace, tenant, dan akun Owner berhasil dihapus permanen.');await Promise.all([load(),loadOrganizations(),loadUsers(),loadDisabledMembers()])}
  const activate=async(tenant)=>{
    const selectedDuration=activationDurations.find(item=>item.duration_key===duration)
    const days=duration==='custom-manual'?Number(customDays):Number(selectedDuration?.duration_days)
    if(!Number.isInteger(days)||days<1||days>36500){setNotice('Durasi aktivasi harus 1–36.500 hari.');return}
    const selectedPackage=activationPackages.find(item=>item.package_key===activationPackage)
    if(!selectedPackage){setNotice('Pilih paket aktivasi yang aktif.');return}
    const {error}=await supabase.rpc('activate_store_tenant',{p_store_id:tenant.id,p_duration_days:days,p_package_key:activationPackage})
    if(error){setNotice(userFacingError(error));return}
    setNotice(tenant.name+' aktif selama '+days+' hari dengan paket '+selectedPackage.name+' (maksimal '+selectedPackage.location_limit+' lokasi).')
    await load()
  }
  const deleteDisabledAccount=async(member)=>{
    if(member.has_other_active_membership){setNotice('Akun ini masih aktif di tenant lain. Nonaktifkan seluruh keanggotaannya terlebih dahulu.');return}
    setDeleteConfirmText('')
    setDeleteConfirmTarget({kind:'disabled',user:member})
  }
  const changeStatus=async(tenant,nextStatus)=>{
    if(nextStatus==='deleted'){
      const confirmation=prompt('PENGHAPUSAN PERMANEN\\nSemua produk, stok, transaksi, item transaksi, antrian, pengaturan, undangan, dan keanggotaan tenant akan dihapus dari database.\\n\\nKetik HAPUS '+tenant.name+' untuk melanjutkan.')
      if(confirmation!=='HAPUS '+tenant.name)return
      const {error}=await supabase.rpc('super_admin_delete_store_tenant',{p_store_id:tenant.id})
      if(error){setNotice(userFacingError(error));return}
      setNotice('Tenant dan seluruh data terkait telah dihapus permanen.')
      await Promise.all([load(),loadUsers(),loadDisabledMembers()])
      return
    }
    const action=nextStatus==='suspended'?'Nonaktifkan sementara '+tenant.name+'?':nextStatus==='active'?'Aktifkan kembali '+tenant.name+'?':'Kembalikan '+tenant.name+' ke status menunggu?'
    if(!confirm(action))return
    const {error}=await supabase.rpc('set_store_tenant_status',{p_store_id:tenant.id,p_status:nextStatus})
    if(error){setNotice(userFacingError(error));return}
    setNotice(nextStatus==='active'?'Tenant '+tenant.name+' berhasil diaktifkan.':'Status tenant diperbarui.')
    await load()
  }
  const resetUserPin=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('PIN akun Super Admin tidak dapat direset dari daftar ini.');return}
    if(!confirm('Reset PIN '+(user.email||user.full_name)+'? Pengguna wajib membuat PIN baru saat masuk berikutnya.'))return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_reset_user_pin',{p_user_id:user.user_id})
    setUserActionId('')
    if(error){setNotice(userFacingError(error));return}
    setNotice('PIN direset. Pengguna harus membuat PIN baru.')
    await loadUsers()
  }
  const resetUserPassword=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin dilindungi dari reset password lewat menu ini.');return}
    const nextPassword=prompt('Masukkan password sementara baru (minimal 6 karakter) untuk '+user.email)
    if(!nextPassword)return
    if(nextPassword.length<6){setNotice('Password minimal 6 karakter.');return}
    if(!confirm('Ganti password akun '+user.email+'? Sampaikan password sementara secara aman kepada pemilik akun.'))return
    setUserActionId(user.user_id)
    try{
      const response=await fetch('/.netlify/functions/manage-user-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({userId:user.user_id,password:nextPassword})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'Reset password gagal.')
      setNotice('Password akun berhasil diganti.')
    }catch(error){setNotice(userFacingError(error, 'Reset password gagal. Coba lagi.'))}
    finally{setUserActionId('')}
  }
  const deleteUser=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin tidak dapat dihapus dari menu ini.');return}
    setDeleteConfirmText('')
    setDeleteConfirmTarget({kind:'user',user})
  }
  const confirmDeleteAccount=async()=>{
    if(!deleteConfirmTarget||deleteConfirmText.trim()!=='HAPUS')return
    const {kind,user}=deleteConfirmTarget
    const label=user.email||user.full_name||'akun ini'
    setDeleteConfirmBusy(true)
    if(kind==='disabled')setDeletingUserId(user.user_id)
    else setUserActionId(user.user_id)
    try{
      const {error}=await supabase.rpc(kind==='disabled'?'super_admin_delete_disabled_account':'super_admin_delete_user',{p_user_id:user.user_id})
      if(error)throw error
      setDeleteConfirmTarget(null)
      setDeleteConfirmText('')
      setNotice('Akun '+label+' berhasil dihapus permanen.')
      await Promise.all([loadUsers(),loadDisabledMembers(),load()])
    }catch(error){
      setNotice(userFacingError(error,'Akun belum berhasil dihapus. Periksa keterkaitan data historis lalu coba lagi.'))
    }finally{
      setDeleteConfirmBusy(false)
      setDeletingUserId('')
      setUserActionId('')
    }
  }
  const moveUserToTenant=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin dilindungi dan tidak dapat dipindahkan.');return}
    const {data:members,error:membersError}=await supabase.from('store_members').select('store_id,role,is_active,disabled_at').eq('user_id',user.user_id)
    if(membersError){setNotice(userFacingError(membersError));return}
    const movable=(members||[]).filter(m=>m.role!=='owner')
    if(!movable.length){setNotice('Akun ini tidak memiliki keanggotaan karyawan yang dapat dipindahkan. Role Owner tidak dapat dipindahkan melalui fitur ini.');return}
    const sourceOptions=movable.map((m,i)=>{const t=tenants.find(x=>x.id===m.store_id);return (i+1)+'. '+(t?.name||m.store_id)+' — '+m.role+(m.is_active&&!m.disabled_at?' (aktif)':' (nonaktif)')}).join('\n')
    const sourceChoice=prompt('Pilih tenant asal untuk '+(user.email||user.full_name)+':\n'+sourceOptions+'\n\nMasukkan nomor tenant asal.')
    if(sourceChoice===null)return
    const sourceIndex=Number(sourceChoice)-1
    if(!Number.isInteger(sourceIndex)||sourceIndex<0||sourceIndex>=movable.length){setNotice('Pilihan tenant asal tidak valid.');return}
    const source=movable[sourceIndex]
    const availableTargets=tenants.filter(t=>t.id!==source.store_id&&t.status!=='deleted'&&!t.deleted_at)
    if(!availableTargets.length){setNotice('Belum ada tenant tujuan yang tersedia.');return}
    const targetOptions=availableTargets.map((t,i)=>(i+1)+'. '+t.name+' — '+t.status).join('\n')
    const targetChoice=prompt('Pilih tenant tujuan untuk '+(user.email||user.full_name)+':\n'+targetOptions+'\n\nMasukkan nomor tenant tujuan.')
    if(targetChoice===null)return
    const targetIndex=Number(targetChoice)-1
    if(!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>=availableTargets.length){setNotice('Pilihan tenant tujuan tidak valid.');return}
    const target=availableTargets[targetIndex]
    const targetRole=prompt('Pilih role di '+target.name+': admin atau cashier.\nOwner tidak dapat dipilih.','cashier')
    if(targetRole===null)return
    const normalizedRole=targetRole.trim().toLowerCase()
    if(!['admin','cashier'].includes(normalizedRole)){setNotice('Role tidak valid. Pilih Admin Tenant atau Cashier.');return}
    const sourceName=tenants.find(t=>t.id===source.store_id)?.name||'tenant asal'
    if(!confirm('Pindahkan '+(user.email||user.full_name)+' dari '+sourceName+' ke '+target.name+' sebagai '+normalizedRole+'?\n\nAkses ke tenant asal akan dicabut. Produk, transaksi, antrean, dan data tenant asal tetap berada di tenant asal.'))return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_move_user_membership',{p_user_id:user.user_id,p_source_store_id:source.store_id,p_target_store_id:target.id,p_target_role:normalizedRole})
    setUserActionId('')
    if(error){setNotice(userFacingError(error));return}
    setNotice('Akun dipindahkan ke '+target.name+' sebagai '+normalizedRole+'. Data tenant asal tetap tidak berubah.')
    await Promise.all([loadUsers(),loadDisabledMembers()])
  }
  const toggleUserBan=async(user)=>{
    const nextBanned=!user.is_banned
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin tidak dapat dinonaktifkan melalui menu ini.');return}
    const label=user.email||user.full_name||'akun ini'
    if(!confirm((nextBanned?'Nonaktifkan akses login ':'Aktifkan kembali akses login ')+label+'?'))return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_set_user_banned',{p_user_id:user.user_id,p_banned:nextBanned})
    setUserActionId('')
    if(error){setNotice(userFacingError(error));return}
    setNotice(nextBanned?'Akses login akun dinonaktifkan.':'Akses login akun diaktifkan kembali.')
    await loadUsers()
  }
  const filteredTenants=tenants.filter(t=>{
    const q=tenantSearch.trim().toLowerCase()
    const matches=!q||[t.name,t.organization_name,t.owner_name,t.owner_email,t.id].some(v=>String(v||'').toLowerCase().includes(q))
    const status=statusOf(t)
    return matches&&(tenantStatus==='all'||status===tenantStatus)
  })
  const filteredUsers=users.filter(u=>{
    const q=userSearch.trim().toLowerCase()
    const matches=!q||[u.email,u.full_name,u.user_id,u.store_names,u.tenant_roles,u.organization_names].some(v=>String(v||'').toLowerCase().includes(q))
    return matches&&(userStatus==='all'||(userStatus==='blocked'?u.is_banned:!u.is_banned))
  })
  const navItems=[['dashboard','Ringkasan',LayoutDashboard],['stores','Manajemen Tenant',Store],['nexaspace','Manajemen NexaSpace',Boxes],['users','Manajemen user',Users],['disabled','Akun staf nonaktif',Ban],['audit','Audit aktivitas',Activity],['support','Pusat bantuan',Headphones],['platform-staff','Tim & Hak Akses',UserPlus],['promotions','Promo & Diskon',Ticket],['subscription-plans','Paket Aktivasi & Harga',CreditCard]]
  const selectSection=(id)=>{setSection(id);setMobileNav(false)}
  const pageTitle={dashboard:'Ringkasan platform',stores:'Manajemen Tenant',nexaspace:'Manajemen NexaSpace','store-control':'Pusat Kendali Toko',users:'Manajemen user',disabled:'Akun staf nonaktif',audit:'Audit aktivitas',support:'Pusat bantuan','platform-staff':'Tim & Hak Akses',promotions:'Promo & Diskon', 'subscription-plans':'Paket Aktivasi & Harga'}[section]
  if(section==='platform-staff') return <div className="app-shell super-admin-shell"><aside className={"sidebar "+(mobileNav?'sidebar-open':'')}><div className="sidebar-brand"><Brand/></div><div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</strong><small>Kontrol seluruh tenant</small></span></div><nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div>{navItems.map(([id,label,Icon])=><button key={id} className={"nav-link "+(section===id?'nav-active':'')} onClick={()=>selectSection(id)}><Icon size={18}/><span>{label}</span></button>)}</div></nav><div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email}</strong><small>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div></aside><main className="main-area"><header className="topbar"><div className="topbar-title-group"><div className="breadcrumb">Platform <span>/</span> <strong>Tim & Hak Akses</strong></div><div className="topbar-date">Kelola akun Admin NEXAPOS</div></div><div className="topbar-actions"><WibClock/><span className="role-chip"><ShieldCheck size={14}/> {platformAdmin ? 'ADMIN NEXAPOS' : 'SUPER ADMIN'}</span></div></header><PlatformStaffManager onBack={()=>selectSection('dashboard')}/></main></div>;
  if(section==='promotions') return <PromotionManager onBack={()=>setSection('dashboard')} onSignOut={onSignOut}/>
  if(section==='subscription-plans') return <SubscriptionPlanManager onBack={()=>setSection('dashboard')}/>
  return <div className="app-shell super-admin-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      <div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</strong><small>Kontrol seluruh tenant</small></span></div>
      <nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div>{navItems.map(([id,label,Icon])=><button key={id} className={`nav-link ${section===id?'nav-active':''}`} onClick={()=>selectSection(id)}><Icon size={18}/><span>{label}</span>{id==='stores'&&<em>{tenants.length}</em>}</button>)}</div></nav>
      <div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email}</strong><small>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Tutup menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Buka sidebar"><Menu size={20}/></button><div className="topbar-title-group"><div className="breadcrumb">Platform <span>/</span> <strong>{pageTitle}</strong></div><div className="topbar-date"><span className="desktop-date">Manajemen user, toko, dan akses platform</span><span className="mobile-date">{new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"})}</span></div></div></div><div className="topbar-actions"><WibClock/><span className="role-chip"><ShieldCheck size={14}/> {platformAdmin ? 'ADMIN NEXAPOS' : 'SUPER ADMIN'}</span><span className="live-status" title={syncStatus==='connected'?'Koneksi dan Supabase Realtime terhubung':syncStatus==='unstable'?'Koneksi tidak stabil; sinkronisasi mungkin terlambat':syncStatus==='offline'?'Tidak ada koneksi jaringan':'Memeriksa koneksi'} style={{color:syncStatus==='connected'?'#16a34a':syncStatus==='unstable'?'#ca8a04':syncStatus==='offline'?'#dc2626':'#64748b'}}><i style={{backgroundColor:syncStatus==='connected'?'#16a34a':syncStatus==='unstable'?'#eab308':syncStatus==='offline'?'#dc2626':'#94a3b8'}}/>{syncStatus==='connected'?'LIVE SYNC':syncStatus==='unstable'?'SYNC LAMBAT':syncStatus==='offline'?'OFFLINE':'MEMERIKSA'}</span><button className="icon-button refresh-btn" onClick={()=>{load();loadUsers();loadDisabledMembers()}} title="Refresh halaman ini" aria-label="Refresh halaman ini"><RefreshCw size={17}/></button></div></header>
      {notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {deleteConfirmTarget&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!deleteConfirmBusy){setDeleteConfirmTarget(null);setDeleteConfirmText('')}}} style={{position:'fixed',inset:0,zIndex:10010,background:'rgba(12,16,32,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
        <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" style={{position:'relative',width:'100%',maxWidth:430,background:'var(--panel,#fff)',color:'var(--ink,#1b2035)',borderRadius:18,padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.28)',border:'1px solid var(--border,#e6e8f0)'}}>
          <button type="button" aria-label="Tutup konfirmasi hapus akun" disabled={deleteConfirmBusy} onClick={()=>{setDeleteConfirmTarget(null);setDeleteConfirmText('')}} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:10,border:'1px solid var(--border,#e6e8f0)',background:'transparent',color:'inherit',display:'grid',placeItems:'center',cursor:'pointer'}}><X size={17}/></button>
          <div style={{width:46,height:46,borderRadius:14,display:'grid',placeItems:'center',background:'rgba(220,38,38,.10)',color:'#dc2626',marginBottom:14}}><Trash2 size={22}/></div>
          <span className="eyebrow muted">TINDAKAN PERMANEN</span>
          <h2 id="delete-account-title" style={{fontSize:20,margin:'6px 42px 8px 0'}}>Hapus akun user?</h2>
          <p style={{fontSize:13,color:'var(--muted,#73798f)',lineHeight:1.6,margin:'0 0 14px'}}>Akun login dan akses keanggotaan akan dihapus. Riwayat transaksi dan sesi kasir tetap dipertahankan sebagai data historis.</p>
          <div style={{border:'1px solid var(--border,#e6e8f0)',background:'var(--surface,#f7f8fc)',borderRadius:12,padding:13,marginBottom:16}}>
            <small style={{display:'block',color:'var(--muted,#73798f)',marginBottom:4}}>Akun yang akan dihapus</small>
            <strong style={{display:'block',overflowWrap:'anywhere'}}>{deleteConfirmTarget.user.full_name||'Tanpa nama'}</strong>
            <span style={{fontSize:13,color:'var(--muted,#73798f)',overflowWrap:'anywhere'}}>{deleteConfirmTarget.user.email||'Email tidak tersedia'}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:8}}>
            <label htmlFor="delete-account-confirm" style={{fontSize:13,fontWeight:700}}>Salin kode konfirmasi lalu ketik di bawah</label>
            <button type="button" className="btn btn-small btn-outline" onClick={async()=>{try{await navigator.clipboard.writeText('HAPUS');setNotice('Kode konfirmasi HAPUS berhasil disalin.')}catch{setNotice('Browser tidak mengizinkan salin otomatis. Pilih teks HAPUS untuk menyalinnya.')}}}><Copy size={14}/> Salin HAPUS</button>
          </div>
          <div style={{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:20,fontWeight:800,letterSpacing:'.16em',textAlign:'center',padding:12,border:'1px dashed #dc2626',borderRadius:10,color:'#dc2626',marginBottom:12,userSelect:'all'}}>HAPUS</div>
          <input id="delete-account-confirm" className="text-input" autoComplete="off" value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder="Ketik HAPUS untuk mengonfirmasi" disabled={deleteConfirmBusy} />
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button type="button" className="btn btn-outline" style={{flex:1,justifyContent:'center'}} disabled={deleteConfirmBusy} onClick={()=>{setDeleteConfirmTarget(null);setDeleteConfirmText('')}}>Batal</button>
            <button type="button" className="btn btn-primary" style={{flex:1,justifyContent:'center',background:'#dc2626',borderColor:'#dc2626'}} disabled={deleteConfirmBusy||deleteConfirmText.trim()!=='HAPUS'} onClick={confirmDeleteAccount}>{deleteConfirmBusy?<span className="spinner"/>:<Trash2 size={15}/>} Hapus permanen</button>
          </div>
        </section>
      </div>}
      {ownerActivationCard&&<div role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setOwnerActivationCard(null);setOwnerActivationCopied(false)}}} style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(12,16,32,.48)',display:'flex',alignItems:'center',justifyContent:'center',padding:18}}>
        <section role="dialog" aria-modal="true" aria-labelledby="owner-activation-code-title" style={{position:'relative',width:'100%',maxWidth:390,background:'var(--panel,#fff)',color:'var(--ink,#1b2035)',borderRadius:18,padding:24,boxShadow:'0 24px 80px rgba(0,0,0,.24)',border:'1px solid var(--border,#e6e8f0)'}}>
          <button type="button" aria-label="Tutup kartu kode aktivasi" title="Tutup" onClick={()=>{setOwnerActivationCard(null);setOwnerActivationCopied(false)}} style={{position:'absolute',top:12,right:12,width:34,height:34,borderRadius:10,border:'1px solid var(--border,#e6e8f0)',background:'transparent',color:'inherit',display:'grid',placeItems:'center',cursor:'pointer'}}><X size={17}/></button>
          <div style={{width:44,height:44,borderRadius:13,display:'grid',placeItems:'center',background:'rgba(98,92,241,.12)',color:'var(--primary,#625cf1)',marginBottom:14}}><KeyRound size={21}/></div>
          <h2 id="owner-activation-code-title" style={{fontSize:19,margin:'0 42px 6px 0'}}>{ownerActivationCard.title}</h2>
          <p style={{fontSize:13,color:'var(--muted,#73798f)',lineHeight:1.6,margin:'0 0 16px'}}>Kirim kode ini secara pribadi kepada <strong>{ownerActivationCard.email}</strong>. Kode hanya ditampilkan sekali.</p>
          <div style={{border:'1px dashed var(--border,#cfd3e2)',background:'var(--surface,#f7f8fc)',borderRadius:12,padding:'14px 12px',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:14,letterSpacing:'.035em',overflowWrap:'anywhere',textAlign:'center',userSelect:'all'}}>{ownerActivationCard.code}</div>
          <button type="button" className="btn btn-primary btn-wide" style={{marginTop:16,justifyContent:'center'}} onClick={async()=>{try{await navigator.clipboard.writeText(ownerActivationCard.code);setOwnerActivationCopied(true)}catch{setNotice('Browser tidak mengizinkan salin otomatis. Tekan lama kode untuk menyalinnya.')}}}><Copy size={16}/>{ownerActivationCopied?'Kode tersalin':'Salin kode aktivasi'}</button>
          <p style={{fontSize:11,color:'var(--muted,#73798f)',margin:'12px 0 0',lineHeight:1.5}}>Jangan bagikan kode ini di grup publik. Menutup kartu tidak akan menampilkan kode kembali.</p>
        </section>
      </div>}
      <div className="page-content">
        {section==='store-control'&&<StoreControlCenter tenant={selectedTenant} onBack={()=>setSection('stores')} onStatusChange={changeStatus} onOpenSupport={()=>setSection('support')}/>}
         {section==='audit'&&<AuditLogPanel scope="platform"/>}
        {section==='support'&&<section className="page-section support-admin-page"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / SUPPORT</span><h1>Pusat <span className="heading-accent">bantuan.</span></h1><p>Atur WhatsApp dan Telegram, serta tangani percakapan live chat tenant.</p></div><span className="date-pill"><Headphones size={14}/> Sinkron realtime</span></div><SupportCenter session={session} isSuperAdmin embedded onClose={()=>setSection('dashboard')}/></section>}
        {section==='dashboard'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM CONTROL / OVERVIEW</span><h1>Kontrol <span className="heading-accent">platform.</span></h1><p>Kelola perusahaan NexaSpace, workspace tenant, aktivasi pendaftaran, dan akses platform.</p></div><span className="date-pill"><ShieldCheck size={14}/> Akses istimewa</span></div><div className="stats-grid"><StatCard icon={Store} label="Total tenant" value={tenants.filter(t=>statusOf(t)!=='deleted').length} meta={'Dikelola permanen'} tone="violet"/><StatCard icon={CheckCircle2} label="Aktif" value={activeCount} meta="Masa aktivasi berlaku" tone="green"/><StatCard icon={CalendarDays} label="Kedaluwarsa" value={expiredCount} meta="Menunggu reaktivasi" tone="orange"/><StatCard icon={Users} label="Akun user" value={users.length} meta={users.filter(u=>u.is_banned).length+' akun dinonaktifkan'} tone="blue"/></div><div className="admin-shortcuts"><button className="admin-shortcut" onClick={()=>selectSection('stores')}><span><Store size={20}/></span><strong>Manajemen Tenant</strong><small>Kelola status operasional, pusat kendali, dan penghapusan workspace tenant</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('nexaspace')}><span><Boxes size={20}/></span><strong>Manajemen NexaSpace</strong><small>Kelola perusahaan, Owner, masa sewa, dan tenant yang dimiliki</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('users')}><span><Users size={20}/></span><strong>Manajemen user</strong><small>Daftar akun dan kontrol akses login</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('disabled')}><span><Ban size={20}/></span><strong>Akun staf nonaktif</strong><small>Tinjau dan bersihkan akun yang memenuhi syarat</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('support')}><span><Headphones size={20}/></span><strong>Pusat bantuan</strong><small>Atur WhatsApp, Telegram, dan live chat</small><ArrowRight size={16}/></button></div></section>}
        {section==='stores'&&<section className="page-section">
          <div className="page-heading"><div><span className="eyebrow muted">WORKSPACE / TENANTS</span><h1>Manajemen <span className="heading-accent">Tenant.</span></h1><p>Semua aksi di halaman ini hanya mengelola workspace tenant yang dipilih. Masa sewa perusahaan, paket, dan kode aktivasi pendaftaran dikelola melalui Manajemen NexaPos.</p></div><span className="date-pill"><Store size={14}/> {tenants.filter(t=>statusOf(t)!=='deleted').length} workspace</span></div>
          <div className="panel tenant-list-panel">
            <div className="panel-head"><div><h3><Store size={17}/> Daftar Tenant / Workspace</h3><p>Aktifkan, nonaktifkan, buka kendali, atau hapus hanya tenant yang dipilih.</p></div><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Refresh daftar tenant</button></div>
            <div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={tenantSearch} onChange={e=>{setTenantSearch(e.target.value);setTenantPage(1)}} placeholder="Cari nama tenant, perusahaan, Owner, atau ID…"/></div><select className="text-input" value={tenantStatus} onChange={e=>{setTenantStatus(e.target.value);setTenantPage(1)}}><option value="all">Semua status</option><option value="active">Aktif</option><option value="pending">Menunggu</option><option value="suspended">Nonaktif</option><option value="deleted">Tenant terhapus</option></select></div>
            {loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:filteredTenants.length===0?<EmptyState icon={Store} title="Tenant tidak ditemukan" text="Ubah kata kunci atau filter status."/>:<><div className="table-wrap"><table><thead><tr><th>Tenant / workspace</th><th>Perusahaan pemilik</th><th>Dibuat</th><th>Status workspace</th><th>Aksi tenant</th></tr></thead><tbody>{filteredTenants.slice((tenantPage-1)*pageSize,tenantPage*pageSize).map(t=>{const status=statusOf(t);return <tr key={t.id}><td><strong>{t.name||'Tenant tanpa nama'}</strong><br/><small>{t.is_primary_workspace?'Workspace utama':'Tenant tambahan'}</small><br/><small>{t.owner_name||'Nama Owner belum tersedia'} · {t.owner_email||'Email belum tersedia'}</small></td><td>{t.organization_name||'Belum terhubung ke perusahaan'}</td><td>{t.created_at?new Date(t.created_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'}):'—'}</td><td><span className={'status-pill '+(status==='active'?'status-paid':status==='pending'?'status-waiting':'status-inactive')}>{({active:'Aktif',pending:'Menunggu',expired:'Masa sewa perusahaan berakhir',suspended:'Nonaktif',deleted:'Terhapus'})[status]||status}</span></td><td><div className="tenant-actions"><button className="btn btn-small btn-outline" title={'Buka pusat kendali tenant '+t.name} onClick={()=>{setSelectedTenant(t);setSection('store-control')}}><Activity size={13}/> Kendali tenant</button>{status==='active'?<button className="btn btn-small btn-outline" title={'Nonaktifkan workspace '+t.name} onClick={()=>changeStatus(t,'suspended')}><Ban size={13}/> Nonaktifkan workspace</button>:status!=='deleted'&&<button className="btn btn-small btn-outline" title={'Aktifkan workspace '+t.name} onClick={()=>changeStatus(t,'active')}><Power size={13}/> Aktifkan workspace</button>}<button className="btn btn-small btn-outline danger-icon" title={'Hapus hanya tenant '+t.name} onClick={()=>changeStatus(t,'deleted')}><Trash2 size={14}/> Hapus tenant</button></div></td></tr>})}</tbody></table></div><Pagination page={tenantPage} total={filteredTenants.length} pageSize={pageSize} onChange={setTenantPage}/></>}
          </div>
        </section>}
        {section==='nexaspace'&&<section className="page-section">
  <div className="page-heading"><div><span className="eyebrow muted">OWNER / COMPANY CONTROL</span><h1>Manajemen <span className="heading-accent">NexaSpace.</span></h1><p>Daftarkan dan kelola perusahaan beserta akun Owner. NexaSpace adalah pusat pengelola; tenant adalah workspace operasional.</p></div><span className="date-pill"><Building2 size={14}/> {organizations.length} perusahaan</span></div>
  <div className="panel super-register-panel"><div className="panel-head"><div><h3><UserPlus size={17}/> Daftarkan perusahaan</h3><p>Pendaftaran membuat NexaSpace Owner dan satu tenant utama yang terhubung.</p></div></div>
  <form className="tenant-register-form" onSubmit={submitTenant}>
    <div><label>Nama perusahaan</label><input className="text-input" name="organization_name" placeholder="Contoh: PT Nexa Niaga Nusantara" maxLength={120} required/></div>
    <div><label>Nama tenant utama (workspace)</label><input className="text-input" name="store_name" placeholder="Contoh: Nexa Niaga Pusat" maxLength={120} required/></div>
    <div><label>Nama Owner perusahaan</label><input className="text-input" name="owner_name" placeholder="Nama lengkap Owner" maxLength={120} required/></div>
    <div><label>Email untuk akses NexaSpace</label><input className="text-input" type="email" name="owner_email" placeholder="owner@perusahaan.com" required/></div>
    <button className="btn btn-primary" disabled={registering}>{registering?<span className="spinner"/>:<Plus size={16}/>} Daftarkan Perusahaan</button>
  </form></div>
  <div className="panel activation-toolbar"><div className="panel-head"><div><h3><KeyRound size={17}/> Aktivasi pendaftaran perusahaan</h3><p>Pengelolaan masa sewa perusahaan dilakukan di sini. Konfigurasi paket, harga, dan durasi pendaftaran tetap tersedia di Manajemen NexaPos → Paket Aktivasi & Harga.</p></div></div><div className="activation-toolbar"><label>Paket perusahaan <select className="text-input" value={activationPackage} onChange={e=>setActivationPackage(e.target.value)}>{activationPackages.map(item=><option key={item.package_key} value={item.package_key}>{item.name} · kuota {item.location_limit} tenant</option>)}</select></label><label>Masa sewa perusahaan <select className="text-input" value={duration} onChange={e=>setDuration(e.target.value)}>{activationDurations.map(item=><option key={item.duration_key} value={item.duration_key}>{item.name} · {item.duration_days} hari</option>)}<option value="custom-manual">Custom manual</option></select></label>{duration==='custom-manual'&&<label>Jumlah hari <input className="text-input" type="number" min="1" max="36500" value={customDays} onChange={e=>setCustomDays(e.target.value)}/></label>}</div></div>
  <div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Building2 size={17}/> Daftar Perusahaan NexaSpace</h3><p>Setiap baris mewakili satu perusahaan dan akun Owner. Setiap aksi perusahaan berlaku pada perusahaan terpilih sesuai ruang lingkupnya.</p></div><button className="btn btn-outline btn-small" onClick={()=>{loadOrganizations();load()}} title="Refresh"><RefreshCw size={14}/></button></div>
    <div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={organizationSearch} onChange={e=>setOrganizationSearch(e.target.value)} placeholder="Cari nama perusahaan, Owner, atau email…"/></div><select className="text-input" value={organizationStatus} onChange={e=>setOrganizationStatus(e.target.value)}><option value="all">Semua status</option><option value="active">Aktif</option><option value="suspended">Nonaktif</option><option value="pending">Menunggu aktivasi</option><option value="expired">Kedaluwarsa</option></select></div>
    {organizationsLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:(()=>{const rows=organizations.filter(o=>{const q=organizationSearch.trim().toLowerCase();const match=!q||[o.organization_name,o.owner_name,o.owner_email].some(v=>String(v||'').toLowerCase().includes(q));const st=o.status==='active'&&o.expires_at&&new Date(o.expires_at)<=new Date()?'expired':o.status;return match&&(organizationStatus==='all'||st===organizationStatus)});return rows.length===0?<EmptyState icon={Building2} title="Perusahaan tidak ditemukan" text="Ubah kata kunci atau filter status."/>:<div className="table-wrap"><table><thead><tr><th>Perusahaan NexaSpace</th><th>Owner</th><th>Tenant</th><th>Karyawan</th><th>Aktivasi</th><th>Kedaluwarsa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.flatMap(org=>{const primary=org.primary_tenant;const st=org.status==='active'&&org.expires_at&&new Date(org.expires_at)<=new Date()?'expired':org.status;const isExpanded=expandedCompanyId===org.id;const companyRow=<tr key={org.id}><td><strong>{org.organization_name||'Tanpa nama'}</strong><br/><small className="mono">{org.activation_package_key||'Belum ada paket'} · Kuota {org.activation_location_limit||0}</small></td><td>{org.owner_name||'—'}<br/><small>{org.owner_email||'—'}</small></td><td><button type="button" className="btn btn-small btn-outline" title={isExpanded?'Tutup daftar tenant':'Lihat daftar tenant'} aria-label={isExpanded?'Tutup daftar tenant':'Lihat daftar tenant'} onClick={()=>setExpandedCompanyId(isExpanded?'':org.id)}><Store size={14}/> {org.tenant_count||0} <ChevronDown size={13}/></button></td><td>{org.employee_count||0} akun</td><td>{org.activated_at?new Date(org.activated_at).toLocaleDateString('id-ID'):'—'}</td><td>{org.expires_at?new Date(org.expires_at).toLocaleDateString('id-ID'):'—'}</td><td><span className={'status-pill '+(st==='active'?'status-paid':st==='pending'?'status-waiting':'status-inactive')}>{st==='active'?'Aktif':st==='expired'?'Kedaluwarsa':st==='suspended'?'Nonaktif':st||'—'}</span></td><td><div className="tenant-actions"><button className="btn btn-small btn-primary" title="Aktivasi / perpanjang masa sewa perusahaan ini" aria-label="Aktivasi / perpanjang masa sewa perusahaan ini" disabled={!primary||registering} onClick={()=>activateOrganization(org)}><CheckCircle2 size={15}/></button>{st==='active'?<button className="btn btn-small btn-outline" title="Nonaktifkan akses perusahaan NexaSpace ini" aria-label="Nonaktifkan akses perusahaan NexaSpace ini" onClick={()=>changeOrganizationStatus(org,'suspended')}><Ban size={15}/></button>:<button className="btn btn-small btn-outline" title="Aktifkan kembali akses perusahaan NexaSpace ini" aria-label="Aktifkan kembali akses perusahaan NexaSpace ini" onClick={()=>changeOrganizationStatus(org,'active')}><Power size={15}/></button>}<button className="btn btn-small btn-outline" title="Hapus NexaSpace" aria-label="Hapus NexaSpace" onClick={()=>deleteOrganization(org)}><Trash2 size={15}/></button><button className="btn btn-small btn-outline" title="Terbitkan ulang kode pendaftaran Owner perusahaan ini" aria-label="Terbitkan ulang kode pendaftaran Owner perusahaan ini" disabled={!primary||st==='deleted'||registering} onClick={()=>regenerateOwnerInvite(primary)}><KeyRound size={15}/></button><button className="btn btn-small btn-outline" title="Buka pusat kendali tenant utama" aria-label="Buka pusat kendali tenant utama" disabled={!primary} onClick={()=>{setSelectedTenant(primary);setSection('store-control')}}><Eye size={15}/> Tenant utama</button></div></td></tr>;const tenantDetail=<tr key={org.id+'-tenants'}><td colSpan={8}><div className="company-tenant-detail"><div className="panel-head"><div><h4>Daftar Tenant Perusahaan: {org.organization_name}</h4><p>Setiap tenant adalah workspace yang dikelola oleh perusahaan ini.</p></div><span>{org.tenant_rows?.length||0} tenant</span></div>{!org.tenant_rows?.length?<EmptyState icon={Store} title="Belum ada tenant" text="Perusahaan ini belum memiliki workspace."/>:<div className="table-wrap"><table><thead><tr><th>Nama Tenant / Workspace</th><th>Dibuat</th><th>Status</th><th>Karyawan</th><th>Aksi</th></tr></thead><tbody>{org.tenant_rows.map(tenant=>{const tenantStatus=statusOf(tenant);return <tr key={tenant.id}><td><strong>{tenant.name||'Tenant tanpa nama'}</strong>{tenant.is_primary_workspace&&<small> · Tenant utama</small>}</td><td>{tenant.created_at?new Date(tenant.created_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta'}):'—'}</td><td><span className={'status-pill '+(tenantStatus==='active'?'status-paid':tenantStatus==='pending'?'status-waiting':'status-inactive')}>{tenantStatus==='active'?'Aktif':tenantStatus==='expired'?'Kedaluwarsa':tenantStatus==='suspended'?'Nonaktif':tenantStatus==='pending'?'Menunggu aktivasi':tenantStatus}</span></td><td>{tenant.employee_count||0} akun</td><td><div className="tenant-actions"><button className="btn btn-small btn-outline danger-icon" title="Hapus tenant" aria-label={'Hapus tenant '+tenant.name} onClick={()=>changeStatus(tenant,'deleted')}><Trash2 size={14}/></button>{tenantStatus==='active'?<button className="btn btn-small btn-outline" title="Nonaktifkan tenant" aria-label={'Nonaktifkan tenant '+tenant.name} onClick={()=>changeStatus(tenant,'suspended')}><Ban size={14}/></button>:<button className="btn btn-small btn-outline" title="Aktifkan tenant" aria-label={'Aktifkan tenant '+tenant.name} onClick={()=>changeStatus(tenant,'active')}><Power size={14}/></button>}</div></td></tr>})}</tbody></table></div>}</div></td></tr>;return isExpanded?[companyRow,tenantDetail]:[companyRow]})}</tbody></table></div>})()}
  </div>
</section>}
{section==='users'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / ACCOUNT CONTROL</span><h1>Manajemen <span className="heading-accent">user.</span></h1><p>Seluruh akun autentikasi, tenant terkait, dan kontrol akses login.</p></div><span className="date-pill"><Users size={14}/> {users.length} akun</span></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Users size={17}/> Seluruh akun</h3><p>Akun Super Admin dilindungi dari perubahan dan penghapusan akun.</p></div><button className="btn btn-outline btn-small" onClick={loadUsers}><RefreshCw size={14}/> Refresh</button></div><div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={userSearch} onChange={e=>{setUserSearch(e.target.value);setUserPage(1)}} placeholder="Cari email, nama, ID user, atau toko…"/></div><select className="text-input" value={userStatus} onChange={e=>{setUserStatus(e.target.value);setUserPage(1)}}><option value="all">Semua akun</option><option value="active">Login aktif</option><option value="blocked">Login dinonaktifkan</option></select></div>{usersLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:usersError?<div className="empty-state"><strong>Daftar akun gagal dimuat</strong><p>{usersError}</p><button className="btn btn-outline btn-small" onClick={loadUsers}><RefreshCw size={14}/> Coba lagi</button></div>:filteredUsers.length===0?<EmptyState icon={Users} title="Akun tidak ditemukan" text="Coba kata kunci atau filter lain."/>:<><div className="table-wrap"><table><thead><tr><th>Akun</th><th>Perusahaan / tenant</th><th>Jenis akun & role tenant</th><th>Penempatan</th><th>Terakhir masuk</th><th>Status login</th><th>Aksi</th></tr></thead><tbody>{filteredUsers.slice((userPage-1)*pageSize,userPage*pageSize).map(u=><tr key={u.user_id}><td><strong>{u.full_name||u.email||'Tanpa nama'}</strong><br/><small>{u.email||'Email tidak tersedia'}</small><br/><small className="mono">{u.user_id}</small></td><td>{u.organization_names&&<><strong>Perusahaan: {u.organization_names}</strong><br/></>}<span>Tenant / workspace: {u.store_names||(u.organization_names?'Akses melalui Owner perusahaan':'Belum terhubung ke tenant')}</span></td><td>{u.organization_names&&<strong>Owner perusahaan</strong>}{u.tenant_roles&&<small>{u.tenant_roles}</small>}{!u.organization_names&&!u.tenant_roles?(u.is_super_admin?'Super Admin — akses platform':'Belum memiliki role tenant'):null}</td><td>{u.organization_names&&Number(u.membership_count)===0?'Bukan penugasan karyawan tenant':`${u.active_memberships} aktif / ${u.membership_count} total`}</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('id-ID'):'Belum pernah masuk'}</td><td><span className={'status-pill '+(u.is_super_admin?'status-serving':u.is_banned?'status-inactive':'status-paid')}>{u.is_super_admin?'Super Admin':u.is_banned?'Dinonaktifkan':'Aktif'}</span></td><td>{u.is_super_admin?<span className="subtle">Dilindungi</span>:<div className="user-admin-actions"><button className={'btn btn-small '+(u.is_banned?'btn-primary':'btn-outline')} disabled={userActionId===u.user_id} onClick={()=>toggleUserBan(u)}>{u.is_banned?'Aktifkan login':'Nonaktifkan login'}</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>moveUserToTenant(u)}><Store size={13}/> Pindahkan tenant</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPin(u)}><ShieldCheck size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPassword(u)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" disabled={userActionId===u.user_id} onClick={()=>deleteUser(u)}><Trash2 size={13}/> Hapus permanen</button></div>}</td></tr>)}</tbody></table></div><Pagination page={userPage} total={filteredUsers.length} pageSize={pageSize} onChange={setUserPage}/></>}</div></section>}
        {section==='disabled'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / DISABLED STAFF</span><h1>Akun staf <span className="heading-accent">nonaktif.</span></h1><p>Tinjau akun yang dinonaktifkan Owner. Penghapusan permanen hanya untuk akun staf yang memenuhi syarat.</p></div><button className="btn btn-outline" onClick={loadDisabledMembers}><RefreshCw size={15}/> Refresh</button></div><div className="panel tenant-list-panel disabled-members-panel"><div className="panel-head"><div><h3><Users size={17}/> Akun staf nonaktif</h3><p>Riwayat dan data transaksi tetap dilindungi oleh batasan database.</p></div></div>{disabledLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:disabledMembers.length===0?<EmptyState icon={Users} title="Belum ada akun staf nonaktif" text="Akun yang dinonaktifkan Owner akan muncul di sini."/>:<><div className="table-wrap"><table><thead><tr><th>Akun staf</th><th>Tenant</th><th>Dinonaktifkan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{disabledMembers.slice((disabledPage-1)*pageSize,disabledPage*pageSize).map(m=><tr key={m.member_id}><td><strong>{m.full_name||'Tanpa nama'}</strong><br/><small>{m.email||'Email tidak tersedia'}</small><br/><small>Role: {m.role}</small></td><td>{m.store_name}</td><td>{m.disabled_at?new Date(m.disabled_at).toLocaleString('id-ID'):'Tanggal tidak tercatat'}<br/><small>Oleh: {m.disabled_by_email||'Owner (lama)'}</small></td><td><span className={'status-pill '+(m.has_other_active_membership?'status-waiting':'status-inactive')}>{m.has_other_active_membership?'Masih aktif di tenant lain':'Semua akses nonaktif'}</span></td><td><button className="btn btn-small btn-outline danger-icon" disabled={Boolean(m.has_other_active_membership)||deletingUserId===m.user_id} onClick={()=>deleteDisabledAccount(m)}>{deletingUserId===m.user_id?<span className="spinner"/>:<Trash2 size={13}/>} Hapus akun permanen</button></td></tr>)}</tbody></table></div><Pagination page={disabledPage} total={disabledMembers.length} pageSize={pageSize} onChange={setDisabledPage}/></>}</div></section>}
      </div>
    </main>
  </div>
}

function QueueScreen(){
  const token = new URLSearchParams(window.location.search).get('token')
  const [session,setSession]=useState(null)
  const [store,setStore]=useState(null)
  const [settings,setSettings]=useState(null)
  const [tickets,setTickets]=useState([])
  const [error,setError]=useState('')
  const [publicDisplay,setPublicDisplay]=useState(null)
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
  const loadPublic=useCallback(async()=>{
    if(!token||!supabase)return
    const {data,error:loadError}=await supabase.rpc('get_public_tv_display',{p_token:token})
    if(loadError||!data?.store_id){setPublicDisplay(null);setError(userFacingError(loadError, 'URL TV tidak valid, sudah dicabut, atau tenant tidak aktif.'));return}
    setError('')
    setPublicDisplay(data)
  },[token])
  useEffect(()=>{if(!token)return;loadPublic();const timer=setInterval(loadPublic,5000);return()=>clearInterval(timer)},[token,loadPublic])
  const load=useCallback(async()=>{if(!session?.user)return;setError('');const {data:members,error}=await supabase.from('store_members').select('store_id').eq('user_id',session.user.id).eq('is_active',true).order('created_at',{ascending:true});if(error||!members?.length){setError(userFacingError(error, 'Akun tidak memiliki akses toko aktif.'));return}const requestedStore=new URLSearchParams(window.location.search).get('store');if(requestedStore&&!members.some(m=>m.store_id===requestedStore)){setError('Akses ke layar antrian toko ini tidak diizinkan untuk akun Anda.');return}const sid=(members.find(m=>m.store_id===requestedStore)||members[0]).store_id;const [{data:s},{data:cfg},{data:q}]=await Promise.all([supabase.from('stores').select('*').eq('id',sid).single(),supabase.from('store_settings').select('*').eq('store_id',sid).maybeSingle(),supabase.from('queue_tickets').select('*').eq('store_id',sid).eq('service_date',today()).order('queue_number')]);setStore(s);setSettings(cfg);setTickets(q||[])},[session])
  useEffect(()=>{if(token)return;load()},[token,load])
  useEffect(()=>{if(token||!store||!supabase)return;const channel=supabase.channel('tv-queue-'+store.id).on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets',filter:'store_id=eq.'+store.id},()=>load()).subscribe();return()=>supabase.removeChannel(channel)},[token,store,load])
  // Authenticated TV uses the queue_tickets Realtime channel above; avoid redundant polling.
  if(token)return <PublicQueueScreen display={publicDisplay} error={error}/>
  const current=tickets.filter(t=>['called','serving'].includes(t.status)).slice(-3).reverse()
  const waiting=tickets.filter(t=>t.status==='waiting').slice(0,6)
  const queueTenantStatus=store?.status==='active'&&store?.expires_at&&new Date(store.expires_at)<=new Date()?'expired':(store?.status||'active')
  if(!session)return <div className="tv-login"><Brand/><h1>Layar antrian NexaPos</h1><p>Masuk dengan akun toko untuk menampilkan antrian.</p><button className="btn btn-primary" onClick={()=>window.location.href=window.location.pathname}>Kembali ke login</button></div>
  if(error&&!store)return <div className="tv-login"><Brand/><h1>Akses layar antrian ditolak</h1><p>{error}</p><button className="btn btn-primary" onClick={()=>window.location.href=window.location.pathname}>Kembali ke workspace</button></div>
  if(store&&queueTenantStatus!=='active')return <TenantLockedScreen store={store} status={queueTenantStatus} onSignOut={()=>supabase.auth.signOut()}/>
  return <PublicQueueScreen display={{store_id:store?.id,store_name:settings?.store_name||store?.name||'NexaPos',queue_enabled:settings?.queue_enabled!==false,settings:{queue_prefix:settings?.queue_prefix||'A',queue_enabled:settings?.queue_enabled!==false},current,waiting}} error={error}/>
}

function PublicQueueScreen({display,error}){
  const current=display?.current||[]
  const waiting=display?.waiting||[]
  const cfg=display?.settings||{}
  const disabled=cfg.queue_enabled===false || display?.queue_enabled===false
  if(error&&!display)return <div className="tv-login"><Brand/><h1>URL layar antrean tidak tersedia</h1><p>{error}</p><small>Periksa URL layar antrean atau buat URL baru dari pengaturan toko.</small></div>
  if(!display)return <div className="tv-login"><Brand/><h1>Menghubungkan layar antrean…</h1><p>Memuat data antrean.</p></div>
  if(disabled)return <main className="tv-screen tv-screen-custom tv-light-mode"><header className="tv-header"><Brand/><div className="tv-store">{display.store_name||'NexaPos'}</div><WibClock className="tv-clock" showDate/></header><section className="tv-current"><span className="eyebrow">SISTEM ANTREAN</span><div className="tv-empty">Sistem antrean sedang nonaktif</div></section><footer className="tv-footer"><span>Antrean dinonaktifkan oleh pengelola toko</span><strong>{display.store_name||'NexaPos'}</strong></footer></main>
  return <main className="tv-screen tv-screen-custom tv-light-mode" style={{'--tv-custom-primary':'#2563eb','--tv-custom-bg':'#f8fafc','--tv-custom-text':'#0f172a','--tv-number-size':'clamp(56px, 9vw, 112px)','--tv-name-size':'clamp(20px, 3vw, 32px)','--tv-counter-size':'clamp(18px, 2.5vw, 26px)','--tv-next-size':'clamp(16px, 2vw, 22px)'}}>
    <header className="tv-header"><Brand/><div><span className="live-status"><i/> LIVE QUEUE</span><div className="tv-store">{display.store_name||'NexaPos'}</div></div><WibClock className="tv-clock" showDate/></header>
    <div className="tv-content tv-content-custom tv-layout-split-left">
      <section className="tv-current"><span className="eyebrow">NOMOR ANTREAN DIPANGGIL</span>{current.length?current.map((ticket,index)=><div className={'tv-call '+(index===0?'tv-call-main':'')} key={ticket.id}><span>{(cfg.queue_prefix||'A')+String(ticket.queue_number).padStart(3,'0')}</span><strong className="tv-customer-name">{ticket.customer_name?.trim()||'Nama tidak tersedia'}</strong><small>{ticket.counter_label?.trim()||'Loket belum ditentukan'}</small></div>):<div className="tv-empty">Menunggu panggilan berikutnya…</div>}</section>
      <section className="tv-next"><div className="tv-next-head"><div><span className="eyebrow">ANTREAN BERIKUTNYA</span><h2>Mohon bersiap</h2></div><span className="tv-count">{waiting.length} menunggu</span></div>{waiting.length?waiting.map(ticket=><div className="tv-next-row" key={ticket.id}><span>{(cfg.queue_prefix||'A')+String(ticket.queue_number).padStart(3,'0')}</span><small>{ticket.customer_name?.trim()||'—'}</small><small>{ticket.counter_label?.trim()||'—'}</small></div>):<div className="tv-next-empty">Tidak ada antrean menunggu</div>}</section>
    </div>
    <footer className="tv-footer"><span><i className="live-dot"/> Informasi antrean diperbarui otomatis</span><strong>{display.store_name||'NexaPos'} <span>•</span> Terima kasih atas kunjungan Anda</strong></footer>
  </main>
}

function SupportPortal() {
  const [session, setSession] = useState(null)
  const [opened, setOpened] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({data}) => setSession(data.session))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setOpened(false)
      }
    })
    const open = () => { setOpened(true) }
    window.addEventListener('nexapos-open-support', open)
    return () => { subscription.unsubscribe(); window.removeEventListener('nexapos-open-support', open) }
  }, [])
  useEffect(() => {
    let cancelled = false
    const userId = session?.user?.id
    if (!userId || !supabase) {
      setIsSuperAdmin(false)
      return
    }
    Promise.all([
      supabase.from('super_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      supabase.rpc('get_my_platform_staff_role'),
    ]).then(([adminResult, staffResult]) => {
      const staffData = Array.isArray(staffResult.data) ? staffResult.data[0] : staffResult.data
      if (!cancelled) setIsSuperAdmin(Boolean(adminResult.data) || (!staffResult.error && staffData?.role === 'admin'))
    })
    return () => { cancelled = true }
  }, [session?.user?.id, session?.access_token])
  if (!session) return null
  return <>
    <button type="button" className="support-floating-launcher" onClick={() => setOpened(true)} aria-label="Buka pusat bantuan" title="Pusat bantuan"><img src="/nexapos-mark.svg" alt="" /></button>
    {opened && <SupportCenter session={session} isSuperAdmin={isSuperAdmin} onClose={() => setOpened(false)}/>}
  </>
}

export default function Root(){
  const screen=new URLSearchParams(window.location.search).get('screen')
  if(screen==='queue')return <QueueScreen/>
  if(screen==='demo')return <Demo/>
  return <><App/><SupportPortal/></>
}