import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Headphones, MessageCircle, Send, X, ExternalLink, RefreshCw, Phone, Settings, Save, CheckCircle2 } from 'lucide-react'
import { supabase } from './lib/supabase'

const telegramUsername = (import.meta.env.VITE_TELEGRAM_SUPPORT_USERNAME || '').replace(/^@/, '').trim()
const defaultChannelSettings = { whatsapp_enabled: false, whatsapp_number: '', telegram_enabled: Boolean(telegramUsername || 'becaaapos'), telegram_username: telegramUsername || 'becaaapos' }
const timeLabel = value => new Date(value).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })

export default function SupportCenter({ session, onClose, isSuperAdmin = false, embedded = false }) {
  const [mode, setMode] = useState(isSuperAdmin && embedded ? 'settings' : 'choices')
  const [messages, setMessages] = useState([])
  const [inbox, setInbox] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [draft, setDraft] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestReady, setGuestReady] = useState(false)
  const [guestSession, setGuestSession] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [channelSettings, setChannelSettings] = useState(defaultChannelSettings)
  const [channelDraft, setChannelDraft] = useState(defaultChannelSettings)
  const [channelLoading, setChannelLoading] = useState(true)
  const [channelBusy, setChannelBusy] = useState(false)
  const [channelError, setChannelError] = useState('')
  const [channelNotice, setChannelNotice] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState('Menyambungkan realtime…')
  const activeSession = session || guestSession
  const userId = activeSession?.user?.id
  const userEmail = activeSession?.user?.email || ''
  const isGuest = !session?.user && !isSuperAdmin
  const guestIdentity = `${guestName.trim()} <${guestEmail.trim()}>`
  const currentTelegramUsername = String(channelSettings.telegram_username || '').replace(/^@/, '').trim()
  const whatsappNumber = String(channelSettings.whatsapp_number || '').replace(/\D/g, '')

  const loadChannelSettings = useCallback(async () => {
    if (!supabase) { setChannelLoading(false); setChannelError('Supabase belum dikonfigurasi.'); return }
    setChannelLoading(true)
    const { data, error: queryError } = await supabase.from('support_channel_settings')
      .select('id,whatsapp_enabled,whatsapp_number,telegram_enabled,telegram_username')
      .eq('id', 1).maybeSingle()
    if (queryError) {
      setChannelError(queryError.message)
      setChannelLoading(false)
      return
    }
    const next = data ? {
      whatsapp_enabled: Boolean(data.whatsapp_enabled),
      whatsapp_number: data.whatsapp_number || '',
      telegram_enabled: Boolean(data.telegram_enabled),
      telegram_username: String(data.telegram_username || '').replace(/^@/, ''),
    } : defaultChannelSettings
    setChannelSettings(next)
    setChannelDraft(next)
    setChannelError('')
    setChannelLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    loadChannelSettings()
    const refreshOnResume = () => { if (document.visibilityState === 'visible') loadChannelSettings() }
    const channel = supabase.channel('support-channel-settings-' + (userId || 'public'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_channel_settings' }, loadChannelSettings)
      .subscribe(status => {
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'Realtime tersambung' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'Realtime terputus, mencoba kembali…' : 'Menyambungkan realtime…')
        if (status === 'SUBSCRIBED') loadChannelSettings()
      })
    window.addEventListener('focus', refreshOnResume)
    document.addEventListener('visibilitychange', refreshOnResume)
    return () => {
      window.removeEventListener('focus', refreshOnResume)
      document.removeEventListener('visibilitychange', refreshOnResume)
      supabase.removeChannel(channel)
    }
  }, [loadChannelSettings, userId])

  const updateChannelDraft = (key, value) => setChannelDraft(current => ({ ...current, [key]: value }))
  const saveChannelSettings = async event => {
    event.preventDefault()
    setChannelNotice('')
    setChannelError('')
    const phone = String(channelDraft.whatsapp_number || '').replace(/\D/g, '')
    const telegram = String(channelDraft.telegram_username || '').replace(/^@/, '').trim()
    if (channelDraft.whatsapp_enabled && !/^[1-9][0-9]{7,14}$/.test(phone)) {
      setChannelError('Masukkan nomor WhatsApp format internasional, angka saja. Contoh format Indonesia: 62812…')
      return
    }
    if (channelDraft.telegram_enabled && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) {
      setChannelError('Username Telegram harus 5–32 karakter, hanya huruf, angka, atau garis bawah.')
      return
    }
    setChannelBusy(true)
    const { error: saveError } = await supabase.from('support_channel_settings').upsert({
      id: 1,
      whatsapp_enabled: Boolean(channelDraft.whatsapp_enabled),
      whatsapp_number: phone || null,
      telegram_enabled: Boolean(channelDraft.telegram_enabled),
      telegram_username: telegram || null,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setChannelBusy(false)
    if (saveError) { setChannelError(saveError.message); return }
    setChannelNotice('Pengaturan kanal bantuan berhasil disimpan dan akan tersinkron otomatis.')
    await loadChannelSettings()
  }

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
    const refreshMessages = () => {
      if (mode === 'chat' && !isSuperAdmin && userId) loadMessages(userId)
      if (mode === 'chat' && isSuperAdmin && activeUser) loadMessages(activeUser.user_id)
      if (mode === 'inbox' && isSuperAdmin) loadInbox()
    }
    const channel = supabase.channel('support-live-' + (userId || 'guest'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, payload => {
        if (!isSuperAdmin && payload.new?.user_id !== userId && payload.old?.user_id !== userId) return
        refreshMessages()
      })
      .subscribe(status => {
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'Realtime tersambung' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'Realtime terputus, mencoba kembali…' : 'Menyambungkan realtime…')
        if (status === 'SUBSCRIBED') refreshMessages()
      })
    const refreshOnResume = () => { if (document.visibilityState === 'visible') refreshMessages() }
    window.addEventListener('focus', refreshOnResume)
    document.addEventListener('visibilitychange', refreshOnResume)
    return () => {
      window.removeEventListener('focus', refreshOnResume)
      document.removeEventListener('visibilitychange', refreshOnResume)
      supabase.removeChannel(channel)
    }
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
    setGuestSession(data.session || null)
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
    if (!channelSettings.telegram_enabled || !currentTelegramUsername) return
    window.open('https://t.me/' + encodeURIComponent(currentTelegramUsername), '_blank', 'noopener,noreferrer')
  }
  const openWhatsApp = () => {
    if (!channelSettings.whatsapp_enabled || !whatsappNumber) return
    const text = 'Halo tim NexaPos, saya membutuhkan bantuan.'
    window.open('https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
  }

  return <div className={embedded ? 'support-embedded' : 'support-overlay'} role="dialog" aria-modal={!embedded} aria-label="Pusat Bantuan NexaPos" onMouseDown={e => { if (!embedded && e.target === e.currentTarget) onClose() }}>
    <section className={'support-modal' + (embedded ? ' support-modal-embedded' : '')}>
      <header className="support-modal-head"><div className="support-modal-brand"><span className="support-modal-icon"><Headphones size={20}/></span><div><strong>Pusat Bantuan</strong><small>NexaPos · dukungan pengguna</small></div></div><button className="icon-button" aria-label="Tutup pusat bantuan" onClick={onClose}><X size={18}/></button></header>
      {mode === 'settings' && isSuperAdmin && <div className="support-settings-view">
        <div className="support-settings-intro"><span className="eyebrow muted">KANAL DUKUNGAN</span><h2>Pengaturan pusat bantuan</h2><p>Nomor WhatsApp dan akun Telegram diatur di sini. Perubahan dikirim ke Supabase dan diperbarui otomatis pada website.</p><small><span className="support-realtime-dot" /> {realtimeStatus}</small></div>
        {channelLoading && <div className="support-settings-loading"><span className="spinner" /> Memuat pengaturan kanal…</div>}
        <form className="support-settings-form" onSubmit={saveChannelSettings}>
          <div className="support-channel-setting">
            <label className="support-toggle-row"><input type="checkbox" checked={channelDraft.whatsapp_enabled} onChange={e => updateChannelDraft('whatsapp_enabled', e.target.checked)} /><span><strong>Aktifkan WhatsApp</strong><small>Tambahkan kanal WhatsApp pada tombol bantuan tenant dan website.</small></span></label>
            <label htmlFor="support-whatsapp-number">Nomor WhatsApp (format internasional)</label>
            <input id="support-whatsapp-number" className="text-input" type="tel" inputMode="numeric" autoComplete="tel" value={channelDraft.whatsapp_number} onChange={e => updateChannelDraft('whatsapp_number', e.target.value)} placeholder="6281234567890" maxLength={24} />
            <small>Gunakan kode negara tanpa tanda +, spasi, atau tanda hubung. Contoh format Indonesia: 62812…</small>
          </div>
          <div className="support-channel-setting">
            <label className="support-toggle-row"><input type="checkbox" checked={channelDraft.telegram_enabled} onChange={e => updateChannelDraft('telegram_enabled', e.target.checked)} /><span><strong>Aktifkan Telegram</strong><small>Saluran Telegram akan ditampilkan jika username tersedia.</small></span></label>
            <label htmlFor="support-telegram-username">Username Telegram</label>
            <input id="support-telegram-username" className="text-input" value={channelDraft.telegram_username} onChange={e => updateChannelDraft('telegram_username', e.target.value.replace(/^@/, ''))} placeholder="username_telegram" maxLength={32} />
            <small>Tulis username tanpa tanda @.</small>
          </div>
          {channelError && <p className="support-error">{channelError.includes('support_channel_settings') || channelError.toLowerCase().includes('schema cache') ? 'Tabel pengaturan pusat bantuan belum tersedia atau akses database belum siap. Periksa migrasi support_channel_settings.' : channelError}</p>}
          {channelNotice && <p className="support-success"><CheckCircle2 size={15}/>{channelNotice}</p>}
          <div className="support-settings-actions"><button className="btn btn-primary" disabled={channelBusy || channelLoading}>{channelBusy ? <span className="spinner" /> : <Save size={15}/>} Simpan pengaturan</button><button type="button" className="btn btn-outline" onClick={() => { setMode('inbox'); setChannelNotice('') }}><MessageCircle size={15}/> Inbox live chat</button><button type="button" className="btn btn-outline" onClick={() => setMode('choices')}>Pratinjau kanal</button></div>
        </form>
      </div>}
      {mode === 'guest-form' && isGuest && <div className="support-choices"><span className="eyebrow muted">LIVE CHAT TAMU</span><h2>Sebelum memulai</h2><p>Silakan isi nama dan email agar tim NexaPos dapat mengenali percakapan dan menindaklanjuti pertanyaan Anda.</p><form className="support-guest-form" onSubmit={continueAsGuest}><label htmlFor="guest-chat-name">Nama</label><input id="guest-chat-name" value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Nama Anda" autoComplete="name" maxLength={100} required/><label htmlFor="guest-chat-email">Alamat email</label><input id="guest-chat-email" type="email" value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" maxLength={254} required/><button className="btn btn-primary" disabled={busy}>{busy?<span className="spinner"/>:<MessageCircle size={16}/>} Lanjutkan ke live chat</button>{error&&<p className="support-error">{error}</p>}</form></div>}
      {mode === 'choices' && <div className="support-choices"><span className="eyebrow muted">BAGAIMANA KAMI BISA MEMBANTU?</span><h2>Hubungi tim dukungan</h2><p>Pilih kanal bantuan yang paling nyaman untuk Anda.</p>
        <button className="support-choice" onClick={() => setMode(isSuperAdmin ? 'inbox' : isGuest ? 'guest-form' : 'chat')}><span className="support-choice-icon support-chat-icon"><MessageCircle size={21}/></span><span><strong>{isSuperAdmin ? 'Inbox live chat' : 'Live chat'}</strong><small>{isSuperAdmin ? 'Baca dan balas pesan tenant' : 'Kirim pesan langsung kepada tim NexaPos'}</small></span><ArrowRight size={17}/></button>
        <button className="support-choice" onClick={openWhatsApp} disabled={!channelSettings.whatsapp_enabled || !whatsappNumber}><span className="support-choice-icon support-whatsapp-icon"><Phone size={20}/></span><span><strong>WhatsApp</strong><small>{channelSettings.whatsapp_enabled && whatsappNumber ? 'Chat melalui WhatsApp' : 'WhatsApp belum dikonfigurasi admin'}</small></span><ExternalLink size={16}/></button>
        <button className="support-choice" onClick={openTelegram} disabled={!channelSettings.telegram_enabled || !currentTelegramUsername}><span className="support-choice-icon support-telegram-icon"><Send size={20}/></span><span><strong>Telegram</strong><small>{channelSettings.telegram_enabled && currentTelegramUsername ? 'Chat langsung melalui @'+currentTelegramUsername : 'Kontak Telegram belum dikonfigurasi'}</small></span><ExternalLink size={16}/></button>
        {isSuperAdmin && <button className="support-inbox-link" onClick={() => setMode('settings')}><Settings size={14}/> Pengaturan kanal bantuan</button>}
        {isSuperAdmin && <p className="support-config-note">Atur nomor WhatsApp dan username Telegram di menu pengaturan kanal bantuan.</p>}
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
