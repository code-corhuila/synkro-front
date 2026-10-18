import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DevSignIn } from './core/auth/DevSignIn'
import { RequireAuth } from './core/auth/RequireAuth'
import { getSession } from './core/auth/session'

function DashboardPlaceholder() {
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Signed in as {getSession()?.sub}.</p>
    </main>
  )
}

function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
    </main>
  )
}

function App() {
  // Read at render time, not module load, so the flag can't be baked in
  // before the environment is known (and tests can stub it).
  const devSignIn = import.meta.env.VITE_DEV_SIGN_IN === 'true'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {devSignIn && <Route path="/login" element={<DevSignIn />} />}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPlaceholder />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
