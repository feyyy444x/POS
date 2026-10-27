import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, BarChart3, Bell, Boxes, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Clock3, CreditCard, FileText, Headphones, LayoutDashboard,
  LogOut, Menu, Minus, Monitor, Package, Plus, Printer, QrCode, RefreshCw, Search,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, SkipForward, Store, Ticket, Trash2,
  TrendingUp, UserRound, Users, UserPlus, CalendarDays, Ban, Archive, Mail, Wallet, X
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const shortTime = (value) => new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
const initial = (name) => (name || 'N').trim().slice(0, 1).toUpperCase()

function Brand({ small = false }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><ShoppingBag size={small ? 17 : 21} strokeWidth={2.5}/></span><span>Nexa<span className="brand-accent">Pos</span><small>SMART COMMERCE</small></span></div>
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    if (!isSupabaseConfigured) { setMessage('Konfigurasi Supabase belum tersedia. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di environment Netlify.'); return }
    setBusy(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Akun dibuat. Periksa email untuk verifikasi, lalu masuk ke NexaPos.')
    else setMessage(mode === 'signup' ? 'Akun berhasil dibuat. Menyiapkan toko Anda…' : '')
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
      <h2>{mode === 'login' ? 'Selamat datang' : 'Aktifkan akun undangan'}</h2>
      <p className="subtle">{mode === 'login' ? 'Masuk untuk melanjutkan ke dashboard NexaPos.' : 'Gunakan email yang sudah didaftarkan Owner atau Super Admin.'}</p>
      <label>Email</label><div className="field"><UserRound size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@bisnis.com" required autoComplete="email"/></div>
      <label>Password</label><div className="field"><ShieldCheck size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {message && <div className={`notice ${message.includes('berhasil') || message.includes('Akun dibuat') ? 'notice-success' : ''}`}>{message}</div>}
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? <span className="spinner"/> : mode==='login' ? 'Masuk ke workspace' : 'Buat akun NexaPos'} <ArrowRight size={17}/></button>
      <div className="auth-switch">{mode==='login'?'Punya undangan?':'Sudah punya akun?'} <button type="button" onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'Aktifkan akun':'Masuk'}</button></div>
      <div className="secure-note"><ShieldCheck size={14}/> Sesi aman dengan Supabase Auth</div>
    </form></div>
  </main>
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [adminCheckReady, setAdminCheckReady] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [store, setStore] = useState(null)
  const [membership, setMembership] = useState(null)
  const [memberships, setMemberships] = useState([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [settings, setSettings] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Semua')
  const [cart, setCart] = useState([])
  const [productModal, setProductModal] = useState(null)
  const [queueCustomer, setQueueCustomer] = useState('')
  const [queueBusy, setQueueBusy] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [discount, setDiscount] = useState('0')
  const [savingSettings, setSavingSettings] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamInvites, setTeamInvites] = useState([])
  const [teamSaving, setTeamSaving] = useState(false)

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, nextSession)=>setSession(nextSession))
    return ()=>subscription.unsubscribe()
  }, [])

  const loadWorkspace = useCallback(async () => {
    if (!session?.user || !supabase) return
    setLoading(true)
    const {data: memberRows, error: memberError} = await supabase.from('store_members').select('store_id,role').eq('user_id',session.user.id).order('created_at',{ascending:true})
    if (memberError) { setNotice(memberError.message); setLoading(false); return }
    if (!memberRows?.length) { setMemberships([]); setStore(null); setNotice('Akun belum memiliki toko. Minta pemilik toko menambahkan akun ini sebagai karyawan.'); setLoading(false); return }
    const {data: storeRows, error: storesError} = await supabase.from('stores').select('id,name').in('id',memberRows.map(m=>m.store_id))
    if (storesError) { setNotice(storesError.message); setLoading(false); return }
    const {data: settingRows} = await supabase.from('store_settings').select('store_id,store_name').in('store_id',memberRows.map(m=>m.store_id))
    const availableMemberships = memberRows.map(m=>({...m,store_name:settingRows?.find(s=>s.store_id===m.store_id)?.store_name||storeRows?.find(s=>s.id===m.store_id)?.name||'Toko'}))
    setMemberships(availableMemberships)
    const member = availableMemberships.find(m=>m.store_id===selectedStoreId) || availableMemberships[0]
    if (selectedStoreId !== member.store_id) setSelectedStoreId(member.store_id)
    setMembership(member)
    const [{data: storeData},{data: settingData},{data: productData},{data: orderData},{data: queueData}] = await Promise.all([
      supabase.from('stores').select('*').eq('id',member.store_id).single(),
      supabase.from('store_settings').select('*').eq('store_id',member.store_id).maybeSingle(),
      supabase.from('products').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}),
      supabase.from('orders').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}).limit(100),
      supabase.from('queue_tickets').select('*').eq('store_id',member.store_id).eq('service_date',today()).order('queue_number',{ascending:true})
    ])
    setStore(storeData || null); setSettings(settingData || {store_id:member.store_id,store_name:storeData?.name||member.store_name||'NexaPos Store',address:'',phone:'',receipt_footer:'Terima kasih telah berbelanja',queue_prefix:'A',currency:'IDR'})
    setProducts(productData || []); setOrders(orderData || []); setQueue(queueData || [])
    if (member.role === 'owner') {
      const [{data: memberList},{data: inviteList}] = await Promise.all([
        supabase.from('store_members').select('id,user_id,role,email,full_name,is_active,created_at').eq('store_id',member.store_id).order('created_at',{ascending:true}),
        supabase.from('store_invites').select('id,email,full_name,role,created_at,expires_at,accepted_at').eq('store_id',member.store_id).order('created_at',{ascending:false})
      ])
      setTeamMembers(memberList || []); setTeamInvites(inviteList || [])
    } else { setTeamMembers([]); setTeamInvites([]) }
    setLoading(false)
  }, [session, selectedStoreId])

  useEffect(()=>{if(!session){setIsSuperAdmin(false);setAdminCheckReady(true);return}setAdminCheckReady(false);supabase.from('super_admins').select('user_id').eq('user_id',session.user.id).maybeSingle().then(({data})=>{setIsSuperAdmin(Boolean(data));setAdminCheckReady(true)})},[session])

  useEffect(()=>{if(session) supabase.rpc('accept_store_invites').then(()=>loadWorkspace()).catch(()=>loadWorkspace())},[session,loadWorkspace])

  useEffect(()=>{
    if (!session || !membership?.store_id || !supabase) return
    const channel = supabase.channel('nexapos-live-'+membership.store_id)
      .on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets',filter:'store_id=eq.'+membership.store_id},payload=>{
        if(payload.eventType==='DELETE') setQueue(prev=>prev.filter(t=>t.id!==payload.old.id))
        else setQueue(prev=>{const rows=prev.filter(t=>t.id!==payload.new.id);rows.push(payload.new);return rows.sort((a,b)=>a.queue_number-b.queue_number)})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'products',filter:'store_id=eq.'+membership.store_id},()=>supabase.from('products').select('*').eq('store_id',membership.store_id).order('created_at',{ascending:false}).then(({data})=>setProducts(data||[])))
      .subscribe()
    return ()=>supabase.removeChannel(channel)
  },[session,membership?.store_id])

  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice])

  const isManager = ['owner','admin','manager'].includes(membership?.role)
  const categories = useMemo(()=>['Semua',...new Set(products.map(p=>p.category||'Umum'))],[products])
  const visibleProducts = useMemo(()=>products.filter(p=>p.is_active && (category==='Semua'||(p.category||'Umum')===category) && (p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))),[products,category,search])
  const subtotal = cart.reduce((sum,item)=>sum+Number(item.price)*item.quantity,0)
  const safeDiscount = Math.min(Math.max(Number(discount)||0,0),subtotal)
  const total = subtotal-safeDiscount
  const waitingQueue = queue.filter(t=>t.status==='waiting')
  const activeQueue = queue.filter(t=>['called','serving'].includes(t.status))
  const todaysOrders = orders.filter(o=>o.created_at?.slice(0,10)===today())
  const todaysSales = todaysOrders.filter(o=>o.status==='paid').reduce((sum,o)=>sum+Number(o.total),0)

  const addToCart = (product) => setCart(prev=>{const existing=prev.find(i=>i.id===product.id);if(existing)return prev.map(i=>i.id===product.id?{...i,quantity:Math.min(i.quantity+1,product.stock||999)}:i);return [...prev,{...product,quantity:1}]})
  const changeQty = (id, delta) => setCart(prev=>prev.map(i=>i.id===id?{...i,quantity:Math.max(1,Math.min(i.quantity+delta,i.stock||999))}:i))
  const removeCartItem = id => setCart(prev=>prev.filter(i=>i.id!==id))

  const checkout = async () => {
    if(!cart.length||!store)return
    const paid=payMethod==='cash'?(Number(paidAmount)||0):total
    if(paid<total){setNotice('Nominal pembayaran masih kurang.');return}
    setQueueBusy(true)
    const {data,error}=await supabase.rpc('complete_sale',{p_store_id:store.id,p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity})),p_discount:safeDiscount,p_payment_method:payMethod,p_paid_amount:paid,p_customer_name:queueCustomer||null,p_create_queue:true})
    setQueueBusy(false)
    if(error){setNotice(error.message);return}
    const {data: receiptItems} = await supabase.from('order_items').select('*').eq('order_id',data.order.id).order('id')
    setReceipt({...data,items:receiptItems||[]})
    setCart([]);setPaidAmount('');setDiscount('0');setQueueCustomer('')
    await loadWorkspace()
    setPage('pos')
    setNotice('Transaksi berhasil. Struk siap dicetak.')
  }

  const createTicket = async () => {
    if(!store)return
    setQueueBusy(true)
    const {data,error}=await supabase.rpc('create_queue_ticket',{p_store_id:store.id,p_customer_name:queueCustomer||null,p_order_id:null})
    setQueueBusy(false)
    if(error){setNotice(error.message);return}
    setQueueCustomer('')
    setNotice('Nomor antrian '+(settings?.queue_prefix||'A')+String(data.queue_number).padStart(3,'0')+' berhasil dibuat.')
    await loadWorkspace()
  }

  const updateTicket = async (ticket,status) => {
    const update={status}
    if(status==='called'||status==='serving')update.called_at=new Date().toISOString()
    if(status==='done'||status==='skipped')update.completed_at=new Date().toISOString()
    const {error}=await supabase.from('queue_tickets').update(update).eq('id',ticket.id)
    if(error)setNotice(error.message);else await loadWorkspace()
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    if(!isManager){setNotice('Hanya admin atau manager yang dapat mengelola produk.');return}
    const form=new FormData(event.currentTarget)
    const data={store_id:store.id,name:String(form.get('name')).trim(),sku:String(form.get('sku')||'').trim()||null,barcode:String(form.get('barcode')||'').trim()||null,category:String(form.get('category')||'Umum').trim()||'Umum',price:Number(form.get('price')||0),cost_price:Number(form.get('cost_price')||0),stock:Number(form.get('stock')||0),is_active:true}
    const result=productModal?.id
      ? await supabase.from('products').update({...data,updated_at:new Date().toISOString()}).eq('id',productModal.id).eq('store_id',store.id)
      : await supabase.from('products').insert(data)
    if(result.error){setNotice(result.error.message);return}
    setProductModal(null);setNotice('Produk berhasil disimpan.')
    const {data:rows}=await supabase.from('products').select('*').eq('store_id',store.id).order('created_at',{ascending:false});setProducts(rows||[])
  }

  const deleteProduct = async (product) => {
    if(!isManager)return
    if(!confirm('Hapus produk '+product.name+'?'))return
    const {error}=await supabase.from('products').delete().eq('id',product.id).eq('store_id',store.id)
    if(error)setNotice(error.message);else{setProducts(prev=>prev.filter(p=>p.id!==product.id));setNotice('Produk dihapus.')}
  }

  const inviteTeamMember = async (event) => {
    event.preventDefault()
    if (membership?.role !== 'owner') { setNotice('Hanya Owner yang dapat mendaftarkan karyawan.'); return }
    const form = new FormData(event.currentTarget)
    setTeamSaving(true)
    const {error} = await supabase.rpc('invite_store_member', {p_store_id:store.id,p_email:String(form.get('email')||'').trim(),p_full_name:String(form.get('full_name')||'').trim(),p_role:String(form.get('role')||'cashier')})
    setTeamSaving(false)
    if (error) { setNotice(error.message); return }
    event.currentTarget.reset()
    setNotice('Undangan dibuat. Karyawan dapat membuat akun dengan email yang diundang, atau masuk jika sudah memiliki akun.')
    await loadWorkspace()
  }

  const saveTeamMemberRole = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const {error} = await supabase.rpc('manage_store_member', {p_member_id:String(form.get('member_id')),p_role:String(form.get('role')),p_is_active:form.get('is_active')==='true'})
    if (error) { setNotice(error.message); return }
    setNotice('Jabatan karyawan diperbarui.')
    await loadWorkspace()
  }

  const toggleTeamMember = async (member) => {
    const nextActive = !member.is_active
    if (!confirm((nextActive?'Aktifkan kembali ':'Nonaktifkan ')+(member.full_name||member.email||'akun karyawan')+'?')) return
    const {error} = await supabase.rpc('manage_store_member', {p_member_id:member.id,p_role:member.role==='admin'?'admin':'cashier',p_is_active:nextActive})
    if (error) { setNotice(error.message); return }
    setNotice(nextActive?'Akun karyawan diaktifkan kembali.':'Akses karyawan dinonaktifkan.')
    await loadWorkspace()
  }

  const saveStoreSettings = async (event) => {
    event.preventDefault();setSavingSettings(true)
    const form=new FormData(event.currentTarget)
    const next={store_id:store.id,store_name:String(form.get('store_name')||'NexaPos Store'),address:String(form.get('address')||''),phone:String(form.get('phone')||''),receipt_footer:String(form.get('receipt_footer')||''),queue_prefix:String(form.get('queue_prefix')||'A').slice(0,3).toUpperCase(),currency:'IDR',updated_at:new Date().toISOString()}
    const {error}=await supabase.from('store_settings').upsert(next)
    setSavingSettings(false)
    if(error)setNotice(error.message);else{setSettings(next);setNotice('Pengaturan disimpan.')}
  }

  const printReceipt = () => { if(receipt)window.print() }
  const nav = [
    {section:'WORKSPACE',items:[['dashboard','Ringkasan',LayoutDashboard],['pos','Kasir / POS',ShoppingCart],['products','Produk & stok',Package],['queue','Sistem antrian',Ticket]]},
    {section:'ANALYTICS',items:[['reports','Laporan penjualan',BarChart3]]},
    {section:'PREFERENCES',items:[['settings','Pengaturan toko',Settings]]},
    {section:'MANAGEMENT',items:membership?.role==='owner'?[['team','Karyawan & akses',Users]]:[]}
  ]

  if(!authReady || (session && !adminCheckReady))return <div className="loading-screen"><span className="spinner spinner-large"/><span>Menyiapkan NexaPos…</span></div>
  if(!session)return <AuthScreen/>
  if(isSuperAdmin)return <SuperAdminScreen session={session} onSignOut={()=>supabase.auth.signOut()}/>
  if(!store)return <div className="loading-screen"><span className="spinner spinner-large"/><p>{notice||'Akun ini belum terhubung ke toko. Minta Owner atau Super Admin mengirim undangan.'}</p><button className="btn btn-ghost" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  const effectiveStoreStatus = store.status === 'active' && store.expires_at && new Date(store.expires_at) <= new Date() ? 'expired' : (store.status || 'active')
  if(effectiveStoreStatus !== 'active') return <TenantLockedScreen store={store} status={effectiveStoreStatus} onSignOut={()=>supabase.auth.signOut()}/>

  const titleMap={dashboard:'Ringkasan',pos:'Kasir / POS',products:'Produk & stok',queue:'Sistem antrian',reports:'Laporan penjualan',settings:'Pengaturan toko'}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      <div className="store-switch"><span className="store-avatar"><Store size={17}/></span><span className="store-copy">{memberships.length>1?<select className="store-select" aria-label="Pilih toko aktif" value={store.id} onChange={e=>{setSelectedStoreId(e.target.value);setStore(null);setMembership(null);setSettings(null);setProducts([]);setOrders([]);setQueue([]);setCart([]);setReceipt(null);setNotice('')}}>{memberships.map(m=><option key={m.store_id} value={m.store_id}>{m.store_name}</option>)}</select>:<strong>{settings?.store_name||store.name}</strong>}<small>{memberships.length>1?'Ganti workspace':'Workspace aktif'}</small></span>{memberships.length===1&&<ChevronDown size={15}/>}</div>
      <nav className="side-nav">{nav.filter(group=>group.items.length).map(group=><div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([id,label,Icon])=><button key={id} className={`nav-link ${page===id?'nav-active':''}`} onClick={()=>{setPage(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='queue'&&waitingQueue.length>0&&<em>{waitingQueue.length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><Headphones size={17}/></span><strong>Butuh bantuan?</strong><small>Kelola bisnis dengan lebih mudah.</small><button onClick={()=>setNotice('Pusat bantuan NexaPos akan tersedia pada rilis berikutnya.')}>Pusat bantuan <ArrowRight size={13}/></button></div><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email.split('@')[0]}</strong><small>{membership.role}</small></span><button className="icon-button" title="Keluar" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Tutup menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div><div className="breadcrumb">Workspace <span>/</span> <strong>{titleMap[page]}</strong></div><div className="topbar-date">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div><div className="topbar-actions"><span className="live-status"><i/> LIVE SYNC</span><button className="icon-button refresh-btn" title="Refresh data" onClick={loadWorkspace}><RefreshCw size={17}/></button><span className="top-avatar">{initial(session.user.email)}</span></div></header>
      {notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      <div className="page-content">
        {page==='dashboard'&&<section className="page-section">
          <div className="page-heading"><div><span className="eyebrow muted">OVERVIEW / TODAY</span><h1>Selamat datang kembali <span className="wave">✦</span></h1><p>Berikut gambaran aktivitas toko Anda hari ini.</p></div><button className="btn btn-primary" onClick={()=>setPage('pos')}><Plus size={17}/> Transaksi baru</button></div>
          <div className="welcome-banner"><div className="banner-copy"><span className="banner-label"><Activity size={14}/> NEXAPOS INSIGHTS</span><h2>Semua berjalan dalam<br/><span>satu kendali.</span></h2><p>Pantau penjualan, kelola produk, dan panggil antrian tanpa berpindah sistem.</p><button className="banner-button" onClick={()=>setPage('reports')}>Lihat laporan <ArrowRight size={15}/></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><div className="art-card-head"><span/><span/><span/></div><div className="art-chart"><i/><i/><i/><i/><i/><i/><i/></div><div className="art-card-foot"><b/><b/><b/></div></div><div className="floating-chip chip-sales"><TrendingUp size={15}/><span><small>Penjualan hari ini</small><b>{money(todaysSales)}</b></span></div><div className="floating-chip chip-queue"><Ticket size={16}/><span><small>Antrian menunggu</small><b>{waitingQueue.length} pelanggan</b></span></div></div></div>
          <div className="section-title-row"><div><h2>Performa hari ini</h2><p>Ringkasan operasional toko</p></div><span className="date-pill"><Clock3 size={14}/> {today()}</span></div>
          <div className="stats-grid"><StatCard icon={CircleDollarSign} label="Total penjualan" value={money(todaysSales)} meta={todaysOrders.length+' transaksi hari ini'} tone="violet"/><StatCard icon={ShoppingBag} label="Transaksi" value={todaysOrders.length} meta="Transaksi tercatat hari ini" tone="blue"/><StatCard icon={Boxes} label="Produk aktif" value={products.filter(p=>p.is_active).length} meta={products.filter(p=>p.stock<=5).length+' stok menipis'} tone="orange"/><StatCard icon={Ticket} label="Antrian menunggu" value={waitingQueue.length} meta={activeQueue.length+' sedang dilayani'} tone="green"/></div>
          <div className="dashboard-grid"><div className="panel sales-panel"><div className="panel-head"><div><h3>Transaksi terbaru</h3><p>Aktivitas penjualan terakhir</p></div><button className="text-button" onClick={()=>setPage('reports')}>Lihat semua <ArrowRight size={14}/></button></div>{orders.length===0?<EmptyState icon={FileText} title="Belum ada transaksi" text="Transaksi pertama Anda akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Waktu</th><th>Pembayaran</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0,5).map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{shortTime(o.created_at)}</td><td><span className="payment-tag">{o.payment_method}</span></td><td className="strong">{money(o.total)}</td><td><span className="status-pill status-paid">{o.status==='paid'?'Berhasil':o.status}</span></td></tr>)}</tbody></table></div>}</div><div className="panel queue-panel"><div className="panel-head"><div><h3>Antrian berjalan</h3><p>Pantauan layanan real-time</p></div><button className="icon-button" onClick={()=>setPage('queue')}><ArrowRight size={16}/></button></div><div className="queue-mini-stats"><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div><div><small>Dipanggil</small><strong>{activeQueue.length}</strong></div></div>{queue.filter(t=>t.status!=='done'&&t.status!=='skipped').slice(0,4).map(t=><div className="queue-mini-row" key={t.id}><span className="queue-number">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><span className="queue-mini-name">{t.customer_name||'Pelanggan'}</span><span className={`status-pill ${t.status==='waiting'?'status-waiting':'status-serving'}`}>{t.status==='waiting'?'Menunggu':'Dipanggil'}</span></div>)}{queue.length===0&&<EmptyState icon={Ticket} title="Belum ada antrian" text="Antrian baru akan muncul otomatis."/>}</div></div>
        </section>}

        {page==='pos'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SALES / CHECKOUT</span><h1>Kasir <span className="heading-accent">POS.</span></h1><p>Pilih produk, proses pembayaran, dan cetak struk.</p></div><span className="date-pill"><i className="live-dot"/> Kasir aktif</span></div><div className="pos-layout"><div className="pos-catalog"><div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, SKU, barcode…"/></div><button className="icon-button" onClick={loadWorkspace} title="Refresh produk"><RefreshCw size={16}/></button></div><div className="category-pills">{categories.map(c=><button key={c} className={category===c?'category-active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{visibleProducts.map(p=><button key={p.id} className="product-tile" disabled={p.stock<=0} onClick={()=>addToCart(p)}><span className="product-tile-icon"><Package size={21}/></span><span className="product-tile-name">{p.name}</span><span className="product-tile-bottom"><strong>{money(p.price)}</strong><small>Stok {p.stock}</small></span><span className="product-add"><Plus size={14}/></span></button>)}</div>{visibleProducts.length===0&&<EmptyState icon={Package} title="Produk tidak ditemukan" text="Coba kata kunci lain atau tambahkan produk baru." action={isManager?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}</div><aside className="cart-panel"><div className="cart-head"><div><h3><ShoppingCart size={18}/> Keranjang</h3><p>{cart.reduce((s,i)=>s+i.quantity,0)} item dipilih</p></div><button className="text-button" onClick={()=>setCart([])} disabled={!cart.length}>Kosongkan</button></div><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.id}><div className="cart-item-main"><strong>{item.name}</strong><small>{money(item.price)} / item</small><div className="quantity-control"><button onClick={()=>changeQty(item.id,-1)}><Minus size={12}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.id,1)} disabled={item.quantity>=item.stock}><Plus size={12}/></button></div></div><div className="cart-item-side"><strong>{money(item.price*item.quantity)}</strong><button className="icon-button danger-icon" onClick={()=>removeCartItem(item.id)}><Trash2 size={14}/></button></div></div>)}{cart.length===0&&<EmptyState icon={ShoppingCart} title="Keranjang masih kosong" text="Pilih produk untuk memulai transaksi."/>}</div><div className="checkout-fields"><label>Nama pelanggan <span>Opsional</span></label><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Untuk nomor antrian"/><label>Diskon (Rp)</label><input className="text-input" type="number" min="0" max={subtotal} value={discount} onChange={e=>setDiscount(e.target.value)}/><label>Metode pembayaran</label><div className="payment-options">{[['cash','Tunai',Wallet],['qris','QRIS',QrCode],['transfer','Transfer',CreditCard]].map(([v,l,I])=><button key={v} className={payMethod===v?'payment-active':''} onClick={()=>setPayMethod(v)}><I size={15}/>{l}</button>)}</div>{payMethod==='cash'&&<><label>Uang diterima (Rp)</label><input className="text-input" type="number" min={total} value={paidAmount} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(total)}/></>}</div><div className="cart-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Diskon</span><strong className="discount-value">− {money(safeDiscount)}</strong></div><div className="grand-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>{payMethod==='cash'&&Number(paidAmount)>=total&&total>0&&<div><span>Kembalian</span><strong>{money(Number(paidAmount)-total)}</strong></div>}</div><button className="btn btn-primary btn-wide checkout-button" disabled={!cart.length||queueBusy} onClick={checkout}>{queueBusy?<span className="spinner"/>:<Check size={17}/>} Proses pembayaran <ArrowRight size={16}/></button><div className="cart-note"><ShieldCheck size={13}/> Transaksi aman tersimpan di cloud</div></aside></div></section>}

        {page==='products'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">INVENTORY / CATALOG</span><h1>Produk <span className="heading-accent">& stok.</span></h1><p>Kelola katalog, harga jual, barcode, dan ketersediaan stok.</p></div>{isManager&&<button className="btn btn-primary" onClick={()=>setProductModal({})}><Plus size={17}/> Tambah produk</button>}</div><div className="product-toolbar panel"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari produk, SKU, barcode…"/></div><span className="result-count">{products.length} produk terdaftar</span></div><div className="panel inventory-panel"><div className="table-wrap"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Status</th>{isManager&&<th>Aksi</th>}</tr></thead><tbody>{products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search)).map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-cell-icon"><Package size={17}/></span><strong>{p.name}</strong></div></td><td className="muted-cell">{p.sku||p.barcode||'—'}</td><td><span className="category-tag">{p.category||'Umum'}</span></td><td className="strong">{money(p.price)}</td><td><span className={`stock-count ${p.stock<=5?'stock-low':''}`}>{p.stock} unit</span></td><td><span className={`status-pill ${p.is_active?'status-paid':'status-inactive'}`}>{p.is_active?'Aktif':'Nonaktif'}</span></td>{isManager&&<td><div className="row-actions"><button className="icon-button" title="Edit produk" onClick={()=>setProductModal(p)}><Settings size={15}/></button><button className="icon-button danger-icon" title="Hapus produk" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>{products.length===0&&<EmptyState icon={Package} title="Katalog masih kosong" text="Tambahkan produk pertama untuk mulai berjualan." action={isManager?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}</div></div>{!isManager&&<p className="permission-note"><ShieldCheck size={14}/> Hanya admin/manager yang dapat menambah, mengedit, atau menghapus produk.</p>}</section>}

        {page==='queue'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SERVICE / QUEUE MANAGEMENT</span><h1>Sistem <span className="heading-accent">antrian.</span></h1><p>Nomor otomatis dan status tersinkron langsung ke semua perangkat.</p></div><button className="btn btn-outline" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={17}/> Buka layar TV</button></div><div className="queue-overview"><div className="queue-feature"><div className="queue-feature-head"><span className="banner-label"><span className="pulse-dot"/> LIVE QUEUE</span><span className="queue-today">{queue.length} tiket hari ini</span></div><div className="queue-feature-number">{activeQueue[0]?((settings?.queue_prefix||'A')+String(activeQueue[0].queue_number).padStart(3,'0')):'—'}</div><div className="queue-feature-label">{activeQueue[0]?'Sedang dipanggil':'Belum ada antrian dipanggil'}</div><div className="queue-feature-bottom"><span><i className="live-dot"/> Sinkron aktif</span><button onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}>Mode layar penuh <ArrowRight size={14}/></button></div></div><div className="queue-side-stats"><div className="queue-stat-card"><span className="stat-icon tone-orange"><Clock3 size={18}/></span><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-green"><Headphones size={18}/></span><div><small>Dipanggil / dilayani</small><strong>{activeQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-blue"><CheckCircle2 size={18}/></span><div><small>Selesai</small><strong>{queue.filter(t=>t.status==='done').length}</strong></div></div></div></div><div className="queue-tools panel"><div><h3>Ambil nomor antrian</h3><p>Buat tiket manual untuk pelanggan tanpa transaksi.</p></div><div className="queue-create-form"><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama pelanggan (opsional)"/><button className="btn btn-primary" disabled={queueBusy} onClick={createTicket}><Plus size={16}/> Buat nomor</button></div></div><div className="panel queue-list-panel"><div className="panel-head"><div><h3>Daftar antrian hari ini</h3><p>Kelola status setiap pelanggan</p></div><button className="icon-button" onClick={loadWorkspace}><RefreshCw size={16}/></button></div>{queue.length===0?<EmptyState icon={Ticket} title="Belum ada antrian" text="Nomor akan tampil di sini saat dibuat."/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Pelanggan</th><th>Waktu</th><th>Loket</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{queue.map(t=><tr key={t.id}><td><span className="queue-number large">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span></td><td className="strong">{t.customer_name||'Pelanggan'}</td><td>{shortTime(t.created_at)}</td><td>{t.counter_label||'Kasir 1'}</td><td><span className={`status-pill ${t.status==='waiting'?'status-waiting':t.status==='done'?'status-paid':t.status==='skipped'?'status-inactive':'status-serving'}`}>{({waiting:'Menunggu',called:'Dipanggil',serving:'Dilayani',done:'Selesai',skipped:'Dilewati'})[t.status]}</span></td><td><div className="row-actions">{t.status==='waiting'&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'called')}><Bell size={13}/> Panggil</button>}{t.status==='called'&&<button className="btn btn-small btn-outline" onClick={()=>updateTicket(t,'serving')}>Layani</button>}{['called','serving'].includes(t.status)&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'done')}><Check size={13}/> Selesai</button>}{t.status==='waiting'&&<button className="icon-button" title="Lewati" onClick={()=>updateTicket(t,'skipped')}><SkipForward size={15}/></button>}{t.status!=='waiting'&&t.status!=='done'&&t.status!=='skipped'&&<button className="icon-button" title="Panggil ulang" onClick={()=>updateTicket(t,'called')}><RefreshCw size={15}/></button>}</div></td></tr>)}</tbody></table></div>}</div></section>}

        {page==='reports'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">ANALYTICS / SALES</span><h1>Laporan <span className="heading-accent">penjualan.</span></h1><p>Ringkasan transaksi yang tersimpan di database.</p></div><button className="btn btn-outline" onClick={()=>{const rows=[['No Struk','Tanggal','Pembayaran','Subtotal','Diskon','Total','Status'],...orders.map(o=>[o.receipt_number,o.created_at,o.payment_method,o.subtotal,o.discount,o.total,o.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='nexapos-laporan.csv';a.click();URL.revokeObjectURL(url)}}><ArrowDownRight size={16}/> Ekspor CSV</button></div><div className="stats-grid"><StatCard icon={CircleDollarSign} label="Penjualan hari ini" value={money(todaysSales)} meta={today()} tone="violet"/><StatCard icon={FileText} label="Transaksi hari ini" value={todaysOrders.length} meta="Transaksi tersimpan" tone="blue"/><StatCard icon={TrendingUp} label="Rata-rata transaksi" value={money(todaysOrders.length?todaysSales/todaysOrders.length:0)} meta="Nilai rata-rata" tone="green"/><StatCard icon={Wallet} label="Total historis" value={money(orders.filter(o=>o.status==='paid').reduce((s,o)=>s+Number(o.total),0))} meta="Dari 100 transaksi terakhir" tone="orange"/></div><div className="panel report-panel"><div className="panel-head"><div><h3>Riwayat transaksi</h3><p>100 transaksi terbaru</p></div><span className="result-count">{orders.length} catatan</span></div><div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Tanggal</th><th>Metode</th><th>Subtotal</th><th>Diskon</th><th>Total</th><th>Status</th><th>Struk</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{new Date(o.created_at).toLocaleString('id-ID')}</td><td><span className="payment-tag">{o.payment_method}</span></td><td>{money(o.subtotal)}</td><td>{money(o.discount)}</td><td className="strong">{money(o.total)}</td><td><span className="status-pill status-paid">{o.status}</span></td><td><button className="icon-button" onClick={async()=>{const {data}=await supabase.from('order_items').select('*').eq('order_id',o.id);setReceipt({order:o,items:data||[],ticket:null});setTimeout(()=>window.print(),100)}} title="Cetak struk"><Printer size={15}/></button></td></tr>)}</tbody></table></div>{orders.length===0&&<EmptyState icon={FileText} title="Belum ada laporan" text="Riwayat akan muncul setelah transaksi pertama."/>}</div></section>}

        {page==='team'&&membership.role==='owner'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">TEAM / ACCESS CONTROL</span><h1>Karyawan <span className="heading-accent">& akses.</span></h1><p>Undang akun baru dan atur jabatan khusus untuk toko ini.</p></div><span className="role-chip"><ShieldCheck size={14}/> Owner</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={inviteTeamMember}><div className="panel-head"><div><h3><UserPlus size={17}/> Daftarkan karyawan</h3><p>Karyawan harus memakai email yang diundang.</p></div></div><label>Nama karyawan</label><input className="text-input" name="full_name" placeholder="Nama lengkap" required/><label>Email akun</label><input className="text-input" type="email" name="email" placeholder="karyawan@email.com" required/><label>Jabatan di toko</label><select className="text-input" name="role" defaultValue="cashier"><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-primary" disabled={teamSaving}>{teamSaving?<span className="spinner"/>:<UserPlus size={16}/>} Buat undangan</button><p className="permission-note">Undangan berlaku 30 hari. Akun tidak mendapatkan akses ke tenant lain.</p></form><div className="panel"><div className="panel-head"><div><h3><Users size={17}/> Anggota toko</h3><p>{teamMembers.length} akun terdaftar</p></div></div>{teamMembers.length===0?<EmptyState icon={Users} title="Belum ada karyawan" text="Akun Owner akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>Nama / email</th><th>Jabatan</th><th>Akses</th><th>Bergabung</th><th>Kelola</th></tr></thead><tbody>{teamMembers.map(m=><tr key={m.id}><td><strong>{m.full_name||m.email||'Akun toko'}</strong><br/><small>{m.email||m.user_id}</small></td><td><span className="status-pill status-serving">{m.role==='owner'?'Owner':m.role==='admin'?'Admin':m.role==='manager'?'Manager':'Kasir'}</span></td><td><span className={'status-pill '+(m.is_active?'status-paid':'status-inactive')}>{m.is_active?'Aktif':'Nonaktif'}</span></td><td>{new Date(m.created_at).toLocaleDateString('id-ID')}</td><td>{m.role!=='owner'&&<div className="member-manage-cell"><form className="member-role-form" onSubmit={saveTeamMemberRole}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="is_active" value={String(m.is_active)}/><select className="text-input" name="role" defaultValue={m.role==='admin'?'admin':'cashier'} aria-label={'Jabatan '+(m.email||m.user_id)}><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-small btn-outline">Simpan</button></form><button className={'btn btn-small '+(m.is_active?'btn-outline':'btn-primary')} onClick={()=>toggleTeamMember(m)}>{m.is_active?'Nonaktifkan':'Aktifkan'}</button></div>}</td></tr>)}</tbody></table></div>}</div></div><div className="panel team-invites-panel"><div className="panel-head"><div><h3><Mail size={17}/> Riwayat undangan</h3><p>Undangan aktif dan yang sudah diterima</p></div></div>{teamInvites.length===0?<p className="subtle">Belum ada undangan.</p>:<div className="table-wrap"><table><thead><tr><th>Email</th><th>Jabatan</th><th>Status</th><th>Kedaluwarsa</th></tr></thead><tbody>{teamInvites.map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role==='owner'?'Owner':i.role==='admin'?'Admin':'Kasir'}</td><td><span className={'status-pill '+(i.accepted_at?'status-paid':new Date(i.expires_at)<new Date()?'status-inactive':'status-waiting')}>{i.accepted_at?'Diterima':new Date(i.expires_at)<new Date()?'Kedaluwarsa':'Menunggu'}</span></td><td>{new Date(i.expires_at).toLocaleDateString('id-ID')}</td></tr>)}</tbody></table></div>}</div></section>}

        {page==='settings'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">CONFIGURATION / STORE</span><h1>Pengaturan <span className="heading-accent">toko.</span></h1><p>Atur identitas toko, struk thermal, dan format antrian.</p></div><span className="role-chip"><ShieldCheck size={14}/>{membership.role}</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={saveStoreSettings}><div className="panel-head"><div><h3><Store size={17}/> Profil toko</h3><p>Informasi yang tampil di struk</p></div></div><label>Nama toko</label><input className="text-input" name="store_name" defaultValue={settings?.store_name||store.name} required/><label>Alamat toko</label><textarea className="text-input" name="address" defaultValue={settings?.address||''} rows="3" placeholder="Alamat untuk dicetak di struk"/><label>Nomor telepon</label><input className="text-input" name="phone" defaultValue={settings?.phone||''} placeholder="08xx xxxx xxxx"/><label>Footer struk</label><input className="text-input" name="receipt_footer" defaultValue={settings?.receipt_footer||'Terima kasih telah berbelanja'}/><label>Prefix antrian</label><input className="text-input prefix-input" name="queue_prefix" defaultValue={settings?.queue_prefix||'A'} maxLength="3"/><button className="btn btn-primary" disabled={savingSettings||!isManager}>{savingSettings?<span className="spinner"/>:<Check size={16}/>} Simpan pengaturan</button>{!isManager&&<p className="permission-note">Hanya admin/manager yang dapat mengubah pengaturan.</p>}</form><div className="settings-aside"><div className="panel settings-info"><span className="settings-info-icon"><Printer size={20}/></span><h3>Printer thermal</h3><p>Struk menggunakan layout 80mm. Hubungkan printer ke perangkat kasir, lalu gunakan dialog cetak browser. Printer Bluetooth tertentu memerlukan aplikasi/driver pendamping.</p><div className="info-line"><CheckCircle2 size={15}/> Layout struk 80mm</div><div className="info-line"><CheckCircle2 size={15}/> Bisa cetak dari Chrome</div></div><div className="panel settings-info"><span className="settings-info-icon blue-info"><Monitor size={20}/></span><h3>Layar antrian TV</h3><p>Buka layar TV dari menu antrian di browser TV. Status diperbarui otomatis saat koneksi internet aktif.</p><button className="btn btn-outline btn-wide" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={16}/> Buka layar TV</button></div><div className="panel account-info"><span className="account-avatar"><UserRound size={19}/></span><div><strong>{session.user.email}</strong><small>Masuk sebagai {membership.role}</small></div><button className="text-button" onClick={()=>supabase.auth.signOut()}>Keluar</button></div></div></div></section>}
      </div>
    </main>
    {productModal&&<div className="modal-backdrop" onClick={()=>setProductModal(null)}><form className="modal-card" onClick={e=>e.stopPropagation()} onSubmit={saveProduct}><div className="modal-head"><div><span className="eyebrow muted">INVENTORY</span><h2>{productModal.id?'Edit produk':'Tambah produk'}</h2></div><button type="button" className="icon-button" onClick={()=>setProductModal(null)}><X size={18}/></button></div><label>Nama produk *</label><input className="text-input" name="name" defaultValue={productModal.name||''} required placeholder="Contoh: Kopi susu"/><div className="form-row"><div><label>SKU</label><input className="text-input" name="sku" defaultValue={productModal.sku||''} placeholder="KOP-001"/></div><div><label>Barcode</label><input className="text-input" name="barcode" defaultValue={productModal.barcode||''} placeholder="Scan / ketik"/></div></div><label>Kategori</label><input className="text-input" name="category" defaultValue={productModal.category||'Umum'} placeholder="Minuman"/><div className="form-row"><div><label>Harga jual (Rp) *</label><input className="text-input" type="number" min="0" step="1" name="price" defaultValue={productModal.price??0} required/></div><div><label>Modal (Rp)</label><input className="text-input" type="number" min="0" step="1" name="cost_price" defaultValue={productModal.cost_price??0}/></div></div><label>Stok tersedia *</label><input className="text-input" type="number" min="0" step="1" name="stock" defaultValue={productModal.stock??0} required/><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={()=>setProductModal(null)}>Batal</button><button className="btn btn-primary"><Check size={16}/> Simpan produk</button></div></form></div>}
    {receipt&&<div className="receipt-modal-layer"><div className="receipt-actions no-print"><span><CheckCircle2 size={16}/> Transaksi tersimpan</span><button className="btn btn-outline" onClick={()=>setReceipt(null)}>Tutup</button><button className="btn btn-primary" onClick={printReceipt}><Printer size={16}/> Cetak struk</button></div><Receipt receipt={receipt} settings={settings}/></div>}
  </div>
}

function StatCard({icon:Icon,label,value,meta,tone}){return <div className="stat-card"><span className={`stat-icon tone-${tone}`}><Icon size={20}/></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-meta">{meta}</span></div>}
function EmptyState({icon:Icon,title,text,action,actionLabel}){return <div className="empty-state"><span className="empty-icon"><Icon size={23}/></span><strong>{title}</strong><p>{text}</p>{action&&<button className="btn btn-outline btn-small" onClick={action}>{actionLabel||'Tambah baru'}</button>}</div>}
function Receipt({receipt,settings}){
  const order=receipt.order||receipt
  const items=receipt.items||[]
  const ticket=receipt.ticket
  return <div className="receipt-print"><div className="receipt-center"><h2>{settings?.store_name||'NexaPos Store'}</h2>{settings?.address&&<p>{settings.address}</p>}{settings?.phone&&<p>{settings.phone}</p>}<div className="receipt-rule"/><p>Struk: {order.receipt_number||'ANTRIAN'}</p><p>{new Date(order.created_at||Date.now()).toLocaleString('id-ID')}</p><p>Kasir: NexaPos</p></div><div className="receipt-rule"/>{items.map(i=><div className="receipt-item" key={i.id}><span>{i.product_name}<br/>{i.quantity} × {money(i.unit_price)}</span><strong>{money(i.line_total)}</strong></div>)}<div className="receipt-rule"/><div className="receipt-total"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>{Number(order.discount)>0&&<div className="receipt-total"><span>Diskon</span><strong>− {money(order.discount)}</strong></div>}<div className="receipt-total receipt-grand"><span>TOTAL</span><strong>{money(order.total)}</strong></div><div className="receipt-total"><span>Pembayaran ({order.payment_method||'—'})</span><strong>{money(order.paid_amount)}</strong></div><div className="receipt-total"><span>Kembalian</span><strong>{money(order.change_amount)}</strong></div>{ticket&&<div className="receipt-queue"><small>NOMOR ANTRIAN</small><strong>{settings?.queue_prefix||'A'}{String(ticket.queue_number).padStart(3,'0')}</strong></div>}<div className="receipt-center receipt-thanks"><p>{settings?.receipt_footer||'Terima kasih telah berbelanja'}</p><small>Powered by NexaPos</small></div></div>
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

function SuperAdminScreen({session,onSignOut}) {
  const [tenants,setTenants]=useState([])
  const [loading,setLoading]=useState(true)
  const [notice,setNotice]=useState('')
  const [registering,setRegistering]=useState(false)
  const [duration,setDuration]=useState('30')
  const [customDays,setCustomDays]=useState('14')
  const load=useCallback(async()=>{
    setLoading(true)
    const {data,error}=await supabase.from('stores').select('id,name,owner_name,owner_email,status,activated_at,expires_at,activation_days,created_at,deleted_at').order('created_at',{ascending:false})
    if(error)setNotice(error.message)
    else setTenants(data||[])
    setLoading(false)
  },[])
  useEffect(()=>{load()},[load])
  const statusOf=(tenant)=>tenant.status==='active'&&tenant.expires_at&&new Date(tenant.expires_at)<=new Date()?'expired':tenant.status
  const activeCount=tenants.filter(t=>statusOf(t)==='active').length
  const expiredCount=tenants.filter(t=>statusOf(t)==='expired').length
  const submitTenant=async(event)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setRegistering(true)
    const {error}=await supabase.rpc('register_store_tenant',{p_store_name:String(form.get('store_name')||'').trim(),p_owner_name:String(form.get('owner_name')||'').trim(),p_owner_email:String(form.get('owner_email')||'').trim()})
    setRegistering(false)
    if(error){setNotice(error.message);return}
    event.currentTarget.reset()
    setNotice('Tenant terdaftar dengan status menunggu aktivasi. Undangan Owner dibuat untuk email tersebut.')
    await load()
  }
  const activate=async(tenant)=>{
    const days=duration==='custom'?Number(customDays):Number(duration)
    if(!Number.isInteger(days)||days<1||days>3650){setNotice('Durasi khusus harus 1–3650 hari.');return}
    const {error}=await supabase.rpc('activate_store_tenant',{p_store_id:tenant.id,p_duration_days:days})
    if(error){setNotice(error.message);return}
    setNotice(tenant.name+' aktif selama '+days+' hari.')
    await load()
  }
  const changeStatus=async(tenant,nextStatus)=>{
    const action=nextStatus==='deleted'?'Arsipkan tenant '+tenant.name+'? Data transaksi tidak akan dihapus.':nextStatus==='suspended'?'Nonaktifkan sementara '+tenant.name+'?':'Kembalikan '+tenant.name+' ke status menunggu aktivasi?'
    if(!confirm(action))return
    const {error}=await supabase.rpc('set_store_tenant_status',{p_store_id:tenant.id,p_status:nextStatus})
    if(error){setNotice(error.message);return}
    setNotice('Status tenant diperbarui.')
    await load()
  }
  return <div className="app-shell super-admin-shell"><aside className="sidebar"><div className="sidebar-brand"><Brand/></div><div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>Super Admin</strong><small>Kontrol seluruh tenant</small></span></div><nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div><div className="nav-link nav-active"><LayoutDashboard size={18}/><span>Dashboard tenant</span></div><div className="nav-link"><Store size={18}/><span>Pendaftaran toko</span></div><div className="nav-link"><CalendarDays size={18}/><span>Aktivasi & masa aktif</span></div></div></nav><div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email}</strong><small>Super Admin</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div></aside><main className="main-area"><header className="topbar"><div className="topbar-left"><div><div className="breadcrumb">Platform <span>/</span> <strong>Super Admin</strong></div><div className="topbar-date">Manajemen tenant dan aktivasi</div></div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> SUPER ADMIN</span><button className="icon-button" onClick={load} title="Muat ulang"><RefreshCw size={17}/></button></div></header>{notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}<div className="page-content"><section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM CONTROL / TENANTS</span><h1>Kontrol <span className="heading-accent">tenant.</span></h1><p>Daftarkan toko, tentukan masa aktif, dan kelola status akses tenant.</p></div><span className="date-pill"><ShieldCheck size={14}/> Akses istimewa</span></div><div className="stats-grid"><StatCard icon={Store} label="Total tenant" value={tenants.length} meta="Tenant terdaftar" tone="violet"/><StatCard icon={CheckCircle2} label="Aktif" value={activeCount} meta="Masa aktivasi berlaku" tone="green"/><StatCard icon={CalendarDays} label="Kedaluwarsa" value={expiredCount} meta="Menunggu reaktivasi" tone="orange"/><StatCard icon={Ban} label="Nonaktif / arsip" value={tenants.filter(t=>['suspended','pending','deleted'].includes(statusOf(t))).length} meta="Tidak dapat beroperasi" tone="blue"/></div><div className="panel super-register-panel"><div className="panel-head"><div><h3><UserPlus size={17}/> Pendaftaran toko baru</h3><p>Akun Owner akan terikat ke email yang didaftarkan. Minta Owner mengaktifkan akun melalui halaman masuk.</p></div></div><form className="tenant-register-form" onSubmit={submitTenant}><div><label>Nama toko</label><input className="text-input" name="store_name" placeholder="Contoh: Toko Sejahtera" required/></div><div><label>Nama pemilik toko</label><input className="text-input" name="owner_name" placeholder="Nama lengkap Owner" required/></div><div><label>Email akun Owner</label><input className="text-input" type="email" name="owner_email" placeholder="owner@tokonya.com" required/></div><button className="btn btn-primary" disabled={registering}>{registering?<span className="spinner"/>:<Plus size={16}/>} Daftarkan tenant</button></form></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Store size={17}/> Daftar tenant</h3><p>Aktivasi 3 hari, 7 hari, 30 hari, atau durasi khusus.</p></div><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Refresh</button></div><div className="activation-toolbar"><label>Durasi aktivasi <select className="text-input" value={duration} onChange={e=>setDuration(e.target.value)}><option value="30">30 hari</option><option value="7">7 hari</option><option value="3">3 hari</option><option value="custom">Custom</option></select></label>{duration==='custom'&&<label>Jumlah hari <input className="text-input" type="number" min="1" max="3650" value={customDays} onChange={e=>setCustomDays(e.target.value)}/></label>}</div>{loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:tenants.length===0?<EmptyState icon={Store} title="Belum ada tenant" text="Daftarkan toko pertama melalui formulir di atas."/>:<div className="table-wrap"><table><thead><tr><th>Toko / Owner</th><th>Status</th><th>Masa aktif</th><th>Aksi</th></tr></thead><tbody>{tenants.map(t=>{const status=statusOf(t);return <tr key={t.id}><td><strong>{t.name}</strong><br/><small>{t.owner_name||'Nama owner belum tersedia'} · {t.owner_email||'Email belum tersedia'}</small><br/><small>Dibuat {new Date(t.created_at).toLocaleDateString('id-ID')}</small></td><td><span className={'status-pill '+(status==='active'?'status-paid':status==='pending'?'status-waiting':status==='expired'?'status-inactive':'status-serving')}>{({active:'Aktif',pending:'Menunggu aktivasi',expired:'Kedaluwarsa',suspended:'Dinonaktifkan',deleted:'Diarsipkan'})[status]||status}</span></td><td>{t.expires_at? <><strong>{new Date(t.expires_at).toLocaleDateString('id-ID')}</strong><br/><small>{status==='active'?'Berakhir '+new Date(t.expires_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'Tanggal berakhir terakhir'}</small></>:'Belum diaktivasi'}</td><td><div className="tenant-actions"><button className="btn btn-small btn-primary" onClick={()=>activate(t)} disabled={status==='deleted'}><CheckCircle2 size={13}/>{status==='active'?'Perpanjang / reaktivasi':'Aktivasi'}</button>{!['suspended','deleted'].includes(status)&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'suspended')}><Ban size={13}/> Nonaktifkan</button>}{status==='suspended'&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'pending')}>Jadikan pending</button>}{status!=='deleted'&&<button className="icon-button danger-icon" title="Arsipkan tenant" onClick={()=>changeStatus(t,'deleted')}><Archive size={15}/></button>}</div></td></tr>})}</tbody></table></div>}</div></section></div></main></div>
}

function QueueScreen(){
  const [session,setSession]=useState(null)
  const [store,setStore]=useState(null)
  const [settings,setSettings]=useState(null)
  const [tickets,setTickets]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])
  const load=useCallback(async()=>{if(!session?.user)return;const {data:members,error}=await supabase.from('store_members').select('store_id').eq('user_id',session.user.id).order('created_at',{ascending:true});if(error||!members?.length){setError(error?.message||'Akun tidak memiliki toko.');return}const requestedStore=new URLSearchParams(window.location.search).get('store');const sid=(members.find(m=>m.store_id===requestedStore)||members[0]).store_id;const [{data:s},{data:cfg},{data:q}]=await Promise.all([supabase.from('stores').select('*').eq('id',sid).single(),supabase.from('store_settings').select('*').eq('store_id',sid).maybeSingle(),supabase.from('queue_tickets').select('*').eq('store_id',sid).eq('service_date',today()).order('queue_number')]);setStore(s);setSettings(cfg);setTickets(q||[])},[session])
  useEffect(()=>{load()},[load])
  useEffect(()=>{if(!store||!supabase)return;const channel=supabase.channel('tv-queue-'+store.id).on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets',filter:'store_id=eq.'+store.id},()=>load()).subscribe();return()=>supabase.removeChannel(channel)},[store,load])
  useEffect(()=>{const t=setInterval(load,15000);return()=>clearInterval(t)},[load])
  const current=tickets.filter(t=>['called','serving'].includes(t.status)).slice(-3).reverse()
  const waiting=tickets.filter(t=>t.status==='waiting').slice(0,6)
  const queueTenantStatus=store?.status==='active'&&store?.expires_at&&new Date(store.expires_at)<=new Date()?'expired':(store?.status||'active')
  if(!session)return <div className="tv-login"><Brand/><h1>Layar antrian NexaPos</h1><p>Masuk dengan akun toko untuk menampilkan antrian.</p><button className="btn btn-primary" onClick={()=>window.location.href=window.location.pathname}>Kembali ke login</button></div>
  if(store&&queueTenantStatus!=='active')return <TenantLockedScreen store={store} status={queueTenantStatus} onSignOut={()=>supabase.auth.signOut()}/>
  return <main className="tv-screen"><header className="tv-header"><Brand/><div><span className="live-status"><i/> LIVE QUEUE</span><div className="tv-store">{settings?.store_name||store?.name||'NexaPos'}</div></div><div className="tv-clock">{new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}<small>{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</small></div></header><div className="tv-content"><section className="tv-current"><span className="eyebrow">NOMOR ANTRIAN DIPANGGIL</span>{current.length?current.map((t,i)=><div className={`tv-call ${i===0?'tv-call-main':''}`} key={t.id}><span>{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><small>{t.counter_label||'Kasir 1'}</small></div>):<div className="tv-empty">Menunggu panggilan berikutnya…</div>}<div className="tv-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></section><section className="tv-next"><div className="tv-next-head"><div><span className="eyebrow">ANTRIAN BERIKUTNYA</span><h2>Mohon bersiap</h2></div><span className="tv-count">{waiting.length} menunggu</span></div>{waiting.length?waiting.map(t=><div className="tv-next-row" key={t.id}><span>{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><small>{t.customer_name||'Pelanggan'}</small></div>):<div className="tv-next-empty">Tidak ada antrian menunggu</div>}</section></div><footer className="tv-footer"><span><i className="live-dot"/> Informasi antrian diperbarui otomatis</span><strong>{settings?.store_name||'NexaPos'} <span>•</span> Terima kasih atas kunjungan Anda</strong></footer>{error&&<div className="tv-error">{error}</div>}</main>
}

export default function Root(){
  const screen=new URLSearchParams(window.location.search).get('screen')
  if(screen==='queue')return <QueueScreen/>
  return <App/>
}
