import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { IS_DEMO } from './lib/supabase'

const Router = IS_DEMO ? MemoryRouter : BrowserRouter
import App from './App'
import { AuthProvider } from './state/auth'
import { PrefsProvider } from './state/prefs'
import { ToastProvider } from './state/toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <ToastProvider>
        <PrefsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PrefsProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>,
)
