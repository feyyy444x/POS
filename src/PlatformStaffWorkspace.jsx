import { useMemo, useState } from 'react'
import { BarChart3, CreditCard, Headphones, LogOut, ShieldCheck, Store, Ticket, Users, LayoutDashboard, ArrowLeft } from 'lucide-react'
import PromotionManager from './PromotionManager.jsx'
import SubscriptionPlanManager from './SubscriptionPlanManager.jsx'
import SupportCenter from './SupportCenter.jsx'

const items = [
  { key: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'plans', label: 'Paket & harga', icon: CreditCard, permission: 'plans' },
  { key: 'promotions', label: 'Promo & diskon', icon: Ticket, permission: 'promotions' },
  { key: 'support', label: 'Pusat bantuan', icon: Headphones, permission: 'support' },
  { key: 'users', label: 'Manajemen pengguna', icon: Users, permission: 'users' },
  { key: 'stores', label: 'Manajemen toko', icon: Store, permission: 'stores' },
  { key: 'reports', label: 'Laporan sistem', icon: BarChart3, permission: 'system_reports' },
]

export default function PlatformStaffWorkspace({ session, staff, onSignOut }) {
  const [page, setPage] = useState('dashboard')
  const permissions = staff?.permissions || {}
  const visibleItems = useMemo(() => items.filter(item => !item.permission || permissions[item.permission] === true), [permissions])
  const title = visibleItems.find(item => item.key === page)?.label || 'Ringkasan'
  const goBack = () => setPage('dashboard')
  return <div className="app-shell super-admin-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand"><span className="brand-mark brand-mark-image"><img className="brand-logo-image" src="/nexapos-mark.svg" alt=""/></span><span>Nexa<span className="brand-accent">Pos</span><small>SMART COMMERCE</small></span></div></div>
      <div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>{staff?.role === 'admin' ? 'Admin NexaPos' : 'Customer Service'}</strong><small>Workspace internal</small></span></div>
      <nav className="side-nav"><div className="nav-group"><div className="nav-section">WORKSPACE PLATFORM</div>{visibleItems.map(item => {const Icon=item.icon;return <button key={item.key} className={'nav-link '+(page===item.key?'nav-active':'')} onClick={()=>setPage(item.key)}><Icon size={18}/><span>{item.label}</span></button>})}</div></nav>
      <div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{(session.user.email||'N').slice(0,1).toUpperCase()}</span><span className="user-copy"><strong>{session.user.email}</strong><small>{staff?.role === 'admin' ? 'Admin platform' : 'Customer Service'}</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-title-group"><div className="breadcrumb">Workspace platform <span>/</span> <strong>{title}</strong></div><div className="topbar-date">Akses dibatasi oleh izin Super Admin</div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> {staff?.role === 'admin' ? 'ADMIN PLATFORM' : 'CUSTOMER SERVICE'}</span><button className="btn btn-outline btn-small" onClick={onSignOut}><LogOut size={14}/> Keluar</button></div></header>
      {page === 'plans' && permissions.plans === true ? <SubscriptionPlanManager onBack={goBack}/> :
       page === 'promotions' && permissions.promotions === true ? <PromotionManager onBack={goBack} onSignOut={onSignOut}/> :
       page === 'support' && permissions.support === true ? <div className="page-content"><section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / SUPPORT</span><h1>Pusat <span className="heading-accent">bantuan.</span></h1><p>Menu bantuan saat ini hanya menyediakan kanal pelanggan untuk akun staf; kotak masuk internal belum dapat dibuka tanpa izin backend khusus.</p></div></div><SupportCenter session={session} onClose={goBack} isSuperAdmin={false} embedded={false}/></section></div> :
       <div className="page-content"><section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">NEXAPOS / INTERNAL</span><h1>{page === 'dashboard' ? <>Workspace <span className="heading-accent">platform.</span></> : <>{title} <span className="heading-accent">.</span></>}</h1><p>{page === 'dashboard' ? 'Kelola pekerjaan platform melalui menu yang diizinkan untuk akun Anda.' : 'Akses untuk bagian ini sudah terdeteksi. Operasi data dibatasi hingga endpoint khusus dengan pemeriksaan role dan izin tersedia.'}</p></div></div>
        {page === 'dashboard' ? <div className="stats-grid">{visibleItems.filter(item=>item.key!=='dashboard').map(item=>{const Icon=item.icon;return <button key={item.key} className="panel" style={{textAlign:'left',cursor:'pointer',padding:24}} onClick={()=>setPage(item.key)}><span className="stat-icon tone-blue"><Icon size={20}/></span><h3>{item.label}</h3><p className="subtle">Buka bagian ini</p></button>})}</div> : <div className="panel"><div className="panel-head"><div><h3>{title}</h3><p>Menu hanya ditampilkan karena izin akun aktif. Operasi sensitif tidak dibuka lewat akses Super Admin umum.</p></div></div><button className="btn btn-outline" onClick={goBack}><ArrowLeft size={15}/> Kembali ke ringkasan</button></div>}
      </section></div>}
    </main>
  </div>
}
