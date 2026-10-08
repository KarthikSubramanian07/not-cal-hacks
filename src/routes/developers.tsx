import { Link } from 'react-router'
import { SiteFooter, SiteNav } from '@/components/site-chrome'
import { Button } from '@/components/ui/button'

export function DevelopersPage() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8">
        <p className="telemetry">Developer portal</p>
        <h1 className="display-lg mt-3">Build on not-cal-hacks</h1>
        <p className="measure text-fg-muted mt-4 text-[15px] leading-relaxed">
          Quickstart, sandbox demo accounts, OpenAPI, MCP, and CLI for the hackathon application
          portal — without reverse-engineering the UI.
        </p>

        <section className="mt-12 space-y-3">
          <h2 className="display-sm">Quickstart</h2>
          <ol className="text-fg-muted list-decimal space-y-2 pl-5 text-[15px] leading-relaxed">
            <li>
              Read public meta: <code className="text-fg">GET /api/v1/meta</code>
            </li>
            <li>
              Fetch OpenAPI: <code className="text-fg">GET /openapi.json</code>
            </li>
            <li>
              Optional MCP: Streamable HTTP at <code className="text-fg">/mcp</code>
            </li>
            <li>
              Optional CLI: <code className="text-fg">npx not-cal-hacks meta</code>
            </li>
          </ol>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="display-sm">Sandbox environment</h2>
          <p className="text-fg-muted text-[15px] leading-relaxed">
            The production deployment ships seeded demo accounts. They are the sandbox — nothing you
            do to them is durable across reseeds. Public catalog endpoints need no API key.
          </p>
          <div className="border-line bg-surface overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-[13px]">
              <thead className="text-fg-dim border-line border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Password</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                <tr className="border-line border-b">
                  <td className="px-4 py-3">Organizer</td>
                  <td className="px-4 py-3 font-mono text-[12px]">organizer@notcalhacks.dev</td>
                  <td className="px-4 py-3 font-mono text-[12px]">demo1234</td>
                </tr>
                <tr className="border-line border-b">
                  <td className="px-4 py-3">Hacker</td>
                  <td className="px-4 py-3 font-mono text-[12px]">hacker@notcalhacks.dev</td>
                  <td className="px-4 py-3 font-mono text-[12px]">demo1234</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Judge</td>
                  <td className="px-4 py-3 font-mono text-[12px]">judge@notcalhacks.dev</td>
                  <td className="px-4 py-3 font-mono text-[12px]">demo1234</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="display-sm">Surfaces</h2>
          <ul className="text-fg-muted list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
            <li>
              <Link className="text-fg underline-offset-2 hover:underline" to="/docs">
                API documentation
              </Link>
            </li>
            <li>
              <a className="text-fg underline-offset-2 hover:underline" href="/openapi.json">
                OpenAPI specification
              </a>
            </li>
            <li>
              <a className="text-fg underline-offset-2 hover:underline" href="/mcp">
                MCP Streamable HTTP
              </a>
            </li>
            <li>
              <a className="text-fg underline-offset-2 hover:underline" href="/llms.txt">
                Agent index (llms.txt)
              </a>
            </li>
            <li>
              <a className="text-fg underline-offset-2 hover:underline" href="/auth.md">
                Auth walkthrough
              </a>
            </li>
            <li>
              CLI package: <code className="text-fg">not-cal-hacks</code> on npm
            </li>
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/docs">Read the docs</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/openapi.json">OpenAPI</a>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
