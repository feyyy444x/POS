import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, Printer, RefreshCw, Ticket } from 'lucide-react'
import { supabase } from './lib/supabase'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const numberLabel = (prefix, number) => (prefix || 'A') + String(number || 0).padStart(3, '0')

export default function PublicQueueScreen() {
  const params = new URLSearchParams(window.location.search)
  const storeId = params.get('store') || ''
  const [store, setStore] = useState(null)
  const [settings, setSettings] = useState(null)
  const [tickets, setTickets] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [latestTicket, setLatestTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setError('')
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(storeId)) {
      setError('Tautan antrian tidak valid. Minta tautan resmi dari toko.')
      setLoading(false)
      return
    }
    const [{ data: storeRow, error: storeError }, { data: settingsRow }, { data: queueRows, error: queueError }] = await Promise.all([
      supabase.from('stores').select('id,name,status,expires_at').eq('id', storeId).maybeSingle(),
      supabase.from('store_settings').select('store_id,store_name,queue_prefix,logo_url').eq('store_id', storeId).maybeSingle(),
      supabase.from('queue_tickets').select('id,store_id,service_date,queue_number,status,counter_label,created_at,called_at,completed_at').eq('store_id', storeId).eq('service_date', today()).order('queue_number', { ascending: true })
    ])
    if (storeError || queueError) setError('Informasi antrian belum dapat dimuat. Coba lagi atau hubungi petugas.')
    else if (!storeRow) setError('Toko tidak ditemukan atau tidak menyediakan tautan antrian ini.')
    else {
      const inactive = storeRow.status && storeRow.status !== 'active'
      const expired = storeRow.expires_at && new Date(storeRow.expires_at) <= new Date()
      if (inactive || expired) setError('Layanan antrian toko sedang tidak tersedia.')
      setStore(storeRow)
      setSettings(settingsRow || null)
      setTickets(queueRows || [])
    }
    setLoading(false)
  }, [storeId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!storeId || !supabase) return
    const channel = supabase.channel('public-order-queue-' + storeId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: 'store_id=eq.' + storeId }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [storeId, load])

  const createTicket = async (event) => {
    event.preventDefault()
    if (submitting || !store?.id) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    const { data, error: rpcError } = await supabase.rpc('create_public_queue_ticket', {
      p_store_id: store.id,
      p_customer_name: customerName.trim() || null
    })
    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message?.includes('Antrian sedang ramai')
        ? 'Antrian sedang ramai. Silakan minta bantuan petugas.'
        : 'Nomor belum berhasil dibuat. Coba lagi atau minta bantuan petugas.')
      return
    }
    const ticket = Array.isArray(data) ? data[0] : data
    if (!ticket?.id || !ticket?.queue_number) {
      setError('Nomor antrian belum dapat dikonfirmasi. Silakan minta bantuan petugas.')
      return
    }
    setLatestTicket(ticket)
    setCustomerName('')
    setSuccess('Nomor antrian berhasil dibuat. Simpan tiket ini untuk pengambilan pesanan.')
    await load()
  }

  const prefix = settings?.queue_prefix || 'A'
  const waiting = tickets.filter(ticket => ticket.status === 'waiting').length
  const current = tickets.filter(ticket => ['called', 'serving'].includes(ticket.status)).slice(-3).reverse()
  const tenantName = settings?.store_name || store?.name || 'NexaPos'

  if (loading) return <main style={styles.center}><div style={styles.card}>Memuat halaman antrian…</div></main>

  return <main style={styles.page}>
    <style>{'@media print { body * { visibility: hidden !important; } .queue-print-ticket, .queue-print-ticket * { visibility: visible !important; } .queue-print-ticket { position: absolute; left: 0; top: 0; width: 72mm; padding: 3mm; color: #000 !important; background: #fff !important; box-shadow: none !important; } .no-print { display: none !important; } @page { size: 80mm auto; margin: 3mm; } }'}</style>
    <header style={styles.header} className="no-print">
      <div style={styles.brandMark}>N</div>
      <div><strong style={styles.brand}>NexaPos <span style={{ color: '#4f46e5' }}>Queue</span></strong><div style={styles.muted}>PENGAMBILAN PESANAN</div></div>
      <button style={styles.refresh} onClick={load} aria-label="Refresh"><RefreshCw size={17}/></button>
    </header>
    <section style={styles.hero} className="no-print">
      <div style={styles.eyebrow}><span style={styles.liveDot}/> ANTRIAN TOKO</div>
      <h1 style={styles.title}>{tenantName}</h1>
      <p style={styles.muted}>Ambil nomor antrian untuk persiapan atau pengambilan pesanan. Nomor akan dipanggil melalui layar antrian toko.</p>
    </section>

    {error && <div style={styles.error} role="alert">{error}</div>}
    {success && <div style={styles.success} role="status"><CheckCircle2 size={18}/>{success}</div>}

    {latestTicket ? <section style={styles.ticket} className="queue-print-ticket">
      <div style={styles.ticketBrand}>NEXAPOS</div>
      <div style={styles.ticketStore}>{tenantName}</div>
      <div style={styles.ticketLabel}>NOMOR ANTRIAN</div>
      <div style={styles.ticketNumber}>{numberLabel(prefix, latestTicket.queue_number)}</div>
      <div style={styles.ticketType}>PENGAMBILAN PESANAN</div>
      {latestTicket.customer_name && <div style={styles.ticketName}>{latestTicket.customer_name}</div>}
      <div style={styles.ticketMeta}>{new Date(latestTicket.created_at || Date.now()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB</div>
      <div style={styles.ticketNote}>Mohon perhatikan layar saat nomor Anda dipanggil.</div>
      <div style={styles.ticketRule}>- - - - - - - - - - - - - - -</div>
      <div style={styles.ticketFooter}>Terima kasih</div>
      <div style={styles.ticketActions} className="no-print">
        <button style={styles.primaryButton} onClick={() => window.print()}><Printer size={17}/> Cetak tiket thermal</button>
        <button style={styles.secondaryButton} onClick={() => setLatestTicket(null)}><Ticket size={17}/> Ambil nomor lain</button>
      </div>
    </section> : <section style={styles.formCard} className="no-print">
      <div style={styles.formTitle}><Ticket size={22}/> Ambil nomor antrian</div>
      <form onSubmit={createTicket}>
        <label style={styles.label} htmlFor="queue-customer-name">Nama pelanggan (opsional)</label>
        <input id="queue-customer-name" style={styles.input} value={customerName} onChange={event => setCustomerName(event.target.value.slice(0, 80))} placeholder="Nama Anda" maxLength={80} autoComplete="name"/>
        <button style={{ ...styles.primaryButton, width: '100%', opacity: submitting || error ? 0.7 : 1 }} disabled={submitting || !store?.id || Boolean(error)}>
          {submitting ? 'Membuat nomor…' : 'Ambil nomor antrian'} <Ticket size={17}/>
        </button>
      </form>
      <p style={styles.smallNote}>Ambil satu nomor untuk setiap pesanan. Jika terjadi kesalahan, hubungi petugas toko.</p>
    </section>}

    <section style={styles.liveCard} className="no-print">
      <div style={styles.liveHead}><div><strong>Informasi antrian</strong><div style={styles.muted}>Diperbarui otomatis</div></div><span style={styles.waitingPill}><Clock3 size={14}/> {waiting} menunggu</span></div>
      <div style={styles.currentList}>
        <div style={styles.sectionLabel}>SEDANG DIPANGGIL / DILAYANI</div>
        {current.length ? current.map((ticket, index) => <div style={styles.currentRow} key={ticket.id}><strong style={index === 0 ? styles.currentNumber : styles.nextNumber}>{numberLabel(prefix, ticket.queue_number)}</strong><span>{ticket.counter_label || 'Pengambilan Pesanan'}</span></div>) : <div style={styles.empty}>Belum ada nomor yang dipanggil.</div>}
      </div>
      <div style={styles.sectionLabel}>NOMOR MENUNGGU</div>
      {tickets.filter(ticket => ticket.status === 'waiting').slice(0, 5).map(ticket => <div style={styles.nextRow} key={ticket.id}><span>{numberLabel(prefix, ticket.queue_number)}</span><span style={styles.muted}>Menunggu dipanggil</span></div>)}
    </section>
    <footer style={styles.footer} className="no-print">Layanan antrian NexaPos · {tenantName}</footer>
  </main>
}

const styles = {
  page: { minHeight: '100vh', background: '#f4f6fb', color: '#172033', padding: '20px 14px 32px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', boxSizing: 'border-box' },
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f6fb', padding: 20, fontFamily: 'system-ui, sans-serif' },
  card: { background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 12px 35px rgba(22,34,65,.08)' },
  header: { maxWidth: 680, margin: '0 auto 24px', display: 'flex', alignItems: 'center', gap: 12 },
  brandMark: { width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#172033', color: '#fff', fontWeight: 800, fontSize: 20 },
  brand: { fontSize: 20, letterSpacing: '-.04em' },
  muted: { color: '#6b7280', fontSize: 13, lineHeight: 1.5 },
  refresh: { marginLeft: 'auto', display: 'grid', placeItems: 'center', width: 40, height: 40, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', color: '#172033', cursor: 'pointer' },
  hero: { maxWidth: 680, margin: '0 auto 20px' },
  eyebrow: { color: '#4f46e5', fontWeight: 800, fontSize: 11, letterSpacing: '.14em', display: 'flex', alignItems: 'center', gap: 8 },
  liveDot: { display: 'inline-block', width: 7, height: 7, borderRadius: 99, background: '#22c55e' },
  title: { fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.1, letterSpacing: '-.04em', margin: '12px 0' },
  error: { maxWidth: 680, margin: '0 auto 16px', padding: 13, borderRadius: 12, background: '#fee2e2', color: '#991b1b', fontSize: 14 },
  success: { maxWidth: 680, margin: '0 auto 16px', padding: 13, borderRadius: 12, background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  formCard: { maxWidth: 680, margin: '0 auto 20px', background: '#fff', padding: 22, borderRadius: 20, boxShadow: '0 12px 35px rgba(22,34,65,.06)', border: '1px solid #e5e7eb' },
  formTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 19, fontWeight: 750, marginBottom: 18 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 12, padding: '13px 14px', fontSize: 16, marginBottom: 14, outlineColor: '#4f46e5' },
  primaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '13px 16px', border: 0, borderRadius: 12, background: '#4f46e5', color: '#fff', fontWeight: 750, fontSize: 14, cursor: 'pointer' },
  secondaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', color: '#172033', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  smallNote: { color: '#6b7280', fontSize: 12, lineHeight: 1.5, marginBottom: 0 },
  ticket: { maxWidth: 360, margin: '0 auto 20px', padding: 22, background: '#fff', border: '1px dashed #9ca3af', borderRadius: 12, textAlign: 'center', boxShadow: '0 12px 35px rgba(22,34,65,.06)' },
  ticketBrand: { fontWeight: 900, letterSpacing: '.15em', fontSize: 13 },
  ticketStore: { marginTop: 5, fontSize: 13, fontWeight: 700 },
  ticketLabel: { marginTop: 24, fontSize: 11, letterSpacing: '.14em', color: '#6b7280' },
  ticketNumber: { fontSize: 'clamp(42px, 12vw, 62px)', lineHeight: 1.15, fontWeight: 900, letterSpacing: '-.04em', margin: '8px 0' },
  ticketType: { fontSize: 12, fontWeight: 800, letterSpacing: '.05em' },
  ticketName: { marginTop: 8, fontSize: 14 },
  ticketMeta: { marginTop: 14, fontSize: 11, color: '#6b7280' },
  ticketNote: { marginTop: 18, fontSize: 12, lineHeight: 1.5 },
  ticketRule: { margin: '14px 0', color: '#9ca3af' },
  ticketFooter: { fontSize: 12, fontWeight: 700 },
  ticketActions: { display: 'grid', gap: 8, marginTop: 22 },
  liveCard: { maxWidth: 680, margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 20, boxShadow: '0 12px 35px rgba(22,34,65,.04)' },
  liveHead: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 },
  waitingPill: { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 99, background: '#eef2ff', color: '#4338ca', padding: '7px 10px', fontSize: 12, fontWeight: 700 },
  currentList: { marginBottom: 18 },
  sectionLabel: { color: '#6b7280', fontSize: 10, letterSpacing: '.12em', fontWeight: 800, marginBottom: 9 },
  currentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  currentNumber: { fontSize: 22, color: '#16a34a', fontWeight: 900 },
  nextNumber: { fontSize: 18, color: '#4f46e5', fontWeight: 800 },
  nextRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  empty: { color: '#6b7280', padding: '12px 0', fontSize: 13 },
  footer: { maxWidth: 680, margin: '22px auto 0', color: '#9ca3af', fontSize: 12, textAlign: 'center' }
}
