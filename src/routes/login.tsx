import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { loginSchema } from '@shared/schemas'
import {
  PORTAL_INTENT_META,
  parsePortalIntent,
  pathForIntent,
  sanitizeOAuthNext,
  type PortalIntent,
} from '@shared/portal'
import { AuthShell } from '@/components/auth-shell'
import { GoogleContinue } from '@/components/google-continue'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ApiClientError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const OAUTH_ERRORS: Record<string, string> = {
  oauth_state: 'Sign-in was interrupted. Try Google again.',
  oauth_exchange: 'Google did not complete the sign-in. Try again.',
  oauth_profile: 'Google did not return a profile we could use.',
  oauth_unverified: 'That Google account’s email is not verified.',
  not_organizer:
    'That account is not an organizer. Use the organizer demo login, or apply as a hacker or judge.',
}

const DEMO: Record<PortalIntent, { email: string; password: string; label: string }> = {
  hacker: {
    email: 'hacker@notcalhacks.dev',
    password: 'demo1234',
    label: 'hacker@notcalhacks.dev',
  },
  judge: { email: 'judge@notcalhacks.dev', password: 'demo1234', label: 'judge@notcalhacks.dev' },
  organizer: {
    email: 'organizer@notcalhacks.dev',
    password: 'demo1234',
    label: 'organizer@notcalhacks.dev',
  },
}

const COPY: Record<PortalIntent, { title: string; subtitle: string }> = {
  hacker: {
    title: 'Sign in as a hacker',
    subtitle: 'Pick up a draft, submit, or check where your application sits.',
  },
  judge: {
    title: 'Sign in as a judge',
    subtitle: 'The judge form is a different application on the same account.',
  },
  organizer: {
    title: 'Organizer sign-in',
    subtitle: 'The review console. Organizer accounts are granted, not created from this page.',
  },
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const intent = parsePortalIntent(params.get('as'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from
  const next = useMemo(() => {
    if (intent) return pathForIntent(intent, intent === 'organizer' ? 'organizer' : 'applicant')
    return sanitizeOAuthNext(from)
  }, [intent, from])

  useEffect(() => {
    const code = params.get('error')
    if (code && OAUTH_ERRORS[code]) toast.error(OAUTH_ERRORS[code])
  }, [params])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] ??= issue.message
      setErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const user = await login(parsed.data)
      if (intent === 'organizer' && user.role !== 'organizer') {
        toast.error(OAUTH_ERRORS.not_organizer)
        void navigate('/apply', { replace: true })
        return
      }
      const destination = intent
        ? pathForIntent(intent, user.role)
        : (from ?? (user.role === 'organizer' ? '/admin' : '/apply'))
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

  const copy = intent
    ? COPY[intent]
    : { title: 'Welcome back', subtitle: 'Sign in as a hacker, a judge, or an organizer.' }
  const signupHref = intent && intent !== 'organizer' ? `/signup?as=${intent}` : '/signup'

  const demoOrder: PortalIntent[] = intent
    ? [intent, ...(['hacker', 'judge', 'organizer'] as const).filter((i) => i !== intent)]
    : ['hacker', 'judge', 'organizer']

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      badgeRole={intent ? PORTAL_INTENT_META[intent].badgeRole : 'Applicant'}
      footer={
        intent === 'organizer' ? (
          <>
            Applying instead?{' '}
            <Link
              to="/apply"
              className="text-fg decoration-line-strong hover:decoration-fg underline underline-offset-4"
            >
              Pick hacker or judge
            </Link>
          </>
        ) : (
          <>
            No account yet?{' '}
            <Link
              to={signupHref}
              className="text-fg decoration-line-strong hover:decoration-fg underline underline-offset-4"
            >
              Create one
            </Link>
          </>
        )
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

      <GoogleContinue next={next} />

      <div className="panel mt-8 p-4">
        <p className="telemetry">Demo accounts</p>
        <div className="text-fg-muted mt-3 space-y-2 font-mono text-[11px]">
          {demoOrder.map((key) => {
            const demo = DEMO[key]
            return (
              <button
                key={key}
                type="button"
                className="hover:text-fg block w-full text-left transition-colors"
                onClick={() => {
                  setEmail(demo.email)
                  setPassword(demo.password)
                }}
              >
                {demo.label} &middot; demo1234
                <span className="text-fg-dim"> · {PORTAL_INTENT_META[key].label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-fg-dim mt-3 text-[11px] leading-relaxed">
          Click a line to fill the form. Seeded data, safe to poke at.
        </p>
      </div>
    </AuthShell>
  )
}
