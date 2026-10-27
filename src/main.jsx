import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import PwaInstallPrompt from './PwaInstallPrompt.jsx'
import './styles.css'

// Optional PWA install support; app still works normally if service workers are unavailable.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('NexaPos app shell registration failed:', error)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><><App /><PwaInstallPrompt /></></React.StrictMode>
)
