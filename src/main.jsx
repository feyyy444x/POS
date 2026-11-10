import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PwaInstallPrompt from './PwaInstallPrompt.jsx'
import './styles.css'
import './acoPos-design-system.css'
import './acoPos-layout-safety.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('acoPos render error:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', padding: 24, boxSizing: 'border-box', background: '#f2f0e9', color: '#424943', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 760, margin: '8vh auto', padding: 24, border: '1px solid #e4e1d8', borderRadius: 16, background: '#fff' }}>
            <h1 style={{ marginTop: 0, fontSize: 24 }}>acoPos mengalami error saat dibuka</h1>
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
  console.error('acoPos browser error:', event.error || event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error('acoPos unhandled promise rejection:', event.reason)
})

// Optional PWA install support; app still works normally if service workers are unavailable.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('acoPos app shell registration failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <>
        <React.Suspense fallback={<div className="acoPos-module-loading" role="status"><span className="spinner spinner-large"/><span>Memuat acoPos…</span></div>}>
          <App />
        </React.Suspense>
        <PwaInstallPrompt />
      </>
    </AppErrorBoundary>
  </React.StrictMode>
)
