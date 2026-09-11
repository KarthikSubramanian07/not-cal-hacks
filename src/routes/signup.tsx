import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { signupSchema } from '@shared/schemas'
import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ApiClientError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

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
      await signup(parsed.data)
      toast.success('Account created.')
      void navigate('/apply', { replace: true })
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

  return (
    <AuthShell
      title="Create an account"
      subtitle="One account covers both application types. It takes about twenty seconds, and then the actual form takes five minutes."
      footer={
        <>
          Already have one?{' '}
          <Link
            to="/login"
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
    </AuthShell>
  )
}
