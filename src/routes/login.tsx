import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { loginSchema } from '@shared/schemas'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ApiClientError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

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
          <Link to="/signup" className="text-fg underline underline-offset-4 decoration-line-strong hover:decoration-fg">
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

      <div className="mt-8 rounded-xl border border-line bg-surface p-4">
        <p className="eyebrow">Demo accounts</p>
        <div className="mt-3 space-y-2 font-mono text-[11px] text-fg-muted">
          <button
            type="button"
            className="block w-full text-left transition-colors hover:text-fg"
            onClick={() => {
              setEmail('organizer@notcalhacks.dev')
              setPassword('demo1234')
            }}
          >
            organizer@notcalhacks.dev &middot; demo1234
          </button>
          <button
            type="button"
            className="block w-full text-left transition-colors hover:text-fg"
            onClick={() => {
              setEmail('hacker@notcalhacks.dev')
              setPassword('demo1234')
            }}
          >
            hacker@notcalhacks.dev &middot; demo1234
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-fg-dim">
          Click either line to fill the form. Seeded data, safe to poke at.
        </p>
      </div>
    </AuthShell>
  )
}
