import { Link } from 'react-router'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { Button } from '@/components/ui/button'

export function DocsPage() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8">
        <p className="telemetry">API documentation</p>
        <h1 className="display-lg mt-3">not-cal-hacks API docs</h1>
        <p className="measure text-fg-muted mt-4 text-[15px] leading-relaxed">
          Authentication, public endpoints, and examples for the hackathon application portal.
          Machine-readable contract at{' '}
          <a className="text-fg underline-offset-2 hover:underline" href="/openapi.json">
            /openapi.json
          </a>
          .
        </p>

        <section className="mt-12 space-y-3">
          <h2 className="display-sm">Authentication</h2>
          <p className="text-fg-muted text-[15px] leading-relaxed">
            Public read endpoints under <code className="text-fg">/api/v1/*</code> and{' '}
            <code className="text-fg">/api/health</code> need no credentials. Applicant and
            organizer endpoints use an HTTP-only session cookie from signup, login, or Google OAuth.
            Full walkthrough:{' '}
            <a className="text-fg underline-offset-2 hover:underline" href="/auth.md">
              /auth.md
            </a>
            .
          </p>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="display-sm">Public endpoints</h2>
          <pre className="border-line bg-surface overflow-x-auto rounded-xl border p-4 font-mono text-[12px] leading-relaxed">
            {`GET /api/health
GET /api/v1
GET /api/v1/meta
GET /api/v1/application-types
GET /api/v1/statuses
GET /api/v1/tracks
GET /api/v1/rubric
GET /openapi.json`}
          </pre>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="display-sm">Example</h2>
          <pre className="border-line bg-surface overflow-x-auto rounded-xl border p-4 font-mono text-[12px] leading-relaxed">
            {`curl -sS https://not-cal-hacks.pages.dev/api/v1/meta
curl -sS https://not-cal-hacks.pages.dev/openapi.json
npx not-cal-hacks meta`}
          </pre>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="display-sm">MCP and CLI</h2>
          <p className="text-fg-muted text-[15px] leading-relaxed">
            Streamable HTTP MCP lives at{' '}
            <a className="text-fg underline-offset-2 hover:underline" href="/mcp">
              /mcp
            </a>
            . The official CLI is <code className="text-fg">npx not-cal-hacks</code>. Sandbox demo
            accounts are on the{' '}
            <Link className="text-fg underline-offset-2 hover:underline" to="/developers">
              developer portal
            </Link>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/openapi.json">OpenAPI JSON</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/developers">Developer portal</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
