import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DevSignIn } from './core/auth/DevSignIn'
import { RequireAuth } from './core/auth/RequireAuth'
import { RequireRole } from './core/auth/RequireRole'
import { getSession } from './core/auth/session'
import { copy } from './layout/copy'
import { LoginUnavailable } from './layout/LoginUnavailable'
import { NotFound } from './layout/NotFound'
import { Shell } from './layout/Shell'
import { PortalOutlet } from './remotes/PortalOutlet'
import { portalRoutePaths } from './remotes/portalRoutePaths'
import { portals } from './remotes/registry'

function DashboardPlaceholder() {
  return (
    <>
      <h1 className="heading heading--page">{copy.dashboard.title}</h1>
      <p>{copy.dashboard.signedInAs(getSession()?.sub ?? '')}</p>
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
        <Route path="/login" element={devSignIn ? <DevSignIn /> : <LoginUnavailable />} />
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
              <Route
                key={path}
                path={path}
                element={
                  <RequireRole>
                    <PortalOutlet portal={portal} />
                  </RequireRole>
                }
              />
            ))
          )}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
