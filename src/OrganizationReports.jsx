import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, BarChart3, CalendarDays, RefreshCw, Store, Wallet } from 'lucide-react'
import { supabase } from './lib/supabase'

const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const reportDate = value => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) : ''

export default function OrganizationReports({ organization, tenants = [] }) {
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [products, setProducts] = useState([])
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tenantIds = useMemo(() => tenants.filter(t => t.status !== 'deleted' && !t.deleted_at).map(t => t.id), [tenants])
  const tenantIdsKey = tenantIds.join(',')

  const load = useCallback(async () => {
    if (!supabase || !organization?.id || !tenantIds.length) {
      setOrders([]); setItems([]); setProducts([])
      setError(!organization?.id ? 'Perusahaan Owner belum terhubung.' : '')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const startBoundary = new Date(startDate + 'T00:00:00+07:00').toISOString()
    const endExclusiveDate = new Date(endDate + 'T00:00:00+07:00')
    endExclusiveDate.setUTCDate(endExclusiveDate.getUTCDate() + 1)
    const endBoundary = endExclusiveDate.toISOString()
    const nextOrders = []
    let ordersError = null
    for (let offset = 0; offset < 10000; offset += 1000) {
      const { data, error: queryError } = await supabase.from('orders').select('*')
        .in('store_id', tenantIds)
        .gte('created_at', startBoundary).lt('created_at', endBoundary)
        .order('created_at', { ascending: false }).range(offset, offset + 999)
      if (queryError) { ordersError = queryError; break }
      nextOrders.push(...(data || []))
      if ((data || []).length < 1000) break
    }
    if (ordersError) {
      setOrders([]); setItems([]); setProducts([])
      setError('Laporan perusahaan gagal dimuat. Pastikan akses Owner dan kebijakan RLS tenant sudah benar.')
      setLoading(false)
      return
    }
    setError(nextOrders.length >= 10000 ? 'Rentang tanggal memuat setidaknya 10.000 transaksi. Persempit rentang tanggal untuk memastikan laporan lengkap.' : '')
    setOrders(nextOrders)
    const orderIds = nextOrders.map(order => order.id)
    const itemBatches = []
    for (let index = 0; index < orderIds.length; index += 200) itemBatches.push(orderIds.slice(index, index + 200))
    const itemResults = await Promise.all(itemBatches.map(ids => supabase.from('order_items').select('*').in('order_id', ids)))
    const failedItems = itemResults.find(result => result.error)
    if (failedItems) {
      setItems([]); setProducts([])
      setError('Item transaksi tidak dapat dimuat; total unit dan modal belum dapat dihitung.')
      setLoading(false)
      return
    }
    const nextItems = itemResults.flatMap(result => result.data || [])
    setItems(nextItems)
    const productIds = [...new Set(nextItems.map(item => item.product_id).filter(Boolean))]
    const productBatches = []
    for (let index = 0; index < productIds.length; index += 200) productBatches.push(productIds.slice(index, index + 200))
    const productResults = await Promise.all(productBatches.map(ids => supabase.from('products').select('id,store_id,cost_price').in('id', ids)))
    const failedProducts = productResults.find(result => result.error)
    if (failedProducts) {
      setProducts([])
      setError('Data harga modal produk tidak dapat dimuat; total modal belum dapat dihitung.')
    } else setProducts(productResults.flatMap(result => result.data || []))
    setLoading(false)
  }, [organization?.id, tenantIdsKey, startDate, endDate])

  useEffect(() => {
    load()
    if (!supabase || !organization?.id) return
    const channel = supabase.channel('nexapos-organization-reports-' + organization.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load, organization?.id])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('id-ID')
    return orders.filter(order => {
      const date = reportDate(order.created_at)
      if (date < startDate || date > endDate) return false
      if (!q) return true
      const tenant = tenants.find(t => t.id === order.store_id)
      return [order.receipt_number, order.payment_method, order.status, order.cashier_id, tenant?.name]
        .some(value => String(value || '').toLocaleLowerCase('id-ID').includes(q))
    })
  }, [orders, tenants, startDate, endDate, search])

  const paidOrders = filtered.filter(order => order.status === 'paid')
  const paidIds = new Set(paidOrders.map(order => order.id))
  const paidItems = items.filter(item => paidIds.has(item.order_id))
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const units = paidItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const capital = paidItems.reduce((sum, item) => sum + (Number(products.find(product => product.id === item.product_id)?.cost_price) || 0) * (Number(item.quantity) || 0), 0)
  const tenantTotals = tenantIds.map(id => {
    const tenantOrders = paidOrders.filter(order => order.store_id === id)
    return { id, name: tenants.find(tenant => tenant.id === id)?.name || id, count: tenantOrders.length, total: tenantOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) }
  }).filter(row => row.count || row.total)

  const downloadCsv = () => {
    const rows = [
      ['Tenant', 'No Struk', 'Tanggal', 'Pembayaran', 'Kasir ID', 'Subtotal', 'Diskon', 'Total', 'Status'],
      ...filtered.map(order => [tenants.find(tenant => tenant.id === order.store_id)?.name || order.store_id, order.receipt_number, order.created_at, order.payment_method, order.cashier_id, order.subtotal, order.discount, order.total, order.status])
    ]
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'nexapos-laporan-perusahaan-' + startDate + '-sampai-' + endDate + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="page-section">
    <div className="page-heading"><div><span className="eyebrow muted">OWNER WORKSPACE / CONSOLIDATED REPORT</span><h1>Laporan <span className="heading-accent">perusahaan.</span></h1><p>Ringkasan lintas tenant yang terhubung ke perusahaan Owner. Setiap transaksi tetap menyimpan identitas tenant dan kasir.</p></div><button className="btn btn-outline" onClick={downloadCsv} disabled={loading || filtered.length === 0}><ArrowDownRight size={16}/> Unduh CSV</button></div>
    <div className="panel report-filter-panel"><div className="panel-head"><div><h3><CalendarDays size={17}/> Filter laporan perusahaan</h3><p>Rentang tanggal dan pencarian berlaku untuk seluruh tenant yang dapat diakses Owner.</p></div><button className="btn btn-outline btn-small" onClick={load} disabled={loading}>{loading?<span className="spinner"/>:<RefreshCw size={14}/>} Muat ulang</button></div><div className="report-filter-grid"><label>Dari tanggal<input className="text-input" type="date" max={today()} value={startDate} onChange={event=>{setStartDate(event.target.value);if(endDate<event.target.value)setEndDate(event.target.value)}}/></label><label>Sampai tanggal<input className="text-input" type="date" min={startDate} max={today()} value={endDate} onChange={event=>setEndDate(event.target.value)}/></label><label>Cari transaksi / tenant<input className="text-input" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="No. struk, metode, kasir, tenant…"/></label></div></div>
    {error && <div className="notice">{error}</div>}
    <div className="stats-grid report-finance-stats"><div className="stat-card"><span className="stat-icon tone-violet"><Wallet size={18}/></span><div><small>Total penjualan lintas tenant</small><strong>{money(revenue)}</strong><small>{paidOrders.length} transaksi lunas</small></div></div><div className="stat-card"><span className="stat-icon tone-blue"><BarChart3 size={18}/></span><div><small>Perkiraan modal produk</small><strong>{money(capital)}</strong><small>Harga modal × unit terjual</small></div></div><div className="stat-card"><span className="stat-icon tone-orange"><Store size={18}/></span><div><small>Tenant tercakup</small><strong>{tenantIds.length}</strong><small>Dari perusahaan Owner</small></div></div><div className="stat-card"><span className="stat-icon tone-green"><BarChart3 size={18}/></span><div><small>Unit terjual</small><strong>{units.toLocaleString('id-ID')}</strong><small>Seluruh tenant terpilih</small></div></div></div>
    <div className="panel report-panel"><div className="panel-head"><div><h3><Store size={17}/> Ringkasan per tenant</h3><p>Perbandingan transaksi lunas pada rentang yang dipilih.</p></div></div>{loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:<div className="table-wrap"><table><thead><tr><th>Tenant</th><th>Transaksi lunas</th><th>Total penjualan</th></tr></thead><tbody>{tenantTotals.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.count.toLocaleString('id-ID')}</td><td className="strong">{money(row.total)}</td></tr>)}</tbody></table></div>}</div>
    <div className="panel report-panel"><div className="panel-head"><div><h3>Transaksi seluruh tenant</h3><p>Nomor struk, tenant, pembayaran, dan total transaksi.</p></div><span className="result-count">{filtered.length} transaksi</span></div>{loading?<div className="empty-state"><span className="spinner spinner-large"/></div>:filtered.length===0?<div className="empty-state"><strong>Belum ada transaksi pada rentang ini</strong><p>Ubah tanggal atau kata pencarian.</p></div>:<div className="table-wrap"><table><thead><tr><th>Tenant</th><th>No. struk</th><th>Waktu</th><th>Kasir ID</th><th>Metode</th><th>Total</th><th>Status</th></tr></thead><tbody>{filtered.slice(0,300).map(order=><tr key={order.id}><td>{tenants.find(tenant=>tenant.id===order.store_id)?.name||order.store_id}</td><td className="mono strong">{order.receipt_number||'—'}</td><td>{new Date(order.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})}</td><td className="mono">{order.cashier_id||'—'}</td><td>{order.payment_method||'—'}</td><td className="strong">{money(order.total)}</td><td><span className={'status-pill '+(order.status==='paid'?'status-paid':'status-inactive')}>{order.status}</span></td></tr>)}</tbody></table></div>}</div>
  </section>
}
