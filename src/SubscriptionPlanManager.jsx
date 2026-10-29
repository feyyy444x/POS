import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import './admin-subscription-plans.css'

const defaultDurations = [
  { duration_key: 'daily', name: 'Harian', duration_days: 3, sort_order: 1, is_active: true },
  { duration_key: 'weekly', name: 'Mingguan', duration_days: 7, sort_order: 2, is_active: true },
  { duration_key: 'monthly', name: 'Bulanan', duration_days: 30, sort_order: 3, is_active: true },
  { duration_key: 'yearly', name: 'Tahunan', duration_days: 365, sort_order: 4, is_active: true },
  { duration_key: 'custom', name: 'Custom', duration_days: 15, sort_order: 5, is_active: true },
]
const featureDefaults = ['Semua fitur NexaPos', 'Kasir dan transaksi', 'Produk dan stok per cabang', 'Laporan operasional', 'Sistem antrian dan struk']
const packageDefaults = [
  { package_key: 'starter', name: 'Starter', location_limit: 3, note: 'Untuk satu lokasi usaha', prices: { daily: 5000, weekly: 15000, monthly: 49000, yearly: 490000, custom: 25000 }, features: featureDefaults, is_popular: false, is_active: true, sort_order: 1 },
  { package_key: 'growth', name: 'Growth', location_limit: 5, note: 'Untuk bisnis yang mulai berkembang', prices: { daily: 10000, weekly: 30000, monthly: 99000, yearly: 990000, custom: 45000 }, features: featureDefaults, is_popular: false, is_active: true, sort_order: 2 },
  { package_key: 'business', name: 'Business', location_limit: 10, note: 'Untuk bisnis dengan beberapa lokasi', prices: { daily: 15000, weekly: 50000, monthly: 179000, yearly: 1790000, custom: 75000 }, features: featureDefaults, is_popular: true, is_active: true, sort_order: 3 },
  { package_key: 'enterprise', name: 'Enterprise', location_limit: 15, note: 'Untuk jaringan usaha yang lebih besar', prices: { daily: 25000, weekly: 85000, monthly: 299000, yearly: 2990000, custom: 125000 }, features: featureDefaults, is_popular: false, is_active: true, sort_order: 4 },
]
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))

export default function SubscriptionPlanManager({ onBack }) {
  const [plans, setPlans] = useState(packageDefaults)
  const [durations, setDurations] = useState(defaultDurations)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plansReady, setPlansReady] = useState(false)
  const [savingKey, setSavingKey] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Koneksi database belum tersedia.'); return }
    setLoading(true); setError('')
    const [packageResult, durationResult] = await Promise.all([
      supabase.from('site_activation_packages').select('*').order('sort_order', { ascending: true }),
      supabase.from('site_activation_durations').select('*').order('sort_order', { ascending: true }),
    ])
    const queryError = packageResult.error || durationResult.error
    if (queryError) {
      setPlans([])
      setDurations([])
      setPlansReady(false)
      setError('Pengaturan paket aktivasi belum tersedia di database. Pastikan migrasi activation_packages_pricing sudah diterapkan. ' + queryError.message)
    } else {
      const savedPackages = new Map((packageResult.data || []).map(item => [item.package_key, item]))
      const missingKeys = packageDefaults.filter(item => !savedPackages.has(item.package_key)).map(item => item.package_key)
      setPlansReady(missingKeys.length === 0)
      setPlans(packageDefaults.map(item => ({ ...item, ...(savedPackages.get(item.package_key) || {}), prices: { ...item.prices, ...(savedPackages.get(item.package_key)?.prices || {}) }, features: savedPackages.get(item.package_key)?.features || item.features })))
      setDurations((durationResult.data || []).length ? durationResult.data.map(item => ({ ...item, duration_days: Number(item.duration_days) })) : defaultDurations)
      if (missingKeys.length) setError('Data paket belum tersedia lengkap (' + missingKeys.join(', ') + '). Muat migrasi dan seed paket terlebih dahulu agar nilai default tidak tersimpan tanpa sengaja.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  const activeDurations = useMemo(() => durations.filter(item => item.is_active).sort((a,b) => a.sort_order-b.sort_order), [durations])
  const updatePlan = (key, field, value) => setPlans(current => current.map(plan => plan.package_key === key ? { ...plan, [field]: value } : plan))
  const updatePrice = (key, durationKey, value) => setPlans(current => current.map(plan => plan.package_key === key ? { ...plan, prices: { ...(plan.prices || {}), [durationKey]: value } } : plan))
  const updateDuration = (key, field, value) => setDurations(current => current.map(item => item.duration_key === key ? { ...item, [field]: value } : item))

  const saveDuration = async duration => {
    setSavingKey('duration:'+duration.duration_key); setError(''); setNotice('')
    const payload = { duration_key: duration.duration_key, name: String(duration.name || '').trim(), duration_days: Number(duration.duration_days), sort_order: Number(duration.sort_order)||0, is_active: Boolean(duration.is_active), updated_at: new Date().toISOString(), updated_by: (await supabase.auth.getUser()).data.user?.id || null }
    if (!payload.name || !Number.isInteger(payload.duration_days) || payload.duration_days < 1 || payload.duration_days > 36500) { setError('Nama durasi wajib diisi dan jumlah hari harus antara 1–36.500.'); setSavingKey(''); return }
    const { error: saveError } = await supabase.from('site_activation_durations').upsert(payload, { onConflict: 'duration_key' })
    setSavingKey('')
    if (saveError) { setError(saveError.message); return }
    setNotice('Durasi '+payload.name+' berhasil disimpan.'); await load()
  }
  const addCustomDuration = async () => {
    const key = 'custom-'+Date.now().toString(36)
    const duration = { duration_key: key, name: 'Custom baru', duration_days: 15, sort_order: Math.max(0,...durations.map(item=>Number(item.sort_order)||0))+1, is_active: true }
    setSavingKey('duration:'+key); setError(''); setNotice('')
    const { error: insertError } = await supabase.from('site_activation_durations').insert({ ...duration, updated_at: new Date().toISOString(), updated_by: (await supabase.auth.getUser()).data.user?.id || null })
    setSavingKey('')
    if (insertError) { setError(insertError.message); return }
    setPlans(current => current.map(plan => ({ ...plan, prices: { ...(plan.prices || {}), [key]: 0 } })))
    setNotice('Durasi custom ditambahkan. Atur jumlah hari dan harga setiap paket, lalu simpan paketnya.')
    await load()
  }
  const savePlan = async plan => {
    setSavingKey(plan.package_key); setError(''); setNotice('')
    const payload = { package_key: plan.package_key, name: String(plan.name||'').trim(), location_limit: Number(plan.location_limit), note: String(plan.note||'').trim(), prices: plan.prices || {}, features: featureDefaults, is_popular: Boolean(plan.is_popular), is_active: Boolean(plan.is_active), sort_order: Number(plan.sort_order)||0, updated_at: new Date().toISOString(), updated_by: (await supabase.auth.getUser()).data.user?.id || null }
    if (!payload.name || !Number.isInteger(payload.location_limit) || payload.location_limit < 1 || payload.location_limit > 1000 || !Object.keys(payload.prices).length || Object.values(payload.prices).some(value => !Number.isFinite(Number(value)) || Number(value)<0)) { setError('Nama paket, kuota lokasi, dan semua harga harus valid (tidak negatif).'); setSavingKey(''); return }
    const { error: saveError } = await supabase.from('site_activation_packages').upsert(payload, { onConflict: 'package_key' })
    setSavingKey('')
    if (saveError) { setError(saveError.message); return }
    setNotice('Paket '+payload.name+' berhasil disimpan. Homepage akan mengikuti pengaturan terbaru.')
    await load()
  }

  return <div className="app-shell super-admin-shell nx-plan-admin">
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="btn btn-outline btn-small nx-back-button" onClick={onBack}><ArrowLeft size={15}/> Kembali</button><div><div className="breadcrumb">Platform <span>/</span> <strong>Paket Aktivasi & Harga</strong></div><div className="topbar-date">Atur kuota tenant/lokasi, harga setiap durasi, dan periode custom</div></div></div><div className="topbar-actions"><span className="role-chip"><ShieldCheck size={14}/> SUPER ADMIN</span><button className="btn btn-outline btn-small" onClick={load}><RefreshCw size={14}/> Muat ulang</button></div></header>
      <div className="page-content"><section className="page-section">
        <div className="page-heading"><div><span className="eyebrow muted">KONTROL AKTIVASI</span><h1>Paket aktivasi <span className="heading-accent">NexaPos.</span></h1><p>Semua paket memiliki fitur yang sama. Perbedaannya adalah kuota lokasi dan harga berdasarkan masa aktif. Kode aktivasi tetap diterbitkan oleh Super Admin.</p></div><span className="date-pill"><CheckCircle2 size={14}/> Aktivasi manual</span></div>
        {!loading && !plansReady && !error && <div className="notice">Data paket belum tersedia. Pastikan keempat paket aktivasi sudah dibuat di database sebelum mengedit harga.</div>}{notice&&<div className="toast"><CheckCircle2 size={17}/><span>{notice}</span></div>}{error&&<div className="notice">{error}</div>}
        <div className="panel nx-duration-panel"><div className="panel-head"><div><h3>Pengaturan masa aktif</h3><p>Tambah durasi custom atau ubah jumlah hari untuk setiap periode. Durasi yang dinonaktifkan tidak tampil di homepage dan promo.</p></div><button className="btn btn-primary btn-small" onClick={addCustomDuration} disabled={saving || !plansReady || Boolean(error)}><Plus size={15}/> Tambah durasi custom</button></div>
          {!error && plansReady && activeDurations.map(duration=><div className="nx-duration-row" key={duration.duration_key}>
            <div className="nx-duration-main"><label>Nama durasi<input className="text-input" value={duration.name} onChange={e=>updateDuration(duration.duration_key,'name',e.target.value)} maxLength={40}/></label><label>Jumlah hari<input className="text-input" type="number" min="1" max="36500" value={duration.duration_days} onChange={e=>updateDuration(duration.duration_key,'duration_days',e.target.value)}/></label><label>Urutan<input className="text-input" type="number" min="1" max="999" value={duration.sort_order} onChange={e=>updateDuration(duration.duration_key,'sort_order',e.target.value)}/></label></div>
            <div className="nx-duration-actions"><label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(duration.is_active)} onChange={e=>updateDuration(duration.duration_key,'is_active',e.target.checked)}/>{duration.is_active?<Eye size={14}/>:<EyeOff size={14}/>} Tampilkan</label><button className="btn btn-outline btn-small" disabled={savingKey==='duration:'+duration.duration_key} onClick={()=>saveDuration(duration)}><Save size={14}/> Simpan durasi</button></div>
          </div>)}
          {!error && plansReady && durations.filter(d=>!d.is_active).map(duration=><div className="nx-duration-row" key={duration.duration_key}><div className="nx-duration-main"><label>Durasi nonaktif<input className="text-input" value={duration.name} onChange={e=>updateDuration(duration.duration_key,'name',e.target.value)}/></label><label>Jumlah hari<input className="text-input" type="number" min="1" max="36500" value={duration.duration_days} onChange={e=>updateDuration(duration.duration_key,'duration_days',e.target.value)}/></label><label>Urutan<input className="text-input" type="number" value={duration.sort_order} onChange={e=>updateDuration(duration.duration_key,'sort_order',e.target.value)}/></label></div><div className="nx-duration-actions"><label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(duration.is_active)} onChange={e=>updateDuration(duration.duration_key,'is_active',e.target.checked)}/>Aktifkan</label><button className="btn btn-outline btn-small" disabled={savingKey==='duration:'+duration.duration_key} onClick={()=>saveDuration(duration)}><Save size={14}/> Simpan</button></div></div>)}
        </div>
        <div className="nx-subscription-admin-grid">{!error && plansReady && plans.map(plan=><article className="panel nx-subscription-admin-card" key={plan.package_key}>
          <div className="panel-head"><div><h3>{plan.name}</h3><p>Kode paket: <code>{plan.package_key}</code></p></div><span className={'status-pill '+(plan.is_active?'status-paid':'status-inactive')}>{plan.is_active?'Aktif':'Disembunyikan'}</span></div>
          <label>Nama paket<input className="text-input" value={plan.name} onChange={e=>updatePlan(plan.package_key,'name',e.target.value)} maxLength="60"/></label>
          <div className="nx-subscription-two-col"><label>Maksimal lokasi total<input className="text-input" type="number" min="1" max="1000" value={plan.location_limit} onChange={e=>updatePlan(plan.package_key,'location_limit',e.target.value)}/></label><label>Urutan tampil<input className="text-input" type="number" min="1" max="99" value={plan.sort_order} onChange={e=>updatePlan(plan.package_key,'sort_order',e.target.value)}/></label></div>
          <label>Deskripsi singkat<textarea className="text-input" rows="2" value={plan.note} onChange={e=>updatePlan(plan.package_key,'note',e.target.value)} maxLength="220"/></label>
          <label>Daftar fitur (satu fitur per baris)<textarea className="text-input nx-subscription-feature-input" rows="5" value={(plan.features||[]).join('\n')} onChange={e=>updatePlan(plan.package_key,'features',e.target.value.split('\n'))} maxLength="2000"/></label>
          <div className="nx-duration-price-grid"><strong>Harga per durasi</strong>{activeDurations.map(duration=><label key={duration.duration_key}><span>{duration.name} ({Number(duration.duration_days)} hari)</span><input className="text-input" type="number" min="0" step="1000" value={plan.prices?.[duration.duration_key] ?? 0} onChange={e=>updatePrice(plan.package_key,duration.duration_key,e.target.value)}/></label>)}</div>
          <div className="nx-subscription-preview"><div><strong>Pratinjau kartu homepage</strong><small>{plan.note||'Deskripsi paket'} · Maksimal {plan.location_limit} lokasi</small><b>{money(plan.prices?.monthly)} <small>/ {durations.find(d=>d.duration_key==='monthly')?.name||'Bulanan'}</small></b></div><ul>{(plan.features||[]).map((feature,index)=><li key={index}><CheckCircle2 size={15}/><span>{feature}</span></li>)}</ul></div>
          <div className="nx-subscription-admin-actions"><label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(plan.is_active)} onChange={e=>updatePlan(plan.package_key,'is_active',e.target.checked)}/>{plan.is_active?<Eye size={15}/>:<EyeOff size={15}/>} Tampilkan di homepage</label><label className="nx-subscription-toggle"><input type="checkbox" checked={Boolean(plan.is_popular)} onChange={e=>updatePlan(plan.package_key,'is_popular',e.target.checked)}/> Paket rekomendasi</label></div>
          <button className="btn btn-primary btn-wide" disabled={!plansReady || savingKey===plan.plan_key} onClick={()=>savePlan(plan)}>{savingKey===plan.plan_key?<span className="spinner"/>:<Save size={16}/>} Simpan paket</button>
        </article>)}</div>
        <p className="nx-subscription-admin-footnote">Harga yang diubah di sini berlaku untuk penawaran dan kode aktivasi baru. Kode aktivasi yang sudah diterbitkan harus tetap mengikuti ketentuan saat kode dibuat. Promo tetap dikelola di menu Promo & Diskon.</p>
      </section></div>
    </main>
  </div>
}
