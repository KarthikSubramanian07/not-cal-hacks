import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

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

/** Renders nothing unless this deployment actually has Google credentials. */
export function GoogleContinue({ next }: { next: string }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    void api
      .get<{ google: boolean }>('/auth/providers')
      .then((res) => setEnabled(res.google))
      .catch(() => setEnabled(false))
  }, [])

  if (!enabled) return null

  return (
    <>
      <div className="my-6 flex items-center gap-4">
        <span className="border-line h-px flex-1 border-t" />
        <span className="text-fg-dim font-mono text-[11px] tracking-[0.12em] uppercase">or</span>
        <span className="border-line h-px flex-1 border-t" />
      </div>
      <Button asChild variant="outline" size="lg" className="w-full">
        <a href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
          <GoogleMark className="size-4" />
          Continue with Google
        </a>
      </Button>
    </>
  )
}
