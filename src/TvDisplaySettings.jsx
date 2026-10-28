import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Link2, Monitor, Palette, Plus, RefreshCw, Save, ShieldCheck, Trash2, Volume2, Video } from 'lucide-react'
import { supabase } from './lib/supabase'
import './tv-display.css'

const DEFAULTS = {
  template: 'nexa-cinema',
  layout_mode: 'split-left',
  theme_mode: 'light',
  primary_color: '#2563eb',
  background_color: '#f8fafc',
  text_color: '#0f172a',
  queue_number_size: 112,
  customer_name_size: 32,
  counter_size: 26,
  next_queue_size: 22,
  media_volume: 35,
  announcement_volume: 100,
  voice_gender: 'female',
  media_fit: 'contain',
  portrait_background: 'blur',
  rotation_seconds: 20,
  public_token: null,
}

const TEMPLATES = [
  ['nexa-cinema', '01 — Nexa Cinema', 'Video besar di kiri, antrean di kanan'],
  ['nexa-showcase', '02 — Nexa Showcase', 'Media di atas, antrean di bawah'],
  ['nexa-queue', '03 — Nexa Queue', 'Khusus antrean, tanpa media'],
  ['nexa-grid', '04 — Nexa Grid', 'Panel antrean dalam susunan grid'],
  ['nexa-overlay', '05 — Nexa Overlay', 'Media dengan panel antrean overlay'],
  ['nexa-carousel', '06 — Nexa Carousel', 'Playlist media bergantian, antrean tetap terlihat'],
  ['nexa-smart-loop', '07 — Nexa Smart Loop', 'Media otomatis saat tidak ada antrean menunggu'],
]
const LAYOUTS = [
  ['split-left', 'Media besar kiri, antrean kanan'],
  ['media-top', 'Media di atas, antrean di bawah'],
  ['media-bottom', 'Antrean di atas, media di bawah'],
  ['queue-only', 'Antrean saja — tanpa media'],
  ['queue-grid', 'Antrean grid + media'],
  ['overlay', 'Media dengan panel antrean overlay'],
  ['carousel', 'Playlist media + antrean tetap'],
  ['smart-loop', 'Smart Loop — media dan antrean otomatis'],
]
const mb = bytes => (Number(bytes || 0) / (1024 * 1024)).toFixed(1)

function randomToken() {
  const bytes = new Uint8Array(32)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function previewSource(item) {
  const url = item?.source_url || ''
  if (!url) return { type: 'placeholder', url: '' }
  if (/\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url)) return { type: 'image', url }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'video', url }
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? { type: 'embed', url: 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0' } : { type: 'link', url }
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
      return id ? { type: 'embed', url: 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0' } : { type: 'link', url }
    }
    if (parsed.hostname.includes('tiktok.com')) {
      const match = parsed.pathname.match(/\/video\/(\d+)/)
      return match ? { type: 'embed', url: 'https://www.tiktok.com/embed/v2/' + match[1] } : { type: 'link', url }
    }
  } catch {}
  return { type: 'link', url }
}

export default function TvDisplaySettings({ store, membership, onNotice }) {
  const [draft, setDraft] = useState(DEFAULTS)
  const [media, setMedia] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [previewNow, setPreviewNow] = useState(() => new Date())
  const [saving, setSaving] = useState(false)
  const [addingMedia, setAddingMedia] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [localError, setLocalError] = useState('')
  const canManage = ['owner', 'admin'].includes(membership?.role)
  const storeId = store?.id

  const notify = useCallback((message) => {
    setLocalError(message)
    onNotice?.(message)
  }, [onNotice])

  const load = useCallback(async () => {
    if (!storeId || !supabase) return
    setLoaded(false)
    const [{ data: settingsRow, error: settingsError }, { data: mediaRows, error: mediaError }] = await Promise.all([
      supabase.from('store_tv_settings').select('*').eq('store_id', storeId).maybeSingle(),
      supabase.from('store_tv_media').select('*').eq('store_id', storeId).order('sort_order').order('created_at'),
    ])
    if (settingsError || mediaError) {
      notify('Pengaturan TV belum dapat dimuat. Pastikan migrasi TV Display sudah aktif pada proyek Supabase POS: ' + (settingsError?.message || mediaError?.message))
    } else {
      const loadedSettings = { ...DEFAULTS, ...(settingsRow || {}) }
      const legacyTemplates = { 'modern-blue': 'nexa-cinema', 'minimal-light': 'nexa-showcase', 'premium-dark': 'nexa-overlay', 'queue-media': 'nexa-carousel', professional: 'nexa-grid' }
      loadedSettings.template = legacyTemplates[loadedSettings.template] || (TEMPLATES.some(([value]) => value === loadedSettings.template) ? loadedSettings.template : 'nexa-cinema')
      if (loadedSettings.layout_mode === 'alternate') loadedSettings.layout_mode = 'smart-loop'
      if (loadedSettings.layout_mode === 'media-fullscreen') loadedSettings.layout_mode = 'overlay'
      setDraft(loadedSettings)
      setMedia(mediaRows || [])
      setLocalError('')
    }
    setLoaded(true)
  }, [storeId, notify])

  useEffect(() => {
    const timer = setInterval(() => setPreviewNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!storeId || !supabase) return
    load()
    const channel = supabase.channel('tv-settings-live-' + storeId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_tv_settings', filter: 'store_id=eq.' + storeId }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_tv_media', filter: 'store_id=eq.' + storeId }, load)
      .subscribe(status => { if (status === 'SUBSCRIBED') load() })
    return () => { supabase.removeChannel(channel) }
  }, [load, storeId])

  const setField = (key, value) => setDraft(prev => ({ ...prev, [key]: value }))
  const totalUploadBytes = useMemo(() => media.filter(item =>
    item.media_type === 'upload' && (
      item.upload_status === 'complete' ||
      (item.upload_status === 'pending' && item.reservation_expires_at && new Date(item.reservation_expires_at).getTime() > Date.now())
    )
  ).reduce((sum, item) => sum + Number(item.file_size_bytes || 0), 0), [media])
  const visibleMedia = useMemo(() => media.filter(item => item.media_type !== 'upload' || item.upload_status !== 'pending'), [media])
  const tvUrl = useMemo(() => draft.public_token
    ? window.location.origin + window.location.pathname + '?screen=queue&token=' + encodeURIComponent(draft.public_token)
    : '', [draft.public_token])

  const save = async (event) => {
    event?.preventDefault?.()
    if (!canManage || !storeId) return
    setSaving(true)
    const payload = { ...draft, store_id: storeId, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('store_tv_settings').upsert(payload)
    setSaving(false)
    if (error) { notify('Pengaturan belum tersimpan: ' + error.message); return }
    setDraft(payload)
    notify('Pengaturan TV berhasil disimpan. Semua TV akan mengikuti konfigurasi terbaru.')
  }

  const createOrRotateUrl = async () => {
    if (!canManage || !storeId) return
    const token = randomToken()
    const payload = { ...draft, store_id: storeId, public_token: token, updated_at: new Date().toISOString() }
    setSaving(true)
    const { error } = await supabase.from('store_tv_settings').upsert(payload)
    setSaving(false)
    if (error) { notify('URL TV belum dapat dibuat: ' + error.message); return }
    setDraft(payload)
    notify('URL TV berhasil dibuat. Simpan atau salin URL ini; Anda dapat menggantinya kapan saja.')
  }

  const revokeUrl = async () => {
    if (!canManage || !storeId || !window.confirm('Cabut akses URL TV saat ini? Semua TV yang memakai URL lama akan kehilangan akses.')) return
    const payload = { ...draft, store_id: storeId, public_token: null, updated_at: new Date().toISOString() }
    setSaving(true)
    const { error } = await supabase.from('store_tv_settings').upsert(payload)
    setSaving(false)
    if (error) { notify('URL TV belum dapat dicabut: ' + error.message); return }
    setDraft(payload)
    notify('Akses URL TV lama sudah dicabut.')
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl)
      notify('URL TV disalin.')
    } catch {
      notify('Browser tidak mengizinkan salin otomatis. Pilih dan salin URL dari kolom URL TV.')
    }
  }

  const addLink = async (event) => {
    event.preventDefault()
    if (!canManage || !storeId) return
    let parsed
    try { parsed = new URL(sourceUrl.trim()) } catch { notify('Masukkan URL media yang valid.'); return }
    if (!['http:', 'https:'].includes(parsed.protocol)) { notify('URL harus menggunakan HTTP atau HTTPS.'); return }
    if (!title.trim()) { notify('Isi nama media terlebih dahulu.'); return }
    setAddingMedia(true)
    const { data, error } = await supabase.from('store_tv_media').insert({
      store_id: storeId,
      media_type: 'link',
      title: title.trim(),
      source_url: parsed.href,
      sort_order: media.length,
      is_active: true,
    }).select('*').single()
    setAddingMedia(false)
    if (error) { notify('Tautan media belum tersimpan: ' + error.message); return }
    setMedia(prev => [...prev, data])
    setTitle('')
    setSourceUrl('')
    notify('Tautan media berhasil ditambahkan.')
  }

  const uploadVideo = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !canManage || !storeId) return
    const maxBytes = 100 * 1024 * 1024
    if (!['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
      notify('Format yang didukung: MP4, WebM, atau OGG video.')
      return
    }
    if (file.size < 1 || file.size > maxBytes) {
      notify('Ukuran berkas harus lebih dari 0 dan maksimal 100 MB.')
      return
    }
    if (totalUploadBytes + file.size > maxBytes) {
      notify('Kuota video tenant maksimal 100 MB. Hapus video lama terlebih dahulu.')
      return
    }

    setUploading(true)
    let reservation = null
    try {
      const { data: reserveData, error: reserveError } = await supabase.functions.invoke('tv-media-upload', {
        body: {
          action: 'reserve',
          store_id: storeId,
          title: file.name.slice(0, 160),
          file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
        },
      })
      if (reserveError || reserveData?.error || !reserveData?.media?.id || !reserveData?.path || !reserveData?.token) {
        throw new Error(reserveData?.error || reserveError?.message || 'Server upload belum siap. Coba lagi nanti.')
      }
      reservation = reserveData

      const { error: uploadError } = await supabase.storage.from('tv-media').uploadToSignedUrl(
        reserveData.path,
        reserveData.token,
        file,
        { contentType: file.type, upsert: false },
      )
      if (uploadError) throw new Error('Upload gagal: ' + uploadError.message)

      const { data: completeData, error: completeError } = await supabase.functions.invoke('tv-media-upload', {
        body: { action: 'complete', store_id: storeId, media_id: reserveData.media.id },
      })
      if (completeError || completeData?.error || !completeData?.media?.id) {
        throw new Error(completeData?.error || completeError?.message || 'Video belum berhasil diverifikasi.')
      }

      setMedia(prev => [...prev, completeData.media])
      notify('Video berhasil diunggah dan kuota telah diverifikasi oleh server.')
    } catch (error) {
      if (reservation?.media?.id) {
        await supabase.functions.invoke('tv-media-upload', {
          body: { action: 'cancel', store_id: storeId, media_id: reservation.media.id },
        })
      }
      // Refresh media/quota after a failed attempt so the editor reflects server cleanup.
      await load()
      notify(error?.message || 'Upload video gagal.')
    } finally {
      setUploading(false)
    }
  }

  const deleteMedia = async (item) => {
    if (!canManage || !window.confirm('Hapus media "' + item.title + '"?')) return
    if (item.media_type === 'upload') {
      const { data, error } = await supabase.functions.invoke('tv-media-upload', {
        body: { action: 'delete', store_id: storeId, media_id: item.id },
      })
      if (error || data?.error || !data?.ok) {
        notify(data?.error || error?.message || 'Video belum dapat dihapus.')
        return
      }
    } else {
      const { error } = await supabase.from('store_tv_media').delete().eq('id', item.id).eq('store_id', storeId)
      if (error) { notify('Tautan media belum dapat dihapus: ' + error.message); return }
    }
    setMedia(prev => prev.filter(row => row.id !== item.id))
    notify(item.media_type === 'upload' ? 'Video dan metadata dihapus.' : 'Tautan dihapus dari NexaPos. Video sumber di platform asal tetap ada.')
  }

  const templateClass = draft.theme_mode === 'dark' ? 'tv-preview-dark' : 'tv-preview-light'
  const previewLayout = draft.layout_mode || 'split-left'
  const isManagerText = canManage ? 'Owner/Admin dapat mengubah pengaturan' : 'Mode baca saja — pengaturan hanya dapat diubah Owner/Admin'

  if (!loaded) return <section className="page-section"><div className="panel tv-settings-loading"><RefreshCw className="spin" size={18}/> Memuat pengaturan TV…</div></section>

  return <section className="page-section tv-settings-page">
    <div className="page-heading"><div><span className="eyebrow muted">DISPLAY / QUEUE TV</span><h1>Edit Tampilan <span className="heading-accent">TV.</span></h1><p>Atur template, ukuran teks, warna, suara, dan media untuk semua TV tenant.</p></div><span className="role-chip"><ShieldCheck size={14}/>{membership?.role || 'Tenant'}</span></div>
    <div className="tv-settings-toolbar">
      <span className="tv-settings-permission"><ShieldCheck size={15}/>{isManagerText}</span>
      <button className="btn btn-outline" onClick={load}><RefreshCw size={15}/> Muat ulang</button>
    </div>
    {localError && <div className="tv-settings-notice">{localError}</div>}
    <div className="tv-settings-grid">
      <div className="tv-settings-controls">
        <form className="panel tv-settings-panel" onSubmit={save}>
          <div className="panel-head"><div><h3><Monitor size={17}/> Template dan tata letak</h3><p>Pilih template siap pakai, lalu sesuaikan tampilannya.</p></div></div>
          <label>Template dasar</label>
          <div className="tv-template-options">
            {TEMPLATES.map(([value, label, desc]) => <label key={value} className={'tv-template-option ' + (draft.template === value ? 'selected' : '')}>
              <input type="radio" name="tv-template" value={value} checked={draft.template === value} onChange={() => setDraft(prev => ({ ...prev, template: value, layout_mode: ({'nexa-cinema':'split-left','nexa-showcase':'media-top','nexa-queue':'queue-only','nexa-grid':'queue-grid','nexa-overlay':'overlay','nexa-carousel':'carousel','nexa-smart-loop':'smart-loop'})[value] || 'split-left', primary_color: ({'nexa-cinema':'#2563eb','nexa-showcase':'#64748b','nexa-queue':'#0f766e','nexa-grid':'#16a34a','nexa-overlay':'#8b5cf6','nexa-carousel':'#0ea5e9','nexa-smart-loop':'#0891b2'})[value], ...(value === 'nexa-overlay' ? { theme_mode: 'dark' } : value === 'nexa-showcase' ? { theme_mode: 'light' } : {}) }))} disabled={!canManage}/>
              <span><strong>{label}</strong><small>{desc}</small></span>
            </label>)}
          </div>
          <label>Tata letak antrean dan media</label>
          <select className="text-input" value={draft.layout_mode} onChange={e => setField('layout_mode', e.target.value)} disabled={!canManage}>
            {LAYOUTS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
          <div className="tv-form-row">
            <div><label>Mode warna</label><select className="text-input" value={draft.theme_mode} onChange={e => setField('theme_mode', e.target.value)} disabled={!canManage}><option value="light">Terang</option><option value="dark">Gelap</option></select></div>
            <div><label>Warna utama</label><input type="color" className="tv-color-input" value={draft.primary_color} onChange={e => setField('primary_color', e.target.value)} disabled={!canManage}/></div>
          </div>
          <div className="tv-form-row">
            <div><label>Warna latar</label><input type="color" className="tv-color-input" value={draft.background_color} onChange={e => setField('background_color', e.target.value)} disabled={!canManage}/></div>
            <div><label>Warna teks</label><input type="color" className="tv-color-input" value={draft.text_color} onChange={e => setField('text_color', e.target.value)} disabled={!canManage}/></div>
          </div>
          <div className="tv-setting-slider"><label>Ukuran nomor antrean <strong>{draft.queue_number_size}px</strong></label><input type="range" min="48" max="240" step="4" value={draft.queue_number_size} onChange={e => setField('queue_number_size', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-setting-slider"><label>Ukuran nama pelanggan <strong>{draft.customer_name_size}px</strong></label><input type="range" min="12" max="96" step="2" value={draft.customer_name_size} onChange={e => setField('customer_name_size', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-setting-slider"><label>Ukuran nama / nomor loket <strong>{draft.counter_size}px</strong></label><input type="range" min="12" max="72" step="2" value={draft.counter_size} onChange={e => setField('counter_size', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-setting-slider"><label>Ukuran antrean berikutnya <strong>{draft.next_queue_size}px</strong></label><input type="range" min="12" max="64" step="2" value={draft.next_queue_size} onChange={e => setField('next_queue_size', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-form-row">
            <div><label>Penyesuaian video</label><select className="text-input" value={draft.media_fit} onChange={e => setField('media_fit', e.target.value)} disabled={!canManage}><option value="contain">Tampilkan seluruh video</option><option value="cover">Penuhi area (dapat terpotong)</option><option value="original">Ukuran asli</option></select></div>
            <div><label>Latar video vertikal</label><select className="text-input" value={draft.portrait_background} onChange={e => setField('portrait_background', e.target.value)} disabled={!canManage}><option value="blur">Buram dari video</option><option value="dark">Hitam / gelap</option><option value="theme">Ikuti warna template</option></select></div>
          </div>
          <div className="tv-setting-slider"><label>Volume media <strong>{draft.media_volume}%</strong></label><input type="range" min="0" max="100" value={draft.media_volume} onChange={e => setField('media_volume', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-setting-slider"><label>Volume panggilan antrean <strong>{draft.announcement_volume}%</strong></label><input type="range" min="0" max="100" value={draft.announcement_volume} onChange={e => setField('announcement_volume', Number(e.target.value))} disabled={!canManage}/></div>
          <div className="tv-form-row">
            <div><label>Suara panggilan</label><select className="text-input" value={draft.voice_gender} onChange={e => setField('voice_gender', e.target.value)} disabled={!canManage}><option value="female">Perempuan (utama)</option><option value="male">Laki-laki (jika tersedia)</option></select></div>
            <div><label>Interval bergantian</label><select className="text-input" value={draft.rotation_seconds} onChange={e => setField('rotation_seconds', Number(e.target.value))} disabled={!canManage}>{[10,15,20,30,45,60].map(n => <option value={n} key={n}>{n} detik</option>)}</select></div>
          </div>
          <button className="btn btn-primary tv-save-button" type="submit" disabled={!canManage || saving}><Save size={16}/>{saving ? 'Menyimpan…' : 'Simpan dan terapkan'}</button>
        </form>
        <div className="panel tv-settings-panel">
          <div className="panel-head"><div><h3><Link2 size={17}/> URL TV tenant</h3><p>Satu URL untuk semua TV tenant. Token dapat diganti atau dicabut.</p></div></div>
          {tvUrl ? <><label>URL TV publik</label><div className="tv-url-row"><input className="text-input" value={tvUrl} readOnly/><button className="btn btn-outline" type="button" onClick={copyUrl}><Copy size={15}/> Salin</button></div><div className="tv-url-actions"><button className="btn btn-outline" type="button" onClick={() => window.open(tvUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={15}/> Buka pratinjau TV</button><button className="btn btn-outline danger-icon" type="button" onClick={revokeUrl} disabled={!canManage || saving}>Cabut URL</button></div></> : <p className="tv-settings-muted">URL TV belum dibuat.</p>}
          <button className="btn btn-outline" type="button" onClick={createOrRotateUrl} disabled={!canManage || saving}><RefreshCw size={15}/>{draft.public_token ? 'Ganti token / URL TV' : 'Buat URL TV'}</button>
        </div>
        <div className="panel tv-settings-panel">
          <div className="panel-head"><div><h3><Volume2 size={17}/> Media dan promosi</h3><p>Tambahkan tautan promosi; media akan tetap ada sampai dihapus.</p></div></div>
          <form className="tv-media-add-form" onSubmit={addLink}>
            <label>Nama media</label><input className="text-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Promo akhir bulan" maxLength={160} required disabled={!canManage}/>
            <label>URL gambar, video, YouTube, TikTok, atau tautan media</label><input className="text-input" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." type="url" required disabled={!canManage}/>
            <button className="btn btn-primary" type="submit" disabled={!canManage || addingMedia}><Plus size={15}/>{addingMedia ? 'Menambahkan…' : 'Tambah tautan media'}</button>
          </form>
          <div className="tv-upload-pending"><Video size={17}/><div><strong>Upload video ke Supabase Storage</strong><p>MP4, WebM, atau OGG video. Maksimal 100 MB total untuk seluruh video upload tenant; tidak ada batas durasi 1 menit. Video disimpan sampai Anda menghapusnya.</p><label className="btn btn-outline tv-upload-button">{uploading ? 'Mengunggah video…' : 'Pilih dan upload video'}<input type="file" accept="video/mp4,video/webm,video/ogg" hidden disabled={!canManage || uploading} onChange={uploadVideo}/></label></div></div>
          <div className="tv-quota-summary"><strong>Kuota video</strong><span>{mb(totalUploadBytes)} / 100 MB</span><div className="tv-quota-track"><i style={{width: Math.min(100, totalUploadBytes / 1048576) + '%'}}/></div></div>
          {visibleMedia.length ? <div className="tv-media-list">{visibleMedia.map(item => <div className="tv-media-row" key={item.id}><span className="tv-media-type"><Video size={16}/></span><div className="tv-media-copy"><strong>{item.title}</strong><small>{item.media_type === 'upload' ? (mb(item.file_size_bytes) + ' MB · video upload') : item.source_url}</small></div><button type="button" className="btn btn-outline btn-small danger-icon" onClick={() => deleteMedia(item)} disabled={!canManage}><Trash2 size={14}/> Hapus</button></div>)}</div> : <div className="tv-media-empty">Belum ada media. Tambahkan tautan promosi di atas.</div>}
        </div>
      </div>
      <aside className="tv-preview-column">
        <div className="panel tv-preview-panel"><div className="panel-head"><div><h3><Palette size={17}/> Pratinjau tampilan</h3><p>Contoh perubahan sebelum disimpan.</p></div></div>
          <div className={'tv-preview tv-preview-template-' + draft.template + ' ' + templateClass} style={{'--tv-primary': draft.primary_color, '--tv-bg': draft.background_color, '--tv-text': draft.text_color, '--tv-number-size': draft.queue_number_size + 'px', '--tv-name-size': draft.customer_name_size + 'px', '--tv-counter-size': draft.counter_size + 'px', '--tv-next-size': draft.next_queue_size + 'px'}}>
            <header><span className="tv-preview-brand">Nexa<span>Pos</span></span><span className="tv-preview-live">● LIVE</span><strong className="tv-preview-clock">{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(previewNow)} WIB</strong></header>
            <div className={'tv-preview-body tv-layout-' + previewLayout}>
              <section className="tv-preview-queue"><small>NOMOR ANTRIAN DIPANGGIL</small><strong className="tv-preview-number">A012</strong><b className="tv-preview-customer">Pelanggan contoh</b><span className="tv-preview-counter">Kasir 1</span><div className="tv-preview-next"><small>ANTRIAN BERIKUTNYA</small><strong>A013　A014　A015</strong></div></section>
              {previewLayout !== 'queue-only' && <section className="tv-preview-media"><div className="tv-preview-media-blur"/>{!media.length ? <div className="tv-preview-media-card"><Video size={24}/><strong>Area media / video</strong><small>Tambahkan media untuk menampilkan promosi</small></div> : media[0]?.media_type==='upload'?<div className="tv-preview-media-card"><Video size={24}/><strong>{media[0].title}</strong><small>Video upload</small></div>:previewSource(media[0]).type==='image'?<img className="tv-preview-media-image" src={previewSource(media[0]).url} alt={media[0].title}/>:previewSource(media[0]).type==='video'?<><video className="tv-preview-media-backdrop" src={previewSource(media[0]).url} muted autoPlay loop playsInline/><video className="tv-preview-media-video" src={previewSource(media[0]).url} muted autoPlay loop playsInline/><span className="tv-preview-media-label">{media[0].title}</span></>:previewSource(media[0]).type==='embed'?<iframe title={media[0].title} src={previewSource(media[0]).url} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<a className="tv-preview-media-card" href={previewSource(media[0]).url||undefined} target="_blank" rel="noreferrer"><Video size={24}/><strong>{media[0]?.title || 'Media promosi'}</strong><small>Buka tautan untuk melihat media</small></a>}</section>}
            </div>
            <footer>Informasi antrean diperbarui otomatis</footer>
          </div>
          <div className="tv-preview-actions"><button className="btn btn-primary" type="button" onClick={save} disabled={!canManage || saving}><Check size={15}/> Simpan dan terapkan</button></div>
        </div>
        <div className="panel tv-preview-help"><strong>Perilaku tampilan</strong><ul><li>Nomor yang dipanggil selalu menjadi prioritas.</li><li>Video 16:9 ditampilkan utuh secara default.</li><li>Video 9:16 memakai latar buram dari video yang sama.</li><li>Jam WIB berjalan setiap detik; nama pelanggan, nomor antrean, dan konter tetap berada dalam kanvas 16:9.</li><li>Perubahan tidak mengubah transaksi atau riwayat antrean.</li></ul></div>
      </aside>
    </div>
  </section>
}
