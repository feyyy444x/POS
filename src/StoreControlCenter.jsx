import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, RefreshCw, Store, Users, CalendarClock, Activity, MessageCircle,
  ShieldCheck, KeyRound, ShoppingBag, Mail, Phone, MapPin, Clock3, CheckCircle2,
  AlertTriangle, UserRound, ExternalLink
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'

const dateTime = value => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) : 'Belum tercatat'
const dateOnly = value => value ? new Date(value).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }) : 'Belum ditentukan'
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const statusLabel = value => ({ active: 'Aktif', pending: 'Menunggu aktivasi', expired: 'Kedaluwarsa', suspended: 'Dinonaktifkan', deleted: 'Diarsipkan', ai_active: 'Bot menangani', waiting_admin: 'Menunggu Admin', admin_active: 'Ditangani Admin', resolved: 'Selesai' }[value] || value || 'Tidak diketahui')

function Metric({ icon: Icon, label, value, note, tone = 'violet' }) {
  return <article className="store-control-metric">
    <span className={'store-control-metric-icon tone-' + tone}><Icon size={18} /></span>
    <span className="store-control-metric-label">{label}</span>
    <strong>{value}</strong>
    {note && <small>{note}</small>}
  </article>
}

function SectionCard({ title, description, icon: Icon, action, children }) {
  return <section className="panel store-control-card">
    <div className="store-control-card-head">
      <span className="store-control-card-icon"><Icon size={17} /></span>
      <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
      {action}
    </div>
    {children}
  </section>
}

export default function StoreControlCenter({ tenant, onBack, onActivate, onStatusChange, onOpenSupport }) {
  const [tab, setTab] = useState('overview')
  const [settings, setSettings] = useState(null)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [orders, setOrders] = useState([])
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState([])
  const [query, setQuery] = useState('')
  const [activityFilter, setActivityFilter] = useState('all')

  const load = useCallback(async (quiet = false) => {
    if (!tenant?.id) return
    if (quiet) setRefreshing(true); else setLoading(true)
    const nextErrors = []
    const safely = async (label, request, fallback) => {
      try {
        const result = await request
        if (result.error) { nextErrors.push(label + ': ' + result.error.message); return fallback }
        return result.data ?? fallback
      } catch (error) { nextErrors.push(label + ': ' + (error?.message || 'gagal dimuat')); return fallback }
    }
    const [settingRows, memberRows, inviteRows, orderRows] = await Promise.all([
      safely('Pengaturan toko', supabase.from('store_settings').select('store_id,store_name,address,phone,currency,queue_enabled,updated_at').eq('store_id', tenant.id).maybeSingle(), null),
      safely('Akun karyawan', supabase.from('store_members').select('id,store_id,user_id,role,email,full_name,is_active,disabled_at,created_at').eq('store_id', tenant.id).order('created_at', { ascending: false }), []),
      safely('Undangan', supabase.from('store_invites').select('id,email,full_name,role,created_at,expires_at,accepted_at').eq('store_id', tenant.id).order('created_at', { ascending: false }).limit(20), []),
      safely('Transaksi', supabase.from('orders').select('id,receipt_number,cashier_id,total,payment_method,status,created_at').eq('store_id', tenant.id).order('created_at', { ascending: false }).limit(12), [])
    ])
    const userIds = [...new Set((memberRows || []).map(member => member.user_id).filter(Boolean))]
    let conversationRows = []
    let messageRows = []
    if (userIds.length) {
      conversationRows = await safely('Percakapan bantuan', supabase.from('support_conversations').select('user_id,status,created_at,updated_at,last_message_at').in('user_id', userIds).order('last_message_at', { ascending: false }).limit(12), [])
      const conversationIds = conversationRows.map(row => row.user_id)
      if (conversationIds.length) messageRows = await safely('Pesan bantuan', supabase.from('support_messages').select('id,user_id,sender_role,message,created_at').in('user_id', conversationIds).order('created_at', { ascending: false }).limit(30), [])
    }
    setSettings(settingRows)
    setMembers(memberRows || [])
    setInvites(inviteRows || [])
    setOrders(orderRows || [])
    setConversations(conversationRows || [])
    setMessages(messageRows || [])
    setErrors(nextErrors)
    setLoading(false)
    setRefreshing(false)
  }, [tenant?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!tenant?.id) return
    const channel = supabase.channel('store-control-' + tenant.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: 'store_id=eq.' + tenant.id }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_members', filter: 'store_id=eq.' + tenant.id }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_invites', filter: 'store_id=eq.' + tenant.id }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'store_id=eq.' + tenant.id }, () => load(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tenant?.id, load])

  const status = tenant?.status === 'active' && tenant?.expires_at && new Date(tenant.expires_at) <= new Date() ? 'expired' : tenant?.status
  const editMember = async member => {
    if (member.role === 'owner') return
    const fullName = window.prompt('Nama karyawan', member.full_name || '')
    if (fullName === null) return
    if (fullName.trim().length < 2 || fullName.trim().length > 120) { window.alert('Nama harus 2–120 karakter.'); return }
    const roleLabel = window.prompt('Jabatan: ketik manager atau karyawan', member.role === 'admin' ? 'manager' : 'karyawan')
    if (roleLabel === null) return
    const role = roleLabel.trim().toLowerCase() === 'manager' ? 'admin' : roleLabel.trim().toLowerCase() === 'karyawan' ? 'cashier' : null
    if (!role) { window.alert('Jabatan harus Manager atau Karyawan.'); return }
    const { error } = await supabase.rpc('super_admin_update_store_member', {
      p_member_id: member.id, p_full_name: fullName.trim(), p_role: role,
      p_is_active: Boolean(member.is_active && !member.disabled_at),
    })
    if (error) { window.alert(userFacingError(error, 'Perubahan karyawan gagal.')); return }
    await load(true)
  }

  const deleteMember = async member => {
    if (member.role === 'owner') return
    if (!window.confirm('Hapus keanggotaan ' + (member.full_name || member.email || 'karyawan') + ' dari tenant ini? Akun login dan riwayat transaksi tidak dihapus.')) return
    const { error } = await supabase.rpc('super_admin_delete_store_member_assignment', { p_member_id: member.id })
    if (error) { window.alert(userFacingError(error, 'Keanggotaan gagal dihapus.')); return }
    await load(true)
  }

  const resetMemberPin = async member => {
    if (member.role === 'owner' || !member.user_id) return
    if (!window.confirm('Reset PIN ' + (member.full_name || member.email || 'karyawan') + '?')) return
    const { error } = await supabase.rpc('super_admin_reset_user_pin', { p_user_id: member.user_id })
    if (error) { window.alert(userFacingError(error, 'Reset PIN gagal.')); return }
    window.alert('PIN berhasil direset. Karyawan perlu membuat PIN baru saat login berikutnya.')
  }

  const resetMemberPassword = async member => {
    if (member.role === 'owner' || !member.user_id) return
    const password = window.prompt('Password sementara baru (minimal 6 karakter).')
    if (password === null) return
    if (password.length < 6 || password.length > 128) { window.alert('Password harus 6–128 karakter.'); return }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { window.alert('Sesi login tidak tersedia.'); return }
    const response = await fetch('/.netlify/functions/manage-user-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ userId: member.user_id, password }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { window.alert(result.error || 'Reset password gagal.'); return }
    window.alert('Password sementara berhasil diperbarui.')
  }

  const activeMembers = members.filter(member => member.is_active && !member.disabled_at)
  const totalSales = orders.filter(order => order.status === 'paid').reduce((sum, order) => sum + Number(order.total || 0), 0)
  const events = useMemo(() => {
    const rows = [
      { id: 'store-created', type: 'store', title: 'Toko didaftarkan', detail: 'Data toko dibuat di NexaPos', at: tenant?.created_at },
      ...(tenant?.activated_at ? [{ id: 'store-activated', type: 'activation', title: 'Aktivasi toko tercatat', detail: 'Durasi aktivasi: ' + (tenant.activation_days || '—') + ' hari', at: tenant.activated_at }] : []),
      ...members.map(member => ({ id: 'member-' + member.id, type: 'member', title: member.full_name || member.email || 'Akun karyawan', detail: 'Keanggotaan ' + (member.role || 'staf') + (member.disabled_at ? ' dinonaktifkan' : member.is_active ? ' aktif' : ' tidak aktif'), at: member.disabled_at || member.created_at })),
      ...invites.map(invite => ({ id: 'invite-' + invite.id, type: 'invite', title: 'Undangan ' + (invite.full_name || invite.email || 'anggota'), detail: invite.accepted_at ? 'Undangan diterima' : invite.expires_at && new Date(invite.expires_at) < new Date() ? 'Undangan kedaluwarsa' : 'Undangan dibuat', at: invite.accepted_at || invite.created_at })),
      ...orders.map(order => ({ id: 'order-' + order.id, type: 'order', title: 'Transaksi ' + (order.receipt_number || order.id.slice(0, 8)), detail: money(order.total) + ' · ' + (order.payment_method || 'metode pembayaran tidak tercatat') + ' · ' + (order.status || 'status tidak diketahui'), at: order.created_at })),
      ...conversations.map(conversation => ({ id: 'support-' + conversation.user_id, type: 'support', title: 'Percakapan bantuan pelanggan', detail: 'Status: ' + statusLabel(conversation.status), at: conversation.last_message_at || conversation.updated_at }))
    ]
    return rows.filter(row => row.at).sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [tenant, members, invites, orders, conversations])
  const filteredEvents = events.filter(event => (activityFilter === 'all' || event.type === activityFilter) && (!query || (event.title + ' ' + event.detail).toLowerCase().includes(query.toLowerCase())))

  if (!tenant) return <section className="page-section"><button className="btn btn-outline" onClick={onBack}><ArrowLeft size={15}/> Kembali ke daftar toko</button><div className="empty-state"><strong>Pilih toko terlebih dahulu</strong><p>Buka Pusat Kendali Toko dari daftar toko.</p></div></section>

  return <section className="page-section store-control-page">
    <div className="page-heading store-control-heading">
      <div><button className="text-button" onClick={onBack}><ArrowLeft size={15}/> Kembali ke manajemen toko</button><span className="eyebrow muted">PLATFORM / PUSAT KENDALI TOKO</span><h1>{settings?.store_name || tenant.name}</h1><p>Profil, akses, aktivasi, aktivitas, dan bantuan untuk satu toko.</p></div>
      <div className="store-control-heading-actions"><span className={'status-pill ' + (status === 'active' ? 'status-paid' : status === 'expired' || status === 'suspended' || status === 'deleted' ? 'status-inactive' : 'status-waiting')}>{statusLabel(status)}</span><button className="btn btn-outline btn-small" onClick={() => load(true)} disabled={refreshing}>{refreshing ? <span className="spinner" /> : <RefreshCw size={14}/>} Muat ulang</button></div>
    </div>
    {errors.length > 0 && <div className="store-control-warning"><AlertTriangle size={16}/><div><strong>Sebagian informasi belum dapat dimuat</strong><p>{errors.join(' · ')}</p><small>Hak akses database mungkin membatasi sebagian data. Data yang berhasil dimuat tetap ditampilkan.</small></div></div>}
    <div className="store-control-hero">
      <div className="store-control-hero-mark"><Store size={25}/></div>
      <div className="store-control-hero-main"><span className="eyebrow">PROFIL TOKO</span><h2>{settings?.store_name || tenant.name || 'Toko tanpa nama'}</h2><p>{tenant.owner_name || 'Nama pemilik belum tersedia'} · {tenant.owner_email || 'Email pemilik belum tersedia'}</p><div className="store-control-meta"><span><MapPin size={14}/>{settings?.address || 'Alamat belum diisi'}</span><span><Phone size={14}/>{settings?.phone || 'Nomor telepon belum diisi'}</span><span><Clock3 size={14}/>Terdaftar {dateOnly(tenant.created_at)}</span></div></div>
      <div className="store-control-hero-actions">{status !== 'deleted' && <button className="btn btn-primary btn-small" onClick={() => onActivate?.(tenant)}><CheckCircle2 size={14}/>{status === 'active' ? 'Perpanjang aktivasi' : 'Aktifkan toko'}</button>}{!['suspended', 'deleted'].includes(status) && <button className="btn btn-outline btn-small" onClick={() => onStatusChange?.(tenant, 'suspended')}><ShieldCheck size={14}/>Nonaktifkan sementara</button>}{status === 'suspended' && <button className="btn btn-outline btn-small" onClick={() => onStatusChange?.(tenant, 'pending')}>Jadikan menunggu aktivasi</button>}</div>
    </div>
    <div className="store-control-metrics">
      <Metric icon={Users} label="Akun aktif" value={loading ? '—' : activeMembers.length} note={members.length + ' keanggotaan tercatat'} tone="blue"/>
      <Metric icon={ShoppingBag} label="Transaksi terbaru" value={loading ? '—' : orders.length} note="Maksimal 12 transaksi terakhir" tone="green"/>
      <Metric icon={Activity} label="Nilai transaksi termuat" value={loading ? '—' : money(totalSales)} note="Hanya transaksi berstatus dibayar di daftar terbaru" tone="violet"/>
      <Metric icon={CalendarClock} label="Masa aktivasi" value={tenant.expires_at ? (new Date(tenant.expires_at) > new Date() ? Math.max(0, Math.ceil((new Date(tenant.expires_at) - Date.now()) / 86400000)) + ' hari tersisa' : 'Kedaluwarsa') : 'Belum ditentukan'} note={'Berakhir: ' + dateOnly(tenant.expires_at)} tone="orange"/>
    </div>
    <div className="store-control-tabs" role="tablist" aria-label="Bagian pusat kendali toko">
      {[['overview','Ikhtisar'],['team','Tim & undangan'],['activity','Riwayat aktivitas'],['support','Bantuan pelanggan']].map(([id,label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'store-control-tab active' : 'store-control-tab'} onClick={() => setTab(id)}>{label}{id === 'team' ? <span>{members.length}</span> : id === 'activity' ? <span>{events.length}</span> : id === 'support' ? <span>{conversations.length}</span> : null}</button>)}
    </div>
    {loading ? <div className="panel empty-state"><span className="spinner spinner-large"/><p>Memuat informasi toko…</p></div> : <>
      {tab === 'overview' && <div className="store-control-grid">
        <SectionCard title="Informasi toko" description="Identitas dan konfigurasi yang tersimpan" icon={Store}><dl className="store-control-details"><div><dt>Nama resmi</dt><dd>{settings?.store_name || tenant.name || 'Belum tersedia'}</dd></div><div><dt>ID toko</dt><dd className="mono">{tenant.id}</dd></div><div><dt>Pemilik</dt><dd>{tenant.owner_name || 'Belum tersedia'}</dd></div><div><dt>Email pemilik</dt><dd>{tenant.owner_email || 'Belum tersedia'}</dd></div><div><dt>Mata uang</dt><dd>{settings?.currency || 'IDR (bawaan)'}</dd></div><div><dt>Sistem antrean</dt><dd>{settings?.queue_enabled === true ? 'Aktif' : settings?.queue_enabled === false ? 'Nonaktif' : 'Belum diketahui'}</dd></div><div><dt>Terakhir diubah</dt><dd>{dateTime(settings?.updated_at)}</dd></div></dl></SectionCard>
        <SectionCard title="Aktivasi & masa berlaku" description="Status akses toko berdasarkan catatan aktivasi" icon={KeyRound}><dl className="store-control-details"><div><dt>Status toko</dt><dd><span className={'status-pill ' + (status === 'active' ? 'status-paid' : 'status-waiting')}>{statusLabel(status)}</span></dd></div><div><dt>Aktivasi dimulai</dt><dd>{dateTime(tenant.activated_at)}</dd></div><div><dt>Masa berlaku sampai</dt><dd>{dateTime(tenant.expires_at)}</dd></div><div><dt>Durasi aktivasi terakhir</dt><dd>{tenant.activation_days ? tenant.activation_days + ' hari' : 'Belum tercatat'}</dd></div><div><dt>Paket langganan</dt><dd>Tidak tersedia pada data tenant saat ini</dd></div></dl><p className="store-control-footnote">Panel ini tidak menebak paket atau pembayaran. Informasi paket baru ditampilkan setelah skema langganan terhubung.</p></SectionCard>
        <SectionCard title="Aktivitas terbaru" description="Transaksi dan perubahan anggota yang berhasil dimuat" icon={Activity} action={<button className="text-button" onClick={() => setTab('activity')}>Lihat semua <ExternalLink size={13}/></button>}>{events.slice(0, 5).length ? <div className="store-control-timeline">{events.slice(0, 5).map(event => <div className="store-control-event" key={event.id}><span className={'store-control-event-dot event-' + event.type}/><div><strong>{event.title}</strong><p>{event.detail}</p><small>{dateTime(event.at)}</small></div></div>)}</div> : <div className="empty-state"><strong>Belum ada aktivitas</strong><p>Aktivitas yang tersedia akan muncul di sini.</p></div>}</SectionCard>
        <SectionCard title="Bantuan pelanggan" description="Ringkasan percakapan milik anggota toko" icon={MessageCircle} action={<button className="text-button" onClick={onOpenSupport}>Buka pusat bantuan <ExternalLink size={13}/></button>}>{conversations.length ? <div className="store-control-conversation-list">{conversations.slice(0, 4).map(conversation => <div key={conversation.user_id}><span className="store-control-avatar"><MessageCircle size={15}/></span><div><strong>{members.find(member => member.user_id === conversation.user_id)?.full_name || members.find(member => member.user_id === conversation.user_id)?.email || 'Anggota toko'}</strong><small>{dateTime(conversation.last_message_at || conversation.updated_at)}</small></div><span className="status-pill status-waiting">{statusLabel(conversation.status)}</span></div>)}</div> : <div className="store-control-muted">Belum ada percakapan bantuan yang terkait dengan akun anggota toko yang terdaftar.</div>}</SectionCard>
      </div>}
      {tab === 'team' && <div className="store-control-grid">
        <SectionCard title="Akun pemilik dan karyawan" description="Status keanggotaan toko" icon={Users}><div className="table-wrap"><table><thead><tr><th>Akun</th><th>Peran</th><th>Status</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td><strong>{member.full_name || member.email || 'Tanpa nama'}</strong><br/><small>{member.email || 'Email tidak tersedia'}</small></td><td>{member.role === 'owner' ? 'Owner' : member.role === 'admin' || member.role === 'manager' ? 'Manager' : 'Karyawan'}</td><td><span className={'status-pill ' + (member.is_active && !member.disabled_at ? 'status-paid' : 'status-inactive')}>{member.disabled_at ? 'Dinonaktifkan' : member.is_active ? 'Aktif' : 'Nonaktif'}</span></td><td>{dateOnly(member.created_at)}</td><td>{member.role === 'owner' ? <span className="subtle">Dilindungi</span> : <div className="member-manage-actions"><button className="btn btn-small btn-outline" onClick={() => editMember(member)}><ShieldCheck size={13}/> Edit</button><button className="btn btn-small btn-outline" onClick={() => resetMemberPin(member)}><KeyRound size={13}/> Reset PIN</button><button className="btn btn-small btn-outline" onClick={() => resetMemberPassword(member)}><KeyRound size={13}/> Reset password</button><button className="btn btn-small btn-outline danger-icon" onClick={() => deleteMember(member)}><Trash2 size={13}/> Hapus</button></div>}</td></tr>)}</tbody></table></div>{members.length === 0 && <div className="store-control-muted">Tidak ada data keanggotaan yang dapat ditampilkan.</div>}</SectionCard>
        <SectionCard title="Undangan anggota" description="Undangan terbaru yang dibuat untuk toko ini" icon={Mail}>{invites.length ? <div className="store-control-invites">{invites.map(invite => <div key={invite.id}><span className="store-control-avatar"><UserRound size={15}/></span><div><strong>{invite.full_name || invite.email}</strong><small>{invite.email} · {invite.role}</small><small>Dibuat {dateTime(invite.created_at)} · Kedaluwarsa {dateOnly(invite.expires_at)}</small></div><span className={'status-pill ' + (invite.accepted_at ? 'status-paid' : 'status-waiting')}>{invite.accepted_at ? 'Diterima' : 'Menunggu'}</span></div>)}</div> : <div className="store-control-muted">Belum ada undangan yang tersedia.</div>}</SectionCard>
      </div>}
      {tab === 'activity' && <SectionCard title="Riwayat aktivitas toko" description="Kronologi berdasarkan catatan toko, anggota, undangan, transaksi, dan bantuan yang tersedia" icon={Activity}><div className="store-control-activity-tools"><div className="search-box"><Activity size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari aktivitas…"/></div><select className="text-input" value={activityFilter} onChange={event => setActivityFilter(event.target.value)}><option value="all">Semua aktivitas</option><option value="store">Profil toko</option><option value="activation">Aktivasi</option><option value="member">Anggota</option><option value="invite">Undangan</option><option value="order">Transaksi</option><option value="support">Bantuan</option></select></div><div className="store-control-timeline">{filteredEvents.map(event => <div className="store-control-event" key={event.id}><span className={'store-control-event-dot event-' + event.type}/><div><strong>{event.title}</strong><p>{event.detail}</p><small>{dateTime(event.at)}</small></div></div>)}</div>{filteredEvents.length === 0 && <div className="empty-state"><strong>Tidak ada aktivitas yang cocok</strong><p>Ubah kata kunci atau jenis aktivitas.</p></div>}<p className="store-control-footnote">Ini adalah kronologi dari data yang saat ini tersimpan, bukan audit log lengkap untuk setiap perubahan admin.</p></SectionCard>}
      {tab === 'support' && <div className="store-control-grid"><SectionCard title="Percakapan bantuan" description="Status percakapan dari akun anggota toko" icon={MessageCircle}>{conversations.length ? <div className="store-control-invites">{conversations.map(conversation => { const member = members.find(item => item.user_id === conversation.user_id); const lastMessage = messages.find(item => item.user_id === conversation.user_id); return <div key={conversation.user_id}><span className="store-control-avatar"><MessageCircle size={15}/></span><div><strong>{member?.full_name || member?.email || 'Anggota toko'}</strong><small>{member?.email || conversation.user_id}</small><small>{lastMessage?.message || 'Belum ada cuplikan pesan yang tersedia'}</small><small>Terakhir aktif {dateTime(conversation.last_message_at || conversation.updated_at)}</small></div><span className={'status-pill ' + (conversation.status === 'resolved' ? 'status-paid' : 'status-waiting')}>{statusLabel(conversation.status)}</span></div>})}</div> : <div className="empty-state"><strong>Belum ada percakapan</strong><p>Percakapan dari akun anggota toko yang terdaftar akan muncul di sini.</p></div>}<button className="btn btn-outline btn-small" onClick={onOpenSupport}>Buka pusat bantuan platform <ExternalLink size={13}/></button></SectionCard><SectionCard title="Batasan data bantuan" description="Cara membaca ringkasan ini" icon={ShieldCheck}><p className="store-control-footnote">Percakapan dihubungkan lewat akun anggota yang terdaftar pada toko ini. Jika pelanggan menghubungi bantuan memakai akun lain, percakapan tersebut tidak otomatis dikaitkan dengan toko.</p></SectionCard></div>}
    </>}
  </section>
}
