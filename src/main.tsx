import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/tokens.css'
import './theme/fonts'
import './index.css'
import App from './app/App.tsx'
import { restoreSession } from './core/auth/session'
import { authentication } from './core/http/api'
import { theme } from './theme/themePreference'

// public/theme-init.js already set the theme before first paint; this keeps it
// in step (System follows the device) for the life of the page.
theme.start()

// Before the first render, so RequireAuth sees a session that survived a reload.
restoreSession()
void authentication.recover()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
