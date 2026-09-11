import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SessionUser } from '@shared/api'
import type { LoginInput, SignupInput } from '@shared/schemas'
import { api } from './api'

interface AuthState {
  user: SessionUser | null
  /** True until the first `/auth/me` call settles. */
  loading: boolean
  login: (input: LoginInput) => Promise<SessionUser>
  signup: (input: SignupInput) => Promise<SessionUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: SessionUser | null
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { user: next } = await api.get<{ user: SessionUser | null }>('/auth/me')
      setUser(next)
    } catch {
      // A failed session probe means signed out, not a broken page.
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      login: async (input) => {
        const { user: next } = await api.post<{ user: SessionUser }>('/auth/login', input)
        setUser(next)
        return next
      },
      signup: async (input) => {
        const { user: next } = await api.post<{ user: SessionUser }>('/auth/signup', input)
        setUser(next)
        return next
      },
      logout: async () => {
        await api.post('/auth/logout')
        setUser(null)
      },
    }),
    [user, loading, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
