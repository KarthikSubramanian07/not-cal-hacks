import { ContentPage } from '@/routes/content-page'

export function ContactPage() {
  return (
    <ContentPage
      telemetry="Contact"
      title="How to reach us"
      lead="Use these channels for the hackathon application portal, the public API, the MCP server, or the CLI. Do not paste session cookies, passwords, or applicant personal data into a public issue."
      sections={[
        {
          heading: 'Human contact',
          paragraphs: [
            'Open a GitHub issue or pull request on the public repository for product questions, bugs, and integration help. For suspected security issues, use a private GitHub security advisory on the same repository instead of a public issue.',
          ],
          list: [
            'Repository: github.com/KarthikSubramanian07/not-cal-hacks',
            'Security: private advisory on that repository',
            'Questions: issue with a clear reproduction',
          ],
        },
        {
          heading: 'Agent and developer contact',
          paragraphs: [
            'Agents should start at the developer portal and the OpenAPI document. Public catalog endpoints need no key. Authenticated routes use session cookies documented in auth.md.',
          ],
          list: [
            'Developer portal: /developers',
            'API docs: /docs',
            'Auth walkthrough: /auth.md',
            'MCP: /mcp',
            'Health: GET /api/health',
          ],
        },
        {
          heading: 'What to include',
          paragraphs: [
            'Describe the environment (production URL or local), the endpoint or page, the HTTP status you saw, and a minimal reproduction. Response time is best-effort — this is an open-source portal, not a paid support desk — but actionable reports with reproduction steps are answered when maintainers are online.',
          ],
        },
      ]}
      footerLinks={[
        { to: '/about', label: 'About' },
        { to: '/privacy', label: 'Privacy' },
        { to: '/developers', label: 'Developers' },
      ]}
    />
  )
}
