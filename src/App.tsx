import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DevSignIn } from './core/auth/DevSignIn'
import { RequireAuth } from './core/auth/RequireAuth'
import { getSession } from './core/auth/session'
import { NotFound } from './layout/NotFound'
import { Shell } from './layout/Shell'
import { PortalOutlet, portalRoutePaths } from './remotes/PortalOutlet'
import { portals } from './remotes/registry'

function DashboardPlaceholder() {
  return (
    <>
      <h1>Dashboard</h1>
      <p>Signed in as {getSession()?.sub}.</p>
    </>
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
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          {portals.flatMap((portal) =>
            portalRoutePaths(portal).map((path) => (
              <Route key={path} path={path} element={<PortalOutlet portal={portal} />} />
            ))
          )}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
