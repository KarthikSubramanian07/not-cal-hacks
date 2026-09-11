import { NavLink, Outlet, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { LayoutGrid, Rows3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/wordmark'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

/**
 * Console shell.
 *
 * Two destinations only. An organizer is either looking at the whole pool or
 * working through the queue, and a sidebar with nine links would be pretending
 * there is more going on than there is.
 */
export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onSignOut = async () => {
    try {
      await logout()
      void navigate('/')
    } catch {
      toast.error('Could not sign you out.')
    }
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors',
      isActive ? 'bg-white/[0.07] text-fg' : 'text-fg-muted hover:bg-white/[0.04] hover:text-fg',
    )

  return (
    <div className="relative z-10 flex min-h-dvh flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-ink/70 backdrop-blur-xl lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 p-5 lg:block">
          <div>
            <Wordmark />
            <p className="telemetry mt-2 hidden lg:block">Review console</p>
          </div>

          <nav className="flex gap-1 lg:mt-7 lg:flex-col">
            <NavLink to="/admin" end className={link}>
              <LayoutGrid className="size-4" />
              Applications
            </NavLink>
            <NavLink to="/admin/review" className={link}>
              <Rows3 className="size-4" />
              Review queue
            </NavLink>
          </nav>
        </div>

        <div className="hidden border-t border-line p-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-[13px] text-fg">{user?.fullName}</p>
          <p className="truncate font-mono text-[11px] text-fg-dim">{user?.email}</p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void onSignOut()}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
