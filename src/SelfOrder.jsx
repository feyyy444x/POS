import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Copy, ExternalLink, Image, Package, RefreshCw, ShieldCheck, ShoppingBag, Upload, X } from 'lucide-react'
import QRCode from 'qrcode'
import { supabase } from './lib/supabase'
import './SelfOrder.css'

const idr = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value||0))
const publicUrl = storeId => window.location.origin + '/?screen=self-order&store=' + encodeURIComponent(storeId)

export function SelfOrderPublic(){
  const storeId = new URLSearchParams(window.location.search).get('store')
  const [catalog,setCatalog] = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [cart,setCart] = useState({})
  const [customer,setCustomer] = useState({name:'',phone:'',notes:''})
  const [proof,setProof] = useState(null)
  const [order,setOrder] = useState(null)
  const [busy,setBusy] = useState(false)
  const [category,setCategory] = useState('Semua')
  const load = useCallback(async()=>{
    if(!storeId){setError('QR Code toko tidak valid.');setLoading(false);return}
    setLoading(true)
    const {data,error:loadError}=await supabase.rpc('get_public_self_order_catalog',{p_store_id:storeId})
    if(loadError){setError(loadError.message||'Self Order tidak tersedia.');setCatalog(null)}
    else{setCatalog(data);setError('')}
    setLoading(false)
  },[storeId])
  useEffect(()=>{load()},[load])
  const categories=useMemo(()=>['Semua',...new Set((catalog?.products||[]).map(p=>p.category||'Umum'))],[catalog])
  const selected=(catalog?.products||[]).filter(p=>(category==='Semua'||(p.category||'Umum')===category))
  const lines=Object.entries(cart).map(([id,quantity])=>({product:catalog?.products?.find(p=>p.id===id),quantity})).filter(x=>x.product&&x.quantity>0)
  const total=lines.reduce((sum,x)=>sum+Number(x.product.price)*x.quantity,0)
  const setQty=(id,delta)=>setCart(prev=>{const next={...prev};const qty=Math.max(0,Math.min(50,(next[id]||0)+delta));if(qty)next[id]=qty;else delete next[id];return next})
  const checkout=async()=>{
    if(!customer.name.trim()||lines.length===0||!proof){setError('Isi nama, pilih produk, dan lampirkan bukti pembayaran.');return}
    if(proof.size>5*1024*1024){setError('Ukuran bukti pembayaran maksimal 5 MB.');return}
    setBusy(true);setError('')
    const {data,error:createError}=await supabase.rpc('create_self_service_order',{
      p_store_id:storeId,p_customer_name:customer.name,p_customer_phone:customer.phone,
      p_customer_notes:customer.notes,p_items:lines.map(x=>({product_id:x.product.id,quantity:x.quantity}))
    })
    if(createError){setError(createError.message||'Pesanan gagal dibuat.');setBusy(false);return}
    const ext=(proof.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8)||'jpg'
    const path=storeId+'/'+data.id+'/proof.'+ext
    const {error:uploadError}=await supabase.storage.from('self-order-proofs').upload(path,proof,{contentType:proof.type||'image/jpeg',upsert:false})
    if(uploadError){setOrder({...data,uploadFailed:true});setError('Pesanan berhasil dibuat, tetapi bukti pembayaran belum terunggah. Hubungi kasir dan sebutkan nomor pesanan.');setBusy(false);return}
    const {data:attached,error:attachError}=await supabase.rpc('attach_self_service_payment_proof',{p_store_id:storeId,p_order_id:data.id,p_path:path})
    if(attachError){setOrder({...data,uploadFailed:true});setError('Bukti terunggah tetapi belum terhubung ke pesanan. Hubungi kasir dengan nomor pesanan.');setBusy(false);return}
    setOrder({...data,...attached});setCart({});setProof(null);setBusy(false)
  }
  if(loading)return <main className="so-public"><div className="so-loading">Memuat menu toko…</div></main>
  if(error&&!catalog)return <main className="so-public"><div className="so-empty"><ShoppingBag size={30}/><h1>Self Order tidak tersedia</h1><p>{error}</p><button className="so-primary" onClick={load}><RefreshCw size={16}/> Coba lagi</button></div></main>
  if(order)return <main className="so-public"><div className="so-success"><span className="so-success-icon"><Check size={28}/></span><span className="so-eyebrow">PESANAN DITERIMA</span><h1>Terima kasih, {customer.name || 'pelanggan'}.</h1><p>Pesanan Anda telah dikirim dan menunggu verifikasi pembayaran oleh kasir.</p><div className="so-order-reference"><small>Nomor pesanan</small><strong>{order.order_number}</strong><small>Total pembayaran</small><strong>{idr(order.total)}</strong><span className="so-pending"><Clock3 size={15}/> Menunggu verifikasi</span></div><button className="so-primary" onClick={()=>{setOrder(null);setCustomer({name:'',phone:'',notes:''});load()}}>Kembali ke menu</button></div></main>
  return <main className="so-public">
    <header className="so-public-header"><div className="so-brand-mark">N</div><div><strong>{catalog.store_name||'Toko NexaPos'}</strong><small>{catalog.address||'Pemesanan digital'}</small></div><span className="so-live">SELF ORDER</span></header>
    <section className="so-hero"><span className="so-eyebrow">PESAN DENGAN MUDAH</span><h1>Pesan favoritmu,<br/><em>tanpa antre.</em></h1><p>Pilih menu, periksa pesanan, lalu lakukan pembayaran melalui QRIS.</p></section>
    <div className="so-categories">{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <section className="so-product-grid">{selected.map(product=><article className="so-product" key={product.id}><div className="so-product-image"><Package size={23}/></div><div className="so-product-info"><small>{product.category||'Umum'}</small><strong>{product.name}</strong><b>{idr(product.price)}</b><div className="so-quantity"><button onClick={()=>setQty(product.id,-1)} aria-label={'Kurangi '+product.name}>−</button><span>{cart[product.id]||0}</span><button onClick={()=>setQty(product.id,1)} aria-label={'Tambah '+product.name}>+</button></div></div></article>)}</section>
    <section className="so-checkout">
      <div className="so-checkout-heading"><div><span className="so-eyebrow">CHECKOUT</span><h2>Ringkasan pesanan</h2></div><span>{lines.length} produk</span></div>
      {lines.length?lines.map(x=><div className="so-line" key={x.product.id}><span>{x.quantity} × {x.product.name}</span><strong>{idr(x.product.price*x.quantity)}</strong></div>):<p className="so-muted">Keranjang masih kosong.</p>}
      <div className="so-total"><span>Total pembayaran</span><strong>{idr(total)}</strong></div>
      <div className="so-payment"><h3>Pembayaran QRIS</h3>{catalog.qris_image_url?<img src={catalog.qris_image_url} alt="QRIS pembayaran toko"/>:<p className="so-muted">QRIS belum diatur oleh pengelola toko. Silakan hubungi kasir.</p>}<p>{catalog.payment_instructions}</p></div>
      <label>Nama pelanggan<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} maxLength={100} placeholder="Nama kamu"/></label>
      <label>Nomor WhatsApp (opsional)<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} maxLength={30} placeholder="08xxxxxxxxxx"/></label>
      <label>Catatan pesanan (opsional)<textarea value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})} maxLength={500} placeholder="Contoh: tanpa gula, es sedikit"/></label>
      <label className="so-proof-upload"><Upload size={18}/><span>{proof?proof.name:'Unggah bukti pembayaran'}</span><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setProof(e.target.files?.[0]||null)}/></label>
      {error&&<p className="so-error">{error}</p>}
      <button className="so-primary so-submit" disabled={busy||!lines.length||!customer.name.trim()||!proof||!catalog.qris_image_url} onClick={checkout}>{busy?'Mengirim pesanan…':'Kirim pesanan dan bukti pembayaran'} <span>→</span></button>
      <small className="so-disclaimer"><ShieldCheck size={13}/> Pembayaran diverifikasi oleh kasir sebelum pesanan diproses.</small>
    </section>
    <footer className="so-footer">Powered by NexaPos</footer>
  </main>
}

export default function SelfOrderManager({store,settings,isManager=false,onNotice}){
  const [orders,setOrders]=useState([])
  const [items,setItems]=useState({})
  const [proofs,setProofs]=useState({})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState('')
  const [enabled,setEnabled]=useState(Boolean(settings?.self_order_enabled))
  const [qrisUrl,setQrisUrl]=useState(settings?.self_order_qris_image_url||'')
  const [qrisFile,setQrisFile]=useState(null)
  const [instructions,setInstructions]=useState(settings?.self_order_payment_instructions||'Scan QRIS, lakukan pembayaran, lalu unggah bukti pembayaran.')
  const [filter,setFilter]=useState('all')
  const [copied,setCopied]=useState(false)
  const [qrDataUrl,setQrDataUrl]=useState('')
  const link=publicUrl(store.id)
  useEffect(()=>{let active=true;QRCode.toDataURL(link,{errorCorrectionLevel:'M',margin:2,width:320,color:{dark:'#10243a',light:'#ffffff'}}).then(url=>{if(active)setQrDataUrl(url)}).catch(()=>{if(active)setQrDataUrl('')});return()=>{active=false}},[link])
  useEffect(()=>{setEnabled(Boolean(settings?.self_order_enabled));setQrisUrl(settings?.self_order_qris_image_url||'');setInstructions(settings?.self_order_payment_instructions||'Scan QRIS, lakukan pembayaran, lalu unggah bukti pembayaran.')},[settings?.self_order_enabled,settings?.self_order_qris_image_url,settings?.self_order_payment_instructions])
  const load=useCallback(async()=>{
    if(!store?.id)return
    setLoading(true)
    const {data,error}=await supabase.from('self_service_orders').select('*').eq('store_id',store.id).order('created_at',{ascending:false}).limit(100)
    if(error){onNotice?.('Data Self Order belum tersedia. Pastikan migrasi Self Order telah diterapkan.');setOrders([]);setLoading(false);return}
    setOrders(data||[])
    const ids=(data||[]).map(x=>x.id)
    if(ids.length){
      const {data:detail}=await supabase.from('self_service_order_items').select('*').in('self_service_order_id',ids)
      const grouped={}
      ;(detail||[]).forEach(x=>(grouped[x.self_service_order_id] ||= []).push(x))
      setItems(grouped)
      const paths=(data||[]).filter(x=>x.payment_proof_path)
      const signed={}
      for(const row of paths){const {data:obj}=await supabase.storage.from('self-order-proofs').createSignedUrl(row.payment_proof_path,900);if(obj?.signedUrl)signed[row.id]=obj.signedUrl}
      setProofs(signed)
    }else{setItems({});setProofs({})}
    setLoading(false)
  },[store?.id,onNotice])
  useEffect(()=>{load()},[load])
  useEffect(()=>{if(!store?.id)return;const channel=supabase.channel('self-order-'+store.id).on('postgres_changes',{event:'*',schema:'public',table:'self_service_orders',filter:'store_id=eq.'+store.id},load).subscribe();return()=>supabase.removeChannel(channel)},[store?.id,load])
  const saveSettings=async e=>{
    e.preventDefault();setBusy('settings')
    let nextQrisUrl=qrisUrl.trim()||null
    let uploadedQrisPath=null
    if(qrisFile){
      const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}
      const extension=extensions[qrisFile.type]
      if(!extension){setBusy('');onNotice?.('Format QRIS harus PNG, JPG, atau WebP.');return}
      if(qrisFile.size>3*1024*1024){setBusy('');onNotice?.('Ukuran gambar QRIS maksimal 3 MB.');return}
      uploadedQrisPath=store.id+'/self-order-qris-'+Date.now()+'.'+extension
      const {error:uploadError}=await supabase.storage.from('store-logos').upload(uploadedQrisPath,qrisFile,{upsert:false,contentType:qrisFile.type})
      if(uploadError){setBusy('');onNotice?.(uploadError.message);return}
      nextQrisUrl=supabase.storage.from('store-logos').getPublicUrl(uploadedQrisPath).data.publicUrl
    }
    const {error}=await supabase.from('store_settings').update({self_order_enabled:enabled,self_order_qris_image_url:nextQrisUrl,self_order_payment_instructions:instructions.trim()}).eq('store_id',store.id)
    setBusy('')
    if(error){
      if(uploadedQrisPath)await supabase.storage.from('store-logos').remove([uploadedQrisPath])
      onNotice?.(error.message)
    }else{
      const previousMarker='/storage/v1/object/public/store-logos/'
      const previousIndex=qrisUrl.indexOf(previousMarker)
      const previousPath=previousIndex>=0?qrisUrl.slice(previousIndex+previousMarker.length).split('?')[0]:null
      if(uploadedQrisPath&&previousPath&&decodeURIComponent(previousPath).startsWith(store.id+'/'))await supabase.storage.from('store-logos').remove([decodeURIComponent(previousPath)])
      setQrisUrl(nextQrisUrl||'');setQrisFile(null);onNotice?.('Pengaturan Self Order berhasil disimpan.')
    }
  }
  const act=async(id,action)=>{
    setBusy(id+action)
    const {error}=await supabase.rpc('update_self_service_order_status',{p_order_id:id,p_action:action,p_note:action==='reject'?'Pembayaran tidak dapat diverifikasi':''})
    setBusy('')
    if(error)onNotice?.(error.message);else{onNotice?.('Status pesanan berhasil diperbarui.');load()}
  }
  const filtered=orders.filter(o=>filter==='all'||(filter==='pending'&&o.payment_status==='pending_verification')||(filter==='paid'&&o.payment_status==='paid')||(filter==='rejected'&&o.payment_status==='rejected'))
  const copy=async()=>{await navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  return <section className="page-section self-order-manager">
    <div className="page-heading"><div><span className="eyebrow muted">CUSTOMER EXPERIENCE / DIGITAL ORDERING</span><h1>Self <span className="heading-accent">Order.</span></h1><p>Kelola pemesanan pelanggan melalui tautan QR toko dan verifikasi pembayaran.</p></div><button className="btn btn-outline" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    <div className="so-manager-grid">
      {isManager&&<form className="panel so-manager-settings" onSubmit={saveSettings}><div className="panel-head"><div><h3><ShoppingBag size={17}/> Pengaturan Self Order</h3><p>Aktifkan halaman pemesanan dan atur QRIS toko.</p></div></div>
        <label className="so-toggle"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span><strong>Aktifkan Self Order</strong><small>Pelanggan dapat mengakses menu melalui QR toko.</small></span></label>
        <label>Gambar QRIS merchant<input className="text-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setQrisFile(e.target.files?.[0]||null)}/><small>PNG, JPG, atau WebP · maksimal 3 MB.</small></label>{qrisFile&&<small className="so-muted">File dipilih: {qrisFile.name}</small>}{qrisUrl&&<img className="so-qris-preview" src={qrisUrl} alt="QRIS merchant saat ini"/>}
        <label>Instruksi pembayaran<textarea className="text-input" rows="3" value={instructions} onChange={e=>setInstructions(e.target.value)}/></label>
        <button className="btn btn-primary" disabled={busy==='settings'}>{busy==='settings'?'Menyimpan…':'Simpan pengaturan'}</button>
      </form>}
      <div className="panel so-manager-link"><div className="panel-head"><div><h3><ExternalLink size={17}/> Tautan pemesanan toko</h3><p>Bagikan tautan ini atau jadikan QR Code pada materi toko.</p></div></div><code>{link}</code>{qrDataUrl&&<div className="so-qr-download"><img src={qrDataUrl} alt="QR Code Self Order toko"/><a className="btn btn-outline" href={qrDataUrl} download={`self-order-${store.id}.png`}>Unduh QR Code</a></div>}<button className="btn btn-outline" onClick={copy}><Copy size={16}/>{copied?'Tersalin':'Salin tautan'}</button><small>QR Code cetak dapat dibuat dari tautan ini. Pastikan Self Order telah diaktifkan.</small></div>
    </div>
    <div className="panel so-order-list"><div className="panel-head"><div><h3>Pesanan masuk</h3><p>Verifikasi pembayaran sebelum mulai memproses pesanan.</p></div><select className="text-input" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Semua pesanan</option><option value="pending">Menunggu verifikasi</option><option value="paid">Sudah dibayar</option><option value="rejected">Ditolak</option></select></div>
      {loading?<p className="so-muted">Memuat pesanan…</p>:!filtered.length?<div className="so-manager-empty"><ShoppingBag size={25}/><strong>Belum ada pesanan</strong><span>Pesanan pelanggan akan tampil di sini.</span></div>:filtered.map(o=><article className="so-order-card" key={o.id}><div className="so-order-card-head"><div><strong>{o.order_number}</strong><small>{new Date(o.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</small></div><span className={'so-status '+o.payment_status}>{o.payment_status==='pending_verification'?'Menunggu verifikasi':o.payment_status==='paid'?'Dibayar':o.payment_status==='rejected'?'Ditolak':'Menunggu pembayaran'}</span></div><div className="so-order-customer"><strong>{o.customer_name}</strong><small>{o.customer_phone||'Nomor telepon tidak diisi'}</small>{o.customer_notes&&<p>{o.customer_notes}</p>}</div><div className="so-order-items">{(items[o.id]||[]).map(i=><div key={i.id}><span>{i.quantity} × {i.product_name}</span><strong>{idr(i.line_total)}</strong></div>)}</div><div className="so-order-total"><span>Total</span><strong>{idr(o.total)}</strong></div>{proofs[o.id]&&<a className="so-proof-link" href={proofs[o.id]} target="_blank" rel="noreferrer"><Image size={16}/> Lihat bukti pembayaran</a>}
        {o.payment_status==='pending_verification'&&<div className="so-order-actions"><button className="btn btn-primary" disabled={!!busy} onClick={()=>act(o.id,'approve')}><Check size={15}/> Setujui pembayaran</button><button className="btn btn-outline" disabled={!!busy} onClick={()=>act(o.id,'reject')}><X size={15}/> Tolak pembayaran</button></div>}
        {o.payment_status==='paid'&&o.order_status!=='completed'&&<div className="so-order-actions">{o.order_status==='confirmed'&&<button className="btn btn-primary" disabled={!!busy} onClick={()=>act(o.id,'preparing')}>Mulai diproses</button>}{o.order_status==='preparing'&&<button className="btn btn-primary" disabled={!!busy} onClick={()=>act(o.id,'ready')}>Siap diambil</button>}{o.order_status==='ready'&&<button className="btn btn-primary" disabled={!!busy} onClick={()=>act(o.id,'completed')}>Selesaikan pesanan</button>}</div>}
      </article>)}
    </div>
  </section>
}
