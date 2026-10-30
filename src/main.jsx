import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PwaInstallPrompt from './PwaInstallPrompt.jsx'
import './styles.css'
import './owner-tenant-order.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('NexaPos render error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', padding: 24, boxSizing: 'border-box', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 760, margin: '8vh auto', padding: 24, border: '1px solid #fecaca', borderRadius: 16, background: '#fff' }}>
            <h1 style={{ marginTop: 0, fontSize: 24 }}>NexaPos mengalami error saat dibuka</h1>
            <p>Aplikasi mengalami kendala saat menampilkan halaman. Muat ulang halaman atau coba lagi beberapa saat.</p>
            <p>Data transaksi tidak dihapus oleh layar ini. Detail teknis di bawah membantu menemukan sumber error.</p>
            <details style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Detail teknis</summary>
              <pre style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f1f5f9', color: '#334155', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{String(this.state.error?.message || this.state.error || 'Error tidak menyediakan pesan detail.')}</pre>
              {this.state.error?.name && <p style={{ fontSize: 12, color: '#64748b' }}>Jenis error: {this.state.error.name}</p>}
            </details>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

// Surface uncaught browser errors rather than leaving a blank page.
window.addEventListener('error', (event) => {
  console.error('NexaPos browser error:', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('NexaPos unhandled promise rejection:', event.reason)
})

// Optional PWA install support; app still works normally if service workers are unavailable.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('NexaPos app shell registration failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <>
        <App />
        <PwaInstallPrompt />
      </>
    </AppErrorBoundary>
  </React.StrictMode>
)
