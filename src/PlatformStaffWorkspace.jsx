import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, CreditCard, Headphones, LogOut, RefreshCw, ShieldCheck, Store, Ticket, Users, LayoutDashboard, Search, Send, ArrowLeft } from 'lucide-react'
import PromotionManager from './PromotionManager.jsx'
import SubscriptionPlanManager from './SubscriptionPlanManager.jsx'

const items = [
  { key: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { key: 'plans', label: 'Paket & harga', icon: CreditCard, permission: 'plans' },
  { key: 'promotions', label: 'Promo & diskon', icon: Ticket, permission: 'promotions' },
  { key: 'support', label: 'Pusat bantuan', icon: Headphones, permission: 'support' },
  { key: 'users', label: 'Manajemen pengguna', icon: Users, permission: 'users' },
  { key: 'stores', label: 'Manajemen toko', icon: Store, permission: 'stores' },
  { key: 'reports', label: 'Laporan sistem', icon: BarChart3, permission: 'system_reports' },
]
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const date = value => value ? new Date(value).toLocaleString('id-ID') : '—'

export default function PlatformStaffWorkspace({ session, staff, onSignOut }) {
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [activeThread, setActiveThread] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const permissions = staff?.permissions || {}
  const visibleItems = useMemo(() => items.filter(item => !item.permission || permissions[item.permission] === true), [permissions])
  const title = visibleItems.find(item => item.key === page)?.label || 'Ringkasan'
  const goBack = () => { setPage('dashboard'); setNotice(''); setQuery('') }

  const request = useCallback(async (action, extra = {}) => {
    const token = session?.access_token
    if (!token) throw new Error('Sesi login berakhir. Silakan masuk kembali.')
    const response = await fetch('/.netlify/functions/platform-staff-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ action, ...extra }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Data belum berhasil dimuat.')
    return result.data
  }, [session?.access_token])

  const loadPage = useCallback(async (target = page) => {
    setLoading(true); setNotice('')
    try {
      if (target === 'users' || target === 'stores' || target === 'support') {
        const action = target === 'support' ? 'support_inbox' : target
        const nextData = await request(action) || []
        setData(nextData)
        if (target === 'support') setActiveThread(current => current ? (nextData.find(thread => thread.user_id === current.user_id) || null) : null)
      } else if (target === 'reports') {
        setReport(await request('reports'))
      }
    } catch (error) {
      setNotice(error.message || 'Bagian ini belum berhasil dimuat.')
      setData([])
      if (target === 'reports') setReport(null)
    } finally { setLoading(false) }
  }, [page, request])

  useEffect(() => {
    if (['users', 'stores', 'support', 'reports'].includes(page)) loadPage(page)
    else { setData([]); setNotice('') }
  }, [page, loadPage])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return data
    return data.filter(row => JSON.stringify(row).toLowerCase().includes(term))
  }, [data, query])

  const toggleUserLogin = async user => {
    const banned = !(user.banned_until && new Date(user.banned_until) > new Date())
    if (!window.confirm((banned ? 'Nonaktifkan login akun ' : 'Aktifkan kembali login akun ') + user.email + '?')) return
    setNotice('')
    try { await request('users_toggle_login', { userId: user.id, banned }); setNotice(banned ? 'Login akun dinonaktifkan.' : 'Login akun diaktifkan kembali.'); await loadPage('users') }
    catch (error) { setNotice(error.message || 'Status login belum berhasil diubah.') }
  }
  const toggleStoreStatus = async store => {
    if (!window.confirm((store.status === 'active' ? 'Tangguhkan' : 'Aktifkan kembali') + ' operasional toko ' + (store.name || store.id) + '?')) return
    setNotice('')
    try { const result = await request('stores_toggle_status', { storeId: store.id }); setNotice('Status toko berhasil diubah menjadi ' + result.status + '.'); await loadPage('stores') }
    catch (error) { setNotice(error.message || 'Status toko belum berhasil diubah.') }
  }

  const sendReply = async event => {
    event.preventDefault()
    if (!activeThread || !reply.trim() || sending) return
    setSending(true); setNotice('')
    try {
      await request('support_reply', { userId: activeThread.user_id, message: reply.trim() })
      setReply('')
      setNotice('Balasan berhasil dikirim.')
      await loadPage('support')
    } catch (error) { setNotice(error.message || 'Balasan belum berhasil dikirim.') }
    finally { setSending(false) }
  }

  return <div className="app-shell super-admin-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand"><span className="brand-mark">N</span><span>Nexa<span className="brand-accent">Pos</span><small>SMART COMMERCE</small></span></div></div>
      <div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>{staff?.role === 'admin' ? 'Admin NexaPos' : 'Customer Service'}</strong><small>Workspace internal</small></span></div>
      <nav className="side-nav"><div className="nav-group"><div className="nav-section">WORKSPACE PLATFORM</div>{visibleItems.map(item => {const Icon=item.icon;return <button key={item.key} className={'nav-link '+(page===item.key?'nav-active':'')} onClick={()=>{setPage(item.key);setActiveThread(null)}}><Icon size={18}/><span>{item.label}</span></button>})}</div></nav>
      <div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{(session?.user?.email||'N').slice(0,1).toUpperCase()}</span><span className="user-copy"><strong>{session?.user?.email}</strong><small>{staff?.role === 'admin' ? 'Admin platform' : 'Customer Service'}</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-title-group"><div className="breadcrumb">Workspace platform <span>/</span> <strong>{title}</strong></div><div className="topbar-date">Data dan tindakan diperiksa kembali oleh server berdasarkan izin akun</div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> {staff?.role === 'admin' ? 'ADMIN PLATFORM' : 'CUSTOMER SERVICE'}</span><button className="btn btn-outline btn-small" onClick={onSignOut}><LogOut size={14}/> Keluar</button></div></header>
      <div className="page-content"><section className="page-section">
        <div className="page-heading"><div><span className="eyebrow muted">NEXAPOS / INTERNAL</span><h1>{page === 'dashboard' ? <>Workspace <span className="heading-accent">platform.</span></> : <>{title} <span className="heading-accent">.</span></>}</h1><p>{page === 'dashboard' ? 'Pilih pekerjaan yang sesuai dengan izin akun Anda.' : 'Data internal ditampilkan melalui endpoint yang memverifikasi sesi, role, dan izin setiap permintaan.'}</p></div>{['users','stores','support','reports'].includes(page) && <button className="btn btn-outline" onClick={()=>loadPage(page)} disabled={loading}><RefreshCw size={15}/> Muat ulang</button>}</div>
        {notice && <div className="notice" role="status">{notice}</div>}
        {page === 'dashboard' && <div className="stats-grid">{visibleItems.filter(item=>item.key!=='dashboard').map(item=>{const Icon=item.icon;return <button key={item.key} className="panel" style={{textAlign:'left',cursor:'pointer',padding:24}} onClick={()=>setPage(item.key)}><span className="stat-icon tone-blue"><Icon size={20}/></span><h3>{item.label}</h3><p className="subtle">Buka bagian ini</p></button>})}</div>}
        {page === 'plans' && permissions.plans === true && <SubscriptionPlanManager onBack={goBack} staffMode session={session}/>}
        {page === 'promotions' && permissions.promotions === true && <PromotionManager onBack={goBack} onSignOut={onSignOut} staffMode session={session}/>}
        {page === 'users' && permissions.users === true && <div className="panel"><div className="panel-head"><div><h3><Users size={17}/> Akun platform</h3><p>{data.length} akun · akun Super Admin dan staf platform dilindungi dari tombol cepat</p></div></div><div className="search-box" style={{marginBottom:16}}><Search size={16}/><input className="text-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama atau email akun"/></div>{loading?<p>Memuat akun…</p>:<div className="table-wrap"><table><thead><tr><th>Nama / email</th><th>Dibuat</th><th>Login terakhir</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map(u=><tr key={u.id}><td><strong>{u.full_name||'Tanpa nama'}</strong><br/><small>{u.email}</small>{u.is_platform_staff&&<small> · Staf platform ({u.platform_staff_active?'aktif':'nonaktif'})</small>}</td><td>{date(u.created_at)}</td><td>{date(u.last_sign_in_at)}</td><td>{u.banned_until&&new Date(u.banned_until)>new Date()?'Login nonaktif':'Login aktif'}</td><td>{u.is_platform_staff?<small>Dikelola di Manajemen Tim</small>:<button className={'btn btn-small '+(u.banned_until&&new Date(u.banned_until)>new Date()?'btn-primary':'btn-outline')} onClick={()=>toggleUserLogin(u)}>{u.banned_until&&new Date(u.banned_until)>new Date()?'Aktifkan login':'Nonaktifkan login'}</button>}</td></tr>)}</tbody></table></div>}</div>}
        {page === 'stores' && permissions.stores === true && <div className="panel"><div className="panel-head"><div><h3><Store size={17}/> Daftar toko / tenant</h3><p>{data.length} tenant · tombol cepat hanya menangguhkan atau mengaktifkan tenant aktif</p></div></div><div className="search-box" style={{marginBottom:16}}><Search size={16}/><input className="text-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama toko, pemilik, atau status"/></div>{loading?<p>Memuat toko…</p>:<div className="table-wrap"><table><thead><tr><th>Toko</th><th>Pemilik</th><th>Status</th><th>Masa aktif sampai</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>{filtered.map(s=><tr key={s.id}><td><strong>{s.name||'Tanpa nama'}</strong><br/><small>{s.id}</small></td><td>{s.owner_name||'—'}<br/><small>{s.owner_email||'—'}</small></td><td>{s.status||'—'}</td><td>{date(s.expires_at)}</td><td>{date(s.created_at)}</td><td>{['active','suspended'].includes(s.status)?<button className={'btn btn-small '+(s.status==='suspended'?'btn-primary':'btn-outline')} onClick={()=>toggleStoreStatus(s)}>{s.status==='active'?'Tangguhkan':'Aktifkan'}</button>:<small>Perlu tindakan khusus</small>}</td></tr>)}</tbody></table></div>}</div>}
        {page === 'reports' && permissions.system_reports === true && <>
          {report && (report.account_count_limited || report.store_count_limited || report.membership_count_limited || report.order_count_limited) && <div className="notice" role="status">Sebagian angka mencapai batas pembacaan laporan. Angka yang ditampilkan mungkin belum mencakup seluruh data; muat ulang atau minta pemeriksaan administrator.</div>}
          <div className="stats-grid">{loading?<div className="panel">Memuat laporan…</div>:report&&[['Akun terdaftar',report.account_count ?? 'Tidak tersedia'],['Total tenant',report.store_count],['Tenant aktif',report.active_stores],['Tenant kedaluwarsa',report.expired_stores],['Keanggotaan aktif',report.active_memberships],['Transaksi terbaca',report.order_count],['Total nilai transaksi',money(report.order_total)]].map(([label,value])=><div className="panel" key={label} style={{padding:22}}><span className="stat-icon tone-blue"><Activity size={19}/></span><p className="subtle">{label}</p><h2>{typeof value==='number'?value.toLocaleString('id-ID'):value}</h2></div>)}</div>
        </>}
        {page === 'support' && permissions.support === true && <div className="panel"><div className="panel-head"><div><h3><Headphones size={17}/> Kotak masuk bantuan</h3><p>{data.length} percakapan · balasan dicatat dengan identitas staf yang sedang login</p></div></div><div className="staff-support-layout" style={{display:'grid',gridTemplateColumns:'minmax(220px, 0.8fr) minmax(0,1.2fr)',gap:16}}><div><div className="search-box" style={{marginBottom:12}}><Search size={16}/><input className="text-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari percakapan"/></div>{filtered.map(thread=><button key={thread.user_id} className="panel" style={{display:'block',width:'100%',textAlign:'left',padding:14,marginBottom:8,cursor:'pointer',borderColor:activeThread?.user_id===thread.user_id?'var(--accent)':''}} onClick={()=>setActiveThread(thread)}><strong>{thread.email}</strong><p className="subtle">{thread.latest?.message||''}</p><small>{date(thread.latest?.created_at)} · {thread.messages?.length||0} pesan</small></button>)}</div><div>{!activeThread?<div className="empty-state"><Headphones size={24}/><p>Pilih percakapan untuk membaca dan membalas.</p></div>:<><h3>{activeThread.email}</h3><div style={{maxHeight:420,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,padding:'12px 0'}}>{[...(activeThread.messages||[])].reverse().map(m=><div key={m.id} className="panel" style={{padding:12}}><small>{m.sender_role||'customer'} · {date(m.created_at)}</small><p style={{whiteSpace:'pre-wrap',marginBottom:0}}>{m.message}</p></div>)}</div><form onSubmit={sendReply} style={{display:'flex',gap:8,alignItems:'end'}}><textarea className="text-input" value={reply} onChange={e=>setReply(e.target.value)} rows={3} maxLength={5000} placeholder="Tulis balasan..." required style={{flex:1}}/><button className="btn btn-primary" disabled={sending||!reply.trim()}><Send size={15}/>{sending?'Mengirim…':'Kirim'}</button></form></>}</div></div></div>}
      </section></div>
    </main>
  </div>
}
