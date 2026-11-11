import { useEffect, useMemo, useState } from 'react'
import { Monitor, ShoppingBag, Wifi, Clock3, Maximize2, Minimize2 } from 'lucide-react'
import './CustomerOrderMirror.css'

const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const storageKey = storeId => 'acoPos-order-mirror-v1:' + storeId

export default function CustomerOrderMirror() {
  const storeId = new URLSearchParams(window.location.search).get('store') || ''
  const [draft, setDraft] = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // Fullscreen may be restricted by browser or device policy; the normal window remains usable.
    }
  }

  useEffect(() => {
    if (!storeId) return
    let channel
    const apply = value => {
      if (!value || value.storeId !== storeId) return
      setDraft(value)
      setLastUpdate(new Date(value.updatedAt || Date.now()))
      setConnected(true)
    }
    try {
      const saved = localStorage.getItem(storageKey(storeId))
      if (saved) apply(JSON.parse(saved))
    } catch {}
    try {
      channel = new BroadcastChannel('acopos-order-mirror-' + storeId)
      channel.onmessage = event => apply(event.data)
    } catch {}
    const onStorage = event => {
      if (event.key !== storageKey(storeId) || !event.newValue) return
      try { apply(JSON.parse(event.newValue)) } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      if (channel) channel.close()
    }
  }, [storeId])

  const items = draft?.items || []
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items])
  const timeLabel = lastUpdate ? lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''

  if (!storeId) return <main className="order-mirror-shell"><section className="order-mirror-empty"><Monitor/><h1>Layar pelanggan</h1><p>Link layar pelanggan tidak memiliki identitas toko.</p></section></main>

  return <main className="order-mirror-shell">
    <header className="order-mirror-header">
      <div className="order-mirror-brand"><span className="order-mirror-mark">a</span><div><strong>{draft?.storeName || 'acoPos'}</strong><small>RINGKASAN PESANAN PELANGGAN</small></div></div>
      <div className="order-mirror-header-actions">
        <div className={'order-mirror-live ' + (connected ? 'is-connected' : '')}><i/><span>{connected ? 'TERHUBUNG' : 'MENUNGGU KASIR'}</span></div>
        <button type="button" className="order-mirror-fullscreen" onClick={toggleFullscreen} title={isFullscreen ? 'Keluar dari layar penuh' : 'Tampilkan layar penuh'}>
          {isFullscreen ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}
          <span>{isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}</span>
        </button>
      </div>
    </header>
    <section className="order-mirror-content">
      <div className="order-mirror-intro"><span>ORDER PREVIEW</span><h1>Pesanan Anda</h1><p>Detail pesanan akan diperbarui otomatis saat kasir menambahkan menu.</p></div>
      {!items.length ? <div className="order-mirror-empty"><span className="order-mirror-empty-icon"><ShoppingBag/></span><h2>Silakan pilih menu</h2><p>Pesanan Anda akan muncul di layar ini.</p></div> :
        <div className="order-mirror-card">
          <div className="order-mirror-card-head"><div><span>RINCIAN PESANAN</span><strong>{itemCount} item · {items.length} menu</strong></div><span className="order-mirror-live-tag"><i/> LIVE</span></div>
          {draft?.customerName && <div className="order-mirror-customer">Pelanggan <strong>{draft.customerName}</strong></div>}
          <div className="order-mirror-items">
            {items.map(item => <article className="order-mirror-item" key={item.id}>
              <div className="order-mirror-item-main"><div className="order-mirror-item-name"><strong>{item.name}</strong><span>× {item.quantity}</span></div><small>{money(item.price)} / item</small>{item.note?.trim() && <p className="order-mirror-item-note">Catatan: {item.note}</p>}</div>
              <strong className="order-mirror-line-total">{money(item.price * item.quantity)}</strong>
            </article>)}
          </div>
          {draft?.orderNote?.trim() && <div className="order-mirror-general-note"><span>CATATAN PESANAN</span><p>{draft.orderNote}</p></div>}
          <div className="order-mirror-totals"><div><span>Subtotal</span><strong>{money(draft.subtotal)}</strong></div>{Number(draft.discount)>0&&<div><span>Diskon</span><strong>− {money(draft.discount)}</strong></div>}<div className="order-mirror-grand"><span>Total</span><strong>{money(draft.total)}</strong></div></div>
        </div>
      }
      <div className="order-mirror-footer-note"><Wifi size={15}/><span>Perubahan pesanan ditampilkan langsung dari kasir.</span>{timeLabel&&<small><Clock3 size={13}/> {timeLabel}</small>}</div>
    </section>
    <footer className="order-mirror-footer"><span>acoPos</span><span>Terima kasih telah berbelanja</span></footer>
  </main>
}
