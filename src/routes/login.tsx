import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { loginSchema } from '@shared/schemas'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { api, ApiClientError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

/** Google's mark, drawn rather than fetched so there is no third-party request. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  // The button only exists if the deployment actually has Google credentials.
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    void api
      .get<{ google: boolean }>('/auth/providers')
      .then((res) => setGoogleEnabled(res.google))
      .catch(() => setGoogleEnabled(false))
  }, [])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      return
    }

    setSubmitting(true)
    try {
      const user = await login(parsed.data)
      // Organizers land in the console; everyone else goes where they were
      // headed, or to their status page.
      const from = (location.state as { from?: string } | null)?.from
      const destination = from ?? (user.role === 'organizer' ? '/admin' : '/status')
      void navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fields ?? {})
        toast.error(error.message)
      } else {
        toast.error('Could not sign you in.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up a draft, check where your application sits, or get to the review console."
      footer={
        <>
          No account yet?{' '}
          <Link
            to="/signup"
            className="text-fg decoration-line-strong hover:decoration-fg underline underline-offset-4"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-1" noValidate>
        <Field label="Email" error={errors.email} required>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Password" error={errors.password} required>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" className="mt-3 w-full" size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="my-6 flex items-center gap-4">
            <span className="border-line h-px flex-1 border-t" />
            <span className="text-fg-dim font-mono text-[11px] tracking-[0.12em] uppercase">
              or
            </span>
            <span className="border-line h-px flex-1 border-t" />
          </div>
          <Button asChild variant="outline" size="lg" className="w-full">
            <a href="/api/auth/google">
              <GoogleMark className="size-4" />
              Continue with Google
            </a>
          </Button>
        </>
      ) : null}

      <div className="panel mt-8 p-4">
        <p className="telemetry">Demo accounts</p>
        <div className="text-fg-muted mt-3 space-y-2 font-mono text-[11px]">
          <button
            type="button"
            className="hover:text-fg block w-full text-left transition-colors"
            onClick={() => {
              setEmail('organizer@notcalhacks.dev')
              setPassword('demo1234')
            }}
          >
            organizer@notcalhacks.dev &middot; demo1234
          </button>
          <button
            type="button"
            className="hover:text-fg block w-full text-left transition-colors"
            onClick={() => {
              setEmail('hacker@notcalhacks.dev')
              setPassword('demo1234')
            }}
          >
            hacker@notcalhacks.dev &middot; demo1234
          </button>
        </div>
        <p className="text-fg-dim mt-3 text-[11px] leading-relaxed">
          Click either line to fill the form. Seeded data, safe to poke at.
        </p>
      </div>
    </AuthShell>
  )
}
