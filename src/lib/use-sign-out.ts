import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from './auth'

/**
 * Signs out and lands on the home page.
 *
 * It leaves the current page before the session clears. Otherwise a guarded
 * page that is still mounted sees no user, redirects to sign-in, and remembers
 * itself as the place to return to, so whoever signs in next on this browser
 * is sent to the previous person's page.
 */
export function useSignOut(): () => Promise<void> {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return useCallback(async () => {
    void navigate('/')
    try {
      await logout()
      toast.success('Signed out.')
    } catch {
      toast.error('Could not sign you out. Try again.')
    }
  }, [logout, navigate])
}
