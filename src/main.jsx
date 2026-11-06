import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PwaInstallPrompt from './PwaInstallPrompt.jsx'
import './styles.css'
import './chillpos-design-system.css'
import './chillpos-layout-safety.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ChillPos render error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', padding: 24, boxSizing: 'border-box', background: '#f2f0e9', color: '#424943', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 760, margin: '8vh auto', padding: 24, border: '1px solid #e4e1d8', borderRadius: 16, background: '#fff' }}>
            <h1 style={{ marginTop: 0, fontSize: 24 }}>ChillPos mengalami error saat dibuka</h1>
            <p>Aplikasi mengalami kendala saat menampilkan halaman. Muat ulang halaman atau coba lagi beberapa saat.</p>
            <p>Data transaksi tidak dihapus oleh layar ini. Detail teknis membantu menemukan sumber error.</p>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

// Surface uncaught browser errors rather than leaving a blank page.
window.addEventListener('error', (event) => {
  console.error('ChillPos browser error:', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('ChillPos unhandled promise rejection:', event.reason)
})

// Optional PWA install support; app still works normally if service workers are unavailable.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('ChillPos app shell registration failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <>
        <React.Suspense fallback={<div className="chillpos-module-loading" role="status"><span className="spinner spinner-large"/><span>Memuat ChillPos…</span></div>}>
          <App />
        </React.Suspense>
        <PwaInstallPrompt />
      </>
    </AppErrorBoundary>
  </React.StrictMode>
)
