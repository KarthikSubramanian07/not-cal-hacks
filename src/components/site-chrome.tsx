import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/wordmark'

export function SiteNav() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const onSignOut = async () => {
    try {
      await logout()
      toast.success('Signed out.')
      void navigate('/')
    } catch {
      toast.error('Could not sign you out. Try again.')
    }
  }

  return (
    <header className="sticky top-0 z-[30] border-b border-line bg-ink/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Wordmark />

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              {user.role === 'organizer' ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Console</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link to="/status">My status</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void onSignOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/apply">Apply</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line bg-ink/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-dim">
            Not affiliated with, endorsed by, or legally distinguishable from any similarly named
            hackathon.
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <Link to="/apply" className="text-fg-muted transition-colors hover:text-fg">
              Apply
            </Link>
            <Link to="/status" className="text-fg-muted transition-colors hover:text-fg">
              Status
            </Link>
            <Link to="/login" className="text-fg-muted transition-colors hover:text-fg">
              Sign in
            </Link>
            <a
              href="https://github.com/KarthikSubramanian07/not-cal-hacks"
              className="text-fg-muted transition-colors hover:text-fg"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <span className="text-fg-dim">MIT licensed</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
