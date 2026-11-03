import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DevSignIn } from '../core/auth/DevSignIn'
import { RequireAuth } from '../core/auth/RequireAuth'
import { RequireRole } from '../core/auth/RequireRole'
import { Dashboard } from '../layout/Dashboard'
import { AuthLogin } from '../remotes/AuthLogin'
import { NotFound } from '../layout/NotFound'
import { Shell } from '../layout/Shell'
import { PortalOutlet } from '../remotes/PortalOutlet'
import { portalRoutePaths } from '../remotes/portalRoutePaths'
import { portals } from '../remotes/registry'

function App() {
  // Read at render time, not module load, so the flag can't be baked in
  // before the environment is known (and tests can stub it).
  const devSignIn = import.meta.env.VITE_DEV_SIGN_IN === 'true'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={devSignIn ? <DevSignIn /> : <AuthLogin />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
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
