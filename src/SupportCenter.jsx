import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Headphones, MessageCircle, Send, X, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'

const telegramUsername = (import.meta.env.VITE_TELEGRAM_SUPPORT_USERNAME || '').replace(/^@/, '').trim()
const timeLabel = value => new Date(value).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

export default function SupportCenter({ session, onClose, isSuperAdmin = false, whatsappNumber = '' }) {
  const [mode, setMode] = useState('choices')
  const [messages, setMessages] = useState([])
  const [inbox, setInbox] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [draft, setDraft] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestReady, setGuestReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const userId = session?.user?.id
  const userEmail = session?.user?.email || ''
  const isGuest = !session?.user && !isSuperAdmin
  const guestIdentity = `${guestName.trim()} <${guestEmail.trim()}>`

  const loadMessages = useCallback(async (targetUserId = userId) => {
    if (!targetUserId || !supabase) return
    const { data, error: queryError } = await supabase.from('support_messages').select('*').eq('user_id', targetUserId).order('created_at', { ascending: true }).limit(300)
    if (queryError) { setError(queryError.message); return }
    setMessages(data || [])
    setError('')
  }, [userId])

  const loadInbox = useCallback(async () => {
    if (!isSuperAdmin || !supabase) return
    const { data, error: queryError } = await supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(500)
    if (queryError) { setError(queryError.message); return }
    const grouped = new Map()
    for (const message of data || []) {
      if (!grouped.has(message.user_id)) grouped.set(message.user_id, { user_id: message.user_id, email: message.user_email || 'Pengguna', latest: message, count: 0 })
      const item = grouped.get(message.user_id)
      item.count++
      if (new Date(message.created_at) > new Date(item.latest.created_at)) item.latest = message
      if (!item.email || item.email === 'Pengguna') item.email = message.user_email || item.email
    }
    setInbox([...grouped.values()].sort((a,b) => new Date(b.latest.created_at)-new Date(a.latest.created_at)))
    setError('')
  }, [isSuperAdmin])

  useEffect(() => {
    if (mode === 'chat' && !isSuperAdmin && userId) loadMessages(userId)
    if (mode === 'inbox' && isSuperAdmin) loadInbox()
  }, [mode, isSuperAdmin, userId, loadMessages, loadInbox])

  useEffect(() => {
    if (!supabase || (!userId && !isSuperAdmin)) return
    const channel = supabase.channel('support-live-'+userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, payload => {
        if (!isSuperAdmin && payload.new?.user_id !== userId && payload.old?.user_id !== userId) return
        if (mode === 'chat' && !isSuperAdmin) loadMessages(userId)
        if (mode === 'chat' && isSuperAdmin && activeUser && (payload.new?.user_id === activeUser.user_id || payload.old?.user_id === activeUser.user_id)) loadMessages(activeUser.user_id)
        if (mode === 'inbox' && isSuperAdmin) loadInbox()
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, isSuperAdmin, mode, activeUser, loadMessages, loadInbox])

  const continueAsGuest = async event => {
    event.preventDefault()
    setError('')
    if (!guestName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setError('Masukkan nama dan alamat email yang valid.')
      return
    }
    if (!supabase) { setError('Layanan live chat belum dikonfigurasi.'); return }
    setBusy(true)
    const { data, error: authError } = await supabase.auth.signInAnonymously()
    setBusy(false)
    if (authError || !data?.user) {
      setError('Live chat tamu belum tersedia. Admin perlu mengaktifkan Anonymous Sign-Ins di Supabase Authentication.')
      return
    }
    setGuestReady(true)
    setMode('chat')
  }

  const sendMessage = async event => {
    event.preventDefault()
    const body = draft.trim()
    const targetUser = isSuperAdmin ? activeUser?.user_id : userId
    if (!body || !targetUser || busy) return
    setBusy(true)
    setError('')
    const { error: insertError } = await supabase.from('support_messages').insert({
      user_id: targetUser,
      sender_id: userId,
      user_email: isSuperAdmin ? (activeUser?.email || '') : (isGuest ? guestIdentity : userEmail),
      sender_role: isSuperAdmin ? 'support' : 'customer',
      message: body,
    })
    setBusy(false)
    if (insertError) { setError(insertError.message); return }
    setDraft('')
    await loadMessages(targetUser)
    if (isSuperAdmin) await loadInbox()
  }

  const activeMessages = useMemo(() => messages.filter(m => !isSuperAdmin || m.user_id === activeUser?.user_id), [messages, isSuperAdmin, activeUser])
  const openTelegram = () => {
    if (!telegramUsername) return
    window.open('https://t.me/' + encodeURIComponent(telegramUsername), '_blank', 'noopener,noreferrer')
  }
  const normalizedWhatsApp = String(whatsappNumber || '').replace(/[^0-9]/g, '')
  const openWhatsApp = () => {
    if (!/^\\d{8,15}$/.test(normalizedWhatsApp)) return
    window.open('https://wa.me/' + normalizedWhatsApp, '_blank', 'noopener,noreferrer')
  }

  return <div className="support-overlay" role="dialog" aria-modal="true" aria-label="Pusat Bantuan NexaPos" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="support-modal">
      <header className="support-modal-head"><div className="support-modal-brand"><span className="support-modal-icon"><Headphones size={20}/></span><div><strong>Pusat Bantuan</strong><small>NexaPos · dukungan pengguna</small></div></div><button className="icon-button" aria-label="Tutup pusat bantuan" onClick={onClose}><X size={18}/></button></header>
      {mode === 'guest-form' && isGuest && <div className="support-choices"><span className="eyebrow muted">LIVE CHAT TAMU</span><h2>Sebelum memulai</h2><p>Silakan isi nama dan email agar tim NexaPos dapat mengenali percakapan dan menindaklanjuti pertanyaan Anda.</p><form className="support-guest-form" onSubmit={continueAsGuest}><label htmlFor="guest-chat-name">Nama</label><input id="guest-chat-name" value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Nama Anda" autoComplete="name" maxLength={100} required/><label htmlFor="guest-chat-email">Alamat email</label><input id="guest-chat-email" type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" maxLength={254} required/><button className="btn btn-primary" disabled={busy}>{busy?<span className="spinner"/>:<MessageCircle size={16}/>} Lanjutkan ke live chat</button>{error&&<p className="support-error">{error}</p>}</form></div>}
      {mode === 'choices' && <div className="support-choices"><span className="eyebrow muted">BAGAIMANA KAMI BISA MEMBANTU?</span><h2>Hubungi tim dukungan</h2><p>Pilih kanal bantuan yang paling nyaman untuk Anda.</p>
        <button className="support-choice" onClick={() => setMode(isSuperAdmin ? 'inbox' : isGuest ? 'guest-form' : 'chat')}><span className="support-choice-icon support-chat-icon"><MessageCircle size={21}/></span><span><strong>{isSuperAdmin ? 'Inbox live chat' : 'Live chat'}</strong><small>{isSuperAdmin ? 'Baca dan balas pesan pengguna' : 'Kirim pesan langsung kepada tim NexaPos'}</small></span><ArrowRight size={17}/></button>
        <button className="support-choice" onClick={openTelegram} disabled={!telegramUsername}><span className="support-choice-icon support-telegram-icon"><Send size={20}/></span><span><strong>Telegram</strong><small>{telegramUsername ? 'Chat langsung melalui @'+telegramUsername : 'Kontak Telegram belum dikonfigurasi'}</small></span><ExternalLink size={16}/></button>
        {!telegramUsername && <p className="support-config-note">Atur <code>VITE_TELEGRAM_SUPPORT_USERNAME</code> di environment Netlify dengan username Telegram tim bantuan agar tautan mengarah ke akun yang benar.</p>}
        <button className="support-choice" onClick={openWhatsApp} disabled={!/^\\d{8,15}$/.test(normalizedWhatsApp)}><span className="support-choice-icon support-whatsapp-icon"><MessageCircle size={20}/></span><span><strong>WhatsApp</strong><small>{/^\\d{8,15}$/.test(normalizedWhatsApp) ? 'Hubungi tim bantuan melalui WhatsApp' : 'Belum aktif · isi nomor di Pengaturan toko'}</small></span><ExternalLink size={16}/></button>
      </div>}
      {mode === 'chat' && <div className="support-chat-view"><button className="support-back" onClick={() => setMode('choices')}><ArrowLeft size={14}/> Kembali ke pilihan bantuan</button><div className="support-chat-intro"><strong>{isSuperAdmin ? 'Percakapan live chat' : 'Live chat NexaPos'}</strong><small>{isSuperAdmin ? activeUser?.email : 'Balasan tim dukungan akan muncul otomatis.'}</small></div>
        <div className="support-messages">{activeMessages.map(m => <div key={m.id} className={'support-message '+(m.sender_role === (isSuperAdmin ? 'support' : 'customer') ? 'support-message-mine' : 'support-message-theirs')}><span>{m.sender_role === 'customer' ? (isSuperAdmin ? m.user_email : 'Anda') : 'Tim NexaPos'}</span><p>{m.message}</p><small>{timeLabel(m.created_at)}</small></div>)}{!activeMessages.length && <div className="support-empty"><MessageCircle size={25}/><strong>Mulai percakapan</strong><span>Tulis pesan pertama Anda di bawah.</span></div>}</div>
        <form className="support-compose" onSubmit={sendMessage}><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder={isSuperAdmin ? 'Balas pesan pengguna...' : 'Tulis pesan bantuan...'} rows={2} maxLength={3000} required/><button className="btn btn-primary" disabled={busy || !draft.trim()}>{busy ? <span className="spinner"/> : <Send size={16}/>} Kirim</button></form>
        {error && <p className="support-error">{error.includes('support_messages') || error.includes('relation') ? 'Fitur live chat memerlukan migrasi database pusat bantuan.' : error}</p>}
      </div>}
      {mode === 'inbox' && isSuperAdmin && <div className="support-inbox-view"><div className="support-inbox-toolbar"><button className="support-back" onClick={() => setMode('choices')}><ArrowLeft size={14}/> Pilihan</button><button className="btn btn-small btn-outline" onClick={loadInbox}><RefreshCw size={13}/> Refresh</button></div>
        <div className="support-inbox-list">{inbox.map(item=><button className="support-inbox-item" key={item.user_id} onClick={async()=>{setActiveUser(item);setMessages([]);setMode('chat');await loadMessages(item.user_id)}}><span className="support-inbox-avatar">{(item.email||'P').slice(0,1).toUpperCase()}</span><span><strong>{item.email}</strong><small>{item.latest.message}</small></span><time>{timeLabel(item.latest.created_at)}</time></button>)}{!inbox.length && <div className="support-empty"><MessageCircle size={25}/><strong>Belum ada pesan</strong><span>Pesan pengguna akan muncul di sini.</span></div>}</div>{error && <p className="support-error">{error}</p>}
      </div>}
    </section>
  </div>
}
