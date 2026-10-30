import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowLeft, Building2, KeyRound, Copy, BarChart3, Bell, Boxes, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Clock3, CreditCard, FileText, Headphones, LayoutDashboard,
  LogOut, Menu, Minus, Monitor, Package, Plus, Printer, QrCode, RefreshCw, Search,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, SkipForward, Store, Ticket, Trash2,
  TrendingUp, UserRound, Users, UserPlus, CalendarDays, Ban, Archive, Mail, Wallet, Video, X
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
import PlatformAuditLog from './PlatformAuditLog.jsx'
import OwnerOrganizationSettings from './OwnerOrganizationSettings.jsx'
import StoreControlCenter from './StoreControlCenter.jsx'

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
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
  const [selectedStoreId, setSelectedStoreId] = useState('')
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
  const monitoringAudioContextRef = useRef(null)
  const [queueBusy, setQueueBusy] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [orderSuccessToast, setOrderSuccessToast] = useState(null)
  const orderSuccessAudioRef = useRef(null)
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
        if (fields.length) localStorage.setItem(storageKey(form), JSON.stringify({ savedAt: Date.now(), fields }))
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
    }
    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onInput, true)
    document.addEventListener('reset', onReset, true)
    window.addEventListener('pageshow', restoreAllForms)
    const observer = new MutationObserver(() => restoreAllForms())
    if (document.body) observer.observe(document.body, { childList: true, subtree: true })
    restoreAllForms()
    return () => {
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      document.removeEventListener('reset', onReset, true)
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

  const loadWorkspace = useCallback(async () => {
    if (!session?.user || !supabase) return
    setLoading(true)
    setNotice('')
    // Platform staff accounts are independent of tenant membership; never send them through tenant onboarding.
    if (isSuperAdmin) {
      setMemberships([])
      setMembership(null)
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
    if (memberError) { setNotice(userFacingError(memberError, 'Koneksi belum siap saat memuat keanggotaan. Periksa internet lalu coba lagi.')); setLoading(false); return }
    if (!resolvedMembers.length) {
      setMemberships([])
      setMembership(null)
      setStore(null)
      setNotice('Akun belum memiliki toko. Jika Anda baru saja login atau menerima undangan, coba sebentar lagi.')
      setLoading(false)
      return
    }
    const {data: storeRows, error: storesError} = await supabase.from('stores').select('id,name').in('id',resolvedMembers.map(m=>m.store_id))
    if (storesError) { setNotice(userFacingError(storesError)); setLoading(false); return }
    const {data: settingRows} = await supabase.from('store_settings').select('store_id,store_name').in('store_id',resolvedMembers.map(m=>m.store_id))
    const availableMemberships = resolvedMembers.map(m=>({...m,store_name:settingRows?.find(s=>s.store_id===m.store_id)?.store_name||storeRows?.find(s=>s.id===m.store_id)?.name||'Toko'}))
    setMemberships(availableMemberships)
    const member = availableMemberships.find(m=>m.store_id===selectedStoreId) || availableMemberships[0]
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
    setStore(storeData); setSettings(settingData || {store_id:member.store_id,store_name:storeData?.name||member.store_name||'NexaPos Store',address:'',phone:'',receipt_footer:'Terima kasih telah berbelanja',receipt_note:'',queue_prefix:'A',queue_enabled:true,currency:'IDR'})
    setProducts(productData || []); setOrders(orderData || []); setQueue(queueData || [])
    const orderIds=(orderData||[]).map(o=>o.id)
    if(orderIds.length){
      const {data:itemRows,error:itemError}=await supabase.from('order_items').select('*').in('order_id',orderIds)
      if(itemError){setOrderItems([]);loadIssues.push('Rincian transaksi: '+userFacingError(itemError))}
      else setOrderItems(itemRows||[])
    } else setOrderItems([])
    if (['owner','admin','manager'].includes(member.role)) {
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

  useEffect(()=>{setSelectedStoreId('')},[session?.user?.id])

  useEffect(()=>{if(!session)return;loadWorkspace()},[session,loadWorkspace])

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

  const monitoringBreakRows = monitoringBreaks.filter(row=>!row.ended_at).map(row=>{const shift=openCashierShifts.find(item=>item.id===row.shift_id);const member=shift?.member||teamMembers.find(item=>item.user_id===row.cashier_id);const elapsedMinutes=Math.max(0,Math.floor((monitoringNow-new Date(row.started_at).getTime())/60000));return {...row,displayName:member?.full_name?.trim()||member?.email||'Kasir '+String(row.cashier_id||'').slice(0,8),email:member?.email||'',elapsedMinutes,overdue:elapsedMinutes>=Number(breakSettings.max_break_minutes||15),overdueMinutes:Math.max(0,elapsedMinutes-Number(breakSettings.max_break_minutes||15))}})
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
    if(!store?.id||!supabase||!['owner','admin','manager'].includes(membership?.role)){setOpenCashierShifts([]);return}
    let cancelled=false
    const refreshOpenShifts=async()=>{
      const [{data:shifts,error:shiftError},{data:members,error:memberError}]=await Promise.all([
        supabase.from('cashier_shifts').select('id,store_id,cashier_id,opened_at,opening_cash').eq('store_id',store.id).is('closed_at',null).order('opened_at',{ascending:true}),
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
    if(!session?.user?.id||!store?.id||!supabase||!['owner','admin','manager'].includes(membership?.role))return
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

  const isManager = ['owner','admin','manager'].includes(membership?.role)
  const currentShiftOrders=useMemo(()=>activeShift?orders.filter(o=>o.cashier_id===activeShift.cashier_id&&new Date(o.created_at)>=new Date(activeShift.opened_at)&&(!activeShift.closed_at||new Date(o.created_at)<=new Date(activeShift.closed_at))&&o.status==='paid'):[],[orders,activeShift])
  const expectedShiftCash=Number(activeShift?.opening_cash||0)+currentShiftOrders.filter(o=>o.payment_method==='cash').reduce((sum,o)=>sum+Number(o.total||0),0)
  const expectedShiftQris=currentShiftOrders.filter(o=>o.payment_method==='qris').reduce((sum,o)=>sum+Number(o.total||0),0)
  const categories = useMemo(()=>['Semua',...new Set(products.map(p=>p.category||'Umum'))],[products])
  const visibleProducts = useMemo(()=>products.filter(p=>p.is_active && (category==='Semua'||(p.category||'Umum')===category) && (p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))),[products,category,search])
  const subtotal = cart.reduce((sum,item)=>sum+Number(item.price)*item.quantity,0)
  const safeDiscount = Math.min(Math.max(Number(discount)||0,0),subtotal)
  const total = subtotal-safeDiscount
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
    return {...shift,displayName:member?.full_name?.trim()||member?.email||'Kasir '+String(shift.cashier_id||'').slice(0,8),transactionCount:cashierOrders.length,salesTotal:cashierOrders.reduce((sum,o)=>sum+Number(o.total||0),0)}
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
    const {data,error}=await supabase.rpc('complete_sale',{p_store_id:store.id,p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity})),p_discount:safeDiscount,p_payment_method:payMethod,p_paid_amount:paid,p_customer_name:settings?.queue_enabled===false?null:(queueCustomer||null),p_create_queue:settings?.queue_enabled!==false})
    setQueueBusy(false)
    if(error){setNotice(userFacingError(error));return}
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
    setCart([]);setPaidAmount('');setDiscount('0');setQueueCustomer('')
    await loadWorkspace()
    setPage('pos')
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
    if(!isManager){setNotice('Hanya admin atau manager yang dapat mengelola produk.');return}
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
    if(!confirm('Hapus permanen keanggotaan '+(member.full_name||member.email)+' dari toko ini? Jika akun tidak digunakan tenant lain, akun login juga akan dihapus permanen.'))return
    const {error}=await supabase.rpc('owner_delete_store_member',{p_member_id:member.id})
    if(error){setNotice(userFacingError(error));return}
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

  const printReceipt = () => { if(receipt)window.print() }
  const nav = [
    {section:'WORKSPACE',items:[['dashboard','Ringkasan',LayoutDashboard],['pos','Kasir / POS',ShoppingCart],['products','Produk & stok',Package],['queue','Sistem antrian',Ticket]]},
    {section:'OPERASIONAL',items:['owner','admin','manager'].includes(membership?.role)?[['monitoring','Monitoring kasir aktif',Activity]]:[]},
    {section:'ANALYTICS',items:[['reports','Laporan penjualan',BarChart3],['attendance','Laporan absensi',CalendarDays]]},
    {section:'CASH MANAGEMENT',items:[['cashier','Buka / tutup kasir',Wallet]]},
    {section:'PREFERENCES',items:[['settings','Pengaturan toko',Settings], ... (membership?.role==='owner'?[['organization-settings','Pengaturan organisasi',Building2]]:[]),['profile','Profil & keamanan',UserRound], ...(['owner','admin'].includes(membership?.role)?[['tv-settings','Edit Tampilan TV',Monitor]]:[])]},
    {section:'MANAGEMENT',items:membership?.role==='owner'?[['team','Karyawan & akses',Users]]:[]}
  ]

  if(!authReady || (session && !adminCheckReady))return <div className="loading-screen"><span className="spinner spinner-large"/><span>Menyiapkan NexaPos…</span></div>
  if(!session)return (window.location.pathname === '/' || window.location.pathname === '/index.html' ? <Homepage/> : <AuthScreen/>)
  if(!pinStatus)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keamanan akun…</span></div>
  if(pinStatus.error)return <div className="loading-screen"><p>Modul keamanan PIN belum siap: {pinStatus.error}</p><p>Terapkan migrasi PIN sebelum memakai versi ini.</p><button className="btn btn-outline" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  if(!pinStatus.has_pin||!pinStatus.is_verified)return <PinGate session={session} status={pinStatus} onReady={setPinStatus} onSignOut={()=>supabase.auth.signOut()}/>
  if(isSuperAdmin)return <SuperAdminScreen session={session} syncStatus={syncStatus} setSyncStatus={setSyncStatus} onSignOut={()=>supabase.auth.signOut()} platformAdmin={isPlatformAdmin}/>
  
  if(loading&&!store)return <div className="loading-screen"><span className="spinner spinner-large"/><span>Memeriksa keanggotaan toko…</span></div>
  if(!store)return <div className="loading-screen"><span className="spinner spinner-large"/><p>{notice||'Akun ini belum terhubung ke toko. Minta Owner atau Super Admin mengirim undangan.'}</p><button className="btn btn-outline" onClick={loadWorkspace} disabled={loading}><RefreshCw size={14}/> {loading?'Memeriksa toko…':'Cek koneksi toko'}</button><button className="btn btn-ghost" onClick={()=>supabase.auth.signOut()}>Keluar</button></div>
  const effectiveStoreStatus = store.status === 'active' && store.expires_at && new Date(store.expires_at) <= new Date() ? 'expired' : (store.status || 'active')
  if(effectiveStoreStatus !== 'active') return <TenantLockedScreen store={store} status={effectiveStoreStatus} onSignOut={()=>supabase.auth.signOut()}/>

  const tenantDaysRemaining = store?.expires_at ? Math.ceil((new Date(store.expires_at).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/86400000) : null
  const tenantExpiryTone = tenantDaysRemaining === null ? '' : tenantDaysRemaining < 7 ? 'critical' : tenantDaysRemaining <= 25 ? 'warning' : 'healthy'
  const titleMap={dashboard:'Ringkasan',pos:'Kasir / POS',products:'Produk & stok',queue:'Sistem antrian',monitoring:'Monitoring kasir aktif',reports:'Laporan penjualan',attendance:'Laporan absensi',cashier:'Buka / tutup kasir',settings:'Pengaturan toko','organization-settings':'Pengaturan organisasi',profile:'Profil & keamanan','tv-settings':'Edit Tampilan TV'}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'sidebar-open':''}`}>
      <div className="sidebar-brand"><Brand/></div>
      <div className="store-switch"><span className="store-avatar">{settings?.logo_url?<img className="sidebar-store-logo" src={settings.logo_url} alt={`Logo ${settings?.store_name||store.name}`}/>:<Store size={17}/>}</span><span className="store-copy">{memberships.length>1?<select className="store-select" aria-label="Pilih toko aktif" value={store.id} onChange={e=>{setSelectedStoreId(e.target.value);setStore(null);setMembership(null);setSettings(null);setProducts([]);setOrders([]);setQueue([]);setCart([]);setReceipt(null);setNotice('')}}>{memberships.map(m=><option key={m.store_id} value={m.store_id}>{m.store_name}</option>)}</select>:<strong>{settings?.store_name||store.name}</strong>}<small>{memberships.length>1?'Ganti workspace':'Workspace aktif'}</small></span>{memberships.length===1&&<ChevronDown size={15}/>}</div>
      <nav className="side-nav">{nav.filter(group=>group.items.length).map(group=><div className="nav-group" key={group.section}><div className="nav-section">{group.section}</div>{group.items.map(([id,label,Icon])=><button key={id} className={`nav-link ${page===id?'nav-active':''}`} onClick={()=>{setPage(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span>{id==='queue'&&waitingQueue.length>0&&<em>{waitingQueue.length}</em>}</button>)}</div>)}</nav>
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

        {page==='pos'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SALES / CHECKOUT</span><h1>Kasir <span className="heading-accent">POS.</span></h1><p>Pilih produk, proses pembayaran, dan cetak struk.</p></div><span className={`date-pill ${activeShift?'':'shift-closed-pill'}`}><i className="live-dot"/> {activeShift?'Shift aktif':'Shift belum dibuka'}</span></div>{!activeShift&&<div className="shift-required-banner"><div><strong>Buka shift untuk mengaktifkan transaksi POS</strong><p>Masukkan saldo awal kas melalui menu Buka / tutup kasir sebelum memproses penjualan.</p></div><button className="btn btn-primary" onClick={()=>setPage('cashier')}><Wallet size={16}/> Buka kasir</button></div>}{shiftBreak&&<div className="shift-required-banner" style={{borderColor:'#d97706',background:'rgba(217,119,6,0.08)'}}><div><strong>Kasir sedang istirahat</strong><p>Transaksi tidak dapat diselesaikan sampai Anda kembali bekerja. Sesi kasir tetap terbuka.</p></div><button className="btn btn-primary" onClick={()=>setPage('cashier')}><Clock3 size={16}/> Kembali bekerja</button></div>}<div className="pos-layout"><div className="pos-catalog"><div className="catalog-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setPosProductPage(1);setProductPage(1)}} placeholder="Cari nama, SKU, barcode…"/></div><button className="icon-button" onClick={loadWorkspace} title="Refresh produk"><RefreshCw size={16}/></button></div><div className="category-pills">{categories.map(c=><button key={c} className={category===c?'category-active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{visibleProducts.slice((posProductPage-1)*listPageSize,posProductPage*listPageSize).map(p=><button key={p.id} className="product-tile" disabled={p.stock<=0} onClick={()=>addToCart(p)}><span className="product-tile-icon"><Package size={21}/></span><span className="product-tile-name">{p.name}</span><span className="product-tile-bottom"><strong>{money(p.price)}</strong><small>Stok {p.stock}</small></span><span className="product-add"><Plus size={14}/></span></button>)}</div>{visibleProducts.length===0&&<EmptyState icon={Package} title="Produk tidak ditemukan" text="Coba kata kunci lain atau tambahkan produk baru." action={isManager?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}<Pagination page={posProductPage} total={visibleProducts.length} pageSize={listPageSize} onChange={setPosProductPage}/></div><aside className="cart-panel"><div className="cart-head"><div><h3><ShoppingCart size={18}/> Keranjang</h3><p>{cart.reduce((s,i)=>s+i.quantity,0)} item dipilih</p></div><button className="text-button" onClick={()=>setCart([])} disabled={!cart.length}>Kosongkan</button></div><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.id}><div className="cart-item-main"><strong>{item.name}</strong><small>{money(item.price)} / item</small><div className="quantity-control"><button onClick={()=>changeQty(item.id,-1)}><Minus size={12}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.id,1)} disabled={item.quantity>=item.stock}><Plus size={12}/></button></div></div><div className="cart-item-side"><strong>{money(item.price*item.quantity)}</strong><button className="icon-button danger-icon" onClick={()=>removeCartItem(item.id)}><Trash2 size={14}/></button></div></div>)}{cart.length===0&&<EmptyState icon={ShoppingCart} title="Keranjang masih kosong" text="Pilih produk untuk memulai transaksi."/>}</div><div className="checkout-fields">{settings?.queue_enabled!==false&&<><label>Nama pelanggan <span>Opsional · untuk antrian</span></label><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama untuk nomor antrian"/></>}<label>Diskon (Rp)</label><input className="text-input" type="number" min="0" max={subtotal} value={discount} onChange={e=>setDiscount(e.target.value)}/><label>Metode pembayaran</label><div className="payment-options">{[['cash','Tunai',Wallet],['qris','QRIS',QrCode],['transfer','Transfer',CreditCard]].map(([v,l,I])=><button key={v} className={payMethod===v?'payment-active':''} onClick={()=>setPayMethod(v)}><I size={15}/>{l}</button>)}</div>{payMethod==='cash'&&<><label>Uang diterima (Rp)</label><input className="text-input" type="number" min={total} value={paidAmount} onChange={e=>setPaidAmount(e.target.value)} placeholder={String(total)}/></>}</div><div className="cart-totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Diskon</span><strong className="discount-value">− {money(safeDiscount)}</strong></div><div className="grand-total"><span>Total pembayaran</span><strong>{money(total)}</strong></div>{payMethod==='cash'&&Number(paidAmount)>=total&&total>0&&<div><span>Kembalian</span><strong>{money(Number(paidAmount)-total)}</strong></div>}</div><button className="btn btn-primary btn-wide checkout-button" disabled={!cart.length||queueBusy||!activeShift} onClick={checkout}>{queueBusy?<span className="spinner"/>:<Check size={17}/>} Proses pembayaran <ArrowRight size={16}/></button><div className="cart-note"><ShieldCheck size={13}/> Transaksi aman tersimpan di cloud</div></aside></div></section>}

        {page==='products'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">INVENTORY / CATALOG</span><h1>Produk <span className="heading-accent">& stok.</span></h1><p>Kelola katalog, harga jual, barcode, dan ketersediaan stok.</p></div>{isManager&&<button className="btn btn-primary" onClick={()=>setProductModal({})}><Plus size={17}/> Tambah produk</button>}</div><div className="product-toolbar panel"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setProductPage(1);setPosProductPage(1)}} placeholder="Cari produk, SKU, barcode…"/></div><label className="category-filter-label">Kategori<select className="text-input category-filter" value={productCategory} onChange={e=>{setProductCategory(e.target.value);setProductPage(1)}}>{categories.map(item=><option key={item} value={item}>{item}</option>)}</select></label><span className="result-count">{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length} produk</span></div><div className="panel inventory-panel"><div className="table-wrap"><table><thead><tr><th>Produk</th><th>SKU / Barcode</th><th>Kategori</th><th>Harga jual</th><th>Stok</th><th>Status</th>{isManager&&<th>Aksi</th>}</tr></thead><tbody>{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).slice((productPage-1)*listPageSize,productPage*listPageSize).map(p=><tr key={p.id}><td><div className="product-cell"><span className="product-cell-icon"><Package size={17}/></span><strong>{p.name}</strong></div></td><td className="muted-cell">{p.sku||p.barcode||'—'}</td><td><span className="category-tag">{p.category||'Umum'}</span></td><td className="strong">{money(p.price)}</td><td><span className={`stock-count ${p.stock<=5?'stock-low':''}`}>{p.stock} unit</span></td><td><span className={`status-pill ${p.is_active?'status-paid':'status-inactive'}`}>{p.is_active?'Aktif':'Nonaktif'}</span></td>{isManager&&<td><div className="row-actions"><button className="icon-button" title="Edit produk" onClick={()=>setProductModal(p)}><Settings size={15}/></button><button className="icon-button danger-icon" title="Hapus produk" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table>{products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length===0&&<EmptyState icon={Package} title={products.length===0?'Katalog masih kosong':'Produk tidak ditemukan'} text={products.length===0?'Tambahkan produk pertama untuk mulai berjualan.':'Coba kategori atau kata kunci lain.'} action={isManager&&products.length===0?()=>setProductModal({}):null} actionLabel="Tambah produk"/>}</div><Pagination page={productPage} total={products.filter(p=>(productCategory==='Semua'||(p.category||'Umum')===productCategory)&&(p.name.toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase())||(p.barcode||'').includes(search))).length} pageSize={listPageSize} onChange={setProductPage}/></div>{!isManager&&<p className="permission-note"><ShieldCheck size={14}/> Hanya admin/manager yang dapat menambah, mengedit, atau menghapus produk.</p>}</section>}

        {page==='queue'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">SERVICE / QUEUE MANAGEMENT</span><h1>Sistem <span className="heading-accent">antrian.</span></h1><p>Nomor otomatis dan status tersinkron langsung ke semua perangkat.</p></div><div className="queue-heading-actions"><button className="btn btn-outline" onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}><Monitor size={17}/> Buka layar TV</button>{['owner','admin'].includes(membership?.role)&&<button className="btn btn-primary" onClick={()=>setPage('tv-settings')}><Settings size={17}/> Edit Tampilan TV</button>}</div></div><div className="queue-overview"><div className="queue-feature"><div className="queue-feature-head"><span className="banner-label"><span className="pulse-dot"/> LIVE QUEUE</span><span className="queue-today">{queue.length} tiket hari ini</span></div><div className="queue-feature-number">{activeQueue[0]?((settings?.queue_prefix||'A')+String(activeQueue[0].queue_number).padStart(3,'0')):'—'}</div><div className="queue-feature-label">{activeQueue[0]?'Sedang dipanggil':'Belum ada antrian dipanggil'}</div><div className="queue-feature-bottom"><span><i className="live-dot"/> Sinkron aktif</span><button onClick={()=>window.open(window.location.pathname+'?screen=queue&store='+encodeURIComponent(store.id),'_blank')}>Mode layar penuh <ArrowRight size={14}/></button></div></div><div className="queue-side-stats"><div className="queue-stat-card"><span className="stat-icon tone-orange"><Clock3 size={18}/></span><div><small>Menunggu</small><strong>{waitingQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-green"><Headphones size={18}/></span><div><small>Dipanggil / dilayani</small><strong>{activeQueue.length}</strong></div></div><div className="queue-stat-card"><span className="stat-icon tone-blue"><CheckCircle2 size={18}/></span><div><small>Selesai</small><strong>{queue.filter(t=>t.status==='done').length}</strong></div></div></div></div>{settings?.queue_enabled===false&&<div className="panel queue-disabled-notice"><Ticket size={20}/><div><strong>Sistem antrian sedang nonaktif</strong><p>Transaksi kasir tetap berjalan normal. Aktifkan kembali melalui Pengaturan toko jika ingin menggunakan antrian.</p></div><button className="btn btn-outline" onClick={()=>setPage('settings')}>Buka pengaturan</button></div>}<div className="queue-tools panel"><div><h3>Antrean & loket aktif</h3><p>Isi nama loket pada perangkat ini. TV menampilkan loket yang benar-benar menekan Panggil.</p></div><div className="queue-create-form"><input className="text-input" value={queueCounterLabel} onChange={e=>{setQueueCounterLabel(e.target.value);try{localStorage.setItem('nexapos-counter-label',e.target.value)}catch{}}} placeholder="Nama kasir/konter/loket (contoh: Loket 3)" aria-label="Nama kasir konter atau loket"/><input className="text-input" value={queueCustomer} onChange={e=>setQueueCustomer(e.target.value)} placeholder="Nama pelanggan untuk nomor manual (opsional)"/><button className="btn btn-primary" disabled={queueBusy||settings?.queue_enabled===false} onClick={createTicket}><Plus size={16}/> Buat nomor</button></div></div><div className="panel queue-list-panel"><div className="panel-head"><div><h3>Daftar antrian hari ini</h3><p>Kelola status setiap pelanggan</p></div><button className="icon-button" onClick={loadWorkspace}><RefreshCw size={16}/></button></div>{queue.length===0?<EmptyState icon={Ticket} title="Belum ada antrian" text="Nomor akan tampil di sini saat dibuat."/>:<div className="table-wrap"><table><thead><tr><th>Nomor</th><th>Pelanggan</th><th>Pembuat pesanan</th><th>Waktu</th><th>Loket pemanggil</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{queue.slice((queuePage-1)*listPageSize,queuePage*listPageSize).map(t=><tr key={t.id}><td><span className="queue-number large">{settings?.queue_prefix||'A'}{String(t.queue_number).padStart(3,'0')}</span></td><td className="strong">{t.customer_name||'Pelanggan'}</td><td>{t.created_by_name||'Petugas'}</td><td>{shortTime(t.created_at)}</td><td>{t.status==='waiting'?'—':(t.counter_label||'Loket')}</td><td><span className={`status-pill ${t.status==='waiting'?'status-waiting':t.status==='done'?'status-paid':t.status==='skipped'?'status-inactive':'status-serving'}`}>{({waiting:'Menunggu',called:'Dipanggil',serving:'Dilayani',done:'Selesai',skipped:'Dilewati'})[t.status]}</span></td><td><div className="row-actions">{settings?.queue_enabled!==false&&t.status==='waiting'&&<button className="btn btn-small btn-primary" disabled={queueBusy} title={queueCounterLabel.trim() ? 'Panggil nomor antrean' : 'Nama loket akan menggunakan nama akun Anda'} onClick={()=>updateTicket(t,'called')}><Bell size={13}/> Panggil</button>}{settings?.queue_enabled!==false&&t.status==='called'&&<button className="btn btn-small btn-outline" onClick={()=>updateTicket(t,'serving')}>Layani</button>}{settings?.queue_enabled!==false&&['called','serving'].includes(t.status)&&<button className="btn btn-small btn-primary" onClick={()=>updateTicket(t,'done')}><Check size={13}/> Selesai</button>}{settings?.queue_enabled!==false&&t.status==='waiting'&&<button className="icon-button" title="Lewati" onClick={()=>updateTicket(t,'skipped')}><SkipForward size={15}/></button>}</div></td></tr>)}</tbody></table></div>}<Pagination page={queuePage} total={queue.length} pageSize={listPageSize} onChange={setQueuePage}/></div></section>}

        {page==='monitoring'&&['owner','admin','manager'].includes(membership?.role)&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">OPERATIONS / LIVE MONITORING</span><h1>Monitoring <span className="heading-accent">kasir aktif.</span></h1><p>Pantau kasir yang sedang membuka sesi, transaksi, dan nilai penjualan pada toko ini. Data aktivitas tersinkron secara real-time.</p></div><span className="date-pill"><i className="live-dot"/> LIVE</span></div>{staleShiftRows.length>0&&<div className="panel" style={{border:'2px solid #d97706',background:'rgba(217,119,6,0.07)',marginBottom:18}}><div className="panel-head"><div><h3 style={{color:'#b45309'}}><Clock3 size={18}/> Peringatan sesi kasir belum ditutup</h3><p>{staleShiftRows.length} sesi terbuka lebih dari 12 jam. Ini hanya peringatan; sistem tidak menutup sesi otomatis.</p></div><span className="status-pill" style={{background:'#fef3c7',color:'#92400e'}}>PERIKSA SESI</span></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai sesi</th><th>Durasi terbuka</th></tr></thead><tbody>{staleShiftRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><strong>{row.elapsedHours} jam</strong></td></tr>)}</tbody></table></div></div>}{overdueBreakRows.length>0&&<div className="panel" style={{border:'2px solid #dc2626',background:'rgba(220,38,38,0.07)',marginBottom:18}}><div className="panel-head"><div><h3 style={{color:'#b91c1c'}}><Bell size={18}/> Peringatan istirahat melewati batas</h3><p>{overdueBreakRows.length} kasir perlu ditindaklanjuti. Bunyi pengingat lokal berulang setiap {breakSettings.repeat_reminder_minutes||5} menit saat halaman monitoring terbuka.</p></div><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span className="status-pill" style={{background:'#fee2e2',color:'#991b1b'}}>ESKALASI</span><button type="button" className="btn btn-small btn-outline" onClick={enableMonitoringSound}>{monitoringSoundReady?'Suara aktif':'Aktifkan suara'}</button></div></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Durasi istirahat</th><th>Melewati batas</th><th>Mulai istirahat</th><th>Aksi</th></tr></thead><tbody>{overdueBreakRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td><strong style={{color:'#b91c1c'}}>{row.elapsedMinutes} menit</strong></td><td>{row.overdueMinutes} menit</td><td>{new Date(row.started_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td><button type="button" className="btn btn-small btn-primary" disabled={sendingBreakAlert===row.cashier_id} onClick={()=>sendBreakAlert(row)}>{sendingBreakAlert===row.cashier_id?'Mengirim…':'Kirim Peringatan'}</button></td></tr>)}</tbody></table></div></div>}
        <div className="stats-grid report-finance-stats"><StatCard icon={Users} label="Kasir aktif" value={openCashierShifts.length.toLocaleString('id-ID')} meta="Sesi yang masih terbuka" tone="violet"/><StatCard icon={ShoppingBag} label="Transaksi aktif" value={monitoringTransactionTotal.toLocaleString('id-ID')} meta="Transaksi lunas sejak sesi dibuka" tone="blue"/><StatCard icon={Wallet} label="Penjualan sesi aktif" value={money(monitoringSalesTotal)} meta="Akumulasi transaksi lunas kasir aktif" tone="orange"/></div><div className="panel report-panel"><div className="panel-head"><div><h3><Users size={17}/> Daftar kasir aktif</h3><p>Urutan mengikuti waktu mulai sesi; yang mulai lebih dahulu berada di atas.</p></div><span className="result-count">{monitoringCashierRows.length} kasir</span></div><div className="report-filter-grid"><label>Cari kasir<input className="text-input" type="search" value={monitoringSearch} onChange={e=>setMonitoringSearch(e.target.value)} placeholder="Nama, email, atau ID kasir…"/></label></div><div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai aktif</th><th>Durasi sesi</th><th>Modal awal</th><th>Transaksi lunas</th><th>Total penjualan</th><th>Status</th></tr></thead><tbody>{monitoringCashierRows.map(row=><tr key={row.id}><td><strong>{row.displayName}</strong></td><td>{new Date(row.opened_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{(()=>{const mins=Math.max(0,Math.floor((Date.now()-new Date(row.opened_at).getTime())/60000));return mins>=60?Math.floor(mins/60)+' jam '+(mins%60)+' menit':mins+' menit'})()}</td><td>{money(row.opening_cash)}</td><td>{row.transactionCount.toLocaleString('id-ID')}</td><td className="strong">{money(row.salesTotal)}</td><td>{monitoringBreakRows.some(item=>item.shift_id===row.id)?<span className="status-pill status-waiting">Istirahat · {monitoringBreakRows.find(item=>item.shift_id===row.id)?.elapsedMinutes} mnt</span>:<span className="status-pill status-paid">Aktif melayani</span>}</td></tr>)}</tbody></table></div>{monitoringCashierRows.length===0&&<EmptyState icon={Users} title={openCashierShifts.length?'Kasir tidak ditemukan':'Belum ada kasir aktif'} text={openCashierShifts.length?'Coba kata pencarian lain.':'Kasir yang membuka sesi akan muncul otomatis di sini.'}/>}</div><div className="panel report-panel"><div className="panel-head"><div><h3><Clock3 size={17}/> Riwayat istirahat 7 hari terakhir</h3><p>Riwayat berakhir tersimpan untuk audit operasional.</p></div><span className="result-count">{breakHistory.length} catatan</span></div>{breakHistory.length===0?<p className="subtle" style={{padding:16}}>Belum ada istirahat yang selesai dalam 7 hari terakhir.</p>:<div className="table-wrap"><table><thead><tr><th>Kasir</th><th>Mulai</th><th>Kembali</th><th>Durasi</th></tr></thead><tbody>{breakHistory.map(row=>{const member=teamMembers.find(item=>item.user_id===row.cashier_id);const duration=Math.max(0,Math.floor((new Date(row.ended_at).getTime()-new Date(row.started_at).getTime())/60000));return <tr key={row.id}><td>{member?.full_name||member?.email||'Kasir '+row.cashier_id.slice(0,8)}</td><td>{new Date(row.started_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{new Date(row.ended_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td>{duration} menit</td></tr>})}</tbody></table></div>}</div><div className="panel shift-form"><div className="panel-head"><div><h3><ShieldCheck size={17}/> Catatan monitoring</h3><p>Status aktif berarti sesi kasir masih terbuka, bukan jaminan perangkat sedang online atau digunakan saat ini.</p></div></div><p className="subtle">Istirahat tidak menutup sesi kasir. Durasi dan riwayat istirahat tersimpan; peringatan suara berjalan saat halaman monitoring admin/owner terbuka dan browser mengizinkan audio. Sesi yang terlupa ditutup tidak ditutup otomatis.</p></div></section>}

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

        {page==='team'&&membership.role==='owner'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">TEAM / ACCESS CONTROL</span><h1>Karyawan <span className="heading-accent">& akses.</span></h1><p>Undang akun baru dan atur jabatan khusus untuk toko ini.</p></div><span className="role-chip"><ShieldCheck size={14}/> Owner</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={inviteTeamMember}><div className="panel-head"><div><h3><UserPlus size={17}/> Daftarkan karyawan</h3><p>Undangan hanya berlaku untuk email ini. Karyawan harus aktivasi dan membuat password sebelum login.</p></div></div><label>Nama karyawan</label><input className="text-input" name="full_name" placeholder="Nama lengkap" required/><label>Email akun</label><input className="text-input" type="email" name="email" placeholder="karyawan@email.com" required/><label>Jabatan di toko</label><select className="text-input" name="role" defaultValue="cashier"><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-primary" disabled={teamSaving}>{teamSaving?<span className="spinner"/>:<UserPlus size={16}/>} Buat undangan</button><p className="permission-note">Undangan berlaku 30 hari. Akun tidak mendapatkan akses ke tenant lain.</p></form><div className="panel"><div className="panel-head"><div><h3><Users size={17}/> Anggota toko</h3><p>{teamMembers.length} akun terdaftar</p></div></div>{teamMembers.length===0?<EmptyState icon={Users} title="Belum ada karyawan" text="Akun Owner akan muncul di sini."/>:<div className="table-wrap"><table><thead><tr><th>Nama / email</th><th>Jabatan</th><th>Akses</th><th>Bergabung</th><th>Kelola</th></tr></thead><tbody>{teamMembers.slice((teamMemberPage-1)*listPageSize,teamMemberPage*listPageSize).map(m=><tr key={m.id}><td><strong>{m.full_name?.trim()||'Akun toko'}</strong>{m.email&&<><br/><small className="member-email-visible">{m.email}</small></>}</td><td><span className="status-pill status-serving">{m.role==='owner'?'Owner':m.role==='admin'?'Admin':m.role==='manager'?'Manager':'Kasir'}</span></td><td><span className={'status-pill '+(m.is_active?'status-paid':'status-inactive')}>{m.is_active?'Aktif':'Nonaktif'}</span></td><td>{new Date(m.created_at).toLocaleDateString('id-ID')}</td><td>{m.role!=='owner'&&<div className="member-manage-cell"><form className="member-role-form" onSubmit={saveTeamMemberRole}><input type="hidden" name="member_id" value={m.id}/><input type="hidden" name="is_active" value={String(m.is_active)}/><input className="text-input member-name-edit" name="full_name" defaultValue={m.full_name||''} aria-label={'Nama '+(m.email||m.user_id)} required minLength={2}/><select className="text-input" name="role" defaultValue={m.role==='admin'?'admin':'cashier'} aria-label={'Jabatan '+(m.email||m.user_id)}><option value="admin">Admin</option><option value="cashier">Kasir</option></select><button className="btn btn-small btn-outline">Simpan</button></form><div className="member-manage-actions"><button className={'btn btn-small '+(m.is_active?'btn-outline':'btn-primary')} onClick={()=>toggleTeamMember(m)}>{m.is_active?'Nonaktifkan':'Aktifkan'}</button><button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamMember(m)}><Trash2 size={13}/> Hapus permanen</button></div></div>}</td></tr>)}</tbody></table></div>}<Pagination page={teamMemberPage} total={teamMembers.length} pageSize={listPageSize} onChange={setTeamMemberPage}/></div></div><div className="panel team-invites-panel"><div className="panel-head"><div><h3><Mail size={17}/> Riwayat undangan</h3><p>Undangan aktif dan yang sudah diterima</p></div></div>{teamInvites.length===0?<p className="subtle">Belum ada undangan.</p>:<div className="table-wrap"><table><thead><tr><th>Email</th><th>Jabatan</th><th>Status</th><th>Kedaluwarsa</th><th>Aksi</th></tr></thead><tbody>{teamInvites.slice((teamInvitePage-1)*listPageSize,teamInvitePage*listPageSize).map(i=><tr key={i.id}><td><strong>{i.full_name?.trim()||'Undangan'}</strong><br/><small className="member-email-visible">{i.email}</small></td><td>{i.role==='owner'?'Owner':i.role==='admin'?'Admin':'Kasir'}</td><td><span className={'status-pill '+(i.accepted_at?'status-paid':new Date(i.expires_at)<new Date()?'status-inactive':'status-waiting')}>{i.accepted_at?'Diterima':new Date(i.expires_at)<new Date()?'Kedaluwarsa':'Menunggu'}</span></td><td>{new Date(i.expires_at).toLocaleDateString('id-ID')}</td><td><div className="member-manage-actions">{!i.accepted_at&&<button className="btn btn-small btn-outline" disabled={teamSaving} onClick={()=>regenerateTeamInviteCode(i)}><KeyRound size={13}/> Buat ulang kode</button>}<button className="btn btn-small btn-outline danger-icon" onClick={()=>deleteTeamInvite(i)}><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div>}<Pagination page={teamInvitePage} total={teamInvites.length} pageSize={listPageSize} onChange={setTeamInvitePage}/></div></section>}

        {page==='profile'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">ACCOUNT / SECURITY</span><h1>Profil <span className="heading-accent">& keamanan.</span></h1><p>Perbarui nama, ganti PIN 4 angka, dan ubah password akun Anda.</p></div><span className="role-chip"><ShieldCheck size={14}/> Terverifikasi</span></div><div className="settings-grid"><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.rpc('update_my_profile',{p_full_name:String(f.get('full_name')||'').trim()});if(error){setNotice(userFacingError(error));return}setNotice('Profil diperbarui.');await loadWorkspace()}}><div className="panel-head"><div><h3><UserRound size={17}/> Profil akun</h3><p>Email login: {session.user.email}</p></div></div><label>Nama lengkap</label><input className="text-input" name="full_name" defaultValue={session.user.user_metadata?.full_name||membership?.full_name||''} required minLength={2} maxLength={120}/><label>Email akun</label><input className="text-input" value={session.user.email||''} readOnly/><button className="btn btn-primary"><Check size={16}/> Simpan profil</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_pin')||'');const next=String(f.get('new_pin')||'');const confirmPin=String(f.get('confirm_pin')||'');if(!/^\d{4}$/.test(next)||next!==confirmPin){setNotice('PIN baru harus tepat 4 angka dan konfirmasinya harus sama.');return}const {data,error}=await supabase.rpc('change_my_pin',{p_current_pin:current,p_new_pin:next});if(error){setNotice(userFacingError(error));return}if(data!==true){setNotice('PIN saat ini salah. Percobaan gagal tercatat untuk pembatasan keamanan.');return}form.reset();setNotice('PIN berhasil diganti. Sesi keamanan diperbarui.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti PIN</h3><p>PIN hanya terdiri dari 4 angka. Jangan bagikan kepada siapa pun.</p></div></div><label>PIN saat ini</label><input className="text-input" name="current_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>PIN baru</label><input className="text-input" name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><label>Ulangi PIN baru</label><input className="text-input" name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti PIN</button></form><form className="panel settings-form" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const current=String(f.get('current_password')||'');const next=String(f.get('new_password')||'');const confirmPassword=String(f.get('confirm_password')||'');if(next.length<8||next!==confirmPassword){setNotice('Password baru minimal 8 karakter dan konfirmasinya harus sama.');return}const reauth=await supabase.auth.signInWithPassword({email:session.user.email,password:current});if(reauth.error){setNotice('Password saat ini salah.');return}const changed=await supabase.auth.updateUser({password:next});if(changed.error){setNotice(userFacingError(changed.error, 'Password belum berhasil diganti. Periksa kembali lalu coba lagi.'));return}form.reset();setNotice('Password berhasil diganti. Silakan verifikasi PIN kembali jika diminta.')}}><div className="panel-head"><div><h3><ShieldCheck size={17}/> Ganti password</h3><p>Gunakan password unik minimal 8 karakter.</p></div></div><label>Password saat ini</label><input className="text-input" name="current_password" type="password" autoComplete="current-password" required/><label>Password baru</label><input className="text-input" name="new_password" type="password" autoComplete="new-password" minLength={8} required/><label>Ulangi password baru</label><input className="text-input" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required/><button className="btn btn-primary"><ShieldCheck size={16}/> Ganti password</button></form></div></section>}
        {page==='organization-settings'&&membership?.role==='owner'&&<OwnerOrganizationSettings session={session}/>}
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
  const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true)
  const [usersLoading,setUsersLoading]=useState(false)
  const [usersError,setUsersError]=useState('')
  const [notice,setNotice]=useState('')
  const [ownerActivationCard,setOwnerActivationCard]=useState(null)
  const [ownerActivationCopied,setOwnerActivationCopied]=useState(false)
  const [registering,setRegistering]=useState(false)
  const [duration,setDuration]=useState('30')
  const [customDays,setCustomDays]=useState('14')
  const [disabledMembers,setDisabledMembers]=useState([])
  const [disabledLoading,setDisabledLoading]=useState(false)
  const [deletingUserId,setDeletingUserId]=useState('')
  const [userActionId,setUserActionId]=useState('')
  const [section,setSection]=useState('dashboard')
  const [selectedTenant,setSelectedTenant]=useState(null)
  const [sectionRestored,setSectionRestored]=useState(false)
  const [mobileNav,setMobileNav]=useState(false)

  // Restore the last Admin Super section per authenticated account after a reload.
  // Only navigation state is persisted; sensitive credentials and activation codes are never stored here.
  useEffect(()=>{
    const userId=session?.user?.id
    if(!userId)return
    const allowedSections=new Set(['dashboard','stores','users','disabled','support','promotions','subscription-plans'])
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
    const {data,error}=await supabase.from('stores').select('id,name,owner_name,owner_email,status,activated_at,expires_at,activation_days,created_at,deleted_at').order('created_at',{ascending:false})
    if(error){setTenants([]);setNotice(userFacingError(error));setLoading(false);return}
    const storeIds=(data||[]).map(tenant=>tenant.id)
    const settingsResult=storeIds.length ? await supabase.from('store_settings').select('store_id,store_name').in('store_id',storeIds) : {data:[],error:null}
    if(settingsResult.error)setNotice('Nama toko sebagian belum dapat disinkronkan. Coba muat ulang atau hubungi admin.')
    const settingsByStore=new Map((settingsResult.data||[]).map(row=>[row.store_id,row.store_name]))
    setTenants((data||[]).map(tenant=>({...tenant,name:String(settingsByStore.get(tenant.id)||'').trim()||tenant.name})))
    setLoading(false)
  },[])
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
  const statusOf=(tenant)=>tenant.status==='active'&&tenant.expires_at&&new Date(tenant.expires_at)<=new Date()?'expired':tenant.status
  const loadDisabledMembers=useCallback(async()=>{setDisabledLoading(true);const {data,error}=await supabase.rpc('super_admin_list_disabled_members');if(error){setDisabledMembers([]);setNotice(userFacingError(error))}else setDisabledMembers(data||[]);setDisabledLoading(false)},[])
  useEffect(()=>{loadDisabledMembers()},[loadDisabledMembers])
  // Super Admin lists update from database events; no polling.
  useEffect(()=>{
    const channel=supabase.channel('nexapos-super-admin-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'stores'},()=>{load();loadUsers()})
      .on('postgres_changes',{event:'*',schema:'public',table:'store_settings'},()=>load())
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
    const ownerEmail=String(form.get('owner_email')||'').trim()
    setRegistering(true)
    const {error}=await supabase.rpc('register_store_tenant',{p_store_name:String(form.get('store_name')||'').trim(),p_owner_name:String(form.get('owner_name')||'').trim(),p_owner_email:ownerEmail,p_activation_code:activationCode})
    setRegistering(false)
    if(error){setNotice(userFacingError(error));return}
    event.currentTarget.reset()
    setOwnerActivationCopied(false)
    setOwnerActivationCard({email:ownerEmail,code:activationCode,title:'Kode aktivasi Owner'})
    setNotice('Tenant terdaftar. Kode aktivasi ditampilkan di kartu; kirimkan secara pribadi kepada Owner. Aktifkan tenant setelah siap.')
    await load()
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
  const activate=async(tenant)=>{
    const days=duration==='custom'?Number(customDays):Number(duration)
    if(!Number.isInteger(days)||days<1||days>3650){setNotice('Durasi khusus harus 1–3650 hari.');return}
    const {error}=await supabase.rpc('activate_store_tenant',{p_store_id:tenant.id,p_duration_days:days})
    if(error){setNotice(userFacingError(error));return}
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
    if(error){setNotice(userFacingError(error));return}
    setNotice('Akun '+label+' berhasil dihapus permanen.')
    await Promise.all([loadDisabledMembers(),loadUsers()])
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
    const action=nextStatus==='suspended'?'Nonaktifkan sementara '+tenant.name+'?':'Kembalikan '+tenant.name+' ke status menunggu aktivasi?'
    if(!confirm(action))return
    const {error}=await supabase.rpc('set_store_tenant_status',{p_store_id:tenant.id,p_status:nextStatus})
    if(error){setNotice(userFacingError(error));return}
    setNotice('Status tenant diperbarui.')
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
    }catch(error){setNotice(userFacingError(error, 'Reset password gagal. Coba lagi.'))}
    finally{setUserActionId('')}
  }
  const deleteUser=async(user)=>{
    if(user.is_super_admin||user.user_id===session.user.id){setNotice('Akun Super Admin tidak dapat dihapus dari menu ini.');return}
    const confirmation=prompt('HAPUS PERMANEN AKUN\\nKeanggotaan, undangan terkait, PIN, dan kredensial login akan dihapus.\\n\\nKetik HAPUS '+user.email+' untuk melanjutkan.')
    if(confirmation!=='HAPUS '+user.email)return
    setUserActionId(user.user_id)
    const {error}=await supabase.rpc('super_admin_delete_user',{p_user_id:user.user_id})
    setUserActionId('')
    if(error){setNotice(userFacingError(error));return}
    setNotice('Akun dan kredensial terkait dihapus permanen.')
    await Promise.all([loadUsers(),loadDisabledMembers(),load()])
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
    const targetRole=prompt('Pilih role di '+target.name+': admin, manager, atau cashier.\nOwner tidak dapat dipilih.','cashier')
    if(targetRole===null)return
    const normalizedRole=targetRole.trim().toLowerCase()
    if(!['admin','manager','cashier'].includes(normalizedRole)){setNotice('Role tidak valid. Pilih admin, manager, atau cashier.');return}
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
    const matches=!q||[t.name,t.owner_name,t.owner_email,t.id].some(v=>String(v||'').toLowerCase().includes(q))
    const status=statusOf(t)
    return matches&&(tenantStatus==='all'||status===tenantStatus)
  })
  const filteredUsers=users.filter(u=>{
    const q=userSearch.trim().toLowerCase()
    const matches=!q||[u.email,u.full_name,u.user_id,u.store_names,u.tenant_roles].some(v=>String(v||'').toLowerCase().includes(q))
    return matches&&(userStatus==='all'||(userStatus==='blocked'?u.is_banned:!u.is_banned))
  })
  const navItems=[['dashboard','Ringkasan',LayoutDashboard],['stores','Manajemen toko',Store],['users','Manajemen user',Users],['disabled','Akun staf nonaktif',Ban],['support','Pusat bantuan',Headphones],['platform-staff','Tim & Hak Akses',UserPlus],['audit-logs','Audit Log',FileText],['promotions','Promo & Diskon',Ticket],['subscription-plans','Kelola Langganan & Harga',CreditCard]]
  const selectSection=(id)=>{setSection(id);setMobileNav(false)}
  const pageTitle={dashboard:'Ringkasan platform',stores:'Manajemen toko','store-control':'Pusat Kendali Toko',users:'Manajemen user',disabled:'Akun staf nonaktif',support:'Pusat bantuan','platform-staff':'Tim & Hak Akses','audit-logs':'Audit Log',promotions:'Promo & Diskon', 'subscription-plans':'Kelola Langganan & Harga'}[section]
  if(section==='platform-staff') return <div className="app-shell super-admin-shell"><aside className={"sidebar "+(mobileNav?'sidebar-open':'')}><div className="sidebar-brand"><Brand/></div><div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</strong><small>Kontrol seluruh tenant</small></span></div><nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div>{navItems.map(([id,label,Icon])=><button key={id} className={"nav-link "+(section===id?'nav-active':'')} onClick={()=>selectSection(id)}><Icon size={18}/><span>{label}</span></button>)}</div></nav><div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">{initial(session.user.email)}</span><span className="user-copy"><strong>{session.user.email}</strong><small>{platformAdmin ? 'Admin NEXAPOS' : 'Super Admin'}</small></span><button className="icon-button" title="Keluar" onClick={onSignOut}><LogOut size={17}/></button></div></div></aside><main className="main-area"><header className="topbar"><div className="topbar-title-group"><div className="breadcrumb">Platform <span>/</span> <strong>Tim & Hak Akses</strong></div><div className="topbar-date">Kelola akun Admin NEXAPOS</div></div><div className="topbar-actions"><WibClock/><span className="role-chip"><ShieldCheck size={14}/> {platformAdmin ? 'ADMIN NEXAPOS' : 'SUPER ADMIN'}</span></div></header><PlatformStaffManager onBack={()=>setSection('dashboard')}/></main></div>;
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
        {section==='audit-logs'&&<PlatformAuditLog onBack={()=>setSection('dashboard')}/>}
        {section==='store-control'&&<StoreControlCenter tenant={selectedTenant} onBack={()=>setSection('stores')} onActivate={activate} onStatusChange={changeStatus} onOpenSupport={()=>setSection('support')}/>}
         {section==='support'&&<section className="page-section support-admin-page"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / SUPPORT</span><h1>Pusat <span className="heading-accent">bantuan.</span></h1><p>Atur WhatsApp dan Telegram, serta tangani percakapan live chat tenant.</p></div><span className="date-pill"><Headphones size={14}/> Sinkron realtime</span></div><SupportCenter session={session} isSuperAdmin embedded onClose={()=>setSection('dashboard')}/></section>}
        {section==='dashboard'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM CONTROL / OVERVIEW</span><h1>Kontrol <span className="heading-accent">platform.</span></h1><p>Kelola akun, tenant, dan akses dari satu panel terpusat.</p></div><span className="date-pill"><ShieldCheck size={14}/> Akses istimewa</span></div><div className="stats-grid"><StatCard icon={Store} label="Total tenant" value={tenants.filter(t=>statusOf(t)!=='deleted').length} meta={'Dikelola permanen'} tone="violet"/><StatCard icon={CheckCircle2} label="Aktif" value={activeCount} meta="Masa aktivasi berlaku" tone="green"/><StatCard icon={CalendarDays} label="Kedaluwarsa" value={expiredCount} meta="Menunggu reaktivasi" tone="orange"/><StatCard icon={Users} label="Akun user" value={users.length} meta={users.filter(u=>u.is_banned).length+' akun dinonaktifkan'} tone="blue"/></div><div className="admin-shortcuts"><button className="admin-shortcut" onClick={()=>selectSection('stores')}><span><Store size={20}/></span><strong>Kelola toko</strong><small>Cari tenant, aktivasi, arsip/hapus</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('users')}><span><Users size={20}/></span><strong>Manajemen user</strong><small>Daftar akun dan kontrol akses login</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('disabled')}><span><Ban size={20}/></span><strong>Akun staf nonaktif</strong><small>Tinjau dan bersihkan akun yang memenuhi syarat</small><ArrowRight size={16}/></button><button className="admin-shortcut" onClick={()=>selectSection('support')}><span><Headphones size={20}/></span><strong>Pusat bantuan</strong><small>Atur WhatsApp, Telegram, dan live chat</small><ArrowRight size={16}/></button></div></section>}
        {section==='stores'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / TENANTS</span><h1>Manajemen <span className="heading-accent">toko.</span></h1><p>Daftarkan tenant, cari/filter toko, atur masa aktif, atau hapus dari operasional.</p></div><span className="date-pill"><Store size={14}/> {tenants.length} tenant</span></div><div className="panel super-register-panel"><div className="panel-head"><div><h3><UserPlus size={17}/> Pendaftaran toko baru</h3><p>Akun Owner terikat ke email yang didaftarkan dan harus mengaktifkan akun melalui halaman masuk.</p></div></div><form className="tenant-register-form" onSubmit={submitTenant}><div><label>Nama toko</label><input className="text-input" name="store_name" placeholder="Contoh: Toko Sejahtera" required/></div><div><label>Nama pemilik toko</label><input className="text-input" name="owner_name" placeholder="Nama lengkap Owner" required/></div><div><label>Email akun Owner</label><input className="text-input" type="email" name="owner_email" placeholder="owner@tokonya.com" required/></div><button className="btn btn-primary" disabled={registering}>{registering?<span className="spinner"/>:<Plus size={16}/>} Daftarkan toko</button></form></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Store size={17}/> Daftar toko / tenant</h3><p>Daftar dipaginasi; penghapusan tenant menghapus seluruh data terkait secara permanen.</p></div><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Refresh</button></div><div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={tenantSearch} onChange={e=>{setTenantSearch(e.target.value);setTenantPage(1)}} placeholder="Cari nama toko, owner, email, atau ID…"/></div><select className="text-input" value={tenantStatus} onChange={e=>{setTenantStatus(e.target.value);setTenantPage(1)}}><option value="all">Semua status</option><option value="active">Aktif</option><option value="pending">Menunggu aktivasi</option><option value="expired">Kedaluwarsa</option><option value="suspended">Nonaktif</option><option value="deleted">Tenant lama diarsipkan</option></select></div><div className="activation-toolbar"><label>Durasi aktivasi <select className="text-input" value={duration} onChange={e=>setDuration(e.target.value)}><option value="30">30 hari</option><option value="7">7 hari</option><option value="3">3 hari</option><option value="custom">Custom</option></select></label>{duration==='custom'&&<label>Jumlah hari <input className="text-input" type="number" min="1" max="3650" value={customDays} onChange={e=>setCustomDays(e.target.value)}/></label>}</div>{loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:filteredTenants.length===0?<EmptyState icon={Store} title="Toko tidak ditemukan" text="Ubah kata kunci atau filter status."/>:<><div className="table-wrap"><table><thead><tr><th>Toko / Owner</th><th>Status</th><th>Tanggal aktivasi</th><th>Kedaluwarsa</th><th>Aksi</th></tr></thead><tbody>{filteredTenants.slice((tenantPage-1)*pageSize,tenantPage*pageSize).map(t=>{const status=statusOf(t);return <tr key={t.id}><td><strong>{t.name}</strong><br/><small>{t.owner_name||'Nama owner belum tersedia'} · {t.owner_email||'Email belum tersedia'}</small><br/><small>Dibuat {new Date(t.created_at).toLocaleDateString('id-ID')}</small></td><td><span className={'status-pill '+(status==='active'?'status-paid':status==='pending'?'status-waiting':status==='expired'?'status-inactive':'status-serving')}>{({active:'Aktif',pending:'Menunggu aktivasi',expired:'Kedaluwarsa',suspended:'Dinonaktifkan',deleted:'Tenant lama diarsipkan'})[status]||status}</span></td><td>{t.activated_at?<><strong>{new Date(t.activated_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'long',year:'numeric'})}</strong><br/><small>Jam {new Date(t.activated_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false})} WIB</small></>:'Belum diaktivasi'}</td><td>{t.expires_at?<><strong>{new Date(t.expires_at).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'long',year:'numeric'})}</strong><br/><small>{status==='active'?'Berakhir pukul '+new Date(t.expires_at).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false})+' WIB':'Tanggal berakhir tercatat'}</small></>:'Belum ditentukan'}</td><td><div className="tenant-actions"><button className="btn btn-small btn-outline" onClick={()=>{setSelectedTenant(t);setSection('store-control')}}><Activity size={13}/> Pusat Kendali</button><button className="btn btn-small btn-outline" onClick={()=>regenerateOwnerInvite(t)} disabled={status==='deleted'||registering}><KeyRound size={13}/> Kode undangan Owner</button><button className="btn btn-small btn-primary" onClick={()=>activate(t)} disabled={status==='deleted'}><CheckCircle2 size={13}/>{status==='active'?'Perpanjang / reaktivasi':'Aktivasi'}</button>{!['suspended','deleted'].includes(status)&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'suspended')}><Ban size={13}/> Nonaktifkan</button>}{status==='suspended'&&<button className="btn btn-small btn-outline" onClick={()=>changeStatus(t,'pending')}>Jadikan pending</button>}{<button className="btn btn-small btn-outline danger-icon" onClick={()=>changeStatus(t,'deleted')} title="Hapus permanen"><Trash2 size={14}/> Hapus permanen</button>}</div></td></tr>})}</tbody></table></div><Pagination page={tenantPage} total={filteredTenants.length} pageSize={pageSize} onChange={setTenantPage}/></>}</div></section>}
        {section==='users'&&<section className="page-section"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / ACCOUNT CONTROL</span><h1>Manajemen <span className="heading-accent">user.</span></h1><p>Seluruh akun autentikasi, tenant terkait, dan kontrol akses login.</p></div><span className="date-pill"><Users size={14}/> {users.length} akun</span></div><div className="panel tenant-list-panel"><div className="panel-head"><div><h3><Users size={17}/> Seluruh akun</h3><p>Akun Super Admin dilindungi dari perubahan dan penghapusan akun.</p></div><button className="btn btn-outline btn-small" onClick={loadUsers}><RefreshCw size={14}/> Refresh</button></div><div className="admin-filter-row"><div className="search-box"><Search size={17}/><input value={userSearch} onChange={e=>{setUserSearch(e.target.value);setUserPage(1)}} placeholder="Cari email, nama, ID user, atau toko…"/></div><select className="text-input" value={userStatus} onChange={e=>{setUserStatus(e.target.value);setUserPage(1)}}><option value="all">Semua akun</option><option value="active">Login aktif</option><option value="blocked">Login dinonaktifkan</option></select></div>{usersLoading?<div className="empty-state"><span className="spinner spinner-large"/></div>:usersError?<div className="empty-state"><strong>Daftar akun gagal dimuat</strong><p>{usersError}</p><button className="btn btn-outline btn-small" onClick={loadUsers}><RefreshCw size={14}/> Coba lagi</button></div>:filteredUsers.length===0?<EmptyState icon={Users} title="Akun tidak ditemukan" text="Coba kata kunci atau filter lain."/>:<><div className="table-wrap"><table><thead><tr><th>Akun</th><th>Tenant</th><th>Role & status tenant</th><th>Keanggotaan</th><th>Terakhir masuk</th><th>Status login</th><th>Aksi</th></tr></thead><tbody>{filteredUsers.slice((userPage-1)*pageSize,userPage*pageSize).map(u=><tr key={u.user_id}><td><strong>{u.full_name||u.email||'Tanpa nama'}</strong><br/><small>{u.email||'Email tidak tersedia'}</small><br/><small className="mono">{u.user_id}</small></td><td>{u.store_names||'Belum terhubung ke tenant'}</td><td>{u.tenant_roles|| (u.is_super_admin?'Super Admin — akses platform':'Belum memiliki role tenant')}</td><td>{u.active_memberships} aktif / {u.membership_count} total</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('id-ID'):'Belum pernah masuk'}</td><td><span className={'status-pill '+(u.is_super_admin?'status-serving':u.is_banned?'status-inactive':'status-paid')}>{u.is_super_admin?'Super Admin':u.is_banned?'Dinonaktifkan':'Aktif'}</span></td><td>{u.is_super_admin?<span className="subtle">Dilindungi</span>:<div className="user-admin-actions"><button className={'btn btn-small '+(u.is_banned?'btn-primary':'btn-outline')} disabled={userActionId===u.user_id} onClick={()=>toggleUserBan(u)}>{u.is_banned?'Aktifkan login':'Nonaktifkan login'}</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>moveUserToTenant(u)}><Store size={13}/> Pindahkan tenant</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPin(u)}><ShieldCheck size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" disabled={userActionId===u.user_id} onClick={()=>resetUserPassword(u)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" disabled={userActionId===u.user_id} onClick={()=>deleteUser(u)}><Trash2 size={13}/> Hapus permanen</button></div>}</td></tr>)}</tbody></table></div><Pagination page={userPage} total={filteredUsers.length} pageSize={pageSize} onChange={setUserPage}/></>}</div></section>}
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
  const [tvSettings,setTvSettings]=useState(null)
  const [tvMedia,setTvMedia]=useState([])
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
  const load=useCallback(async()=>{if(!session?.user)return;setError('');const {data:members,error}=await supabase.from('store_members').select('store_id').eq('user_id',session.user.id).eq('is_active',true).order('created_at',{ascending:true});if(error||!members?.length){setError(userFacingError(error, 'Akun tidak memiliki akses toko aktif.'));return}const requestedStore=new URLSearchParams(window.location.search).get('store');if(requestedStore&&!members.some(m=>m.store_id===requestedStore)){setError('Akses ke layar antrian toko ini tidak diizinkan untuk akun Anda.');return}const sid=(members.find(m=>m.store_id===requestedStore)||members[0]).store_id;const [{data:s},{data:cfg},{data:q},{data:tvCfg},{data:tvMediaRows}]=await Promise.all([supabase.from('stores').select('*').eq('id',sid).single(),supabase.from('store_settings').select('*').eq('store_id',sid).maybeSingle(),supabase.from('queue_tickets').select('*').eq('store_id',sid).eq('service_date',today()).order('queue_number'),supabase.from('store_tv_settings').select('*').eq('store_id',sid).maybeSingle(),supabase.from('store_tv_media').select('*').eq('store_id',sid).eq('is_active',true).order('sort_order').order('created_at')]);setStore(s);setSettings(cfg);setTickets(q||[]);setTvSettings(tvCfg||null);setTvMedia(tvMediaRows||[])},[session])
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
  return <PublicQueueScreen display={{store_id:store?.id,store_name:settings?.store_name||store?.name||'NexaPos',settings:{...(tvSettings||{}),queue_prefix:settings?.queue_prefix||'A'},media:tvMedia,current,waiting}} error={error}/>
}

function PublicQueueScreen({display,error}){
  const [soundEnabled,setSoundEnabled]=useState(false)
  const [mediaIndex,setMediaIndex]=useState(0)
  const [showMedia,setShowMedia]=useState(true)
  const current=display?.current||[]
  const waiting=display?.waiting||[]
  const cfg=display?.settings||{}
  const media=display?.media||[]
  const activeCall=current.length>0
  // Without configured media, never use a media-only layout: keep the queue visible.
  const legacyTemplates = { 'modern-blue': 'nexa-cinema', 'minimal-light': 'nexa-showcase', 'premium-dark': 'nexa-overlay', 'queue-media': 'nexa-carousel', professional: 'nexa-grid' }
  const wasLegacyTemplate = Boolean(legacyTemplates[cfg.template])
  const selectedTemplate = legacyTemplates[cfg.template] || cfg.template || 'nexa-cinema'
  const templateLayouts = { 'nexa-cinema': 'split-left', 'nexa-showcase': 'media-top', 'nexa-queue': 'split-left', 'nexa-grid': 'queue-grid', 'nexa-overlay': 'overlay', 'nexa-carousel': 'carousel', 'nexa-smart-loop': 'smart-loop' }
  const configuredLayout = wasLegacyTemplate ? templateLayouts[selectedTemplate] : (cfg.layout_mode || templateLayouts[selectedTemplate] || 'split-left')
  // Keep media visible even when an older saved setting says queue-only.
  const layout = (configuredLayout === 'queue-only' || configuredLayout === 'queue-grid' || selectedTemplate === 'nexa-queue') ? 'split-left' : configuredLayout === 'media-fullscreen' ? 'overlay' : configuredLayout === 'alternate' ? 'smart-loop' : configuredLayout
  const selectedMedia=media.length?media[mediaIndex%media.length]:null
  const sourceUrl=selectedMedia?.source_url || (selectedMedia?.storage_path ? supabase?.storage.from('tv-media').getPublicUrl(selectedMedia.storage_path).data?.publicUrl || '' : '')
  const videoRefVolume=(element)=>{if(element){element.volume=Math.max(0,Math.min(1,Number(cfg.media_volume??35)/100));element.muted=Number(cfg.media_volume??35)===0}}
  const mediaEmbed=useMemo(()=>{
    if(!sourceUrl)return ''
    try{
      const u=new URL(sourceUrl)
      if(u.hostname.includes('youtu.be')){
        const id=u.pathname.split('/').filter(Boolean)[0]
        return id?'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute='+(Number(cfg.media_volume??35)===0?'1':'0')+'&loop=1&playlist='+id+'&controls=0&rel=0':''
      }
      if(u.hostname.includes('youtube.com')){
        const id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()
        return id?'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute='+(Number(cfg.media_volume??35)===0?'1':'0')+'&loop=1&playlist='+id+'&controls=0&rel=0':''
      }
      if(u.hostname.includes('tiktok.com')){
        const match=u.pathname.match(/\/video\/(\d+)/)
        return match?'https://www.tiktok.com/embed/v2/'+match[1]:''
      }
      return ''
    }catch{return ''}
  },[sourceUrl,cfg.media_volume])
  useEffect(()=>{
    if(layout!=='alternate'||activeCall||media.length<1){setShowMedia(true);return}
    const interval=setInterval(()=>setShowMedia(v=>!v),(Number(cfg.rotation_seconds)||20)*1000)
    return()=>clearInterval(interval)
  },[layout,activeCall,media.length,cfg.rotation_seconds])
  useEffect(()=>{
    if(media.length<2)return
    const timer=setInterval(()=>setMediaIndex(i=>(i+1)%media.length),(Number(cfg.rotation_seconds)||20)*1000)
    return()=>clearInterval(timer)
  },[media.length,cfg.rotation_seconds])
  useEffect(()=>{
    if(!soundEnabled||!current[0]?.id||!window.speechSynthesis)return
    const utterance=new SpeechSynthesisUtterance('Nomor antrean '+(cfg.queue_prefix||'A')+String(current[0].queue_number).padStart(3,'0')+', silakan ke '+(current[0].counter_label||'Kasir 1'))
    utterance.lang='id-ID'
    utterance.volume=Math.max(0,Math.min(1,Number(cfg.announcement_volume??100)/100))
    const voices=window.speechSynthesis.getVoices()
    const indonesian=voices.filter(v=>/^id(-|_)/i.test(v.lang)||/indonesia/i.test(v.name))
    const preferred=indonesian.find(v=>cfg.voice_gender==='male'?/male|andika|dimas/i.test(v.name):/female|perempuan|gadis|google.*indonesia/i.test(v.name))||indonesian[0]
    if(preferred)utterance.voice=preferred
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  },[soundEnabled,current[0]?.id,cfg.queue_prefix,cfg.announcement_volume,cfg.voice_gender])
  if(error&&!display)return <div className="tv-login"><Brand/><h1>URL TV tidak tersedia</h1><p>{error}</p><small>Periksa URL dari dashboard tenant atau buat URL TV baru.</small></div>
  if(!display)return <div className="tv-login"><Brand/><h1>Menghubungkan layar TV…</h1><p>Memuat antrean dan pengaturan tenant.</p></div>
  const mediaVisible=Boolean(selectedMedia)&&layout!=='queue-only'
  const queueVisible=true
  const portraitClass = cfg.portrait_background === 'dark' ? 'tv-portrait-dark' : cfg.portrait_background === 'theme' ? 'tv-portrait-theme' : 'tv-portrait-blur'
  const mediaNode=layout!=='queue-only' ? <section className={'tv-media-panel '+portraitClass} key={selectedMedia?.id||'media-placeholder'}>
    {!selectedMedia ? <div className="tv-media-placeholder"><Video size={28}/><strong>Area media / video</strong><small>Tambahkan media melalui Edit Tampilan TV</small></div> :
      /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(sourceUrl)?<img className="tv-media-image" src={sourceUrl} alt={selectedMedia.title}/>:selectedMedia.media_type==='upload'||/\.(mp4|webm|ogg)(\?.*)?$/i.test(sourceUrl)?<><video className="tv-media-backdrop" key={'bg-'+sourceUrl} src={sourceUrl} autoPlay loop muted playsInline aria-hidden="true"/><video className="tv-media-foreground" key={sourceUrl} src={sourceUrl} autoPlay loop playsInline ref={videoRefVolume} onError={()=>{}}/></>:
      mediaEmbed?<iframe title={selectedMedia.title} src={mediaEmbed} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:
      <a className="tv-media-link-card" href={sourceUrl} target="_blank" rel="noreferrer"><Video size={28}/><strong>{selectedMedia.title}</strong><small>Buka media di platform asal</small></a>}
  </section>:null
  return <main className={'tv-screen tv-screen-custom '+(cfg.theme_mode==='dark'?'tv-dark-mode':'tv-light-mode')+' tv-template-'+selectedTemplate} style={{'--tv-custom-primary':cfg.primary_color||'#2563eb','--tv-custom-bg':cfg.background_color||(cfg.theme_mode==='dark'?'#0b1220':'#f8fafc'),'--tv-custom-text':cfg.text_color||(cfg.theme_mode==='dark'?'#f8fafc':'#0f172a'),'--tv-number-size':(cfg.queue_number_size||112)+'px','--tv-name-size':(cfg.customer_name_size||32)+'px','--tv-counter-size':(cfg.counter_size||26)+'px','--tv-next-size':(cfg.next_queue_size||22)+'px','--tv-media-fit':cfg.media_fit==='cover'?'cover':cfg.media_fit==='original'?'none':'contain'}}>
    <header className="tv-header"><Brand/><div><span className="live-status"><i/> LIVE QUEUE</span><div className="tv-store">{display.store_name||'NexaPos'}</div></div><div className="tv-public-actions"><WibClock className="tv-clock" showDate/><button className="tv-sound-enable" onClick={()=>{setSoundEnabled(true);try{window.speechSynthesis?.resume();document.querySelectorAll('.tv-media-foreground').forEach(video=>{video.volume=Math.max(0,Math.min(1,Number(cfg.media_volume??35)/100));video.muted=Number(cfg.media_volume??35)===0;video.play().catch(()=>{})})}catch{}}}>{soundEnabled?'Suara antrean aktif':'Aktifkan suara'}</button></div></header>
    <div className={'tv-content tv-content-custom tv-layout-'+layout+(mediaVisible?' tv-media-fullscreen-active':'')+(layout==='smart-loop'&&waiting.length===0?' tv-smart-loop-idle':'')}>
      {queueVisible&&<section className="tv-current"><span className="eyebrow">NOMOR ANTRIAN DIPANGGIL</span>{current.length?current.map((ticket,index)=><div className={'tv-call '+(index===0?'tv-call-main':'')} key={ticket.id}><span>{(cfg.queue_prefix||'A')+String(ticket.queue_number).padStart(3,'0')}</span>{<strong className="tv-customer-name">{ticket.customer_name?.trim()||'Nama tidak tersedia'}</strong>}<small>{ticket.counter_label?.trim()||'Loket belum ditentukan'}</small></div>):<div className="tv-empty">Menunggu panggilan berikutnya…</div>}<div className="tv-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></section>}
      {queueVisible&&<section className="tv-next"><div className="tv-next-head"><div><span className="eyebrow">ANTRIAN BERIKUTNYA</span><h2>Mohon bersiap</h2></div><span className="tv-count">{waiting.length} menunggu</span></div>{waiting.length?waiting.map(ticket=><div className="tv-next-row" key={ticket.id}><span>{(cfg.queue_prefix||'A')+String(ticket.queue_number).padStart(3,'0')}</span><small>{ticket.customer_name?.trim()||'—'}</small></div>):<div className="tv-next-empty">Tidak ada antrian menunggu</div>}</section>}
      {layout!=='queue-only'&&mediaNode}
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