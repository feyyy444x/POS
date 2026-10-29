import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import { userFacingError } from './lib/userFacingError'
import './admin-subscription-plans.css'

const defaults = [
  { plan_key: 'daily', name: 'Harian', duration: '1 hari', price: 10000, note: 'Untuk kebutuhan jangka pendek', features: ['Semua fitur NexaPos', 'POS dan manajemen produk', 'Laporan penjualan dan modal', 'Sistem antrian dan bantuan'], is_popular: false, is_active: true, sort_order: 1 },
  { plan_key: 'weekly', name: 'Mingguan', duration: '7 hari', price: 49000, note: 'Fleksibel untuk operasional mingguan', features: ['Semua fitur NexaPos', 'POS dan manajemen produk', 'Laporan penjualan dan modal', 'Sistem antrian dan bantuan'], is_popular: false, is_active: true, sort_order: 2 },
  { plan_key: 'monthly', name: 'Bulanan', duration: '30 hari', price: 149000, note: 'Praktis untuk operasional rutin', features: ['Semua fitur NexaPos', 'POS dan manajemen produk', 'Laporan penjualan dan modal', 'Sistem antrian dan bantuan'], is_popular: true, is_active: true, sort_order: 3 },
  { plan_key: 'yearly', name: 'Tahunan', duration: '365 hari', price: 1490000, note: 'Pilihan untuk penggunaan jangka panjang', features: ['Semua fitur NexaPos', 'POS dan manajemen produk', 'Laporan penjualan dan modal', 'Sistem antrian dan bantuan'], is_popular: false, is_active: true, sort_order: 4 },
]
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))

export default function SubscriptionPlanManager({ onBack, staffMode = false, session = null }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [plansReady, setPlansReady] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(''); setPlansReady(false)
    let data, queryError
    if (staffMode) {
      try { const response = await fetch('/.netlify/functions/platform-staff-workspace', { method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+(session?.access_token||'')}, body:JSON.stringify({action:'plans_list'}) }); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Paket belum dapat dimuat.'); data=result.data||[] }
      catch (error) { queryError=error }
    } else ({ data, error: queryError } = await supabase.from('site_subscription_plans').select('*').order('sort_order', { ascending: true }))
    if (queryError) {
      setPlans([])
      setPlansReady(false)
      setError(userFacingError(queryError, 'Paket belum dapat dimuat. Coba lagi atau hubungi admin jika masalah berlanjut.'))
    } else {
      setPlans(data || [])
      const expectedKeys = defaults.map(plan => plan.plan_key)
      const missingKeys = expectedKeys.filter(key => !(data || []).some(plan => plan.plan_key === key))
      if (missingKeys.length) setError('Data paket belum lengkap. Paket yang belum ditemukan: ' + missingKeys.join(', ') + '. Periksa database sebelum mengubah harga.')
      setPlansReady(missingKeys.length === 0)
    }
    setLoading(false)
  }, [staffMode, session?.access_token])

  useEffect(() => {
    load()
    if (staffMode) return
    const channel = supabase.channel('admin-subscription-plans-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_subscription_plans' }, load)
      .subscribe(status => { if (status === 'SUBSCRIBED') load() })
    return () => { supabase.removeChannel(channel) }
  }, [load, staffMode])
  const update = (key, field, value) => setPlans(current => current.map(plan => plan.plan_key === key ? { ...plan, [field]: value } : plan))

  const save = async plan => {
    setSavingKey(plan.plan_key); setError(''); setNotice('')
    const payload = {
      plan_key: plan.plan_key,
      name: plan.name.trim(),
      duration: plan.duration.trim(),
      price: Number(plan.price),
      note: plan.note.trim(),
      features: (Array.isArray(plan.features) ? plan.features : []).map(v => String(v).trim()).filter(Boolean),
      is_popular: Boolean(plan.is_popular),
      is_active: Boolean(plan.is_active),
      sort_order: Number(plan.sort_order) || 0,
      updated_at: new Date().toISOString(),
      updated_by: (await supabase.auth.getUser()).data.user?.id || null,
    }
    if (!payload.name || !payload.duration || !Number.isFinite(payload.price) || payload.price < 0) {
      setError('Nama, durasi, dan harga harus valid.'); setSavingKey(''); return
    }
    let saveError = null
    if (staffMode) {
      try { const response=await fetch('/.netlify/functions/platform-staff-workspace',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({action:'plans_save',plan:payload})}); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Paket belum berhasil disimpan.') }
      catch (error) { saveError=error }
    } else ({ error: saveError } = await supabase.from('site_subscription_plans').upsert(payload, { onConflict: 'plan_key' }))
    setSavingKey('')
    if (saveError) { setError(userFacingError(saveError, 'Paket belum berhasil disimpan. Periksa koneksi lalu coba lagi.')); return }
    setNotice('Paket ' + payload.name + ' berhasil disimpan. Homepage akan mengikuti pengaturan ini.')
    await load()
  }

  return <div className="app-shell super-admin-shell nx-plan-admin">
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="btn btn-outline btn-small nx-back-button" onClick={onBack}><ArrowLeft size={15}/> Kembali</button><div><div className="breadcrumb">Homepage <span>/</span> <strong>Langganan & paket</strong></div><div className="topbar-date">Atur harga, deskripsi, fitur dan ikon centang paket publik</div></div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> {staffMode ? 'STAF PLATFORM' : 'SUPER ADMIN'}</span><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Muat ulang</button></div></header>
      <div className="page-content">
        <section className="page-section">
          <div className="page-heading"><div><span className="eyebrow muted">PENGELOLAAN HOMEPAGE</span><h1>Langganan <span className="heading-accent">homepage.</span></h1><p>Harga, deskripsi dan daftar fitur yang disimpan di sini akan digunakan oleh kartu paket homepage. Ikon centang hijau tetap konsisten dan bukan emoji perangkat.</p></div><span className="date-pill"><CheckCircle2 size={14}/> Ikon centang dipertahankan</span></div>
          {notice && <div className="toast"><CheckCircle2 size={17}/><span>{notice}</span></div>}
          {error && <div className="notice">{error}</div>}
          {loading && <div className="empty-state"><span className="spinner spinner-large"/></div>}
          {!loading && plans.length === 0 && <div className="empty-state"><ShieldCheck size={22}/><strong>Data paket belum tersedia</strong><p>Harga tidak dapat diubah sampai data paket berhasil dimuat dari database.</p></div>}
          <div className="nx-subscription-admin-grid">
            {plans.map(plan => <article className="panel nx-subscription-admin-card" key={plan.plan_key}>
              <div className="panel-head"><div><h3>{plan.name || plan.plan_key}</h3><p>Kunci paket: <code>{plan.plan_key}</code></p></div><span className={'status-pill '+(plan.is_active?'status-paid':'status-inactive')}>{plan.is_active?'Tampil':'Disembunyikan'}</span></div>
              <label>Nama paket<input className="text-input" value={plan.name} onChange={e=>update(plan.plan_key,'name',e.target.value)} maxLength={60}/></label>
              <div className="nx-subscription-two-col"><label>Harga (Rupiah)<input className="text-input" type="number" min="0" step="1000" value={plan.price} onChange={e=>update(plan.plan_key,'price',e.target.value)}/></label><label>Durasi yang tampil<input className="text-input" value={plan.duration} onChange={e=>update(plan.plan_key,'duration',e.target.value)} maxLength={40}/></label></div>
              <label>Deskripsi singkat<textarea className="text-input" rows="2" value={plan.note} onChange={e=>update(plan.plan_key,'note',e.target.value)} maxLength={220}/></label>
              <label>Daftar fitur (satu fitur per baris)<textarea className="text-input nx-subscription-feature-input" rows="5" value={(plan.features || []).join('\n')} onChange={e=>update(plan.plan_key,'features',e.target.value.split('\n'))} maxLength={2000}/></label>
              <div className="nx-subscription-preview"><div><strong>Pratinjau kartu</strong><small>{plan.note || 'Deskripsi paket'}</small><b>{money(plan.price)} <small>/ {plan.duration}</small></b></div><ul>{(plan.features || []).filter(v=>String(v).trim()).map((feature,index)=><li key={index}><CheckCircle2 size={15}/><span>{feature}</span></li>)}</ul></div>
              <div className="nx-subscription-admin-actions">
                <label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(plan.is_active)} onChange={e=>update(plan.plan_key,'is_active',e.target.checked)}/>{plan.is_active?<Eye size={15}/>:<EyeOff size={15}/>} Tampilkan di homepage</label>
                <label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(plan.is_popular)} onChange={e=>update(plan.plan_key,'is_popular',e.target.checked)}/> Paket populer</label>
              </div>
              <label>Urutan tampil<input className="text-input" type="number" min="1" max="99" value={plan.sort_order} onChange={e=>update(plan.plan_key,'sort_order',e.target.value)}/></label>
              <button className="btn btn-primary btn-wide" disabled={!plansReady || savingKey===plan.plan_key} onClick={()=>save(plan)}>{savingKey===plan.plan_key?<span className="spinner"/>:<Save size={16}/>} Simpan paket</button>
            </article>)}
          </div>
          <p className="nx-subscription-admin-footnote">Perubahan tidak mengubah transaksi atau masa aktif tenant. Paket yang disembunyikan tidak tampil di homepage publik. Pengelolaan paket dibatasi oleh izin server untuk akun yang sedang masuk.</p>
        </section>
      </div>
    </main>
  </div>
}
