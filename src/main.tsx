import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import './theme/fonts'
import './index.css'
import App from './app/App.tsx'
import { restoreSession } from './core/auth/session'

// Before the first render, so RequireAuth sees a session that survived a reload.
restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
