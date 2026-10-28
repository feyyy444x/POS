import { useMemo, useState } from 'react'
import { ArrowLeft, Bell, CheckCircle2, CircleDollarSign, Clock3, LockKeyhole, Minus, Monitor, Plus, Search, ShoppingBag, ShoppingCart, Ticket, X } from 'lucide-react'
import './demo.css'

const products = [
  { id: 1, name: 'Kopi Susu Aren', category: 'Minuman', price: 18000, stock: 24, icon: '☕', color: 'coffee' },
  { id: 2, name: 'Matcha Latte', category: 'Minuman', price: 22000, stock: 16, icon: '🍵', color: 'matcha' },
  { id: 3, name: 'Croissant Butter', category: 'Makanan', price: 16000, stock: 12, icon: '🥐', color: 'bread' },
  { id: 4, name: 'Chocolate Cookie', category: 'Makanan', price: 12000, stock: 30, icon: '🍪', color: 'cookie' },
  { id: 5, name: 'Iced Americano', category: 'Minuman', price: 15000, stock: 20, icon: '🧊', color: 'ice' },
  { id: 6, name: 'Cheese Danish', category: 'Makanan', price: 19000, stock: 8, icon: '🧀', color: 'cheese' },
]
const initialCart = [{ id: 1, qty: 1 }, { id: 3, qty: 1 }]
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

export default function Demo() {
  const [category, setCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState(initialCart)
  const [tab, setTab] = useState('Kasir')
  const [notice, setNotice] = useState('')
  const visibleProducts = useMemo(() => products.filter(p => (category === 'Semua' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase())), [category, search])
  const cartItems = cart.map(item => ({ ...products.find(p => p.id === item.id), qty: item.qty })).filter(item => item.id)
  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const updateCart = (id, delta) => setCart(current => {
    const found = current.find(item => item.id === id)
    if (!found && delta > 0) return [...current, { id, qty: 1 }]
    return current.map(item => item.id === id ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0)
  })
  const blocked = (label) => setNotice(label + ' dinonaktifkan di Demo. Ini hanya pratinjau, tidak ada transaksi atau perubahan data yang disimpan.')
  return <main className="nx-demo">
    <header className="demo-topbar">
      <a className="demo-brand" href="/"><span className="demo-brand-mark">N</span><span>NexaPos<small>PUBLIC DEMO</small></span></a>
      <div className="demo-top-status"><span className="demo-live-dot"/> Mode pratinjau <span className="demo-separator"/> Data contoh</div>
      <a className="demo-exit" href="/">Keluar demo <ArrowLeft size={15}/></a>
    </header>
    <div className="demo-banner"><div><span className="demo-banner-icon"><Monitor size={18}/></span><div><strong>Anda sedang mencoba Demo NexaPos</strong><p>Jelajahi tampilan dan alur kerja. Semua data bersifat contoh dan tidak disimpan.</p></div></div><span className="demo-readonly"><LockKeyhole size={13}/> FITUR AKSI NONAKTIF</span></div>
    <div className="demo-layout">
      <aside className="demo-sidebar"><div className="demo-store"><span className="demo-store-avatar">K</span><div><strong>Kedai Senja</strong><small>Tenant contoh · Coffee shop</small></div><span className="demo-chevron">⌄</span></div><div className="demo-nav-label">WORKSPACE</div>{[['Kasir',ShoppingCart],['Produk',ShoppingBag],['Antrian',Ticket],['Laporan',CircleDollarSign]].map(([label,Icon])=><button key={label} className={'demo-nav-item '+(tab===label?'active':'')} onClick={()=>setTab(label)}><Icon size={17}/>{label}{label==='Antrian'&&<span className="demo-nav-count">4</span>}</button>)}<div className="demo-sidebar-bottom"><div className="demo-user-avatar">DS</div><div><strong>Dina Saputri</strong><small>Kasir demo</small></div><span className="demo-preview-pill">DEMO</span></div></aside>
      <section className="demo-main">
        <div className="demo-page-heading"><div><span className="demo-eyebrow">KEDAI SENJA / WORKSPACE DEMO</span><h1>{tab==='Kasir'?'Kasir':tab==='Produk'?'Produk & stok':tab==='Antrian'?'Sistem antrian':'Ringkasan laporan'}<span>.</span></h1><p>Contoh tampilan operasional NexaPos untuk usaha Anda.</p></div><div className="demo-date"><Clock3 size={15}/> Hari ini, 28 Okt 2026</div></div>
        <div className="demo-stats"><article><span className="demo-stat-icon purple"><CircleDollarSign size={17}/></span><small>Penjualan contoh</small><strong>Rp2.450.000</strong><em>+12,8% <span>vs. kemarin</span></em></article><article><span className="demo-stat-icon mint"><ShoppingCart size={17}/></span><small>Transaksi contoh</small><strong>128</strong><em>Hari ini <span>· data simulasi</span></em></article><article><span className="demo-stat-icon orange"><Ticket size={17}/></span><small>Antrian aktif</small><strong>04 <span className="demo-stat-sub">nomor</span></strong><em>2 sedang dilayani</em></article></div>
        {tab==='Kasir'&&<div className="demo-pos-grid"><section className="demo-products-panel"><div className="demo-panel-heading"><div><h2>Pilih produk</h2><p>Tekan tambah untuk melihat contoh keranjang.</p></div><span className="demo-count">{visibleProducts.length} produk</span></div><label className="demo-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama produk..."/></label><div className="demo-categories">{['Semua','Minuman','Makanan'].map(item=><button key={item} className={category===item?'selected':''} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="demo-product-grid">{visibleProducts.map(p=><article className="demo-product-card" key={p.id}><div className={'demo-product-art '+p.color}><span>{p.icon}</span><small>{p.category}</small></div><div className="demo-product-info"><strong>{p.name}</strong><small>Stok contoh: {p.stock}</small><div><b>{money(p.price)}</b><button aria-label={'Tambah '+p.name+' ke keranjang demo'} onClick={()=>updateCart(p.id,1)}><Plus size={15}/></button></div></div></article>)}</div></section>
          <aside className="demo-cart-panel"><div className="demo-panel-heading"><div><h2>Keranjang</h2><p>Pratinjau pesanan</p></div><span className="demo-cart-count">{cartItems.reduce((n,item)=>n+item.qty,0)} item</span></div><div className="demo-cart-customer"><span className="demo-customer-avatar">P</span><div><strong>Pelanggan umum</strong><small>Transaksi demo · belum disimpan</small></div></div><div className="demo-cart-items">{cartItems.length?cartItems.map(item=><div className="demo-cart-item" key={item.id}><span className={'demo-cart-emoji '+item.color}>{item.icon}</span><div className="demo-cart-product"><strong>{item.name}</strong><small>{money(item.price)}</small><div className="demo-qty"><button onClick={()=>updateCart(item.id,-1)} aria-label="Kurangi jumlah"><Minus size={12}/></button><span>{item.qty}</span><button onClick={()=>updateCart(item.id,1)} aria-label="Tambah jumlah"><Plus size={12}/></button></div></div><b>{money(item.price*item.qty)}</b></div>):<p className="demo-empty-cart">Keranjang contoh masih kosong.</p>}</div><div className="demo-cart-total"><div><span>Subtotal</span><b>{money(total)}</b></div><div><span>Pajak</span><b>{money(0)}</b></div><div className="grand-total"><span>Total simulasi</span><strong>{money(total)}</strong></div></div><button className="demo-checkout" onClick={()=>blocked('Checkout')}><LockKeyhole size={15}/> Checkout dinonaktifkan</button><p className="demo-cart-note"><LockKeyhole size={12}/> Pembayaran dan transaksi sungguhan tidak tersedia di demo.</p></aside></div>}
        {tab==='Produk'&&<section className="demo-table-panel"><div className="demo-panel-heading"><div><h2>Daftar produk contoh</h2><p>Data hanya untuk dilihat, tidak dapat diedit.</p></div><button className="demo-disabled-action" onClick={()=>blocked('Tambah produk')}><LockKeyhole size={13}/> Tambah produk</button></div><div className="demo-table-scroll"><table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><span className={'demo-table-emoji '+p.color}>{p.icon}</span><strong>{p.name}</strong></td><td>{p.category}</td><td>{money(p.price)}</td><td>{p.stock}</td><td><span className="demo-stock-status">Tersedia</span></td><td><button className="demo-row-action" onClick={()=>blocked('Edit produk')}>Edit</button><button className="demo-row-action" onClick={()=>blocked('Hapus produk')}>Hapus</button></td></tr>)}</tbody></table></div></section>}
        {tab==='Antrian'&&<section className="demo-queue-panel"><div className="demo-panel-heading"><div><h2>Monitoring antrian</h2><p>Contoh tampilan antrian dan status layanan.</p></div><span className="demo-count"><Bell size={13}/> Simulasi lokal</span></div><div className="demo-queue-current"><span>SEDANG DIPANGGIL</span><strong>A012</strong><small>Meja kasir 1 · Pelanggan contoh</small></div><div className="demo-queue-list">{[['A013','Menunggu'],['A014','Menunggu'],['A015','Menunggu'],['A016','Dipanggil']].map(([number,status])=><div key={number}><strong>{number}</strong><span className={status==='Dipanggil'?'called':''}>{status}</span></div>)}</div><button className="demo-disabled-action" onClick={()=>blocked('Panggil antrian')}><LockKeyhole size={13}/> Panggil antrian dinonaktifkan</button></section>}
        {tab==='Laporan'&&<section className="demo-table-panel"><div className="demo-panel-heading"><div><h2>Ringkasan penjualan</h2><p>Angka berikut hanya data simulasi.</p></div><button className="demo-disabled-action" onClick={()=>blocked('Ekspor laporan')}><LockKeyhole size={13}/> Ekspor</button></div><div className="demo-report-bars">{[['Sen',42],['Sel',62],['Rab',48],['Kam',75],['Jum',58],['Sab',92],['Min',70]].map(([day,height])=><div key={day}><span style={{height:height+'%'}}/><small>{day}</small></div>)}</div><div className="demo-report-foot"><span>Perkiraan penjualan contoh</span><strong>Rp2.450.000</strong></div></section>}
        <div className="demo-footer-note"><CheckCircle2 size={15}/> Data demo terisolasi di browser ini. Tidak ada data bisnis sungguhan yang diakses.</div>
      </section>
    </div>
    {notice&&<div className="demo-toast" role="status"><LockKeyhole size={16}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Tutup pesan"><X size={15}/></button></div>}
  </main>
}
