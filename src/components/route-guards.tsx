import { Navigate, Outlet, useLocation } from 'react-router'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { RouteFallback } from './route-fallback'

/**
 * Client-side route guards are a convenience, not a security boundary.
 *
 * They exist so a signed-out visitor sees the sign-in page instead of an empty
 * dashboard. The actual enforcement is in the API, which re-checks the session
 * and the role on every request regardless of what the browser believes.
 */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <RouteFallback />
  if (!user) {
    // Remember where they were headed so sign-in can return them there.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <Outlet />
}

export function RequireOrganizer() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const denied = !loading && user !== null && user.role !== 'organizer'

  useEffect(() => {
    if (denied) toast.error('That area is for organizers.')
  }, [denied])

  if (loading) return <RouteFallback />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (denied) return <Navigate to="/status" replace />
  return <Outlet />
}
