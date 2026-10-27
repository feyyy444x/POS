import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, KeyRound, BarChart3, Bell, Boxes, Check, CheckCircle2,
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
        if (result.error) setMessage(result.error.message)
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
      setMessage(error.message || 'Terjadi kesalahan. Silakan coba lagi.')
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
      <label>Password {mode === 'login' ? '' : 'baru'}</label><div className="field"><ShieldCheck size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Masukkan password':'Minimal 8 karakter'} required minLength={mode==='login'?1:8} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
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
    if(rpcError){setError(rpcError.message);return}
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

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [adminCheckReady, setAdminCheckReady] = useState(false)
  const [pinStatus, setPinStatus] = useState(null)
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
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamInvites, setTeamInvites] = useState([])
  const [teamSaving, setTeamSaving] = useState(false)
  const [productPage,setProductPage] = useState(1)
  const [posProductPage,setPosProductPage] = useState(1)
  const [queuePage,setQueuePage] = useState(1)
  const [orderPage,setOrderPage] = useState(1)
  const [teamMemberPage,setTeamMemberPage] = useState(1)
  const [teamInvitePage,setTeamInvitePage] = useState(1)
  const listPageSize = 10

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true)})
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, nextSession)=>setSession(nextSession))
    return ()=>subscription.unsubscribe()
  }, [])

  const loadWorkspace = useCallback(async () => {
    if (!session?.user || !supabase) return
    setLoading(true)
    setNotice('')
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
    if (memberError) { setNotice(memberError.message || 'Koneksi belum siap saat memuat keanggotaan. Periksa internet lalu coba lagi.'); setLoading(false); return }
    if (!resolvedMembers.length) {
      setMemberships([])
      setMembership(null)
      setStore(null)
      setNotice('Akun belum memiliki toko. Jika Anda baru saja login atau menerima undangan, coba sebentar lagi.')
      setLoading(false)
      return
    }
    const {data: storeRows, error: storesError} = await supabase.from('stores').select('id,name').in('id',resolvedMembers.map(m=>m.store_id))
    if (storesError) { setNotice(storesError.message); setLoading(false); return }
    const {data: settingRows} = await supabase.from('store_settings').select('store_id,store_name').in('store_id',resolvedMembers.map(m=>m.store_id))
    const availableMemberships = resolvedMembers.map(m=>({...m,store_name:settingRows?.find(s=>s.store_id===m.store_id)?.store_name||storeRows?.find(s=>s.id===m.store_id)?.name||'Toko'}))
    setMemberships(availableMemberships)
    const member = availableMemberships.find(m=>m.store_id===selectedStoreId) || availableMemberships[0]
    if (selectedStoreId !== member.store_id) setSelectedStoreId(member.store_id)
    setMembership(member)
    const [{data: storeData},{data: settingData},{data: productData},{data: orderData},{data: queueData}] = await Promise.all([
      supabase.from('stores').select('*').eq('id',member.store_id).single(),
      supabase.from('store_settings').select('*').eq('store_id',member.store_id).maybeSingle(),
      supabase.from('products').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}),
      supabase.from('orders').select('*').eq('store_id',member.store_id).order('created_at',{ascending:false}),
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

  useEffect(()=>{if(!session){setPinStatus(null);return}let cancelled=false;setPinStatus(null);supabase.rpc('get_my_pin_status').then(({data,error})=>{if(cancelled)return;if(error)setPinStatus({error:error.message});else setPinStatus(data?.[0]||{has_pin:false,is_verified:false})});return()=>{cancelled=true}},[session?.user?.id,session?.access_token])

  useEffect(()=>{setSelectedStoreId('')},[session?.user?.id])

  useEffect(()=>{if(!session)return;loadWorkspace()},[session,loadWorkspace])

  useEffect(()=>{
    if (!session || !membership?.store_id || !supabase) return
    const storeId = membership.store_id
    const refreshOrders = () => supabase.from('orders').select('*').eq('store_id',storeId).order('created_at',{ascending:false}).then(({data,error})=>{if(!error&&data)setOrders(data)})
    const refreshProducts = () => supabase.from('products').select('*').eq('store_id',storeId).order('created_at',{ascending:false}).then(({data,error})=>{if(!error&&data)setProducts(data)})
    const refreshSettings = () => supabase.from('store_settings').select('*').eq('store_id',storeId).maybeSingle().then(({data,error})=>{if(!error&&data)setSettings(data)})
    const refreshTeam = () => loadWorkspace()
    const channel = supabase.channel('nexapos-live-'+storeId)
      .on('postgres_changes',{event:'*',schema:'public',table:'queue_tickets',filter:'store_id=eq.'+storeId},payload=>{
        if(payload.eventType==='DELETE') setQueue(prev=>prev.filter(t=>t.id!==payload.old.id))
        else setQueue(prev=>{const rows=prev.filter(t=>t.id!==payload.new.id);rows.push(payload.new);return rows.sort((a,b)=>a.queue_number-b.queue_number)})
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'products',filter:'store_id=eq.'+storeId},refreshProducts)
      .on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:'store_id=eq.'+storeId},refreshOrders)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings',filter:'store_id=eq.'+storeId},refreshSettings)
      .on('postgres_changes',{event:'*',schema:'public',table:'stores',filter:'id=eq.'+storeId},refreshTeam)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members',filter:'store_id=eq.'+storeId},refreshTeam)
      .on('postgres_changes',{event:'*',schema:'public',table:'store_invites',filter:'store_id=eq.'+storeId},refreshTeam)
      .subscribe()
    // No polling or page-visibility refresh: data updates through Supabase Realtime events.
    return ()=>{
      supabase.removeChannel(channel)
    }
  },[session,membership?.store_id,membership?.role,loadWorkspace])

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
    const activationCode = crypto.randomUUID().replaceAll('-', '')
    setTeamSaving(true)
    const {error} = await supabase.rpc('invite_store_member', {p_store_id:store.id,p_email:String(form.get('email')||'').trim(),p_full_name:String(form.get('full_name')||'').trim(),p_role:String(form.get('role')||'cashier'),p_activation_code:activationCode})
    setTeamSaving(false)
    if (error) { setNotice(error.message); return }
    event.currentTarget.reset()
    setNotice('Undangan dibuat. Kode aktivasi sekali pakai: '+activationCode+'. Salin dan kirimkan secara pribadi kepada karyawan. Kode diperlukan untuk aktivasi.')
    await loadWorkspace()
  }

  const saveTeamMemberRole = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const {error} = await supabase.rpc('owner_update_store_member', {p_member_id:String(form.get('member_id')),p_full_name:String(form.get('full_name')||'').trim(),p_role:String(form.get('role')),p_is_active:form.get('is_active')==='true'})
    if (error) { setNotice(error.message); return }
    setNotice('Nama, role, dan akses karyawan diperbarui.')
    await loadWorkspace()
  }

  const deleteTeamMember = async (member) => {
    if(!confirm('Hapus permanen keanggotaan '+(member.full_name||member.email)+' dari toko ini? Jika akun tidak digunakan tenant lain, akun login juga akan dihapus permanen.'))return
    const {error}=await supabase.rpc('owner_delete_store_member',{p_member_id:member.id})
    if(error){setNotice(error.message);return}
    setNotice('Keanggotaan dihapus permanen.')
    await loadWorkspace()
  }

  const regenerateTeamInviteCode = async (invite) => {
    if(invite.accepted_at){setNotice('Undangan sudah diterima. Buat undangan baru jika karyawan perlu aktivasi ulang.');return}
    if(!confirm('Buat kode aktivasi baru untuk '+invite.email+'? Kode lama akan langsung tidak berlaku dan masa berlaku diperpanjang 30 hari.'))return
    const activationCode=crypto.randomUUID().replaceAll('-','')
    setTeamSaving(true)
    const {error}=await supabase.rpc('owner_regenerate_store_invite',{p_invite_id:invite.id,p_activation_code:activationCode})
    setTeamSaving(false)
    if(error){setNotice(error.message);return}
    await loadWorkspace()
    setNotice('Kode aktivasi baru untuk '+invite.email+': '+activationCode+'. Salin dan kirim secara pribadi kepada karyawan. Kode hanya ditampilkan sekali.')
  }

  const deleteTeamInvite = async (invite) => {
    if(!confirm('Hapus permanen undangan '+invite.email+'?'))return
    const {error}=await supabase.rpc('owner_delete_store_invite',{p_invite_id:invite.id})
    if(error){setNotice(error.message);return}
    setNotice('Undangan dihapus permanen.')
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

  const uploadStoreLogo = async (event) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !store?.id) return
    if (!isManager) { setNotice('Hanya Owner, Admin, atau Manager yang dapat mengubah logo toko.'); return }
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
      setNotice(uploadError.message.includes('Bucket not found') ? 'Penyimpanan logo belum disiapkan. Terapkan migrasi store logo pada database terlebih dahulu.' : uploadError.message)
      return
    }
    const { data: publicData } = supabase.storage.from('store-logos').getPublicUrl(path)
    const next = {
      store_id: store.id,
      store_name: settings?.store_name || store.name || 'NexaPos Store',
      address: settings?.address || '',
      phone: settings?.phone || '',
      receipt_footer: settings?.receipt_footer || 'Terima kasih telah berbelanja',
      queue_prefix: settings?.queue_prefix || 'A',
      currency: settings?.currency || 'IDR',
      logo_url: publicData.publicUrl,
      updated_at: new Date().toISOString(),
    }
    const { error: saveError } = await supabase.from('store_settings').upsert(next)
    if (saveError) {
      await supabase.storage.from('store-logos').remove([path])
      setUploadingLogo(false)
      setNotice(saveError.message.includes('logo_url') ? 'Kolom logo belum tersedia. Terapkan migrasi store logo pada database terlebih dahulu.' : saveError.message)
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
      setNotice(error.message.includes('logo_url') ? 'Kolom logo belum tersedia. Terapkan migrasi store logo pada database terlebih dahulu.' : error.message)
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
    const next={store_id:store.id,store_name:String(form.get('store_name')||'NexaPos Store'),address:String(form.get('address')||''),phone:String(form.get('phone')||''),receipt_footer:String(form.get('receipt_footer')||''),queue_prefix:String(form.get('queue_prefix')||'A').slice(0,3).toUpperCase(),currency:'IDR',logo_url:settings?.logo_url||null,updated_at:new Date().toISOString()}
    const {error}=await supabase.from('store_settings').upsert(next)
    setSavingSettings(false)
    if(error)setNotice(error.message);else{setSettings(next);setNotice('Pengaturan disimpan.')}
  }

  const printReceipt = () => { if(receipt)window.print() }
  const nav = [
    {section:'WORKSPACE',items:[['dashboard','Ringkasan',LayoutDashboard],['pos','Kasir / POS',ShoppingCart],['products','Produk & stok',Package],['queue','Sistem antrian',Ticket]]},
    {section:'ANALYTICS',items:[['reports','Laporan penjualan',BarChart3]]},
    {section:'PREFERENCES',items:[['settings','Pengaturan toko',Settings],['profile','Profil & keamanan',UserRound]]},
    {section:'MANAGEMENT',items:membership?.role==='owner'?[['team','Karyawan & akses',Users]]:[]}
  ]

  if(!authReady || (session && !adminCheckReady))return <div className="loading-screen"><span className="spinner spinner-large"/><span>Menyiapkan NexaPos…</span></div>
  if(!session)return <AuthScreen/>
  if(!pinStatus)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keamanan akun…</span></div>
  if(pinStatus.error)return <div className="loading-screen"><p>Modul keamanan PIN belum siap: {pinStatus.error}</p><p>Terapkan migrasi PIN sebelum memakai versi ini.</p><button className="btn btn-outline" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  if(!pinStatus.has_pin||!pinStatus.is_verified)return <PinGate session={session} status={pinStatus} onReady={setPinStatus} onSignOut={()=>supabase.auth.signOut()}/>
  if(isSuperAdmin)return <SuperAdminScreen session={session} onSignOut={()=>supabase.auth.signOut()}/>
  if(loading&&!store)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keanggotaan toko…</span></div>
  if(!store)return <div className="loading-screen"><span className="spinner spinner-large"/><p>{notice||'Akun ini belum terhubung ke toko. Minta Owner atau Super Admin mengirim undangan.'}</p><button className="btn btn-ghost" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  const effectiveStoreStatus = store.status === 'active' && store.expires_at && new Date(store.expires_at) <= new Date() ? 'expired' : (store.status || 'active')
  if(effectiveStoreStatus !== 'active') return <TenantLockedScreen store={store} status={effectiveStoreStatus} onSignOut={()=>supabase.auth.signOut()}/>

  const titleMap={dashboard:'Ringkasan',pos:'Kasir / POS',products:'Produk & stok',queue:'Sistem antrian',reports:'Laporan penjualan',settings:'Pengaturan toko',profile:'Profil & keamanan'}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      <div className="store-switch"><span className="store-avatar"><Store size={17}/></span><span className="store-copy">{memberships.length>1?<select className="store-select" aria-label="Pilih toko aktif" value={store.id} onChange={e=>{setSelectedStoreId(e.target.value);setStore(null);setMembership(null);setSettings(null);setProducts([]);setOrders([]);setQueue([]);setCart([]);setReceipt(null);setNotice('')}}>{memberships.map(m=><option key={m.store_id} value={m.store_id}>{m.store_name}</option>)}</select>:<strong>{settings?.store_name||store.name}</strong>}<small>{memberships.length>1?'Ganti workspace':'Workspace aktif'}</small></span>{memberships.length===1&&<ChevronDown size={15}/>}</div>
      <nav className="side-nav">{nav.filter(group=>group.items.length).map(group=><div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([id,label,Icon])=><button key={id} className={`nav-link ${page===id?'nav-active':''}`} onClick={()=>{setPage(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='queue'&&waitingQueue.length>0&&<em>{waitingQueue.length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><span className="support-icon"><Headphones size={17}/></span><strong>Butuh bantuan?</strong><small>Kelola bisnis dengan lebih mudah.</small><button onClick={()=>setNotice('Pusat bantuan NexaPos akan tersedia pada rilis berikutnya.')}>Pusat bantuan <ArrowRight size={13}/></button></div><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email.split('@')[0]}</strong><small>{membership.role}</small></span><button className="icon-button" title="Keluar" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Tutup menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Buka menu"><Menu size={20}/></button><div><div className="breadcrumb">Workspace <span>/</span> <strong>{titleMap[page]}</strong></div><div className="topbar-date">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div><div className="topbar-actions"><span className="live-status"><i/> LIVE SYNC</span><button className="icon-button refresh-btn" title="Refresh data" onClick={loadWorkspace}><RefreshCw size={17}/></button><span className="top-avatar">{initial(session.user.email)}</span></div></header>
      {notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      <div className="page-content">
        {page==='dashboard'&&<section className="page-section">
          <div className="page-heading"><div><span className="eyebrow muted">OVERVIEW / TODAY</span><h1>Selamat datang kembali <span className="wave">✦</span></h1><p>Berikut gambaran aktivitas toko Anda hari ini.</p></div><button className="btn btn-primary" onClick={()=>setPage('pos')}><Plus size={17}/> Transaksi baru</button></div>
          <div className="welcome-banner"><div className="banner-copy"><span className="banner-label"><Activity size={14}/> NEXAPOS INSIGHTS</span><h2>Semua berjalan dalam<br/><span>satu kendali.</span></h2><p>Pantau penjualan, kelola produk, dan panggil antrian tanpa berpindah sistem.</p><button className="banner-button" onClick={()=>setPage('reports')}>Lihat laporan <ArrowRight size={15}/></button></div><div className="banner-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><div className="art-card-head"><span/><span/><span/></div><div className="art-chart"><i/><i/><i/><i/><i/><i/><i/></div><div className="art-card-foot"><b/><b/><b/></div></div><div className="floating-chip chip-sales"><TrendingUp size={15}/><span><small>Penjualan hari ini</small><b>{money(todaysSales)}</b></span></div><div className="floating-chip chip-queue"><Ticket size={16}/><span><small>Antrian menunggu</small><b>{waitingQueue.length} pelanggan</b></span></div></div></div>
          <div className="section-title-row"><div><h2>Performa hari ini</h2><p>Ringkasan operasional toko</p></div><span className="date-pill"><Clock3 size={14}/> {today()}</span></div>
          <div className="stats-grid"><StatCard icon={CircleDollarSign} label="Total penjualan" value={money(todaysSales)} meta={todaysOrders.length+' transaksi hari ini'} tone="violet"/><StatCard icon={ShoppingBag} label="Transaksi" value={todaysOrders.length} meta="Transaksi tercatat hari ini" tone="blue"/><StatCard icon={Boxes} label="Produk aktif" value={products.filter(p=>p.is_active).length} meta={products.filter(p=>p.stock<=5).length+' stok menipis'} tone="orange"/><StatCard icon={Ticket} label="Antrian menunggu" value={waitingQueue.length} meta={activeQueue.length+' sedang dilayani'} tone="green"/></div>
          <div className="dashboard-grid"><div className="panel sales-panel"><div className="panel-head"><div><h3>Transaksi terbaru</h3><p>Aktivitas penjualan terakhir</p></div><button className="text-button" onClick={()=>setPage('reports')}>Lihat semua <ArrowRight size={14}/></button></div>{orders.length===0?<EmptyState icon={FileText} title="Belum ada transaksi" text="Transaksi pertama Anda akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Waktu</th><th>Pembayaran</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0,5).map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{shortTime(o.created_at)}</td><td><span className="payment-tag">{o.payment_method}</span></td><td className="strong">{money(o.total)}</td><td><span className="status-pill status-paid">{o.status==='paid'?'Berhasil':o.status}</span></td></tr>)}</tbody></table></div>}</div><div className="panel queue-panel"><div className="panel-head"><div><h3>Antrian berjalan</h3><p>Pantauan layanan real-time</p></div><button className="icon-button" onClick={()=>setPage('queue')}><ArrowRight size={16}/></button></div><div className="queue-mini-stats"><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div><div><small>Dipanggil</small><strong>{activeQueue.length}</strong></div></div>{queue.filter(t=>t.status!=='done'&&t.status!=='skipped').slice(0,4).map(t=><div className="queue-mini-row" key={t.id}><span className="queue-number">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><span className="queue-mini-name">{t.customer_name||'Pelanggan'}</span><span className={`status-pill ${t.status==='waiting'?'status-waiting':'status-serving'}`}>{t.status==='waiting'?'Menunggu':'Dipanggil'}</span></div>)}{queue.length===0&&<EmptyState icon={Ticket} title="Belum ada antrian" text="Antrian baru akan muncul otomatis."/>}</div></div>
        </section>}

        {page==='pos'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SALES / CHECKOUT</span><h1>Kasir <span className="heading-accent">POS.</span></h1><p>Pilih produk, proses pembayaran, dan cetak struk.</p></div><span className="date-pill"><i className="live-dot"/> Kasir aktif</span></div><div className="pos-layout"><div className="pos-catalog"><div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPosProductPage(1);setProductPage(1)}} placeholder="Cari nama, SKU, barcode…"/></div><button className="icon-button" onClick={loadWorkspace} title="Refresh produk"><RefreshCw size={16}/></button></div><div className="category-pills">{categories.map(c=><button key={c} className={category===c?'category-active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{visibleProducts.slice((posProductPage-1)*listPageSize,posProductPage*listPageSize).map(p=><button key={p.id} className="product-tile" disabled={p.stock<=0} onClick={()=>addToCart(p)}><span className="product-tile-icon"><Package size={21}/></span><span className="product-tile-name">{p.name}</span><span className="product-tile-bottom"><strong>{money(p.price)}</strong><small>Stok {p.stock}</small></span><span className="product-add"><Plus size={14}/></span></button>)}</div>{visibleProducts.length===0&&<EmptyState icon={Package} title="Produk tidak ditemukan" text="Coba kata kunci lain atau tambahkan produk baru." action={isManager?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}<Pagination page={posProductPage} total={visibleProducts.length} pageSize={listPageSize} onChange={setPosProductPage}/></div><aside className="cart-panel"><div className="cart-head"><div><h3><ShoppingCart size={18}/> Keranjang</h3><p>{cart.reduce((s,i)=>s+i.quantity,0)} item dipilih</p></div><button className="text-button" onClick={()=>setCart([])} disabled={!cart.length}>Kosongkan</button></div><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.id}><div className="cart-item-main"><strong>{item.name}</strong><small>{money(item.price)} / item</small><div className="quantity-control"><button onClick={()=>changeQty(item.id,-1)}><Minus size={12}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.id,1)} disabled={item.quantity>=item.stock}><Plus size={12}/></button></div></div><div className="cart-item-side"><strong>{money(item.price*item.quantity)}</strong><button className="icon-button danger-icon" onClick={()=>removeCartItem(item.id)}><Trash2 size={14}/></button></div></div>)}{cart.length===0&&<EmptyState icon={ShoppingCart} title="Keranjang masih kosong" text="Pilih produk untuk memulai transaksi."/>}</div><div className="checkout-fields"><label>Nama pelanggan <span>Opsional</span></label><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Untuk nomor antrian"/><label>Diskon (Rp)</label><input className="text-input" type="number" min="0" max={subtotal} value={discount} onChange={e=>setDiscount(e.target.value)}/><label>Metode pembayaran</label><div className="payment-options">{[['cash','Tunai',Wallet],['qris','QRIS',QrCode],['transfer','Transfer',CreditCard]].map(([v,l,I])=><button key={v} className={payMethod===v?'payment-active':''} onClick={()=>setPayMethod(v)}><I size={15}/>{l}</button>)}</div>{payMethod==='cash'&&<><label>Uang diterima (Rp)</label><input className="text-input" type="number" min={total} value={paidAmount} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(total)}/></>}</div><div className="cart-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Diskon</span><strong className="discount-value">− {money(safeDiscount)}</strong></div><div className="grand-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>{payMethod==='cash'&&Number(paidAmount)>=total&&total>0&&<div><span>Kembalian</span><strong>{money(Number(paidAmount)-total)}</strong></div>}</div><button className="btn btn-primary btn-wide checkout-button" disabled={!cart.length||queueBusy} onClick={checkout}>{queueBusy?<span className="spinner"/>:<Check size={17}/>} Proses pembayaran <ArrowRight size={16}/></button><div className="cart-note"><ShieldCheck size={13}/> Transaksi aman tersimpan di cloud</div></aside></div></section>}

        {page==='products'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">INVENTORY / CATALOG</span><h1>Produk <span className="heading-accent">& stok.</span></h1><p>Kelola katalog, harga jual, barcode, dan ketersediaan stok.</p></div>{isManager&&<button className="btn btn-primary" onClick={()=>setProductModal({})}><Plus size={17}/> Tambah produk</button>}</div><div className="product-toolbar panel"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setProductPage(1);setPosProductPage(1)}} placeholder="Cari produk, SKU, barcode…"/></div><span className="result-count">{products.length} produk terdaftar</span></div><div className="panel inventory-panel"><div className="table-wrap"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Status</th>{isManager&&<th>Aksi</th>}</tr></thead><tbody>{products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search)).slice((productPage-1)*listPageSize,productPage*listPageSize).map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-cell-icon"><Package size={17}/></span><strong>{p.name}</strong></div></td><td className="muted-cell">{p.sku||p.barcode||'—'}</td><td><span className="category-tag">{p.category||'Umum'}</span></td><td className="strong">{money(p.price)}</td><td><span className={`stock-count ${p.stock<=5?'stock-low':''}`}>{p.stock} unit</span></td><td><span className={`status-pill ${p.is_active?'status-paid':'status-inactive'}`}>{p.is_active?'Aktif':'Nonaktif'}</span></td>{isManager&&<td><div className="row-actions"><button className="icon-button" title="Edit produk" onClick={()=>setProductModal(p)}><Settings size={15}/></button><button className="icon-button danger-icon" title="Hapus produk" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>{products.length===0&&<EmptyState icon={Package} title="Katalog masih kosong" text="Tambahkan produk pertama untuk mulai berjualan." action={isManager?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}</div><Pagination page={productPage} total={products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search)) .length} pageSize={listPageSize} onChange={setProductPage}/></div>{!isManager&&<p className="permission-note"><ShieldCheck size={14}/> Hanya admin/manager yang dapat menambah, mengedit, atau menghapus produk.</p>}</section>}

        {page==='queue'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SERVICE / QUEUE MANAGEMENT</span><h1>Sistem <span className="heading-accent">antrian.</span></h1><p>Nomor otomatis dan status tersinkron langsung ke semua perangkat.</p></div><button className="btn btn-outline" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={17}/> Buka layar TV</button></div><div className="queue-overview"><div className="queue-feature"><div className="queue-feature-head"><span className="banner-label"><span className="pulse-dot"/> LIVE QUEUE</span><span className="queue-today">{queue.length} tiket hari ini</span></div><div className="queue-feature-number">{activeQueue[0]?((settings?.queue_prefix||'A')+String(activeQueue[0].queue_number).padStart(3,'0')):'—'}</div><div className="queue-feature-label">{activeQueue[0]?'Sedang dipanggil':'Belum ada antrian dipanggil'}</div><div className="queue-feature-bottom"><span><i className="live-dot"/> Sinkron aktif</span><button onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}>Mode layar penuh <ArrowRight size={14}/></button></div></div><div className="queue-side-stats"><div className="queue-stat-card"><span className="stat-icon tone-orange"><Clock3 size={18}/></span><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-green"><Headphones size={18}/></span><div><small>Dipanggil / dilayani</small><strong>{activeQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-blue"><CheckCircle2 size={18}/></span><div><small>Selesai</small><strong>{queue.filter(t=>t.status==='done').length}</strong></div></div></div></div><div className="queue-tools panel"><div><h3>Ambil nomor antrian</h3><p>Buat tiket manual untuk pelanggan tanpa transaksi.</p></div><div className="queue-create-form"><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama pelanggan (opsional)"/><button className="btn btn-primary" disabled={queueBusy} onClick={createTicket}><Plus size={16}/> Buat nomor</button></div></div><div className="panel queue-list-panel"><div className="panel-head"><div><h3>Daftar antrian hari ini</h3><p>Kelola status setiap pelanggan</p></div><button className="icon-button" onClick={loadWorkspace}><RefreshCw size={16}/></button></div>{queue.length===0?<EmptyState icon={Ticket} title="Belum ada antrian" text="Nomor akan tampil di sini saat dibuat."/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Pelanggan</th><th>Waktu</th><th>Loket</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{queue.slice((queuePage-1)*listPageSize,queuePage*listPageSize).map(t=><tr key={t.id}><td><span className="queue-number large">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span></td><td className="strong">{t.customer_name||'Pelanggan'}</td><td>{shortTime(t.created_at)}</td><td>{t.counter_label||'Kasir 1'}</td><td><span className={`status-pill ${t.status==='waiting'?'status-waiting':t.status==='done'?'status-paid':t.status==='skipped'?'status-inactive':'status-serving'}`}>{({waiting:'Menunggu',called:'Dipanggil',serving:'Dilayani',done:'Selesai',skipped:'Dilewati'})[t.status]}</span></td><td><div className="row-actions">{t.status==='waiting'&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'called')}><Bell size={13}/> Panggil</button>}{t.status==='called'&&<button className="btn btn-small btn-outline" onClick={()=>updateTicket(t,'serving')}>Layani</button>}{['called','serving'].includes(t.status)&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'done')}><Check size={13}/> Selesai</button>}{t.status==='waiting'&&<button className="icon-button" title="Lewati" onClick={()=>updateTicket(t,'skipped')}><SkipForward size={15}/></button>}{t.status!=='waiting'&&t.status!=='done'&&t.status!=='skipped'&&<button className="icon-button" title="Panggil ulang" onClick={()=>updateTicket(t,'called')}><RefreshCw size={15}/></button>}</div></td></tr>)}</tbody></table></div>}<Pagination page={queuePage} total={queue.length} pageSize={listPageSize} onChange={setQueuePage}/></div></section>}

        {page==='reports'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">ANALYTICS / SALES</span><h1>Laporan <span className="heading-accent">penjualan.</span></h1><p>Ringkasan transaksi yang tersimpan di database.</p></div><button className="btn btn-outline" onClick={()=>{const rows=[['No Struk','Tanggal','Pembayaran','Subtotal','Diskon','Total','Status'],...orders.map(o=>[o.receipt_number,o.created_at,o.payment_method,o.subtotal,o.discount,o.total,o.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='nexapos-laporan.csv';a.click();URL.revokeObjectURL(url)}}><ArrowDownRight size={16}/> Ekspor CSV</button></div><div className="stats-grid"><StatCard icon={CircleDollarSign} label="Penjualan hari ini" value={money(todaysSales)} meta={today()} tone="violet"/><StatCard icon={FileText} label="Transaksi hari ini" value={todaysOrders.length} meta="Transaksi tersimpan" tone="blue"/><StatCard icon={TrendingUp} label="Rata-rata transaksi" value={money(todaysOrders.length?todaysSales/todaysOrders.length:0)} meta="Nilai rata-rata" tone="green"/><StatCard icon={Wallet} label="Total historis" value={money(orders.filter(o=>o.status==='paid').reduce((s,o)=>s+Number(o.total),0))} meta="Dari 100 transaksi terakhir" tone="orange"/></div><div className="panel report-panel"><div className="panel-head"><div><h3>Riwayat transaksi</h3><p>Riwayat lengkap dengan pagination</p></div><span className="result-count">{orders.length} catatan</span></div><div className="table-wrap"><table><thead><tr><th>No. struk</th><th>Tanggal</th><th>Metode</th><th>Subtotal</th><th>Diskon</th><th>Total</th><th>Status</th><th>Struk</th></tr></thead><tbody>{orders.slice((orderPage-1)*listPageSize,orderPage*listPageSize).map(o=><tr key={o.id}><td className="mono strong">{o.receipt_number}</td><td>{new Date(o.created_at).toLocaleString('id-ID')}</td><td><span className="payment-tag">{o.payment_method}</span></td><td>{money(o.subtotal)}</td><td>{money(o.discount)}</td><td className="strong">{money(o.total)}</td><td><span className="status-pill status-paid">{o.status}</span></td><td><button className="icon-button" onClick={async()=>{const {data}=await supabase.from('order_items').select('*').eq('order_id',o.id);setReceipt({order:o,items:data||[],ticket:null});setTimeout(()=>window.print(),100)}} title="Cetak struk"><Printer size={15}/></button></td></tr>)}</tbody></table></div><Pagination page={orderPage} total={orders.length} pageSize={listPageSize} onChange={setOrderPage}/>{orders.length===0&&<EmptyState icon={FileText} title="Belum ada laporan" text="Riwayat akan muncul setelah transaksi pertama."/>}</div></section>}

        {page==='team'&&membership.role==='owner'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">TEAM / ACCESS CONTROL</span><h1>Karyawan <span className="heading-accent">& akses.</span></h1><p>Undang akun baru dan atur jabatan khusus untuk toko ini.</p></div><span className="role-chip"><ShieldCheck size={14}/> Owner</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={inviteTeamMember}><div className="panel-head"><div><h3><UserPlus size={17}/> Daftarkan karyawan</h3><p>Undangan hanya berlaku untuk email ini. Karyawan harus aktivasi dan membuat password sebelum login.</p></div></div><label>Nama karyawan</label><input className="text-input" name="full_name" placeholder="Nama lengkap" required/><label>Email akun</label><input className="text-input" type="email" name="email" placeholder="karyawan@email.com" required/><label>Jabatan di toko</label><select className="text-input" name="role" defaultValue="cashier"><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-primary" disabled={teamSaving}>{teamSaving?<span className="spinner"/>:<UserPlus size={16}/>} Buat undangan</button><p className="permission-note">Undangan berlaku 30 hari. Akun tidak mendapatkan akses ke tenant lain.</p></form><div className="panel"><div className="panel-head"><div><h3><Users size={17}/> Anggota toko</h3><p>{teamMembers.length} akun terdaftar</p></div></div>{teamMembers.length===0?<EmptyState icon={Users} title="Belum ada karyawan" text="Akun Owner akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>Nama / email</th><th>Jabatan</th><th>Akses</th><th>Bergabung</th><th>Kelola</th></tr></thead><tbody>{teamMembers.slice((teamMemberPage-1)*listPageSize,teamMemberPage*listPageSize).map(m=><tr key={m.id}><td><strong>{m.full_name||m.email||'Akun toko'}</strong><br/><small>{m.email||m.user_id}</small></td><td><span className="status-pill status-serving">{m.role==='owner'?'Owner':m.role==='admin'?'Admin':m.role==='manager'?'Manager':'Kasir'}</span></td><td><span className={'status-pill '+(m.is_active?'status-paid':'status-inactive')}>{m.is_active?'Aktif':'Nonaktif'}</span></td><td>{new Date(m.created_at).toLocaleDateString('id-ID')}</td><td>{m.role!=='owner'&&<div className="member-manage-cell"><form className="member-role-form" onSubmit={saveTeamMemberRole}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="is_active" value={String(m.is_active)}/><input className="text-input member-name-edit" name="full_name" defaultValue={m.full_name||''} aria-label={'Nama '+(m.email||m.user_id)} required minLength={2}/><select className="text-input" name="role" defaultValue={m.role==='admin'?'admin':'cashier'} aria-label={'Jabatan '+(m.email||m.user_id)}><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-small btn-outline">Simpan</button></form><div className="member-manage-actions"><button className={'btn btn-small '+(m.is_active?'btn-outline':'btn-primary')} onClick={()=>toggleTeamMember(m)}>{m.is_active?'Nonaktifkan':'Aktifkan'}</button><button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamMember(m)}><Trash2 size={13}/> Hapus permanen</button></div></div>}</td></tr>)}</tbody></table></div>}<Pagination page={teamMemberPage} total={teamMembers.length} pageSize={listPageSize} onChange={setTeamMemberPage}/></div></div><div className="panel team-invites-panel"><div className="panel-head"><div><h3><Mail size={17}/> Riwayat undangan</h3><p>Undangan aktif dan yang sudah diterima</p></div></div>{teamInvites.length===0?<p className="subtle">Belum ada undangan.</p>:<div className="table-wrap"><table><thead><tr><th>Email</th><th>Jabatan</th><th>Status</th><th>Kedaluwarsa</th><th>Aksi</th></tr></thead><tbody>{teamInvites.slice((teamInvitePage-1)*listPageSize,teamInvitePage*listPageSize).map(i=><tr key={i.id}><td>{i.email}</td><td>{i.role==='owner'?'Owner':i.role==='admin'?'Admin':'Kasir'}</td><td><span className={'status-pill '+(i.accepted_at?'status-paid':new Date(i.expires_at)<new Date()?'status-inactive':'status-waiting')}>{i.accepted_at?'Diterima':new Date(i.expires_at)<new Date()?'Kedaluwarsa':'Menunggu'}</span></td><td>{new Date(i.expires_at).toLocaleDateString('id-ID')}</td><td><div className="member-manage-actions">{!i.accepted_at&&<button className="btn btn-small btn-outline" disabled={teamSaving} onClick={()=>regenerateTeamInviteCode(i)}><KeyRound size={13}/> Buat ulang kode</button>}<button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamInvite(i)}><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div>}<Pagination page={teamInvitePage} total={teamInvites.length} pageSize={listPageSize} onChange={setTeamInvitePage}/></div></section>}

        {page==='profile'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">ACCOUNT / SECURITY</span><h1>Profil <span className="heading-accent">& keamanan.</span></h1><p>Perbarui nama, ganti PIN 4 angka, dan ubah password akun Anda.</p></div><span className="role-chip"><ShieldCheck size={14}/> Terverifikasi</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.rpc('update_my_profile',{p_full_name:String(f.get('full_name')||'').trim()});if(error){setNotice(error.message);return}setNotice('Profil diperbarui.');await loadWorkspace()}}><div className="panel-head"><div><h3><UserRound size={17}/> Profil akun</h3><p>Email login: {session.user.email}</p></div></div><label>Nama lengkap</label><input className="text-input" name="full_name" defaultValue={session.user.user_metadata?.full_name||membership?.full_name||''} required minLength={2} maxLength={120}/><label>Email akun</label><input className="text-input" value={session.user.email||''} readOnly/><button className="btn btn-primary"><Check size={16}/> Simpan profil</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_pin')||'');const next=String(f.get('new_pin')||'');const confirmPin=String(f.get('confirm_pin')||'');if(!/^\d{4}$/.test(next)||next!==confirmPin){setNotice('PIN baru harus tepat 4 angka dan konfirmasinya harus sama.');return}const {data,error}=await supabase.rpc('change_my_pin',{p_current_pin:current,p_new_pin:next});if(error){setNotice(error.message);return}if(data!==true){setNotice('PIN saat ini salah. Percobaan gagal tercatat untuk pembatasan keamanan.');return}form.reset();setNotice('PIN berhasil diganti. Sesi keamanan diperbarui.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti PIN</h3><p>PIN hanya terdiri dari 4 angka. Jangan bagikan kepada siapa pun.</p></div></div><label>PIN saat ini</label><input className="text-input" name="current_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>PIN baru</label><input className="text-input" name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>Ulangi PIN baru</label><input className="text-input" name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti PIN</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_password')||'');const next=String(f.get('new_password')||'');const confirmPassword=String(f.get('confirm_password')||'');if(next.length<8||next!==confirmPassword){setNotice('Password baru minimal 8 karakter dan konfirmasinya harus sama.');return}const reauth=await supabase.auth.signInWithPassword({email:session.user.email,password:current});if(reauth.error){setNotice('Password saat ini salah.');return}const changed=await supabase.auth.updateUser({password:next});if(changed.error){setNotice(changed.error.message);return}form.reset();setNotice('Password berhasil diganti. Silakan verifikasi PIN kembali jika diminta.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti password</h3><p>Gunakan password unik minimal 8 karakter.</p></div></div><label>Password saat ini</label><input className="text-input" name="current_password" type="password" autoComplete="current-password" required/><label>Password baru</label><input className="text-input" name="new_password" type="password" autoComplete="new-password" minLength={8} required/><label>Ulangi password baru</label><input className="text-input" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti password</button></form></div></section>}
        {page==='settings'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">CONFIGURATION / STORE</span><h1>Pengaturan <span className="heading-accent">toko.</span></h1><p>Atur identitas toko, struk thermal, dan format antrian.</p></div><span className="role-chip"><ShieldCheck size={14}/>{membership.role}</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={saveStoreSettings}><div className="panel-head"><div><h3><Store size={17}/> Profil toko</h3><p>Informasi yang tampil di struk</p></div></div><label>Logo toko (opsional)</label><div className="store-logo-editor">{settings?.logo_url?<img className="store-logo-preview" src={settings.logo_url} alt="Logo toko saat ini"/>:<div className="store-logo-placeholder"><Store size={22}/><span>Belum ada logo</span></div>}<div className="store-logo-controls"><input className="text-input logo-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadStoreLogo} disabled={uploadingLogo||!isManager}/><small>PNG, JPG, atau WebP · maksimal 3 MB. Logo akan dicetak di bagian atas struk.</small>{settings?.logo_url&&<button type="button" className="btn btn-outline btn-small" onClick={removeStoreLogo} disabled={uploadingLogo||!isManager}><Trash2 size={14}/> Hapus logo</button>}{uploadingLogo&&<span className="logo-upload-status"><span className="spinner spinner-purple"/> Memproses logo…</span>}</div></div><label>Nama toko</label><input className="text-input" name="store_name" defaultValue={settings?.store_name||store.name} required/><label>Alamat toko</label><textarea className="text-input" name="address" defaultValue={settings?.address||''} rows="3" placeholder="Alamat untuk dicetak di struk"/><label>Nomor telepon</label><input className="text-input" name="phone" defaultValue={settings?.phone||''} placeholder="08xx xxxx xxxx"/><label>Footer struk</label><input className="text-input" name="receipt_footer" defaultValue={settings?.receipt_footer||'Terima kasih telah berbelanja'}/><label>Prefix antrian</label><input className="text-input prefix-input" name="queue_prefix" defaultValue={settings?.queue_prefix||'A'} maxLength="3"/><button className="btn btn-primary" disabled={savingSettings||!isManager}>{savingSettings?<span className="spinner"/>:<Check size={16}/>} Simpan pengaturan</button>{!isManager&&<p className="permission-note">Hanya admin/manager yang dapat mengubah pengaturan.</p>}</form><div className="settings-aside"><div className="panel settings-info"><span className="settings-info-icon"><Printer size={20}/></span><h3>Printer thermal</h3><p>Struk menggunakan layout 80mm. Hubungkan printer ke perangkat kasir, lalu gunakan dialog cetak browser. Printer Bluetooth tertentu memerlukan aplikasi/driver pendamping.</p><div className="info-line"><CheckCircle2 size={15}/> Layout struk 80mm</div><div className="info-line"><CheckCircle2 size={15}/> Bisa cetak dari Chrome</div></div><div className="panel settings-info"><span className="settings-info-icon blue-info"><Monitor size={20}/></span><h3>Layar antrian TV</h3><p>Buka layar TV dari menu antrian di browser TV. Status diperbarui otomatis saat koneksi internet aktif.</p><button className="btn btn-outline btn-wide" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={16}/> Buka layar TV</button></div><div className="panel account-info"><span className="account-avatar"><UserRound size={19}/></span><div><strong>{session.user.email}</strong><small>Masuk sebagai {membership.role}</small></div><button className="text-button" onClick={()=>supabase.auth.signOut()}>Keluar</button></div></div></div></section>}
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
  return <div className="receipt-print"><div className="receipt-center">{settings?.logo_url&&<img className="receipt-store-logo" src={settings.logo_url} alt="Logo toko"/>}<h2>{settings?.store_name||'NexaPos Store'}</h2>{settings?.address&&<p>{settings.address}</p>}{settings?.phone&&<p>{settings.phone}</p>}<div className="receipt-rule"/><p>Struk: {order.receipt_number||'ANTRIAN'}</p><p>{new Date(order.created_at||Date.now()).toLocaleString('id-ID')}</p><p>Kasir: NexaPos</p></div><div className="receipt-rule"/>{items.map(i=><div className="receipt-item" key={i.id}><span>{i.product_name}<br/>{i.quantity} × {money(i.unit_price)}</span><strong>{money(i.line_total)}</strong></div>)}<div className="receipt-rule"/><div className="receipt-total"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>{Number(order.discount)>0&&<div className="receipt-total"><span>Diskon</span><strong>− {money(order.discount)}</strong></div>}<div className="receipt-total receipt-grand"><span>TOTAL</span><strong>{money(order.total)}</strong></div><div className="receipt-total"><span>Pembayaran ({order.payment_method||'—'})</span><strong>{money(order.paid_amount)}</strong></div><div className="receipt-total"><span>Kembalian</span><strong>{money(order.change_amount)}</strong></div>{ticket&&<div className="receipt-queue"><small>NOMOR ANTRIAN</small><strong>{settings?.queue_prefix||'A'}{String(ticket.queue_number).padStart(3,'0')}</strong></div>}<div className="receipt-center receipt-thanks"><p>{settings?.receipt_footer||'Terima kasih telah berbelanja'}</p><small>Powered by NexaPos</small></div></div>
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
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [usersLoading,setUsersLoading]=useState(false)
  const [notice,setNotice]=useState('')
  const [registering,setRegistering]=useState(false)
  const [duration,setDuration]=useState('30')
  const [customDays,setCustomDays]=useState('14')
  const [disabledMembers,setDisabledMembers]=useState([])
  const [disabledLoading,setDisabledLoading]=useState(false)
  const [deletingUserId,setDeletingUserId]=useState('')
  const [userActionId,setUserActionId]=useState('')
  const [section,setSection]=useState('dashboard')
  const [mobileNav,setMobileNav]=useState(false)
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
    const {data,error}=await supabase.from('stores').select('id,name,owner_name,owner_email,status,activated_at,expires_at,activation_days,created_at,deleted_at').order('created_at',{ascending:false})
    if(error)setNotice(error.message)
    else setTenants(data||[])
    setLoading(false)
  },[])
  const loadUsers=useCallback(async()=>{
    setUsersLoading(true)
    const {data,error}=await supabase.rpc('super_admin_list_users_detailed')
    if(error)setNotice(error.message)
    else setUsers(data||[])
    setUsersLoading(false)
  },[])
  useEffect(()=>{load();loadUsers()},[load,loadUsers])
  const statusOf=(tenant)=>tenant.status==='active'&&tenant.expires_at&&new Date(tenant.expires_at)<=new Date()?'expired':tenant.status
  const loadDisabledMembers=useCallback(async()=>{setDisabledLoading(true);const {data,error}=await supabase.rpc('super_admin_list_disabled_members');if(error)setNotice(error.message);else setDisabledMembers(data||[]);setDisabledLoading(false)},[])
  useEffect(()=>{loadDisabledMembers()},[loadDisabledMembers])
  // Keep Super Admin lists in sync across sessions; polling is a fallback for suspended mobile tabs.
  useEffect(()=>{
    const channel=supabase.channel('nexapos-super-admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members'},()=>{loadUsers();loadDisabledMembers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_invites'},()=>loadUsers())
      .subscribe()
    const refresh=()=>{if(document.visibilityState==='visible'){load();loadUsers();loadDisabledMembers()}}
    const timer=setInterval(refresh,30000)
    document.addEventListener('visibilitychange',refresh)
    window.addEventListener('online',refresh)
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);supabase.removeChannel(channel)}
  },[load,loadUsers,loadDisabledMembers])
  // Super Admin lists update from database events; no polling.
  useEffect(()=>{
    const channel=supabase.channel('nexapos-super-admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},()=>{load();loadUsers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_members'},()=>{loadUsers();loadDisabledMembers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_invites'},()=>loadUsers())
      .subscribe()
    return ()=>{supabase.removeChannel(channel)}
  },[load,loadUsers,loadDisabledMembers])
  const activeCount=tenants.filter(t=>statusOf(t)==='active').length
  const expiredCount=tenants.filter(t=>statusOf(t)==='expired').length
  const submitTenant=async(event)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    const activationCode=crypto.randomUUID().replaceAll('-','')
    setRegistering(true)
    const {error}=await supabase.rpc('register_store_tenant',{p_store_name:String(form.get('store_name')||'').trim(),p_owner_name:String(form.get('owner_name')||'').trim(),p_owner_email:String(form.get('owner_email')||'').trim(),p_activation_code:activationCode})
    setRegistering(false)
    if(error){setNotice(error.message);return}
    event.currentTarget.reset()
    setNotice('Tenant terdaftar. Kode aktivasi Owner (sekali pakai): '+activationCode+'. Salin dan kirimkan secara pribadi kepada Owner. Aktifkan tenant setelah siap.')
    await load()
  }
  const regenerateOwnerInvite=async(tenant)=>{
    const activationCode=crypto.randomUUID().replaceAll('-','')
    if(!confirm('Buat kode undangan baru untuk '+(tenant.owner_email||'Owner')+'? Kode undangan lama yang belum digunakan akan diganti.'))return
    setRegistering(true)
    const {error}=await supabase.rpc('super_admin_regenerate_owner_invite',{p_store_id:tenant.id,p_activation_code:activationCode})
    setRegistering(false)
    if(error){setNotice(error.message);return}
    setNotice('Kode aktivasi Owner untuk '+tenant.owner_email+' (sekali pakai): '+activationCode+'. Salin dan kirimkan secara pribadi.')
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
  const deleteDisabledAccount=async(member)=>{
    const label=member.email||member.full_name||'akun ini'
    if(member.has_other_active_membership){setNotice('Akun ini masih aktif di tenant lain. Nonaktifkan seluruh keanggotaannya terlebih dahulu.');return}
    if(!confirm('HAPUS PERMANEN akun '+label+'? Akun login akan dihapus dan tindakan ini tidak dapat dibatalkan. Data bisnis yang masih mereferensikan akun dapat membuat database menolak penghapusan.'))return
    setDeletingUserId(member.user_id)
    const {error}=await supabase.rpc('super_admin_delete_disabled_account',{p_user_id:member.user_id})
    setDeletingUserId('')
    if(error){setNotice(error.message);return}
    setNotice('Akun '+label+' berhasil dihapus permanen.')
    await Promise.all([loadDisabledMembers(),loadUsers()])
  }
  const changeStatus=async(tenant,nextStatus)=>{
    if(nextStatus==='deleted'){
      const confirmation=prompt('PENGHAPUSAN PERMANEN\\nSemua produk, stok, transaksi, item transaksi, antrian, pengaturan, undangan, dan keanggotaan tenant akan dihapus dari database.\\n\\nKetik HAPUS '+tenant.name+' untuk melanjutkan.')
      if(confirmation!=='HAPUS '+tenant.name)return
      const {error}=await supabase.rpc('super_admin_delete_store_tenant',{p_store_id:tenant.id})
      if(error){setNotice(error.message);return}
      setNotice('Tenant dan seluruh data terkait telah dihapus permanen.')
      await Promise.all([load(),loadUsers(),loadDisabledMembers()])
      return
    }
    const action=nextStatus==='suspended'?'Nonaktifkan sementara '+tenant.name+'?':'Kembalikan '+tenant.name+' ke status menunggu aktivasi?'
    if(!confirm(action))return
    const {error}=await supabase.rpc('set_store_tenant_status',{p_store_id:tenant.id,p_status:nextStatus})
    if(error){setNotice(error.message);return}
    setNotice('Status tenant diperbarui.')
    await load()
  }
  const resetUserPin=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('PIN akun Super Admin tidak dapat direset dari daftar ini.');return}
    if(!confirm('Reset PIN '+(user.email||user.full_name)+'? Pengguna wajib membuat PIN baru saat masuk berikutnya.'))return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_reset_user_pin',{p_user_id:user.user_id})
    setUserActionId('')
    if(error){setNotice(error.message);return}
    setNotice('PIN direset. Pengguna harus membuat PIN baru.')
    await loadUsers()
  }
  const resetUserPassword=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin dilindungi dari reset password lewat menu ini.');return}
    const nextPassword=prompt('Masukkan password sementara baru (minimal 8 karakter) untuk '+user.email)
    if(!nextPassword)return
    if(nextPassword.length<8){setNotice('Password minimal 8 karakter.');return}
    if(!confirm('Ganti password akun '+user.email+'? Sampaikan password sementara secara aman kepada pemilik akun.'))return
    setUserActionId(user.user_id)
    try{
      const response=await fetch('/.netlify/functions/manage-user-password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({userId:user.user_id,password:nextPassword})})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(result.error||'Reset password gagal.')
      setNotice('Password akun berhasil diganti.')
    }catch(error){setNotice(error.message||'Reset password gagal.')}
    finally{setUserActionId('')}
  }
  const deleteUser=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin tidak dapat dihapus dari menu ini.');return}
    const confirmation=prompt('HAPUS PERMANEN AKUN\\nKeanggotaan, undangan terkait, PIN, dan kredensial login akan dihapus.\\n\\nKetik HAPUS '+user.email+' untuk melanjutkan.')
    if(confirmation!=='HAPUS '+user.email)return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_delete_user',{p_user_id:user.user_id})
    setUserActionId('')
    if(error){setNotice(error.message);return}
    setNotice('Akun dan kredensial terkait dihapus permanen.')
    await Promise.all([loadUsers(),loadDisabledMembers(),load()])
  }
  const moveUserToTenant=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin dilindungi dan tidak dapat dipindahkan.');return}
    const {data:members,error:membersError}=await supabase.from('store_members').select('store_id,role,is_active,disabled_at').eq('user_id',user.user_id)
    if(membersError){setNotice(membersError.message);return}
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
    const targetRole=prompt('Pilih role di '+target.name+': admin, manager, atau cashier.\nOwner tidak dapat dipilih.','cashier')
    if(targetRole===null)return
    const normalizedRole=targetRole.trim().toLowerCase()
    if(!['admin','manager','cashier'].includes(normalizedRole)){setNotice('Role tidak valid. Pilih admin, manager, atau cashier.');return}
    const sourceName=tenants.find(t=>t.id===source.store_id)?.name||'tenant asal'
    if(!confirm('Pindahkan '+(user.email||user.full_name)+' dari '+sourceName+' ke '+target.name+' sebagai '+normalizedRole+'?\n\nAkses ke tenant asal akan dicabut. Produk, transaksi, antrean, dan data tenant asal tetap berada di tenant asal.'))return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_move_user_membership',{p_user_id:user.user_id,p_source_store_id:source.store_id,p_target_store_id:target.id,p_target_role:normalizedRole})
    setUserActionId('')
    if(error){setNotice(error.message);return}
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
    if(error){setNotice(error.message);return}
    setNotice(nextBanned?'Akses login akun dinonaktifkan.':'Akses login akun diaktifkan kembali.')
    await loadUsers()
  }
  const filteredTenants=tenants.filter(t=>{
    const q=tenantSearch.trim().toLowerCase()
    const matches=!q||[t.name,t.owner_name,t.owner_email,t.id].some(v=>String(v||'').toLowerCase().includes(q))
    const status=statusOf(t)
    return matches&&(tenantStatus==='all'||status===tenantStatus)
  })
  const filteredUsers=users.filter(u=>{
    const q=userSearch.trim().toLowerCase()
    const matches=!q||[u.email,u.full_name,u.user_id,u.store_names,u.tenant_roles].some(v=>String(v||'').toLowerCase().includes(q))
    return matches&&(userStatus==='all'||(userStatus==='blocked'?u.is_banned:!u.is_banned))
  })
  const navItems=[['dashboard','Ringkasan',LayoutDashboard],['stores','Toko / tenant',Store],['users','Manajemen user',Users],['disabled','Akun staf nonaktif',Ban]]
  const selectSection=(id)=>{setSection(id);setMobileNav(false)}
  const pageTitle={dashboard:'Ringkasan platform',stores:'Manajemen toko',users:'Manajemen user',disabled:'Akun staf nonaktif'}[section]
  return <div className="app-shell super-admin-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      <div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>Super Admin</strong><small>Kontrol seluruh tenant</small></span></div>
      <nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div>{navItems.map(([id,label,Icon])=><button key={id} className={`nav-link ${section===id?'nav-active':''}`} onClick={()=>selectSection(id)}><Icon size={18}/><span>{label}</span>{id==='stores'&&<em>{tenants.length}</em>}</button>)}</div></nav>
      <div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email}</strong><small>Super Admin</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Tutup menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Buka menu"><Menu size={20}/></button><div><div className="breadcrumb">Platform <span>/</span> <strong>{pageTitle}</strong></div><div className="topbar-date">Manajemen user, toko, dan akses platform</div></div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> SUPER ADMIN</span><button className="icon-button" onClick={()=>{load();loadUsers();loadDisabledMembers()}} title="Muat ulang"><RefreshCw size={17}/></button></div></header>
      {notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      <div className="page-content">
        {section==='dashboard'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM CONTROL / OVERVIEW</span><h1>Kontrol <span className="heading-accent">platform.</span></h1><p>Kelola akun, tenant, dan akses dari satu panel terpusat.</p></div><span className="date-pill"><ShieldCheck size={14}/> Akses istimewa</span></div><div className="stats-grid"><StatCard icon={Store} label="Total tenant" value={tenants.filter(t=>statusOf(t)!=='deleted').length} meta={'Dikelola permanen'} tone="violet"/><StatCard icon={CheckCircle2} label="Aktif" value={activeCount} meta="Masa aktivasi berlaku" tone="green"/><StatCard icon={CalendarDays} label="Kedaluwarsa" value={expiredCount} meta="Menunggu reaktivasi" tone="orange"/><StatCard icon={Users} label="Akun user" value={users.length} meta={users.filter(u=>u.is_banned).length+' akun dinonaktifkan'} tone="blue"/></div><div className="admin-shortcuts"><button className="admin-shortcut" onClick={()=>selectSection('stores')}><span><Store size={20}/></span><strong>Kelola toko</strong><small>Cari tenant, aktivasi, arsip/hapus</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('users')}><span><Users size={20}/></span><strong>Manajemen user</strong><small>Daftar akun dan kontrol akses login</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('disabled')}><span><Ban size={20}/></span><strong>Akun staf nonaktif</strong><small>Tinjau dan bersihkan akun yang memenuhi syarat</small><ArrowRight size={16}/></button></div></section>}
        {section==='stores'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / TENANTS</span><h1>Manajemen <span className="heading-accent">toko.</span></h1><p>Daftarkan tenant, cari/filter toko, atur masa aktif, atau hapus dari operasional.</p></div><span className="date-pill"><Store size={14}/> {tenants.length} tenant</span></div><div className="panel super-register-panel"><div className="panel-head"><div><h3><UserPlus size={17}/> Pendaftaran toko baru</h3><p>Akun Owner terikat ke email yang didaftarkan dan harus mengaktifkan akun melalui halaman masuk.</p></div></div><form className="tenant-register-form" onSubmit={submitTenant}><div><label>Nama toko</label><input className="text-input" name="store_name" placeholder="Contoh: Toko Sejahtera" required/></div><div><label>Nama pemilik toko</label><input className="text-input" name="owner_name" placeholder="Nama lengkap Owner" required/></div><div><label>Email akun Owner</label><input className="text-input" type="email" name="owner_email" placeholder="owner@tokonya.com" required/></div><button className="btn btn-primary" disabled={registering}>{registering?<span className="spinner"/>:<Plus size={16}/>} Daftarkan toko</button></form></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Store size={17}/> Daftar toko / tenant</h3><p>Daftar dipaginasi; penghapusan tenant menghapus seluruh data terkait secara permanen.</p></div><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Refresh</button></div><div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={tenantSearch} onChange={e=>{setTenantSearch(e.target.value);setTenantPage(1)}} placeholder="Cari nama toko, owner, email, atau ID…"/></div><select className="text-input" value={tenantStatus} onChange={e=>{setTenantStatus(e.target.value);setTenantPage(1)}}><option value="all">Semua status</option><option value="active">Aktif</option><option value="pending">Menunggu aktivasi</option><option value="expired">Kedaluwarsa</option><option value="suspended">Nonaktif</option><option value="deleted">Tenant lama diarsipkan</option></select></div><div className="activation-toolbar"><label>Durasi aktivasi <select className="text-input" value={duration} onChange={e=>setDuration(e.target.value)}><option value="30">30 hari</option><option value="7">7 hari</option><option value="3">3 hari</option><option value="custom">Custom</option></select></label>{duration==='custom'&&<label>Jumlah hari <input className="text-input" type="number" min="1" max="3650" value={customDays} onChange={e=>setCustomDays(e.target.value)}/></label>}</div>{loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:filteredTenants.length===0?<EmptyState icon={Store} title="Toko tidak ditemukan" text="Ubah kata kunci atau filter status."/>:<><div className="table-wrap"><table><thead><tr><th>Toko / Owner</th><th>Status</th><th>Masa aktif</th><th>Aksi</th></tr></thead><tbody>{filteredTenants.slice((tenantPage-1)*pageSize,tenantPage*pageSize).map(t=>{const status=statusOf(t);return <tr key={t.id}><td><strong>{t.name}</strong><br/><small>{t.owner_name||'Nama owner belum tersedia'} · {t.owner_email||'Email belum tersedia'}</small><br/><small>Dibuat {new Date(t.created_at).toLocaleDateString('id-ID')}</small></td><td><span className={'status-pill '+(status==='active'?'status-paid':status==='pending'?'status-waiting':status==='expired'?'status-inactive':'status-serving')}>{({active:'Aktif',pending:'Menunggu aktivasi',expired:'Kedaluwarsa',suspended:'Dinonaktifkan',deleted:'Tenant lama diarsipkan'})[status]||status}</span></td><td>{t.expires_at?<><strong>{new Date(t.expires_at).toLocaleDateString('id-ID')}</strong><br/><small>{status==='active'?'Berakhir '+new Date(t.expires_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'Tanggal berakhir terakhir'}</small></>:'Belum diaktivasi'}</td><td><div className="tenant-actions"><button className="btn btn-small btn-outline" onClick={()=>regenerateOwnerInvite(t)} disabled={status==='deleted'||registering}><KeyRound size={13}/> Kode undangan Owner</button><button className="btn btn-small btn-primary" onClick={()=>activate(t)} disabled={status==='deleted'}><CheckCircle2 size={13}/>{status==='active'?'Perpanjang / reaktivasi':'Aktivasi'}</button>{!['suspended','deleted'].includes(status)&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'suspended')}><Ban size={13}/> Nonaktifkan</button>}{status==='suspended'&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'pending')}>Jadikan pending</button>}{<button className="btn btn-small btn-outline danger-icon" onClick={()=>changeStatus(t,'deleted')} title="Hapus permanen"><Trash2 size={14}/> Hapus permanen</button>}</div></td></tr>})}</tbody></table></div><Pagination page={tenantPage} total={filteredTenants.length} pageSize={pageSize} onChange={setTenantPage}/></>}</div></section>}
        {section==='users'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / ACCOUNT CONTROL</span><h1>Manajemen <span className="heading-accent">user.</span></h1><p>Seluruh akun autentikasi, tenant terkait, dan kontrol akses login.</p></div><span className="date-pill"><Users size={14}/> {users.length} akun</span></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Users size={17}/> Seluruh akun</h3><p>Akun Super Admin dilindungi dari perubahan dan penghapusan akun.</p></div><button className="btn btn-outline btn-small" onClick={loadUsers}><RefreshCw size={14}/> Refresh</button></div><div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={userSearch} onChange={e=>{setUserSearch(e.target.value);setUserPage(1)}} placeholder="Cari email, nama, ID user, atau toko…"/></div><select className="text-input" value={userStatus} onChange={e=>{setUserStatus(e.target.value);setUserPage(1)}}><option value="all">Semua akun</option><option value="active">Login aktif</option><option value="blocked">Login dinonaktifkan</option></select></div>{usersLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:filteredUsers.length===0?<EmptyState icon={Users} title="Akun tidak ditemukan" text="Coba kata kunci atau filter lain."/>:<><div className="table-wrap"><table><thead><tr><th>Akun</th><th>Tenant</th><th>Role & status tenant</th><th>Keanggotaan</th><th>Terakhir masuk</th><th>Status login</th><th>Aksi</th></tr></thead><tbody>{filteredUsers.slice((userPage-1)*pageSize,userPage*pageSize).map(u=><tr key={u.user_id}><td><strong>{u.full_name||u.email||'Tanpa nama'}</strong><br/><small>{u.email||'Email tidak tersedia'}</small><br/><small className="mono">{u.user_id}</small></td><td>{u.store_names||'Belum terhubung ke tenant'}</td><td>{u.tenant_roles|| (u.is_super_admin?'Super Admin — akses platform':'Belum memiliki role tenant')}</td><td>{u.active_memberships} aktif / {u.membership_count} total</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('id-ID'):'Belum pernah masuk'}</td><td><span className={'status-pill '+(u.is_super_admin?'status-serving':u.is_banned?'status-inactive':'status-paid')}>{u.is_super_admin?'Super Admin':u.is_banned?'Dinonaktifkan':'Aktif'}</span></td><td>{u.is_super_admin?<span className="subtle">Dilindungi</span>:<div className="user-admin-actions"><button className={'btn btn-small '+(u.is_banned?'btn-primary':'btn-outline')} disabled={userActionId===u.user_id} onClick={()=>toggleUserBan(u)}>{u.is_banned?'Aktifkan login':'Nonaktifkan login'}</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>moveUserToTenant(u)}><Store size={13}/> Pindahkan tenant</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPin(u)}><ShieldCheck size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPassword(u)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" disabled={userActionId===u.user_id} onClick={()=>deleteUser(u)}><Trash2 size={13}/> Hapus permanen</button></div>}</td></tr>)}</tbody></table></div><Pagination page={userPage} total={filteredUsers.length} pageSize={pageSize} onChange={setUserPage}/></>}</div></section>}
        {section==='disabled'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / DISABLED STAFF</span><h1>Akun staf <span className="heading-accent">nonaktif.</span></h1><p>Tinjau akun yang dinonaktifkan Owner. Penghapusan permanen hanya untuk akun staf yang memenuhi syarat.</p></div><button className="btn btn-outline" onClick={loadDisabledMembers}><RefreshCw size={15}/> Refresh</button></div><div className="panel tenant-list-panel disabled-members-panel"><div className="panel-head"><div><h3><Users size={17}/> Akun staf nonaktif</h3><p>Riwayat dan data transaksi tetap dilindungi oleh batasan database.</p></div></div>{disabledLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:disabledMembers.length===0?<EmptyState icon={Users} title="Belum ada akun staf nonaktif" text="Akun yang dinonaktifkan Owner akan muncul di sini."/>:<><div className="table-wrap"><table><thead><tr><th>Akun staf</th><th>Tenant</th><th>Dinonaktifkan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{disabledMembers.slice((disabledPage-1)*pageSize,disabledPage*pageSize).map(m=><tr key={m.member_id}><td><strong>{m.full_name||'Tanpa nama'}</strong><br/><small>{m.email||'Email tidak tersedia'}</small><br/><small>Role: {m.role}</small></td><td>{m.store_name}</td><td>{m.disabled_at?new Date(m.disabled_at).toLocaleString('id-ID'):'Tanggal tidak tercatat'}<br/><small>Oleh: {m.disabled_by_email||'Owner (lama)'}</small></td><td><span className={'status-pill '+(m.has_other_active_membership?'status-waiting':'status-inactive')}>{m.has_other_active_membership?'Masih aktif di tenant lain':'Semua akses nonaktif'}</span></td><td><button className="btn btn-small btn-outline danger-icon" disabled={Boolean(m.has_other_active_membership)||deletingUserId===m.user_id} onClick={()=>deleteDisabledAccount(m)}>{deletingUserId===m.user_id?<span className="spinner"/>:<Trash2 size={13}/>} Hapus akun permanen</button></td></tr>)}</tbody></table></div><Pagination page={disabledPage} total={disabledMembers.length} pageSize={pageSize} onChange={setDisabledPage}/></>}</div></section>}
      </div>
    </main>
  </div>
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
  return <main className="tv-screen"><header className="tv-header"><Brand/><div><span className="live-status"><i/> LIVE QUEUE</span><div className="tv-store">{settings?.store_name||store?.name||'NexaPos'}</div></div><div className="tv-clock">{new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}<small>{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</small></div></header><div className="tv-content"><section className="tv-current"><span className="eyebrow">NOMOR ANTRIAN DIPANGGIL</span>{current.length?current.map((t,i)=><div className={`tv-call ${i===0?'tv-call-main':''}`} key={t.id}><span>{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span>{t.customer_name?.trim()&&<strong className="tv-customer-name">{t.customer_name}</strong>}<small>{t.counter_label||'Kasir 1'}</small></div>):<div className="tv-empty">Menunggu panggilan berikutnya…</div>}<div className="tv-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></section><section className="tv-next"><div className="tv-next-head"><div><span className="eyebrow">ANTRIAN BERIKUTNYA</span><h2>Mohon bersiap</h2></div><span className="tv-count">{waiting.length} menunggu</span></div>{waiting.length?waiting.map(t=><div className="tv-next-row" key={t.id}><span>{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span><small>{t.customer_name?.trim()||''}</small></div>):<div className="tv-next-empty">Tidak ada antrian menunggu</div>}</section></div><footer className="tv-footer"><span><i className="live-dot"/> Informasi antrian diperbarui otomatis</span><strong>{settings?.store_name||'NexaPos'} <span>•</span> Terima kasih atas kunjungan Anda</strong></footer>{error&&<div className="tv-error">{error}</div>}</main>
}

export default function Root(){
  const screen=new URLSearchParams(window.location.search).get('screen')
  if(screen==='queue')return <QueueScreen/>
  return <App/>
}
