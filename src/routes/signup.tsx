import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { signupSchema } from '@shared/schemas'
import { PORTAL_INTENT_META, parsePortalIntent, pathForIntent } from '@shared/portal'
import { AuthShell } from '@/components/auth-shell'
import { GoogleContinue } from '@/components/google-continue'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ApiClientError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const intent = parsePortalIntent(params.get('as'))
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (intent === 'organizer') void navigate('/login?as=organizer', { replace: true })
  }, [intent, navigate])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})

    const parsed = signupSchema.safeParse({ fullName, email, password })
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message
      setErrors(next)
      return
    }

    setSubmitting(true)
    try {
      const user = await signup(parsed.data)
      toast.success('Account created.')
      const destination =
        intent && intent !== 'organizer' ? pathForIntent(intent, user.role) : '/apply'
      void navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.fields ?? {})
        toast.error(error.message)
      } else {
        toast.error('Could not create your account.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const applyingAs = intent && intent !== 'organizer' ? PORTAL_INTENT_META[intent] : null

  return (
    <AuthShell
      title={applyingAs ? `Apply as a ${applyingAs.label.toLowerCase()}` : 'Create an account'}
      subtitle={
        applyingAs
          ? `One account covers both applications. After this you land on the ${applyingAs.label.toLowerCase()} form.`
          : 'One account covers hacker and judge. It takes about twenty seconds, and then the actual form takes five minutes.'
      }
      badgeRole={applyingAs?.badgeRole ?? 'Applicant'}
      footer={
        <>
          Already have one?{' '}
          <Link
            to={intent && intent !== 'organizer' ? `/login?as=${intent}` : '/login'}
            className="text-fg decoration-line-strong hover:decoration-fg underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-1" noValidate>
        <Field label="Full name" error={errors.fullName} required>
          {(props) => (
            <Input
              {...props}
              autoComplete="name"
              placeholder="Alex Rivera"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
        </Field>

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

        <Field
          label="Password"
          hint="At least 8 characters. Length beats punctuation."
          error={errors.password}
          required
        >
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" className="mt-3 w-full" size="lg" loading={submitting}>
          Create account
        </Button>
      </form>
      <GoogleContinue
        next={intent && intent !== 'organizer' ? pathForIntent(intent, 'applicant') : '/apply'}
      />
    </AuthShell>
  )
}
