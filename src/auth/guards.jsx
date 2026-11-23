import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

// These guards only decide which SCREENS to show. They are UX, not security - anyone can
// edit client JS. Spring Security (hasRole / authenticated) is what actually enforces access.
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />
}

export function RequireAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />
}

export function GuestOnly() {
  const { user, isAdmin } = useAuth()
  // RequireAuth stores the page you were bounced from. Return there after login, EXCEPT for
  // plain "/": that is just the default entry point, so admins should land on their console.
  const from = useLocation().state?.from?.pathname
  const target = from && from !== '/' ? from : isAdmin ? '/admin' : '/'
  return user ? <Navigate to={target} replace /> : <Outlet />
}
