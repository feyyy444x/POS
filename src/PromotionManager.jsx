import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CalendarClock, Check, CirclePercent, Plus, RefreshCw, Save, ShieldCheck, Ticket, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import './admin-promotions.css'

const periods = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]
const initialForm = () => ({ title: '', description: '', discount_type: 'percent', discount_value: '10', eligible_periods: ['monthly'], promo_code: '', requires_code: false, starts_at: '', ends_at: '', is_active: false })
const toLocalInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : ''
const dateValue = (value) => value ? new Date(value).toISOString() : null
const promotionErrorMessage = (error) => {
  const message = String(error?.message || error || '')
  const normalized = message.toLowerCase()
  if (normalized.includes('site_promotions_valid_dates') || normalized.includes('check constraint')) {
    return 'Tanggal promo tidak valid. Tanggal berakhir harus setelah tanggal mulai. Periksa kembali tanggal yang kamu pilih.'
  }
  if (normalized.includes('site_promotions') && (normalized.includes('does not exist') || normalized.includes('schema cache') || normalized.includes('could not find the table') || normalized.includes('relation'))) {
    return 'Pengaturan promo belum siap karena tabel promo belum tersedia di database. Minta administrator memeriksa dan menerapkan migrasi site_promotions.'
  }
  return 'Promo belum berhasil diproses. Periksa kembali data dan koneksi, lalu coba lagi.'
}

export default function PromotionManager({ onBack, onSignOut }) {
  const [promos, setPromos] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: queryError } = await supabase.from('site_promotions').select('*').order('created_at', { ascending: false })
    if (queryError) setError(promotionErrorMessage(queryError))
    else setPromos(data || [])
    setLoading(false)
  }, [])
  useEffect(() => {
    if (!supabase) return
    load()
    const channel = supabase.channel('admin-promotions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_promotions' }, load)
      .subscribe(status => { if (status === 'SUBSCRIBED') load() })
    const refreshOnResume = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', refreshOnResume)
    document.addEventListener('visibilitychange', refreshOnResume)
    return () => {
      window.removeEventListener('focus', refreshOnResume)
      document.removeEventListener('visibilitychange', refreshOnResume)
      supabase.removeChannel(channel)
    }
  }, [load])
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const reset = () => { setForm(initialForm()); setEditingId(null); setNotice('') }
  const edit = (promo) => {
    setEditingId(promo.id)
    setForm({ title: promo.title || '', description: promo.description || '', discount_type: promo.discount_type, discount_value: String(promo.discount_value), eligible_periods: promo.eligible_periods || [], promo_code: promo.promo_code || '', requires_code: Boolean(promo.requires_code), starts_at: toLocalInput(promo.starts_at), ends_at: toLocalInput(promo.ends_at), is_active: Boolean(promo.is_active) })
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async (event) => {
    event.preventDefault(); setNotice(''); setError('')
    if (!form.eligible_periods.length) { setError('Pilih setidaknya satu masa sewa.'); return }
    if (form.starts_at && form.ends_at && form.ends_at <= form.starts_at) { setError('Tanggal promo tidak valid. Tanggal berakhir harus setelah tanggal mulai. Periksa kembali tanggal yang kamu pilih.'); return }
    if (form.requires_code && !form.promo_code.trim()) { setError('Masukkan kode kupon untuk promo ini.'); return }
    if (form.discount_type === 'percent' && (Number(form.discount_value) <= 0 || Number(form.discount_value) > 100)) { setError('Diskon persentase harus lebih dari 0 dan maksimal 100%.'); return }
    if (Number(form.discount_value) <= 0) { setError('Nilai diskon harus lebih dari 0.'); return }
    setSaving(true)
    const payload = { title: form.title.trim() || 'Penawaran khusus NexaPos', description: form.description.trim(), discount_type: form.discount_type, discount_value: Number(form.discount_value), eligible_periods: form.eligible_periods, promo_code: form.requires_code ? form.promo_code.trim().toUpperCase() : null, requires_code: form.requires_code, starts_at: dateValue(form.starts_at), ends_at: dateValue(form.ends_at), is_active: form.is_active, updated_at: new Date().toISOString() }
    const result = editingId
      ? await supabase.from('site_promotions').update(payload).eq('id', editingId)
      : await supabase.from('site_promotions').insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id || null })
    setSaving(false)
    if (result.error) { setError(promotionErrorMessage(result.error)); return }
    setNotice(editingId ? 'Promo berhasil diperbarui.' : 'Promo berhasil dibuat.')
    reset()
    await load()
  }
  const toggle = async (promo) => {
    setError(''); setNotice('')
    const { error: updateError } = await supabase.from('site_promotions').update({ is_active: !promo.is_active, updated_at: new Date().toISOString() }).eq('id', promo.id)
    if (updateError) setError(promotionErrorMessage(updateError))
    else { setNotice(!promo.is_active ? 'Promo diaktifkan.' : 'Promo dinonaktifkan.'); await load() }
  }
  const remove = async (promo) => {
    if (!window.confirm('Hapus promo "' + promo.title + '"?')) return
    const { error: deleteError } = await supabase.from('site_promotions').delete().eq('id', promo.id)
    if (deleteError) setError(promotionErrorMessage(deleteError))
    else { setNotice('Promo dihapus.'); if (editingId === promo.id) reset(); await load() }
  }
  return <div className="app-shell super-admin-shell">
    <aside className="sidebar"><div className="sidebar-brand"><div className="brand"><span className="brand-mark">N</span><span>Nexa<span className="brand-accent">Pos</span><small>SMART COMMERCE</small></span></div></div><div className="store-switch"><span className="store-avatar"><ShieldCheck size={17}/></span><span className="store-copy"><strong>Super Admin</strong><small>Kontrol seluruh tenant</small></span></div><nav className="side-nav"><div className="nav-group"><div className="nav-section">PLATFORM</div><button className="nav-link" onClick={onBack}><ArrowLeft size={18}/><span>Kembali ke ringkasan</span></button><button className="nav-link nav-active"><Ticket size={18}/><span>Promo & Diskon</span></button></div></nav><div className="sidebar-bottom"><div className="user-card"><span className="user-avatar">N</span><span className="user-copy"><strong>Super Admin</strong><small>Pengaturan promo</small></span><button className="icon-button" onClick={onSignOut} title="Keluar"><X size={17}/></button></div></div></aside>
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="btn btn-outline btn-small nx-back-button" onClick={onBack}><ArrowLeft size={15}/> Kembali</button><div><div className="breadcrumb">Platform <span>/</span> <strong>Promo & Diskon</strong></div><div className="topbar-date">Atur penawaran yang tampil di homepage NexaPos</div></div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> SUPER ADMIN</span><button className="icon-button" onClick={load} title="Muat ulang"><RefreshCw size={17}/></button></div></header>
      <div className="page-content"><div className="page-heading"><div><span className="eyebrow muted">PLATFORM / PROMOTIONS</span><h1>Promo <span className="heading-accent">& diskon.</span></h1><p>Semua pelanggan tetap mendapatkan fitur yang sama. Promosi hanya mengubah harga untuk masa sewa yang dipilih.</p></div><span className="date-pill"><Ticket size={14}/>{promos.length} promo</span></div>
        {notice&&<div className="toast"><Check size={17}/><span>{notice}</span><button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {error&&<div className="notice" role="alert">{error}</div>}
        <div className="panel settings-form" style={{ marginBottom: 20 }}><div className="panel-head"><div><h3><CirclePercent size={17}/>{editingId?'Edit promosi':'Buat promosi baru'}</h3><p>Promo akan ditampilkan di homepage ketika status dan jadwalnya memenuhi syarat.</p></div>{editingId&&<button className="btn btn-outline btn-small" onClick={reset}><X size={14}/> Batal edit</button>}</div>
          <form onSubmit={save}><label>Nama promo</label><input className="text-input" value={form.title} onChange={e=>update('title',e.target.value)} placeholder="Contoh: Promo Pelanggan Baru" required/><label>Deskripsi singkat</label><textarea className="text-input" rows="2" value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Jelaskan penawaran dengan bahasa yang sopan dan jelas."/><div className="form-row"><div><label>Jenis diskon</label><select className="text-input" value={form.discount_type} onChange={e=>update('discount_type',e.target.value)}><option value="percent">Persentase (%)</option><option value="fixed">Potongan nominal (Rp)</option></select></div><div><label>Nilai diskon {form.discount_type==='percent'?'(%)':'(Rp)'}</label><input className="text-input" type="number" min="1" max={form.discount_type==='percent'?'100':undefined} step="1" value={form.discount_value} onChange={e=>update('discount_value',e.target.value)} required/></div></div>
            <label>Masa sewa yang berlaku</label><div className="nx-admin-periods">{periods.map(p=><label key={p.value}><input type="checkbox" checked={form.eligible_periods.includes(p.value)} onChange={e=>update('eligible_periods',e.target.checked? [...form.eligible_periods,p.value]:form.eligible_periods.filter(v=>v!==p.value))}/>{p.label}</label>)}</div>
            <label className="nx-admin-check"><input type="checkbox" checked={form.requires_code} onChange={e=>update('requires_code',e.target.checked)}/> Wajib menggunakan kode kupon</label>
            {form.requires_code&&<><label>Kode kupon</label><input className="text-input" value={form.promo_code} onChange={e=>update('promo_code',e.target.value.toUpperCase().replace(/\s/g,''))} placeholder="NEXA20" required/></>}
            <div className="form-row"><div><label>Mulai pada (opsional)</label><input className="text-input" type="datetime-local" value={form.starts_at} onChange={e=>update('starts_at',e.target.value)}/></div><div><label>Berakhir pada (opsional)</label><input className="text-input" type="datetime-local" value={form.ends_at} onChange={e=>update('ends_at',e.target.value)}/></div></div>
            <label className="nx-admin-check"><input type="checkbox" checked={form.is_active} onChange={e=>update('is_active',e.target.checked)}/> Aktifkan promo</label>
            <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={reset}>Kosongkan</button><button className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:<Save size={16}/>} Simpan promo</button></div>
          </form>
        </div>
        <div className="panel tenant-list-panel"><div className="panel-head"><div><h3><CalendarClock size={17}/> Daftar promosi</h3><p>Promo terjadwal akan otomatis berlaku dan berakhir berdasarkan tanggal yang ditetapkan.</p></div><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Refresh</button></div>
          {loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:promos.length===0?<div className="empty-state"><span className="empty-icon"><Ticket size={22}/></span><strong>Belum ada promosi</strong><p>Buat promosi pertama untuk menampilkannya di homepage.</p></div>:<div className="table-wrap"><table><thead><tr><th>Promosi</th><th>Diskon</th><th>Masa sewa</th><th>Jadwal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{promos.map(p=><tr key={p.id}><td><strong>{p.title}</strong><br/><small>{p.description||'Tanpa deskripsi'}{p.requires_code?' · Kupon: '+p.promo_code:' · Promo otomatis'}</small></td><td>{p.discount_type==='percent'?p.discount_value+'%':'Rp'+Number(p.discount_value).toLocaleString('id-ID')}</td><td>{(p.eligible_periods||[]).map(v=>periods.find(p=>p.value===v)?.label||v).join(', ')}</td><td><small>{p.starts_at?new Date(p.starts_at).toLocaleString('id-ID'):'Segera setelah diaktifkan'}<br/>s.d. {p.ends_at?new Date(p.ends_at).toLocaleString('id-ID'):'Tanpa batas akhir'}</small></td><td><span className={'status-pill '+(p.is_active?'status-paid':'status-inactive')}>{p.is_active?'Aktif':'Nonaktif'}</span></td><td><div className="tenant-actions"><button className="btn btn-small btn-outline" onClick={()=>edit(p)}>Edit</button><button className={'btn btn-small '+(p.is_active?'btn-outline':'btn-primary')} onClick={()=>toggle(p)}>{p.is_active?'Nonaktifkan':'Aktifkan'}</button><button className="btn btn-small btn-outline danger-icon" onClick={()=>remove(p)}><Trash2 size={13}/> Hapus</button></div></td></tr>)}</tbody></table></div>}
        </div>
      </div>
    </main>
  </div>
}
